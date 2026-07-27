import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import PanelSidebar from "@/components/UI/panel/PanelSidebar";

export const metadata: Metadata = {
  title: "پنل کاربری",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  return (
    <div dir="rtl" className="relative z-20 bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_85%_0%,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent_55%)]"
      />
      <div className="relative z-20 container py-8 lg:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-primary">
              پنل کاربری سروا
            </p>
            <h2 className="mt-1 text-lg font-black text-foreground">
              سلام {user.fullName}
            </h2>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            بازگشت به سایت
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <PanelSidebar fullName={user.fullName} email={user.email} />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
