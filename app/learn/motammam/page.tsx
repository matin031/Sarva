import LessonPlayer from "@/components/learn/LessonPlayer";
import { MOTAMMAM } from "@/lib/learn/motammam";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  path: "/learn/motammam",
  title: "متمم؛ درسنامهٔ تعاملی",
  description: MOTAMMAM.description,
});

export default function MotammamPage() {
  return <LessonPlayer lesson={MOTAMMAM} />;
}
