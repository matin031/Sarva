import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { execute, queryOne } from "@/lib/db";
import type { AuthUser } from "@/lib/auth/types";

/**
 * ثبت کارهای مدیران و خطاهای سرور.
 *
 * دو قاعده که همه‌جای این فایل رعایت می‌شوند:
 *
 *   ۱) **ثبت لاگ هرگز نباید کارِ اصلی را بشکند.** اگر نوشتن در جدول لاگ خطا
 *      بدهد، همان خطا فقط به console می‌رود و عمل اصلی (بن کردن کاربر، حذف
 *      سؤال) دست‌نخورده ادامه پیدا می‌کند. پنلی که به‌خاطر خرابیِ لاگ از کار
 *      بیفتد، از پنلِ بدون لاگ بدتر است.
 *
 *   ۲) **هیچ رازی وارد لاگ نمی‌شود.** کلید API پیامک، رمز، توکن — هیچ‌کدام.
 *      redactValue پایین این را اعمال می‌کند و همهٔ فراخوانی‌ها از آن رد
 *      می‌شوند.
 */

// ---------------------------------------------------------------------------
// لاگ فعالیت مدیران
// ---------------------------------------------------------------------------

/** شناسه‌های عمل. رشتهٔ آزاد نیست تا فهرست فیلترِ پنل قابل اتکا بماند. */
export type AuditAction =
  // کاربران
  | "user.role_change"
  | "user.ban"
  | "user.unban"
  | "user.delete"
  // تنظیمات
  | "setting.update"
  | "setting.reset"
  | "setting.test_email"
  // آزمون‌ها
  | "exam.create"
  | "exam.update"
  | "exam.delete"
  | "exam.section_create"
  | "exam.section_delete"
  | "exam.question_save"
  | "exam.question_delete"
  // عروض سماعی
  | "quiz.question_save"
  | "quiz.question_delete"
  // واژه‌یاب
  | "vocab.word_save"
  | "vocab.word_delete"
  // جفت‌های ادبی
  | "pairs.pair_save"
  | "pairs.pair_delete"
  // نینجای دستور زبان
  | "ninja.category_save"
  | "ninja.category_delete"
  | "ninja.word_save"
  | "ninja.word_move"
  | "ninja.word_delete"
  // مدار دستور
  | "grammar_circuit.question_save"
  | "grammar_circuit.question_publish"
  | "grammar_circuit.question_delete"
  // جاسوسِ نقش‌ها
  | "jasoos.level_save"
  | "jasoos.level_publish"
  | "jasoos.level_delete"
  // کلاب
  | "club.post_status"
  | "club.post_feature"
  | "club.post_delete"
  | "club.comment_status"
  | "club.comment_delete"
  | "club.report_resolve"
  // فایل
  | "upload.audio";

export type AuditTargetType =
  | "user"
  | "setting"
  | "exam"
  | "exam_section"
  | "exam_question"
  | "quiz_question"
  | "vocab_word"
  | "memory_pair"
  | "ninja_category"
  | "ninja_word"
  | "grammar_circuit_question"
  | "jasoos_level"
  | "club_post"
  | "club_comment"
  | "club_report"
  | "file";

