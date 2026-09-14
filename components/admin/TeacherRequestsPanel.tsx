"use client";

import { useState, useTransition } from "react";
import { useAdminToast } from "@/components/admin/AdminToast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  adminApproveTeacherRequest,
  adminListTeacherRequests,
  adminRejectTeacherRequest,
  adminRequestTeacherRevision,
} from "@/lib/admin/teacher-actions";
import { TEACHER_STATUS_LABEL, type AdminTeacherRequest, type TeacherRequestStatus } from "@/lib/teacher/types";

/**
 * مدیریت درخواست دبیران — بند ۷.
 *
 * ⚠️ کد ملیِ کامل فقط در نمای بازشدهٔ یک درخواست دیده می‌شود و نه در فهرست.
 * در یک جدولِ پنجاه‌ردیفی، کد ملیِ پنجاه نفر هم‌زمان روی صفحه است — یک
 * اسکرین‌شات یا یک نفر پشتِ سرِ مدیر کافی است. توضیحش کنارِ `maskNationalId`
 * در `lib/profile/national-id.ts`.
 *
 * ⚠️ و فایلِ حکم یک لینکِ معمولی است به مسیری که پشتِ `requireAdmin()` است.
 * هیچ‌جای این کامپوننت `document_key` را نمی‌بیند — اگر می‌دید، همان کلید در
 * HTMLِ صفحه می‌نشست و از آنجا به هر جایی می‌رفت.
 */

type Filter = TeacherRequestStatus | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "در انتظار بررسی" },
  { value: "needs_revision", label: "نیاز به اصلاح" },
  { value: "approved", label: "تأییدشده" },
  { value: "rejected", label: "ردشده" },
  { value: "all", label: "همه" },
];

const PAGE_SIZE = 25;

