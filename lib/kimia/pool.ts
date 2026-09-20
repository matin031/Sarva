import {
  MAX_SLOTS,
  MIN_SLOTS,
  isKnownFoot,
  kimiaMeterFor,
  normalizeFoot,
  splitArk,
  type KimiaMeter,
} from "./catalog";

/* ═══════════════════════════════════════════════════════════════════════════
   از کجا می‌فهمیم وزنِ یک بیت چیست؟ — بانکِ عروضِ سماعی.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ هیچ بانکِ تازه‌ای ساخته نشد، و این عمدی‌ترین تصمیمِ کلِ این feature است.

   سروا از قبل یک جفتِ (بیت، وزن)ِ تأییدشده دارد و درست جلوی چشم بود:
   جدولِ `questions` + `question_options` که «عروضِ سماعی» از آن بازی
   می‌شود. هر سؤالِ آن بانک دقیقاً همین را می‌گوید:

     نوعِ `audio-to-poem`  → صدای سؤال ریتمِ یک وزن است، و گزینهٔ درست
                             بیتی است که در همان وزن سروده شده.
     نوعِ `poem-to-audio`  → برعکسش: بیت در متنِ سؤال، و صدای گزینهٔ درست
                             ریتمِ وزنِ همان بیت.

   و وزن کجای آن نوشته شده؟ در **نامِ فایلِ صوتی**:
   `‎/audio/مفاعیلن-مفاعیلن-فعولن.mp3` یعنی ارکانِ متعارفِ آن بیت. همان
   قراردادی که `lib/audioManifest.ts` و `components/UI/guide/VaznYabSection`
   از قبل رویش کار می‌کنند.

   پس «کیمیای وزن» یک *آداپتور* روی همان بانک است و نه یک حقیقتِ دوم:
     • مدیر یک بیت را در پنل اصلاح کند، هر دو بازی اصلاح می‌شوند.
     • «گزارشِ اشکال» به همان پرسشِ واقعی می‌رسد (`area: "quiz"`).
     • هیچ تقطیعی اینجا حدس زده نمی‌شود — چیزی که نتوان از همین بانک
       خواند، از مخزنِ بازی بیرون می‌ماند.

   ⚠️ و یک نکتهٔ آموزشیِ ظریف: ارکان، وزنِ یک **مصراع** را وصف می‌کند و نه
   مجموعِ دو مصراع. بیت روی صفحه کامل نشان داده می‌شود (شعر جفتی خوانده
   می‌شود)، ولی مخزن به‌اندازهٔ ارکانِ همان یک مصراع جایگاه دارد. سه رکن
   یعنی سه جایگاه، نه شش. `slotCount` دقیقاً همین است و هیچ‌جا دو برابر
   نمی‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

/** یک ردیفِ خامِ خوانده‌شده از بانکِ عروض. */
export type KimiaSourceRow = {
  id: string;
  type: string;
  /** بیتِ خودِ سؤال (در `poem-to-audio`). */
  poem: unknown;
  /** صدای خودِ سؤال (در `audio-to-poem`). */
  audio_url: string | null;
  /** بیتِ گزینهٔ درست (در `audio-to-poem`). */
  option_poem: unknown;
  /** صدای گزینهٔ درست (در `poem-to-audio`). */
  option_audio_url: string | null;
};

/** یک نامزدِ پذیرفته‌شده — همه‌چیزی که یک دور لازم دارد. */
export type KimiaCandidate = {
  readonly questionId: string;
  /** دو مصراع، پاک‌سازی‌شده. */
  readonly verse: readonly string[];
  readonly meter: KimiaMeter;
  readonly slotCount: number;
};

/** چرا یک ردیف کنار گذاشته شد. برای گزارش، نه برای کاربر. */
export type ExclusionReason =
  | "unsupported-type"
  | "missing-audio"
  | "missing-verse"
  | "unparsable-ark"
  | "unknown-foot"
  | "unknown-meter"
  | "slot-count-out-of-range";

export type PoolDiagnostics = {
  readonly raw: number;
  readonly valid: number;
  readonly excluded: number;
  readonly reasons: Record<ExclusionReason, number>;
  /** ارکانِ هر وزن → چند نامزد. */
  readonly byMeter: Record<string, number>;
  /** تعدادِ جایگاه → چند نامزد. */
  readonly bySlotCount: Record<number, number>;
  /** ارکانِ یکتایی که در مخزن ظاهر می‌شوند. */
  readonly uniqueFeet: string[];
  /** اوزانی که بیش از یک تقطیعِ پذیرفتنی دارند. */
  readonly metersWithAlternatives: string[];
};

/**
 * ستونِ JSON → آرایهٔ رشته.
 *
 * ⚠️ در MySQL نوعِ JSON واقعی است و `mysql2` شیء می‌دهد؛ در MariaDB — که
 * میزبانِ production است — `JSON` نامِ مستعارِ LONGTEXT است و همان ستون
 * **رشته** برمی‌گردد. کدی که فقط روی یکی امتحان شده باشد، روی آن یکی
 * بی‌صدا مخزنِ خالی می‌سازد. (همان درسی که `lib/aruz-rapid/content.ts` هم
 * با همین کامنت نوشته است.)
 */
