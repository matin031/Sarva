import { queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { AuthError } from "@/lib/auth/types";
import { isUuid } from "@/lib/api/action-input";
import { withRoute } from "@/lib/api/route";
import { openTeacherDocument } from "@/lib/teacher/documents";
import { recordAudit } from "@/lib/admin/audit";
import { logger } from "@/lib/observability";

/**
 * GET /api/v1/admin/teacher-requests/[id]/document
 *
 * تنها راهِ دیدنِ حکمِ کارگزینی — بند ۹: «فایل حکم فقط برای ادمین‌های مجاز
 * قابل مشاهده باشد».
 *
 * =============================================================================
 * ⚠️ چرا یک route و نه یک فایلِ ایستا
 * =============================================================================
 *
 * بقیهٔ فایل‌های آپلودیِ سایت زیرِ `/uploads` می‌نشینند و Caddy مستقیم
 * سروشان می‌کند، بدونِ اینکه Next اصلاً ببیندشان. این یعنی هیچ بررسیِ
 * دسترسی‌ای ممکن نیست — و برای صوتِ کوییز کاملاً درست است.
 *
 * برای این فایل غلط است. پس فایل بیرونِ آن ریشه ذخیره می‌شود
 * (`lib/teacher/documents.ts`) و تنها درِ ورودی‌اش همین تابع است، که خطِ
 * اولش `requireAdmin()` است.
 *
 * ⚠️ ترتیب: **اول گارد، بعد هر چیزِ دیگر.** نه کوئری، نه خواندنِ دیسک، نه
 * حتی بررسیِ شکلِ شناسه. اگر بررسیِ شناسه اول بود، تفاوتِ پاسخِ «۴۰۰ شناسه
 * بدشکل» با «۴۰۳» به یک غریبه می‌گفت که این مسیر واقعاً وجود دارد.
 */

export const dynamic = "force-dynamic";

/**
 * نامِ فایل برای هدرِ دانلود.
 *
 * ⚠️ دو شکل لازم است. `filename=` فقط ASCII می‌پذیرد و نامِ فارسی در آن
 * یا حذف می‌شود یا هدر را می‌شکند؛ `filename*=UTF-8''…` نامِ واقعی را
 * می‌رساند ولی مرورگرهای خیلی قدیمی نمی‌فهمندش. هر دو نوشته می‌شوند.
 *
 * ⚠️ و نامِ ASCII یک مقدارِ *ثابت* است و نه نامِ پاک‌سازی‌شدهٔ کاربر: نامِ
 * فایل را کاربر انتخاب کرده و می‌تواند شاملِ گیومه و `;` باشد — یعنی یک
 * تزریقِ هدر که با آن می‌شود `Content-Disposition` را کلاً عوض کرد.
 */
function contentDisposition(name: string): string {
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="teacher-document"; filename*=UTF-8''${encoded}`;
}

export const GET = withRoute(
  "/api/v1/admin/teacher-requests/[id]/document",
  async (_request, ctx: { params: Promise<{ id: string }> }) => {
    let admin;
    try {
      admin = await requireAdmin();
    } catch (err) {
      // ⚠️ متنِ خودمان است و نمایشش بی‌خطر؛ هر چیزِ دیگری به `withRoute`
      // می‌رود که پیامِ عمومی می‌دهد.
      if (err instanceof AuthError) {
        return Response.json({ ok: false, errors: [err.message] }, { status: err.status });
      }
      throw err;
    }

    const { id } = await ctx.params;
    if (!isUuid(id)) return new Response("Not found", { status: 404 });

    const row = await queryOne<{ document_key: string; document_name: string; document_type: string }>(
      "select document_key, document_name, document_type from teacher_requests where id = ?",
      [id],
    );
    if (!row) return new Response("Not found", { status: 404 });

    const opened = await openTeacherDocument(row.document_key);
    if (!opened) {
      // ردیف هست ولی فایل روی دیسک نیست. برای مدیر این یک ۴۰۴ ساده نیست —
      // یعنی چیزی خراب شده و باید در لاگ بماند.
      logger.error("فایل حکم کارگزینی روی دیسک پیدا نشد", {
        event: "teacher.document.missing",
        teacher_request_id: id,
      });
      return new Response("Not found", { status: 404 });
    }

    /* ⚠️ هر باز کردنِ این فایل ثبت می‌شود.
       یک سندِ هویتی است؛ «چه کسی و کِی دیدش» باید بعداً قابل جواب باشد.
       بدونِ انتظار، تا خواندنِ فایل معطلِ یک insert نشود. */
    void recordAudit({
      actor: admin,
      action: "teacher.document_view",
      targetType: "teacher_request",
      targetId: id,
      summary: "فایل حکم کارگزینی باز شد",
    }).catch(() => {
      /* ثبتِ ناموفق نباید جلوی بررسیِ مدیر را بگیرد. */
    });

    return new Response(opened.stream, {
      status: 200,
      headers: {
        "Content-Type": row.document_type || "application/octet-stream",
        "Content-Length": String(opened.size),
        "Content-Disposition": contentDisposition(row.document_name),
        // ⚠️ مرورگر نباید نوعِ فایل را «حدس بزند» — بدونِ این، یک فایل با
        // بایت‌های جعلی می‌توانست به‌عنوان HTML اجرا شود، آن هم روی
        // مرورگرِ مدیر.
        "X-Content-Type-Options": "nosniff",
        // ⚠️ هرگز کش نمی‌شود، نه در مرورگر و نه در هیچ پروکسیِ میانی. یک
        // نسخهٔ کش‌شده یعنی همان سند بعد از خروجِ مدیر هم قابل خواندن است.
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        pragma: "no-cache",
        // اسنادِ اسکن‌شده نباید در قابِ سایتِ دیگری بنشینند.
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  },
);
