import { LessonPreview, lessonPreviewMetadata } from "@/components/learn/NamedLesson";
import { MAJAZ } from "@/lib/learn/majaz";

/** پیش‌نمایشِ محلیِ درس با اسمِ ساختگی: `/learn/majaz/preview?name=امیر`. */

export const metadata = lessonPreviewMetadata(MAJAZ);

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LessonPreview lesson={MAJAZ} searchParams={searchParams} />;
}
