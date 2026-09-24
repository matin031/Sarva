import "server-only";
import { query } from "@/lib/db";
import { logger } from "@/lib/observability";
import { expiringSoonDays, isPlusEnabled } from "@/lib/plus/config";
import { notify } from "@/lib/plus/notifications";
import { notifyUser } from "./index";

/**
 * =============================================================================
 * یادآوریِ پایانِ اشتراک — تنها پیامی که سروا **خودش** شروع می‌کند
 * =============================================================================
 *
 * بقیهٔ پیام‌ها واکنش‌اند: کاربر ثبت‌نام کرد، کاربر پرداخت کرد. این یکی
 * پاسخی به هیچ درخواستی نیست و همین، سه چیز را لازم می‌کند که جاهای دیگر
 * لازم نبودند:
 *
 *   ۱) **یک صدازنندهٔ بیرونی.** سروا نه صف دارد و نه worker (تصمیمی که در
 *      `docs/activity-events.md` و `docs/teacher-document-retention.md` هم
 *      گرفته شده). پس این تابع دو ورودی دارد و هر دو از بیرون صدا زده
 *      می‌شوند: `npm run notify:expiring` برای کرونِ هاست، و
 *      `POST /api/v1/cron/notifications` برای کرونِ اینترنتی. هر دو به
 *      همین تابع می‌رسند.
 *
 *   ۲) **تحملِ اجرای چندباره.** کرون تضمینِ «دقیقاً یک بار» نمی‌دهد: تیک
 *      جا می‌افتد، دو بار می‌زند، یا کسی دستی هم اجرا می‌کند. `dedupeKey`
 *      در `notifyUser` این را می‌گیرد، و کلید عمداً **تاریخِ پایان** را در
 *      خود دارد — پس کاربری که تمدید می‌کند، برای دورهٔ تازه‌اش دوباره
 *      یادآوری می‌گیرد، و کاربری که تمدید نمی‌کند فقط یک بار.
 *
 *   ۳) **سقف.** یک اجرا نباید بتواند کلِ اعتبارِ پیامک را خرج کند. اگر روزی
 *      اشتباهی این کار روی همهٔ کاربران راه بیفتد، `MAX_PER_RUN` تنها
 *      چیزی است که بینِ آن اشتباه و قبضِ پیامک ایستاده.
 *
 * ── چرا `max(ends_at)` و نه `resolveCoverage` ──────────────────────────────
 *
 * `lib/plus/coverage.ts` برای یک کاربر، شکافِ بینِ دوره‌ها را هم می‌فهمد و
 * برای *نمایش* لازم است. اینجا لازم نیست و به‌کار هم نمی‌آید: سؤالِ این
 * ماژول «دسترسیِ این آدم کِی تمام می‌شود» است و جوابش دورترین `ends_at` ِ
 * لغونشده است. آوردنِ همهٔ ردیف‌های همهٔ کاربران به حافظه برای رسیدن به
 * همان یک عدد، کاری است که دیتابیس بهتر انجامش می‌دهد.
 */

/** سقفِ کاربر در هر اجرا — بندِ ۳ بالا. */
const MAX_PER_RUN = 500;

/**
 * پنجرهٔ «تازه تمام شده».
 *
 * ⚠️ بدونِ این، **اولین** اجرای این کار به هر کاربری که تا به حال اشتراکش
 * تمام شده یک پیامک می‌فرستاد — یعنی یک قبضِ بزرگ و یک موجِ پیامکِ بی‌ربط
 * برای کسی که شش ماه پیش رفته. با آن، فقط کسانی که در همین دو روز تمام
 * شده‌اند پیام می‌گیرند.
 */
const EXPIRED_WINDOW_DAYS = 2;

export type ExpirySweepResult = {
  /** «نزدیک پایان» — چند نفر پیام گرفتند. */
  expiring: number;
  /** «تمام شد» — چند نفر پیام گرفتند. */
  expired: number;
  /** چند نفر بررسی شدند ولی پیامی نرفت (تکراری، بی‌راهِ تماس، …). */
  skipped: number;
  /** اگر کلِ پلاس خاموش باشد، هیچ‌کاری انجام نمی‌شود. */
  ran: boolean;
};

type CandidateRow = { user_id: string; ends_at: string };

/**
 * کاربرانی که دسترسی‌شان در `withinDays` روزِ آینده تمام می‌شود.
 *
 * ⚠️ `sum(ends_at is null) = 0` یعنی «هیچ دسترسیِ دائمی ندارد». بدونش،
 * کاربری که یک هدیهٔ بی‌تاریخ و یک خریدِ تاریخ‌دار دارد، برای پایانِ آن خرید
 * هشدار می‌گرفت در حالی که دسترسی‌اش هرگز تمام نمی‌شود.
 *
 * ⚠️ و `revoked_at is null` در `where` است و نه در `having`: دسترسیِ
 * لغوشده اصلاً نباید در حساب بیاید، نه اینکه بیاید و بعد کنار گذاشته شود.
 */
