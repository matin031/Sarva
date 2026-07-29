import { redirect } from "next/navigation";
import ExamPanel from "@/components/UI/panel/ExamPanel";
import { getExamAttempts, getPanelUser } from "@/lib/panel/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const attempts = await getExamAttempts(user.id);
  return <ExamPanel attempts={attempts} />;
}
