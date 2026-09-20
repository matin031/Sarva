import "server-only";
import { randomUUID } from "node:crypto";
import { execute, queryOne, transaction } from "@/lib/db";
import { joinArk, kimiaMeterFor, type FootKey } from "../catalog";
import { decideAttempt } from "../round-state";
import type { KimiaErrorType } from "../scansion";
import { decide, toVerdict, type Decision } from "../verdict";
import type { KimiaCandidate } from "../pool";
import type { KimiaVerdict } from "../types";

/* ═══════════════════════════════════════════════════════════════════════════
   چرخهٔ عمرِ یک دور — ساختن، سنجیدن، بستن.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ ارکانِ درست از **ردیفِ خودِ دور** خوانده می‌شود و نه دوباره از جدولِ
   پرسش‌ها. دو دلیل، و دومی مهم‌تر است:

     ۱) یک کوئریِ کمتر در مسیرِ داغ.
     ۲) اگر مدیر وسطِ بازیِ کسی همان سؤال را اصلاح کند، دورِ در جریان با
        همان چیزی سنجیده می‌شود که بازیکن دیده — نه با نسخهٔ تازه. بدونِ
        این snapshot، پاسخی که روی صفحه درست بود می‌توانست غلط ثبت شود.
        (همان دلیلی که `aruz_bridge_answers` هم `correct_pattern` را
        snapshot می‌کند.)

   ⚠️ و هیچ‌جای این فایل به بدنهٔ درخواست برای «درست/غلط» نگاه نمی‌شود.
   ورودیِ مرورگر فقط «چه چیدمانی ساختم» است.
   ═══════════════════════════════════════════════════════════════════════════ */

export type RoundRow = {
  id: string;
  question_id: string | null;
  verse: string;
  meter_ark: string;
  meter_name: string;
  slot_count: number;
  status: string;
  attempts_count: number;
  last_attempt_id: string | null;
  last_selected: string | null;
  last_correct: number | boolean | null;
  last_error_type: string | null;
};

/** ⚠️ ستونِ ۴۰۰ نویسه است و بلندترین بیتِ بانک خیلی کمتر؛ برش فقط نگهبانِ
 *  محتوای غیرمنتظره است، نه اتفاقی که انتظارش را داریم. */
function verseSnapshot(verse: readonly string[]): string {
  return verse.join(" ¶ ").slice(0, 400);
}

