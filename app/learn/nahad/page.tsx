import { redirect } from "next/navigation";
import LessonPlayer from "@/components/learn/LessonPlayer";
import { getCurrentUser } from "@/lib/auth/current-user";
import { NAHAD } from "@/lib/learn/nahad";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * خانهٔ نهاد.
 *
 * ⚠️ مثلِ `/learn/iham` ورود می‌خواهد: راویِ درس کاربر را به ==اسم کوچک== صدا
 * می‌زند (`%نام%` در `lib/learn/nahad.ts`) — از جمله در مثالِ منادا،
 * «%نام%، بیا!» — و بدون اسم، همان مثال بی‌مزه می‌شود.
 *
 * و چون خزندهٔ موتور جست‌وجو همیشه به ریدایرکت می‌خورد، `noindex` هم روشن است.
 */

export const metadata = pageMetadata({
  path: "/learn/nahad",
  title: "نهاد؛ درسنامهٔ تعاملی",
  description: NAHAD.description,
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function NahadPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?returnTo=${encodeURIComponent("/learn/nahad")}`);

  // نامِ نمایشی از دو تکه ساخته می‌شود، پس ممکن است فقط `fullName` پر باشد.
  const name = user.firstName?.trim() || user.fullName?.trim().split(/\s+/)[0] || "رفیق";
  return <LessonPlayer lesson={NAHAD} name={name} />;
}
