import "server-only";
import { randomUUID } from "node:crypto";
import { execute, queryOne } from "@/lib/db";
import { logger } from "@/lib/observability";
import {
  resolveEntity,
  validateMetadata,
  type ActivityEntityType,
  type ActivityEventType,
} from "./schema";

/**
 * نوشتنِ رویدادِ فعالیت — تنها نویسندهٔ `user_activity_events`.
 *
 * =============================================================================
 * ⚠️ قاعده‌ای که کلِ امنیتِ این مسیر روی آن ایستاده
 * =============================================================================
 *
 * **`userId` پارامترِ این تابع است و هرگز از بدنهٔ درخواست نمی‌آید.**
 *
 * مسیرِ HTTP آن را از `getCurrentUser()` می‌گیرد؛ در schemaِ ورودی اصلاً
 * فیلدی به این نام وجود ندارد، پس فرستادنش یک خطای اعتبارسنجی است و نه یک
 * مقدارِ نادیده‌گرفته‌شده. (فرقش مهم است: «نادیده گرفته می‌شود» یعنی روزی
 * کسی که کد را می‌خواند فکر کند پذیرفته می‌شود.)
 */

export type RecordActivityParams = {
  /** ⚠️ از سشن. هرگز از کلاینت. */
  userId: string;
  eventType: ActivityEventType;
  /** شناسهٔ بازی، تلاشِ آزمون، یا درس. `entityType` از خودِ رویداد مشتق می‌شود. */
  entityId?: string | null;
  metadata?: unknown;
};

export type RecordActivityResult =
  | { ok: true }
  | { ok: false; error: string; status: 400 | 403 };

/**
 * «این تلاش مالِ همین کاربر است؟»
 *
 * ⚠️ بدونِ این بررسی، یک دانش‌آموز می‌توانست `quiz_completed` با شناسهٔ تلاشِ
 * *دانش‌آموزِ دیگری* بفرستد. ردیفِ حاصل بی‌ضرر به‌نظر می‌رسد ولی نیست: در
 * مرحلهٔ ۲.۴ دبیر می‌تواند روی یک فعالیت بازخورد بنویسد، و آن‌وقت بازخوردی
 * به دادهٔ کاربرِ دیگر ارجاع می‌داد.
 *
 * ⚠️ دو کوئریِ *کامل* و نه یک کوئری با نامِ جدولِ درون‌ریزی‌شده.
 *
 * نسخهٔ اول `` `select … from \`${table}\`` `` بود: امن (نامِ جدول از یک
 * ثابتِ داخلی می‌آمد) ولی برای `npm run db:check-sql` نامرئی — آن ابزار هر
 * دستور را با PREPARE به MySQL می‌دهد و یک نامِ جدولِ متغیر را نمی‌تواند
 * بازسازی کند، پس این دو کوئری از پوششِ بررسی بیرون می‌افتادند.
 *
 * همان درسی که `AUTH_USER_COLUMNS` داد: کدی که بررسیگر نمی‌تواند بخواند،
 * عملاً بررسی‌نشده است.
 *
 * `lesson` اینجا نیست: درس محتوای عمومیِ سایت است و «مالک» ندارد.
 */
async function ownsEntity(
  entityType: ActivityEntityType,
  entityId: string,
  userId: string,
): Promise<boolean | null> {
  if (entityType === "quiz") {
    const row = await queryOne<{ n: number }>(
      "select 1 as n from quiz_attempts where id = ? and user_id = ? limit 1",
      [entityId, userId],
    );
    return row !== null;
  }

  if (entityType === "exam") {
    const row = await queryOne<{ n: number }>(
      "select 1 as n from exam_attempts where id = ? and user_id = ? limit 1",
      [entityId, userId],
    );
    return row !== null;
  }

  // `null` یعنی «این نوع مالک ندارد» و نه «مالکش نیست».
  return null;
}

/**
 * ثبتِ یک رویداد.
 *
 * ⚠️ خطاهای *اعتبارسنجی* برگردانده می‌شوند (تا مسیرِ HTTP بتواند ۴۰۰ یا ۴۰۳
 * بدهد) ولی خطاهای *دیتابیس* بلعیده می‌شوند و فقط لاگ می‌شوند.
 *
 * تفاوتشان عمدی است: ورودیِ بد یک اشتباهِ فراخوان است و باید دیده شود، ولی
 * ثبتِ فعالیت یک کارِ جانبی است — اگر شکستش بتواند پایانِ یک بازی یا ورودِ
 * کاربر را بشکند، یک جدولِ فرعی به مسیرِ حیاتی وصل شده که نباید.
 * (همان قاعدهٔ `lib/plus/notifications.ts`.)
 */
