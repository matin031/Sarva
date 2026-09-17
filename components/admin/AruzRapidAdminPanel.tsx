"use client";

import { useMemo, useState, useTransition } from "react";
import {
  aruzRapidAdminBulkAdd,
  aruzRapidAdminDelete,
  aruzRapidAdminList,
  aruzRapidAdminPublish,
  aruzRapidAdminUpsert,
  type AdminRapidAruzQuestion,
} from "@/lib/admin/aruz-rapid-actions";
import { formatUnitSpec, parseUnitSpec, type ParsedUnit } from "@/lib/aruz-rapid/units";
import { useAdminToast } from "@/components/admin/AdminToast";

type Draft = {
  id?: string;
  previewText: string;
  unitSpec: string;
  meter: string;
  attribution: string;
  explanation: string;
  hasUnitOverlap: boolean;
  isPublished: boolean;
};

const EMPTY_DRAFT: Draft = {
  previewText: "",
  unitSpec: "",
  meter: "",
  attribution: "",
  explanation: "",
  hasUnitOverlap: false,
  isPublished: true,
};

const fa = (n: number) => n.toLocaleString("fa-IR");

/** نمادِ هجا، همان‌طور که در خودِ بازی دیده می‌شود. */
const mark = (length: ParsedUnit["length"]) => (length === "short" ? "U" : "–");

/** یک هجا، رنگ‌شده به کوتاه/بلند. در فهرست فقط دیده می‌شود؛ در فرم کلیک‌شدنی است. */
function UnitChip({
  unit,
  onToggle,
}: {
  unit: ParsedUnit;
  onToggle?: () => void;
}) {
  const tone =
    unit.length === "short"
      ? "border-gold/45 bg-gold/12 text-gold-ink"
      : "border-primary/45 bg-primary/12 text-primary";

  const body = (
    <>
      <span className="font-bold">{unit.display}</span>
      <span className="font-mono text-[11px] opacity-70">{mark(unit.length)}</span>
    </>
  );

  if (!onToggle) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm ${tone}`}>
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      title="برای عوض کردنِ کوتاه/بلند کلیک کنید"
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-all hover:brightness-110 active:scale-95 ${tone}`}
    >
      {body}
    </button>
  );
}

