import { QUESTION_COUNTS } from "@/lib/aruz-bridge/session";
import { fa } from "@/lib/panel/format";

/**
 * قواعدِ تکلیفِ عروض — منطقِ خالص، بدونِ دیتابیس و بدونِ `server-only`.
 *
 * ⚠️ جدا از `assignments.ts` به همان دلیلِ `feedback-rules.ts`: این‌ها
 * تصمیم‌هایی‌اند که اگر بشکنند، دبیر آزمونِ اشتباه می‌سازد یا دانش‌آموز
 * تکلیفِ دیگری را کامل می‌کند — پس باید بی‌دیتابیس قابلِ تست باشند.
 */

/** ⚠️ باید مو‌به‌مو با `teacher_assignments_kind_check` در مهاجرت ۰۲۳ یکی باشد. */
export const ASSIGNMENT_KINDS = ["aruz_quiz", "aruz_rapid", "aruz_bridge"] as const;
export type AssignmentKind = (typeof ASSIGNMENT_KINDS)[number];

/** سقفِ کلِ یک آزمون. `/api/v1/quiz/attempt` تا ۲۰۰ پاسخ می‌پذیرد؛ این سقفِ آموزشی است. */
export const QUIZ_MAX_TOTAL = 60;
export const QUIZ_MAX_PER_WEIGHT = 30;
/** «کوتاه یا بلند؟» — نشستِ عادیِ بازی پنج مصراع است. */
export const RAPID_MAX = 10;
/** همان گزینه‌های صفحهٔ تنظیماتِ پل وزن، تا تکلیف چیزی نخواهد که بازی ندارد. */
export const BRIDGE_COUNTS: readonly number[] = QUESTION_COUNTS;

export type AssignmentConfig = {
  /** شناسهٔ سؤال‌ها، به ترتیبی که سرور انتخاب کرده. */
  items: string[];
  source?: "weights" | "mistakes";
  weights?: Record<string, number>;
  excludeSeen?: boolean;
};

function readJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** ستونِ `config` → شیء. در MariaDB رشته می‌آید و در MySQL شیء. */
export function readConfig(value: unknown): AssignmentConfig {
  const raw = readJson(value);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { items: [] };
  const o = raw as Record<string, unknown>;
  return {
    items: Array.isArray(o.items) ? o.items.filter((x): x is string => typeof x === "string") : [],
    source: o.source === "mistakes" ? "mistakes" : o.source === "weights" ? "weights" : undefined,
    excludeSeen: o.excludeSeen === true,
  };
}

/** ستونِ `result` → شیء یا `null`. */
export function readResult(value: unknown): Record<string, unknown> | null {
  const raw = readJson(value);
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

/* ─────────────────────────────── وضعیت ───────────────────────────────── */

export type AssignmentStatus = "pending" | "started" | "done" | "cancelled";

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: "انجام‌نشده",
  started: "در حال انجام",
  done: "انجام‌شده",
  cancelled: "لغوشده",
};

/** وضعیت از زمان‌ها درمی‌آید و ستونِ جدایی ندارد — دو منبع برای یک حقیقت نمی‌سازیم. */
export function assignmentStatus(row: {
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}): AssignmentStatus {
  if (row.cancelledAt) return "cancelled";
  if (row.completedAt) return "done";
  if (row.startedAt) return "started";
  return "pending";
}

export function assignmentTitle(
  kind: AssignmentKind,
  count: number,
  source?: AssignmentConfig["source"],
): string {
  switch (kind) {
    case "aruz_quiz":
      return source === "mistakes"
        ? `آزمون از غلط‌ها · ${fa(count)} سؤال`
        : `آزمون عروض سماعی · ${fa(count)} سؤال`;
    case "aruz_rapid":
      return `کوتاه یا بلند؟ · ${fa(count)} مصراع`;
    case "aruz_bridge":
      return `پل وزن · ${fa(count)} سؤال`;
  }
}

/**
 * نشانیِ انجامِ تکلیف.
 *
 * ⚠️ شناسه در نشانی فقط یک **برچسب** است. صفحهٔ مقصد تکلیف را با
 * `student_id = کاربرِ سشن` از دیتابیس می‌خواند و سؤال‌ها را هم از همان‌جا —
 * عوض کردنِ این شناسه به تکلیفِ کسِ دیگری، «پیدا نشد» می‌دهد.
 */
export function assignmentHref(kind: AssignmentKind, id: string): string {
  switch (kind) {
    case "aruz_quiz":
      return `/quiz?assignment=${id}`;
    case "aruz_rapid":
      return `/game/aruz-rapid?assignment=${id}`;
    case "aruz_bridge":
      return `/game/aruz-bridge?assignment=${id}`;
  }
}

/* ───────────────────────── آزمون از روی وزن‌ها ─────────────────────────── */

export type PoolQuestion = { id: string; weight: string | null };
export type WeightAvailability = { weight: string; total: number; unseen: number };

