import { NamedLesson, namedLessonMetadata } from "@/components/learn/NamedLesson";
import { MOZAF_ELAYH } from "@/lib/learn/mozafElayh";

/** خانهٔ مضاف‌الیه. ورود می‌خواهد؛ توضیحش در `components/learn/NamedLesson.tsx`. */

export const metadata = namedLessonMetadata(MOZAF_ELAYH);
export const dynamic = "force-dynamic";

export default function Page() {
  return <NamedLesson lesson={MOZAF_ELAYH} />;
}
