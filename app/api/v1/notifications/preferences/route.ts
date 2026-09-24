import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { handleError, ok, readJson } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import { getNotifyPreferences, setNotifyPreferences } from "@/lib/notify/preferences";

/**
 * ترجیحاتِ پیامک و ایمیلِ کاربر.
 *
 * ⚠️ مسیرِ جدا از `/api/v1/auth/profile` است، با اینکه هر دو روی `users`
 * می‌نویسند. دلیلش شکلِ فرم است: پروفایل یک فرمِ «ذخیره» دارد و این دو یک
 * کلیدِ فوری‌اند. اگر در همان مسیر بودند، خاموش کردنِ پیامک یعنی ارسالِ
 * دوبارهٔ نام و استان و مدرسه — و هر بارِ ارسال یک فرصتِ تازه برای
 * بازنویسیِ چیزی که کاربر تغییرش نداده بود.
 */

const schema = z.object({
  sms: z.boolean(),
  email: z.boolean(),
});

export const GET = withRoute("/api/v1/notifications/preferences", async () => {
  try {
    const user = await requireUser();
    return ok(await getNotifyPreferences(user.id));
  } catch (err) {
    return handleError(err, "GET /api/v1/notifications/preferences");
  }
});

export const PATCH = withRoute("/api/v1/notifications/preferences", async (request: Request) => {
  try {
    const user = await requireUser();

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    await setNotifyPreferences(user.id, body.data);
    return ok(body.data);
  } catch (err) {
    return handleError(err, "PATCH /api/v1/notifications/preferences");
  }
});

export const dynamic = "force-dynamic";