async function expiringCandidates(withinDays: number): Promise<CandidateRow[]> {
  return query<CandidateRow>(
    `select user_id, max(ends_at) as ends_at
       from plus_entitlements
      where revoked_at is null
      group by user_id
     having sum(ends_at is null) = 0
        and max(ends_at) > now(6)
        and max(ends_at) <= now(6) + interval ? day
      order by max(ends_at)
      limit ?`,
    [withinDays, MAX_PER_RUN],
  );
}

/** کاربرانی که دسترسی‌شان در پنجرهٔ اخیر تمام شده. */
async function expiredCandidates(): Promise<CandidateRow[]> {
  return query<CandidateRow>(
    `select user_id, max(ends_at) as ends_at
       from plus_entitlements
      where revoked_at is null
      group by user_id
     having sum(ends_at is null) = 0
        and max(ends_at) <= now(6)
        and max(ends_at) > now(6) - interval ? day
      order by max(ends_at) desc
      limit ?`,
    [EXPIRED_WINDOW_DAYS, MAX_PER_RUN],
  );
}

const MS_PER_DAY = 86_400_000;

/**
 * یک دورِ کاملِ یادآوری.
 *
 * ⚠️ هرگز throw نمی‌کند: صدازننده‌اش یک کرون است و کرونی که با خطا بمیرد،
 * فردا هم می‌میرد و کسی خبردار نمی‌شود. خطا لاگ می‌شود و شمارش برمی‌گردد.
 */
export async function runExpirySweep(): Promise<ExpirySweepResult> {
  const result: ExpirySweepResult = { expiring: 0, expired: 0, skipped: 0, ran: false };

  try {
    /* ⚠️ وقتی پلاس خاموش است، همه‌چیز رایگان است (چراییِ کاملش در
       `lib/plus/config.ts`). فرستادنِ «تمدید کن» در آن حالت یعنی دعوت به
       پرداخت برای چیزی که همین حالا باز است. */
    if (!(await isPlusEnabled())) {
      logger.info("یادآوریِ پایان اشتراک اجرا نشد چون سروا پلاس خاموش است", {
        event: "notify.expiry.disabled",
      });
      return result;
    }
    result.ran = true;

    const days = await expiringSoonDays();
    const now = Date.now();

    for (const row of await expiringCandidates(days)) {
      const daysLeft = Math.max(1, Math.ceil((Date.parse(row.ends_at) - now) / MS_PER_DAY));

      /* اعلانِ درون‌سایتی هم ثبت می‌شود و نه فقط پیامک: کاربری که پیامک را
         نمی‌بیند یا شماره ندارد، باید در پنل همان خبر را پیدا کند. */
      await notify({
        userId: row.user_id,
        kind: "plus_expiring",
        title: "اشتراکت رو به پایان است",
        body: `${daysLeft.toLocaleString("fa-IR")} روز تا پایان سروا پلاس.`,
        href: "/panel/subscription",
        dedupeKey: `plus_expiring:${row.ends_at}`,
      }).catch(() => {});

      const sent = await notifyUser({
        userId: row.user_id,
        event: "plus_expiring",
        endsAt: row.ends_at,
        daysLeft,
        // ⚠️ تاریخِ پایان در کلید است: تمدید یعنی دورهٔ تازه و یادآوریِ تازه.
        dedupeKey: `plus_expiring:${row.ends_at}`,
      });

      if (sent.duplicate) result.skipped += 1;
      else result.expiring += 1;
    }

    for (const row of await expiredCandidates()) {
      await notify({
        userId: row.user_id,
        kind: "plus_expired",
        title: "اشتراکت تمام شد",
        body: "حساب و پیشرفتت سر جایش است؛ فقط بخش‌های پلاس بسته شد.",
        href: "/panel/subscription",
        dedupeKey: `plus_expired:${row.ends_at}`,
      }).catch(() => {});

      const sent = await notifyUser({
        userId: row.user_id,
        event: "plus_expired",
        endsAt: row.ends_at,
        dedupeKey: `plus_expired:${row.ends_at}`,
      });

      if (sent.duplicate) result.skipped += 1;
      else result.expired += 1;
    }

    logger.info("یادآوریِ پایان اشتراک اجرا شد", {
      event: "notify.expiry.completed",
      expiring_count: result.expiring,
      expired_count: result.expired,
      skipped_count: result.skipped,
    });
  } catch (err) {
    logger.error("یادآوریِ پایان اشتراک شکست خورد", { event: "notify.expiry.failed", err });
  }

  return result;
}
