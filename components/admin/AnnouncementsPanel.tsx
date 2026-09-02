"use client";

import { useState, useTransition } from "react";
import {
  announcementAdminDelete,
  announcementAdminList,
  announcementAdminSave,
  announcementAdminToggle,
  type AdminAnnouncement,
  type AnnouncementStatus,
} from "@/lib/admin/announcement-actions";
import type { AnnouncementTone } from "@/lib/site/content";
import { useAdminToast } from "@/components/admin/AdminToast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/**
 * ادارهٔ نوار اعلان.
 *
 * فرم یک «پیش‌نمایش زنده» دارد و این عمدی است: نوار اعلان بالای *همهٔ*
 * صفحه‌های سایت برای *همهٔ* بازدیدکننده‌ها دیده می‌شود. تنها راهِ نزدنِ یک
 * اشتباهِ پرمخاطب، دیدنش قبل از روشن کردن است.
 */

const TONE_LABEL: Record<AnnouncementTone, string> = {
  info: "اطلاع‌رسانی (آبی)",
  success: "خبر خوب (سبز)",
  warning: "توجه (طلایی)",
  critical: "فوری (قرمز)",
};

const TONE_PREVIEW: Record<AnnouncementTone, string> = {
  info: "border-primary/40 bg-primary/8",
  success: "border-emerald-500/40 bg-emerald-500/8",
  warning: "border-gold/50 bg-gold/10",
  critical: "border-destructive/40 bg-destructive/10",
};

const STATUS: Record<AnnouncementStatus, { label: string; className: string }> = {
  live: { label: "در حال نمایش", className: "bg-primary/15 text-primary" },
  scheduled: { label: "زمان‌بندی‌شده", className: "bg-gold/20 text-gold-ink dark:text-gold" },
  expired: { label: "منقضی", className: "bg-muted text-muted-foreground" },
  off: { label: "خاموش", className: "bg-muted text-muted-foreground" },
};

type Draft = {
  id: string | null;
  title: string;
  body: string;
  tone: AnnouncementTone;
  linkUrl: string;
  linkLabel: string;
  isActive: boolean;
  dismissible: boolean;
  priority: number;
  startsAt: string;
  endsAt: string;
};

const EMPTY: Draft = {
  id: null,
  title: "",
  body: "",
  tone: "info",
  linkUrl: "",
  linkLabel: "",
  isActive: true,
  dismissible: true,
  priority: 0,
  startsAt: "",
  endsAt: "",
};

