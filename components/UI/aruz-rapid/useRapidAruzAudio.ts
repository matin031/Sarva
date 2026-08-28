"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { AudioSourceMode, RapidAruzConfig } from "@/lib/aruz-rapid/config";
import {
  createRapidAruzBus,
  scheduleRapidAruzSound,
  SOUND_DURATION_MS,
  SOUND_PEAK,
  type RapidAruzSoundName,
} from "@/lib/aruz-rapid/sound-design";

export type { RapidAruzSoundName };

/**
 * صدای بازی — لایهٔ React.
 *
 * خودِ طراحیِ صدا در lib/aruz-rapid/sound-design.ts است تا بشود همان کد را
 * آفلاین رندر و اندازه‌گیری کرد. اینجا فقط چرخهٔ عمرِ AudioContext، قفلِ
 * user gesture و حالتِ منبع را نگه می‌داریم.
 *
 * دو تصمیمِ عمدی که از نسخهٔ اول مانده‌اند:
 *
 * ۱. حالتِ منبع صریح است. در «procedural» هیچ URL ای درخواست نمی‌شود —
 *    نه امتحان می‌کنیم و نه در ۴۰۴ به fallback می‌افتیم. فایل‌های واقعی
 *    وقتی ساخته شدند در ASSET_SOURCES اعلام می‌شوند و حالت به «assets»
 *    تغییر می‌کند؛ تا آن روز هیچ‌کدام از آن مسیرها زده نمی‌شود.
 *
 * ۲. هیچ‌جای منطقِ بازی منتظرِ صدا نمی‌ماند. هیچ await ای در مسیرِ gameplay
 *    نیست و هر خطای صوتی بی‌صدا بلعیده می‌شود.
 */

/** وقتی بستهٔ صوتیِ واقعی آماده شد، این نقشه پر می‌شود. تا آن موقع خالی است. */
const ASSET_SOURCES: Partial<Record<RapidAruzSoundName, string>> = {};

/**
 * پلِ QA: همان تابعِ زمان‌بندی را در اختیارِ ابزارِ آزمون می‌گذارد تا بشود
 * صداها را در یک OfflineAudioContext رندر و اندازه‌گیری کرد (اوج، طول،
 * روشناییِ طیف) و حتی به WAV گرفت. در production فقط وقتی روشن می‌شود که
 * کسی صریحاً __aruzRapidDebugEnabled را گذاشته باشد.
 */
function exposeForQa() {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production" && !window.__aruzRapidDebugEnabled) return;
  window.__aruzRapidSound = {
    schedule: scheduleRapidAruzSound,
    createBus: createRapidAruzBus,
    peaks: SOUND_PEAK,
    durations: SOUND_DURATION_MS,
  };
}

declare global {
  interface Window {
    __aruzRapidSound?: {
      schedule: typeof scheduleRapidAruzSound;
      createBus: typeof createRapidAruzBus;
      peaks: typeof SOUND_PEAK;
      durations: typeof SOUND_DURATION_MS;
    };
  }
}

type Ctor = typeof AudioContext;

function createContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx: Ctor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    return new Ctx();
  } catch {
    return null;
  }
}

export interface RapidAruzAudio {
  /** در همان user gesture صدا زده می‌شود تا AudioContext باز شود. */
  unlock: () => void;
  play: (name: RapidAruzSoundName) => void;
  /** لرزشِ کوتاه، فقط اگر مرورگر داشته باشد. بازی به آن وابسته نیست. */
  vibrate: (pattern: number | number[]) => void;
}

export function useRapidAruzAudio(config: RapidAruzConfig, enabled: boolean): RapidAruzAudio {
  const ctxRef = useRef<AudioContext | null>(null);
  const busRef = useRef<GainNode | null>(null);
  const buffersRef = useRef<Map<RapidAruzSoundName, AudioBuffer>>(new Map());
  const enabledRef = useRef(enabled);
  const modeRef = useRef<AudioSourceMode>(config.audioSourceMode);
  const volumeRef = useRef(config.soundVolume);

  useEffect(() => {
    exposeForQa();
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    modeRef.current = config.audioSourceMode;
    volumeRef.current = config.soundVolume;
    if (busRef.current) busRef.current.gain.value = config.soundVolume;
  }, [enabled, config.audioSourceMode, config.soundVolume]);

  const ensureContext = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      const ctx = createContext();
      ctxRef.current = ctx;
      if (ctx) busRef.current = createRapidAruzBus(ctx, ctx.destination, volumeRef.current);
    }
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") void ctx.resume();
    return ctx;
  }, []);

  const unlock = useCallback(() => {
    if (!enabledRef.current) return;
    ensureContext();
  }, [ensureContext]);

  const play = useCallback(
    (name: RapidAruzSoundName) => {
      if (!enabledRef.current) return;
      const ctx = ensureContext();
      const bus = busRef.current;
      if (!ctx || !bus) return;
      try {
        if (modeRef.current === "assets") {
          const buffer = buffersRef.current.get(name);
          // فایلی که اعلام نشده، درخواست هم نمی‌شود؛ در نبودش ساکت می‌مانیم.
          if (!buffer) return;
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(bus);
          src.start();
          return;
        }
        scheduleRapidAruzSound(ctx, bus, name, ctx.currentTime);
      } catch {
        // صدا هرگز نباید بازی را متوقف کند.
      }
    },
    [ensureContext],
  );

  // بارگذاریِ فایل‌ها فقط در حالتِ assets و فقط برای مسیرهای اعلام‌شده.
  useEffect(() => {
    if (config.audioSourceMode !== "assets") return;
    const entries = Object.entries(ASSET_SOURCES) as [RapidAruzSoundName, string][];
    if (entries.length === 0) return;
    let cancelled = false;
    const ctx = ensureContext();
    if (!ctx) return;
    void Promise.all(
      entries.map(async ([name, url]) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return;
          const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
          if (!cancelled) buffersRef.current.set(name, buffer);
        } catch {
          // نبودِ فایل نباید چیزی را بشکند.
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [config.audioSourceMode, ensureContext]);

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      busRef.current = null;
      if (ctx) void ctx.close().catch(() => {});
    };
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!enabledRef.current) return;
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(pattern);
    } catch {}
  }, []);

  return useMemo(() => ({ unlock, play, vibrate }), [unlock, play, vibrate]);
}
