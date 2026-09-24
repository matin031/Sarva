import LessonPlayer from "@/components/learn/LessonPlayer";
import { TASHBIH } from "@/lib/learn/tashbih";
import { pageMetadata } from "@/lib/seo/metadata";

/** خانهٔ تشبیه.
 *
 *  ⚠️ برخلاف `/learn/iham` ورود نمی‌خواهد: متنِ این درس `%نام%` ندارد، پس
 *  گیت فقط بازدید را کم می‌کرد و چیزی به درس اضافه نمی‌کرد. */

export const metadata = pageMetadata({
  path: "/learn/tashbih",
  title: "تشبیه؛ درسنامهٔ تعاملی",
  description: TASHBIH.description,
});

export default function TashbihPage() {
  return <LessonPlayer lesson={TASHBIH} />;
}
