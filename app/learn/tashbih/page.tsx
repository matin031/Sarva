import LessonPlayer from "@/components/learn/LessonPlayer";
import { TASHBIH } from "@/lib/learn/tashbih";
import { catalogMetadata } from "@/lib/seo/metadata";

/** خانهٔ تشبیه.
 *
 *  ⚠️ برخلاف `/learn/iham` ورود نمی‌خواهد: متنِ این درس `%نام%` ندارد، پس
 *  گیت فقط بازدید را کم می‌کرد و چیزی به درس اضافه نمی‌کرد. */

export const metadata = catalogMetadata("/learn/tashbih");

export default function TashbihPage() {
  return <LessonPlayer lesson={TASHBIH} />;
}
