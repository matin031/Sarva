import LiteraryTimeline from "@/components/literary-timeline/LiteraryTimeline";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  path: "/timeline",
  title: "خط زمان ادبیات فارسی",
  description: "سبک‌ها، شاعران و آثار ادبیات فارسی از فارسی باستان تا امروز، بر اساس کتاب علوم و فنون ادبی دهم، یازدهم و دوازدهم.",
});

export default function TimelinePage() {
  return <LiteraryTimeline />;
}
