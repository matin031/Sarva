import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fitMeter, meterPattern, RAPID_METERS, scanHemistich } from "@/lib/aruz-rapid/scan";
import { unitPattern } from "@/lib/aruz-rapid/units";
import data from "../../scripts/aruz-rapid/abyat.json";
import { parseUnitSpec } from "@/lib/aruz-rapid/units";

/**
 * پیشنهادِ تقطیع در پنلِ «کوتاه یا بلند؟».
 *
 * ⚠️ هر حالتِ اینجا قاعده‌ای است که اگر بشکند، مدیر تقطیعِ غلطی پیشنهاد
 * می‌گیرد و — اگر با وزن هم بخواند — ذخیره‌اش می‌کند.
 */

const text = (units: { display: string; length: string }[]) =>
  units.map((u) => u.display + (u.length === "short" ? "U" : "-")).join(" ");

describe("تقطیعِ پیشنهادی", () => {
  test("هجای کشیده میانِ مصراع: بلند + کوتاه، کوتاه صامتِ آخر است", () => {
    const r = scanHemistich("زِ ناودانِ قَضا آبِ حُکم بِگشادَست", "مفاعلن فعلاتن مفاعلن فعلن");
    assert.ok(r.ok);
    assert.match(text(r.units), /حُک- مU/);
  });

  test("«بوده است» شنیده می\u200Cشود «بودست»: بو دَس ت", () => {
    const r = scanHemistich("دِلَم بوده اَست یارا", "مفاعیلن فعولن");
    assert.ok(r.ok, JSON.stringify(r));
    assert.match(text(r.units), /بو- دَس- تU/);
  });

  test("هجای آخرِ مصراع همیشه بلند و یک\u200Cتکه است", () => {
    const r = scanHemistich("مَنَم کِه دیدِه بِه دیدارِ دوست کَردَم باز", "مفاعلن فعلاتن مفاعلن فعلن");
    assert.ok(r.ok);
    assert.equal(r.units.at(-1)?.display, "باز");
    assert.equal(r.units.at(-1)?.length, "long");
  });

  test("نونِ ساکن پس از مصوتِ بلند به حساب نمی\u200Cآید: «جان» بلند است، نه کشیده", () => {
    const r = scanHemistich("خُدایا چُنان کُن سَرانجامِ کار", "فعولن فعولن فعولن فعل");
    assert.ok(r.ok);
    assert.match(text(r.units), /ران- جا-/);
  });

  test("حذفِ همزه: «دِل اَز» ← دِ لَز", () => {
    const r = scanHemistich("خُود دِل از زُلفِ تُو دُشوار تَوان داشت نِگاه", "فعلاتن فعلاتن فعلاتن فعلن");
    assert.ok(r.ok);
    assert.match(text(r.units), /دِU لَز-/);
  });

  test("«صوفیِ ما» ← صو فِ یِ ما: مصوتِ پیش از کسرهٔ اضافه کوتاه و کسره بلند", () => {
    const r = scanHemistich("صوفیِ ما کِه زِ وِردِ سَحَری مَست شُدی", "فعلاتن فعلاتن فعلاتن فعلن");
    assert.ok(r.ok);
    assert.match(text(r.units), /^صو- فِU یِ- ما-/);
  });

  test("اختیارِ زبانی روی همان هجا نشان می\u200Cخورد: «نَوبَتِ» ← تِ بلند", () => {
    const r = scanHemistich("نَوبَتِ عِشرَت بِزَن، پیش آر جام", "فاعلاتن فاعلاتن فاعلن");
    assert.ok(r.ok, JSON.stringify(r));
    const licensed = r.units.filter((u) => u.license);
    assert.deepEqual(licensed, [{ display: "تِ", length: "long", license: "length" }]);
  });

  test("«کاو» = کِه او: یک هجای بلند", () => {
    const r = scanHemistich("کاو مَرد نَه دید اَز چِه آبِستَن شُد", "مفعول مفاعیل مفاعیل فعل");
    assert.ok(r.ok, JSON.stringify(r));
    assert.deepEqual(r.units[0], { display: "کاو", length: "long" });
  });

  test("اعرابی که با وزن نمی\u200Cخواند، رد می\u200Cشود", () => {
    const r = scanHemistich("تَوانا بُوَد هَر کِه دانا بُوَد", "مفاعلن فعلاتن مفاعلن فعلن");
    assert.equal(r.ok, false);
  });
});

