import { redirect } from "next/navigation";
import HomePanel from "@/components/UI/panel/HomePanel";
import { getPanelOverview, getPanelUser } from "@/lib/panel/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const overview = await getPanelOverview(user.id);
  return (
    <HomePanel
      name={user.fullName}
      memberSince={user.createdAt}
      overview={overview}
    />
  );
}
