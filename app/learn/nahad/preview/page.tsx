import { LessonPreview, lessonPreviewMetadata } from "@/components/learn/NamedLesson";
import { NAHAD } from "@/lib/learn/nahad";

/** پیش‌نمایشِ محلیِ درس با اسمِ ساختگی: `/learn/nahad/preview?name=امیر`. */

export const metadata = lessonPreviewMetadata(NAHAD);

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LessonPreview lesson={NAHAD} searchParams={searchParams} />;
}
