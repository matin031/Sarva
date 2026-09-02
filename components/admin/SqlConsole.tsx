"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  adminRunSql,
  type SchemaTable,
  type SqlRunResult,
  type SqlStatementResult,
} from "@/lib/admin/sql-console";
import {
  MAX_CELL_CHARS,
  MAX_RESULT_ROWS,
  SQL_SNIPPETS,
  type SqlSnippet,
} from "@/lib/admin/sql-constants";
import { useAdminToast } from "@/components/admin/AdminToast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/**
 * کنسول SQL.
 *
 * چیدمانش یک تصمیم عمدی دارد: ویرایشگر بالا، و *همیشه* زیرش دو چیز — الگوهای
 * آماده و ساختار واقعیِ جدول‌ها. کسی که SQL نمی‌نویسد نباید مجبور باشد نام
 * ستون‌ها را از جایی حفظ کند یا در فایل‌های migration دنبالشان بگردد.
 *
 * و دو دکمهٔ جدا، نه یکی:
 *
 *   • «پیش‌نمایش» کوئری را واقعاً اجرا می‌کند ولی در پایان rollback می‌زند.
 *     یعنی می‌بینید چند ردیف تحت‌تأثیر *می‌شد*، بدون اینکه بشود.
 *   • «ثبت نهایی» تازه commit می‌کند و پشتِ یک دیالوگ تأیید است.
 *
 * این ترتیب اتفاقی نیست: خطرناک‌ترین کارِ ممکن نباید دکمهٔ پیش‌فرض باشد.
 */

const fa = (n: number) => n.toLocaleString("fa-IR");

type Props = { schema: SchemaTable[] };

