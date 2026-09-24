import { test } from "node:test";
import assert from "node:assert/strict";
import { detectQuality } from "../../components/UI/galaxy/quality";

function sample({ reduced = false, coarse = false, cores = 12, memory = 8, dpr = 1 } = {}, override = false) {
  const win = Object.getOwnPropertyDescriptor(globalThis, "window");
  const nav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { devicePixelRatio: dpr, matchMedia: (q: string) => ({ matches: q.includes("reduced-motion") ? reduced : coarse }) } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { hardwareConcurrency: cores, deviceMemory: memory } });
  try { return detectQuality(override); }
  finally {
    if (win) Object.defineProperty(globalThis, "window", win); else Reflect.deleteProperty(globalThis, "window");
    if (nav) Object.defineProperty(globalThis, "navigator", nav); else Reflect.deleteProperty(globalThis, "navigator");
  }
}
test("12 logical cores keep desktop motion enabled", () => {
  assert.equal(sample().reducedMotion, false);
  assert.equal(sample().tier, "high");
});
test("low-memory touch devices keep their animations", () => {
  const profile = sample({ coarse: true, cores: 4, memory: 4 });
  assert.equal(profile.tier, "balanced");
  assert.equal(profile.reducedMotion, false);
  assert.equal(profile.cableAnimation, true);
});
test("OS reduced motion is respected unless explicitly overridden for this page", () => {
  assert.equal(sample({ reduced: true }).reducedMotion, true);
  assert.equal(sample({ reduced: true }, true).reducedMotion, false);
  assert.equal(sample({ reduced: true, coarse: true, cores: 4 }, true).cableAnimation, true);
});
