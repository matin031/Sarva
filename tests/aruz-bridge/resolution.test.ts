import test from "node:test";
import assert from "node:assert/strict";
import { nextBridgeDpr } from "../../lib/aruz-bridge/resolution";

test("healthy frame budgets preserve resolution", () => {
  for (const ms of [8.3, 16.7, 25]) assert.equal(nextBridgeDpr(1.5, ms), 1.5);
});
test("sustained overload reduces resolution in bounded steps", () => {
  assert.equal(nextBridgeDpr(1.5, 33.3), 1.25);
  assert.equal(nextBridgeDpr(1.25, 50), 1);
  assert.equal(nextBridgeDpr(1.1, 50), 1);
  assert.equal(nextBridgeDpr(1, 100), 1);
});
test("invalid measurements never change resolution", () => {
  assert.equal(nextBridgeDpr(1.5, NaN), 1.5);
  assert.equal(nextBridgeDpr(1.5, Infinity), 1.5);
});
