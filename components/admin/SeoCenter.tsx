"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useAdminToast } from "./AdminToast";
/* ⚠️ اکشن‌ها از صفحهٔ سرور به‌صورتِ prop می‌رسند و این فایل آن‌ها را import
   نمی‌کند — فقط typeشان را. `lib/admin/seo-actions` برای ساختنِ فهرستِ درس‌ها
   به `lib/doroos` می‌رسد، و نگهبانِ tests/doroos/paid-content.test.ts هر
   فایلِ کلاینتی را که حتی غیرمستقیم به محتوای درس‌ها برسد رد می‌کند. */
import type { LessonRow, SeoActions, SeoOverview } from "@/lib/admin/seo-actions";
import { adminResetSetting, adminSetSetting } from "@/lib/admin/settings-actions";
import type { HealthCheck, CheckStatus } from "@/lib/seo/health";
import type { SeoState } from "@/lib/seo/settings";
import type { SettingKey } from "@/lib/settings";
/* ⚠️ فقط فایل‌های بی‌import: `playbook` و `policy` هیچ وابستگیِ سروری ندارند.
   importِ مقدار از `@/lib/settings` یا `@/lib/seo/settings` درایورِ MySQL را
   به بستهٔ مرورگر می‌کشید (همان اتفاقی که بالای lib/settings/groups.ts آمده). */
import {
  AI_PROBES,
  CADENCE_DAYS,
  CADENCE_LABEL,
  READY_PROMPTS,
  SEO_DONTS,
  SEO_TASKS,
  fillPlaceholders,
  type SeoTask,
} from "@/lib/seo/playbook";
import { AI_BOTS, blockedAiBots, parseAiPolicy } from "@/lib/seo/policy";
import { DEFAULT_BRAND_SUMMARY } from "@/lib/seo/entity";

/* ─────────────────────────────── ابزارهای کوچک ─────────────────────────────── */

const fa = (n: number) => n.toLocaleString("fa-IR");

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function faDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

