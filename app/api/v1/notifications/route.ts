import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { handleError, ok, readJson } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import {
  NOTIFICATION_PAGE_SIZE,
  countUnreadNotifications,
  listNotificationsPage,
  markNotificationRead,
  markNotificationsRead,
} from "@/lib/plus/notifications";

/**
 * مرکزِ اعلان‌ها.
 *
 * =============================================================================
 * ⚠️ چرا مسیرِ تازه و نه توسعهٔ `/api/v1/plus/notifications`
 * =============================================================================
 *
 * آن مسیر می‌ماند و دست نمی‌خورد — کارتِ خوش‌آمدِ پلاس و هر چیزِ دیگری که
 * امروز صدایش می‌زند، نباید بشکند. ولی نامش دروغ شده بود: از مهاجرت ۰۱۲ به
 * بعد این اعلان‌ها هیچ ربطی به اشتراکِ پلاس ندارند (بازخوردِ دبیر، عضویت در
 * کلاس). یک مسیرِ `/plus/…` برای اعلانِ «دبیرت بازخورد نوشت» روزی کسی را
 * وادار می‌کرد بپرسد «یعنی این هم مالِ پلاس است؟».
 *
 * ⚠️ **جدول** ولی همان یکی است. دو سیستمِ موازی یعنی دانش‌آموز باید دو جا
 * را نگاه کند و زنگولهٔ شمارنده یکی‌شان را جا بیندازد.
 *
 * =============================================================================
 * ⚠️ مالکیت
 * =============================================================================
 *
 * شناسهٔ کاربر **همیشه** از سشن می‌آید و هیچ‌کدام از این مسیرها `userId`
 * نمی‌پذیرند. شرطِ مالکیت هم داخلِ خودِ `UPDATE` است و نه در یک `if` —
 * یعنی «خوانده شد»ِ کاربر A نمی‌تواند به اعلانِ B برسد، حتی با شناسهٔ
 * درست.
 */

const patchSchema = z
  .object({
    /** خالی یعنی «همه را خوانده‌شده کن». */
    id: z.uuid("شناسهٔ اعلان معتبر نیست.").optional(),
  })
  .strict();

/** GET — یک صفحه از اعلان‌ها، همراهِ شمارندهٔ نخوانده‌ها. */
export const GET = withRoute("/api/v1/notifications", async (request: Request) => {
  try {
    const user = await requireUser();

    const url = new URL(request.url);
    /* ⚠️ `Number.parseInt` روی ورودیِ کاربر، و بعد نرمال‌سازی. یک
       `?offset=abc` باید صفر شود و نه `NaN` — چون `NaN` در `limit ?`
       یک کوئریِ شکسته می‌سازد. */
    const raw = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
    const offset = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 10_000) : 0;

    const [page, unread] = await Promise.all([
      listNotificationsPage(user.id, offset, NOTIFICATION_PAGE_SIZE),
      countUnreadNotifications(user.id),
    ]);

    return ok({ ...page, unread, offset });
  } catch (err) {
    return handleError(err);
  }
});

/** PATCH — یکی یا همه را خوانده‌شده می‌کند. */
export const PATCH = withRoute("/api/v1/notifications", async (request: Request) => {
  try {
    const user = await requireUser();

    const body = await readJson(request, patchSchema);
    if (!body.ok) return body.response;

    if (body.data.id) {
      /* ⚠️ هیچ پاسخِ متفاوتی برای «مالِ تو نیست» داده نمی‌شود.
         `markNotificationRead` شرطِ `user_id` را در همان `UPDATE` دارد، پس
         شناسهٔ اعلانِ دیگری بی‌اثر است — و این که بی‌اثر بودنش از
         «نبودنِ اعلان» قابلِ تشخیص نباشد، عمدی است. */
      await markNotificationRead(user.id, body.data.id);
      return ok({ marked: 1 });
    }

    return ok({ marked: await markNotificationsRead(user.id) });
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
