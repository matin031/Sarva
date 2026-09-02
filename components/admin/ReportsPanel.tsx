"use client";

import { useState, useTransition } from "react";
import {
  adminFindContent,
  reportAdminDelete,
  reportAdminList,
  reportAdminResolveTarget,
  reportAdminSetStatus,
  type AdminReport,
  type ContentHit,
} from "@/lib/admin/report-actions";
import {
  REPORT_AREAS,
  REPORT_AREA_ADMIN_PATH,
  REPORT_AREA_LABELS,
  REPORT_PAGE_SIZE,
  REPORT_REASON_LABELS,
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
  type ReportStatus,
} from "@/lib/reports/constants";
import { useAdminToast } from "@/components/admin/AdminToast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/**
 * صندوقِ گزارش‌های محتوا.
 *
 * دو ابزار در یک صفحه، و عمداً کنارِ هم:
 *
 *   • فهرست گزارش‌ها — چه چیزی شکسته، چند نفر گفته‌اند، در چه وضعیتی است.
 *   • «یافتنِ محتوا» — یک مصراع بنویس تا بگوید مالِ کدام سؤال است.
 *
 * دومی جداشدنی نیست: گزارش می‌گوید «پاسخ غلط است» و یک بیت نشان می‌دهد، ولی
 * کارِ بعدی همیشه پیدا کردنِ همان سؤال در بانک است. جدا کردنشان یعنی کپی
 * کردنِ متن و رفتن به یک صفحهٔ دیگر.
 */

const fa = (n: number) => n.toLocaleString("fa-IR");