export async function recordActivity(
  params: RecordActivityParams,
): Promise<RecordActivityResult> {
  const entity = resolveEntity(params.eventType, params.entityId ?? null);
  if (!entity.ok) return { ok: false, error: entity.error, status: 400 };

  const metadata = validateMetadata(params.eventType, params.metadata);
  if (!metadata.ok) return { ok: false, error: metadata.error, status: 400 };

  if (entity.entityType && entity.entityId) {
    let owns: boolean | null;
    try {
      owns = await ownsEntity(entity.entityType, entity.entityId, params.userId);
    } catch (err) {
      logger.error("بررسیِ مالکیتِ رویداد شکست خورد", {
        event: "activity.owner_check_failed",
        err,
        activity_event_type: params.eventType,
      });
      return { ok: false, error: "ثبت فعالیت ممکن نشد.", status: 400 };
    }

    /* ⚠️ «مالِ تو نیست» و «اصلاً وجود ندارد» یک پاسخ می‌گیرند و باید
       بگیرند. اگر دومی پیامِ متفاوتی می‌داد، هر کسی می‌توانست با امتحان
       کردنِ شناسه‌ها بفهمد کدام‌ها تلاشِ واقعی‌اند. */
    if (owns === false) {
      return { ok: false, error: "این فعالیت متعلق به شما نیست.", status: 403 };
    }
  }

  try {
    await execute(
      `insert into user_activity_events
         (id, user_id, event_type, entity_type, entity_id, metadata, occurred_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        params.userId,
        params.eventType,
        entity.entityType,
        entity.entityId,
        metadata.value === null ? null : JSON.stringify(metadata.value),
        /* ⚠️⚠️ یک `Date` از Node و نه `now(6)` در SQL.

           درایور یک `Date` را همیشه UTC می‌فرستد (`timezone: "Z"` در
           `lib/db`)، ولی `now(6)` ساعتِ *سرورِ دیتابیس* را می‌نویسد — که
           اگر `time_zone = SYSTEM` باشد و ساعتِ سیستم UTC نباشد، همان
           مقدار را چند ساعت جابه‌جا می‌کند و کد آن را UTC می‌خواند.

           این دقیقاً همان باگی است که اشتراکِ دبیری را ۳٫۵ ساعت غیرفعال
           نگه داشته بود (`grantTeacherPlus`). تا وقتی وضعیتِ production با
           `npm run db:check-time` اندازه‌گیری نشده، این تنها راهِ داشتنِ یک
           ستونِ بی‌ابهام است. */
        new Date(),
      ],
    );
    return { ok: true };
  } catch (err) {
    /* ⚠️ «مهاجرت اجرا نشده» از «دیتابیس خراب است» جدا گزارش می‌شود — همان
       تفکیکی که `notify()` دارد. اولی یک کارِ انجام‌نشدهٔ استقرار است و
       راه‌حلش یک دستور است؛ دومی یک حادثه. */
    const deployment = isSchemaError(err);

    logger.error(
      deployment
        ? "ثبت فعالیت ناموفق بود — به‌نظر می‌رسد مهاجرت دیتابیس اجرا نشده"
        : "ثبت فعالیت ناموفق بود",
      {
        event: deployment ? "activity.schema_missing" : "activity.insert_failed",
        err,
        activity_event_type: params.eventType,
        ...(deployment ? { hint: "npm run db:migrate" } : {}),
      },
    );

    // ⚠️ برای فراخوان موفقیت است. ورودی درست بود؛ مشکل از ماست و نباید
    // به‌شکلِ خطای کاربر ظاهر شود.
    return { ok: true };
  }
}

/**
 * آیا این خطا یعنی «اسکیما با کد جور نیست»؟ — دوقلوی همان تابع در
 * `lib/plus/notifications.ts`.
 *
 *   1054 ER_BAD_FIELD_ERROR          — ستون نیست
 *   1146 ER_NO_SUCH_TABLE            — جدول نیست (مهاجرت ۰۱۱ اجرا نشده)
 *   3819 ER_CHECK_CONSTRAINT_VIOLATED (MySQL 8)
 *   4025 ER_CONSTRAINT_FAILED         (MariaDB)
 */
function isSchemaError(err: unknown): boolean {
  const code = (err as { errno?: unknown })?.errno;
  return code === 1054 || code === 1146 || code === 3819 || code === 4025;
}
