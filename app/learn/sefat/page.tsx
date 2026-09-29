import { NamedLesson, namedLessonMetadata } from "@/components/learn/NamedLesson";
import { SEFAT } from "@/lib/learn/sefat";

/** خانهٔ صفت. ورود می‌خواهد؛ توضیحش در `components/learn/NamedLesson.tsx`. */

export const metadata = namedLessonMetadata(SEFAT);
export const dynamic = "force-dynamic";

export default function Page() {
  return <NamedLesson lesson={SEFAT} />;
}