export function weightAvailability(
  pool: readonly PoolQuestion[],
  seen: ReadonlySet<string>,
): WeightAvailability[] {
  const map = new Map<string, WeightAvailability>();
  for (const q of pool) {
    if (!q.weight) continue;
    const row = map.get(q.weight) ?? { weight: q.weight, total: 0, unseen: 0 };
    row.total += 1;
    if (!seen.has(q.id)) row.unseen += 1;
    map.set(q.weight, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.weight.localeCompare(b.weight, "fa"));
}

/** ورودیِ دبیر → خطا، یا `null` اگر درست است. */
export function validateWeightRequest(request: Record<string, number>): string | null {
  let total = 0;
  for (const n of Object.values(request)) {
    if (!Number.isInteger(n) || n < 0 || n > QUIZ_MAX_PER_WEIGHT) {
      return `تعداد هر وزن باید بین ۰ و ${fa(QUIZ_MAX_PER_WEIGHT)} باشد.`;
    }
    total += n;
  }
  if (total === 0) return "دست‌کم برای یک وزن تعداد بگذارید.";
  if (total > QUIZ_MAX_TOTAL) return `یک آزمون حداکثر ${fa(QUIZ_MAX_TOTAL)} سؤال دارد.`;
  return null;
}

export type Shortage = { weight: string; requested: number; available: number };

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * انتخابِ سؤال‌ها برای هر وزن.
 *
 * ⚠️ اگر برای یک وزن سؤالِ کافی نباشد، **هیچ** آزمونی ساخته نمی‌شود و
 * کمبودِ هر وزن دقیق برمی‌گردد. پر کردنِ بی‌صدای جای خالی با سؤالِ تکراری
 * یا با وزنِ دیگر، دقیقاً همان چیزی است که دبیر نخواسته. تصمیم با اوست:
 * تعداد را کم کند یا «عدم تکرار» را خاموش کند.
 */
export function pickByWeight({
  pool,
  seen,
  request,
  excludeSeen,
  random = Math.random,
}: {
  pool: readonly PoolQuestion[];
  seen: ReadonlySet<string>;
  request: Record<string, number>;
  excludeSeen: boolean;
  random?: () => number;
}): { ok: true; items: string[] } | { ok: false; shortages: Shortage[] } {
  const picked: string[] = [];
  const shortages: Shortage[] = [];

  for (const [weight, requested] of Object.entries(request)) {
    if (requested <= 0) continue;
    const candidates = pool.filter(
      (q) => q.weight === weight && !(excludeSeen && seen.has(q.id)),
    );
    if (candidates.length < requested) {
      shortages.push({ weight, requested, available: candidates.length });
      continue;
    }
    picked.push(...shuffle(candidates, random).slice(0, requested).map((q) => q.id));
  }

  if (shortages.length > 0) return { ok: false, shortages };
  /* وزن‌ها در هم: آزمونی که ده سؤالِ اولش همه یک وزن‌اند، از سؤالِ دوم به
     بعد جوابش را لو داده. */
  return { ok: true, items: shuffle(picked, random) };
}

export function shortageMessage(s: Shortage, excludeSeen: boolean): string {
  if (excludeSeen) {
    return s.available === 0
      ? `برای وزن «${s.weight}» سؤال دیده‌نشده‌ای برای این دانش‌آموز باقی نمانده است.`
      : `برای وزن «${s.weight}» فقط ${fa(s.available)} سؤال دیده‌نشده برای این دانش‌آموز باقی مانده است.`;
  }
  return `برای وزن «${s.weight}» فقط ${fa(s.available)} سؤال در بانک هست.`;
}

/* ───────────────────────────── تکمیل ──────────────────────────────────── */

/**
 * آیا پاسخ‌های رسیده دقیقاً همان سؤال‌های تکلیف‌اند؟
 *
 * ⚠️ ترتیب مهم نیست (بازی ترتیب را در مرورگر به هم می‌زند) ولی تعداد و
 * یکتایی مهم است: تکراری یا اضافه یعنی دستکاری، و کمتر یعنی تکلیفِ ناقص.
 */
export function sameItems(expected: readonly string[], got: readonly string[]): boolean {
  if (got.length !== expected.length) return false;
  const want = new Set(expected);
  const seen = new Set<string>();
  for (const id of got) {
    if (!want.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/** پل وزن با اولین اشتباه تمام می‌شود، پس هر زیرمجموعهٔ یکتا از سؤال‌ها معتبر است. */
export function subsetOfItems(expected: readonly string[], got: readonly string[]): boolean {
  if (got.length === 0 || got.length > expected.length) return false;
  const want = new Set(expected);
  const seen = new Set<string>();
  for (const id of got) {
    if (!want.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * یک خط خلاصه از نتیجه، برای فهرستِ دبیر و دانش‌آموز.
 *
 * ⚠️ «کوتاه یا بلند؟» تنها بازی‌ای است که درستی‌اش را مرورگر می‌سنجد (پاسخ‌ها
 * همراهِ بازی به مرورگر می‌روند). عددش واقعی است ولی قابلِ اتکای سرور نیست،
 * و `clientReported` همین را به رابط کاربری می‌گوید — مثلِ واژه‌یاب در
 * `student-report.ts`.
 */
export function resultSummary(
  kind: AssignmentKind,
  result: Record<string, unknown> | null,
): { text: string; clientReported: boolean } | null {
  if (!result) return null;
  const total = num(result.total);
  if (kind === "aruz_quiz") {
    const correct = num(result.correct);
    const pct = total > 0 ? Math.round((correct * 100) / total) : 0;
    return { text: `${fa(correct)} از ${fa(total)} درست · ${fa(pct)}٪`, clientReported: false };
  }
  if (kind === "aruz_bridge") {
    const correct = num(result.correct);
    const text =
      correct >= total
        ? `هر ${fa(total)} سؤال درست`
        : `${fa(correct)} از ${fa(total)} · در سؤال ${fa(correct + 1)} ${
            num(result.timeouts) > 0 ? "وقت تمام شد" : "اشتباه کرد"
          }`;
    return { text, clientReported: false };
  }
  const wrong = num(result.wrongChoices) + num(result.timeouts);
  return {
    text: `${fa(total)} مصراع · ${wrong === 0 ? "بدون اشتباه" : `${fa(wrong)} اشتباه`}`,
    clientReported: true,
  };
}
