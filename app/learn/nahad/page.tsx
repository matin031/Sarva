import { NamedLesson, namedLessonMetadata } from "@/components/learn/NamedLesson";
import { NAHAD } from "@/lib/learn/nahad";

/** خانهٔ نهاد. ورود می‌خواهد؛ توضیحش در `components/learn/NamedLesson.tsx`. */

export const metadata = namedLessonMetadata(NAHAD);
export const dynamic = "force-dynamic";

export default function Page() {
  return <NamedLesson lesson={NAHAD} />;
}
