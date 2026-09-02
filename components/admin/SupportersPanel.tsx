"use client";

import { useMemo, useState, useTransition } from "react";
import {
  supporterAdminDelete,
  supporterAdminList,
  supporterAdminSave,
  supporterAdminToggle,
  type AdminSupporter,
  type SupporterTier,
} from "@/lib/admin/supporter-actions";
import { useAdminToast } from "@/components/admin/AdminToast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/**
 * ادارهٔ فهرست حامیان.
 *
 * روشن/خاموش کردنِ خودِ بخش در «تنظیمات ← صفحهٔ اصلی» است و نه اینجا — چون
 * آنجا جای تنظیماتِ سایت است و اینجا جای *محتوا*. لینکِ میان‌بُرش بالای همین
 * صفحه هست تا کسی دنبالش نگردد.
 */

const TIER_LABEL: Record<SupporterTier, string> = {
  gold: "طلایی",
  silver: "نقره‌ای",
  bronze: "برنزی",
  supporter: "حامی",
};

const TIER_CHIP: Record<SupporterTier, string> = {
  gold: "bg-gold/20 text-gold-ink dark:text-gold",
  silver: "bg-foreground/10 text-foreground/70",
  bronze: "bg-amber-700/15 text-amber-800 dark:text-amber-300",
  supporter: "bg-primary/12 text-primary",
};

type Draft = {
  id: string | null;
  displayName: string;
  message: string;
  tier: SupporterTier;
  amountLabel: string;
  linkUrl: string;
  avatarUrl: string;
  isVisible: boolean;
  supportedAt: string;
  sortIndex: number;
};

