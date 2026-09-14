import "server-only";
import { transaction } from "@/lib/db";
import { grantTeacherPlus } from "@/lib/plus/grants";
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
