import { aruzBridgeAssets, type AruzBridgeSoundName } from "./assets";
import { synthesizeSound } from "./synth";

/* ═══════════════════════════════════════════════════════════════════════════
   مدیرِ صدا — کاملاً مستقل از منطقِ بازی.
   ═══════════════════════════════════════════════════════════════════════════

   چرا Web Audio و نه <audio>؟ چون همزمانیِ صدا در این بازی جزوِ طراحی است، نه
   تزئین: صدای شکستن باید *دقیقاً* لحظه‌ای پخش شود که قطعات جدا می‌شوند. تگِ
   <audio> بینِ فراخوانیِ play() و شنیده‌شدنِ صدا تأخیرِ متغیر دارد؛
   AudioBufferSourceNode بافرِ از پیش رمزگشایی‌شده را در همان فریم شروع می‌کند.

   نبودنِ فایل خطا نیست — ولی سکوت هم نیست. هر صدایی که ۴۰۴ بدهد یا رمزگشایی
   نشود، جایش با یک نمونهٔ ساخته‌شده در `synth.ts` پر می‌شود. یعنی بازی همیشه
   صدا دارد و کلِ زنجیره قابلِ‌شنیدن آزموده می‌شود؛ فایلِ واقعی که رسید،
   بی‌سروصدا جایگزین می‌شود.

   این تصمیم از یک اشتباهِ مشخص آمد: پیش‌تر خطاها بی‌صدا بلعیده می‌شدند و
   هیچ‌کس نمی‌توانست بفهمد صدا خراب است یا فقط فایل ندارد. حالا هم صدا شنیده
   می‌شود و هم `describe()` دقیقاً می‌گوید هر صدا از کجا آمده.
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
  /** منبعِ هر صدا: فایلِ واقعی یا نمونهٔ ساخته‌شده. مبنای گزارشِ تشخیصی. */
  private origin = new Map<AruzBridgeSoundName, "file" | "synth">();
  /** فایل‌هایی که پیدا نشدند — همان فهرستی که باید تهیه شوند. */
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

  /** وضعیتِ کاملِ صدا — برای گزارش، اشکال‌زدایی و تستِ خودکار. */
  describe() {
    const sounds = {} as Record<AruzBridgeSoundName, "file" | "synth" | "none">;
    for (const name of Object.keys(aruzBridgeAssets.audio) as AruzBridgeSoundName[]) {
      sounds[name] = this.origin.get(name) ?? "none";
    }
    return {
      contextState: this.ctx?.state ?? "none",
      unlocked: this.ctx?.state === "running",
      muted: this.muted,
      volume: this.volume,
      sounds,
      missingFiles: [...this.missing].map((n) => aruzBridgeAssets.audio[n]),
    };
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
    /* دستگیره‌ای برای اشکال‌زدایی و تستِ خودکار. از کنسول:
       `__aruzBridgeAudio.describe()` وضعیتِ کاملِ زنجیره را می‌دهد. */
    if (typeof window !== "undefined") {
      (window as Window & { __aruzBridgeAudio?: GameAudio }).__aruzBridgeAudio = this;
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

    /* هر فایلی که نیامد، جایش ساخته می‌شود. بازی هرگز بی‌صدا نمی‌ماند. */
    for (const name of names) {
      if (this.buffers.has(name)) {
        this.origin.set(name, "file");
        continue;
      }
      try {
        this.buffers.set(name, synthesizeSound(name, ctx));
        this.origin.set(name, "synth");
      } catch {
        // ساختِ صدا هم شکست خورد: همان no-opِ قدیمی، ولی حالا در گزارش دیده می‌شود.
      }
    }

    this.report();
  }

  /**
   * گزارشِ یک‌خطی در کنسول.
   *
   * دلیلِ وجودش: «هیچ صدایی نمی‌آید» می‌تواند ده علت داشته باشد و از بیرون
   * همه یک شکل‌اند. این گزارش بلافاصله می‌گوید قفلِ مرورگر باز شده یا نه،
   * هر صدا از فایل آمده یا ساخته شده، و کدام فایل‌ها هنوز کم‌اند.
   */
  private report(): void {
    if (typeof console === "undefined") return;
    const info = this.describe();
    const synth = Object.entries(info.sounds).filter(([, v]) => v === "synth");

    console.groupCollapsed(
      `%c[پلِ وزن] صدا: ${info.unlocked ? "فعال" : "قفل"} — ` +
        `${Object.values(info.sounds).filter((v) => v === "file").length} فایل، ${synth.length} ساخته‌شده`,
      "color:#00a5a6;font-weight:bold",
    );
    console.table(info.sounds);
    if (info.missingFiles.length) {
      console.info(
        "فایل‌های صوتیِ زیر موجود نیستند و فعلاً با نمونهٔ ساخته‌شده جایگزین شده‌اند.\n" +
          "برای صدای نهایی، این‌ها را در public/ قرار دهید (راهنما: public/games/aruz-bridge/README.md):",
      );
      for (const path of info.missingFiles) console.info("  •", path);
    }
    console.groupEnd();
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
