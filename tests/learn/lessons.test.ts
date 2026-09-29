import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { LESSONS } from "../../lib/learn";
import { bare, parseLine, targetCount } from "../../lib/learn/line";

/** میان‌بُرهایی که مقصدشان هنوز ساخته نشده؛ `DetourBeat` برایشان «به‌زودی»
 *  نشان می‌دهد. هر مقصدِ دیگری باید درسِ واقعی باشد. */
const SOON = new Set(["/learn/esteare"]);

for (const lesson of LESSONS) test(`${lesson.slug}: every beat is well-formed and answerable`, () => {
  assert.ok(existsSync(`app/learn/${lesson.slug}/page.tsx`), `no page for /learn/${lesson.slug}`);
  const named = JSON.stringify(lesson.beats).includes("%نام%");
  assert.equal(!!lesson.needsName, named, "needsName must match whether the lesson says %نام%");
  const focusCount = (line: string) => parseLine(line).filter(token => token.focus).length;
  for (const [i, beat] of lesson.beats.entries()) {
    const at = `${lesson.slug} beat ${i} (${beat.kind})`;
    switch (beat.kind) {
      case "chapter":
        // عنوانِ فصل از `Rich` رد نمی‌شود، پس `%نام%` آنجا خام نمایش داده می‌شد.
        assert.doesNotMatch(beat.title, /%نام%/, at); break;
      case "choice": assert.equal(beat.options.filter(o => o.correct).length, 1, at); break;
      case "catch": assert.ok(beat.items.some(x => x.ok) && beat.items.some(x => !x.ok), at); break;
      case "judge": for (const item of beat.items) assert.equal(focusCount(item.line), 1, `${at}: «${item.line}» must mark one word with |…|`); break;
      case "cards": assert.ok(beat.need <= beat.cards.length, at); break;
      case "tap": case "round": for (const item of beat.kind === "tap" ? [beat.item] : beat.items) {
        const answers = new Set(parseLine(item.line).flatMap(t => t.target === undefined ? [] : [bare(t.text)]));
        assert.ok(answers.size, `${at}: «${item.line}» has no answer`);
        for (const key of Object.keys(item.notes ?? {})) assert.ok(!answers.has(key), `${at}: note on answer word «${key}»`);
      } break;
      case "pillars": for (const item of beat.items) {
        assert.equal(item.roles.length, targetCount(item.line), `${at}: «${item.line}» roles`);
        const ask = item.ask ?? item.roles.map((_, n) => n);
        assert.deepEqual([...ask].sort((a, b) => a - b), item.roles.map((_, n) => n), `${at}: ask must cover every role once`);
      } break;
      case "sort":
        assert.ok(beat.bins.length >= 2, at);
        for (const item of beat.items) {
          assert.ok(item.bin >= 0 && item.bin < beat.bins.length, `${at}: «${item.line}» bin`);
          assert.equal(focusCount(item.line), 1, `${at}: «${item.line}» must mark one word with |…|`);
        }
        beat.bins.forEach((bin, b) => assert.ok(beat.items.some(item => item.bin === b), `${at}: bin «${bin.label}» is never right`));
        break;
      case "morph": {
        assert.equal(focusCount(beat.line), 1, `${at}: «${beat.line}» must mark one word`);
        const words = new Set(parseLine(beat.line).map(t => bare(t.text)));
        for (const clue of beat.clue.split(/\s+/)) assert.ok(words.has(bare(clue)), `${at}: clue «${clue}» is not in the line`);
        break;
      }
      case "build": {
        const pool = [...beat.pieces];
        for (const piece of beat.answer) { const n = pool.indexOf(piece); assert.ok(n >= 0, `${at}: «${piece}» is not a piece`); pool.splice(n, 1); }
        assert.ok(pool.length, `${at}: a builder needs at least one decoy`);
        assert.ok(targetCount(beat.line), `${at}: the line marks no answer`);
        break;
      }
      case "detour": assert.ok(SOON.has(beat.to) || LESSONS.some(l => `/learn/${l.slug}` === beat.to), `${at}: ${beat.to} is not a lesson`); break;
      case "fork": assert.ok(lesson.beats.slice(i).some(b => b.kind === "finish"), `${at}: the «no» branch needs a finish`); break;
    }
  }
  assert.equal(lesson.beats.at(-1)?.kind, "finish", "the lesson must end on its finish");
});

test("slugs are unique", () => {
  assert.equal(new Set(LESSONS.map(l => l.slug)).size, LESSONS.length);
});
