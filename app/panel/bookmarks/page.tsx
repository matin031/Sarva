import { redirect } from "next/navigation";
import { getBookmarks, getPanelUser } from "@/lib/panel/queries";
import AllBookmarks from "@/components/UI/panel/AllBookmarks";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  // بدون آرگومان area، هر چهار حوزه برمی‌گردد — همان چیزی که این صفحه
  // می‌خواهد و تا امروز هیچ‌جا استفاده نمی‌شد.
  const bookmarks = await getBookmarks(user.id);

  return (
    <div className="relative z-20 flex flex-col gap-6">
      <PanelPageHeader title="گنجینهٔ کوچک تو" description="بیت‌ها، واژه‌ها و سؤال‌هایی که برای دوباره دیدن کنار گذاشته‌ای." eyebrow="نشان‌شده‌ها" tone="gold" />

      <AllBookmarks initial={bookmarks} />
    </div>
  );
}