/** متن فارسیِ نمایشیِ هر عمل. اینجا و نه در دیتابیس، تا عوض کردن عبارت به
 *  migration نیاز نداشته باشد. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.role_change": "تغییر نقش کاربر",
  "user.ban": "مسدود کردن کاربر",
  "user.unban": "رفع مسدودی کاربر",
  "user.delete": "حذف کاربر",
  "setting.update": "تغییر تنظیمات",
  "setting.reset": "بازگرداندن تنظیم",
  "setting.test_email": "ارسال ایمیل آزمایشی",
  "exam.create": "ساخت آزمون",
  "exam.update": "ویرایش آزمون",
  "exam.delete": "حذف آزمون",
  "exam.section_create": "افزودن بخش",
  "exam.section_delete": "حذف بخش",
  "exam.question_save": "ذخیرهٔ سؤال آزمون",
  "exam.question_delete": "حذف سؤال آزمون",
  "quiz.question_save": "ذخیرهٔ سؤال عروض سماعی",
  "quiz.question_delete": "حذف سؤال عروض سماعی",
  "vocab.word_save": "ذخیرهٔ واژه",
  "vocab.word_delete": "حذف واژه",
  "pairs.pair_save": "ذخیرهٔ جفت ادبی",
  "pairs.pair_delete": "حذف جفت ادبی",
  "ninja.category_save": "ذخیرهٔ نقش نینجا",
  "ninja.category_delete": "حذف نقش نینجا",
  "ninja.word_save": "افزودن کلمه به نقش",
  "ninja.word_move": "جابه‌جایی کلمه بین نقش‌ها",
  "ninja.word_delete": "حذف کلمه از نقش",
  "grammar_circuit.question_save": "ذخیرهٔ پرسش مدار دستور",
  "grammar_circuit.question_publish": "تغییر انتشار پرسش مدار دستور",
  "grammar_circuit.question_delete": "حذف پرسش مدار دستور",
  "jasoos.level_save": "ذخیرهٔ پروندهٔ جاسوس",
  "jasoos.level_publish": "تغییر انتشار پروندهٔ جاسوس",
  "jasoos.level_delete": "حذف پروندهٔ جاسوس",
  "club.post_status": "تعیین وضعیت سروده",
  "club.post_feature": "برگزیده کردن سروده",
  "club.post_delete": "حذف سروده",
  "club.comment_status": "تعیین وضعیت دیدگاه",
  "club.comment_delete": "حذف دیدگاه",
  "club.report_resolve": "رسیدگی به گزارش",
  "upload.audio": "آپلود فایل صوتی",
};

/** عمل‌هایی که برگشت‌ناپذیرند — در پنل با رنگ متفاوت دیده می‌شوند. */
export const DESTRUCTIVE_ACTIONS: ReadonlySet<AuditAction> = new Set<AuditAction>([
  "user.delete",
  "user.ban",
  "exam.delete",
  "exam.section_delete",
  "exam.question_delete",
  "quiz.question_delete",
  "vocab.word_delete",
  "pairs.pair_delete",
  "ninja.category_delete",
  "ninja.word_delete",
  "grammar_circuit.question_delete",
  "jasoos.level_delete",
  "club.post_delete",
  "club.comment_delete",
  "user.role_change",
]);

/** کلیدهایی که مقدارشان هرگز نباید در لاگ بنشیند. */
const SECRET_KEY_PATTERN = /(secret|password|token|api[_-]?key|pepper|credential)/i;

function redactValue(key: string, value: unknown): unknown {
  if (SECRET_KEY_PATTERN.test(key)) return "«پنهان»";
  if (typeof value === "string" && value.length > 300) return `${value.slice(0, 300)}…`;
  return value;
}

function redactMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) out[k] = redactValue(k, v);
  return out;
}

/**
 * IP درخواست جاری، از داخل یک Server Action.
 *
 * برخلاف route handler ها اینجا شیء Request در دست نیست، پس headers() خوانده
 * می‌شود — ولی با همان منطق lib/api/http.ts: **آخرین** عضو زنجیره، نه اولی.
 * (توضیح کاملش آنجاست؛ خلاصه‌اش اینکه عضو اول را خودِ کلاینت می‌نویسد.)
 */
