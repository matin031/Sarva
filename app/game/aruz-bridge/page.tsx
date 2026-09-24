import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import AruzBridgeGame from "@/components/UI/aruz-bridge/AruzBridgeGame";
import { AssignmentGone } from "@/components/UI/AssignmentNotice";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadAssignmentForStudent, loadBridgeQuestions } from "@/lib/teacher/assignments";
import type { BridgeAssignment } from "@/components/UI/aruz-bridge/useAruzBridgeGame";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game/aruz-bridge") },
  title: "پلِ وزن — بازی تشخیص وزن",
  description:
    "روی پلِ شیشه‌ای، وزنِ عروضیِ هر واژه را تشخیص بده و روی شیشهٔ امن بپر. اشتباه کنی، شیشه زیرِ پایت می‌شکند.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* ⚠️ تکلیفِ دبیر. شناسهٔ نشانی فقط برچسب است: تکلیف با `student_id`ِ همین
     سشن خوانده می‌شود و سؤال‌ها هم از خودِ تکلیف — نه از نشانی. */
  const assignmentParam = (await searchParams).assignment;
  let assignment: BridgeAssignment | undefined;
  if (assignmentParam !== undefined) {
    const user = await getCurrentUser();
    if (!user) redirect(`/auth?returnTo=${encodeURIComponent("/panel/classes")}`);
    const gate = await loadAssignmentForStudent(user.id, assignmentParam, "aruz_bridge");
    if (gate.state !== "ok") return <AssignmentGone state={gate.state} />;
    assignment = { id: gate.id, title: gate.title, questions: await loadBridgeQuestions(gate.items) };
  }

  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "پلِ وزن", path: "/game/aruz-bridge" },
        ])}
      />
      <GameShell
        /* این بازی تیترِ دیداریِ خودش را دارد؛ پوسته H1 دوم نسازد. */
        ownHeading title="پلِ وزن" dense>
      <AruzBridgeGame assignment={assignment} />
    </GameShell>
    </>
  );
}
