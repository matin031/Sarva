import { NamedLesson, namedLessonMetadata } from "@/components/learn/NamedLesson";
import { MAFOOL } from "@/lib/learn/mafool";

/** خانهٔ مفعول. ورود می‌خواهد؛ توضیحش در `components/learn/NamedLesson.tsx`. */

export const metadata = namedLessonMetadata(MAFOOL);
export const dynamic = "force-dynamic";

export default function Page() {
  return <NamedLesson lesson={MAFOOL} />;
}
