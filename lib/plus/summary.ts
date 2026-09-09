import "server-only";
import { cache } from "react";
import { queryOne } from "@/lib/db";
import { logger } from "@/lib/observability";
import { getPlusStatusFor } from "./entitlement";
import type { PlusSummary } from "./types";

/**
 * خلاصهٔ کوچکی که همراهِ «کاربر فعلی» به مرورگر می‌رود.
 *
 * ⚠️ چرا یک خلاصهٔ جدا و نه صدا زدنِ چند تابع در هدر:
 *
 * نشانِ پلاس روی *هر* صفحهٔ سایت رندر می‌شود. اگر برای ساختنش سه کوئریِ
 * جداگانه می‌زدیم (وضعیت، اعلانِ نخوانده، تیکتِ نخوانده)، هر بازدید از هر
 * صفحه سه رفت‌وبرگشت اضافه داشت — یعنی یک نشانِ تزئینی، هزینهٔ کلِ سایت را
 * بالا می‌برد.
 *
 * اینجا دو کوئری است و نه بیشتر: یکی برای وضعیت (که خودش کش‌شده است) و یکی
 * برای دو شمارنده با هم.
 *
 * ⚠️ و چرا داخلِ پاسخِ `/api/v1/auth/me` می‌نشیند: مرورگر همین حالا هم برای
 * دانستنِ «کی وارد است» یک درخواست می‌زند. سوار کردنِ خلاصه روی همان یعنی
 * صفر درخواستِ اضافه و — مهم‌تر — یعنی نشانِ پلاس دقیقاً هم‌زمان با نامِ
 * کاربر ظاهر می‌شود، نه یک ثانیه بعدش. (یک «پرشِ» دوم در چیدمان، چیزی است
 * که کاربر آن را خرابی می‌فهمد.)
 */

const EMPTY: PlusSummary = {
  state: "off",
  expiresAt: null,
  expiringSoon: false,
  isTrial: false,
  unreadNotifications: 0,
  unreadTickets: 0,
};

export const getPlusSummaryFor = cache(async (userId: string): Promise<PlusSummary> => {
  const status = await getPlusStatusFor(userId);

  // وقتی کلِ پلاس خاموش است، هیچ شمارنده‌ای هم لازم نیست: نه نشانی هست و نه
  // بخشِ پشتیبانی‌ای که نشانِ نخوانده داشته باشد.
  if (status.state === "off") return EMPTY;

  let unreadNotifications = 0;
  let unreadTickets = 0;

  try {
    const row = await queryOne<{ notifications: number; tickets: number }>(
      // یک رفت‌وبرگشت برای هر دو شمارنده. هر دو زیرکوئری روی ایندکسِ جزئیِ
      // خودشان می‌نشینند (`plus_notifications_unread_idx` و
      // `plus_tickets_user_idx`)، پس هیچ‌کدام جدول را اسکن نمی‌کنند.
      `select
         (select count(*) from plus_notifications
           where user_id = $1 and read_at is null) as notifications,
         (select count(*) from plus_tickets
           where user_id = $1 and user_unread) as tickets`,
      [userId],
    );
    unreadNotifications = row?.notifications ?? 0;
    unreadTickets = row?.tickets ?? 0;
  } catch (err) {
    // شمارنده‌ها تزئینی‌اند: شکستشان نباید وضعیتِ اشتراک را «نامعلوم» کند.
    logger.warn("شمارندهٔ اعلان‌های سروا پلاس خوانده نشد", {
      event: "plus.summary.counters_failed",
      err,
    });
  }

  return {
    state: status.state,
    expiresAt: status.expiresAt,
    expiringSoon: status.expiringSoon,
    isTrial: status.isTrial,
    unreadNotifications,
    unreadTickets,
  };
});
