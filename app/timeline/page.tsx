import LiteraryTimeline from "@/components/literary-timeline/LiteraryTimeline";
import { catalogMetadata } from "@/lib/seo/metadata";

export const metadata = catalogMetadata("/timeline");

export default function TimelinePage() {
  return <LiteraryTimeline />;
}
