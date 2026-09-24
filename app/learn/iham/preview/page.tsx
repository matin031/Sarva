import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LessonPlayer from "@/components/learn/LessonPlayer";
import { IHAM } from "@/lib/learn/iham";

/**
 * پیش‌نمایشِ درسنامهٔ ایهام — فقط برای بررسیِ محلی.
 *
 * ⚠️ در production اصلاً وجود ندارد (۴۰۴ می‌دهد)، مثل `/plus/preview`.
 *
 * چرا لازم است: خودِ `/learn/iham` ورود می‌خواهد، چون درس کاربر را به اسم
 * صدا می‌زند. یعنی برای یک نگاهِ ساده به صفحه باید دیتابیس بالا باشد و یک
 * کاربرِ واقعی ساخته شود. این مسیر همان صفحه را با یک اسمِ ساختگی نشان
 * می‌دهد: نه دیتابیس می‌خواند، نه احراز هویت را دور می‌زند — گیتِ صفحهٔ
 * اصلی دست‌نخورده سر جایش است.
 *
 * اسم را از نشانی بگیر تا `%نام%`ها را با اسمِ خودت ببینی:
 * `/learn/iham/preview?name=امیر`
 *
 * ⚠️ پیشرفتِ درس در `localStorage` با کلیدِ `sarva-learn-iham-v1` ذخیره
 * می‌شود و بینِ این مسیر و مسیرِ اصلی مشترک است — یعنی اگر اینجا تا وسطِ
 * درس بروی، صفحهٔ اصلی هم از همان‌جا ادامه می‌دهد. برای شروعِ دوباره،
 * دکمهٔ «از اول» در نوارِ بالا.
 */

export const metadata: Metadata = {
  title: "پیش‌نمایش درسنامهٔ ایهام",
  robots: { index: false, follow: false },
};

export default async function IhamPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const raw = (await searchParams).name;
  const asked = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  // بلندتر از این، حباب‌های گفت‌وگو را به هم می‌ریزد.
  const name = asked && asked.length <= 20 ? asked : "رفیق";

  return <LessonPlayer lesson={IHAM} name={name} />;
}
