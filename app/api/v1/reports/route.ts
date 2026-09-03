import { z } from "zod";
import { queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson, requestMeta } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import { rateLimit } from "@/lib/api/rate-limit";
import { currentRequestId, logger, redactRecord } from "@/lib/observability";
import {
  REPORT_AREAS,
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  REPORT_SNAPSHOT_MAX,
} from "@/lib/reports/constants";

/**
 * POST /api/v1/reports — «این سؤال ایراد دارد».
 *
 * ⚠️ عمداً بدونِ نیاز به ورود.
 *
 * بیشترِ کسانی که به سؤالِ غلط برمی‌خورند مهمان‌اند؛ اگر گزارش دادن پشتِ
 * ثبت‌نام باشد، آن گزارش هرگز نمی‌آید و مدیر هیچ‌وقت نمی‌فهمد کدام سؤال
 * خراب است. اگر کاربر وارد باشد، شناسه‌اش ثبت می‌شود تا بشود پیگیری کرد.
 *
 * چیزی که جای سشن را می‌گیرد، سقفِ نرخ است: هم به‌ازای هر IP و هم به‌ازای
 * هر محتوا، تا یک نفر نتواند یک سؤال را صد بار گزارش کند.
 */

const schema = z.object({
  area: z.enum(REPORT_AREAS),
  reason: z.enum(REPORT_REASONS),
  targetId: z.string().trim().max(200).nullish(),
  /** مکان‌یابِ ساختاریافته — پایه، درس، شمارهٔ پرسش… */
  targetRef: z.record(z.string(), z.unknown()).nullish(),
  snapshot: z.string().trim().max(REPORT_SNAPSHOT_MAX).nullish(),
  note: z
    .string()
    .trim()
    .max(REPORT_NOTE_MAX, `توضیح نباید بیشتر از ${REPORT_NOTE_MAX} نویسه باشد.`)
    .nullish(),
})
  /* «چیز دیگری» یعنی هیچ‌کدام از دلیل‌های آماده — پس بدونِ توضیح، گزارش هیچ
     چیزی نمی‌گوید و هیچ‌کس نمی‌تواند رویش کاری کند. پنجره هم دکمه را قفل
     می‌کند، ولی قانون اینجاست: کلاینت را می‌شود دور زد. */
  .refine((v) => v.reason !== "other" || (v.note?.trim().length ?? 0) > 0, {
    path: ["note"],
    message: "برای «چیز دیگری» باید توضیح بنویسی.",
  });

export const POST = withRoute("/api/v1/reports", async (request: Request) => {
  try {
    const meta = requestMeta(request);

    // سقفِ کلی: یک نفر در ربع ساعت حداکثر ۱۵ گزارش. سخاوتمندانه برای کسی که
    // واقعاً چند سؤالِ خراب دیده، بی‌فایده برای اسکریپت.
    const ipLimit = rateLimit(`report-ip:${meta.ip ?? "unknown"}`, 15, 15 * 60);
    if (!ipLimit.allowed) {
      logger.warn("گزارش محتوا به‌خاطر سقف نرخ رد شد", {
        event: "report.rate_limited",
        limit_scope: "ip",
        retry_after_seconds: ipLimit.retryAfterSeconds,
      });
      return fail(
        `گزارش‌های زیاد. ${ipLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`,
        429,
      );
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const { area, reason, targetId, targetRef, snapshot, note } = body.data;

    // سقفِ دوم، روی خودِ محتوا: یک IP نمی‌تواند یک سؤال را بارها گزارش کند.
    if (targetId) {
      const dup = rateLimit(`report-target:${meta.ip ?? "?"}:${area}:${targetId}`, 2, 24 * 3600);
      if (!dup.allowed) {
        // ⚠️ پاسخ عمداً موفق است: کاربر گزارشش را داده و لازم نیست بداند
        // ردیفِ دومی ساخته نشد. پیامِ خطا فقط او را به تکرار وامی‌دارد.
        return ok({ recorded: true });
      }
    }

    // کاربر اگر وارد باشد ثبت می‌شود، ولی نبودنش گزارش را رد نمی‌کند.
    const user = await getCurrentUser().catch(() => null);

    const row = await queryOne<{ id: string }>(
      `insert into content_reports
         (area, target_id, target_ref, snapshot, reason, note,
          user_id, ip, user_agent, request_id)
       values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8::inet, $9, $10)
     returning id`,
      [
        area,
        targetId || null,
        // ⚠️ از فیلترِ بازگشتی رد می‌شود: مکان‌یاب را خودِ کلاینت می‌فرستد و
        // نباید بتواند چیزی جز داده‌ای ساده در آن جا بدهد.
        JSON.stringify(redactRecord(targetRef ?? {}, { profile: "operational" })),
        snapshot || null,
        reason,
        note || null,
        user?.id ?? null,
        meta.ip,
        meta.userAgent,
        currentRequestId(),
      ],
    );

    // ⚠️ نه متنِ گزارش و نه شناسهٔ محتوا در لاگ عملیاتی: برای دانستنِ «چند
    // گزارش و از کدام بخش» همین کافی است، و بقیه‌اش در جدول هست.
    logger.info("گزارش محتوا ثبت شد", {
      event: "report.created",
      report_area: area,
      report_reason: reason,
      signed_in: Boolean(user),
    });

    return ok({ recorded: true, id: row?.id ?? null }, 201);
  } catch (err) {
    return handleError(err, "POST /api/v1/reports");
  }
});

export const dynamic = "force-dynamic";
