import { test } from "node:test";
import assert from "node:assert/strict";
import { findMeterLocally } from "../../lib/aruz";
import { coupletSchema } from "../../lib/aruz/input";

test("does not present an unrelated metre for unscannable input", () => {
  for (const line of ["", "سلام", "الف ".repeat(15)]) assert.equal(findMeterLocally(line), undefined);
  assert.equal(findMeterLocally("اگر آن ترک شیرازی به دست آرد دل ما را", ""), undefined);
});
test("requires metrical evidence for both supplied hemistichs", () => {
  assert.equal(findMeterLocally("ز راه میکده یاران عنان بگردانید", "چرا که حافظ از این راه رفت و مفلس شد"), undefined);
});
test("still detects a supported couplet", () => {
  const result = findMeterLocally("اگر آن ترک شیرازی به دست آرد دل ما را", "به خال هندویش بخشم سمرقند و بخارا را");
  assert.equal(result?.ark, "مفاعیلن مفاعیلن مفاعیلن مفاعیلن");
});
test("form accepts punctuation and complete long lines, and bounds input", () => {
  assert(coupletSchema.safeParse({ poem1: "صلاحِ کار کجا و منِ خراب کجا؟", poem2: "ببین تفاوتِ رَه کز کجاست تا به کجا!" }).success);
  assert(coupletSchema.safeParse({ poem1: "دل ".repeat(20).trim(), poem2: "صلاح کار کجا و من خراب کجا" }).success);
  assert(!coupletSchema.safeParse({ poem1: "الف".repeat(54), poem2: "صلاح کار کجا و من خراب کجا" }).success);
});
