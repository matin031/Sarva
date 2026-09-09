import { getCurrentUser } from "@/lib/auth/current-user";
import { getPlusSummaryFor } from "@/lib/plus/summary";
import { isPlusEnabled } from "@/lib/plus/config";
import type { PlusSummary } from "@/lib/plus/types";
import { handleError, ok } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";

/**
 * GET /api/v1/auth/me — کاربر فعلی، یا null.
 *
 * جایگزین supabase.auth.getUser() در کامپوننت‌های کلاینت (Header، Quiz،
 * JasoosGame، RegisterPrompt، AccountSettings).
 *
 * وقتی کسی وارد نیست، ۲۰۰ با data برابر null برمی‌گرداند و نه ۴۰۱: برای این
 * کامپوننت‌ها «مهمان» یک حالت عادی است نه خطا، و ۴۰۱ فقط کنسول را پر می‌کرد.
 *
 * ⚠️ خلاصهٔ سروا پلاس هم از همین‌جا می‌آید و نه از یک endpoint جدا.
 *
 * دلیلش دو چیز است:
 *   ۱) هدر همین حالا هم برای دانستنِ «کی وارد است» یک درخواست می‌زند. سوار
 *      کردنِ خلاصه روی همان یعنی صفر درخواستِ اضافه در هر بارگذاری صفحه.
 *   ۲) نشانِ پلاس دقیقاً هم‌زمان با نامِ کاربر ظاهر می‌شود. اگر جدا بود،
 *      کاربر اول «رایگان» دیده می‌شد و یک لحظه بعد «پلاس» — پرشی که کاربر
 *      آن را خرابی می‌فهمد.
 *
 * و چون هر دو از یک پاسخ می‌آیند، خروج و تعویضِ حساب هم خودبه‌خود درست کار
 * می‌کند: کشِ `use-current-user` که پاک شود، وضعیتِ پلاس هم با آن می‌رود.
 */
export const GET = withRoute("/api/v1/auth/me", async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      // مهمان: هیچ کوئریِ اشتراکی زده نمی‌شود. تنها چیزی که لازم است این
      // است که مرورگر بداند کلِ پلاس روشن است یا نه، تا دکمهٔ «سروا پلاس» را
      // نشان بدهد یا ندهد.
      let enabled = false;
      try {
        enabled = await isPlusEnabled();
      } catch {
        /* خواندن تنظیمات شکست خورد؛ برای مهمان «خاموش» بی‌خطرترین حالت است. */
      }
      const plus: PlusSummary = {
        state: enabled ? "free" : "off",
        expiresAt: null,
        expiringSoon: false,
        isTrial: false,
        unreadNotifications: 0,
        unreadTickets: 0,
      };
      return ok({ user: null, plus });
    }

    return ok({ user, plus: await getPlusSummaryFor(user.id) });
  } catch (err) {
    return handleError(err);
  }
});

// این پاسخ به کوکی وابسته است و هرگز نباید کش شود — وگرنه کاربر A پاسخِ
// کاربر B را می‌گیرد.
export const dynamic = "force-dynamic";
