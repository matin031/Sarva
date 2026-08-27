import { aruzBridgeAssets, type AruzBridgeSoundName } from "./assets";

/* ═══════════════════════════════════════════════════════════════════════════
   مدیرِ صدا — کاملاً مستقل از منطقِ بازی.
   ═══════════════════════════════════════════════════════════════════════════

   چرا Web Audio و نه <audio>؟ چون همزمانیِ صدا در این بازی جزوِ طراحی است، نه
   تزئین: صدای شکستن باید *دقیقاً* لحظه‌ای پخش شود که قطعات جدا می‌شوند. تگِ
   <audio> بینِ فراخوانیِ play() و شنیده‌شدنِ صدا تأخیرِ متغیر دارد؛
   AudioBufferSourceNode بافرِ از پیش رمزگشایی‌شده را در همان فریم شروع می‌کند.

   نبودنِ فایل خطا نیست. هر صدایی که ۴۰۴ بدهد یا رمزگشایی نشود، «غایب» علامت
   می‌خورد و از آن به بعد play() برایش یک no-op است — کلِ توالیِ دیداری بدون
   هیچ صدایی هم کامل اجرا می‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

type Ctor = typeof AudioContext;

function getAudioContextCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: Ctor }).webkitAudioContext ??
    null
  );
}

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<AruzBridgeSoundName, AudioBuffer>();
  /** صداهایی که فایلشان نبود یا رمزگشایی نشد — دیگر تلاش نمی‌کنیم. */
  private missing = new Set<AruzBridgeSoundName>();
  private heartbeat: AudioBufferSourceNode | null = null;
  private heartbeatGain: GainNode | null = null;
  private muted = false;
  private volume: number;
  private disposed = false;
  private loading: Promise<void> | null = null;

  constructor(volume = 0.7) {
    this.volume = volume;
  }

  /** کدام صداها واقعاً در دسترس‌اند — برای گزارشِ «چه فایل‌هایی کم داریم». */
  get availability(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const name of Object.keys(aruzBridgeAssets.audio) as AruzBridgeSoundName[]) {
      out[name] = this.buffers.has(name);
    }
    return out;
  }

  /**
   * قفلِ صدا را باز می‌کند و فایل‌ها را می‌گیرد.
   *
   * باید از دلِ یک تعاملِ واقعیِ کاربر صدا زده شود (دکمهٔ «شروع»)، وگرنه
   * مرورگر AudioContext را در حالتِ suspended نگه می‌دارد.
   */
  async unlock(): Promise<void> {
    if (this.disposed) return;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return; // مرورگر Web Audio ندارد: بازی بی‌صدا اجرا می‌شود

    if (!this.ctx) {
      try {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* بعضی مرورگرها بدونِ ژستِ معتبر رد می‌کنند؛ دفعهٔ بعد دوباره تلاش می‌شود */
      }
    }
    this.loading ??= this.loadAll();
    return this.loading;
  }

  private async loadAll(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    const names = Object.keys(aruzBridgeAssets.audio) as AruzBridgeSoundName[];
    await Promise.all(
      names.map(async (name) => {
        try {
          const res = await fetch(aruzBridgeAssets.audio[name]);
          if (!res.ok) throw new Error(String(res.status));
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          if (!this.disposed) this.buffers.set(name, buf);
        } catch {
          // فایل هنوز اضافه نشده — کاملاً مورد انتظار است.
          this.missing.add(name);
        }
      }),
    );
  }

  private playBuffer(
    name: AruzBridgeSoundName,
    { rate = 1, gain = 1, loop = false } = {},
  ): { source: AudioBufferSourceNode; gain: GainNode } | null {
    if (this.disposed || this.muted) return null;
    const ctx = this.ctx;
    const buffer = this.buffers.get(name);
    if (!ctx || !this.master || !buffer || ctx.state !== "running") return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    source.connect(g).connect(this.master);
    source.start();
    if (!loop) source.onended = () => g.disconnect();
    return { source, gain: g };
  }

  play(name: AruzBridgeSoundName, opts?: { rate?: number; gain?: number }): void {
    this.playBuffer(name, opts);
  }

  playJump() { this.play("jump"); }
  playLanding() { this.play("landing"); }
  playCrack() { this.play("crack"); }
  playShatter() { this.play("shatter"); }
  playCorrect() { this.play("correct", { gain: 0.8 }); }
  playGameOver() { this.play("gameOver"); }

  /** ضربانِ قلب فقط در کسرِ پایانیِ تایمر، و با آهنگی که تندتر می‌شود. */
  startHeartbeat(rate = 1): void {
    if (this.heartbeat) {
      this.setHeartbeatRate(rate);
      return;
    }
    const played = this.playBuffer("heartbeat", { loop: true, rate, gain: 0.55 });
    if (!played) return;
    this.heartbeat = played.source;
    this.heartbeatGain = played.gain;
  }

  setHeartbeatRate(rate: number): void {
    if (!this.heartbeat || !this.ctx) return;
    this.heartbeat.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.08);
  }

  stopHeartbeat(): void {
    const source = this.heartbeat;
    const gain = this.heartbeatGain;
    this.heartbeat = null;
    this.heartbeatGain = null;
    if (!source) return;
    try {
      // قطعِ ناگهانیِ یک حلقه، «تِق» می‌دهد؛ یک محوِ کوتاه تمیزتر است.
      if (this.ctx && gain) {
        gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        source.stop(this.ctx.currentTime + 0.25);
      } else {
        source.stop();
      }
    } catch {
      /* اگر پیش‌تر متوقف شده باشد stop() استثنا می‌دهد */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopHeartbeat();
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.master && this.ctx && !this.muted) {
      this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
    }
  }

  /** همه‌چیز را می‌بندد. بعد از این، نمونه دیگر قابل استفاده نیست. */
  dispose(): void {
    this.disposed = true;
    this.stopHeartbeat();
    this.buffers.clear();
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    void ctx?.close().catch(() => {});
  }
}
