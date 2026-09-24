import { redirect } from "next/navigation";
import LessonPlayer from "@/components/learn/LessonPlayer";
import { getCurrentUser } from "@/lib/auth/current-user";
import { IHAM } from "@/lib/learn/iham";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * خانهٔ ایهام.
 *
 * ⚠️ برخلاف `/learn/motammam` این صفحه ورود می‌خواهد: راویِ درس چند جا
 * کاربر را به ==اسم کوچک== صدا می‌زند (`%نام%` در `lib/learn/iham.ts`) و
 * بدون آن، شوخیِ «معنی اسم خودت چیه؟» بی‌معنی می‌شود.
 *
 * و چون خزندهٔ موتور جست‌وجو همیشه به ریدایرکت می‌خورد، `noindex` هم روشن
 * است؛ وگرنه صفحه‌ای را به گوگل معرفی می‌کردیم که هرگز نمی‌تواند ببیندش.
 */

export const metadata = pageMetadata({
  path: "/learn/iham",
  title: "ایهام؛ درسنامهٔ تعاملی",
  description: IHAM.description,
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function IhamPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?returnTo=${encodeURIComponent("/learn/iham")}`);

  // نامِ نمایشی از دو تکه ساخته می‌شود، پس ممکن است فقط `fullName` پر باشد.
  const name = user.firstName?.trim() || user.fullName?.trim().split(/\s+/)[0] || "رفیق";
  return <LessonPlayer lesson={IHAM} name={name} />;
}
