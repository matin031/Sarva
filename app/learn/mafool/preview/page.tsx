import { LessonPreview, lessonPreviewMetadata } from "@/components/learn/NamedLesson";
import { MAFOOL } from "@/lib/learn/mafool";

/** پیش‌نمایشِ محلیِ درس با اسمِ ساختگی: `/learn/mafool/preview?name=امیر`. */

export const metadata = lessonPreviewMetadata(MAFOOL);

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LessonPreview lesson={MAFOOL} searchParams={searchParams} />;
}
