import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { licenseMarks, splitWords } from "@/lib/aruz-rapid/license";
import { parseUnitSpec, type ParsedUnit } from "@/lib/aruz-rapid/units";
import { DEFAULT_RAPID_ARUZ_CONFIG, getPreviewDuration } from "@/lib/aruz-rapid/config";
import data from "../../scripts/aruz-rapid/abyat.json";

/**
 * یادداشتِ اختیارِ شاعری پیش از بازی: کدام هجا در کدام کلمه.
 *
 * ⚠️ اگر کلمه اشتباه پیدا شود، دانش‌آموز روی کلمهٔ غلط به دنبالِ اختیار
 * می‌گردد — همان گمراهی‌ای که این یادداشت برای جلوگیری از آن است.
 */

const units = (spec: string): ParsedUnit[] => {
  const p = parseUnitSpec(spec);
  assert.ok(p.ok, spec);
  return p.units;
};

const wordsOf = (text: string, spec: string) =>
  licenseMarks(text, units(spec)).map((m) => [m.display, splitWords(text)[m.word * 2]]);

describe("کلمهٔ هجای اختیاری", () => {
  test("کسرهٔ بلندِ اضافه", () => {
    assert.deepEqual(
      wordsOf(
        "نَوبَتِ عِشرَت بِزَن، پیش آر جام",
        "نَو=- بَ=U تِ=-! عِش=- رَت=- بِ=U زَن=- پی=- شا=- ر=U جام=-",
      ),
      [["تِ", "نَوبَتِ"]],
    );
  });

  test("اختیارِ وزنی، پس از هجاهای کشیده", () => {
    assert.deepEqual(
      wordsOf(
        "مَعذور بِدارَندَش یِک روز جَفایی",
        "مَع=- ذو=- ر=U بِ=U دا=- رَن=- دَش=-^ یِک=- رو=- ز=U جَ=U فا=- یی=-",
      ),
      [["دَش", "بِدارَندَش"]],
    );
  });

  test("هجاهایی که با متن حرف\u200Cبه\u200Cحرف یکی نیستند («قَوامُ\u200Cالدّین» ← مُد دین)", () => {
    assert.deepEqual(
      wordsOf(
        "صاحِبِ صاحِب\u200Cقِران خواجِه قَوامُ\u200Cالدّین حَسَن",
        "صا=- حِ=U بِ=-! صا=- حِب=- قِ=U ران=- خوا=- جِه=-! قَ=U وا=- مُد=- دین=- حَ=U سَن=-",
      ),
      [
        ["بِ", "صاحِبِ"],
        ["جِه", "خواجِه"],
      ],
    );
  });

  test("همهٔ مصراع\u200Cهای seed: هر اختیار کلمه\u200Cای دارد که هجایش در آن است", () => {
    // «هٔ» در تلفظ «هِ یِ» است.
    const strip = (s: string) => s.replace(/ه\u0654/g, "هی").replace(/[\u064B-\u065F\u0670]/g, "");
    let misses = 0;
    for (const e of data as { key: string; text: string; units: string }[]) {
      for (const m of licenseMarks(e.text, units(e.units))) {
        const word = splitWords(e.text)[m.word * 2];
        assert.ok(word, e.key);
        // حرفِ اولِ هجا در همان کلمه است.
        if (!strip(word).includes(strip(m.display)[0])) misses++;
      }
    }
    assert.equal(misses, 0, `${misses} هجا در کلمهٔ نامربوط`);
  });
});

test("مصراعِ اختیاردار فرصتِ خواندنِ بیشتری دارد", () => {
  const c = DEFAULT_RAPID_ARUZ_CONFIG;
  const plain = { units: [{ id: "a", display: "تَ", length: "short" as const }] };
  const licensed = { units: [{ id: "a", display: "کِه", length: "long" as const, license: "length" as const }] };
  assert.equal(getPreviewDuration(c, plain as never), c.previewDurationMs);
  assert.equal(getPreviewDuration(c, licensed as never), c.previewDurationMs + c.licensePreviewExtraMs);
  assert.equal(getPreviewDuration(c, null), c.previewDurationMs);
});
