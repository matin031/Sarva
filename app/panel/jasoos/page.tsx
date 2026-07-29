import { redirect } from "next/navigation";
import JasoosPanel from "@/components/UI/panel/JasoosPanel";
import { getJasoosAnswers, getPanelUser } from "@/lib/panel/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const answers = await getJasoosAnswers(user.id);
  return <JasoosPanel answers={answers} />;
}
