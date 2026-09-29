import { LessonPreview, lessonPreviewMetadata } from "@/components/learn/NamedLesson";
import { HOSN_TALIL } from "@/lib/learn/hosnTalil";

/** پیش‌نمایشِ محلیِ درس با اسمِ ساختگی: `/learn/hosn-talil/preview?name=امیر`. */

export const metadata = lessonPreviewMetadata(HOSN_TALIL);

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LessonPreview lesson={HOSN_TALIL} searchParams={searchParams} />;
}