export default function SqlConsole({ schema }: Props) {
  const toast = useAdminToast();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [sql, setSql] = useState("");
  const [result, setResult] = useState<SqlRunResult | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [confirmCommit, setConfirmCommit] = useState(false);
  const [pending, startTransition] = useTransition();

  const trimmed = sql.trim();

  /** آیا این کوئری چیزی را عوض می‌کند؟ فقط برای *ظاهرِ* دکمه‌هاست؛ تصمیمِ
   *  واقعی سمت سرور گرفته می‌شود. */
  const looksWriting = useMemo(
    () => /\b(insert|update|delete|truncate|drop|alter|create)\b/i.test(trimmed),
    [trimmed],
  );

  const run = (mode: "preview" | "commit") => {
    if (!trimmed) {
      toast("کوئری خالی است.");
      return;
    }
    startTransition(async () => {
      const out = await adminRunSql(trimmed, mode);
      setResult(out);
      setActiveTab(0);
      if (out.ok && mode === "commit") {
        toast(`ثبت شد — ${fa(out.statements.reduce((s, x) => s + x.rowCount, 0))} ردیف.`, "success");
      }
    });
  };

  const insertSnippet = (snippet: SqlSnippet) => {
    // جایگزین می‌شود و نه اضافه: چسباندنِ الگوی تازه به کوئریِ نیمه‌کاره
    // چیزی می‌سازد که هیچ‌کدام نیست. اگر متنی هست، اول تأیید می‌گیریم.
    if (trimmed && !window.confirm("متن فعلی ویرایشگر جایگزین شود؟")) return;
    setSql(snippet.sql);
    setResult(null);
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <div dir="rtl" className="flex max-w-6xl flex-col gap-6 p-4 xs:p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">کنسول SQL</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          برای کارهای انبوهی که با فرم نمی‌شود: وارد کردن صدها سؤال، پاک کردن یک درس، اصلاح
          گروهی. اگر مطمئن نیستید، همیشه اول «پیش‌نمایش» بزنید — کوئری واقعاً اجرا می‌شود ولی
          در پایان برمی‌گردد و هیچ چیزی ذخیره نمی‌ماند.
        </p>
      </header>

      <DangerNote />

      {/* ─────────────────────────────────────────────── ویرایشگر ─────── */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <textarea
          ref={editorRef}
          dir="ltr"
          spellCheck={false}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/⌘+Enter = پیش‌نمایش. ثبت نهایی عمداً میان‌بر ندارد.
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              run("preview");
            }
          }}
          rows={12}
          placeholder={"-- کوئری خود را اینجا بنویسید، یا از الگوهای پایین یکی را انتخاب کنید\nselect * from users limit 10;"}
          className="min-h-56 w-full resize-y rounded-xl border border-border bg-background p-3 text-left font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending || !trimmed}
            onClick={() => run("preview")}
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {pending ? "در حال اجرا…" : "پیش‌نمایش (بدون ذخیره)"}
          </button>

          <button
            type="button"
            disabled={pending || !trimmed}
            onClick={() => setConfirmCommit(true)}
            className={`min-h-11 rounded-xl border px-5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              looksWriting
                ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            ثبت نهایی
          </button>

          <button
            type="button"
            disabled={pending || (!trimmed && !result)}
            onClick={() => {
              setSql("");
              setResult(null);
            }}
            className="min-h-11 rounded-xl px-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            پاک کردن
          </button>

          <span className="mr-auto text-[11px] text-muted-foreground">
            Ctrl + Enter = پیش‌نمایش
          </span>
        </div>
      </section>

      {/* ───────────────────────────────────────────────── نتیجه ─────── */}
      {result && (
        <ResultPanel
          result={result}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
      )}

      {/* ───────────────────────────────────────────────── الگوها ─────── */}
      <SnippetLibrary onPick={insertSnippet} />

      {/* ──────────────────────────────────────── راهنمای جدول‌ها ─────── */}
      <SchemaBrowser schema={schema} onPickTable={(name) => {
        if (trimmed && !window.confirm("متن فعلی ویرایشگر جایگزین شود؟")) return;
        setSql(`select * from ${name} limit 50;`);
        setResult(null);
        requestAnimationFrame(() => editorRef.current?.focus());
      }} />

      <ConfirmDialog
        open={confirmCommit}
        title="ثبت نهایی کوئری"
        body="این بار برخلاف پیش‌نمایش، تغییرات واقعاً ذخیره می‌شوند و برگشتی در کار نیست."
        consequence={
          looksWriting
            ? "کوئری شما دستور تغییردهنده دارد (insert / update / delete / …). اگر هنوز پیش‌نمایش نگرفته‌اید، اول آن را بزنید."
            : undefined
        }
        tone={looksWriting ? "danger" : "primary"}
        requireTyping={looksWriting ? "ثبت" : undefined}
        confirmLabel="اجرا و ذخیره کن"
        onConfirm={() => {
          setConfirmCommit(false);
          run("commit");
        }}
        onCancel={() => setConfirmCommit(false)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function DangerNote() {
  return (
    <div className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-destructive">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      <div className="flex flex-col gap-1.5 text-xs leading-relaxed">
        <p className="text-sm font-semibold text-destructive">این صفحه مستقیم به دیتابیس وصل است</p>
        <p className="text-muted-foreground">
          هر اجرا — چه پیش‌نمایش و چه ثبت — با متن کامل کوئری در «فعالیت و خطاها» ثبت می‌شود.
          لاگ ممیزی و جدول migration ها فقط خواندنی‌اند. دستورهایی که می‌توانند سرور را از بین
          ببرند (drop database، خواندن فایل، اجرای دستور سیستمی) اصلاً اجرا نمی‌شوند.
        </p>
        <p className="text-muted-foreground">
          تغییر ماندگارِ <em>ساختار</em> جدول‌ها (alter table) را اینجا نزنید — یک فایل تازه در
          <code className="mx-1 rounded bg-muted px-1 font-mono" dir="ltr">migrations/</code>
          بسازید، وگرنه سرور بعدی این تغییر را ندارد.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── نتیجه ──────── */

function ResultPanel({
  result,
  activeTab,
  onSelectTab,
}: {
  result: SqlRunResult;
  activeTab: number;
  onSelectTab: (i: number) => void;
}) {
  if (!result.ok) {
    return (
      <section className="flex flex-col gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
            خطا
          </span>
          {result.code && (
            <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              {result.code}
            </code>
          )}
          {result.position !== null && (
            <span className="text-[11px] text-muted-foreground">
              نویسهٔ {fa(result.position)}
            </span>
          )}
        </div>
        <p dir="ltr" className="whitespace-pre-wrap break-words text-left font-mono text-xs">
          {result.error}
        </p>
        {result.hint && (
          <p dir="ltr" className="whitespace-pre-wrap break-words text-left font-mono text-[11px] text-muted-foreground">
            {result.hint}
          </p>
        )}
      </section>
    );
  }

  const statements = result.statements;
  const current = statements[Math.min(activeTab, statements.length - 1)];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
            result.committed
              ? "bg-primary/15 text-primary"
              : "bg-gold/15 text-gold-ink dark:text-gold"
          }`}
        >
          {result.committed ? "ثبت شد" : "پیش‌نمایش — ذخیره نشد"}
        </span>
        <span className="text-xs text-muted-foreground">
          {fa(statements.length)} دستور · {fa(result.durationMs)} میلی‌ثانیه
        </span>
      </div>

      {result.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-gold/40 bg-gold/5 p-3 text-xs">
          {result.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <span aria-hidden className="text-gold-ink dark:text-gold">•</span>
              {w}
            </li>
          ))}
        </ul>
      )}

      {statements.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {statements.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectTab(i)}
              className={`rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                i === activeTab
                  ? "bg-primary/15 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {i + 1}. {s.command || "—"}
            </button>
          ))}
        </div>
      )}

      {current && <StatementResult statement={current} />}
    </section>
  );
}

function StatementResult({ statement }: { statement: SqlStatementResult }) {
  const hasGrid = statement.columns.length > 0 && statement.rows.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        <span className="font-mono" dir="ltr">{statement.command || "—"}</span>
        {" · "}
        {fa(statement.rowCount)} ردیف
        {statement.truncated && ` (فقط ${fa(MAX_RESULT_ROWS)} ردیف اول نمایش داده می‌شود)`}
      </p>

      {hasGrid ? (
        <div className="max-h-[28rem] overflow-auto rounded-xl border border-border">
          <table dir="ltr" className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {statement.columns.map((c) => (
                  <th key={c.name} className="whitespace-nowrap border-b border-border px-3 py-2 font-mono font-semibold">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statement.rows.map((row, i) => (
                <tr key={i} className="odd:bg-muted/30">
                  {row.map((cell, j) => (
                    <td key={j} className="max-w-xs border-b border-border/60 px-3 py-1.5 align-top font-mono">
                      {cell === null ? (
                        <span className="text-muted-foreground">null</span>
                      ) : (
                        <span className="block truncate" title={cell}>
                          {cell.length > MAX_CELL_CHARS ? `${cell.slice(0, MAX_CELL_CHARS)}…` : cell}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">
          {statement.rowCount > 0
            ? `${fa(statement.rowCount)} ردیف تحت تأثیر قرار گرفت (این دستور ردیفی برنمی‌گرداند).`
            : "این دستور هیچ ردیفی برنگرداند."}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── الگوها ────── */

function SnippetLibrary({ onPick }: { onPick: (s: SqlSnippet) => void }) {
  const [openGroup, setOpenGroup] = useState<string>(SQL_SNIPPETS[0]?.key ?? "");

  const group = SQL_SNIPPETS.find((g) => g.key === openGroup) ?? SQL_SNIPPETS[0];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="text-base font-bold">الگوهای آماده</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          روی هر الگو بزنید تا در ویرایشگر بنشیند؛ بعد فقط مقدارها را عوض کنید. لازم نیست نام
          ستون‌ها را از حفظ باشید.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SQL_SNIPPETS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setOpenGroup(g.key)}
            className={`min-h-9 rounded-xl px-3 text-xs transition-colors ${
              g.key === group?.key
                ? "bg-primary/15 font-semibold text-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>

      {group?.note && (
        <p className="rounded-xl bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {group.note}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {group?.snippets.map((s) => (
          <li key={s.title} className="rounded-xl border border-border">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground group-open:hidden">
                  دیدن کد
                </span>
              </summary>

              <div className="flex flex-col gap-2 border-t border-border p-3">
                <pre
                  dir="ltr"
                  className="max-h-72 overflow-auto rounded-lg bg-muted/60 p-3 text-left font-mono text-[11px] leading-relaxed"
                >
                  {s.sql}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onPick(s)}
                    className="min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  >
                    گذاشتن در ویرایشگر
                  </button>
                  <CopyButton text={s.sql} />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* مبدأ ناامن — انتخاب دستی همچنان ممکن است */
        }
      }}
      className="min-h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
    >
      {done ? "کپی شد" : "کپی"}
    </button>
  );
}

