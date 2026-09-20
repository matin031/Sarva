import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

/* ═══════════════════════════════════════════════════════════════════════════
   چرخهٔ عمرِ گره‌های صوتی — با یک AudioContextِ ساختگی.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ این تست *کیفیتِ* صدا را نمی‌سنجد و نمی‌تواند بسنجد؛ صدا با گوش
   تنظیم می‌شود. چیزی که اینجا سنجیده می‌شود سه ادعای مهندسی است و هر سه
   بدونِ تست نامرئی‌اند:

     ۱) با خاموش بودنِ صدا، *هیچ گرهی ساخته نمی‌شود* (و نه «ساخته و
        بی‌صدا»، که همان هزینهٔ CPU را دارد).
     ۲) بیش از هشت صدای هم‌زمان زنده نمی‌ماند.
     ۳) بعد از لغو، همهٔ گره‌ها disconnect می‌شوند — وگرنه هر دورِ بازی
        چند گرهٔ بی‌صاحب جا می‌گذارد و بعد از چند دور، صدا می‌شکند.
   ═══════════════════════════════════════════════════════════════════════════ */

type FakeNode = {
  kind: string;
  connects: number;
  disconnects: number;
  started: boolean;
  stopped: boolean;
};

const created: FakeNode[] = [];

function param(value = 0) {
  return {
    value,
    setValueAtTime() {},
    setTargetAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
}

function node(kind: string, extra: Record<string, unknown> = {}) {
  const self: FakeNode & Record<string, unknown> = {
    kind,
    connects: 0,
    disconnects: 0,
    started: false,
    stopped: false,
    connect(target: unknown) {
      self.connects += 1;
      return target;
    },
    disconnect() {
      self.disconnects += 1;
    },
    start() {
      self.started = true;
    },
    stop() {
      self.stopped = true;
    },
    onended: null,
    ...extra,
  };
  created.push(self);
  return self;
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 48000;
  state: "running" | "suspended" = "running";
  baseLatency = 0.01;
  outputLatency = 0.02;
  destination = node("destination");

  createGain() {
    return node("gain", { gain: param(1) });
  }
  createOscillator() {
    return node("osc", { type: "sine", frequency: param(440) });
  }
  createBufferSource() {
    return node("source", { buffer: null, loop: false });
  }
  createBiquadFilter() {
    return node("filter", { type: "bandpass", Q: param(1), frequency: param(1000) });
  }
  createDynamicsCompressor() {
    return node("comp", {
      threshold: param(-24),
      knee: param(30),
      ratio: param(12),
      attack: param(0.003),
      release: param(0.25),
    });
  }
  createBuffer(_channels: number, frames: number) {
    return { getChannelData: () => new Float32Array(frames) };
  }
  async resume() {
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
  async close() {}
}

const store = new Map<string, string>();

before(() => {
  const listeners: Record<string, (() => void)[]> = {};
  const win = {
    AudioContext: FakeAudioContext,
    setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
    clearTimeout: (id: NodeJS.Timeout) => clearTimeout(id),
  };
  Object.assign(globalThis, {
    window: win,
    document: {
      visibilityState: "visible",
      addEventListener: (type: string, fn: () => void) => {
        (listeners[type] ??= []).push(fn);
      },
    },
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
  });
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let sfx: typeof import("@/lib/kimia/sfx");

beforeEach(async () => {
  sfx ??= await import("@/lib/kimia/sfx");
  sfx.disposeSfx();
  created.length = 0;
  sfx.setSfxEnabled(true);
  created.length = 0; // گره‌های ساختِ خودِ kit به حساب نمی‌آیند
});

test("خاموش بودنِ صدا: هیچ گرهی ساخته نمی‌شود", () => {
  sfx.setSfxEnabled(false);
  created.length = 0;
  sfx.playKimiaSfx("settle");
  sfx.playKimiaSfx("correct");
  const voice = sfx.startPourVoice();
  assert.equal(created.length, 0, `${created.length} گره ساخته شد`);
  assert.equal(voice, null);
  sfx.setSfxEnabled(true);
});

test("پخشِ یک رویداد، گره می‌سازد و وصل می‌کند", () => {
  sfx.playKimiaSfx("settle");
  assert.ok(created.length >= 2, `${created.length} گره`);
  assert.ok(created.every((n) => n.connects > 0 || n.kind === "destination"));
  assert.ok(sfx.activeVoiceCount() >= 1);
});

test("سقفِ هشت صدای هم‌زمان", () => {
  for (let i = 0; i < 14; i += 1) sfx.playKimiaSfx("valve");
  assert.ok(sfx.activeVoiceCount() <= 8, `${sfx.activeVoiceCount()} صدای زنده`);
});

test("بعد از لغو، همهٔ گره‌ها disconnect می‌شوند", async () => {
  for (let i = 0; i < 4; i += 1) sfx.playKimiaSfx("settle");
  const voice = sfx.startPourVoice();
  assert.ok(voice, "صدای ریختن ساخته نشد");
  voice?.set(0.5, 0.3);
  voice?.bubble(0.5);

  sfx.stopAllVoices();
  await sleep(260);

  const leaked = created.filter((n) => n.connects > 0 && n.disconnects === 0 && n.kind !== "destination");
  assert.equal(leaked.length, 0, `${leaked.length} گرهٔ بی‌صاحب: ${leaked.map((n) => n.kind).join(",")}`);
  assert.equal(sfx.activeVoiceCount(), 0);
});

test("صدای ریختن: یکی بیشتر زنده نمی‌ماند", async () => {
  const first = sfx.startPourVoice();
  const second = sfx.startPourVoice();
  assert.ok(first && second);
  await sleep(200);
  /* اولی باید با ساختهٔ دوم بسته شده باشد. */
  const sources = created.filter((n) => n.kind === "source" && n.started);
  const open = sources.filter((n) => !n.stopped);
  assert.ok(open.length <= 1, `${open.length} جریانِ باز`);
  sfx.stopAllVoices();
  await sleep(200);
});

test("dispose همه‌چیز را می‌بندد", async () => {
  sfx.playKimiaSfx("correct");
  sfx.startPourVoice();
  sfx.disposeSfx();
  await sleep(260);
  assert.equal(sfx.activeVoiceCount(), 0);
});