export default function TeacherRequestsPanel({
  initialRequests,
  initialTotal,
  initialPending,
}: {
  initialRequests: AdminTeacherRequest[];
  initialTotal: number;
  initialPending: number;
}) {
  const toast = useAdminToast();
  const [requests, setRequests] = useState(initialRequests);
  const [total, setTotal] = useState(initialTotal);
  const [pendingCount, setPendingCount] = useState(initialPending);
  const [status, setStatus] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  /* ⚠️ یک state برای هر دو دیالوگ، با یک برچسبِ هدف. دو state جدا یعنی
     حالتی که هر دو هم‌زمان باز باشند، و هیچ‌چیز جلویش را نمی‌گرفت. */
  const [noting, setNoting] = useState<
    { request: AdminTeacherRequest; target: "rejected" | "needs_revision" } | null
  >(null);
  const [confirming, setConfirming] = useState<AdminTeacherRequest | null>(null);
  const [busy, startTransition] = useTransition();

  const load = (next: { status?: Filter; search?: string }, append = false) => {
    startTransition(async () => {
      const result = await adminListTeacherRequests({
        status: next.status ?? status,
        search: (next.search ?? search) || undefined,
        limit: PAGE_SIZE,
        offset: append ? requests.length : 0,
      });
      setRequests((prev) => (append ? [...prev, ...result.requests] : result.requests));
      setTotal(result.total);
      setPendingCount(result.pendingCount);
    });
  };

  const approve = (request: AdminTeacherRequest) => {
    startTransition(async () => {
      const result = await adminApproveTeacherRequest(request.id);
      if (!result.ok) return toast(result.errors.join("\n"));
      toast("درخواست تأیید شد؛ نقش دبیر و سروا پلاس دائمی فعال شد.", "success");
      // ⚠️ فهرست دوباره خوانده می‌شود و ردیف دستی عوض نمی‌شود: تأیید هم
      // وضعیت را عوض می‌کند و هم `userRole` را، و شمارِ در-انتظار را یکی
      // کم می‌کند. به‌روز کردنِ دستیِ هر سه، سه جای تازه برای اشتباه است.
      load({}, false);
    });
  };

  /**
   * ⚠️ رد و «نیاز به اصلاح» یک مسیرِ مشترک دارند، چون از دیدِ ادمین یک کارند:
   * یادداشت بنویس و بفرست. تنها تفاوتشان این است که رد پرونده را می‌بندد و
   * اصلاح بازش نگه می‌دارد.
   */
  const settle = (
    request: AdminTeacherRequest,
    note: string,
    target: "rejected" | "needs_revision",
  ) => {
    startTransition(async () => {
      const result =
        target === "rejected"
          ? await adminRejectTeacherRequest(request.id, note)
          : await adminRequestTeacherRevision(request.id, note);
      if (!result.ok) return toast(result.errors.join("\n"));
      toast(
        target === "rejected"
          ? "درخواست رد شد و دلیلش برای کاربر نمایش داده می‌شود."
          : "به کاربر اعلام شد مدارکش را اصلاح کند. پرونده باز می‌ماند.",
        "success",
      );
      setNoting(null);
      load({}, false);
    });
  };

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">مدیریت درخواست دبیران</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount.toLocaleString("fa-IR")} درخواست در انتظار بررسی`
              : "درخواستِ در انتظاری نیست."}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          dir="rtl"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load({ search: e.target.value });
          }}
          placeholder="جست‌وجو با نام، ایمیل، کد ملی یا مدرسه…"
          className="min-h-11 w-full max-w-xs flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={status}
          onChange={(e) => {
            const next = e.target.value as Filter;
            setStatus(next);
            load({ status: next });
          }}
          className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {requests.length === 0 && !busy && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          درخواستی یافت نشد.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            open={openId === request.id}
            busy={busy}
            onToggle={() => setOpenId((id) => (id === request.id ? null : request.id))}
            onApprove={() => setConfirming(request)}
            onReject={() => setNoting({ request, target: "rejected" })}
            onRevise={() => setNoting({ request, target: "needs_revision" })}
          />
        ))}
      </div>

      {requests.length < total && (
        <button
          type="button"
          disabled={busy}
          onClick={() => load({}, true)}
          className="min-h-11 rounded-xl border border-border text-sm font-medium hover:border-primary/50 disabled:opacity-60"
        >
          {busy ? "در حال بارگذاری…" : "نمایش بیشتر"}
        </button>
      )}

      {confirming && (
        <ConfirmDialog
          open
          title="تأیید درخواست دبیری"
          body={`نقش ${[confirming.firstName, confirming.lastName].filter(Boolean).join(" ") || "این کاربر"} به «دبیر» تغییر می‌کند.`}
          // ⚠️ اشتراکِ دائمی به‌عنوان «پیامد» و نه در متنِ اصلی: این بخشی
          // از تأیید است که مدیر ممکن است انتظارش را نداشته باشد، و
          // `consequence` دقیقاً برای همین وجود دارد.
          consequence="سروا پلاس هم به‌صورت مادام‌العمر برایش فعال می‌شود."
          confirmLabel="تأیید می‌کنم"
          tone="primary"
          onConfirm={() => {
            const target = confirming;
            setConfirming(null);
            approve(target);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}

      {noting && (
        <NoteDialog
          request={noting.request}
          target={noting.target}
          busy={busy}
          onCancel={() => setNoting(null)}
          onSubmit={(note) => settle(noting.request, note, noting.target)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── کارتِ یک درخواست ───────────────────────────── */

const STATUS_STYLE: Record<TeacherRequestStatus, string> = {
  pending: "bg-gold/15 text-gold-ink",
  needs_revision: "bg-gold/15 text-gold-ink",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
};

function RequestCard({
  request,
  open,
  busy,
  onToggle,
  onApprove,
  onReject,
  onRevise,
}: {
  request: AdminTeacherRequest;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRevise: () => void;
}) {
  const name = [request.firstName, request.lastName].filter(Boolean).join(" ") || "بدون نام";

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-start">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_STYLE[request.status]}`}>
              {TEACHER_STATUS_LABEL[request.status]}
            </span>
            {/* ⚠️ وقتی وضعیت «تأییدشده» است ولی نقشِ کاربر هنوز دبیر نیست،
                یعنی کسی بعداً نقش را برگردانده. نمایشش لازم است، وگرنه مدیر
                فکر می‌کند تأیید اثر کرده. */}
            {request.status === "approved" && request.userRole !== "teacher" && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">
                نقش دبیر ندارد
              </span>
            )}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {request.school} · {request.locationLabel ?? "—"} ·{" "}
            {new Date(request.createdAt).toLocaleDateString("fa-IR")}
          </span>
        </button>

        {/* ⚠️ دکمه‌ها برای پروندهٔ «نیاز به اصلاح» هم دیده می‌شوند و نه فقط
            «در انتظار»: ادمینی که اصلاح خواسته باید بتواند نظرش را عوض کند
            و همان‌جا تأیید یا رد کند، بدونِ اینکه منتظرِ ارسالِ دوبارهٔ
            کاربر بماند. */}
        {(request.status === "pending" || request.status === "needs_revision") && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onApprove}
              className="min-h-9 rounded-xl border border-primary/40 px-3 text-[13px] font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              تأیید
            </button>
            {/* ⚠️ «اصلاح» بینِ تأیید و رد نشسته و این ترتیب عمدی است: از
                نظر شدت هم واقعاً وسط است، و ادمینی که عجله دارد کمتر
                تصادفی «رد» را می‌زند وقتی گزینهٔ ملایم‌تر کنارش است. */}
            {request.status === "pending" && (
              <button
                type="button"
                disabled={busy}
                onClick={onRevise}
                className="min-h-9 rounded-xl border border-gold/50 px-3 text-[13px] font-medium text-gold-ink hover:bg-gold/10 disabled:opacity-60"
              >
                نیاز به اصلاح
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="min-h-9 rounded-xl border border-border px-3 text-[13px] font-medium text-muted-foreground hover:border-destructive/50 hover:text-destructive disabled:opacity-60"
            >
              رد
            </button>
          </div>
        )}
      </div>

      {open && (
        <dl className="grid gap-x-6 gap-y-3 border-t border-border p-4 text-sm sm:grid-cols-2">
          <Row label="ایمیل" value={request.email ?? "—"} ltr />
          <Row label="شمارهٔ موبایل (تأییدشده)" value={formatPhoneFa(request.phone)} ltr />
          {/* کد ملیِ کامل فقط همین‌جا. */}
          <Row label="کد ملی" value={request.nationalId} ltr />
          <Row label="محل تدریس" value={request.locationLabel ?? "—"} />
          <Row label="مدرسه" value={request.school} />
          <Row label="تاریخ درخواست" value={new Date(request.createdAt).toLocaleString("fa-IR")} />

          <div className="flex flex-col gap-1 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">حکم کارگزینی</dt>
            <dd>
              <a
                href={request.documentHref}
                // ⚠️ تبِ تازه، چون پاسخ `Content-Disposition: attachment`
                // دارد و در همین تب، ناوبری را نیمه‌کاره رها می‌کرد.
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-[13px] hover:border-primary/50"
              >
                {request.documentName}
                <span className="text-xs text-muted-foreground">
                  ({Math.max(1, Math.round(request.documentSize / 1024)).toLocaleString("fa-IR")} کیلوبایت)
                </span>
              </a>
            </dd>
          </div>

          {request.reviewedAt && (
            <Row
              label="بررسی‌شده توسط"
              value={`${request.reviewerName ?? "—"} · ${new Date(request.reviewedAt).toLocaleString("fa-IR")}`}
            />
          )}
          {request.reviewNote && (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">
                {request.status === "needs_revision" ? "توضیح اصلاح" : "دلیل رد"}
              </dt>
              <dd className="whitespace-pre-line">{request.reviewNote}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

/** `989123456789` → `0912 345 6789`. نسخهٔ کوچکِ `formatPhone`، چون آن یکی
 *  `null` می‌پذیرد و اینجا ستون NOT NULL است. */
function formatPhoneFa(canonical: string): string {
  if (!/^989\d{9}$/.test(canonical)) return canonical;
  const n = canonical.slice(2);
  return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

/* ──────────────────────────── دیالوگِ رد ──────────────────────────────── */

/**
 * ⚠️ یادداشت اجباری است و دکمه تا وقتی متن ننوشته باشد غیرفعال می‌ماند.
 *
 * سرور هم همین را می‌سنجد (`adminRejectTeacherRequest`)، ولی گرفتنش در
 * رابط کاربری یعنی مدیر *قبل* از کلیک می‌فهمد چه لازم است — و بند ۶ به
 * همین متن تکیه دارد: بدونِ آن، کاربر فقط «رد شد» می‌بیند و همان مدارک را
 * دوباره می‌فرستد.
 */
function NoteDialog({
  request,
  target,
  busy,
  onCancel,
  onSubmit,
}: {
  request: AdminTeacherRequest;
  target: "rejected" | "needs_revision";
  busy: boolean;
  onCancel: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const name = [request.firstName, request.lastName].filter(Boolean).join(" ") || "این کاربر";
  const rejecting = target === "rejected";

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">
          {rejecting ? `رد درخواست ${name}` : `درخواست اصلاح مدارک از ${name}`}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {rejecting
            ? "این متن عیناً به کاربر نشان داده می‌شود؛ بنویس چرا رد شد."
            : "پرونده باز می‌ماند و کاربر می‌تواند مدرک تازه بفرستد. بنویس دقیقاً چه چیزی باید درست شود."}
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={500}
          autoFocus
          placeholder="مثلاً: تصویر حکم خوانا نیست؛ لطفاً نسخهٔ واضح‌تری بفرست."
          className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-10 rounded-xl border border-border px-4 text-sm"
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={busy || note.trim().length < 5}
            onClick={() => onSubmit(note)}
            className={
              rejecting
                ? "min-h-10 rounded-xl bg-destructive px-4 text-sm font-medium text-destructive-foreground disabled:opacity-60"
                : "min-h-10 rounded-xl bg-gold px-4 text-sm font-medium text-[oklch(0.2_0.03_260)] disabled:opacity-60"
            }
          >
            {busy ? "در حال ثبت…" : rejecting ? "رد کن" : "ارسال برای اصلاح"}
          </button>
        </div>
      </div>
    </div>
  );
}
