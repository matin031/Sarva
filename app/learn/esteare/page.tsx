import { NamedLesson, namedLessonMetadata } from "@/components/learn/NamedLesson";
import { ESTEARE } from "@/lib/learn/esteare";

/** خانهٔ استعاره. ورود می‌خواهد؛ توضیحش در `components/learn/NamedLesson.tsx`. */

export const metadata = namedLessonMetadata(ESTEARE);
export const dynamic = "force-dynamic";

export default function Page() {
  return <NamedLesson lesson={ESTEARE} />;
}
