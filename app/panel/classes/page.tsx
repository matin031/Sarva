import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import StudentClasses from "@/components/UI/panel/StudentClasses";
import { listStudentClasses } from "@/lib/teacher/classes";

/**
 * کلاس‌های من — سمتِ دانش‌آموز.
 *
 * ⚠️ مسیرِ جدا از `/panel/teacher` و نه یک تبِ داخلِ آن: این دو صفحه دو
 * مخاطبِ متفاوت دارند و هیچ‌کدام چیزی از آن یکی لازم ندارند. دبیر هم
 * می‌تواند عضوِ کلاسِ دبیرِ دیگری باشد (مثلاً در یک دورهٔ ضمن خدمت)، پس این
 * صفحه برای او هم کار می‌کند.
 */

export const metadata: Metadata = {
  title: "کلاس‌های من",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const classes = await listStudentClasses(user.id);

  return (
    <>
      <PanelPageHeader
        title="کلاس‌های من"
        description="با کدی که دبیرت می‌دهد وارد کلاس شو؛ بعد از آن، عملکردت را می‌بیند."
        eyebrow="کلاس"
        tone="mint"
      />

      <StudentClasses initial={classes} />
    </>
  );
}