export default function AruzRapidAdminPanel({
  initialQuestions,
}: {
  initialQuestions: AdminRapidAruzQuestion[];
}) {
  const toast = useAdminToast();
  const [questions, setQuestions] = useState(initialQuestions);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bulk, setBulk] = useState<string | null>(null);
  const [bulkFailures, setBulkFailures] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const published = questions.filter((q) => q.isPublished).length;

  /* تجزیهٔ زنده: همان تجزیه‌گری که سرور استفاده می‌کند، پس چیزی که مدیر
     اینجا می‌بیند دقیقاً همان چیزی است که ذخیره خواهد شد — نه یک تقریبِ
     جداگانه که روزی با آن یکی فرق کند. */
  const parsed = useMemo(
    () => (draft ? parseUnitSpec(draft.unitSpec) : null),
    [draft],
  );
  const draftUnits = parsed?.ok ? parsed.units : [];

  const refresh = async () => {
    const rows = await aruzRapidAdminList();
    setQuestions(rows);
  };

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      const res = await aruzRapidAdminUpsert(draft);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setDraft(null);
      // هشدارِ موتورِ عروض ذخیره را نمی‌شکند، ولی باید دیده شود.
      toast(res.warning ?? (draft.id ? "مصراع ویرایش شد." : "مصراع اضافه شد."), res.warning ? "error" : "success");
      await refresh();
    });
  };

  const saveBulk = () => {
    if (bulk === null) return;
    startTransition(async () => {
      const res = await aruzRapidAdminBulkAdd(bulk);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setBulk(null);
      setBulkFailures(res.failures);
      const notes = [
        `${fa(res.added)} مصراع اضافه شد`,
        res.duplicates > 0 ? `${fa(res.duplicates)} تکراری بود` : "",
        res.failures.length > 0 ? `${fa(res.failures.length)} خط خوانده نشد` : "",
      ].filter(Boolean);
      toast(notes.join(" · "), "success");
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
      setQuestions((prev) =>
        prev.map((x) => (x.id === q.id ? { ...x, isPublished: !x.isPublished } : x)),
      );
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

  /** کلیک روی یک هجا در فرم: کوتاه ↔ بلند، بی‌آنکه رشته دستی ویرایش شود. */
  const flipUnit = (index: number) => {
    if (!draft || !parsed?.ok) return;
    const next = parsed.units.map((u, i) =>
      i === index ? { ...u, length: u.length === "short" ? ("long" as const) : ("short" as const) } : u,
    );
    setDraft({ ...draft, unitSpec: formatUnitSpec(next) });
  };

  return (
    <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">مدیریت «کوتاه یا بلند؟»</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          دانش‌آموز یک مصراعِ اعراب‌گذاری‌شده را می‌بیند، مصراع پوشیده می‌شود و
          هجاها یکی‌یکی می‌آیند: کوتاه یا بلند؟ پس هر مصراع دو چیز لازم دارد —
          متنِ کامل، و فهرستِ هجاها با کمیتِ هرکدام.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
        {questions.length === 0 ? (
          <p className="text-muted-foreground">
            هنوز مصراعی ثبت نشده. تا وقتی این فهرست خالی است، بازی با پنج مصراعِ
            <span className="font-bold text-foreground"> نمایشیِ </span>
            داخلِ کد کار می‌کند — و آن‌ها عمداً مرجعِ علمی نیستند. با ثبتِ اولین
            مصراع، بازی کاملاً به همین فهرست سوئیچ می‌کند.
          </p>
        ) : (
          <p className="text-muted-foreground">
            <span className="font-bold text-foreground">{fa(published)}</span> مصراعِ
            منتشرشده از <span className="font-bold text-foreground">{fa(questions.length)}</span>.
            بازی فقط منتشرشده‌ها را می‌چیند و ترتیبشان در هر نشست تصادفی است.
            {published === 0 && (
              <span className="text-destructive">
                {" "}
                هیچ‌کدام منتشر نشده‌اند، پس بازی هنوز دادهٔ نمایشی را نشان می‌دهد.
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── فرمِ افزودن/ویرایش ───────────────────────────────────── */}
      {draft ? (
        <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h3 className="mb-3 font-bold">{draft.id ? "ویرایش مصراع" : "مصراع تازه"}</h3>

          <label className="mb-3 flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">متنِ مصراع (با اعراب)</span>
            <input
              value={draft.previewText}
              onChange={(e) => setDraft({ ...draft, previewText: e.target.value })}
              className="min-h-11 rounded-xl border border-border bg-card px-3 text-base"
              placeholder="تَوانا بُوَد هَر کِه دانا بُوَد"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              هجاها — هر هجا به شکلِ <span dir="ltr">متن=U</span> (کوتاه) یا{" "}
              <span dir="ltr">متن=-</span> (بلند)، با فاصله از هم
            </span>
            <textarea
              value={draft.unitSpec}
              onChange={(e) => setDraft({ ...draft, unitSpec: e.target.value })}
              rows={3}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm leading-8"
              placeholder="تَ=U وا=- نا=- بُ=U وَد=- هَر=- کِه=U دا=- نا=- بُ=U وَد=-"
            />
          </label>

          {/* پیش‌نمایشِ زنده — و خودش ابزارِ ویرایش است: روی هر هجا بزنید تا
              کوتاه/بلند عوض شود. تایپ کردنِ دوبارهٔ رشته لازم نیست. */}
          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            {draft.unitSpec.trim() === "" ? (
              <p className="text-xs text-muted-foreground">
                هجاها را بنویسید تا اینجا دیده شوند.
              </p>
            ) : parsed?.ok ? (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {fa(draftUnits.length)} هجا — روی هر کدام بزنید تا کوتاه/بلند شود
                  </span>
                  <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                    {draftUnits.map((u) => mark(u.length)).join(" ")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {draftUnits.map((u, i) => (
                    <UnitChip key={i} unit={u} onToggle={() => flipUnit(i)} />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-destructive">{parsed?.error}</p>
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">وزن (اختیاری)</span>
              <input
                value={draft.meter}
                onChange={(e) => setDraft({ ...draft, meter: e.target.value })}
                className="min-h-10 rounded-xl border border-border bg-card px-3"
                placeholder="فعولن فعولن فعولن فَعَل"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">شاعر یا مأخذ (اختیاری)</span>
              <input
                value={draft.attribution}
                onChange={(e) => setDraft({ ...draft, attribution: e.target.value })}
                className="min-h-10 rounded-xl border border-border bg-card px-3"
                placeholder="فردوسی"
              />
            </label>
          </div>

          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">توضیح برای صفحهٔ نتیجه (اختیاری)</span>
            <input
              value={draft.explanation}
              onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
              className="min-h-10 rounded-xl border border-border bg-card px-3"
            />
          </label>

          <div className="mt-4 flex flex-col gap-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.hasUnitOverlap}
                onChange={(e) => setDraft({ ...draft, hasUnitOverlap: e.target.checked })}
                className="mt-1 size-4"
              />
              <span>
                ادغامِ عروضی دارد
                <span className="block text-xs text-muted-foreground">
                  مثلِ «بِشْنَو اَز» که «بِشْ» + «نَ» + «وَز» تقطیع می‌شود. با این
                  تیک، هشدارِ «متنِ هجاها با مصراع نمی‌خواند» نادیده گرفته می‌شود.
                </span>
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
                className="size-4"
              />
              <span>منتشر شود (در بازی دیده شود)</span>
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={pending || !parsed?.ok}
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
      ) : bulk !== null ? (
        <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h3 className="mb-1 font-bold">افزودن گروهی</h3>

          {/* الگو به‌جای توضیح — همان کاری که در جفت‌های ادبی جواب داد. */}
          <div className="my-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs">
            <span className="rounded-md bg-muted px-2 py-1 font-bold">متنِ مصراع</span>
            <span dir="ltr" className="text-muted-foreground">|</span>
            <span className="rounded-md bg-gold/15 px-2 py-1 font-bold text-gold-ink">
              هجاها
            </span>
            <span dir="ltr" className="text-muted-foreground">|</span>
            <span className="rounded-md bg-primary/12 px-2 py-1 font-bold text-primary">وزن</span>
            <span dir="ltr" className="text-muted-foreground">|</span>
            <span className="rounded-md bg-primary/12 px-2 py-1 font-bold text-primary">شاعر</span>
            <span className="text-[11px] text-muted-foreground">— دو ستون آخر اختیاری‌اند</span>
          </div>

          <p className="mb-3 text-xs text-muted-foreground">
            جداکنندهٔ ستون‌ها فقط <span dir="ltr">|</span> یا tab است — خط تیره
            نمی‌شود، چون در ستونِ هجاها خودش نمادِ هجای بلند است. خطی که با{" "}
            <span dir="ltr">#</span> شروع شود نادیده گرفته می‌شود.
          </p>

          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={7}
            dir="rtl"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm leading-8"
            placeholder={
              "تَوانا بُوَد هَر کِه دانا بُوَد | تَ=U وا=- نا=- بُ=U وَد=- هَر=- کِه=U دا=- نا=- بُ=U وَد=- | فعولن فعولن فعولن فَعَل | فردوسی"
            }
          />

          <div className="mt-4 flex gap-2">
            <button
              onClick={saveBulk}
              disabled={pending}
              className="min-h-10 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
            >
              {pending ? "در حال افزودن…" : "افزودن همه"}
            </button>
            <button
              onClick={() => setBulk(null)}
              className="min-h-10 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setBulkFailures([]);
              setDraft({ ...EMPTY_DRAFT });
            }}
            className="min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90"
          >
            + افزودن مصراع
          </button>
          <button
            onClick={() => {
              setBulkFailures([]);
              setBulk("");
            }}
            className="min-h-11 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
          >
            افزودن گروهی از یک فهرست
          </button>
        </div>
      )}

      {/* خط‌هایی که در افزودنِ گروهی رد شدند — با شمارهٔ خط، تا پیدا شوند. */}
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

      {/* ── فهرست ─────────────────────────────────────────────────── */}
      {pending && questions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">در حال بارگذاری…</p>
      ) : questions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          هنوز مصراعی ثبت نشده. با «افزودن مصراع» شروع کن.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`rounded-2xl border bg-card p-4 ${
                q.isPublished ? "border-border" : "border-dashed border-border opacity-75"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                  {fa(i + 1)}
                </span>
                <span className="min-w-0 flex-1 text-base font-bold">{q.previewText}</span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    q.isPublished
                      ? "bg-primary/12 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {q.isPublished ? "منتشر" : "پیش‌نویس"}
                </span>
              </div>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {q.units.map((u, k) => (
                  <UnitChip key={k} unit={u} />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {[q.meter, q.attribution].filter(Boolean).join(" · ") || "بدون وزن و شاعر"}
                  {q.hasUnitOverlap && " · ادغامِ عروضی"}
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
                      onClick={() => {
                        setBulk(null);
                        setDraft({
                          id: q.id,
                          previewText: q.previewText,
                          unitSpec: q.unitSpec,
                          meter: q.meter,
                          attribution: q.attribution,
                          explanation: q.explanation,
                          hasUnitOverlap: q.hasUnitOverlap,
                          isPublished: q.isPublished,
                        });
                      }}
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
        </div>
      )}
    </div>
  );
}
