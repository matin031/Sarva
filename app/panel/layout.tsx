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
    <div dir="rtl" className="bg-background">
      <div className="container py-10 lg:py-14">
        <div className="mb-10 flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-6">
          <h2 className="text-sm text-muted-foreground">
            پنل کاربری —{" "}
            <span className="font-bold text-foreground">{user.fullName}</span>
          </h2>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            بازگشت به سایت
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-[11rem_1fr]">
          <PanelSidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
