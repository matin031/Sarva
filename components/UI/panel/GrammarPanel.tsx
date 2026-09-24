"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpLeft } from "lucide-react";
import PanelPageHeader from "./PanelPageHeader";
import PracticeSummary from "./PracticeSummary";
import PanelSection from "./PanelSection";
import PanelTrendChart from "./PanelTrendChart";
import styles from "./panel-design.module.css";
import { FocusCard, MasteryLadder, SkillGrid } from "./skill/SkillMap";
import SkillRadar from "./skill/SkillRadar";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";
import { MagicCard } from "@/components/UI/kit/magic/magic-card";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { fa, relativeDay, streak } from "@/lib/panel/format";
import { masteryOf, type SkillTile } from "@/lib/panel/skills";

/** سه بازی، با همان نامِ منبعی که `collectRoleRows` روی ردیف می‌گذارد. */
const GAMES = [
  { source: "جاسوس", title: "جاسوس نقش‌ها", href: "/game/jasoos", note: "نقشِ واژه را در بیت پیدا کن" },
  { source: "مدار دستور", title: "مدار دستور", href: "/game/grammar-circuit", note: "نقش‌ها را در جمله بچین" },
  { source: "شکار نقش‌ها", title: "شکار نقش‌ها", href: "/game/role-hunt", note: "واژهٔ هر نقش را بزن" },
];

export default function GrammarPanel({
  tiles,
  history,
}: {
  tiles: SkillTile[];
  history: { at: string; ok: boolean; source: string }[];
}) {
  const total = history.length;
  const correct = history.filter((h) => h.ok).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const mastered = tiles.filter((t) => masteryOf(t.total, t.correct) === "mastered").length;

  return (
    <div className={styles.pageStack}>
      <PanelPageHeader
        title="دستور زبان"
        description="نقش‌های دستوری در جاسوس، مدار دستور و شکار نقش‌ها."
        tone="rose"
        action={
          <>
            <ShinyButton asChild>
              <Link href="/game/role-hunt">
                شکار نقش‌ها
                <ArrowLeft aria-hidden className="size-4" />
              </Link>
            </ShinyButton>
            <Link href="/game/grammar-circuit" className={styles.heroGhost}>
              مدار دستور
            </Link>
            <Link href="/game/jasoos" className={styles.heroGhost}>
              جاسوس
            </Link>
          </>
        }
      />

      <PracticeSummary
        items={[
          { label: "دقت کل", value: total ? `${fa(accuracy)}٪` : "—" },
          { label: "پاسخ‌ها", value: fa(total) },
          { label: "نقش‌های مسلط", value: `${fa(mastered)} از ${fa(tiles.length)}` },
          { label: "زنجیرهٔ تمرین", value: `${fa(streak(history.map((h) => h.at)))} روز` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <PanelSection title="سطح تسلط" icon="award">
          <div className="mt-4 flex flex-col gap-5">
            <MasteryLadder tiles={tiles} unit="نقش" />
            <FocusCard tiles={tiles} href="/game/role-hunt" cta="تمرین" />
          </div>
        </PanelSection>
        <PanelSection title="نیم‌رخ نقش‌ها" icon="chart" hint="درصد پاسخ درست در هر نقش.">
          <div className="mt-2">
            <SkillRadar tiles={tiles} color="var(--panel-rose)" />
          </div>
        </PanelSection>
      </div>

      <PanelSection
        title="نقش‌ها"
        icon="scale"
        hint="حلقه دقتِ کل است و ده خانهٔ زیرش، ده پاسخ آخر. ضعیف‌ترها اول."
      >
        <SkillGrid tiles={tiles} />
      </PanelSection>

      <PanelSection title="بازی‌ها" icon="clipboard">
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {GAMES.map((g) => {
            const rows = history.filter((h) => h.source === g.source);
            const right = rows.filter((h) => h.ok).length;
            const last = rows.reduce((m, h) => (h.at > m ? h.at : m), "");
            return (
              <li key={g.source} className="list-none">
                <MagicCard className="h-full rounded-2xl">
                  <Link href={g.href} className="group flex h-full items-center gap-3 p-4">
                    <AnimatedCircularProgress
                      value={rows.length ? Math.round((right / rows.length) * 100) : 0}
                      ready={rows.length > 0}
                      glyph="▶"
                      className="size-14"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{g.title}</p>
                      <p className="panel-num mt-0.5 text-[12px] text-muted-foreground">
                        {rows.length ? `${fa(rows.length)} پاسخ · ${relativeDay(last)}` : g.note}
                      </p>
                    </div>
                    <ArrowUpLeft
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                </MagicCard>
              </li>
            );
          })}
        </ul>
      </PanelSection>

      <PanelSection title="روند تمرین" icon="chart">
        <PanelTrendChart history={history} />
      </PanelSection>
    </div>
  );
}
