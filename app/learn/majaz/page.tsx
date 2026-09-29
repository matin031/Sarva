import { NamedLesson, namedLessonMetadata } from "@/components/learn/NamedLesson";
import { MAJAZ } from "@/lib/learn/majaz";

/** خانهٔ مجاز. ورود می‌خواهد؛ توضیحش در `components/learn/NamedLesson.tsx`. */

export const metadata = namedLessonMetadata(MAJAZ);
export const dynamic = "force-dynamic";

export default function Page() {
  return <NamedLesson lesson={MAJAZ} />;
}
