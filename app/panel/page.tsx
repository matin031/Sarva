import { redirect } from "next/navigation";

/**
 * `/panel` → `/panel/home`
 *
 * ⚠️ رفعِ یک باگ واقعی: تا امروز هیچ صفحه‌ای روی `/panel` نبود، در حالی که
 * ورود و ثبت‌نام هر دو کاربر را دقیقاً به همان‌جا می‌فرستند
 * (`router.push("/panel")` در MobileLoginForm.tsx و SignUp.tsx). یعنی هر
 * کاربری بعد از ورود موفق، یک صفحهٔ ۴۰۴ می‌دید.
 *
 * ریدایرکت اینجاست و نه برعکس، چون منوی پنل به `/panel/home` لینک می‌دهد —
 * پس مسیرِ پرتکرار مستقیم می‌ماند و فقط ورود یک پرش دارد.
 */
export default function Page() {
  redirect("/panel/home");
}
