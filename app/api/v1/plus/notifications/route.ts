import { requireUser } from "@/lib/auth/current-user";
import { handleError, ok } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import { listNotifications, markNotificationsRead } from "@/lib/plus/notifications";

/** GET — آخرین اعلان‌های کاربر. مالکیت از سشن می‌آید، نه از پارامتر. */
export const GET = withRoute("/api/v1/plus/notifications", async () => {
  try {
    const user = await requireUser();
    return ok({ notifications: await listNotifications(user.id) });
  } catch (err) {
    return handleError(err);
  }
});

/** POST — همه را خوانده‌شده علامت می‌زند. */
export const POST = withRoute("/api/v1/plus/notifications", async () => {
  try {
    const user = await requireUser();
    return ok({ marked: await markNotificationsRead(user.id) });
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
