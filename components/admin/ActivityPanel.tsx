"use client";

import { useState, useTransition } from "react";
import {
  adminListAudit,
  adminListErrors,
  adminResolveAllErrors,
  adminResolveError,
  adminTestErrorLog,
  type AuditRow,
  type ErrorRow,
} from "@/lib/admin/log-actions";
import {
  AUDIT_PAGE_SIZE,
  ERROR_PAGE_SIZE,
  ERROR_SOURCE_LABELS,
} from "@/lib/admin/log-constants";
import { useAdminToast } from "@/components/admin/AdminToast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/** «۳ دقیقه پیش» — یک تاریخ کامل برای چیزی که همین الان افتاده، نویز است. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "همین الان";
  if (min < 60) return `${min.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days.toLocaleString("fa-IR")} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
}

function fullTime(iso: string): string {
  return new Date(iso).toLocaleString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  initialAudit: { rows: AuditRow[]; total: number };
  initialErrors: { rows: ErrorRow[]; total: number; openCount: number };
  actors: { id: string; email: string }[];
  actions: { action: string; label: string; count: number }[];
};

export default function ActivityPanel({ initialAudit, initialErrors, actors, actions }: Props) {
  const toast = useAdminToast();
  const [tab, setTab] = useState<"audit" | "errors">(
    // اگر خطای رسیدگی‌نشده‌ای هست، همان اول نشان داده می‌شود — چیزی که نیاز به
    // توجه دارد نباید پشت یک کلیک پنهان باشد.
    initialErrors.openCount > 0 ? "errors" : "audit",
  );

  return (
    <div dir="rtl" className="flex max-w-4xl flex-col gap-6 p-4 xs:p-6">
      <div>
        <h1 className="text-2xl font-bold">فعالیت و خطاها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          هر کاری که مدیران در پنل انجام می‌دهند اینجا ثبت می‌شود، و هر خطایی که سرور می‌دهد
          هم. این صفحه فقط خواندنی است — چیزی از آن پاک نمی‌شود.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <TabButton active={tab === "audit"} onClick={() => setTab("audit")}>
          فعالیت مدیران
        </TabButton>
        <TabButton active={tab === "errors"} onClick={() => setTab("errors")}>
          خطاهای سرور
          {initialErrors.openCount > 0 && (
            <span className="mr-2 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
              {initialErrors.openCount.toLocaleString("fa-IR")}
            </span>
          )}
        </TabButton>
      </div>

      {tab === "audit" ? (
        <AuditTab initial={initialAudit} actors={actors} actions={actions} />
      ) : (
        <ErrorsTab initial={initialErrors} toast={toast} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex min-h-11 items-center border-b-2 px-4 text-sm transition-colors ${
        active
          ? "border-primary font-semibold text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// فعالیت مدیران
// ---------------------------------------------------------------------------

function AuditTab({
  initial,
  actors,
  actions,
}: {
  initial: { rows: AuditRow[]; total: number };
  actors: { id: string; email: string }[];
  actions: { action: string; label: string; count: number }[];
}) {
  const [rows, setRows] = useState(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [destructiveOnly, setDestructiveOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = (
    next: { actorId?: string; action?: string; destructiveOnly?: boolean },
    append = false,
  ) => {
    startTransition(async () => {
      const result = await adminListAudit({
        actorId: (next.actorId ?? actorId) || undefined,
        action: (next.action ?? action) || undefined,
        destructiveOnly: next.destructiveOnly ?? destructiveOnly,
        limit: AUDIT_PAGE_SIZE,
        offset: append ? rows.length : 0,
      });
      setTotal(result.total);
      setRows((prev) => (append ? [...prev, ...result.rows] : result.rows));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={actorId}
          onChange={(e) => {
            setActorId(e.target.value);
            load({ actorId: e.target.value });
          }}
          className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">همهٔ مدیران</option>
          {actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.email}
            </option>
          ))}
        </select>

        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            load({ action: e.target.value });
          }}
          className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">همهٔ کارها</option>
          {actions.map((a) => (
            <option key={a.action} value={a.action}>
              {a.label} ({a.count.toLocaleString("fa-IR")})
            </option>
          ))}
        </select>

        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
          <input
            type="checkbox"
            checked={destructiveOnly}
            onChange={(e) => {
              setDestructiveOnly(e.target.checked);
              load({ destructiveOnly: e.target.checked });
            }}
            className="size-4 accent-destructive"
          />
          فقط کارهای برگشت‌ناپذیر
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="هنوز فعالیتی ثبت نشده"
          body="هر تغییری که از پنل انجام بدهید — تأیید سروده، حذف واژه، تغییر نقش — از همین حالا اینجا ثبت می‌شود."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`rounded-2xl border bg-card p-4 ${
                row.destructive ? "border-destructive/30" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                        row.destructive
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {row.actionLabel}
                    </span>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {row.actorEmail}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm">{row.summary}</p>
                </div>
                <time
                  className="shrink-0 text-xs text-muted-foreground"
                  title={fullTime(row.createdAt)}
                >
                  {relativeTime(row.createdAt)}
                </time>
              </div>

              {(Object.keys(row.metadata).length > 0 || row.ip) && (
                <>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {expanded === row.id ? "بستن جزئیات" : "جزئیات فنی"}
                  </button>
                  {expanded === row.id && (
                    <dl className="mt-2 flex flex-col gap-1 rounded-xl bg-muted/40 p-3 text-xs">
                      {row.ip && (
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">آدرس شبکه:</dt>
                          <dd dir="ltr" className="font-mono">
                            {row.ip}
                          </dd>
                        </div>
                      )}
                      {Object.entries(row.metadata).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-muted-foreground" dir="ltr">
                            {k}:
                          </dt>
                          <dd className="min-w-0 break-all">{String(v)}</dd>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">زمان دقیق:</dt>
                        <dd>{fullTime(row.createdAt)}</dd>
                      </div>
                    </dl>
                  )}
                </>
              )}
            </li>
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
          {pending
            ? "در حال بارگذاری…"
            : `نمایش بیشتر (${rows.length.toLocaleString("fa-IR")} از ${total.toLocaleString("fa-IR")})`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// خطاهای سرور
// ---------------------------------------------------------------------------

function ErrorsTab({
  initial,
  toast,
}: {
  initial: { rows: ErrorRow[]; total: number; openCount: number };
  toast: (message: string, tone?: "error" | "success") => void;
}) {
  const [rows, setRows] = useState(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [openCount, setOpenCount] = useState(initial.openCount);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmResolveAll, setConfirmResolveAll] = useState(false);
  const [pending, startTransition] = useTransition();

  const reload = (opts: { includeResolved?: boolean } = {}, append = false) => {
    startTransition(async () => {
      const result = await adminListErrors({
        includeResolved: opts.includeResolved ?? includeResolved,
        limit: ERROR_PAGE_SIZE,
        offset: append ? rows.length : 0,
      });
      setTotal(result.total);
      setOpenCount(result.openCount);
      setRows((prev) => (append ? [...prev, ...result.rows] : result.rows));
    });
  };

  const resolve = (id: string) => {
    startTransition(async () => {
      const result = await adminResolveError(id);
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast("رسیدگی‌شده علامت خورد.", "success");
      reload();
    });
  };

  const resolveAll = () => {
    setConfirmResolveAll(false);
    startTransition(async () => {
      const result = await adminResolveAllErrors();
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast(`${result.data.count.toLocaleString("fa-IR")} خطا رسیدگی‌شده علامت خورد.`, "success");
      reload();
    });
  };

  const runTest = () => {
    startTransition(async () => {
      await adminTestErrorLog("error");
      toast("یک خطای آزمایشی ثبت شد.", "success");
      reload();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
          <input
            type="checkbox"
            checked={includeResolved}
            onChange={(e) => {
              setIncludeResolved(e.target.checked);
              reload({ includeResolved: e.target.checked });
            }}
            className="size-4 accent-primary"
          />
          نمایش خطاهای رسیدگی‌شده
        </label>

        {openCount > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmResolveAll(true)}
            className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            رسیدگی به همه ({openCount.toLocaleString("fa-IR")})
          </button>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={runTest}
          className="min-h-10 rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
          title="یک ردیف آزمایشی می‌سازد تا مطمئن شوید این بخش کار می‌کند"
        >
          ثبت خطای آزمایشی
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={includeResolved ? "هیچ خطایی ثبت نشده" : "هیچ خطای رسیدگی‌نشده‌ای نیست"}
          body="این یعنی سرور بی‌مشکل کار می‌کند. اگر روزی ایمیلی نرود یا صفحه‌ای خطا بدهد، اینجا خبردار می‌شوید."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`rounded-2xl border bg-card p-4 ${
                row.resolvedAt ? "border-border opacity-70" : "border-destructive/30"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {ERROR_SOURCE_LABELS[row.source] ?? row.source}
                    </span>
                    {row.occurrences > 1 && (
                      <span className="rounded-lg bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
                        {row.occurrences.toLocaleString("fa-IR")} بار
                      </span>
                    )}
                    {row.resolvedAt && (
                      <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                        رسیدگی‌شده
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 break-words text-sm">{row.message}</p>
                  {row.context && (
                    <p className="mt-1 text-xs text-muted-foreground">در: {row.context}</p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground" title={fullTime(row.lastSeenAt)}>
                  {relativeTime(row.lastSeenAt)}
                </time>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                {row.detail && (
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {expanded === row.id ? "بستن جزئیات فنی" : "جزئیات فنی"}
                  </button>
                )}
                {!row.resolvedAt && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => resolve(row.id)}
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                  >
                    رسیدگی شد
                  </button>
                )}
                {row.occurrences > 1 && (
                  <span className="text-xs text-muted-foreground">
                    اولین بار: {fullTime(row.firstSeenAt)}
                  </span>
                )}
              </div>

              {expanded === row.id && row.detail && (
                <pre
                  dir="ltr"
                  className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted/60 p-3 text-left font-mono text-[11px] leading-relaxed"
                >
                  {row.detail}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && rows.length < total && (
        <button
          type="button"
          disabled={pending}
          onClick={() => reload({}, true)}
          className="min-h-11 rounded-xl border border-border bg-card text-sm text-muted-foreground disabled:opacity-60"
        >
          {pending
            ? "در حال بارگذاری…"
            : `نمایش بیشتر (${rows.length.toLocaleString("fa-IR")} از ${total.toLocaleString("fa-IR")})`}
        </button>
      )}

      <ConfirmDialog
        open={confirmResolveAll}
        title="رسیدگی به همهٔ خطاها"
        body={`${openCount.toLocaleString("fa-IR")} خطا از فهرست فعال بیرون می‌روند. اگر همان خطاها دوباره رخ بدهند، دوباره اینجا ظاهر می‌شوند.`}
        confirmLabel="همه را علامت بزن"
        onConfirm={resolveAll}
        onCancel={() => setConfirmResolveAll(false)}
      />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