function ago(iso?: string): string {
  const d = daysSince(iso);
  if (d === null) return "هرگز";
  if (d === 0) return "امروز";
  if (d === 1) return "دیروز";
  return `${fa(d)} روز پیش`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // مرورگرهایی که clipboard را فقط روی https می‌دهند.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

type TaskStatus = { kind: "done" | "due" | "never" | "overdue"; label: string };

function taskStatus(task: SeoTask, doneAt?: string): TaskStatus {
  const cadence = CADENCE_DAYS[task.cadence];
  const d = daysSince(doneAt);
  if (d === null) return { kind: task.cadence === "once" ? "never" : "overdue", label: "هنوز انجام نشده" };
  if (cadence === null) return { kind: "done", label: `انجام شد — ${faDate(doneAt!)}` };
  if (d >= cadence) return { kind: "overdue", label: `موعدش رسیده (آخرین بار ${ago(doneAt)})` };
  return { kind: "done", label: `${ago(doneAt)} انجام شد — دوباره ${fa(cadence - d)} روز دیگر` };
}

const STATUS_STYLE: Record<CheckStatus, { dot: string; chip: string; label: string }> = {
  pass: { dot: "bg-primary", chip: "bg-primary/15 text-primary", label: "درست" },
  warn: { dot: "bg-gold", chip: "bg-gold/20 text-gold-ink dark:text-gold", label: "توجه" },
  fail: { dot: "bg-destructive", chip: "bg-destructive/15 text-destructive", label: "مشکل" },
  info: { dot: "bg-muted-foreground/50", chip: "bg-muted text-muted-foreground", label: "نامشخص" },
};

function score(checks: HealthCheck[]): number | null {
  const counted = checks.filter((c) => c.status !== "info");
  if (!counted.length) return null;
  const points = counted.reduce((n, c) => n + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return Math.round((points / counted.length) * 100);
}

/* ───────────────────────────────── تب‌ها ───────────────────────────────── */

const TABS = [
  { id: "overview", label: "نمای کلی" },
  { id: "health", label: "سلامتِ فنی" },
  { id: "tasks", label: "کارهای من" },
  { id: "ai", label: "هوش مصنوعی" },
  { id: "content", label: "محتوا" },
  { id: "serp", label: "پیش‌نمایشِ گوگل" },
  { id: "tools", label: "ابزارها" },
  { id: "prompts", label: "پرامپت‌های آماده" },
  { id: "settings", label: "تنظیمات" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * تبِ باز از `#…`ِ نشانی خوانده می‌شود: با رفرش، با دکمهٔ «برگشت» و با لینکی
 * مثلِ `/admin/seo#settings` (که صفحهٔ تنظیمات می‌دهد) همان تب باز می‌شود.
 */
function useHashTab(): TabId {
  const hash = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
    },
    () => window.location.hash.slice(1),
    () => "",
  );
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : "overview";
}

/* ──────────────────────────────── ریشه ──────────────────────────────── */

export default function SeoCenter({ data, actions }: { data: SeoOverview; actions: SeoActions }) {
  const toast = useAdminToast();
  const tab = useHashTab();
  const [state, setState] = useState<SeoState>(data.state);
  const [internal, setInternal] = useState<HealthCheck[]>(data.checks);
  const [external, setExternal] = useState<HealthCheck[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [pending, startTransition] = useTransition();

  const go = (id: TabId) => {
    // `pushState` رویدادِ hashchange نمی‌دهد، پس خودمان می‌فرستیم تا useHashTab بشنود.
    history.pushState(null, "", `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runChecks = () => {
    setChecking(true);
    Promise.all([actions.internalChecks(), actions.externalChecks()])
      .then(([i, e]) => {
        setInternal(i);
        setExternal(e);
      })
      .catch(() => toast("بررسی انجام نشد. دوباره امتحان کنید."))
      .finally(() => setChecking(false));
  };

  // آزمون‌های بیرونی چند ثانیه طول می‌کشند؛ صفحه منتظرشان نمی‌ماند.
  useEffect(() => {
    let alive = true;
    actions
      .externalChecks()
      .then((e) => alive && setExternal(e))
      .catch(() => alive && setExternal([]));
    return () => {
      alive = false;
    };
  }, [actions]);

  const allChecks = useMemo(() => [...internal, ...(external ?? [])], [internal, external]);
  const healthScore = score(allChecks);

  const markTask = (id: string, done: boolean) =>
    startTransition(async () => {
      const r = await actions.markTask(id, done);
      if (!r.ok) return toast(r.errors.join("\n"));
      setState(r.data);
      toast(done ? "ثبت شد. آفرین!" : "برگردانده شد.", "success");
    });

  const overdue = SEO_TASKS.filter((t) => {
    const s = taskStatus(t, state.done[t.id]);
    return s.kind === "overdue" || s.kind === "never";
  });

  return (
    <div dir="rtl" className="flex max-w-5xl flex-col gap-6 p-4 xs:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">سئو و هوش مصنوعی</h1>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
            هرچه از دستِ کد برمی‌آمد، خودکار انجام می‌شود. این صفحه فقط کارهایی را نشان می‌دهد که
            از دستِ شما برمی‌آید — قدم‌به‌قدم، با یادآوری.
          </p>
        </div>
        <ScoreBadge
          value={healthScore}
          loading={external === null}
          partial={!!external && (external.length === 0 || external.some((c) => c.id === "reach"))}
        />
      </header>

      <nav
        aria-label="بخش‌های سئو"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 xs:-mx-6 xs:px-6 [scrollbar-width:none]"
      >
        {TABS.map((t) => {
          const badge =
            t.id === "tasks" && overdue.length
              ? overdue.length
              : t.id === "health" && allChecks.some((c) => c.status === "fail")
                ? allChecks.filter((c) => c.status === "fail").length
                : 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm transition-colors ${
                tab === t.id
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {badge > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[11px] leading-5 ${
                    tab === t.id ? "bg-primary-foreground/20" : "bg-gold/20 text-gold-ink dark:text-gold"
                  }`}
                >
                  {fa(badge)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {tab === "overview" && (
        <Overview data={data} state={state} checks={allChecks} overdue={overdue} external={external} go={go} />
      )}
      {tab === "health" && (
        <Health internal={internal} external={external} checking={checking} onRun={runChecks} />
      )}
      {tab === "tasks" && (
        <Tasks state={state} origin={data.origin} pending={pending} onMark={markTask} />
      )}
      {tab === "ai" && (
        <AiPanel data={data} state={state} setState={setState} recordAiCheck={actions.recordAiCheck} />
      )}
      {tab === "content" && <Content data={data} />}
      {tab === "serp" && <Serp data={data} />}
      {tab === "tools" && (
        <Tools data={data} state={state} setState={setState} submitIndexNow={actions.submitIndexNow} />
      )}
      {tab === "prompts" && <Prompts origin={data.origin} />}
      {tab === "settings" && <Settings data={data} />}
    </div>
  );
}

/* ──────────────────────────────── اجزای مشترک ──────────────────────────────── */

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</div>;
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className="mt-1 text-sm leading-7 text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ExternalLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const internal = href.startsWith("/");
  const cls = `inline-flex min-h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary ${className}`;
  if (internal) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={cls}>
      {children}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5" />
      </svg>
    </a>
  );
}

function CopyButton({ text, label = "کپی", className = "" }: { text: string; label?: string; className?: string }) {
  const toast = useAdminToast();
  return (
    <button
      type="button"
      onClick={async () => toast((await copyText(text)) ? "کپی شد." : "کپی نشد؛ دستی انتخاب کنید.", "success")}
      className={`inline-flex min-h-9 items-center gap-1 rounded-xl bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5" aria-hidden>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path strokeLinecap="round" d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </svg>
      {label}
    </button>
  );
}

function ScoreBadge({ value, loading, partial }: { value: number | null; loading: boolean; partial: boolean }) {
  const tone = value === null ? "text-muted-foreground" : value >= 85 ? "text-primary" : value >= 60 ? "text-gold-ink dark:text-gold" : "text-destructive";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="whitespace-nowrap text-right">
        <div className="text-[11px] text-muted-foreground">امتیازِ سلامتِ سئو</div>
        <div className="text-[11px] text-muted-foreground">
          {loading
            ? "در حالِ بررسیِ سایتِ زنده…"
            : partial
              ? "فقط تنظیمات؛ سایتِ زنده بررسی نشد"
              : "بر اساسِ آزمون‌های فنی"}
        </div>
      </div>
      <div className={`text-3xl font-black tabular-nums ${tone}`}>{value === null ? "—" : `${fa(value)}٪`}</div>
    </div>
  );
}

function CheckRow({ check }: { check: HealthCheck }) {
  const s = STATUS_STYLE[check.status];
  return (
    <li className="flex gap-3 border-b border-border/60 py-3 last:border-0">
      <span className={`mt-2 size-2.5 shrink-0 rounded-full ${s.dot}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{check.title}</span>
          <span className={`rounded-lg px-2 py-0.5 text-[11px] ${s.chip}`}>{s.label}</span>
        </div>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">{check.detail}</p>
        {check.fix && check.status !== "pass" && (
          <p className="mt-1.5 rounded-xl bg-muted/60 px-3 py-2 text-sm leading-7">
            <span className="font-semibold">چه کنم؟ </span>
            {check.fix}
          </p>
        )}
      </div>
    </li>
  );
}

/* ────────────────────────────────── نمای کلی ────────────────────────────────── */

function Overview({
  data,
  state,
  checks,
  overdue,
  external,
  go,
}: {
  data: SeoOverview;
  state: SeoState;
  checks: HealthCheck[];
  overdue: SeoTask[];
  external: HealthCheck[] | null;
  go: (id: TabId) => void;
}) {
  const ready = data.lessons.filter((l) => l.ready).length;
  const aiEntries = Object.values(state.aiChecks ?? {});
  const aiSeen = aiEntries.filter((a) => a.seen).length;
  const problems = checks.filter((c) => c.status === "fail" || c.status === "warn");
  const nextTasks = [...overdue].sort((a, b) => (a.impact === b.impact ? 0 : a.impact === "high" ? -1 : 1)).slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="صفحه در نقشهٔ سایت" value={fa(data.sitemapCount)} hint="همه به گوگل معرفی می‌شوند" />
        <Stat
          label="درس‌های آماده"
          value={`${fa(ready)} از ${fa(data.lessons.length)}`}
          hint="هر درسِ تازه = یک صفحهٔ تازه در گوگل"
          onClick={() => go("content")}
        />
        <Stat
          label="دیده‌شدن در هوش مصنوعی"
          value={aiEntries.length ? `${fa(aiSeen)} از ${fa(aiEntries.length)}` : "هنوز آزموده نشده"}
          hint="آزمونِ ماهانه در تبِ «هوش مصنوعی»"
          onClick={() => go("ai")}
        />
        <Stat
          label="آخرین خبر به Bing"
          value={state.indexNow ? ago(state.indexNow.at) : "هرگز"}
          hint={state.indexNow?.ok === false ? "آخرین ارسال ناموفق بود" : "IndexNow — تبِ «ابزارها»"}
          onClick={() => go("tools")}
        />
      </div>

      <Card>
        <SectionTitle title="الان چه کنم؟" hint="مهم‌ترین کارهای همین حالا، به ترتیبِ اثر." />
        <ol className="mt-4 flex flex-col gap-2">
          {problems.slice(0, 3).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => go("health")}
                className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-right transition-colors hover:border-primary/40"
              >
                <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${STATUS_STYLE[c.status].dot}`} aria-hidden />
                <span className="text-sm leading-7">
                  <span className="font-semibold">{c.title}: </span>
                  {c.fix ?? c.detail}
                </span>
              </button>
            </li>
          ))}
          {nextTasks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => go("tasks")}
                className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-right transition-colors hover:border-primary/40"
              >
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-gold" aria-hidden />
                <span className="text-sm leading-7">
                  <span className="font-semibold">{t.title}</span>
                  <span className="text-muted-foreground"> — حدودِ {fa(t.minutes)} دقیقه. {t.why}</span>
                </span>
              </button>
            </li>
          ))}
          {!problems.length && !nextTasks.length && (
            <li className="rounded-xl bg-primary/10 p-4 text-sm leading-7 text-primary">
              همه‌چیز مرتب است و همهٔ کارها به‌روزند. {external === null ? "(آزمون‌های سایتِ زنده هنوز در جریان‌اند.)" : "آفرین!"}
            </li>
          )}
        </ol>
      </Card>

      <Card>
        <SectionTitle title="چه چیزهایی خودکار انجام می‌شود" hint="لازم نیست به این‌ها فکر کنید؛ کد هر بار خودش درستشان می‌کند." />
        <ul className="mt-4 grid gap-2 text-sm leading-7 sm:grid-cols-2">
          {[
            "عنوان و توضیحِ هر صفحه، با همان عبارتی که دانش‌آموز جست‌وجو می‌کند («معنی درس اول فارسی یازدهم…»)",
            "تصویر و عنوانِ درست وقتی لینکی در تلگرام یا واتساپ فرستاده می‌شود",
            "نقشهٔ سایت (sitemap) با همهٔ درس‌ها — هر درسِ تازه خودش اضافه می‌شود",
            "دادهٔ ساختاریافته: مسیرِ صفحه، درس، کتاب، بازی، ابزار و شناسنامهٔ سروا",
            "فایلِ llms.txt برای ChatGPT، Claude، Gemini و Perplexity",
            "اجازهٔ خزش به ربات‌های پاسخ‌گوی هوش مصنوعی (قابلِ تغییر در «تنظیمات»)",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="mt-1.5 size-4 shrink-0 text-primary" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-destructive/30">
        <SectionTitle title="هرگز این کارها را نکنید" />
        <ul className="mt-3 flex flex-col gap-1.5 text-sm leading-7">
          {SEO_DONTS.map((d) => (
            <li key={d} className="flex gap-2">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
              {d}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint, onClick }: { label: string; value: string; hint: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[11px] leading-5 text-muted-foreground">{hint}</span>
    </>
  );
  const cls = "flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 text-right";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition-colors hover:border-primary/40`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ─────────────────────────────────── سلامت ─────────────────────────────────── */

function Health({
  internal,
  external,
  checking,
  onRun,
}: {
  internal: HealthCheck[];
  external: HealthCheck[] | null;
  checking: boolean;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle
          title="سلامتِ فنی"
          hint="سبز یعنی درست. زرد و قرمز یک جملهٔ «چه کنم» دارند — معمولاً یعنی پیامی به برنامه‌نویس یا پشتیبانیِ هاست."
        />
        <button
          type="button"
          onClick={onRun}
          disabled={checking}
          className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {checking ? "در حالِ بررسی…" : "بررسیِ دوباره"}
        </button>
      </div>

      <Card>
        <h3 className="font-semibold">تنظیماتِ سایت</h3>
        <ul className="mt-2">
          {internal.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="font-semibold">سایتِ زنده، از دیدِ گوگل</h3>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          سرور خودِ سایت را از اینترنت باز می‌کند، مثلِ گوگل. «نامشخص» یعنی هاست اجازهٔ این کار را نداد، نه اینکه سایت خراب است.
        </p>
        {external === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">در حالِ بررسی… (چند ثانیه)</p>
        ) : external.length ? (
          <ul className="mt-2">
            {external.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">بررسی انجام نشد؛ «بررسیِ دوباره» را بزنید.</p>
        )}
      </Card>
    </div>
  );
}

/* ─────────────────────────────────── کارها ─────────────────────────────────── */

function Tasks({
  state,
  origin,
  pending,
  onMark,
}: {
  state: SeoState;
  origin: string;
  pending: boolean;
  onMark: (id: string, done: boolean) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const groups: SeoTask["cadence"][] = ["once", "weekly", "monthly", "quarterly"];

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        title="کارهای من"
        hint="هر کار را باز کنید، قدم‌ها را انجام دهید و «انجام دادم» را بزنید. کارهای دوره‌ای خودشان سرِ موعد دوباره زرد می‌شوند."
      />
      {groups.map((cadence) => (
        <section key={cadence} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{CADENCE_LABEL[cadence]}</h3>
          {SEO_TASKS.filter((t) => t.cadence === cadence).map((task) => {
            const status = taskStatus(task, state.done[task.id]);
            const isOpen = open === task.id;
            return (
              <div key={task.id} className="rounded-2xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : task.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 p-4 text-right"
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                      status.kind === "done" ? "bg-primary text-primary-foreground" : status.kind === "overdue" ? "bg-gold/25 text-gold-ink dark:text-gold" : "border border-border"
                    }`}
                    aria-hidden
                  >
                    {status.kind === "done" && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="size-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                    )}
                    {status.kind === "overdue" && <span className="text-xs font-bold">!</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{task.title}</span>
                      {task.impact === "high" && (
                        <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] text-primary">اثرِ زیاد</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {status.label} · حدودِ {fa(task.minutes)} دقیقه
                    </span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-3 border-t border-border px-4 pb-4 pt-3">
                    <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm leading-7">
                      <span className="font-semibold">چرا؟ </span>
                      {task.why}
                    </p>
                    <ol className="flex flex-col gap-2">
                      {task.steps.map((step, i) => (
                        <li key={i} className="flex gap-2.5 text-sm leading-7">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {fa(i + 1)}
                          </span>
                          <span>{fillPlaceholders(step, origin)}</span>
                        </li>
                      ))}
                    </ol>
                    {task.links && (
                      <div className="flex flex-wrap gap-2">
                        {task.links.map((l) => (
                          <ExternalLink key={l.href} href={fillPlaceholders(l.href, origin)}>
                            {l.label}
                          </ExternalLink>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onMark(task.id, true)}
                        className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        انجام دادم
                      </button>
                      {state.done[task.id] && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onMark(task.id, false)}
                          className="min-h-10 rounded-xl border border-border px-4 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                        >
                          هنوز نه
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/* ──────────────────────────────── هوش مصنوعی ──────────────────────────────── */

function AiPanel({
  data,
  state,
  setState,
  recordAiCheck,
}: {
  data: SeoOverview;
  state: SeoState;
  setState: (s: SeoState) => void;
  recordAiCheck: SeoActions["recordAiCheck"];
}) {
  const toast = useAdminToast();
  const [pending, startTransition] = useTransition();
  const policy = parseAiPolicy(data.settings.find((s) => s.key === "seo.ai_crawlers")?.value);
  const blocked = new Set(blockedAiBots(policy));

  const record = (id: string, seen: boolean) =>
    startTransition(async () => {
      const r = await recordAiCheck(id, seen);
      if (!r.ok) return toast(r.errors.join("\n"));
      setState(r.data);
      toast("ثبت شد.", "success");
    });

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        title="دیده شدن در ChatGPT، Gemini و Perplexity"
        hint="به این «جئو» (GEO) می‌گویند: بهینه‌سازی برای موتورهای پاسخ‌گو. بخشِ فنی‌اش خودکار است؛ این آزمونِ ماهانه نشان می‌دهد نتیجه می‌دهد یا نه."
      />

      <Card>
        <h3 className="font-semibold">آزمونِ ماهانه</h3>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">
          هر پرسش را کپی کنید و در ChatGPT (با جست‌وجوی روشن)، Gemini و Perplexity بپرسید. اگر سروا یا
          sarvaedu.ir در پاسخ بود، «دیده شد».
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {AI_PROBES.map((p) => {
            const last = state.aiChecks?.[p.id];
            return (
              <li key={p.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{p.intent}</span>
                  {last && (
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[11px] ${last.seen ? "bg-primary/15 text-primary" : "bg-gold/20 text-gold-ink dark:text-gold"}`}
                    >
                      {last.seen ? "دیده شد" : "دیده نشد"} — {ago(last.at)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-7">{p.question}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton text={p.question} label="کپیِ پرسش" />
                  <ExternalLink href={`https://www.perplexity.ai/search?q=${encodeURIComponent(p.question)}`}>
                    پرسیدن در Perplexity
                  </ExternalLink>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => record(p.id, true)}
                    className="min-h-9 rounded-xl border border-primary/40 px-3 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                  >
                    دیده شد
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => record(p.id, false)}
                    className="min-h-9 rounded-xl border border-border px-3 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    دیده نشد
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-sm leading-7">
          <span className="font-semibold">اگر دیده نشد، نگران نباشید. </span>
          مدل‌ها کم‌کم یاد می‌گیرند. کارهایی که بیشترین اثر را دارند: اتصال به Bing، لینک‌گرفتن از سایت‌ها و
          کانال‌های دیگر، و نوشتنِ درس‌های باقی‌مانده.
        </p>
      </Card>

      <Card>
        <h3 className="font-semibold">کدام ربات‌ها اجازه دارند</h3>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">
          از تبِ «تنظیمات» عوض می‌شود. «پاسخ‌گو» یعنی رباتی که هنگامِ جواب دادن به یک کاربر، سروا را می‌خواند و لینکش را
          می‌دهد؛ «آموزش» یعنی ساختنِ نسخهٔ بعدیِ مدل.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {AI_BOTS.map((b) => (
            <div key={b.ua} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" dir="ltr">
                  {b.ua}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {b.owner} · {b.purpose === "answer" ? "پاسخ‌گو" : "آموزش"}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] ${blocked.has(b.ua) ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}
              >
                {blocked.has(b.ua) ? "بسته" : "مجاز"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ExternalLink href={`${data.origin}/llms.txt`}>llms.txt</ExternalLink>
          <ExternalLink href={`${data.origin}/llms-full.txt`}>llms-full.txt</ExternalLink>
          <ExternalLink href={`${data.origin}/robots.txt`}>robots.txt</ExternalLink>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────── محتوا ─────────────────────────────────── */

function sharePost(l: LessonRow): string {
  const title = l.title ? `«${l.title}»` : "";
  return [
    `📖 معنی درس ${l.ordinal} فارسی ${l.gradeLabel} ${title}`.trim(),
    "",
    "معنی روانِ بیت‌به‌بیت، قلمرو زبانی، ادبی و فکری و آرایه‌ها — همه در یک صفحه، در سروا:",
    l.url,
    "",
    `#فارسی_${l.gradeLabel} #معنی_درس #ادبیات_فارسی #سروا`,
  ].join("\n");
}

function inspectUrl(host: string, url: string): string {
  return `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(`sc-domain:${host}`)}&id=${encodeURIComponent(url)}`;
}

function Content({ data }: { data: SeoOverview }) {
  const grades = Array.from(new Set(data.lessons.map((l) => l.grade)));
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        title="محتوا: قوی‌ترین اهرمِ سئوی سروا"
        hint="هزاران دانش‌آموز «معنی درس … فارسی …» جست‌وجو می‌کنند. هر درسی که اینجا «آماده» شود، یک صفحهٔ تازه برای همان جست‌وجوست."
      />
      {grades.map((g) => {
        const rows = data.lessons.filter((l) => l.grade === g);
        const ready = rows.filter((l) => l.ready).length;
        const pct = Math.round((ready / rows.length) * 100);
        return (
          <Card key={g}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">
                {rows[0].book} — پایهٔ {rows[0].gradeLabel}
              </h3>
              <span className="text-sm text-muted-foreground">
                {fa(ready)} از {fa(rows.length)} درس آماده
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-3 flex flex-col">
              {rows.map((l) => (
                <li key={l.number} className="flex flex-wrap items-center gap-2 border-b border-border/60 py-2.5 last:border-0">
                  <span className={`size-2 shrink-0 rounded-full ${l.ready ? "bg-primary" : "bg-gold"}`} aria-hidden />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">درس {l.ordinal}</span>
                    {l.title && <span className="text-muted-foreground"> — {l.title}</span>}
                    {!l.ready && <span className="me-2 text-xs text-gold-ink dark:text-gold"> (هنوز نوشته نشده)</span>}
                  </span>
                  {l.ready && (
                    <span className="flex flex-wrap gap-1.5">
                      <ExternalLink href={l.url}>دیدن</ExternalLink>
                      <ExternalLink href={inspectUrl(data.host, l.url)}>بررسی در گوگل</ExternalLink>
                      <CopyButton text={sharePost(l)} label="متنِ پست" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────── پیش‌نمایشِ گوگل ─────────────────────────────── */

/** گوگل عنوان را حدودِ ۶۰ نویسه و توضیح را حدودِ ۱۶۰ نویسه نشان می‌دهد. */
const TITLE_MAX = 65;
const DESC_MAX = 160;

function Serp({ data }: { data: SeoOverview }) {
  const [q, setQ] = useState("");
  const rows = data.serp.filter((r) => !q.trim() || r.title.includes(q.trim()) || r.path.includes(q.trim()));
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        title="سروا در نتیجهٔ گوگل"
        hint="هر صفحه تقریباً این‌طور دیده می‌شود. عنوان‌ها و توضیح‌ها در کد نوشته شده‌اند (lib/seo/catalog.ts)؛ برای تغییر، فهرستِ پیشنهادی را برای برنامه‌نویس بفرستید."
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="جست‌وجو در صفحه‌ها… (مثلاً «یازدهم» یا «بازی»)"
        className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const long = r.title.length > TITLE_MAX;
          const descBad = r.description.length > DESC_MAX || r.description.length < 70;
          return (
            <div key={r.path} className="rounded-2xl border border-border bg-card p-4">
              <div className="text-[11px] text-muted-foreground" dir="ltr">
                {r.url.replace(/^https?:\/\//, "").replaceAll("/", " › ")}
              </div>
              <div className="mt-1 text-base font-semibold leading-7 text-[#1a0dab] dark:text-[#8ab4f8]">
                {long ? `${r.title.slice(0, TITLE_MAX)}…` : r.title}
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {r.description.length > DESC_MAX ? `${r.description.slice(0, DESC_MAX)}…` : r.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-lg bg-muted px-2 py-0.5 text-muted-foreground">{r.group}</span>
                <span className={`rounded-lg px-2 py-0.5 ${long ? "bg-gold/20 text-gold-ink dark:text-gold" : "bg-primary/10 text-primary"}`}>
                  عنوان: {fa(r.title.length)} نویسه{long ? " — در گوگل کوتاه می‌شود" : ""}
                </span>
                <span className={`rounded-lg px-2 py-0.5 ${descBad ? "bg-gold/20 text-gold-ink dark:text-gold" : "bg-primary/10 text-primary"}`}>
                  توضیح: {fa(r.description.length)} نویسه
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── ابزارها ─────────────────────────────────── */

function Tools({
  data,
  state,
  setState,
  submitIndexNow,
}: {
  data: SeoOverview;
  state: SeoState;
  setState: (s: SeoState) => void;
  submitIndexNow: SeoActions["submitIndexNow"];
}) {
  const toast = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [path, setPath] = useState("/doroos/yazdahom/1");

  const url = (() => {
    const p = path.trim();
    if (/^https?:\/\//.test(p)) return p;
    return `${data.origin}${p.startsWith("/") ? p : `/${p}`}`;
  })();

  const submit = () =>
    startTransition(async () => {
      const r = await submitIndexNow();
      if (!r.ok) return toast(r.errors.join("\n"));
      setState(r.data.state);
      toast(`${fa(r.data.count)} نشانی فرستاده شد. ${r.data.message}`, "success");
    });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <SectionTitle
          title="به موتورهای جست‌وجو خبر بده (IndexNow)"
          hint="همهٔ صفحه‌های سایت را یک‌جا برای Bing، Yandex و… می‌فرستد. Bing مهم است چون جست‌وجوی ChatGPT و Copilot از آن می‌خوانند. بعد از هر درسِ تازه یک بار بزنید؛ روزی چند بار لازم نیست."
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "در حالِ ارسال…" : `ارسالِ ${fa(data.sitemapCount)} صفحه`}
          </button>
          {state.indexNow && (
            <span className={`text-sm ${state.indexNow.ok ? "text-primary" : "text-destructive"}`}>
              آخرین ارسال {ago(state.indexNow.at)}: {state.indexNow.message}
            </span>
          )}
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          گوگل IndexNow را نمی‌شناسد؛ برای گوگل از «بررسی در گوگل» کنارِ هر درس و دکمهٔ «Request indexing» استفاده کنید.
        </p>
      </Card>

      <Card>
        <SectionTitle
          title="آزمونِ یک صفحه"
          hint="نشانیِ یک صفحه را بنویسید (مثلاً ‎/doroos/yazdahom/1‎ یا نشانیِ کامل) و ابزارِ لازم را باز کنید."
        />
        <input
          dir="ltr"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="mt-3 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <ExternalLink href={inspectUrl(data.host, url)}>بررسی در Search Console</ExternalLink>
          <ExternalLink href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`}>
            آزمونِ گوگل (Rich Results)
          </ExternalLink>
          <ExternalLink href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=mobile`}>
            آزمونِ سرعت (موبایل)
          </ExternalLink>
          <ExternalLink href={`https://validator.schema.org/#url=${encodeURIComponent(url)}`}>
            آزمونِ Schema
          </ExternalLink>
          <ExternalLink href={url}>باز کردن</ExternalLink>
        </div>
      </Card>

      <Card>
        <SectionTitle title="پیوندهای مهم" />
        <div className="mt-3 flex flex-wrap gap-2">
          <ExternalLink href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(`sc-domain:${data.host}`)}`}>
            Google Search Console
          </ExternalLink>
          <ExternalLink href="https://www.bing.com/webmasters">Bing Webmaster Tools</ExternalLink>
          <ExternalLink href={`${data.origin}/sitemap.xml`}>sitemap.xml</ExternalLink>
          <ExternalLink href={`${data.origin}/robots.txt`}>robots.txt</ExternalLink>
          <ExternalLink href={`${data.origin}/llms.txt`}>llms.txt</ExternalLink>
        </div>
      </Card>
    </div>
  );
}

/* ──────────────────────────────── پرامپت‌ها ──────────────────────────────── */

function Prompts({ origin }: { origin: string }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        title="پرامپت‌های آماده"
        hint="لازم نیست پرامپت‌نویسی بلد باشید. هرکدام را کپی کنید، جاهای [داخلِ کروشه] را پر کنید و در ChatGPT، Claude یا Gemini بچسبانید."
      />
      {READY_PROMPTS.map((p) => {
        const text = fillPlaceholders(p.prompt, origin);
        return (
          <Card key={p.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-0.5 text-xs leading-6 text-muted-foreground">{p.when}</p>
              </div>
              <CopyButton text={text} label="کپیِ پرامپت" />
            </div>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-3 font-sans text-xs leading-6">
              {text}
            </pre>
          </Card>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────── تنظیمات ─────────────────────────────────── */

const MULTILINE = new Set<SettingKey>(["seo.same_as", "seo.brand_summary"]);

function Settings({ data }: { data: SeoOverview }) {
  const toast = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(data.settings.map((s) => [s.key, s.value ?? ""])),
  );
  const [sources, setSources] = useState<Record<string, string>>(
    Object.fromEntries(data.settings.map((s) => [s.key, s.source])),
  );

  const save = (key: SettingKey) =>
    startTransition(async () => {
      const value = (drafts[key] ?? "").trim();
      // خالی کردنِ فرم یعنی «پاک کن»، نه «رشتهٔ خالی ذخیره کن».
      const r = value ? await adminSetSetting(key, value) : await adminResetSetting(key);
      if (!r.ok) return toast(r.errors.join("\n"));
      setSources((s) => ({ ...s, [key]: value ? "db" : "none" }));
      toast(value ? "ذخیره شد و همین حالا روی سایت اعمال شد." : "پاک شد.", "success");
    });

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        title="تنظیماتِ سئو و هوش مصنوعی"
        hint="هر تغییر همان لحظه در صفحهٔ خانه، robots.txt و llms.txt اعمال می‌شود و در «فعالیت و خطاها» ثبت می‌شود."
      />
      {data.settings.map((s) => (
        <Card key={s.key} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{s.label}</h3>
            {sources[s.key] === "db" && (
              <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-[11px] text-primary">ثبت‌شده</span>
            )}
          </div>
          <p className="text-sm leading-7 text-muted-foreground">{s.description}</p>
          {s.options ? (
            <select
              value={drafts[s.key] || s.options[0].value}
              onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
              className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : MULTILINE.has(s.key) ? (
            <textarea
              dir={s.key === "seo.same_as" ? "ltr" : "rtl"}
              rows={s.key === "seo.same_as" ? 5 : 4}
              value={drafts[s.key] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
              placeholder={s.key === "seo.same_as" ? "https://t.me/…\nhttps://instagram.com/…" : DEFAULT_BRAND_SUMMARY}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm leading-7 outline-none focus:border-primary"
            />
          ) : (
            <input
              dir="ltr"
              value={drafts[s.key] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
              placeholder={s.placeholder ?? ""}
              className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          )}
          <div>
            <button
              type="button"
              disabled={pending}
              onClick={() => save(s.key)}
              className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              ذخیره
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
