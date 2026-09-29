import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import LessonPlayer from "@/components/learn/LessonPlayer";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { Lesson } from "@/lib/learn/types";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * صفحهٔ درس‌هایی که شاگرد را به ==اسم کوچک== صدا می‌زنند (`needsName`).
 *
 * ⚠️ ورود می‌خواهد، چون بدون اسم شوخی‌هایی مثلِ «%نام%، بیا!» بی‌معنی
 * می‌شوند. و چون خزندهٔ موتور جست‌وجو همیشه به ریدایرکت می‌خورد، `noindex`
 * هم روشن است؛ وگرنه صفحه‌ای را به گوگل معرفی می‌کردیم که هرگز نمی‌بیندش.
 *
 * `/learn/iham` پیش از این کامپوننت نوشته شده و همین کار را خودش می‌کند.
 */
export const namedLessonMetadata = (lesson: Lesson): Metadata => pageMetadata({
  path: `/learn/${lesson.slug}`,
  title: `${lesson.title}؛ درسنامهٔ تعاملی`,
  description: lesson.description,
  noindex: true,
});

export async function NamedLesson({ lesson }: { lesson: Lesson }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?returnTo=${encodeURIComponent(`/learn/${lesson.slug}`)}`);
  // نامِ نمایشی از دو تکه ساخته می‌شود، پس ممکن است فقط `fullName` پر باشد.
  const name = user.firstName?.trim() || user.fullName?.trim().split(/\s+/)[0] || "رفیق";
  return <LessonPlayer lesson={lesson} name={name} />;
}

/** پیش‌نمایشِ همان درس با اسمِ ساختگی — فقط در محیطِ توسعه (در production
 *  ۴۰۴ می‌دهد). نه دیتابیس می‌خواند، نه گیتِ صفحهٔ اصلی را دور می‌زند.
 *  اسم از نشانی می‌آید: `/learn/<slug>/preview?name=امیر`.
 *
 *  ⚠️ پیشرفتِ درس در `localStorage` بینِ این مسیر و مسیرِ اصلی مشترک است. */
export const lessonPreviewMetadata = (lesson: Lesson): Metadata => ({
  title: `پیش‌نمایش درسنامهٔ ${lesson.title}`,
  robots: { index: false, follow: false },
});

export async function LessonPreview({ lesson, searchParams }: { lesson: Lesson; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const raw = (await searchParams).name;
  const asked = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  // بلندتر از این، حباب‌های گفت‌وگو را به هم می‌ریزد.
  const name = asked && asked.length <= 20 ? asked : "رفیق";
  return <LessonPlayer lesson={lesson} name={name} />;
}
