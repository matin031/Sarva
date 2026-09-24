"use client";

import { useMemo, useState, useTransition } from "react";
import {
  aruzRapidAdminBulkAdd,
  aruzRapidAdminDelete,
  aruzRapidAdminList,
  aruzRapidAdminPublish,
  aruzRapidAdminUpsert,
  type AdminRapidAruzQuestion,
  type RapidAruzBulkItem,
} from "@/lib/admin/aruz-rapid-actions";
import { formatUnitSpec, parseUnitSpec, unitPattern, type ParsedUnit } from "@/lib/aruz-rapid/units";
import { fitMeter, RAPID_METERS, scanHemistich } from "@/lib/aruz-rapid/scan";
import { useAdminToast } from "@/components/admin/AdminToast";

/**
 * ⚠️ `units` و `explanation` وقتی null اند یعنی «از تقطیع‌گر بگیر».
 *
 * مصراعِ تازه تا وقتی مدیر به هجاها دست نزده، با هر تغییرِ متن یا وزن از نو
 * تقطیع می‌شود. اولین کلیک روی یک هجا (یا ویرایشِ دستی) آن را قفل می‌کند و
 * «تقطیعِ دوباره» قفل را برمی‌دارد. مصراعِ ذخیره‌شده همیشه قفل باز می‌شود:
 * تقطیعی که مدیر تأیید کرده نباید بی‌صدا عوض شود.
 */
type Draft = {
  id?: string;
  previewText: string;
  meter: string;
  attribution: string;
  isPublished: boolean;
  units: string | null;
  explanation: string | null;
};

const EMPTY_DRAFT: Draft = {
  previewText: "",
  meter: "",
  attribution: "",
  isPublished: true,
  units: null,
  explanation: null,
};

const PAGE = 30;
const fa = (n: number) => n.toLocaleString("fa-IR");
const mark = (length: ParsedUnit["length"]) => (length === "short" ? "U" : "–");
const strip = (s: string) => s.replace(/[\s\u200C-\u200F]/g, "");

const meterLabel = (ark: string) => {
  const m = RAPID_METERS.find((x) => x.ark === ark);
  return m && m.name !== m.ark ? `${m.ark} (${m.name})` : ark;
};

function UnitChip({ unit, onToggle, small }: { unit: ParsedUnit; onToggle?: () => void; small?: boolean }) {
  const tone =
    unit.length === "short"
      ? "border-gold/45 bg-gold/12 text-gold-ink"
      : "border-primary/45 bg-primary/12 text-primary";
  const size = small ? "px-1.5 py-0.5 text-xs" : "min-h-9 px-2.5 py-1 text-sm";
  const lic = unit.license ? "ring-1 ring-gold ring-offset-1 ring-offset-card" : "";
  const licLabel = unit.license === "meter" ? "اختیار وزنی" : unit.license ? "اختیار شاعری" : undefined;
  const body = (
    <>
      <span className="font-bold">{unit.display}</span>
      <span className="font-mono text-[11px] opacity-70">{mark(unit.length)}</span>
      {unit.license && (
        <span className="text-[10px] text-gold" aria-label={licLabel}>
          {unit.license === "meter" ? "^" : "✦"}
        </span>
      )}
    </>
  );

  if (!onToggle) {
    return (
      <span title={licLabel} className={`inline-flex items-center gap-1 rounded-lg border ${size} ${tone} ${lic}`}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      title={licLabel ? `${licLabel} — کوتاه/بلند` : "کوتاه/بلند"}
      className={`inline-flex items-center gap-1.5 rounded-lg border transition-all hover:brightness-110 active:scale-95 ${size} ${tone} ${lic}`}
    >
      {body}
    </button>
  );
}

function MeterSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const known = RAPID_METERS.some((m) => m.ark === value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm"
    >
      <option value="">انتخاب وزن…</option>
      {!known && value && <option value={value}>{value}</option>}
      {RAPID_METERS.map((m) => (
        <option key={m.ark} value={m.ark}>
          {meterLabel(m.ark)}
        </option>
      ))}
    </select>
  );
}

