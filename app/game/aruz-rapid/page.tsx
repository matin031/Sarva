import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import RapidAruzGame from "@/components/UI/aruz-rapid/RapidAruzGame";
import { loadRapidAruzQuestions } from "@/lib/aruz-rapid/content";
import { DEFAULT_RAPID_ARUZ_CONFIG } from "@/lib/aruz-rapid/config";
import { redirect } from "next/navigation";
import { AssignmentGone } from "@/components/UI/AssignmentNotice";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadAssignmentForStudent } from "@/lib/teacher/assignments";
import { shuffle } from "@/lib/teacher/assignment-rules";

export const metadata: Metadata = catalogMetadata("/game/aruz-rapid");

/*
 * این بازی عمداً داخلِ GameShell نیست.
 *
 * GameShell یک لینکِ بازگشت بالای صفحه می‌گذارد و صفحه را در جریانِ عادیِ
 * سند نگه می‌دارد؛ ولی این بازی روی موبایل باید یک صفحهٔ بازیِ واقعی در
 * 100dvh و بدونِ هیچ اسکرولی باشد. راهِ خروج و تأییدش داخلِ خودِ بازی است
 * (نوارِ بالای بازی، و لینکِ بازگشت در صفحهٔ آغاز و نتیجه).
 */
// مصراع‌ها از پنل مدیریت می‌آیند؛ یک صفحهٔ کش‌شده یعنی مدیری که تغییرش را
// نمی‌بیند.
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { questions } = await loadRapidAruzQuestions();

  /* ⚠️ تکلیفِ دبیر: مصراع‌ها از خودِ تکلیف می‌آیند (با `student_id`ِ همین
     سشن)، نه از نشانی. همهٔ مصراع‌ها، یک‌جا، در یک نشست. */
  const assignmentParam = (await searchParams).assignment;
  if (assignmentParam !== undefined) {
    const user = await getCurrentUser();
    if (!user) redirect(`/auth?returnTo=${encodeURIComponent("/panel/classes")}`);
    const gate = await loadAssignmentForStudent(user.id, assignmentParam, "aruz_rapid");
    if (gate.state !== "ok") return <AssignmentGone state={gate.state} />;
    const byId = new Map(questions.map((q) => [q.id, q]));
    const picked = gate.items.flatMap((id) => byId.get(id) ?? []);
    /* مصراعی که بعد از ساختِ تکلیف از بانک برداشته شده، دیگر بازی‌شدنی
       نیست؛ تکلیفی که کامل نمی‌شود بدتر از پیامِ صادق است. */
    if (picked.length !== gate.items.length) return <AssignmentGone state="missing" />;
    return (
      <RapidAruzGame
        questions={picked}
        config={{ ...DEFAULT_RAPID_ARUZ_CONFIG, questionsPerSession: picked.length }}
        assignment={{ id: gate.id, title: gate.title }}
      />
    );
  }

  /* این بازی GameShell ندارد (توضیح بالا)، پس مسیرِ صفحه را خودش اعلام
     می‌کند تا مثلِ بقیهٔ بازی‌ها breadcrumb داشته باشد. */
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "تقطیعِ سریع", path: "/game/aruz-rapid" },
        ])}
      />
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/aruz-rapid"])} />
      {/* بانک صدها مصراع دارد و هر نشست چندتا؛ فرستادنِ همه به مرورگر فقط
          سنگینی است. صفحه force-dynamic است، پس هر بار نمونهٔ تازه‌ای می‌رسد. */}
      <RapidAruzGame questions={shuffle(questions).slice(0, 40)} />
    </>
  );
}
