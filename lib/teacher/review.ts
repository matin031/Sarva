import "server-only";
import { transaction, type Tx } from "@/lib/db";
import { grantTeacherPlus, revokeTeacherPlus } from "@/lib/plus/grants";
import { recordVerification } from "./verification-log";
import { OPEN_TEACHER_STATUSES, type TeacherRequestStatus } from "./types";

/**
 * هستهٔ تراکنشیِ «تعیین تکلیفِ پروندهٔ دبیری».
 *
 * =============================================================================
 * ⚠️ چرا این از `lib/admin/teacher-actions.ts` بیرون کشیده شد
 * =============================================================================
 *
 * آن فایل یک `"use server"` است و با `requireAdmin()` شروع می‌شود، که
 * `cookies()` را می‌خواند. یعنی بیرونِ یک درخواستِ Next اصلاً قابلِ صدا زدن
 * نیست — و در نتیجه **قابلِ آزمون روی دیتابیسِ واقعی هم نبود**.
 *
 * این یک مشکلِ واقعی بود و نه سلیقه‌ای: حساس‌ترین تراکنشِ کلِ این قابلیت
 * (تغییرِ نقش + اشتراکِ مادام‌العمر، هر دو در یک تراکنش) تنها چیزی بود که
 * هیچ آزمونی نمی‌توانست لمسش کند. `scripts/check-teacher.ts` حالا دقیقاً
 * همین تابع را صدا می‌زند — نه یک رونوشتِ آن.
 *
 * ⚠️ گارد اینجا **نیست** و نباید باشد. `requireAdmin()` سرِ جایش در
 * Server Action می‌ماند؛ این تابع فرض می‌کند فراخوان از آن گذشته و
 * `adminId` را می‌دهد. جدا بودنشان همان الگوی `lib/teacher/classes.ts`
 * است: کوئری‌ها بی‌گارد، گاردها در یک لایه.
 */

/**
 * قفلِ ردیفِ کاربر تا پایانِ تراکنش.
 *
 * ⚠️ همان یک‌خطی که `lib/plus/grants.ts` هم دارد، و عمداً تکرار شده و نه
 * export: آن یکی `private` بودنش بخشی از قراردادِ آن فایل است (هیچ‌کس
 * نباید بتواند از بیرون قفلِ نیمه‌کاره بگیرد)، و یک وابستگیِ تازه بینِ دو
 * ماژول برای یک `select … for update` نمی‌ارزد.
 */
async function lockUserRow(tx: Tx, userId: string): Promise<void> {
  await tx.query("select id from users where id = ? for update", [userId]);
}

function isOpen(status: TeacherRequestStatus): boolean {
  return OPEN_TEACHER_STATUSES.includes(status);
}

export type ApproveOutcome =
  | { kind: "missing" }
  | { kind: "settled"; status: TeacherRequestStatus }
  | { kind: "admin_target" }
  | {
      kind: "approved";
      userId: string;
      email: string | null;
      fullName: string | null;
      /** false یعنی این کاربر از قبل دسترسیِ دبیری داشت — تأییدِ دوباره. */
      grantCreated: boolean;
    };

/**
 * تأیید — سه نوشتن در **یک** تراکنش.
 *
 * ۱) وضعیتِ پرونده → `approved`
 * ۲) نقشِ کاربر     → `teacher`
 * ۳) اشتراکِ دائمیِ `teacher_verified`
 *
 * ⚠️ چرا یک تراکنش: هر مرزی بینشان یک حالتِ نیمه‌کاره می‌سازد. «دبیر هست
 * ولی پلاس ندارد» یک تیکتِ پشتیبانی است؛ «پرونده تأیید شده ولی نقش عوض
 * نشده» بدتر است، چون مدیر فکر می‌کند کارش را کرده و کاربر می‌بیند هیچ
 * اتفاقی نیفتاده.
 *
 * ⚠️ `for update` روی ردیفِ پرونده: دو مدیر که هم‌زمان «تأیید» بزنند باید
 * پشتِ سرِ هم اجرا شوند، وگرنه هر دو `pending` می‌بینند و دو ردیفِ اشتراک
 * ساخته می‌شود. (`grantTeacherPlus` نگهبانِ دوم است.)
 */