/** یک دورِ تازه برای یک کاربرِ واردشده. شناسه را سرور می‌سازد. */
export async function createRound(
  userId: string,
  candidate: KimiaCandidate,
): Promise<string> {
  const roundId = randomUUID();
  await execute(
    `insert into kimia_rounds
       (id, user_id, question_id, verse, meter_ark, meter_name, slot_count)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [
      roundId,
      userId,
      candidate.questionId,
      verseSnapshot(candidate.verse),
      joinArk(candidate.meter.canonical),
      candidate.meter.name.slice(0, 191),
      candidate.slotCount,
    ],
  );
  return roundId;
}

export function loadRound(roundId: string, userId: string): Promise<RoundRow | null> {
  return queryOne<RoundRow>(
    `select id, question_id, verse, meter_ark, meter_name, slot_count, status,
            attempts_count, last_attempt_id, last_selected, last_correct, last_error_type
       from kimia_rounds
      where id = ? and user_id = ?`,
    [roundId, userId],
  );
}

export type RecordOutcome =
  | { ok: true; verdict: KimiaVerdict }
  | { ok: false; reason: "not-found" | "unsupported-meter" };

/**
 * ثبتِ یک تلاش — اتمیک، و بی‌اثر در برابرِ ثبتِ دوباره.
 *
 * ⚠️ چرا تراکنش با `for update` و نه یک `update … where`:
 *
 * سه چیز باید با هم و بدونِ وقفه اتفاق بیفتد — خواندنِ وضعیت، تصمیم دربارهٔ
 * «این تلاشِ اول است یا نه»، و نوشتن. اگر دو تبِ باز هم‌زمان بفرستند و
 * خواندن از نوشتن جدا باشد، هر دو خودشان را «تلاشِ اول» می‌بینند و ستونِ
 * `first_*` — یعنی تنها شاهدِ واقعیِ یادگیری — به دستِ آخرین نویسنده
 * می‌افتد. `for update` ردیف را تا پایانِ تراکنش قفل می‌کند و دومی پشتِ
 * اولی صف می‌بندد و آن‌وقت *می‌بیند* که تلاشِ اول قبلاً ثبت شده.
 *
 * ⚠️ و `affectedRows` هیچ‌جا مبنای تصمیم نیست. درسِ گران‌قیمتِ
 * `role_hunt/answers`: روی MariaDB — یعنی همان چیزی که production اجرا
 * می‌کند — عددش با MySQL فرق دارد. اینجا وضعیت از خودِ ردیفِ قفل‌شده
 * خوانده می‌شود، که در هر دو موتور یکی است.
 *
 * ⚠️ `completed_at` با `now(6)` نوشته می‌شود و نه با یک `Date` از Node، با
 * اینکه مقدارش شرطی است (`case when ? = 1 …`). قراردادِ
 * `docs/time-contract.md`: در یک جدول یا همه‌چیز ساعتِ دیتابیس است یا همه
 * ساعتِ Node. `started_at` و `answered_at` ساعتِ دیتابیس‌اند — مثلِ
 * `answered_at` در همهٔ جدول‌های پاسخ — پس این یکی هم باید باشد. مخلوط
 * کردنشان همان اشتباهی است که یک بار اشتراکِ دبیرها را ۳٫۵ ساعت عقب
 * انداخت.
 */
export async function recordAttempt(input: {
  userId: string;
  roundId: string;
  attemptId: string;
  selected: readonly FootKey[];
  /** از سمتِ کلاینت، فقط برای تلاشِ اول. کران‌دار و بی‌اثر بر درستی. */
  responseMs: number | null;
}): Promise<RecordOutcome> {
  return transaction(async (tx) => {
    const row = await tx.queryOne<RoundRow>(
      `select id, question_id, verse, meter_ark, meter_name, slot_count, status,
              attempts_count, last_attempt_id, last_selected, last_correct, last_error_type
         from kimia_rounds
        where id = ? and user_id = ?
        for update`,
      [input.roundId, input.userId],
    );
    if (!row) return { ok: false as const, reason: "not-found" as const };

    const decision = decide(row.meter_ark, input.selected);
    if (!decision) return { ok: false as const, reason: "unsupported-meter" as const };

    /* ⚠️ «آیا این تلاش چیزی را عوض می‌کند و چه چیزی را» یک تصمیمِ *خالص*
       است و در `lib/kimia/round-state.ts` زندگی می‌کند — تا بشود بدونِ
       دیتابیس آزمودش. اینجا فقط اجرا می‌شود.

       دو حالتِ «هیچ تغییری» (تلاشِ تکراریِ شبکه، و دورِ بسته) هر دو *همان
       بازخوردِ ثبت‌شده* را برمی‌گردانند و نه یک خطا: کلاینتی که دوباره
       فرستاده باید همان چیزی را ببیند که بار اول دیده. فقط `saved` راستش
       را می‌گوید. */
    const plan = decideAttempt(
      {
        status: row.status === "completed" ? "completed" : "active",
        attemptsCount: Number(row.attempts_count),
        lastAttemptId: row.last_attempt_id,
        lastCorrect:
          row.last_correct === null ? null : row.last_correct === 1 || row.last_correct === true,
        lastErrorType: (row.last_error_type as KimiaErrorType | null) ?? null,
      },
      {
        attemptId: input.attemptId,
        selected: input.selected,
        isCorrect: decision.isCorrect,
        errorType: decision.errorType,
        responseMs: input.responseMs,
      },
      (feet) => joinArk(feet).slice(0, 160),
    );

    if (plan.kind !== "write") {
      return {
        ok: true as const,
        verdict: toVerdict(
          storedDecision(row),
          row.meter_name,
          false,
          Number(row.attempts_count),
        ),
      };
    }

    const { write } = plan;
    const isFirst = write.first !== null;
    const attemptsCount = write.attemptsCount;
    const selectedText = write.selectedText;
    const errorType = write.errorType;

    /* ⚠️ `first_*` فقط وقتی نوشته می‌شود که واقعاً تلاشِ اول باشد، و شرطِ
       `attempts_count = 0` در خودِ `where` هم تکرار شده. قفلِ بالا از این
       محافظت می‌کند، ولی نوشتنِ شرط در دو جا یعنی حتی اگر روزی کسی قفل را
       بردارد، بدترین حالت «هیچ ردیفی عوض نشد» است و نه «شاهدِ یادگیری
       بازنویسی شد». */
    if (isFirst) {
      await tx.execute(
        `update kimia_rounds
            set attempts_count    = 1,
                answered_at       = now(6),
                first_selected    = ?,
                first_correct     = ?,
                first_error_type  = ?,
                first_response_ms = ?,
                last_selected     = ?,
                last_correct      = ?,
                last_error_type   = ?,
                last_attempt_id   = ?,
                status            = ?,
                completed_at      = case when ? = 1 then now(6) else null end
          where id = ? and attempts_count = 0`,
        [
          selectedText,
          decision.isCorrect ? 1 : 0,
          errorType,
          input.responseMs,
          selectedText,
          decision.isCorrect ? 1 : 0,
          errorType,
          input.attemptId,
          decision.isCorrect ? "completed" : "active",
          decision.isCorrect ? 1 : 0,
          input.roundId,
        ],
      );
    } else {
      await tx.execute(
        `update kimia_rounds
            set attempts_count  = attempts_count + 1,
                last_selected   = ?,
                last_correct    = ?,
                last_error_type = ?,
                last_attempt_id = ?,
                status          = ?,
                completed_at    = case when ? = 1 then now(6) else null end
          where id = ? and status = 'active'`,
        [
          selectedText,
          decision.isCorrect ? 1 : 0,
          errorType,
          input.attemptId,
          decision.isCorrect ? "completed" : "active",
          decision.isCorrect ? 1 : 0,
          input.roundId,
        ],
      );
    }

    return {
      ok: true as const,
      verdict: toVerdict(decision, row.meter_name, true, attemptsCount),
    };
  });
}

/**
 * بازسازیِ داوریِ ثبت‌شده، برای پاسخ دادن به یک درخواستِ تکراری.
 *
 * ⚠️ از ستون‌های خودِ ردیف ساخته می‌شود و نه با داوریِ دوباره: اگر دوباره
 * داوری می‌شد و ارکانِ منبع بینِ دو درخواست عوض شده بود، بازیکن برای یک
 * پاسخ دو جوابِ متفاوت می‌گرفت.
 */
function storedDecision(row: RoundRow): Decision {
  const isCorrect = row.last_correct === 1 || row.last_correct === true;
  const meter = kimiaMeterFor(row.meter_ark);
  return {
    isCorrect,
    errorType: isCorrect ? null : ((row.last_error_type as KimiaErrorType | null) ?? null),
    acceptedSequence: isCorrect ? (meter?.canonical ?? null) : null,
  };
}

/**
 * داوری برای مهمان — بدونِ هیچ ردیفی.
 *
 * ⚠️ سیاستِ مهمان عوض نمی‌شود: بازی می‌کند، نتیجه‌اش ثبت نمی‌شود، و بعد از
 * بازی هم ۴۰۱ غافلگیرکننده نمی‌گیرد. ولی *داوری* همان داوریِ سرور است و
 * نه یک نسخهٔ سبکِ سمتِ کلاینت؛ مهمان هم باید همان بازی را تجربه کند.
 */
export function guestVerdict(
  candidate: KimiaCandidate,
  selected: readonly FootKey[],
): KimiaVerdict | null {
  const decision = decide(candidate.meter.ark, selected);
  if (!decision) return null;
  return toVerdict(decision, candidate.meter.name, false, null);
}
