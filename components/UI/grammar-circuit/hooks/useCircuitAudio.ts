"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioSourceMode } from "@/lib/grammar-circuit";

/** صدای بازی.
 *
 *  مهم‌ترین قاعده اینجا: حالتِ منبعِ صدا *صریح* است. حالتِ «اول فایل را صدا بزن،
 *  ۴۰۴ بگیر، بعد برو سراغ صدای تولیدی» ممنوع است — در حالتِ `procedural` هیچ
 *  URLی درخواست نمی‌شود، نقطه. فقط وقتی بستهٔ صوتیِ واقعی اضافه و در
 *  `AUDIO_MANIFEST` ثبت شد، حالت به `assets` تغییر می‌کند و همان‌وقت هم فقط
 *  نشانی‌های *ثبت‌شده* بارگذاری می‌شوند.
 *
 *  قاعدهٔ دوم: صدا هیچ‌وقت مسیرِ معناییِ بازی را نگه نمی‌دارد. هیچ
 *  `await playSound()`ی وجود ندارد و شکستِ صدا بازی را متوقف نمی‌کند. */

export type CircuitSoundEvent =
  | "pickup"
  | "connect"
  | "contact"
  | "wrong"
  | "current"
  | "lampOn";

/** تا وقتی این خالی است، حالتِ `assets` هیچ چیزی برای پخش ندارد و بی‌صدا
 *  می‌ماند؛ باز هم هیچ درخواستِ غایبی فرستاده نمی‌شود. */
const AUDIO_MANIFEST: Partial<Record<CircuitSoundEvent, string>> = {};

const STORAGE_KEY = "grammar-circuit-sound";

interface Kit {
  ctx: AudioContext;
  master: GainNode;
}

export function useCircuitAudio(mode: AudioSourceMode, volume: number) {
  const [enabled, setEnabled] = useState(true);
  const kitRef = useRef<Kit | null>(null);
  const buffersRef = useRef(new Map<CircuitSoundEvent, AudioBuffer>());
  const enabledRef = useRef(true);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // ترجیحِ ذخیره‌شده بعد از mount خوانده می‌شود تا رندرِ سرور و اولین رندرِ
  // کلاینت یکی بماند.
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(STORAGE_KEY);
      } catch {}
      if (saved === "off") setEnabled(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const ensureContext = useCallback((): Kit | null => {
    if (typeof window === "undefined") return null;
    if (!kitRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      try {
        const ctx = new Ctor();
        const master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
        kitRef.current = { ctx, master };
      } catch {
        return null;
      }
    }
    if (kitRef.current.ctx.state === "suspended") {
      void kitRef.current.ctx.resume().catch(() => {});
    }
    kitRef.current.master.gain.value = volume;
    return kitRef.current;
  }, [volume]);

  /** باز کردنِ قفلِ صدا — همیشه از دلِ یک ژستِ واقعیِ کاربر. */
  const unlock = useCallback(() => {
    if (!enabledRef.current) return;
    ensureContext();
  }, [ensureContext]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      } catch {}
      // روشن‌کردن خودش یک ژستِ کاربر است؛ همان‌جا AudioContext را باز می‌کنیم.
      if (next) ensureContext();
      return next;
    });
  }, [ensureContext]);

  /** پوششِ نرمِ حجم — بدونِ کلیکِ ابتدا/انتها. */
  const envelope = (
    ctx: AudioContext,
    gain: GainNode,
    peak: number,
    attack: number,
    duration: number,
  ) => {
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  };

  const playProcedural = useCallback(
    (event: CircuitSoundEvent, kit: Kit) => {
      const { ctx, master } = kit;
      const t = ctx.currentTime;

      const tone = (
        freq: number,
        peak: number,
        duration: number,
        type: OscillatorType,
        cutoff: number,
        detune = 0,
        delay = 0,
      ) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = cutoff;
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        const start = t + delay;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.start(start);
        osc.stop(start + duration + 0.03);
      };

      switch (event) {
        // برداشتنِ قطعه: خیلی زیرِ پوستی، فقط تأییدِ لمس.
        case "pickup":
          tone(320, 0.05, 0.07, "sine", 1400);
          break;
        // جا افتادنِ قطعه: یک کلیکِ کوتاهِ راضی‌کننده، نه زنگِ آرکید.
        case "connect":
          tone(880, 0.09, 0.05, "triangle", 2600);
          tone(1320, 0.05, 0.08, "sine", 3200, 0, 0.03);
          break;
        case "contact":
          tone(660, 0.045, 0.06, "sine", 2000);
          break;
        // ردِ اتصال: یک تُکِ خفهٔ کوتاه. نه بوق، نه آهنگِ باخت.
        case "wrong":
          tone(180, 0.075, 0.13, "sine", 520);
          tone(120, 0.05, 0.16, "sine", 400, 0, 0.02);
          break;
        // حرکتِ جریان: یک سوییپِ نرم و کم‌جان.
        case "current": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(600, t);
          filter.frequency.linearRampToValueAtTime(2200, t + 0.5);
          osc.type = "sine";
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(900, t + 0.5);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(master);
          envelope(ctx, gain, 0.045, 0.12, 0.58);
          osc.start(t);
          osc.stop(t + 0.62);
          break;
        }
        // روشن‌شدنِ لامپ: یک آکوردِ گرمِ کوتاه.
        case "lampOn":
          tone(392, 0.07, 0.42, "sine", 1800);
          tone(587, 0.05, 0.4, "sine", 2000, 0, 0.04);
          tone(784, 0.03, 0.36, "sine", 2400, 0, 0.08);
          break;
      }
    },
    [],
  );

  const play = useCallback(
    (event: CircuitSoundEvent) => {
      if (!enabledRef.current) return;
      const kit = ensureContext();
      if (!kit) return;
      try {
        if (mode === "procedural") {
          playProcedural(event, kit);
          return;
        }
        // حالتِ assets: فقط چیزی که در مانیفست *هست* پخش می‌شود.
        const buffer = buffersRef.current.get(event);
        if (!buffer) return;
        const src = kit.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(kit.master);
        src.start();
      } catch {
        // صدا هرگز نباید بازی را زمین بزند.
      }
    },
    [ensureContext, mode, playProcedural],
  );

  // بارگذاریِ بسته — فقط در حالتِ assets و فقط برای نشانی‌های ثبت‌شده.
  useEffect(() => {
    if (mode !== "assets") return;
    const entries = Object.entries(AUDIO_MANIFEST) as Array<
      [CircuitSoundEvent, string]
    >;
    if (entries.length === 0) return;
    const controller = new AbortController();
    const buffers = buffersRef.current;
    void (async () => {
      const kit = ensureContext();
      if (!kit) return;
      for (const [event, url] of entries) {
        try {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) continue;
          buffers.set(event, await kit.ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {}
      }
    })();
    return () => controller.abort();
  }, [ensureContext, mode]);

  useEffect(() => {
    return () => {
      const kit = kitRef.current;
      kitRef.current = null;
      if (kit) void kit.ctx.close().catch(() => {});
    };
  }, []);

  return { play, unlock, toggle, enabled };
}
