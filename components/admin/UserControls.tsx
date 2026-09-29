"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminToast } from "./AdminToast";
import ConfirmDialog from "./ConfirmDialog";
import RevokeTeacherDialog from "./RevokeTeacherDialog";
import { adminDeleteUser, adminSetUserBanned, adminSetUserRole } from "@/lib/admin/user-actions";
import {
  adminRevokeUserSession,
  adminRevokeUserSessions,
  adminUpdateUserName,
  adminVerifyUserContact,
  type AdminUserProfile,
  type AdminUserSession,
} from "@/lib/admin/user-control-actions";
import { adminRevokeTeacher } from "@/lib/admin/teacher-actions";
import type { AuditRow } from "@/lib/admin/log-actions";
import type { UserRole } from "@/lib/auth/types";

const fa = (n: number) => n.toLocaleString("fa-IR");

function formatDate(iso: string | null | undefined, withTime = true) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** «۰۹۱۲ ۳۴۵ ۶۷۸۹» از `989123456789` — همان شکلی که مدیر در تلفن می‌بیند. */
function formatPhone(phone: string | null) {
  if (!phone) return null;
  const local = phone.replace(/^98/, "0");
  return local.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3");
}

const ROLE_TEXT: Record<UserRole, string> = { student: "دانش‌آموز", teacher: "دبیر", admin: "مدیر" };
const GRADE_TEXT: Record<string, string> = { "10": "دهم", "11": "یازدهم", "12": "دوازدهم" };

/**
 * خلاصهٔ خوانای user-agent — «کروم روی اندروید».
 *
 * ⚠️ تقریبی و عمداً ساده: هدف این است که مدیر و کاربر بتوانند بگویند «این
 * گوشیِ من نیست»، نه شناساییِ دقیقِ نسخه. رشتهٔ کامل در `title` هست.
 */
function describeAgent(ua: string | null): string {
  if (!ua) return "دستگاهِ نامعلوم";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "فایرفاکس"
        : /Chrome\//.test(ua)
          ? "کروم"
          : /Safari\//.test(ua)
            ? "سافاری"
            : "مرورگر";
  const os = /Android/.test(ua)
    ? "اندروید"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "ویندوز"
        : /Mac OS X|Macintosh/.test(ua)
          ? "مک"
          : /Linux/.test(ua)
            ? "لینوکس"
            : "";
  return os ? `${browser} روی ${os}` : browser;
}

type Pending =
  | "ban"
  | "unban"
  | "promote"
  | "demote"
  | "signout-all"
  | "delete"
  | "verify-email"
  | "verify-phone"
  | { session: AdminUserSession };

