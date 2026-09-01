import { getCurrentUser } from "@/lib/auth/current-user";
import { handleError, ok } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";

/**
 * GET /api/v1/auth/me — کاربر فعلی، یا null.
 *
 * جایگزین supabase.auth.getUser() در کامپوننت‌های کلاینت (Header، Quiz،
 * JasoosGame، RegisterPrompt، AccountSettings) که در فاز ۷ به این وصل می‌شوند.
 *
 * وقتی کسی وارد نیست، ۲۰۰ با data برابر null برمی‌گرداند و نه ۴۰۱: برای این
 * کامپوننت‌ها «مهمان» یک حالت عادی است نه خطا، و ۴۰۱ فقط کنسول را پر می‌کرد.
 */
export const GET = withRoute("/api/v1/auth/me", async () => {
  try {
    const user = await getCurrentUser();
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
});

// این پاسخ به کوکی وابسته است و هرگز نباید کش شود — وگرنه کاربر A پاسخِ
// کاربر B را می‌گیرد.
export const dynamic = "force-dynamic";
