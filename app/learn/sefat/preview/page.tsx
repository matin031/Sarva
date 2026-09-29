import { LessonPreview, lessonPreviewMetadata } from "@/components/learn/NamedLesson";
import { SEFAT } from "@/lib/learn/sefat";

/** پیش‌نمایشِ محلیِ درس با اسمِ ساختگی: `/learn/sefat/preview?name=امیر`. */

export const metadata = lessonPreviewMetadata(SEFAT);

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LessonPreview lesson={SEFAT} searchParams={searchParams} />;
}
