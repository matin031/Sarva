import { NamedLesson, namedLessonMetadata } from "@/components/learn/NamedLesson";
import { PARADOX } from "@/lib/learn/paradox";

/** خانهٔ متناقض‌نما. ورود می‌خواهد؛ توضیحش در `components/learn/NamedLesson.tsx`. */

export const metadata = namedLessonMetadata(PARADOX);
export const dynamic = "force-dynamic";

export default function Page() {
  return <NamedLesson lesson={PARADOX} />;
}