const EMPTY: Draft = {
  id: null,
  displayName: "",
  message: "",
  tier: "supporter",
  amountLabel: "",
  linkUrl: "",
  avatarUrl: "",
  isVisible: true,
  supportedAt: "",
  sortIndex: 0,
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary";

export default function SupportersPanel({ initial }: { initial: AdminSupporter[] }) {
  const toast = useAdminToast();
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminSupporter | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleCount = useMemo(() => rows.filter((r) => r.isVisible).length, [rows]);

  const edit = (row: AdminSupporter) =>
    setDraft({
      id: row.id,
      displayName: row.displayName,
      message: row.message ?? "",
      tier: row.tier,
      amountLabel: row.amountLabel ?? "",
      linkUrl: row.linkUrl ?? "",
      avatarUrl: row.avatarUrl ?? "",
      isVisible: row.isVisible,
      supportedAt: row.supportedAt ?? "",
      sortIndex: row.sortIndex,
    });

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      const result = await supporterAdminSave({
        id: draft.id,
        displayName: draft.displayName,
        message: draft.message || null,
        tier: draft.tier,
        amountLabel: draft.amountLabel || null,
        linkUrl: draft.linkUrl || null,
        avatarUrl: draft.avatarUrl || null,
        isVisible: draft.isVisible,
        supportedAt: draft.supportedAt || null,
        sortIndex: draft.sortIndex,
      });

      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast(draft.id ? "ذخیره شد." : "حامی اضافه شد.", "success");
      setDraft(null);
      setRows(await supporterAdminList());
    });
  };

  const toggle = (row: AdminSupporter) =>
    startTransition(async () => {
      const result = await supporterAdminToggle(row.id, !row.isVisible);
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      setRows(await supporterAdminList());
    });

  const remove = (row: AdminSupporter) => {
    setConfirmDelete(null);
    startTransition(async () => {
      const result = await supporterAdminDelete(row.id);
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast("حذف شد.", "success");
      setRows(await supporterAdminList());
    });
  };

  return (
    <div dir="rtl" className="flex max-w-4xl flex-col gap-6 p-4 xs:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">حامیان</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            نام کسانی که از سروا حمایت مالی کرده‌اند، در بخش «حامیان» صفحهٔ اصلی به‌صورت یک نوار
            آرام نمایش داده می‌شود. نمایش یا عدم نمایشِ خودِ بخش در{" "}
            <a href="/admin/settings" className="text-primary hover:underline">
              تنظیمات ← صفحهٔ اصلی
            </a>{" "}
            کنترل می‌شود.
          </p>
        </div>
        {!draft && (
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY, sortIndex: rows.length })}
            className="min-h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            افزودن حامی
          </button>
        )}
      </header>

      {rows.length > 0 && visibleCount < 4 && (
        <p className="rounded-xl border border-gold/40 bg-gold/5 p-3 text-xs leading-relaxed">
          با کمتر از چهار حامیِ قابل نمایش، به‌جای نوارِ در حرکت یک ردیفِ وسط‌چین نشان داده
          می‌شود — نوارِ متحرک با دو کارت خراب به نظر می‌رسد.
        </p>
      )}

      {draft && (
        <section className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-card p-4">
          <h2 className="text-base font-bold">{draft.id ? "ویرایش حامی" : "حامی تازه"}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نامِ نمایشی" hint="همان‌طور که خودش خواسته دیده شود. «ناشناس» هم قابل قبول است.">
              <input
                value={draft.displayName}
                onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                maxLength={80}
                className={inputClass}
              />
            </Field>

            <Field label="رتبه" hint="فقط ظاهرِ کارت را عوض می‌کند.">
              <select
                value={draft.tier}
                onChange={(e) => setDraft({ ...draft, tier: e.target.value as SupporterTier })}
                className={inputClass}
              >
                {(Object.keys(TIER_LABEL) as SupporterTier[]).map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="برچسب (اختیاری)"
              hint="اگر خالی باشد، نام رتبه نشان داده می‌شود. مبلغِ واقعی را ننویسید مگر خودش خواسته باشد."
            >
              <input
                value={draft.amountLabel}
                onChange={(e) => setDraft({ ...draft, amountLabel: e.target.value })}
                maxLength={40}
                className={inputClass}
                placeholder="حامی طلایی"
              />
            </Field>

            <Field label="تاریخ حمایت (اختیاری)" hint="فقط برای بایگانی خودتان؛ روی سایت دیده نمی‌شود.">
              <input
                type="date"
                value={draft.supportedAt}
                onChange={(e) => setDraft({ ...draft, supportedAt: e.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="لینک (اختیاری)" hint="صفحهٔ شخصی یا شبکهٔ اجتماعی‌اش.">
              <input
                dir="ltr"
                value={draft.linkUrl}
                onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                className={`${inputClass} text-left`}
                placeholder="https://"
              />
            </Field>

            <Field label="آدرس تصویر (اختیاری)" hint="اگر خالی باشد، حرف اول نامش نشان داده می‌شود.">
              <input
                dir="ltr"
                value={draft.avatarUrl}
                onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
                className={`${inputClass} text-left`}
                placeholder="https://"
              />
            </Field>

            <Field label="ترتیب" hint="عدد کوچک‌تر جلوتر می‌آید.">
              <input
                type="number"
                value={draft.sortIndex}
                onChange={(e) => setDraft({ ...draft, sortIndex: Number(e.target.value) || 0 })}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="پیام کوتاه (اختیاری)" hint="یک جمله از خودش، اگر خواست.">
            <textarea
              value={draft.message}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
              rows={2}
              maxLength={200}
              className={`${inputClass} resize-y`}
            />
          </Field>

          <label className="flex w-fit cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={draft.isVisible}
              onChange={(e) => setDraft({ ...draft, isVisible: e.target.checked })}
              className="size-4 accent-primary"
            />
            <span className="text-xs font-semibold">در سایت نمایش داده شود</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !draft.displayName.trim()}
              onClick={save}
              className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {pending ? "در حال ذخیره…" : "ذخیره"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setDraft(null)}
              className="min-h-11 rounded-xl px-4 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              انصراف
            </button>
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-semibold">هنوز حامی‌ای ثبت نشده</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            تا وقتی این فهرست خالی است، بخش حامیان در صفحهٔ اصلی اصلاً رندر نمی‌شود — حتی اگر
            در تنظیمات روشن باشد.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 ${
                row.isVisible ? "" : "opacity-60"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold">
                  {[...row.displayName.trim()][0] ?? "؟"}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold">{row.displayName}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${TIER_CHIP[row.tier]}`}>
                      {row.amountLabel || TIER_LABEL[row.tier]}
                    </span>
                    {!row.isVisible && (
                      <span className="text-[11px] text-muted-foreground">پنهان</span>
                    )}
                  </div>
                  {row.message && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.message}</p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggle(row)}
                  className="min-h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                >
                  {row.isVisible ? "پنهان کن" : "نمایش بده"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => edit(row)}
                  className="min-h-9 rounded-lg border border-border px-3 text-xs disabled:opacity-60"
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmDelete(row)}
                  className="min-h-9 rounded-lg px-3 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="حذف حامی"
        body={`«${confirmDelete?.displayName ?? ""}» برای همیشه از فهرست حذف می‌شود.`}
        consequence="معمولاً «پنهان کن» کارِ درست‌تری است: سابقهٔ حمایت چیزی نیست که بخواهید از دست بدهید."
        tone="danger"
        confirmLabel="حذف کن"
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
