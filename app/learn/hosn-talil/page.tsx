import { NamedLesson, namedLessonMetadata } from "@/components/learn/NamedLesson";
import { HOSN_TALIL } from "@/lib/learn/hosnTalil";

/** خانهٔ حسن تعلیل. ورود می‌خواهد؛ توضیحش در `components/learn/NamedLesson.tsx`. */

export const metadata = namedLessonMetadata(HOSN_TALIL);
export const dynamic = "force-dynamic";

export default function Page() {
  return <NamedLesson lesson={HOSN_TALIL} />;
}