export default function UserControls({
  profile,
  sessions,
  audit,
  isSelf,
}: {
  profile: AdminUserProfile;
  sessions: AdminUserSession[];
  audit: AuditRow[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const toast = useAdminToast();
  const [busy, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<Pending | null>(null);
  const [revokingTeacher, setRevokingTeacher] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState(profile.firstName ?? "");
  const [lastName, setLastName] = useState(profile.lastName ?? "");

  const who = profile.fullName || profile.email || formatPhone(profile.phone) || profile.id;

  /** اجرای یک اقدام و تازه‌کردنِ داده‌های سرور. */
  const run = (fn: () => Promise<{ ok: true } | { ok: false; errors: string[] }>, success: string) => {
    setConfirming(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast(success, "success");
      router.refresh();
    });
  };

  const execute = (p: Pending) => {
    if (typeof p === "object") {
      return run(() => adminRevokeUserSession(profile.id, p.session.id), "از آن دستگاه خارج شد.");
    }
    switch (p) {
      case "ban":
        return run(() => adminSetUserBanned(profile.id, true), "کاربر مسدود شد.");
      case "unban":
        return run(() => adminSetUserBanned(profile.id, false), "مسدودی برداشته شد.");
      case "promote":
        return run(() => adminSetUserRole(profile.id, "admin"), "به مدیر ارتقا یافت.");
      case "demote":
        return run(() => adminSetUserRole(profile.id, "student"), "دسترسیِ مدیریت برداشته شد.");
      case "signout-all":
        return run(() => adminRevokeUserSessions(profile.id), "از همهٔ دستگاه‌ها خارج شد.");
      case "verify-email":
        return run(() => adminVerifyUserContact(profile.id, "email"), "ایمیل تأیید شد.");
      case "verify-phone":
        return run(() => adminVerifyUserContact(profile.id, "phone"), "موبایل تأیید شد.");
      case "delete":
        setConfirming(null);
        startTransition(async () => {
          const result = await adminDeleteUser(profile.id);
          if (!result.ok) return toast(result.errors.join("\n"));
          toast("حساب حذف شد.", "success");
          router.push("/admin/users");
        });
        return;
    }
  };

  const saveName = () => {
    startTransition(async () => {
      const result = await adminUpdateUserName(profile.id, firstName, lastName);
      if (!result.ok) return toast(result.errors.join("\n"));
      toast("نام ذخیره شد.", "success");
      setEditingName(false);
      router.refresh();
    });
  };

  const revokeTeacher = (reason: string) => {
    startTransition(async () => {
      const result = await adminRevokeTeacher(profile.id, reason);
      if (!result.ok) return toast(result.errors.join("\n"));
      setRevokingTeacher(false);
      toast("دسترسی دبیری لغو شد.", "success");
      router.refresh();
    });
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast("کپی شد.", "success"),
      () => toast("کپی نشد."),
    );
  };

  const copy_ = COPY[typeof confirming === "object" && confirming ? "session" : (confirming ?? "ban")];
  const btn =
    "min-h-10 rounded-xl border border-border bg-card px-3 text-sm transition-colors disabled:opacity-50 " +
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-muted/50";

  return (
    <div className="flex flex-col gap-6">
      {/* ── سرِ صفحه ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Link href="/admin/users" className="text-xs text-muted-foreground hover:text-foreground">
          → بازگشت به کاربران
        </Link>
        <div className="flex flex-wrap items-start gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- آواتارِ آپلودی از مسیرِ /uploads؛ بهینه‌سازِ تصویر اینجا لازم نیست.
            <img src={profile.avatarUrl} alt="" className="size-16 rounded-2xl object-cover" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/12 text-2xl font-bold text-primary">
              {who.slice(0, 1)}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {editingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={40}
                  placeholder="نام"
                  aria-label="نام"
                  className="min-h-10 w-36 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={40}
                  placeholder="نام خانوادگی"
                  aria-label="نام خانوادگی"
                  className="min-h-10 w-44 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <button type="button" disabled={busy} onClick={saveName} className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  ذخیره
                </button>
                <button type="button" disabled={busy} onClick={() => setEditingName(false)} className={btn}>
                  انصراف
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{who}</h1>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  ویرایش نام
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={profile.role === "admin" ? "primary" : profile.role === "teacher" ? "gold" : "muted"}>
                {ROLE_TEXT[profile.role]}
              </Badge>
              {profile.isBanned && <Badge tone="danger">مسدود</Badge>}
              {profile.plus.isActive && (
                <Badge tone="gold">
                  پلاس{profile.plus.daysRemaining !== null ? ` · ${fa(profile.plus.daysRemaining)} روز` : " · دائمی"}
                </Badge>
              )}
              {profile.desiredRole === "teacher" && profile.role !== "teacher" && (
                <Badge tone="muted">می‌خواهد دبیر شود</Badge>
              )}
              {isSelf && <Badge tone="primary">حسابِ خودتان</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* ── اقدام‌ها ─────────────────────────────────────────────────── */}
      <section aria-label="اقدام‌ها" className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3">
        <button
          type="button"
          disabled={busy || sessions.length === 0}
          onClick={() => setConfirming("signout-all")}
          className={btn}
          title={sessions.length === 0 ? "دستگاهِ واردشده‌ای ندارد" : undefined}
        >
          خروج از همهٔ دستگاه‌ها
        </button>
        {!isSelf && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(profile.role === "admin" ? "demote" : "promote")}
            className={`${btn} ${profile.role === "admin" ? "" : "text-primary"}`}
          >
            {profile.role === "admin" ? "برداشتن مدیریت" : "ارتقا به مدیر"}
          </button>
        )}
        {profile.role === "teacher" && (
          <button type="button" disabled={busy} onClick={() => setRevokingTeacher(true)} className={`${btn} text-destructive`}>
            لغو دبیری
          </button>
        )}
        {!isSelf && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(profile.isBanned ? "unban" : "ban")}
            className={`${btn} ${profile.isBanned ? "text-primary" : ""}`}
          >
            {profile.isBanned ? "رفع مسدودی" : "مسدود کردن"}
          </button>
        )}
        {!isSelf && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming("delete")}
            className="min-h-10 rounded-xl bg-destructive/10 px-3 text-sm text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
          >
            حذف حساب
          </button>
        )}
      </section>

      {/* ── مشخصات ───────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2">
        <InfoCard title="راه‌های تماس">
          <InfoRow label="ایمیل">
            {profile.email ? (
              <span className="flex flex-wrap items-center gap-2">
                <button type="button" dir="ltr" onClick={() => copy(profile.email!)} className="hover:text-primary" title="کپی">
                  {profile.email}
                </button>
                {profile.emailVerifiedAt ? (
                  <Badge tone="primary">تأییدشده</Badge>
                ) : (
                  <button type="button" disabled={busy} onClick={() => setConfirming("verify-email")} className="text-xs text-primary hover:underline">
                    تأیید دستی
                  </button>
                )}
              </span>
            ) : (
              "—"
            )}
          </InfoRow>
          <InfoRow label="موبایل">
            {profile.phone ? (
              <span className="flex flex-wrap items-center gap-2">
                <button type="button" dir="ltr" onClick={() => copy(formatPhone(profile.phone)!)} className="hover:text-primary" title="کپی">
                  {formatPhone(profile.phone)}
                </button>
                {profile.phoneVerifiedAt ? (
                  <Badge tone="primary">تأییدشده</Badge>
                ) : (
                  <button type="button" disabled={busy} onClick={() => setConfirming("verify-phone")} className="text-xs text-primary hover:underline">
                    تأیید دستی
                  </button>
                )}
              </span>
            ) : (
              "—"
            )}
          </InfoRow>
          <InfoRow label="شناسه">
            <button type="button" dir="ltr" onClick={() => copy(profile.id)} className="font-mono text-[11px] hover:text-primary" title="کپی">
              {profile.id}
            </button>
          </InfoRow>
        </InfoCard>

        <InfoCard title="حساب">
          <InfoRow label="عضویت">{formatDate(profile.createdAt)}</InfoRow>
          <InfoRow label="آخرین ورود">{formatDate(profile.lastSignInAt)}</InfoRow>
          <InfoRow label="مدرسه و پایه">
            {[profile.school, profile.grade ? GRADE_TEXT[profile.grade] ?? profile.grade : null].filter(Boolean).join(" · ") || "—"}
          </InfoRow>
          <InfoRow label="پروفایل">{profile.profileCompletedAt ? "کامل" : "ناقص"}</InfoRow>
        </InfoCard>

        <InfoCard title="سروا پلاس">
          <InfoRow label="وضعیت">
            {profile.plus.state === "off"
              ? "پلاس خاموش است"
              : profile.plus.isActive
                ? "فعال"
                : profile.plus.state === "expired"
                  ? "منقضی‌شده"
                  : "ندارد"}
          </InfoRow>
          <InfoRow label="اعتبار تا">
            {profile.plus.isActive ? (profile.plus.expiresAt ? formatDate(profile.plus.expiresAt, false) : "دائمی") : "—"}
          </InfoRow>
          <InfoRow label="مدیریت">
            <Link href="/admin/plus" className="text-xs text-primary hover:underline">
              اعطا، تمدید یا لغو در بخشِ سروا پلاس
            </Link>
          </InfoRow>
        </InfoCard>

        <InfoCard title="در سایت">
          <InfoRow label="سروده و دیدگاه">
            {fa(profile.counts.clubPosts)} سروده · {fa(profile.counts.clubComments)} دیدگاه
          </InfoRow>
          <InfoRow label="تیکت پشتیبانی">{fa(profile.counts.tickets)}</InfoRow>
          <InfoRow label="گزارشِ ایراد">{fa(profile.counts.contentReports)}</InfoRow>
        </InfoCard>
      </section>

      {/* ── دستگاه‌ها ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          دستگاه‌های واردشده {sessions.length > 0 && `(${fa(sessions.length)})`}
        </h2>
        {sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            الان روی هیچ دستگاهی وارد نیست.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm" title={s.userAgent ?? undefined}>
                    {describeAgent(s.userAgent)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span dir="ltr">{s.ip ?? "IP نامعلوم"}</span> · ورود {formatDate(s.createdAt)} · آخرین استفاده{" "}
                    {formatDate(s.lastUsedAt ?? s.createdAt)}
                  </p>
                </div>
                <button type="button" disabled={busy} onClick={() => setConfirming({ session: s })} className={`${btn} min-h-9 text-xs`}>
                  خروج از این دستگاه
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── تاریخچه ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">کارهای مدیران روی این حساب</h2>
        {audit.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            تا امروز هیچ مدیری روی این حساب کاری نکرده.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {audit.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className={`text-sm ${a.destructive ? "text-destructive" : ""}`}>{a.summary}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {a.actorEmail}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">{formatDate(a.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirming !== null}
        tone={copy_.tone}
        title={copy_.title}
        body={copy_.body(who, typeof confirming === "object" && confirming ? describeAgent(confirming.session.userAgent) : "")}
        consequence={copy_.consequence}
        confirmLabel={copy_.confirmLabel}
        // حذفِ حساب تنها کارِ بی‌برگشتِ این صفحه است — تایپِ نشانیِ حساب یعنی
        // مدیر حتماً نگاه کرده دارد کدام را حذف می‌کند.
        requireTyping={confirming === "delete" ? profile.email || profile.phone?.replace(/^98/, "0") || profile.id : undefined}
        onConfirm={() => confirming && execute(confirming)}
        onCancel={() => setConfirming(null)}
      />

      {revokingTeacher && (
        <RevokeTeacherDialog
          who={who}
          busy={busy}
          onConfirm={revokeTeacher}
          onCancel={() => setRevokingTeacher(false)}
        />
      )}
    </div>
  );
}

const COPY: Record<
  Exclude<Pending, { session: AdminUserSession }> | "session",
  {
    title: string;
    body: (who: string, device: string) => string;
    consequence?: string;
    confirmLabel: string;
    tone: "danger" | "primary";
  }
> = {
  ban: {
    title: "مسدود کردن کاربر",
    body: (who) => `${who} دیگر نمی‌تواند وارد حسابش شود.`,
    consequence: "همهٔ دستگاه‌هایی که با این حساب وارد شده‌اند بلافاصله خارج می‌شوند.",
    confirmLabel: "مسدود کن",
    tone: "danger",
  },
  unban: {
    title: "رفع مسدودی",
    body: (who) => `${who} دوباره می‌تواند وارد حسابش شود.`,
    confirmLabel: "رفع مسدودی",
    tone: "primary",
  },
  promote: {
    title: "ارتقا به مدیر",
    body: (who) => `${who} به مدیر تبدیل می‌شود.`,
    consequence:
      "مدیر به همهٔ بخش‌های پنل دسترسی کامل دارد: می‌تواند محتوا را حذف کند، کاربران را مسدود کند و حتی مدیران دیگر را حذف کند.",
    confirmLabel: "مدیرش کن",
    tone: "danger",
  },
  demote: {
    title: "برداشتن دسترسی مدیریت",
    body: (who) => `${who} دیگر به پنل مدیریت دسترسی نخواهد داشت.`,
    confirmLabel: "دانش‌آموزش کن",
    tone: "primary",
  },
  "signout-all": {
    title: "خروج از همهٔ دستگاه‌ها",
    body: (who) => `${who} روی همهٔ دستگاه‌ها از حسابش خارج می‌شود.`,
    consequence:
      "برای گوشیِ گم‌شده یا رمزِ لورفته. حساب مسدود نمی‌شود — صاحبش می‌تواند همین الان دوباره وارد شود.",
    confirmLabel: "خارجش کن",
    tone: "primary",
  },
  session: {
    title: "خروج از یک دستگاه",
    body: (who, device) => `${who} روی «${device}» از حسابش خارج می‌شود.`,
    confirmLabel: "خارج کن",
    tone: "primary",
  },
  "verify-email": {
    title: "تأیید دستیِ ایمیل",
    body: (who) => `ایمیلِ ${who} بدونِ کدِ تأیید، تأییدشده علامت می‌خورد.`,
    consequence: "فقط وقتی که مطمئنید این ایمیل واقعاً مالِ همین کاربر است — مثلاً از راهِ دیگری با او در تماس بوده‌اید.",
    confirmLabel: "تأیید کن",
    tone: "primary",
  },
  "verify-phone": {
    title: "تأیید دستیِ موبایل",
    body: (who) => `موبایلِ ${who} بدونِ کدِ پیامکی، تأییدشده علامت می‌خورد.`,
    consequence: "از این به بعد پیامک‌های اطلاع‌رسانی به این شماره می‌رود؛ فقط وقتی که مطمئنید شماره مالِ همین کاربر است.",
    confirmLabel: "تأیید کن",
    tone: "primary",
  },
  delete: {
    title: "حذف دائمی حساب",
    body: (who) => `حساب ${who} برای همیشه حذف می‌شود.`,
    consequence:
      "همهٔ کارنامه‌ها، سروده‌ها، دیدگاه‌ها، اشتراک و نشان‌شده‌های این کاربر هم پاک می‌شوند. این کار هیچ راه برگشتی ندارد.",
    confirmLabel: "برای همیشه حذف کن",
    tone: "danger",
  },
};

function Badge({ tone, children }: { tone: "primary" | "gold" | "danger" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "primary"
      ? "bg-primary/12 text-primary"
      : tone === "gold"
        ? "bg-gold/15 text-gold-ink"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card">
      <h2 className="border-b border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground">{title}</h2>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-left">{children}</span>
    </div>
  );
}
