import "server-only";
import { cookies } from "next/headers";
import { listActiveSessions } from "./session";
import { hashRefreshToken } from "./tokens";
import { REFRESH_COOKIE } from "./cookies";

/**
 * دستگاه‌های واردشده، آمادهٔ نمایش.
 *
 * اینجا و نه داخل route: هم صفحهٔ تنظیمات (که سرور-کامپوننت است و داده را در
 * همان رندر اول می‌دهد) و هم endpoint‌ی که بعد از «خروج از همه» فهرست تازه را
 * می‌خواهد، به همین نگاشت نیاز دارند. دو نسخه از آن یعنی روزی یکی‌شان عوض
 * می‌شود و دیگری نه.
 */

export type DeviceRow = {
  id: string;
  device: string;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  /** آیا این همان مرورگری است که الان صفحه را باز کرده؟ */
  current: boolean;
};

/** «Chrome روی ویندوز» از یک رشتهٔ user-agent.
 *
 *  عمداً ساده و بدون کتابخانه: هدفش این است که کاربر دستگاه خودش را بشناسد،
 *  نه اینکه تحلیل دقیقی از مرورگر بدهد. */
export function describeDevice(ua: string | null): string {
  if (!ua) return "دستگاه ناشناس";

  // ترتیب مهم است: کروم هم «Safari» در رشته‌اش دارد و اج هم «Chrome».
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "مرورگر ناشناس";

  const os = /Android/.test(ua)
    ? "اندروید"
    : /iPhone|iPad|iPod/.test(ua)
      ? "آیفون یا آیپد"
      : /Windows/.test(ua)
        ? "ویندوز"
        : /Mac OS X/.test(ua)
          ? "مک"
          : /Linux/.test(ua)
            ? "لینوکس"
            : "سیستم ناشناس";

  return `${browser} روی ${os}`;
}

/**
 * فهرست دستگاه‌های فعالِ یک کاربر.
 *
 * ⚠️ هشِ refresh token از `listActiveSessions` می‌آید ولی **هرگز** از این تابع
 * بیرون نمی‌رود: فقط با هشِ کوکیِ درخواست جاری مقایسه می‌شود تا `current`
 * ساخته شود. آنچه به مرورگر می‌رسد یک بولی است، نه هیچ صورتی از توکن.
 */
export async function listDevices(userId: string): Promise<DeviceRow[]> {
  const token = (await cookies()).get(REFRESH_COOKIE)?.value;
  const currentHash = token ? hashRefreshToken(token) : null;

  const sessions = await listActiveSessions(userId);

  return sessions.map((s) => ({
    id: s.id,
    device: describeDevice(s.userAgent),
    ip: s.ip,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    current: currentHash !== null && s.refreshTokenHash === currentHash,
  }));
}
