import { LessonPreview, lessonPreviewMetadata } from "@/components/learn/NamedLesson";
import { PARADOX } from "@/lib/learn/paradox";

/** پیش‌نمایشِ محلیِ درس با اسمِ ساختگی: `/learn/paradox/preview?name=امیر`. */

export const metadata = lessonPreviewMetadata(PARADOX);

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LessonPreview lesson={PARADOX} searchParams={searchParams} />;
}
