import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { arkFromAudioUrl, screenRow, screenRows, type KimiaSourceRow } from "@/lib/kimia/pool";
import { MAX_SLOTS, MIN_SLOTS, isCatalogFoot } from "@/lib/kimia/catalog";

/* ═══════════════════════════════════════════════════════════════════════════
   غربالِ مخزن، روی دادهٔ واقعی.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ این تست عمداً `lib/quiz/seed-data/aruz-questions.json` را می‌خواند و
   نه چند ردیفِ ساختگی. همان فایلی است که `npm run db:seed-aruz` جدولِ
   `questions` را با آن پر می‌کند، پس عملاً همان چیزی است که بازی در
   production می‌بیند.

   دو چیز را می‌سنجد که با نمونهٔ دست‌ساز قابلِ سنجش نیستند:
     • مخزن *واقعاً* به‌اندازهٔ کافی بزرگ است (نه اینکه کد درست باشد و
       خروجی صفر)
     • هیچ ردیفی بی‌صدا با تقطیعِ حدسی وارد نمی‌شود
   ═══════════════════════════════════════════════════════════════════════════ */

type SeedOption = { poem?: string[]; audioUrl?: string; isCorrect: boolean };
type SeedQuestion = { type: string; poem?: string[]; audioUrl?: string; options: SeedOption[] };

function seedRows(): KimiaSourceRow[] {
  const path = join(process.cwd(), "lib", "quiz", "seed-data", "aruz-questions.json");
  const data = JSON.parse(readFileSync(path, "utf8")) as SeedQuestion[];
  return data.map((q, i) => {
    const correct = q.options.find((o) => o.isCorrect);
    return {
      id: `seed-${i}`,
      type: q.type,
      poem: q.poem ?? null,
      audio_url: q.audioUrl ?? null,
      option_poem: correct?.poem ?? null,
      option_audio_url: correct?.audioUrl ?? null,
    };
  });
}

test("آدرسِ صوتی → ارکان", () => {
  assert.equal(
    arkFromAudioUrl("/audio/مفاعیلن-مفاعیلن-فعولن.mp3"),
    "مفاعیلن مفاعیلن فعولن",
  );
  // درصد-کدشده — بعضی ردیف‌ها این‌طورند
  assert.equal(
    arkFromAudioUrl("/audio/%D9%81%D8%B9%D9%88%D9%84%D9%86-%D9%81%D8%B9%D9%88%D9%84%D9%86.mp3"),
    "فعولن فعولن",
  );
  assert.equal(arkFromAudioUrl(null), null);
  assert.equal(arkFromAudioUrl(""), null);
  assert.equal(arkFromAudioUrl("/audio/.mp3"), null);
  assert.equal(arkFromAudioUrl("%E0%A4%A"), null, "درصد-کدِ خراب نباید استثنا بدهد");
});

test("هر دو نوعِ سؤالِ بانک به یک شکل خوانده می‌شوند", () => {
  const verse = ["مصراعِ اول", "مصراعِ دوم"];
  const audioToPoem = screenRow({
    id: "q1",
    type: "audio-to-poem",
    poem: null,
    audio_url: "/audio/فاعلاتن-فاعلاتن-فاعلن.mp3",
    option_poem: verse,
    option_audio_url: null,
  });
  assert.ok(audioToPoem.ok);
  assert.equal(audioToPoem.candidate.slotCount, 3);
  assert.deepEqual([...audioToPoem.candidate.verse], verse);

  const poemToAudio = screenRow({
    id: "q2",
    type: "poem-to-audio",
    poem: verse,
    audio_url: null,
    option_poem: null,
    option_audio_url: "/audio/فاعلاتن-فاعلاتن-فاعلن.mp3",
  });
  assert.ok(poemToAudio.ok);
  assert.equal(poemToAudio.candidate.meter.ark, "فاعلاتن فاعلاتن فاعلن");
});

test("ستونِ JSON، هم شیء و هم رشته — چون MariaDB رشته می‌دهد", () => {
  /* ⚠️ اگر این شکست، بازی روی production (MariaDB) مخزنِ خالی می‌دید و
     روی توسعه (MySQL) سالم به نظر می‌رسید. */
  const asString = screenRow({
    id: "q3",
    type: "poem-to-audio",
    poem: JSON.stringify(["یک", "دو"]),
    audio_url: null,
    option_poem: null,
    option_audio_url: "/audio/مفاعیلن-مفاعیلن-فعولن.mp3",
  });
  assert.ok(asString.ok);
  assert.deepEqual([...asString.candidate.verse], ["یک", "دو"]);

  const broken = screenRow({
    id: "q4",
    type: "poem-to-audio",
    poem: "{نه JSON",
    audio_url: null,
    option_poem: null,
    option_audio_url: "/audio/مفاعیلن-مفاعیلن-فعولن.mp3",
  });
  assert.equal(broken.ok, false);
});

