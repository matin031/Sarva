import "server-only";
import { headers } from "next/headers";
import { execute, queryOne } from "@/lib/db";
import type { AuthUser } from "@/lib/auth/types";
import {
  REQUEST_ID_HEADER,
  currentRequestId,
  logger,
  markReported,
  normalizeRequestId,
  redactRecord,
  serializeError,
  wasReported,
} from "@/lib/observability";
import { buildErrorRecord, type ErrorSource } from "@/lib/observability/error-record";

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

/**
 * پاک‌سازی metadata، حالا بازگشتی.
 *
 * ⚠️ نسخهٔ قبلی فقط سطح اول شیء را نگاه می‌کرد. یعنی این ردیف بی‌هیچ هشداری
 * وارد جدول می‌شد:
 *
 *     { changes: { smtp: { password: "..." } } }
 *
 * حالا کل درخت از فیلتر رد می‌شود — آرایه‌ها هم — و منطقش در
 * lib/observability/redact.ts است که تست دارد.
 *
 * نمایهٔ "audit" و نه "operational": در این جدول ایمیل مدیر و IP عمداً
 * می‌مانند، چون دقیقاً همان چیزی‌اند که این لاگ برای ثبتشان ساخته شده. آنچه
 * حذف می‌شود فقط رازهاست.
 */
function redactMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return redactRecord(metadata, { profile: "audit" });
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

/**
 * شناسهٔ درخواست جاری.
 *
 * دو منبع، به همین ترتیب:
 *
 *   ۱) زمینهٔ AsyncLocalStorage — وقتی withRoute آن را باز کرده باشد. سریع و
 *      بدون I/O.
 *
 *   ۲) هدر `x-request-id` که proxy.ts نوشته — راهی که Server Action ها از آن
 *      استفاده می‌کنند، چون آن‌ها از withRoute رد نمی‌شوند و Next هیچ API
 *      رسمیِ دیگری برای رساندن زمینه به آن‌ها ندارد.
 *
 * اگر هیچ‌کدام نبود (اسکریپت، seed، تست) null برمی‌گردد و همه‌چیز باید بدون
 * شناسه هم کار کند.
 */
