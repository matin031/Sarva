import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { redirect } from "next/navigation";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import AruzBridgeGame from "@/components/UI/aruz-bridge/AruzBridgeGame";
import { AssignmentGone } from "@/components/UI/AssignmentNotice";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadAssignmentForStudent, loadBridgeQuestions } from "@/lib/teacher/assignments";
import type { BridgeAssignment } from "@/components/UI/aruz-bridge/useAruzBridgeGame";

export const metadata: Metadata = catalogMetadata("/game/aruz-bridge");

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
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/aruz-bridge"])} />
      <GameShell
        /* این بازی تیترِ دیداریِ خودش را دارد؛ پوسته H1 دوم نسازد. */
        ownHeading title="پلِ وزن" dense>
      <AruzBridgeGame assignment={assignment} />
    </GameShell>
    </>
  );
}