export async function approveTeacherRequest(
  requestId: string,
  adminId: string,
): Promise<ApproveOutcome> {
  return transaction(async (tx) => {
    const row = await tx.queryOne<{
      user_id: string;
      status: TeacherRequestStatus;
      school: string;
      role: "student" | "teacher" | "admin";
      email: string | null;
      full_name: string | null;
    }>(
      `select r.user_id, r.status, r.school, u.role, u.email, u.full_name
         from teacher_requests r
         join users u on u.id = r.user_id
        where r.id = ?
        for update`,
      [requestId],
    );
    if (!row) return { kind: "missing" as const };

    // ⚠️ پروندهٔ «نیاز به اصلاح» هم قابلِ تأیید است: ادمینی که یادداشت
    // گذاشته، ممکن است با دیدنِ دوبارهٔ همان مدرک نظرش عوض شود. فقط
    // پرونده‌های *بسته* دیگر تصمیم نمی‌گیرند.
    if (!isOpen(row.status)) return { kind: "settled" as const, status: row.status };

    // ⚠️ تأییدِ پروندهٔ یک مدیر، نقشش را پایین می‌آورد و دسترسیِ مدیریتش را
    // می‌گیرد. `submitTeacherRequest` جلویش را می‌گیرد، ولی ردیفی که *پیش
    // از* ارتقای کسی به مدیر ثبت شده هنوز می‌تواند اینجا باشد.
    if (row.role === "admin") return { kind: "admin_target" as const };

    await tx.execute(
      `update teacher_requests
          set status = 'approved', rejection_reason = null,
              reviewed_by = ?, reviewed_at = now(6)
        where id = ?`,
      [adminId, requestId],
    );

    await tx.execute("update users set role = 'teacher' where id = ?", [row.user_id]);

    const granted = await grantTeacherPlus(tx, {
      userId: row.user_id,
      grantedBy: adminId,
      reason: `دبیر تأییدشده — ${row.school}`.slice(0, 300),
    });

    /* ⚠️ تاریخچه **داخلِ همان تراکنش**.
       اگر بیرون بود، یک قطعیِ بینِ این دو یعنی پرونده‌ای که تأیید شده و
       نقش و اشتراکش را گرفته، ولی هیچ ردیفی نمی‌گوید چه کسی و کِی
       تأییدش کرد — همان سؤالی که شش ماه بعد پرسیده می‌شود. */
    await recordVerification(tx, {
      requestId,
      teacherId: row.user_id,
      adminId,
      action: "approved",
    });

    return {
      kind: "approved" as const,
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      grantCreated: granted.created,
    };
  });
}

/* ═══════════════════════════ لغوِ دسترسی ══════════════════════════════ */

export type RevokeOutcome =
  | { kind: "missing" }
  /** از قبل دبیر نبود — هیچ چیزی نوشته نشد. */
  | { kind: "not_teacher"; role: "student" | "admin" }
  | {
      kind: "revoked";
      email: string | null;
      fullName: string | null;
      /** چند ردیفِ اشتراکِ دبیری لغو شد (معمولاً ۱، گاهی ۰). */
      plusRevoked: number;
      /** چند کلاس عضوگیری‌شان بسته شد. */
      classesClosed: number;
    };