/** نوارِ وضعیت: الگو و این‌که با وزن می‌خواند یا نه. */
function FitBadge({ units, meter }: { units: ParsedUnit[]; meter: string }) {
  if (!meter || units.length === 0) return null;
  const fits = fitMeter(unitPattern(units), meter) !== null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className={fits ? "font-bold text-primary" : "font-bold text-destructive"}>
        {fits ? "با وزن می‌خواند" : "با وزن نمی‌خواند"}
      </span>
      <span dir="ltr" className="font-mono text-muted-foreground">
        {units.map((u) => mark(u.length)).join(" ")}
      </span>
    </div>
  );
}

type BulkRow = { line: number; text: string; poet: string; ok: boolean; units: ParsedUnit[]; notes: string[]; error?: string };

export default function AruzRapidAdminPanel({ initialQuestions }: { initialQuestions: AdminRapidAruzQuestion[] }) {
  const toast = useAdminToast();
  const [questions, setQuestions] = useState(initialQuestions);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bulk, setBulk] = useState<{ text: string; meter: string; poet: string } | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkRow[] | null>(null);
  const [bulkFailures, setBulkFailures] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [meterFilter, setMeterFilter] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [pending, startTransition] = useTransition();

  const published = questions.filter((q) => q.isPublished).length;

  // ── فرمِ تکی: تقطیعِ پیشنهادی، همان تابعی که مدیر هر وقت خواست دوباره صدا می‌زند.
  const draftText = draft?.previewText ?? "";
  const draftMeter = draft?.meter ?? "";
  const scan = useMemo(
    () => (draftText.trim() && draftMeter ? scanHemistich(draftText, draftMeter) : null),
    [draftText, draftMeter],
  );
  const spec = draft?.units ?? (scan ? formatUnitSpec(scan.units) : "");
  const parsed = useMemo(() => (spec.trim() ? parseUnitSpec(spec) : null), [spec]);
  const draftUnits = parsed?.ok ? parsed.units : [];
  const explanation = draft?.explanation ?? (scan?.ok ? scan.notes.join(" · ") : "");
  const draftFits = !!draft?.meter && draftUnits.length > 0 && fitMeter(unitPattern(draftUnits), draft.meter) !== null;

  const refresh = async () => setQuestions(await aruzRapidAdminList());

  const openDraft = (d: Draft) => {
    setBulk(null);
    setBulkRows(null);
    setBulkFailures([]);
    setDraft(d);
  };

  const flipUnit = (index: number) => {
    if (!draft) return;
    // خوانشِ عوض‌شده دیگر همان اختیار نیست؛ اختیارِ تازه را مدیر با «!» می‌نویسد.
    const next = draftUnits.map((u, i) =>
      i === index ? { display: u.display, length: u.length === "short" ? ("long" as const) : ("short" as const) } : u,
    );
    setDraft({ ...draft, units: formatUnitSpec(next) });
  };

  const save = () => {
    if (!draft) return;
    const d = draft;
    startTransition(async () => {
      const res = await aruzRapidAdminUpsert({
        id: d.id,
        previewText: d.previewText,
        unitSpec: spec,
        meter: d.meter,
        attribution: d.attribution,
        explanation,
        hasUnitOverlap: strip(draftUnits.map((u) => u.display).join("")) !== strip(d.previewText),
        isPublished: d.isPublished,
      });
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setDraft(null);
      toast(d.id ? "مصراع ویرایش شد." : "مصراع اضافه شد.", "success");
      await refresh();
    });
  };

  // ── افزودنِ گروهی: همهٔ خط‌ها یک‌جا تقطیع و پیش از ثبت نشان داده می‌شوند.
  const checkBulk = () => {
    if (!bulk) return;
    if (!bulk.meter) {
      toast("وزن را انتخاب کنید.");
      return;
    }
    const rows: BulkRow[] = [];
    bulk.text.split("\n").forEach((raw, i) => {
      const line = raw.trim();
      if (!line || line.startsWith("#")) return;
      const [text, poet] = line.split(/\s*[|\t]\s*/);
      const r = scanHemistich(text, bulk.meter);
      rows.push({
        line: i + 1,
        text,
        poet: poet || bulk.poet,
        ok: r.ok,
        units: r.units,
        notes: r.ok ? r.notes : [],
        error: r.ok ? undefined : r.error,
      });
    });
    if (rows.length === 0) toast("متنی برای بررسی نیست.");
    else if (rows.length > 200) toast("هر بار حداکثر ۲۰۰ مصراع.");
    else setBulkRows(rows);
  };

  const saveBulk = () => {
    if (!bulk || !bulkRows) return;
    const items: RapidAruzBulkItem[] = bulkRows
      .filter((r) => r.ok)
      .map((r) => ({
        line: r.line,
        previewText: r.text,
        unitSpec: formatUnitSpec(r.units),
        meter: bulk.meter,
        attribution: r.poet,
        explanation: r.notes.join(" · "),
        hasUnitOverlap: strip(r.units.map((u) => u.display).join("")) !== strip(r.text),
      }));
    startTransition(async () => {
      const res = await aruzRapidAdminBulkAdd(items);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setBulk(null);
      setBulkRows(null);
      setBulkFailures(res.failures);
      toast(
        [
          `${fa(res.added)} مصراع اضافه شد`,
          res.duplicates > 0 ? `${fa(res.duplicates)} تکراری بود` : "",
          res.failures.length > 0 ? `${fa(res.failures.length)} خط رد شد` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        "success",
      );
      await refresh();
    });
  };

  const togglePublish = (q: AdminRapidAruzQuestion) => {
    startTransition(async () => {
      const res = await aruzRapidAdminPublish(q.id, !q.isPublished);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, isPublished: !x.isPublished } : x)));
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await aruzRapidAdminDelete(id);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setConfirmDeleteId(null);
      toast("مصراع حذف شد.", "success");
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    });
  };

  // ── فهرست
  const meters = useMemo(() => [...new Set(questions.map((q) => q.meter).filter(Boolean))], [questions]);
  const filtered = useMemo(() => {
    const needle = strip(search.replace(/[\u064B-\u0652]/g, ""));
    return questions.filter((q) => {
      if (meterFilter && q.meter !== meterFilter) return false;
      if (!needle) return true;
      const hay = strip((q.previewText + q.attribution).replace(/[\u064B-\u0652]/g, ""));
      return hay.includes(needle);
    });
  }, [questions, search, meterFilter]);

  const bulkOk = bulkRows?.filter((r) => r.ok).length ?? 0;

  return (
    <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">مدیریت «کوتاه یا بلند؟»</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مصراع را با اعراب بنویسید و وزنش را انتخاب کنید؛ هجاها خودکار پیشنهاد می‌شوند و فقط تقطیعی
          ذخیره می‌شود که با وزن بخواند.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {questions.length === 0 ? (
          <p>هنوز مصراعی ثبت نشده. تا اولین مصراع، بازی پنج مصراعِ نمونه را نشان می‌دهد.</p>
        ) : (
          <p>
            <span className="font-bold text-foreground">{fa(published)}</span> مصراعِ منتشرشده از{" "}
            <span className="font-bold text-foreground">{fa(questions.length)}</span>
            {published === 0 && <span className="text-destructive"> · هیچ‌کدام منتشر نشده است.</span>}
          </p>
        )}
      </div>

      {draft ? (
        /* ── فرمِ تکی ─────────────────────────────────────────── */
        <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h3 className="mb-3 font-bold">{draft.id ? "ویرایش مصراع" : "مصراع تازه"}</h3>

          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">متن مصراع (با اعراب)</span>
              <input
                value={draft.previewText}
                onChange={(e) => setDraft({ ...draft, previewText: e.target.value })}
                className="min-h-11 rounded-xl border border-border bg-card px-3 text-base"
                placeholder="تَوانا بُوَد هَر کِه دانا بُوَد"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">وزن</span>
              <MeterSelect value={draft.meter} onChange={(meter) => setDraft({ ...draft, meter })} />
            </label>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            {!draft.previewText.trim() || !draft.meter ? (
              <p className="text-xs text-muted-foreground">متن و وزن را وارد کنید تا هجاها پیشنهاد شوند.</p>
            ) : parsed && !parsed.ok ? (
              <p className="text-xs text-destructive">{parsed.error}</p>
            ) : (
              <>
                <FitBadge units={draftUnits} meter={draft.meter} />
                {draft.units === null && scan && !scan.ok && (
                  <p className="mt-1 text-xs text-destructive">
                    {scan.error} اعراب را بررسی کنید یا هجاها را دستی اصلاح کنید.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {draftUnits.map((u, i) => (
                    <UnitChip key={i} unit={u} onToggle={() => flipUnit(i)} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>برای عوض کردن کوتاه/بلند روی هجا بزنید.</span>
                  {draft.units !== null && (
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, units: null, explanation: null })}
                      className="font-bold text-primary hover:underline"
                    >
                      تقطیع دوباره
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground">ویرایش دستی هجاها</summary>
            <p className="mt-2 text-xs text-muted-foreground">
              هر هجا به شکل <span dir="ltr">متن=U</span> (کوتاه) یا <span dir="ltr">متن=-</span> (بلند)، با فاصله.
              هجا را همان‌طور که شنیده می‌شود بنویسید: «بوده است» ← <span dir="ltr">بو=- دَس=- ت=U</span>
              <br />
              اختیار شاعری: <span dir="ltr">!</span> بعد از نماد (<span dir="ltr">کِه=-!</span>)؛ اختیار وزنی:{" "}
              <span dir="ltr">^</span> (<span dir="ltr">دَش=-^</span>). به دانش‌آموز پیش از بازی نشان داده می‌شود.
            </p>
            <textarea
              value={spec}
              onChange={(e) => setDraft({ ...draft, units: e.target.value })}
              rows={3}
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm leading-8"
            />
          </details>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">شاعر</span>
              <input
                value={draft.attribution}
                onChange={(e) => setDraft({ ...draft, attribution: e.target.value })}
                className="min-h-10 rounded-xl border border-border bg-card px-3"
                placeholder="فردوسی"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">توضیح در صفحهٔ نتیجه</span>
              <input
                value={explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                className="min-h-10 rounded-xl border border-border bg-card px-3 text-xs"
              />
            </label>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isPublished}
              onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
              className="size-4"
            />
            <span>منتشر شود</span>
          </label>

          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={pending || !draftFits}
              className="min-h-10 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
            >
              {pending ? "در حال ذخیره…" : "ذخیره"}
            </button>
            <button
              onClick={() => setDraft(null)}
              className="min-h-10 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : bulk ? (
        /* ── افزودنِ گروهی ────────────────────────────────────── */
        <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h3 className="mb-3 font-bold">افزودن گروهی</h3>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <MeterSelect
              value={bulk.meter}
              onChange={(meter) => {
                setBulk({ ...bulk, meter });
                setBulkRows(null);
              }}
            />
            <input
              value={bulk.poet}
              onChange={(e) => {
                setBulk({ ...bulk, poet: e.target.value });
                setBulkRows(null);
              }}
              className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm"
              placeholder="شاعر (برای همهٔ خط‌ها)"
            />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            هر خط یک مصراعِ اعراب‌دار. برای شاعرِ جدا: <span dir="ltr">مصراع | شاعر</span>. خطِ آغازشده با{" "}
            <span dir="ltr">#</span> نادیده گرفته می‌شود.
          </p>
          <textarea
            value={bulk.text}
            onChange={(e) => {
              setBulk({ ...bulk, text: e.target.value });
              setBulkRows(null);
            }}
            rows={7}
            className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm leading-8"
            placeholder={"تَوانا بُوَد هَر کِه دانا بُوَد\nزِ دانِش دِلِ پیر بُرنا بُوَد | فردوسی"}
          />

          {bulkRows && (
            <div className="mt-3 rounded-xl border border-border bg-card p-3">
              <p className="mb-2 text-xs">
                <span className="font-bold text-primary">{fa(bulkOk)} مصراع آماده</span>
                {bulkRows.length > bulkOk && (
                  <span className="text-destructive"> · {fa(bulkRows.length - bulkOk)} خط با وزن نمی‌خواند</span>
                )}
              </p>
              <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                {bulkRows.map((r) => (
                  <li
                    key={r.line}
                    className={`rounded-lg border p-2 ${r.ok ? "border-border" : "border-destructive/40 bg-destructive/5"}`}
                  >
                    <div className="flex items-start justify-between gap-2 text-sm">
                      <span>
                        <span className="text-xs text-muted-foreground">خط {fa(r.line)} · </span>
                        {r.text}
                      </span>
                      {!r.ok && (
                        <button
                          type="button"
                          onClick={() =>
                            openDraft({ ...EMPTY_DRAFT, previewText: r.text, meter: bulk.meter, attribution: r.poet })
                          }
                          className="shrink-0 text-xs font-bold text-primary hover:underline"
                        >
                          اصلاح در فرم
                        </button>
                      )}
                    </div>
                    {r.ok ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {r.units.map((u, k) => (
                          <UnitChip key={k} unit={u} small />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-destructive">{r.error}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {bulkRows ? (
              <button
                onClick={saveBulk}
                disabled={pending || bulkOk === 0}
                className="min-h-10 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
              >
                {pending ? "در حال افزودن…" : `افزودن ${fa(bulkOk)} مصراع`}
              </button>
            ) : (
              <button
                onClick={checkBulk}
                disabled={!bulk.text.trim()}
                className="min-h-10 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
              >
                بررسی خط‌ها
              </button>
            )}
            <button
              onClick={() => {
                setBulk(null);
                setBulkRows(null);
              }}
              className="min-h-10 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => openDraft({ ...EMPTY_DRAFT })}
            className="min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90"
          >
            + افزودن مصراع
          </button>
          <button
            onClick={() => {
              setDraft(null);
              setBulkFailures([]);
              setBulk({ text: "", meter: "", poet: "" });
            }}
            className="min-h-11 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
          >
            افزودن گروهی
          </button>
        </div>
      )}

      {bulkFailures.length > 0 && (
        <div className="mb-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="mb-2 font-bold text-destructive">این خط‌ها اضافه نشدند:</p>
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {bulkFailures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── فهرست ─────────────────────────────────────────────── */}
      {questions.length > 0 && (
        <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_16rem]">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShown(PAGE);
            }}
            className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm"
            placeholder="جست‌وجو در متن یا شاعر"
          />
          <select
            value={meterFilter}
            onChange={(e) => {
              setMeterFilter(e.target.value);
              setShown(PAGE);
            }}
            className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="">همهٔ وزن‌ها</option>
            {meters.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      {questions.length > 0 && filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">مصراعی پیدا نشد.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.slice(0, shown).map((q) => (
            <div
              key={q.id}
              className={`rounded-2xl border bg-card p-4 ${
                q.isPublished ? "border-border" : "border-dashed border-border opacity-75"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-base font-bold">{q.previewText}</span>
                {!q.isPublished && (
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                    پیش‌نویس
                  </span>
                )}
              </div>

              <div className="mb-2 flex flex-wrap gap-1">
                {q.units.map((u, k) => (
                  <UnitChip key={k} unit={u} small />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {[q.meter, q.attribution].filter(Boolean).join(" · ") || "بدون وزن"}
                </p>

                {confirmDeleteId === q.id ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => remove(q.id)}
                      disabled={pending}
                      className="min-h-9 rounded-lg bg-destructive px-3 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                    >
                      حذف
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="min-h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground"
                    >
                      انصراف
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <button
                      onClick={() => togglePublish(q)}
                      disabled={pending}
                      className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50 disabled:opacity-50"
                    >
                      {q.isPublished ? "برداشتن انتشار" : "انتشار"}
                    </button>
                    <button
                      onClick={() =>
                        openDraft({
                          id: q.id,
                          previewText: q.previewText,
                          meter: q.meter,
                          attribution: q.attribution,
                          isPublished: q.isPublished,
                          units: q.unitSpec,
                          explanation: q.explanation,
                        })
                      }
                      className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50"
                    >
                      ویرایش
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(q.id)}
                      className="min-h-9 rounded-lg border border-border px-3 text-sm text-destructive hover:bg-destructive/10"
                    >
                      حذف
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filtered.length > shown && (
            <button
              onClick={() => setShown((n) => n + PAGE)}
              className="min-h-10 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:border-primary/50"
            >
              نمایش بیشتر ({fa(filtered.length - shown)})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
