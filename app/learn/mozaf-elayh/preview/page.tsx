import { LessonPreview, lessonPreviewMetadata } from "@/components/learn/NamedLesson";
import { MOZAF_ELAYH } from "@/lib/learn/mozafElayh";

/** پیش‌نمایشِ محلیِ درس با اسمِ ساختگی: `/learn/mozaf-elayh/preview?name=امیر`. */

export const metadata = lessonPreviewMetadata(MOZAF_ELAYH);

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LessonPreview lesson={MOZAF_ELAYH} searchParams={searchParams} />;
}