async function requestIp(): Promise<string | null> {
  try {
    const chain = ((await headers()).get("x-forwarded-for") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
    const candidate = chain[chain.length - (Number.isInteger(hops) && hops >= 1 ? hops : 1)];

    if (!candidate || candidate.length > 45) return null;
    // فقط چیزی که واقعاً شبیه IP است به ستون inet می‌رسد.
    const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(candidate);
    if (ipv4) return ipv4.slice(1).every((p) => Number(p) <= 255) ? candidate : null;
    if (/^[0-9a-fA-F:]+$/.test(candidate) && candidate.includes(":")) return candidate;
    return null;
  } catch {
    // headers() بیرون از یک درخواست (مثلاً در اسکریپت) خطا می‌دهد.
    return null;
  }
}

export type AuditEntry = {
  actor: AuthUser;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  /** جملهٔ فارسیِ خوانا که در پنل نمایش داده می‌شود. */
  summary: string;
  metadata?: Record<string, unknown>;
};

/**
 * ثبت یک عمل مدیریتی.
 *
 * عمداً `await` می‌شود و نه fire-and-forget: یک عملِ ثبت‌نشده از یک عملِ کمی
 * کندتر بدتر است. هزینه‌اش یک insert روی جدولی است که فقط ادمین‌ها لمسش
 * می‌کنند — یعنی در عمل صفر.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await execute(
      `insert into admin_audit_log
         (actor_id, actor_email, action, target_type, target_id, summary, metadata, ip)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::inet)`,
      [
        entry.actor.id,
        entry.actor.email,
        entry.action,
        entry.targetType,
        entry.targetId ?? null,
        entry.summary,
        JSON.stringify(redactMetadata(entry.metadata ?? {})),
        await requestIp(),
      ],
    );
  } catch (err) {
    // قاعدهٔ ۱: شکستِ لاگ نباید کارِ اصلی را بشکند.
    console.error("[audit] ثبت فعالیت ناموفق بود:", err);
  }
}

// ---------------------------------------------------------------------------
// لاگ خطا
// ---------------------------------------------------------------------------

export type ErrorSource = "api" | "action" | "mail" | "sms" | "db" | "upload" | "other";

/**
 * «همان خطا»؟
 *
 * اعداد از پیام حذف می‌شوند تا «کاربر 42 پیدا نشد» و «کاربر 91 پیدا نشد» یک
 * ردیف باشند — وگرنه یک خطای تکرارشونده جدول را پر می‌کند و خودش تبدیل به
 * مشکل بعدی می‌شود. uuid ها هم به همین دلیل یکسان‌سازی می‌شوند.
 */
function fingerprint(source: string, message: string, context: string | null): string {
  const normalized = message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "«شناسه»")
    .replace(/\d+/g, "«عدد»")
    .slice(0, 500);

  return createHash("sha256").update(`${source}|${context ?? ""}|${normalized}`).digest("hex").slice(0, 32);
}

/**
 * ثبت یک خطای سرور تا در پنل دیده شود.
 *
 * ⚠️ این جایگزین console.error نیست، مکملش است: console برای کسی که به سرور
 * دسترسی دارد، و این جدول برای کسی که ندارد.
 *
 * هرگز throw نمی‌کند — از جمله وقتی خودِ دیتابیس مشکل دارد، که دقیقاً همان
 * حالتی است که این تابع در آن صدا زده می‌شود.
 */
export async function recordError(
  source: ErrorSource,
  error: unknown,
  context?: string | null,
): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = (err.message || "خطای بدون پیام").slice(0, 1000);
    const detail = (err.stack ?? "").slice(0, 4000) || null;
    const ctx = context?.slice(0, 300) ?? null;
    const fp = fingerprint(source, message, ctx);

    // on conflict روی ایندکس جزئیِ «باز»: خطای تکراری شمارنده‌اش بالا می‌رود و
    // ردیف تازه نمی‌سازد. اگر خطایی قبلاً «رسیدگی‌شده» علامت خورده باشد، از
    // شمول آن ایندکس بیرون است و این insert ردیف تازه‌ای می‌سازد — که درست
    // است: خطایی که برگشته، خبر تازه‌ای است.
    await execute(
      `insert into app_error_log (source, message, context, detail, fingerprint)
       values ($1, $2, $3, $4, $5)
       on conflict (fingerprint) where resolved_at is null
       do update set occurrences  = app_error_log.occurrences + 1,
                     last_seen_at = now()`,
      [source, message, ctx, detail, fp],
    );
  } catch (err) {
    console.error("[error-log] ثبت خطا ناموفق بود:", err);
  }
}

/** تعداد خطاهای رسیدگی‌نشده — برای نشان دادن روی داشبورد. */
export async function openErrorCount(): Promise<number> {
  try {
    const row = await queryOne<{ n: number }>(
      "select count(*) as n from app_error_log where resolved_at is null",
    );
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
