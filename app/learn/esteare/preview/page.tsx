import { LessonPreview, lessonPreviewMetadata } from "@/components/learn/NamedLesson";
import { ESTEARE } from "@/lib/learn/esteare";

/** پیش‌نمایشِ محلیِ درس با اسمِ ساختگی: `/learn/esteare/preview?name=امیر`. */

export const metadata = lessonPreviewMetadata(ESTEARE);

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LessonPreview lesson={ESTEARE} searchParams={searchParams} />;
}