test("هر ردیفِ مشکوکی رد می‌شود، با دلیلِ درست", () => {
  const base = {
    id: "x",
    poem: null,
    audio_url: null,
    option_poem: null,
    option_audio_url: null,
  };
  const verse = ["الف", "ب"];

  const wrongType = screenRow({ ...base, type: "weight-to-audio", poem: verse });
  assert.equal(wrongType.ok === false && wrongType.reason, "unsupported-type");

  const oneLine = screenRow({
    ...base,
    type: "poem-to-audio",
    poem: ["فقط یک مصراع"],
    option_audio_url: "/audio/مفاعیلن-مفاعیلن-فعولن.mp3",
  });
  assert.equal(oneLine.ok === false && oneLine.reason, "missing-verse");

  const noAudio = screenRow({ ...base, type: "poem-to-audio", poem: verse });
  assert.equal(noAudio.ok === false && noAudio.reason, "missing-audio");

  const unknownFoot = screenRow({
    ...base,
    type: "poem-to-audio",
    poem: verse,
    option_audio_url: "/audio/قلقلک-قلقلک.mp3",
  });
  assert.equal(unknownFoot.ok === false && unknownFoot.reason, "unknown-foot");

  // ارکانِ شناخته‌شده ولی وزنی که در جدول نیست
  const unknownMeter = screenRow({
    ...base,
    type: "poem-to-audio",
    poem: verse,
    option_audio_url: "/audio/مستفعل-مستفعل-مستفعل-فع.mp3",
  });
  assert.equal(unknownMeter.ok === false && unknownMeter.reason, "unknown-meter");

  // تک‌رکنی: مخزنِ تک‌جایگاهی «ساختنِ دنباله» نیست
  const singleFoot = screenRow({
    ...base,
    type: "poem-to-audio",
    poem: verse,
    option_audio_url: "/audio/مفتعلن.mp3",
  });
  assert.equal(singleFoot.ok === false && singleFoot.reason, "slot-count-out-of-range");
});

test("مخزنِ واقعیِ بانکِ عروض، بزرگ و سالم است", () => {
  const { candidates, diagnostics } = screenRows(seedRows());

  /* اعداد از اجرای همین تست روی بانکِ امروز آمده‌اند و آستانه‌ها عمداً
     پایین‌ترند: هدف گرفتنِ یک *افتِ* ناگهانی است (مثلاً وقتی کسی نامِ یک
     فایلِ صوتی را عوض کند) و نه قفل کردنِ عدد. */
  assert.ok(diagnostics.raw > 1000, `بانک کوچک شده: ${diagnostics.raw}`);
  assert.ok(diagnostics.valid > 900, `مخزنِ بازی کوچک شده: ${diagnostics.valid}`);
  assert.ok(
    diagnostics.valid / diagnostics.raw > 0.9,
    `نرخِ قبولی افتاده: ${(diagnostics.valid / diagnostics.raw).toFixed(3)}`,
  );
  assert.ok(Object.keys(diagnostics.byMeter).length >= 25, "تنوعِ وزن کم شده");

  // هیچ ردیفی بدونِ دلیلِ صریح کنار گذاشته نشده
  const counted = Object.values(diagnostics.reasons).reduce((a, b) => a + b, 0);
  assert.equal(counted, diagnostics.excluded);

  for (const candidate of candidates) {
    assert.equal(candidate.verse.length, 2, "بیت باید دقیقاً دو مصراع نشان بدهد");
    assert.ok(candidate.verse.every((line) => line.trim().length > 0));
    assert.ok(candidate.slotCount >= MIN_SLOTS && candidate.slotCount <= MAX_SLOTS);
    assert.equal(candidate.slotCount, candidate.meter.canonical.length);
    for (const sequence of candidate.meter.accepted) {
      assert.equal(sequence.length, candidate.slotCount);
      for (const foot of sequence) assert.ok(isCatalogFoot(foot));
    }
  }
});

test("⚠️ نمایشِ بیتِ کامل، تعدادِ جایگاه‌ها را دو برابر نمی‌کند", () => {
  /* ارکان وزنِ یک *مصراع* را وصف می‌کند. اگر روزی کسی `slotCount` را از
     روی کلِ بیت حساب کند، مخزنِ هشت‌جایگاهی برای وزنِ چهاررکنی می‌سازد و
     بازی از ریشه غلط می‌شود. */
  const { candidates } = screenRows(seedRows());
  for (const candidate of candidates) {
    assert.equal(candidate.verse.length, 2);
    assert.ok(candidate.slotCount <= 4, `${candidate.meter.ark}: ${candidate.slotCount} جایگاه`);
  }
});