/* ─────────────────────────────────────────── راهنمای جدول‌ها ────── */

function SchemaBrowser({
  schema,
  onPickTable,
}: {
  schema: SchemaTable[];
  onPickTable: (name: string) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return schema;
    return schema.filter(
      (t) =>
        t.name.includes(needle) ||
        t.columns.some((c) => c.name.includes(needle)),
    );
  }, [schema, q]);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">راهنمای جدول‌ها</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            مستقیم از خودِ دیتابیس خوانده می‌شود، پس همیشه به‌روز است. روی نام هر جدول بزنید تا
            یک <span className="font-mono" dir="ltr">select</span> ساده از آن در ویرایشگر بنشیند.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جست‌وجوی جدول یا ستون…"
          className="min-h-10 w-56 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">چیزی پیدا نشد.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {filtered.map((table) => (
            <li key={table.name} className="rounded-xl border border-border">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <code dir="ltr" className="font-mono text-sm font-semibold">{table.name}</code>
                    <span className="text-[11px] text-muted-foreground">
                      {fa(table.columns.length)} ستون
                      {table.approxRows > 0 && ` · حدود ${fa(table.approxRows)} ردیف`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onPickTable(table.name);
                    }}
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    نمونه بگیر
                  </button>
                </summary>

                {/* ⚠️ محدودیت‌ها بالای فهرست ستون‌ها می‌آیند و نه پایینش:
                    «grade فقط dahom/yazdahom/davazdahom را می‌پذیرد» چیزی است
                    که *قبل* از نوشتن insert باید دیده شود، نه بعد از خطا. */}
                {table.constraints.length > 0 && (
                  <div className="border-t border-border bg-gold/5 px-3 py-2">
                    <p className="mb-1 text-[11px] font-semibold">مقدارهای مجاز و یکتایی‌ها</p>
                    <ul className="flex flex-col gap-0.5">
                      {table.constraints.map((c) => (
                        <li key={c.name} dir="ltr" className="break-all text-left font-mono text-[10.5px] text-muted-foreground">
                          {c.definition}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="overflow-x-auto border-t border-border">
                  <table dir="ltr" className="w-full border-collapse text-left text-[11px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-1.5 font-semibold">column</th>
                        <th className="px-3 py-1.5 font-semibold">type</th>
                        <th className="px-3 py-1.5 font-semibold">null?</th>
                        <th className="px-3 py-1.5 font-semibold">default</th>
                        <th className="px-3 py-1.5 font-semibold">→</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {table.columns.map((c) => (
                        <tr key={c.name} className="odd:bg-muted/20">
                          <td className="whitespace-nowrap px-3 py-1">
                            {c.name}
                            {c.isPrimaryKey && (
                              <span className="ml-1 rounded bg-primary/15 px-1 text-[9px] text-primary">PK</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-1 text-muted-foreground">{c.type}</td>
                          <td className="px-3 py-1 text-muted-foreground">{c.nullable ? "yes" : "no"}</td>
                          <td className="max-w-40 truncate px-3 py-1 text-muted-foreground" title={c.default ?? ""}>
                            {c.default ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-1 text-muted-foreground">
                            {c.references ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