const STATUS_STYLE: Record<ReportStatus, string> = {
  open: "bg-destructive/15 text-destructive",
  in_review: "bg-gold/20 text-gold-ink dark:text-gold",
  resolved: "bg-primary/15 text-primary",
  rejected: "bg-muted text-muted-foreground",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "همین الان";
  if (min < 60) return `${fa(min)} دقیقه پیش`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${fa(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${fa(days)} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  initial: { rows: AdminReport[]; total: number; openCount: number };
  counts: Record<string, number>;
};

export default function ReportsPanel({ initial, counts }: Props) {
  const toast = useAdminToast();
  const [rows, setRows] = useState(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [openCount, setOpenCount] = useState(initial.openCount);
  const [area, setArea] = useState("");
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AdminReport | null>(null);
  const [pending, startTransition] = useTransition();

  const load = (
    next: { area?: string; status?: string; search?: string } = {},
    append = false,
  ) =>
    startTransition(async () => {
      const result = await reportAdminList({
        area: (next.area ?? area) || undefined,
        status: (next.status ?? status) || undefined,
        search: (next.search ?? search) || undefined,
        limit: REPORT_PAGE_SIZE,
        offset: append ? rows.length : 0,
      });
      setTotal(result.total);
      setOpenCount(result.openCount);
      setRows((prev) => (append ? [...prev, ...result.rows] : result.rows));
    });

  const setReportStatus = (report: AdminReport, next: ReportStatus) =>
    startTransition(async () => {
      const result = await reportAdminSetStatus({ id: report.id, status: next, adminNote: null });
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      load();
    });

  const resolveAllFor = (report: AdminReport) =>
    startTransition(async () => {
      if (!report.targetId) return;
      const result = await reportAdminResolveTarget(report.area, report.targetId);
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast(`${fa(result.data.count)} گزارشِ این محتوا رسیدگی شد.`, "success");
      load();
    });

  const remove = (report: AdminReport) => {
    setConfirmDelete(null);
    startTransition(async () => {
      const result = await reportAdminDelete(report.id);
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast("گزارش حذف شد.", "success");
      load();
    });
  };

  return (
    <div dir="rtl" className="flex max-w-5xl flex-col gap-6 p-4 xs:p-6">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">گزارش‌های محتوا</h1>
          {openCount > 0 && (
            <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive">
              {fa(openCount)} گزارشِ باز
            </span>
          )}
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          هرجای سایت که کاربر دکمهٔ «گزارش مشکل» را بزند، ردیفش اینجا می‌آید. برای اصلاحِ خودِ
          محتوا از دکمهٔ «رفتن به بخش» یا از «یافتنِ محتوا» پایین استفاده کنید.
        </p>
      </header>

      <ContentFinder />

      {/* فیلترها */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            load({ status: e.target.value });
          }}
          className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">همهٔ وضعیت‌ها</option>
          {REPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REPORT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={area}
          onChange={(e) => {
            setArea(e.target.value);
            load({ area: e.target.value });
          }}
          className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">همهٔ بخش‌ها</option>
          {REPORT_AREAS.map((a) => (
            <option key={a} value={a}>
              {REPORT_AREA_LABELS[a]}
              {counts[a] ? ` (${fa(counts[a])})` : ""}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load({ search });
          }}
          placeholder="جست‌وجو در متنِ گزارش‌ها…"
          className="min-h-10 min-w-56 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => load({ search })}
          className="min-h-10 rounded-xl border border-border px-4 text-sm disabled:opacity-60"
        >
          جست‌وجو
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-semibold">گزارشی در این فیلتر نیست</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            اگر تازه دکمهٔ گزارش را اضافه کرده‌اید، تا اولین گزارشِ کاربران اینجا خالی می‌ماند.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              pending={pending}
              onStatus={setReportStatus}
              onResolveAll={resolveAllFor}
              onDelete={setConfirmDelete}
            />
          ))}
        </ul>
      )}

      {rows.length > 0 && rows.length < total && (
        <button
          type="button"
          disabled={pending}
          onClick={() => load({}, true)}
          className="min-h-11 rounded-xl border border-border bg-card text-sm text-muted-foreground disabled:opacity-60"
        >
          {pending ? "در حال بارگذاری…" : `نمایش بیشتر (${fa(rows.length)} از ${fa(total)})`}
        </button>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="حذف گزارش"
        body="این گزارش برای همیشه حذف می‌شود."
        consequence="معمولاً «رسیدگی شد» یا «رد شد» کارِ درست‌تری است: گزارش می‌ماند و بعداً می‌شود دید چه چیزی گزارش شده بود."
        tone="danger"
        confirmLabel="حذف کن"
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function ReportCard({
  report,
  pending,
  onStatus,
  onResolveAll,
  onDelete,
}: {
  report: AdminReport;
  pending: boolean;
  onStatus: (r: AdminReport, s: ReportStatus) => void;
  onResolveAll: (r: AdminReport) => void;
  onDelete: (r: AdminReport) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const adminPath = REPORT_AREA_ADMIN_PATH[report.area];

  return (
    <li
      className={`rounded-2xl border bg-card p-4 ${
        report.status === "open" ? "border-destructive/30" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[report.status]}`}>
              {REPORT_STATUS_LABELS[report.status]}
            </span>
            <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {REPORT_AREA_LABELS[report.area]}
            </span>
            <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              {REPORT_REASON_LABELS[report.reason].label}
            </span>
            {report.duplicates > 0 && (
              <span className="rounded-lg bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold-ink dark:text-gold">
                {fa(report.duplicates)} گزارشِ دیگر برای همین مورد
              </span>
            )}
            {!report.fromMember && (
              <span className="text-[11px] text-muted-foreground">مهمان</span>
            )}
          </div>

          {report.snapshot && (
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed">
              {report.snapshot}
            </p>
          )}
          {report.note && (
            <p className="mt-1.5 rounded-xl bg-muted/40 p-2.5 text-xs leading-relaxed text-muted-foreground">
              «{report.note}»
            </p>
          )}
        </div>

        <time className="shrink-0 text-xs text-muted-foreground">
          {relativeTime(report.createdAt)}
        </time>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {report.status !== "resolved" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStatus(report, "resolved")}
            className="min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            رسیدگی شد
          </button>
        )}
        {report.status === "open" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStatus(report, "in_review")}
            className="min-h-9 rounded-lg border border-border px-3 text-xs disabled:opacity-60"
          >
            در حال بررسی
          </button>
        )}
        {report.status !== "rejected" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStatus(report, "rejected")}
            className="min-h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground disabled:opacity-60"
          >
            رد کن
          </button>
        )}
        {report.duplicates > 0 && report.targetId && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onResolveAll(report)}
            className="min-h-9 rounded-lg border border-gold/40 px-3 text-xs text-gold-ink disabled:opacity-60 dark:text-gold"
          >
            رسیدگی به همهٔ گزارش‌های این مورد
          </button>
        )}
        {adminPath && (
          <a
            href={adminPath}
            className="min-h-9 rounded-lg border border-border px-3 text-xs leading-9 text-primary hover:underline"
          >
            رفتن به بخش ←
          </a>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? "بستن جزئیات" : "جزئیات فنی"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onDelete(report)}
          className="mr-auto min-h-9 px-2 text-xs text-destructive hover:underline disabled:opacity-60"
        >
          حذف
        </button>
      </div>

      {expanded && (
        <dl className="mt-2 flex flex-col gap-1 rounded-xl bg-muted/40 p-3 text-xs">
          {report.targetId && (
            <Detail label="شناسهٔ محتوا" value={report.targetId} mono />
          )}
          {Object.entries(report.targetRef).map(([k, v]) =>
            v === null || v === undefined ? null : (
              <Detail key={k} label={k} value={String(v)} mono />
            ),
          )}
          {report.requestId && (
            <Detail label="شناسهٔ درخواست" value={report.requestId} mono />
          )}
          {report.adminNote && <Detail label="یادداشت مدیر" value={report.adminNote} />}
          <Detail label="ثبت" value={new Date(report.createdAt).toLocaleString("fa-IR")} />
        </dl>
      )}
    </li>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className={`min-w-0 break-all ${mono ? "font-mono" : ""}`} dir={mono ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

/* ─────────────────────────────────────── یافتنِ محتوا ─────────────── */

function ContentFinder() {
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<ContentHit[] | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const t = term.trim();
      if (t.length < 2) {
        setHits([]);
        return;
      }
      setHits(await adminFindContent(t));
    });

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-card p-4">
      <div>
        <h2 className="text-base font-bold">یافتنِ محتوا</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          یک مصراع، یک واژه یا متنِ یکی از گزینه‌ها را بنویسید تا بگوید مالِ کدام سؤال و کدام
          بخش است. در <strong>همهٔ</strong> بانک‌های محتوا می‌گردد — عروض سماعی، واژه‌یاب، پلِ
          وزن، مدار دستور، جاسوس، جفت‌ها، نینجا و امتحانات — نه فقط در گزارش‌ها.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          placeholder="مثلاً: صورت احوال من یکباره دیگر گون شدست"
          className="min-h-11 min-w-64 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={pending || term.trim().length < 2}
          onClick={run}
          className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending ? "در حال جست‌وجو…" : "پیدا کن"}
        </button>
      </div>

      {hits !== null && (
        hits.length === 0 ? (
          <p className="rounded-xl bg-muted/40 px-3 py-3 text-center text-xs text-muted-foreground">
            چیزی پیدا نشد. شاید متن با اعرابِ متفاوتی ذخیره شده — بخشِ کوتاه‌تری از آن را
            امتحان کنید.
          </p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
            {hits.map((h, i) => {
              const path = REPORT_AREA_ADMIN_PATH[h.area];
              return (
                <li
                  key={`${h.area}-${h.id}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {REPORT_AREA_LABELS[h.area]}
                      </span>
                      {h.openReports > 0 && (
                        <span className="rounded-lg bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                          {fa(h.openReports)} گزارشِ باز
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-words text-sm">{h.title}</p>
                    {h.subtitle && (
                      <p className="text-[11px] text-muted-foreground">{h.subtitle}</p>
                    )}
                    <p dir="ltr" className="mt-0.5 break-all font-mono text-[10.5px] text-muted-foreground">
                      {h.id}
                    </p>
                  </div>
                  {path && (
                    <a
                      href={path}
                      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs text-primary hover:underline"
                    >
                      رفتن به بخش ←
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}
    </section>
  );
}