async function resolveRequestId(explicit?: string | null): Promise<string | null> {
  const fromContext = explicit ?? currentRequestId();
  if (fromContext) return fromContext;

  try {
    return normalizeRequestId((await headers()).get(REQUEST_ID_HEADER));
  } catch {
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
  // ⚠️ ترتیب عمدی است: **اول** insert، بعد لاگ عملیاتی.
  //
  // ممیزی مدیران یک سابقهٔ کسب‌وکاری است و باید مستقل از هر چیز دیگری تلاش
  // خودش را بکند. اگر لاگر اول می‌آمد و به هر دلیلی throw می‌کرد (که نباید،
  // ولی «نباید» تضمین نیست)، ردیف ممیزی اصلاً نوشته نمی‌شد.
  let recorded = false;
  let requestId: string | null = null;

  try {
    requestId = await resolveRequestId();
  } catch {
    /* بی‌شناسه هم باید ثبت شود */
  }

  try {
    await execute(
      `insert into admin_audit_log
         (actor_id, actor_email, action, target_type, target_id, summary, metadata, ip, request_id)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::inet, $9)`,
      [
        entry.actor.id,
        entry.actor.email,
        entry.action,
        entry.targetType,
        entry.targetId ?? null,
        entry.summary,
        JSON.stringify(redactMetadata(entry.metadata ?? {})),
        await requestIp(),
        requestId,
      ],
    );
    recorded = true;
  } catch (err) {
    // قاعدهٔ ۱: شکستِ لاگ نباید کارِ اصلی را بشکند.
    try {
      logger.error("ثبت فعالیت مدیر ناموفق بود", {
        event: "admin.audit.failed",
        err,
        audit_action: entry.action,
        target_type: entry.targetType,
        request_id: requestId ?? undefined,
      });
    } catch {
      console.error("[audit] ثبت فعالیت ناموفق بود:", err);
    }
  }

  if (!recorded) return;

  // ⚠️ summary عمداً لاگ نمی‌شود: جملهٔ فارسیِ آن اغلب نام کاربر یا عنوان
  // سرودهٔ حذف‌شده را دارد. برای دنبال کردنِ یک عمل، همین چند فیلد کافی است و
  // متنِ کامل سر جایش در جدول می‌ماند.
  try {
    logger.info("عمل مدیریتی ثبت شد", {
      event: "admin.audit.recorded",
      audit_action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? undefined,
      actor_id: entry.actor.id,
      request_id: requestId ?? undefined,
    });
  } catch {
    /* لاگر هرگز نباید کار مدیر را بشکند */
  }
}

// ---------------------------------------------------------------------------
// لاگ خطا
// ---------------------------------------------------------------------------

export type { ErrorSource } from "@/lib/observability/error-record";

/** اطلاعات اختیاریِ همراهِ یک خطا. */
export type ErrorContext = {
  /** اگر فراخوان خودش شناسه دارد؛ وگرنه از زمینه یا هدر خوانده می‌شود. */
  requestId?: string | null;
  /** زمینهٔ ساختاریافته: مسیر، متد، وضعیت، نوع route… . قبل از ذخیره پاک
   *  می‌شود، ولی باز هم بدنهٔ درخواست یا کوکی به آن ندهید. */
  metadata?: Record<string, unknown>;
};

/**
 * قفلِ بازگشت.
 *
 * سناریوی خطرناک: دیتابیس قطع می‌شود → کوئری خطا می‌دهد → recordError صدا
 * زده می‌شود → insert اش هم خطا می‌دهد → اگر آن خطا دوباره ثبت می‌شد، حلقهٔ
 * بی‌پایان.
 *
 * دو چیز جلویش را می‌گیرد: (۱) لایهٔ دیتابیس هرگز خودش recordError صدا
 * نمی‌زند و فقط به stdout می‌نویسد، (۲) همین پرچم، که ورودِ تودرتو را رد
 * می‌کند حتی اگر روزی کسی قاعدهٔ اول را بشکند.
 */
let recording = false;

/**
 * ثبت یک خطای سرور تا در پنل دیده شود.
 *
 * ⚠️ این جایگزین لاگ عملیاتی نیست، مکملش است: لاگ برای کسی که به سرور دسترسی
 * دارد، و این جدول برای کسی که ندارد. هر فراخوان هم یک خط JSON در stdout
 * می‌گذارد و هم یک ردیف در جدول — با یک `request_id` مشترک، پس از هر کدام
 * می‌شود به دیگری رسید.
 *
 * هرگز throw نمی‌کند — از جمله وقتی خودِ دیتابیس مشکل دارد، که دقیقاً همان
 * حالتی است که این تابع در آن صدا زده می‌شود.
 */
export async function recordError(
  source: ErrorSource,
  error: unknown,
  context?: string | null,
  extra?: ErrorContext,
): Promise<void> {
  const ctx = context?.slice(0, 300) ?? null;

  // خطایی که قبلاً ثبت شده دوباره ثبت نمی‌شود. wrapper، handleError و
  // onRequestError ممکن است هر سه همین شیء را ببینند.
  if (wasReported(error)) return;
  markReported(error);

  const serialized = serializeError(error);
  const requestId = await resolveRequestId(extra?.requestId).catch(() => null);

  // خط لاگ همیشه نوشته می‌شود، حتی اگر دیتابیس در دسترس نباشد — که دقیقاً
  // همان لحظه‌ای است که بیشترین ارزش را دارد.
  try {
    logger.error(serialized.message, {
      // زمینهٔ فراخوان اول می‌آید تا نتواند فیلدهای ثابتِ پایین را بازنویسی کند.
      ...(extra?.metadata ?? {}),
      event: "app.error.recorded",
      err: error,
      error_source: source,
      error_context: ctx ?? undefined,
      request_id: requestId ?? undefined,
    });
  } catch {
    /* لاگر خراب بود؛ ثبت در جدول همچنان باید انجام شود */
  }

  if (recording) return;
  recording = true;

  try {
    const row = buildErrorRecord(source, error, ctx, { requestId, metadata: extra?.metadata });

    // on conflict روی ایندکس جزئیِ «باز»: خطای تکراری شمارنده‌اش بالا می‌رود و
    // ردیف تازه نمی‌سازد. اگر خطایی قبلاً «رسیدگی‌شده» علامت خورده باشد، از
    // شمول آن ایندکس بیرون است و این insert ردیف تازه‌ای می‌سازد — که درست
    // است: خطایی که برگشته، خبر تازه‌ای است.
    //
    // در به‌روزرسانی، اطلاعاتِ *آخرین* رخداد جایگزین می‌شود ولی stack اولی
    // می‌ماند: اولین بار همان جایی است که علت را می‌گوید.
    await execute(
      `insert into app_error_log
         (source, message, context, detail, fingerprint,
          error_name, error_code, digest, environment, release,
          first_request_id, last_request_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12::jsonb)
       on conflict (fingerprint) where resolved_at is null
       do update set occurrences      = app_error_log.occurrences + 1,
                     last_seen_at     = now(),
                     last_request_id  = excluded.last_request_id,
                     metadata         = excluded.metadata,
                     error_code       = coalesce(excluded.error_code, app_error_log.error_code),
                     digest           = coalesce(excluded.digest, app_error_log.digest),
                     release          = excluded.release,
                     detail           = coalesce(app_error_log.detail, excluded.detail)`,
      [
        row.source,
        row.message,
        row.context,
        row.detail,
        row.fingerprint,
        row.errorName,
        row.errorCode,
        row.digest,
        row.environment,
        row.release,
        row.requestId,
        JSON.stringify(row.metadata),
      ],
    );
  } catch (err) {
    // اینجا انتهای خط است: نه throw، نه تلاش دوباره برای نوشتن در دیتابیس.
    try {
      logger.error("ثبت خطا در جدول ناموفق بود", {
        event: "app.error.record_failed",
        err,
        error_source: source,
      });
    } catch {
      console.error("[error-log] ثبت خطا ناموفق بود:", err);
    }
  } finally {
    recording = false;
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
