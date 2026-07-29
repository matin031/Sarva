"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import PanelSection from "@/components/UI/panel/PanelSection";
import PanelTrendChart from "@/components/UI/panel/PanelTrendChart";
import StatRing from "@/components/UI/panel/StatRing";
import { groupIntoSessions, jalali, relativeDay, scoreColor, streak } from "@/lib/panel/format";
import type { JasoosAnswer } from "@/lib/panel/types";

const EASE = [0.16, 1, 0.3, 1] as const;

/** بازی جاسوس in the panel: how sharp the eye is per نقش, and every past round
 *  replayed with the role that was picked next to the role that was right. */
export default function JasoosPanel({
  answers,
}: {
  answers: JasoosAnswer[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const sessions = useMemo(
    () => groupIntoSessions(answers, (a) => a.answeredAt),
    [answers],
  );

  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const best = sessions.reduce((m, s) => {
    const p = Math.round((s.filter((a) => a.isCorrect).length / s.length) * 100);
    return Math.max(m, p);
  }, 0);

  /** Accuracy per نقش — worst first, because that is the row worth reading. */
  const roles = useMemo(() => {
    const m = new Map<string, { total: number; correct: number }>();
    for (const a of answers) {
      if (!a.correctRole) continue;
      const b = m.get(a.correctRole) ?? { total: 0, correct: 0 };
      b.total += 1;
      if (a.isCorrect) b.correct += 1;
      m.set(a.correctRole, b);
    }
    return [...m.entries()]
      .map(([role, b]) => ({ role, ...b }))
      .sort((x, y) => x.correct / x.total - y.correct / y.total);
  }, [answers]);

  const categories = useMemo(() => {
    const m = new Map<string, { total: number; correct: number }>();
    for (const a of answers) {
      if (!a.category) continue;
      const b = m.get(a.category) ?? { total: 0, correct: 0 };
      b.total += 1;
      if (a.isCorrect) b.correct += 1;
      m.set(a.category, b);
    }
    return [...m.entries()].map(([category, b]) => ({ category, ...b }));
  }, [answers]);

  return (
    <div>
      <span
        className="mb-5 inline-flex items-center gap-2
       rounded-full border border-primary/30 bg-primary/10
        px-4 py-1 text-sm font-semibold text-primary"
      >
        بازی جاسوس
      </span>

      <div className=" glass rounded-xl p-4 sm:p-6">
        <div className=" mt-2 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-7">
          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <StatRing percent={accuracy} />
            <span className=" text-base sm:text-lg">دقت در یافتنِ جاسوس</span>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className=" size-9 shrink-0 sm:size-10"
            >
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path
                fillRule="evenodd"
                d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z"
                clipRule="evenodd"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              <span className=" text-2xl text-gold sm:text-3xl">
                {toFa(total)}
              </span>{" "}
              پرونده بررسی کردی
            </div>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <StatRing percent={best} />
            <span className=" text-base sm:text-lg">بهترین دست</span>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className=" size-9 shrink-0 sm:size-10"
            >
              <path
                fillRule="evenodd"
                d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248Z"
                clipRule="evenodd"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              <span className=" text-2xl text-gold sm:text-3xl">
                {toFa(streak(answers.map((a) => a.answeredAt)))}
              </span>{" "}
              روز زنجیرۀ تلاش
            </div>
          </div>
        </div>
      </div>

      <PanelSection title="روند پیشرفت" icon="chart">
        <PanelTrendChart
          history={answers.map((a) => ({ at: a.answeredAt, ok: a.isCorrect }))}
        />
      </PanelSection>

      <PanelSection
        title="نقش‌ها"
        icon="scale"
        hint="هر نقشی که در پرونده‌ها با آن روبه‌رو شده‌ای، با درصد درستش. از ضعیف‌ترین به قوی‌ترین."
      >
        {!roles.length ? (
          <div className=" mt-3 rounded-2xl bg-card p-6 text-center shadow sm:p-8">
            <p className=" text-muted-foreground">هنوز پرونده‌ای بررسی نکرده‌ای.</p>
          </div>
        ) : (
          <>
            {categories.length > 1 && (
              <div className=" mt-3 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span
                    key={c.category}
                    className=" rounded-full bg-card px-3 py-1.5 text-xs font-bold shadow"
                  >
                    {c.category}:{" "}
                    <span
                      style={{
                        color: scoreColor(
                          Math.round((c.correct / c.total) * 100),
                        ),
                      }}
                    >
                      {toFa(Math.round((c.correct / c.total) * 100))}٪
                    </span>
                  </span>
                ))}
              </div>
            )}
            <div className=" mt-3 flex flex-col gap-3">
              {roles.map((r, i) => {
                const p = Math.round((r.correct / r.total) * 100);
                const color = scoreColor(p);
                return (
                  <motion.div
                    key={r.role}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.03, ease: EASE }}
                    className=" rounded-2xl bg-card p-4 shadow"
                  >
                    <div className=" mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className=" font-bold">{r.role}</span>
                      <span className=" text-xs text-muted-foreground">
                        {toFa(r.correct)} از {toFa(r.total)} —{" "}
                        <span style={{ color }} className=" font-bold">
                          {toFa(p)}٪
                        </span>
                      </span>
                    </div>
                    <div className=" h-2 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${p}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: EASE }}
                        style={{ backgroundColor: color }}
                        className=" h-full rounded-full"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </PanelSection>

      <PanelSection title="پرونده‌های پیشین" icon="clipboard">
        {!sessions.length ? (
          <div className=" mt-3 rounded-2xl bg-card p-6 text-center shadow sm:p-8">
            <p className=" text-muted-foreground">
              هنوز جاسوس بازی نکرده‌ای. اولین دستت که تمام شود، همین‌جا می‌آید.
            </p>
          </div>
        ) : (
          <div className=" mt-3 flex flex-col gap-3">
            {sessions.map((items) => (
              <SessionRow
                key={items[0].id}
                items={items}
                open={openId === items[0].id}
                onToggle={() =>
                  setOpenId((id) => (id === items[0].id ? null : items[0].id))
                }
              />
            ))}
          </div>
        )}
      </PanelSection>
    </div>
  );
}

function SessionRow({
  items,
  open,
  onToggle,
}: {
  items: JasoosAnswer[];
  open: boolean;
  onToggle: () => void;
}) {
  const ordered = useMemo(() => [...items].reverse(), [items]);
  const correct = items.filter((a) => a.isCorrect).length;
  const percent = Math.round((correct / items.length) * 100);
  const color = scoreColor(percent);
  const when = ordered[0].answeredAt;

  return (
    <div className=" rounded-2xl bg-card p-3 shadow sm:p-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className=" flex w-full cursor-pointer items-center justify-between gap-3 text-right"
      >
        <div className=" flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div
            style={{ borderColor: color, color }}
            className=" flex size-14 shrink-0 items-center justify-center rounded-full border-4 text-sm font-bold sm:size-16 sm:text-base"
          >
            {toFa(percent)}%
          </div>
          <div className=" min-w-0">
            <p className=" truncate text-sm font-bold sm:text-base">
              {toFa(correct)} از {toFa(items.length)} پرونده درست
            </p>
            <p className=" mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{relativeDay(when)}</span>
              <span className=" opacity-60">{jalali(when)}</span>
            </p>
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className=" overflow-hidden"
          >
            <div className=" mt-3 flex flex-col gap-2 rounded-2xl bg-secondary p-3 sm:p-4">
              {ordered.map((a, i) => (
                <div
                  key={a.id}
                  className={`rounded-xl border-2 bg-card p-3 ${
                    a.isCorrect
                      ? "border-green-500/60"
                      : "border-destructive/60"
                  }`}
                >
                  <div className=" flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className=" font-bold">
                      پروندهٔ {toFa(i + 1)}
                      {a.category ? ` · ${a.category}` : ""}
                    </span>
                    <span
                      className={
                        a.isCorrect
                          ? "text-green-600 dark:text-green-400"
                          : "text-destructive"
                      }
                    >
                      {a.isCorrect ? "✓ درست" : "✕ نادرست"}
                    </span>
                  </div>
                  <div className=" mt-2 flex flex-wrap gap-2 text-xs">
                    <span className=" rounded-full bg-secondary px-3 py-1">
                      انتخابِ تو: <b>{a.chosenRole || "—"}</b>
                    </span>
                    {!a.isCorrect && (
                      <span className=" rounded-full bg-green-500/15 px-3 py-1 text-green-700 dark:text-green-400">
                        پاسخِ درست: <b>{a.correctRole || "—"}</b>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
