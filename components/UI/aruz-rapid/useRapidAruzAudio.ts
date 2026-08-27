"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { AudioSourceMode, RapidAruzConfig } from "@/lib/aruz-rapid/config";

export type RapidAruzSoundName = "correct" | "wrong" | "timeout" | "complete";

/**
 * صدای بازی.
 *
 * دو تصمیمِ عمدی اینجا هست:
 *
 * ۱. حالتِ منبع صریح است. در «procedural» هیچ URL ای درخواست نمی‌شود —
 *    نه امتحان می‌کنیم و نه در ۴۰۴ به fallback می‌افتیم. کنسولِ تمیز
 *    بخشی از کیفیت است. فایل‌های واقعی وقتی ساخته شدند در ASSET_SOURCES
 *    اعلام می‌شوند و حالت به «assets» تغییر می‌کند؛ تا آن روز هیچ‌کدام
 *    از آن مسیرها زده نمی‌شود.
 *
 * ۲. صداها عمداً بسیار کوچک‌اند. «نادرست» پایانِ بازی نیست؛ پس نه بوقِ
 *    تحقیر، نه جینگلِ باخت. اگر افکتی آزاردهنده بود، سکوت بهتر از آن است.
 *
 * هیچ‌جای منطقِ بازی منتظرِ صدا نمی‌ماند و هیچ خطای صوتی گذارِ حالت را
 * متوقف نمی‌کند.
 */

/** وقتی بستهٔ صوتیِ واقعی آماده شد، این نقشه پر می‌شود. تا آن موقع خالی است. */
const ASSET_SOURCES: Partial<Record<RapidAruzSoundName, string>> = {};

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
  const buffersRef = useRef<Map<RapidAruzSoundName, AudioBuffer>>(new Map());
  const enabledRef = useRef(enabled);
  const modeRef = useRef<AudioSourceMode>(config.audioSourceMode);
  const volumeRef = useRef(config.soundVolume);

  useEffect(() => {
    enabledRef.current = enabled;
    modeRef.current = config.audioSourceMode;
    volumeRef.current = config.soundVolume;
  }, [enabled, config.audioSourceMode, config.soundVolume]);

  const ensureContext = useCallback((): AudioContext | null => {
    if (!ctxRef.current) ctxRef.current = createContext();
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") void ctx.resume();
    return ctx;
  }, []);

  const unlock = useCallback(() => {
    if (!enabledRef.current) return;
    ensureContext();
  }, [ensureContext]);

  /** یک نتِ کوتاه با شیبِ نرم — بدون کلیکِ خشک در ابتدا و انتها. */
  const tone = useCallback(
    (
      ctx: AudioContext,
      { freq, peak, durationMs, type = "sine", startOffsetMs = 0, endFreq }: {
        freq: number;
        peak: number;
        durationMs: number;
        type?: OscillatorType;
        startOffsetMs?: number;
        endFreq?: number;
      },
    ) => {
      const start = ctx.currentTime + startOffsetMs / 1000;
      const duration = durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
      }
      const level = Math.max(0.0001, peak * volumeRef.current);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(level, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    },
    [],
  );

  const playProcedural = useCallback(
    (ctx: AudioContext, name: RapidAruzSoundName) => {
      switch (name) {
        case "correct":
          // یک تیکِ ریز و روشن. باید زیرِ صدای انگشت روی شیشه بماند.
          tone(ctx, { freq: 1180, peak: 0.05, durationMs: 55 });
          return;
        case "wrong":
          // کلیکِ نرم و کوتاه، نه بوق. «نادرست» یعنی از اول، نه باخت.
          tone(ctx, { freq: 240, peak: 0.035, durationMs: 70, type: "triangle" });
          return;
        case "timeout":
          // دو نتِ خیلی آرامِ فرودی — نشانهٔ «وقت تمام شد»، بی‌سرزنش.
          tone(ctx, { freq: 380, peak: 0.03, durationMs: 60, type: "sine" });
          tone(ctx, { freq: 300, peak: 0.03, durationMs: 70, type: "sine", startOffsetMs: 70 });
          return;
        case "complete":
          tone(ctx, { freq: 660, peak: 0.05, durationMs: 90 });
          tone(ctx, { freq: 990, peak: 0.045, durationMs: 160, startOffsetMs: 95 });
          return;
      }
    },
    [tone],
  );

  const play = useCallback(
    (name: RapidAruzSoundName) => {
      if (!enabledRef.current) return;
      const ctx = ensureContext();
      if (!ctx) return;
      try {
        if (modeRef.current === "assets") {
          const buffer = buffersRef.current.get(name);
          // فایلی که اعلام نشده، درخواست هم نمی‌شود؛ در نبودش ساکت می‌مانیم.
          if (!buffer) return;
          const src = ctx.createBufferSource();
          const gain = ctx.createGain();
          gain.gain.value = volumeRef.current;
          src.buffer = buffer;
          src.connect(gain);
          gain.connect(ctx.destination);
          src.start();
          return;
        }
        playProcedural(ctx, name);
      } catch {
        // صدا هرگز نباید بازی را متوقف کند.
      }
    },
    [ensureContext, playProcedural],
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
