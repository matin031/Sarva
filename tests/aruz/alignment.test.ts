import assert from "node:assert/strict";
import test from "node:test";
import { align } from "../../lib/aruz/align";

test("alignment cannot leave a whole metrical syllable unconsumed", () => {
  for (const word of ["دل", "من", "می"]) {
    assert.equal(align(word, "--"), null, word);
  }
});

test("requiring complete consumption preserves a valid final syllable", () => {
  for (const word of ["دل", "من", "می"]) {
    assert.deepEqual(align(word, "-"), [[word, "-"]]);
  }
});
