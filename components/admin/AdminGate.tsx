import { AuthError } from "@/lib/auth/types";
import { InvalidInputError } from "@/lib/api/action-input";

/** Wraps an async data-loading call for an admin page: runs it, and on
 *  failure (requireAdmin() throwing, most commonly) returns a plain-
 *  language message instead of letting the page crash. Shared by every
 *  /admin/* page so "you're not an admin" always looks the same.
 *
 *  ⚠️ Only messages we wrote ourselves are shown. This used to render
 *  `e.message` for *any* error, which was fine while `requireAdmin()` was the
 *  only realistic thrower — but a Postgres error reaching here would have put
 *  raw table and column names on screen, which is schema information a visitor
 *  has no business seeing, and a stack of it is a map for someone probing.
 *  Anything unrecognised now gets a generic line and the real error goes to the
 *  server log, where it belongs. */
export async function loadAdminData<T>(
  load: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    return { ok: true, data: await load() };
  } catch (e) {
    // AuthError: «باید وارد شوید» / «دسترسی مدیریت ندارید» — نوشتهٔ خودمان.
    // InvalidInputError: پیام فارسیِ اعتبارسنجی ورودی — نوشتهٔ خودمان.
    if (e instanceof AuthError || e instanceof InvalidInputError) {
      return { ok: false, message: e.message };
    }

    // ⚠️ هر چیز دیگری دوباره پرتاب می‌شود و اینجا بلعیده نمی‌شود.
    //
    // فقط به‌خاطر پیام خطا نیست: Next از throw به‌عنوان *مکانیزم کنترلی*
    // استفاده می‌کند. وقتی یک صفحهٔ ادمین در زمان build به cookies() می‌رسد،
    // Next یک DynamicServerError پرتاب می‌کند تا بفهمد این مسیر باید dynamic
    // باشد. گرفتن و بلعیدنِ آن یعنی دخالت در کاری که فریمورک دارد می‌کند —
    // و همان‌طور که در لاگ build دیده شد، یک صفحه پر از خطای گنگ هم تولید
    // می‌کند. همین منطق برای redirect() و notFound() هم صادق است که هر دو با
    // throw کار می‌کنند.
    //
    // برای یک خطای واقعی (مثلاً قطعی دیتابیس) هم پرتاب دوباره درست است:
    // error boundary خودِ Next نشانش می‌دهد، بدون اینکه متن خام پستگرس — با
    // نام جدول‌ها و ستون‌ها — روی صفحه بنشیند.
    throw e;
  }
}

export function AdminAccessDenied({ message }: { message: string }) {
  return (
    <div dir="rtl" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="text-lg font-bold">دسترسی ندارید</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
