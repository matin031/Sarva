import { redirect } from "next/navigation";
import { getBookmarks, getPanelUser } from "@/lib/panel/queries";
import AllBookmarks from "@/components/UI/panel/AllBookmarks";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  // بدون آرگومان area، هر چهار حوزه برمی‌گردد — همان چیزی که این صفحه
  // می‌خواهد و تا امروز هیچ‌جا استفاده نمی‌شد.
  const bookmarks = await getBookmarks(user.id);

  return (
    <div className="relative z-20 flex flex-col gap-6">
      <div>
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1 text-sm font-semibold text-gold">
          نشان‌شده‌ها
        </span>
        <h1 className="text-xl font-bold">هر چیزی که نشان کرده‌ای</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          سؤال‌ها و واژه‌هایی که برای مرور کنار گذاشته‌ای — از همهٔ بخش‌های سایت، یک‌جا.
        </p>
      </div>

      <AllBookmarks initial={bookmarks} />
    </div>
  );
}
