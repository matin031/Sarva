"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { MagicCard } from "@/components/UI/kit/magic/magic-card";
import { ShineBorder } from "@/components/UI/kit/magic/shine-border";
import { NumberTicker } from "@/components/UI/kit/magic/number-ticker";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";
import { fa } from "@/lib/panel/format";
import { MASTERY_STEPS, RECENT, masteryOf, type SkillTile } from "@/lib/panel/skills";

/**
 * نقشهٔ تسلط — جای نوارهای درازِ «۱۲ از ۲۰».
 *
 * هر مهارت یک کاشی است: حلقهٔ دقت (Magic UI)، سطحِ تسلط، و ده خانهٔ
 * آخرین پاسخ‌ها. آن ده خانه چیزی را می‌گوید که نوار نمی‌گفت: «الان» چطوری،
 * نه میانگینِ همهٔ تاریخ. مهارتِ تمرین‌نشده هم کاشی دارد، کم‌رنگ و با
 * توضیحِ کوتاهش، تا جاهای خالیِ نقشه دیده شوند.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const STEP = Object.fromEntries(MASTERY_STEPS.map((s) => [s.key, s]));

const pct = (t: { total: number; correct: number }) => (t.total ? Math.round((t.correct / t.total) * 100) : 0);

/** ده خانهٔ آخرین پاسخ‌ها — قدیمی راست، تازه چپ. */
export function RecentDots({ recent, className = "" }: { recent: boolean[]; className?: string }) {
  const slots = [...Array(RECENT - recent.length).fill(null), ...recent] as (boolean | null)[];
  const right = recent.filter(Boolean).length;
  return (
    <div
      role="img"
      aria-label={recent.length ? `از ${recent.length} پاسخ آخر، ${right} درست` : "هنوز پاسخی نیست"}
      className={`flex gap-1 ${className}`}
    >
      {slots.map((ok, i) => (
        <motion.span
          key={i}
          initial={{ scaleY: 0.2, opacity: 0 }}
          whileInView={{ scaleY: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.035, ease: EASE }}
          className="h-2 flex-1 rounded-full"
          style={{
            background:
              ok === null
                ? "color-mix(in oklch, var(--border) 70%, transparent)"
                : ok
                  ? "var(--primary)"
                  : "color-mix(in oklch, var(--destructive) 75%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

export function MasteryChip({ total, correct }: { total: number; correct: number }) {
  const step = STEP[masteryOf(total, correct)];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color: step.key === "none" ? "var(--muted-foreground)" : step.color,
        background: `color-mix(in oklch, ${step.key === "none" ? "var(--muted-foreground)" : step.color} 12%, transparent)`,
      }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: "currentColor" }} />
      {step.label}
    </span>
  );
}

/**
 * یک سطرِ فشرده: حلقه، نام، برچسبِ وضعیت و یک خط توضیح. برای فهرست‌هایی که
 * جای کاشی ندارند (نیم‌ستون‌های «برنامهٔ من»).
 */
export function RingRow({
  label,
  percent,
  color,
  chip,
  sub,
  ready = true,
}: {
  label: string;
  percent: number;
  color: string;
  chip?: string;
  sub?: string;
  ready?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
      <AnimatedCircularProgress
        value={percent}
        ready={ready}
        color={[color, `color-mix(in oklch, ${color} 60%, var(--gold))`]}
        label={`${label}: ${percent} درصد`}
        className="size-11"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold">{fa(label)}</span>
          {chip && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ color, background: `color-mix(in oklch, ${color} 12%, transparent)` }}
            >
              {chip}
            </span>
          )}
        </div>
        {sub && <p className="panel-num mt-0.5 truncate text-[11.5px] text-muted-foreground">{fa(sub)}</p>}
      </div>
    </li>
  );
}

export function SkillTileCard({ tile, index = 0 }: { tile: SkillTile; index?: number }) {
  const has = tile.total > 0;
  const level = masteryOf(tile.total, tile.correct);
  const ringColor = tile.color ?? (level === "none" ? "var(--muted-foreground)" : STEP[level].color);
  // چند منبع ← سهمِ هر بازی؛ وگرنه توضیحِ کوتاهِ خودِ مهارت (اگر هست).
  const note =
    tile.sources.length > 1
      ? tile.sources.map((s) => `${s.source}: ${fa(s.correct)}/${fa(s.total)}`).join(" · ")
      : (tile.hint ?? "");

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, delay: Math.min(index, 9) * 0.035, ease: EASE }}
      className="list-none"
    >
      <MagicCard
        className={`h-full rounded-2xl p-4 ${has ? "" : "opacity-70"}`}
        gradientFrom={tile.color ?? "var(--primary)"}
        gradientTo={tile.color ? `color-mix(in oklch, ${tile.color} 45%, var(--gold))` : "var(--gold)"}
      >
        <div className="flex items-center gap-3">
          <AnimatedCircularProgress
            value={pct(tile)}
            ready={has}
            color={tile.color ? tile.color : [ringColor, `color-mix(in oklch, ${ringColor} 60%, var(--gold))`]}
            label={has ? `${tile.label}: ${pct(tile)} درصد درست` : `${tile.label}: هنوز تمرین نشده`}
            className="size-14"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold">{fa(tile.label)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <MasteryChip total={tile.total} correct={tile.correct} />
              {has && (
                <span className="panel-num text-[11.5px] text-muted-foreground">
                  {fa(tile.correct)} از {fa(tile.total)}
                </span>
              )}
            </div>
          </div>
        </div>

        {tile.recent.length > 0 && <RecentDots recent={tile.recent} className="mt-4" />}

        {note && (
          <p className="panel-num mt-2.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">{note}</p>
        )}
      </MagicCard>
    </motion.li>
  );
}