function readPoem(value: unknown): string[] {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * `‎/audio/مفاعیلن-مفاعیلن-فعولن.mp3` → `مفاعیلن مفاعیلن فعولن`.
 *
 * ⚠️ `decodeURIComponent` لازم است: بعضی ردیف‌ها آدرس را درصد-کدشده ذخیره
 * کرده‌اند و بعضی نه. اگر آدرس اصلاً قابلِ رمزگشایی نبود، `null` — و نه
 * یک حدس روی رشتهٔ خام.
 */
export function arkFromAudioUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let path = url.trim();
  if (path.length === 0) return null;
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  const file = path.split(/[\\/]/).pop() ?? "";
  const base = file.replace(/\.[a-z0-9]+$/i, "");
  if (base.length === 0) return null;
  const ark = normalizeFoot(base.replace(/-/g, " "));
  return ark.length === 0 ? null : ark;
}

type Screened =
  | { ok: true; candidate: KimiaCandidate }
  | { ok: false; reason: ExclusionReason };

/** یک ردیف → نامزد، یا دلیلِ ردش. هیچ حدسی، هیچ عقب‌نشینی‌ای. */
export function screenRow(row: KimiaSourceRow): Screened {
  let verse: string[];
  let audioUrl: string | null;

  if (row.type === "audio-to-poem") {
    verse = readPoem(row.option_poem);
    audioUrl = row.audio_url;
  } else if (row.type === "poem-to-audio") {
    verse = readPoem(row.poem);
    audioUrl = row.option_audio_url;
  } else {
    /* `weight-to-audio` عمداً بیرون است: متنِ سؤالش *خودِ ارکان* است و نه
       یک بیت، پس بیتی برای ساختن وجود ندارد. */
    return { ok: false, reason: "unsupported-type" };
  }

  if (verse.length < 2) return { ok: false, reason: "missing-verse" };
  if (!audioUrl) return { ok: false, reason: "missing-audio" };

  const ark = arkFromAudioUrl(audioUrl);
  if (!ark) return { ok: false, reason: "unparsable-ark" };

  const feet = splitArk(ark);
  if (feet.some((foot) => !isKnownFoot(foot))) return { ok: false, reason: "unknown-foot" };
  if (feet.length < MIN_SLOTS || feet.length > MAX_SLOTS) {
    return { ok: false, reason: "slot-count-out-of-range" };
  }

  const meter = kimiaMeterFor(ark);
  // یا وزن در جدولِ `METERS` نیست، یا فایلِ صوتی‌اش در فهرستِ موجود نیست.
  // هر دو یعنی «نمی‌دانیم»، و «نمی‌دانیم» یعنی بیرون.
  if (!meter) return { ok: false, reason: "unknown-meter" };

  return {
    ok: true,
    candidate: {
      questionId: row.id,
      // دو مصراعِ اول کافی است؛ بانک جایی بیش از دو ندارد ولی اتکا به آن
      // یعنی یک ردیفِ عجیب چیدمانِ بیت را خراب کند.
      verse: verse.slice(0, 2),
      meter,
      slotCount: meter.canonical.length,
    },
  };
}

/** غربالِ یک دسته ردیف + سنجه‌هایی که گزارشِ نهایی به آن‌ها تکیه می‌کند. */
export function screenRows(rows: readonly KimiaSourceRow[]): {
  candidates: KimiaCandidate[];
  diagnostics: PoolDiagnostics;
} {
  const candidates: KimiaCandidate[] = [];
  const reasons: Record<ExclusionReason, number> = {
    "unsupported-type": 0,
    "missing-audio": 0,
    "missing-verse": 0,
    "unparsable-ark": 0,
    "unknown-foot": 0,
    "unknown-meter": 0,
    "slot-count-out-of-range": 0,
  };
  const byMeter: Record<string, number> = {};
  const bySlotCount: Record<number, number> = {};
  const feet = new Set<string>();
  const withAlternatives = new Set<string>();

  for (const row of rows) {
    const screened = screenRow(row);
    if (!screened.ok) {
      reasons[screened.reason] += 1;
      continue;
    }
    const { candidate } = screened;
    candidates.push(candidate);
    byMeter[candidate.meter.ark] = (byMeter[candidate.meter.ark] ?? 0) + 1;
    bySlotCount[candidate.slotCount] = (bySlotCount[candidate.slotCount] ?? 0) + 1;
    for (const sequence of candidate.meter.accepted) for (const foot of sequence) feet.add(foot);
    if (candidate.meter.accepted.length > 1) withAlternatives.add(candidate.meter.ark);
  }

  return {
    candidates,
    diagnostics: {
      raw: rows.length,
      valid: candidates.length,
      excluded: rows.length - candidates.length,
      reasons,
      byMeter,
      bySlotCount,
      uniqueFeet: [...feet].sort(),
      metersWithAlternatives: [...withAlternatives].sort(),
    },
  };
}