/**
 * لغوِ دسترسیِ دبیری — قرینهٔ `approveTeacherRequest`.
 *
 * =============================================================================
 * ⚠️ چرا این تابع لازم شد
 * =============================================================================
 *
 * تا امروز تأیید یک درِ **یک‌طرفه** بود: مدیر می‌توانست بدهد و نمی‌توانست
 * پس بگیرد. `adminSetUserRole` فقط `student` و `admin` می‌پذیرد و در رابط
 * کاربری هم دکمه‌اش برای یک دبیر «ارتقا به مدیر» است. یعنی یک تأییدِ
 * اشتباه نتیجه‌اش یک اشتراکِ مادام‌العمرِ برگشت‌ناپذیر بود و یک کلاسِ زنده
 * بدونِ ناظر.
 *
 * =============================================================================
 * ⚠️ سه نوشتن، در **یک** تراکنش — و نه بیشتر
 * =============================================================================
 *
 *   ۱) نقشِ کاربر → `student`
 *   ۲) اشتراکِ `teacher_verified` → لغو (و **فقط** همان)
 *   ۳) `join_enabled = 0` روی همهٔ کلاس‌هایش
 *
 * هر مرزی بینشان یک حالتِ نیمه‌کاره می‌سازد که از بیرون قابلِ تشخیص نیست:
 * «دیگر دبیر نیست ولی هنوز پلاسِ دبیری دارد»، یا بدتر، «دسترسی‌اش رفته
 * ولی کلاسش هنوز عضوِ تازه می‌پذیرد» — کلاسی که هیچ‌کس نمی‌بیندش.
 *
 * =============================================================================
 * ⚠️ و آنچه عمداً **انجام نمی‌شود**
 * =============================================================================
 *
 * • `teacher_requests.status` دست نمی‌خورد و `approved` می‌ماند.
 *
 *   «آن درخواست در آن زمان تأیید شد» یک واقعیتِ تاریخی است. لغوِ امروز یک
 *   رویدادِ *جدا* است و نباید تاریخ را بازنویسی کند — وگرنه شش ماه بعد
 *   هیچ‌کس نمی‌فهمد این کاربر اصلاً تأیید شده بود یا نه. وضعیتِ فعلی از
 *   `users.role` خوانده می‌شود، و رابطِ ادمین از قبل نشانِ «نقش دبیر
 *   ندارد» را برای همین حالت دارد.
 *
 * • هیچ کلاسی حذف نمی‌شود، هیچ عضویتی حذف نمی‌شود، هیچ بازخوردی حذف
 *   نمی‌شود، هیچ پاسخی حذف نمی‌شود. دسترسی قطع می‌شود، سابقه نه.
 *
 * • کدِ عضویت چرخانده نمی‌شود. لازم نیست: با `join_enabled = 0` همان کد
 *   دیگر کسی را وارد نمی‌کند (`joinGate` در `lib/teacher/membership.ts`).
 *   چرخاندنش فقط لینک‌ها و QRهای پخش‌شده را بی‌صدا می‌شکست بدونِ اینکه
 *   چیزی اضافه امن‌تر شود.
 *
 * • `is_active` دست نمی‌خورد. بایگانی کردنِ کلاس تصمیمِ دبیر است و نه
 *   عارضهٔ جانبیِ یک اقدامِ انضباطی؛ و کلاسِ بایگانی‌شده در رابطِ دانش‌آموز
 *   پیامِ دیگری می‌دهد.
 *
 * =============================================================================
 * ⚠️ خودتکرارپذیری و هم‌زمانی
 * =============================================================================
 *
 * `lockUser` اول از همه قفل می‌گیرد، بعد نقش خوانده می‌شود. دو مدیری که
 * هم‌زمان «لغو» بزنند پشتِ سرِ هم اجرا می‌شوند و دومی `not_teacher`
 * می‌بیند — پس هیچ‌کدام از سه نوشتن دو بار انجام نمی‌شود.
 *
 * و همین یعنی اجرای دوباره روی کسی که دیگر دبیر نیست، **هیچ چیزی
 * نمی‌نویسد**: نه اشتراکِ دیگری لغو می‌شود و نه کلاسی بسته.
 *
 * ⚠️ گارد اینجا نیست و نباید باشد — `requireAdmin()` سرِ جایش در
 * Server Action می‌ماند. (همان استدلالِ بالای این فایل.)
 *
 * ⚠️ و برخلافِ `approveTeacherRequest`، این تابع `adminId` نمی‌گیرد.
 *
 * آنجا لازم است چون دو ردیف نوشته می‌شود که ستونِ «چه کسی» دارند
 * (`teacher_requests.reviewed_by` و `teacher_verification_logs.admin_id`).
 * اینجا هیچ‌کدام از سه نوشتن چنین ستونی ندارد؛ «چه کسی لغو کرد» در
 * `admin_audit_log` می‌نشیند که بیرونِ تراکنش نوشته می‌شود.
 *
 * (و `teacher_verification_logs` جای این رویداد نیست: `request_id` آن
 *  NOT NULL است و لغو به هیچ پروندهٔ مشخصی بند نیست — ممکن است کاربر چند
 *  درخواست داشته باشد یا از راهِ دیگری دبیر شده باشد.)
 */
export async function revokeTeacher(userId: string): Promise<RevokeOutcome> {
  return transaction(async (tx) => {
    /* ⚠️ قفل **پیش از** خواندنِ نقش. برعکسش یعنی دو مدیر هر دو
       `teacher` می‌بینند و هر دو وارد بدنه می‌شوند. */
    await lockUserRow(tx, userId);

    const row = await tx.queryOne<{
      role: "student" | "teacher" | "admin";
      email: string | null;
      full_name: string | null;
    }>("select role, email, full_name from users where id = ?", [userId]);

    if (!row) return { kind: "missing" as const };

    if (row.role !== "teacher") {
      /* ⚠️ مدیر هم اینجا می‌افتد و این درست است: نقشِ `admin` هرگز نباید
         از این مسیر پایین بیاید. پایین آوردنِ یک مدیر کارِ صریحِ «مدیریت
         کاربران» است و نه عارضهٔ جانبیِ لغوِ دبیری. */
      return { kind: "not_teacher" as const, role: row.role };
    }

    await tx.execute("update users set role = 'student' where id = ?", [userId]);

    const plus = await revokeTeacherPlus(tx, userId);

    /* ⚠️ `join_enabled` و نه `is_active` — چرایی‌اش بالای همین تابع.
       اعضای فعلی دست نمی‌خورند؛ فقط درِ ورودی بسته می‌شود. */
    const classesClosed = await tx.execute(
      "update teacher_classes set join_enabled = 0, updated_at = now(6) where teacher_id = ? and join_enabled = 1",
      [userId],
    );

    return {
      kind: "revoked" as const,
      email: row.email,
      fullName: row.full_name,
      plusRevoked: plus.revoked,
      classesClosed,
    };
  });
}
