import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { galaxyClock } from "../../components/UI/galaxy/scheduler";

const originals = new Map<string, PropertyDescriptor | undefined>();
let frames: Map<number, FrameRequestCallback>;
let win: EventTarget & { scrollY: number };
let doc: EventTarget & { hidden: boolean };
let unsubscribe: (() => void) | undefined;
let nextId = 0;
function install(name: string, value: unknown) {
  originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, value });
}
beforeEach(() => {
  frames = new Map();
  win = Object.assign(new EventTarget(), { scrollY: 0 });
  doc = Object.assign(new EventTarget(), { hidden: false });
  install("window", win);
  install("document", doc);
  install("requestAnimationFrame", (cb: FrameRequestCallback) => { frames.set(++nextId, cb); return nextId; });
  install("cancelAnimationFrame", (id: number) => frames.delete(id));
  galaxyClock.setAnimated(true);
});
afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  originals.clear();
});
function frame(now: number) {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(cb => cb(now));
}

test("visible motion renders on every display frame with one pending callback", () => {
  let ticks = 0;
  unsubscribe = galaxyClock.subscribe(() => ticks++);
  for (let i = 0; i < 120; i++) { assert.equal(frames.size, 1); frame(i * 1000 / 60); }
  assert.equal(ticks, 120);
});
test("slow visible frames preserve animation time, while paused time is excluded", () => {
  const deltas: number[] = [];
  unsubscribe = galaxyClock.subscribe(t => deltas.push(t.delta));
  frame(0);
  frame(80);
  galaxyClock.setActive(false);
  galaxyClock.setActive(true);
  frame(5000);
  assert.deepEqual(deltas, [0, 0.08, 0]);
});
test("scroll is coalesced into the next frame, including in reduced motion", () => {
  const offsets: number[] = [];
  galaxyClock.setAnimated(false);
  unsubscribe = galaxyClock.subscribe(tick => offsets.push(tick.scrollY));
  frame(0);
  assert.equal(frames.size, 0);
  for (const y of [10, 20, 50]) { win.scrollY = y; win.dispatchEvent(new Event("scroll")); }
  assert.equal(frames.size, 1);
  frame(16);
  assert.deepEqual(offsets, [0, 50]);
  assert.equal(frames.size, 0);
});
test("hidden tabs stop and resume using the current scroll position", () => {
  let latest = 0;
  unsubscribe = galaxyClock.subscribe(t => latest = t.scrollY);
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(frames.size, 0);
  galaxyClock.requestFrame();
  assert.equal(frames.size, 0);
  win.scrollY = 450;
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  frame(5000);
  assert.equal(latest, 450);
  assert.equal(frames.size, 1);
});
test("an offscreen host cannot be reactivated by the first scene subscription", () => {
  galaxyClock.setActive(false);
  unsubscribe = galaxyClock.subscribe(() => {});
  assert.equal(frames.size, 0);
  galaxyClock.setActive(true);
  assert.equal(frames.size, 1);
});
test("unmount cancels work and navigation back starts exactly one loop", () => {
  let ticks = 0;
  unsubscribe = galaxyClock.subscribe(() => ticks++);
  galaxyClock.setActive(false);
  unsubscribe();
  assert.equal(frames.size, 0);
  win.dispatchEvent(new Event("scroll"));
  assert.equal(frames.size, 0);
  unsubscribe = galaxyClock.subscribe(() => ticks++);
  frame(1000);
  assert.equal(ticks, 1);
  assert.equal(frames.size, 1);
});