describe("گونه\u200Cهای مجازِ وزن", () => {
  test("فاعلاتن به\u200Cجای فعلاتن فقط در آغاز", () => {
    const m = "فعلاتن فعلاتن فعلاتن فعلن";
    assert.ok(fitMeter("-U--UU--UU--UU-", m));
    assert.equal(fitMeter("UU---U--UU--UU-", m), null);
  });

  test("قلب فقط در مفتعلنِ واقعی، نه در «-UU-»ی که از مرزِ دو رکن می\u200Cگذرد", () => {
    // مجتث: «-UU-»ی جایگاهِ ۳ تا ۶ نیمی از مفاعلن و نیمی از فعلاتن است.
    assert.equal(fitMeter("U-UU-U--U-U-UU-", "مفاعلن فعلاتن مفاعلن فعلن"), null);
    assert.ok(fitMeter("U-U-U-U--UU-U-U-", "مفتعلن مفاعلن مفتعلن مفاعلن"));
  });

  test("هجای آخر آزاد است", () => {
    assert.ok(fitMeter("U--U--U--UU", "فعولن فعولن فعولن فعل"));
  });

  test("تسکین در هزجِ اخرب: «مفاعیلُ مفاعیلُ» ← «مفاعیلن مفعولُ»، با نشانِ اختیارِ وزنی", () => {
    const m = "مفعول مفاعیل مفاعیل فعولن";
    assert.ok(fitMeter("--UU-----UU--", m));
    // فقط همان مرز؛ دو کوتاهِ دیگر یک بلند نمی\u200Cشوند.
    assert.equal(fitMeter("---U--UU-U--", m), null);
    const r = scanHemistich("مَعذور بِدارَندَش یِک روز جَفایی", m);
    assert.ok(r.ok, JSON.stringify(r));
    assert.deepEqual(r.units.filter((u) => u.license), [{ display: "دَش", length: "long", license: "meter" }]);
  });

  test("رباعی: گونه\u200Cهای اخرب و اخرم بی\u200Cاختیار، و در فهرستِ پنل", () => {
    const m = "مفعول مفاعیل مفاعیل فعل";
    assert.ok(RAPID_METERS.some((x) => x.ark === m));
    assert.deepEqual(fitMeter("--UU--UU--U-", m)?.lic, []);
    assert.deepEqual(fitMeter("----U-U--UU-", m)?.lic, []);
  });

  test("اعرابِ نامِ رکن نادیده گرفته می\u200Cشود", () => {
    assert.equal(meterPattern("فعولن فعولن فعولن فَعَل"), "U--U--U--U-");
  });
});

describe("دادهٔ seed", () => {
  test("هر مصراع با وزنِ خودش می\u200Cخواند", () => {
    const entries = data as { key: string; units: string; meter: string }[];
    assert.ok(entries.length > 1100);
    for (const e of entries) {
      const p = parseUnitSpec(e.units);
      assert.ok(p.ok, e.key);
      assert.ok(fitMeter(unitPattern(p.units), e.meter), `${e.key} با «${e.meter}» نمی\u200Cخواند`);
      // مصراعی با این\u200Cهمه اختیار برای تمرین گمراه\u200Cکننده است.
      assert.ok(p.units.filter((u) => u.license).length <= 3, `${e.key}: بیش از سه اختیار`);
    }
  });
});
