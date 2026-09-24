import LessonPlayer from "@/components/learn/LessonPlayer";
import { MOTAMMAM } from "@/lib/learn/motammam";
import { catalogMetadata } from "@/lib/seo/metadata";

export const metadata = catalogMetadata("/learn/motammam");

export default function MotammamPage() {
  return <LessonPlayer lesson={MOTAMMAM} />;
}
