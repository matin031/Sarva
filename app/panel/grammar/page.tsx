import { redirect } from "next/navigation";
import GrammarPanel from "@/components/UI/panel/GrammarPanel";
import { getPanelUser } from "@/lib/panel/queries";
import { collectRoleRows } from "@/lib/plus/analysis";
import { GRAMMAR_ROLE_CATALOG } from "@/lib/grammar-circuit/roles";
import { toSkillTiles } from "@/lib/panel/skills";

export const dynamic = "force-dynamic";

/**
 * «دستور زبان» — یک صفحه برای هر سه بازیِ نقشِ دستوری.
 *
 * ⚠️ سطر «نقش» است و نه بازی (همان قاعدهٔ `collectRoleRows`): «مسند» در
 * جاسوس و «مسند» در مدار دستور یک مهارت‌اند. بازی فقط منبع است و داخلِ
 * کاشی دیده می‌شود.
 */
export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const rows = (await collectRoleRows(user.id)).map((r) => ({ ...r, at: r.at ?? "" }));

  return (
    <GrammarPanel
      tiles={toSkillTiles(rows, GRAMMAR_ROLE_CATALOG)}
      history={rows.map((r) => ({ at: r.at, ok: r.correct, source: r.source }))}
    />
  );
}