/** ISO → مقدارِ input[type=datetime-local] در وقتِ محلیِ مرورگر. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fullTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fa-IR", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AnnouncementsPanel({ initial }: { initial: AdminAnnouncement[] }) {
  const toast = useAdminToast();
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminAnnouncement | null>(null);
  const [pending, startTransition] = useTransition();

  const edit = (row: AdminAnnouncement) =>
    setDraft({
      id: row.id,
      title: row.title ?? "",
      body: row.body,
      tone: row.tone,
      linkUrl: row.linkUrl ?? "",
      linkLabel: row.linkLabel ?? "",
      isActive: row.isActive,
      dismissible: row.dismissible,
      priority: row.priority,
      startsAt: toLocalInput(row.startsAt),
      endsAt: toLocalInput(row.endsAt),
    });

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      const result = await announcementAdminSave({
        id: draft.id,
        title: draft.title || null,
        body: draft.body,
        tone: draft.tone,
        linkUrl: draft.linkUrl || null,
        linkLabel: draft.linkLabel || null,
        isActive: draft.isActive,
        dismissible: draft.dismissible,
        priority: draft.priority,
        startsAt: draft.startsAt || null,
        endsAt: draft.endsAt || null,
      });

      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast(draft.id ? "اعلان ذخیره شد." : "اعلان ساخته شد.", "success");
      setDraft(null);
      setRows(await announcementAdminList());
    });
  };

  const toggle = (row: AdminAnnouncement) =>
    startTransition(async () => {
      const result = await announcementAdminToggle(row.id, !row.isActive);
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      setRows(await announcementAdminList());
    });

  const remove = (row: AdminAnnouncement) => {
    setConfirmDelete(null);
    startTransition(async () => {
      const result = await announcementAdminDelete(row.id);
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast("اعلان حذف شد.", "success");
      setRows(await announcementAdminList());
    });
  };

  const liveCount = rows.filter((r) => r.status === "live").length;

  return (
    <div dir="rtl" className="flex max-w-4xl flex-col gap-6 p-4 xs:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">اعلان سایت</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            نواری که بالای همهٔ صفحه‌ها دیده می‌شود — برای خبرهایی مثل «فردا فلان بخش در دسترس
            نیست». همیشه فقط <strong>یکی</strong> نمایش داده می‌شود: آنکه اولویتش بالاتر است و
            بازهٔ زمانی‌اش همین حالا فعال است.
          </p>
        </div>
        {!draft && (
          <button
            type="button"
            onClick={() => setDraft(EMPTY)}
            className="min-h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            اعلان تازه
          </button>
        )}
      </header>

      {liveCount > 1 && (
        <p className="rounded-xl border border-gold/40 bg-gold/5 p-3 text-xs">
          {liveCount.toLocaleString("fa-IR")} اعلان هم‌زمان فعال‌اند، ولی فقط آنکه اولویتش
          بالاتر است دیده می‌شود. بقیه در صف می‌مانند تا این یکی تمام شود.
        </p>
      )}

      {draft && (
        <AnnouncementForm
          draft={draft}
          pending={pending}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={save}
        />
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-semibold">هنوز اعلانی ساخته نشده</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            وقتی خبری هست که همهٔ بازدیدکننده‌ها باید ببینند، اینجا یکی بسازید.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`rounded-2xl border bg-card p-4 ${
                row.status === "live" ? "border-primary/40" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${STATUS[row.status].className}`}>
                      {STATUS[row.status].label}
                    </span>
                    <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {TONE_LABEL[row.tone]}
                    </span>
                    {row.priority !== 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        اولویت {row.priority.toLocaleString("fa-IR")}
                      </span>
                    )}
                    {!row.dismissible && (
                      <span className="text-[11px] text-muted-foreground">قابل بستن نیست</span>
                    )}
                  </div>

                  {row.title && <p className="mt-1.5 text-sm font-bold">{row.title}</p>}
                  <p className="mt-0.5 text-sm text-muted-foreground">{row.body}</p>

                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    از {fullTime(row.startsAt)} تا {fullTime(row.endsAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggle(row)}
                    className="min-h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                  >
                    {row.isActive ? "خاموش کن" : "روشن کن"}
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
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="حذف اعلان"
        body={`«${(confirmDelete?.title || confirmDelete?.body || "").slice(0, 80)}» برای همیشه حذف می‌شود.`}
        consequence="اگر فقط می‌خواهید نمایش داده نشود، به‌جای حذف «خاموش کن» را بزنید — بعداً می‌شود دوباره روشنش کرد."
        tone="danger"
        confirmLabel="حذف کن"
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function AnnouncementForm({
  draft,
  pending,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Draft;
  pending: boolean;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-card p-4">
      <h2 className="text-base font-bold">{draft.id ? "ویرایش اعلان" : "اعلان تازه"}</h2>

      {/* پیش‌نمایش زنده */}
      <div>
        <p className="mb-1.5 text-[11px] text-muted-foreground">
          این‌طور بالای سایت دیده می‌شود:
        </p>
        <div className={`rounded-xl border px-4 py-2.5 ${TONE_PREVIEW[draft.tone]}`}>
          <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] leading-relaxed">
            {draft.title && <strong className="font-bold">{draft.title}</strong>}
            <span className="text-foreground/85">
              {draft.body || "متن اعلان اینجا دیده می‌شود…"}
            </span>
            {draft.linkUrl && draft.linkLabel && (
              <span className="rounded-lg border border-current/25 px-2 py-0.5 text-[11px] font-semibold">
                {draft.linkLabel}
              </span>
            )}
          </p>
        </div>
      </div>

      <Field label="عنوان (اختیاری)" hint="برای اعلان کوتاه، خالی گذاشتنش خواناتر است.">
        <input
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={120}
          className={inputClass}
          placeholder="قطعی برنامه‌ریزی‌شده"
        />
      </Field>

      <Field label="متن اعلان" hint="کوتاه و روشن. جای پاراگراف نیست.">
        <textarea
          value={draft.body}
          onChange={(e) => set("body", e.target.value)}
          rows={2}
          maxLength={600}
          className={`${inputClass} resize-y`}
          placeholder="فردا از ساعت ۲ تا ۴ بامداد، بخش آزمون‌ها در دسترس نخواهد بود."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="لحن" hint="رنگ و آیکون نوار را تعیین می‌کند.">
          <select
            value={draft.tone}
            onChange={(e) => set("tone", e.target.value as AnnouncementTone)}
            className={inputClass}
          >
            {(Object.keys(TONE_LABEL) as AnnouncementTone[]).map((t) => (
              <option key={t} value={t}>
                {TONE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="اولویت" hint="وقتی چند اعلان فعالند، بزرگ‌ترین عدد برنده است.">
          <input
            type="number"
            value={draft.priority}
            onChange={(e) => set("priority", Number(e.target.value) || 0)}
            className={inputClass}
          />
        </Field>

        <Field label="آدرس دکمه (اختیاری)" hint="مثل /panel یا https://…">
          <input
            dir="ltr"
            value={draft.linkUrl}
            onChange={(e) => set("linkUrl", e.target.value)}
            className={`${inputClass} text-left`}
            placeholder="https://"
          />
        </Field>

        <Field label="متن دکمه" hint="فقط وقتی آدرس پر باشد لازم است.">
          <input
            value={draft.linkLabel}
            onChange={(e) => set("linkLabel", e.target.value)}
            maxLength={60}
            className={inputClass}
            placeholder="بیشتر بخوانید"
          />
        </Field>

        <Field label="نمایش از" hint="خالی یعنی «از همین حالا».">
          <input
            type="datetime-local"
            value={draft.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="نمایش تا" hint="خالی یعنی «تا وقتی خاموشش کنید».">
          <input
            type="datetime-local"
            value={draft.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <Toggle
          checked={draft.isActive}
          onChange={(v) => set("isActive", v)}
          label="فعال"
          hint="کلید اصلی. خاموش یعنی هرگز دیده نمی‌شود، حتی اگر بازه‌اش رسیده باشد."
        />
        <Toggle
          checked={draft.dismissible}
          onChange={(v) => set("dismissible", v)}
          label="کاربر بتواند ببندد"
          hint="برای اختلالِ در جریان، خاموشش کنید."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !draft.body.trim()}
          onClick={onSave}
          className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending ? "در حال ذخیره…" : "ذخیره"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="min-h-11 rounded-xl px-4 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          انصراف
        </button>
      </div>
    </section>
  );
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary";

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

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex max-w-xs cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-primary"
      />
      <span className="flex flex-col">
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
