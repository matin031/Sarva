import Link from "next/link";
import { redirect } from "next/navigation";
import { getBookmarks, getPanelUser } from "@/lib/panel/queries";
import { EmptyState, PanelHeader } from "@/components/UI/panel/primitives";
import BookmarksClient from "@/components/UI/panel/BookmarksClient";

export default async function BookmarksPage() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const bookmarks = await getBookmarks(user.id);

  return (
    <>
      <PanelHeader title="نشان‌شده‌ها" />

      {bookmarks.length === 0 ? (
        <EmptyState
          title="هنوز چیزی نشان نکرده‌ای"
          body="هرجا سؤالی دیدی که می‌خواهی بعداً مرورش کنی، دکمهٔ «نشان‌کردن» را بزن؛ همه‌شان اینجا جمع می‌شوند."
          cta={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/game/vocab"
                className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90"
              >
                واژه‌یاب
              </Link>
              <Link
                href="/quiz"
                className="rounded-xl border border-border bg-card px-6 py-2.5 font-bold text-foreground transition-colors hover:border-primary/40"
              >
                آزمون عروض
              </Link>
            </div>
          }
        />
      ) : (
        <BookmarksClient bookmarks={bookmarks} />
      )}
    </>
  );
}
