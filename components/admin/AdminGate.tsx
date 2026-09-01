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
/** خطای «جدول وجود ندارد» پستگرس. کدِ SQLSTATE بررسی می‌شود و نه متنِ پیام،
 *  چون متن با زبان و نسخهٔ سرور عوض می‌شود. */
function isUndefinedTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "42P01"
  );
}

export async function loadAdminData<T>(
  load: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; title: string; message: string }> {
  try {
    return { ok: true, data: await load() };
  } catch (e) {
    // AuthError: «باید وارد شوید» / «دسترسی مدیریت ندارید» — نوشتهٔ خودمان.
    // InvalidInputError: پیام فارسیِ اعتبارسنجی ورودی — نوشتهٔ خودمان.
    if (e instanceof AuthError || e instanceof InvalidInputError) {
      return { ok: false, title: "دسترسی ندارید", message: e.message };
    }

    // 42P01 = undefined_table. یعنی migration اجرا نشده، نه اینکه چیزی خراب
    // است — و تنها حالتی است که پیامِ درست، یک *دستور* است نه یک عذرخواهی.
    //
    // در داکر این هیچ‌وقت پیش نمی‌آید (docker-entrypoint.sh پیش از بالا آمدنِ
    // سرور migrate می‌زند)، ولی در `next dev` هیچ‌چیز خودکار اجرا نمی‌شود؛ پس
    // هر migration تازه، برای هر توسعه‌دهنده، یک stack trace از دلِ صفحهٔ
    // ادمین است. نامِ جدول عمداً در پیام نمی‌آید — همان دلیلِ پایین.
    if (isUndefinedTable(e)) {
      return {
        ok: false,
        // عنوان با حالتِ احراز هویت فرق دارد: این یک بن‌بستِ دسترسی نیست، یک
        // کارِ انجام‌نشده است — و عنوانِ اشتباه، خواننده را دنبالِ مشکلی
        // می‌فرستد که وجود ندارد.
        title: "دیتابیس به‌روز نیست",
        message:
          "بخشی از جدول‌های دیتابیس هنوز ساخته نشده‌اند. «npm run db:migrate» را اجرا کنید و دوباره این صفحه را باز کنید.",
      };
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

export function AdminAccessDenied({
  message,
  title = "دسترسی ندارید",
}: {
  message: string;
  /** پیش‌فرض برای همان حالتی است که این کامپوننت برایش ساخته شد؛ صفحه‌هایی که
   *  `result.title` را پاس می‌دهند، دلیلِ واقعی را نشان می‌دهند. */
  title?: string;
}) {
  return (
    <div dir="rtl" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
