"use client";

/* صدای بازخوردِ آزمون — سنتزشده مثل lib/kimia/sfx.ts، بدون فایل.
 *
 * سه صدا، همه کوتاه و آرام (زیرِ −۱۸dB): آزمون جای شلوغی نیست و خیلی‌ها
 * در کلاس یا کتابخانه تمرین می‌کنند. خاموش‌کردنش در منوی «⋯» آزمون است و
 * در localStorage می‌ماند.
 *
 * ⚠️ AudioContext تا اولین ژستِ کاربر suspended است. اولین پخش همیشه بعد از
 * کلیکِ «ثبت پاسخ» است، پس resume همان‌جا جواب می‌دهد. */

export type FeedbackSound = "correct" | "partial" | "wrong";

const MUTE_KEY = "exam-sound-muted";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* private mode — the toggle just won't stick */
  }
}

/** One soft bell partial: sine + a quiet octave, fast attack, exponential tail. */
function bell(ac: AudioContext, at: number, freq: number, gain: number, dur: number) {
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  out.connect(ac.destination);
  for (const [mult, g] of [
    [1, 1],
    [2, 0.18],
  ] as const) {
    const osc = ac.createOscillator();
    const og = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * mult, at);
    og.gain.value = g;
    osc.connect(og).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

export function playFeedback(kind: FeedbackSound) {
  if (isSoundMuted()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  if (kind === "correct") {
    // major third then fifth, rising: E6 → G#6 → B6
    bell(ac, t, 1318.5, 0.09, 0.35);
    bell(ac, t + 0.085, 1661.2, 0.08, 0.4);
    bell(ac, t + 0.17, 1975.5, 0.07, 0.6);
  } else if (kind === "partial") {
    bell(ac, t, 987.8, 0.07, 0.35);
    bell(ac, t + 0.1, 1174.7, 0.06, 0.45);
  } else {
    // a low, short "tup" — says «نه» without sounding like a buzzer
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}