/**
 * ⚠️ مهارتِ تمرین‌نشده کاشیِ کامل نمی‌گیرد، یک برچسبِ کوچک می‌گیرد. نه
 * کاشیِ خالی کنارِ هم (نقشِ دستوری سیزده‌تاست) صفحه را پر از «—» می‌کرد و
 * چیزی را که واقعاً تمرین شده پایین می‌برد.
 */
export function SkillGrid({ tiles }: { tiles: SkillTile[] }) {
  const played = tiles.filter((t) => t.total > 0);
  const untouched = tiles.filter((t) => t.total === 0);
  return (
    <>
      {played.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {played.map((t, i) => (
            <SkillTileCard key={t.key} tile={t} index={i} />
          ))}
        </ul>
      )}
      {untouched.length > 0 && (
        <div className="mt-5">
          <p className="text-[12.5px] text-muted-foreground">هنوز تمرین نشده</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {untouched.map((t) => (
              <li
                key={t.key}
                title={t.hint}
                className="flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-1.5 text-[13px]"
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: t.color ?? "color-mix(in oklch, var(--muted-foreground) 45%, transparent)" }}
                />
                {fa(t.label)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * چند مهارت در هر سطح — یک نوارِ چندتکه و شمارِ هر تکه.
 * همان خلاصه‌ای که Khan Academy بالای هر درس می‌گذارد.
 */
export function MasteryLadder({ tiles, unit }: { tiles: SkillTile[]; unit: string }) {
  const counts = MASTERY_STEPS.map((s) => ({
    ...s,
    n: tiles.filter((t) => masteryOf(t.total, t.correct) === s.key).length,
  }));
  const mastered = counts[0].n;

  return (
    <div>
      <p className="text-[13px] text-muted-foreground">
        <span className="panel-num text-3xl font-extrabold text-foreground">
          <NumberTicker value={mastered} />
        </span>
        <span className="mx-1.5">از</span>
        <span className="panel-num font-bold text-foreground">{fa(tiles.length)}</span> {unit} در سطح «مسلط»
      </p>

      <div className="mt-4 flex h-3 w-full gap-1 overflow-hidden rounded-full" aria-hidden>
        {counts
          .filter((c) => c.n > 0)
          .map((c, i) => (
            <motion.span
              key={c.key}
              initial={{ flexGrow: 0 }}
              whileInView={{ flexGrow: c.n }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: EASE }}
              className="h-full min-w-2 rounded-full"
              style={{ background: c.color, flexBasis: 0 }}
            />
          ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        {counts.map((c) => (
          <li key={c.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: c.color }} />
            {c.label}
            <span className="panel-num font-bold text-foreground">{fa(c.n)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** ضعیف‌ترین مهارتِ سنجیده‌شده، با دکمهٔ تمرین. اگر ضعفی نیست چیزی نمی‌کشد. */
export function FocusCard({
  tiles,
  href,
  cta,
}: {
  tiles: SkillTile[];
  href: string | ((tile: SkillTile) => string);
  cta: string;
}) {
  const weak = tiles.find((t) => {
    const m = masteryOf(t.total, t.correct);
    return m === "weak" || m === "learning";
  });
  if (!weak) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4">
      <ShineBorder borderWidth={1.5} duration={10} shineColor={["var(--primary)", "var(--gold)"]} />
      <p className="text-[12px] text-muted-foreground">اولویت تمرین</p>
      <div className="mt-2 flex items-center gap-3">
        <AnimatedCircularProgress
          value={pct(weak)}
          color={weak.color ?? [STEP[masteryOf(weak.total, weak.correct)].color, "var(--gold)"]}
          className="size-12"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{fa(weak.label)}</p>
          <p className="panel-num text-[12px] text-muted-foreground">
            {fa(weak.correct)} از {fa(weak.total)} درست
          </p>
        </div>
        <ShinyButton asChild>
          <Link href={typeof href === "string" ? href : href(weak)}>
            {cta}
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        </ShinyButton>
      </div>
    </div>
  );
}
