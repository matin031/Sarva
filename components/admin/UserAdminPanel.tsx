"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  adminDeleteUser,
  adminListUsers,
  adminSetUserBanned,
  adminSetUserRole,
  type AdminUserRow,
} from "@/lib/admin/user-actions";
import { USER_PAGE_SIZE } from "@/lib/admin/log-constants";
import { useAdminToast } from "@/components/admin/AdminToast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
}

type RoleFilter = "" | "student" | "admin";
type StatusFilter = "" | "active" | "banned" | "unverified";

/** کاری که منتظر تأیید است. */
type PendingAction =
  | { kind: "ban"; user: AdminUserRow }
  | { kind: "unban"; user: AdminUserRow }
  | { kind: "delete"; user: AdminUserRow }
  | { kind: "promote"; user: AdminUserRow }
  | { kind: "demote"; user: AdminUserRow };

export default function UserAdminPanel({
  initialUsers,
  initialTotal,
}: {
  initialUsers: AdminUserRow[];
  initialTotal: number;
}) {
  const toast = useAdminToast();
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PendingAction | null>(null);
  const [pending, startTransition] = useTransition();

  const load = (
    next: { query?: string; role?: RoleFilter; status?: StatusFilter },
    append = false,
  ) => {
    startTransition(async () => {
      const result = await adminListUsers({
        query: (next.query ?? query) || undefined,
        role: ((next.role ?? role) || undefined) as "student" | "admin" | undefined,
        status: ((next.status ?? status) || undefined) as StatusFilter extends "" ? never : "active" | "banned" | "unverified" | undefined,
        limit: USER_PAGE_SIZE,
        offset: append ? users.length : 0,
      });
      setTotal(result.total);
      setUsers((prev) => (append ? [...prev, ...result.users] : result.users));
    });
  };

  // جست‌وجو با تأخیر: بدون آن، هر حرفِ تایپ‌شده یک کوئری می‌فرستد و پاسخ‌ها
  // می‌توانند بی‌ترتیب برسند — یعنی نتیجهٔ «عل» بعد از «علی» بنشیند.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load({ query: value }), 300);
  };

  async function run(action: PendingAction) {
    const { user } = action;
    setConfirming(null);
    setBusyId(user.id);

    try {
      if (action.kind === "delete") {
        const result = await adminDeleteUser(user.id);
        if (!result.ok) return toast(result.errors.join("\n"));
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setTotal((t) => Math.max(0, t - 1));
        toast("کاربر حذف شد.", "success");
        return;
      }

      if (action.kind === "ban" || action.kind === "unban") {
        const banning = action.kind === "ban";
        const result = await adminSetUserBanned(user.id, banning);
        if (!result.ok) return toast(result.errors.join("\n"));
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isBanned: banning } : u)));
        toast(banning ? "کاربر مسدود شد." : "مسدودی برداشته شد.", "success");
        return;
      }

      const nextRole = action.kind === "promote" ? "admin" : "student";
      const result = await adminSetUserRole(user.id, nextRole);
      if (!result.ok) return toast(result.errors.join("\n"));
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
      toast(nextRole === "admin" ? "به مدیر ارتقا یافت." : "به دانش‌آموز تغییر کرد.", "success");
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = Boolean(query || role || status);

  return (
    <div dir="rtl" className="flex flex-col gap-5 p-4 xs:p-6">
      <div>
        <h1 className="text-xl font-bold">مدیریت کاربران</h1>
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? `${total.toLocaleString("fa-IR")} کاربر با این فیلترها`
            : `${total.toLocaleString("fa-IR")} کاربر ثبت‌شده`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          dir="rtl"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="جست‌وجو با ایمیل یا نام…"
          className="min-h-11 w-full max-w-xs flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as RoleFilter);
            load({ role: e.target.value as RoleFilter });
          }}
          className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">همهٔ نقش‌ها</option>
          <option value="student">دانش‌آموز</option>
          <option value="admin">مدیر</option>
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter);
            load({ status: e.target.value as StatusFilter });
          }}
          className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">همهٔ وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="unverified">ایمیل تأییدنشده</option>
          <option value="banned">مسدود</option>
        </select>
      </div>

      {/* روی دسکتاپ جدول، روی موبایل کارت.
          جدول قبلی min-w-[720px] داشت و روی موبایل فقط افقی اسکرول می‌شد —
          کار می‌کرد ولی خواندنش عملاً ممکن نبود. */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">کاربر</th>
              <th className="px-4 py-3 font-medium">نقش</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              <th className="px-4 py-3 font-medium">عضویت</th>
              <th className="px-4 py-3 font-medium">آخرین ورود</th>
              <th className="px-4 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="flex flex-col gap-0.5 hover:text-primary">
                    <span className="font-medium">{u.fullName || u.email || u.id}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {u.email}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadges user={u} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(u.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(u.lastSignInAt)}
                </td>
                <td className="px-4 py-3">
                  <RowActions user={u} busy={busyId === u.id} onAsk={setConfirming} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !pending && (
          <p className="p-8 text-center text-sm text-muted-foreground">کاربری یافت نشد.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {users.map((u) => (
          <div key={u.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <Link href={`/admin/users/${u.id}`} className="flex flex-col gap-0.5">
              <span className="font-medium">{u.fullName || u.email || u.id}</span>
              <span className="text-xs text-muted-foreground" dir="ltr">
                {u.email}
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-1.5">
              <RoleBadge role={u.role} />
              <StatusBadges user={u} />
            </div>
            <p className="text-xs text-muted-foreground">
              عضویت {formatDate(u.createdAt)} · آخرین ورود {formatDate(u.lastSignInAt)}
            </p>
            <RowActions user={u} busy={busyId === u.id} onAsk={setConfirming} />
          </div>
        ))}
        {users.length === 0 && !pending && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            کاربری یافت نشد.
          </p>
        )}
      </div>

      {users.length < total && (
        <button
          type="button"
          disabled={pending}
          onClick={() => load({}, true)}
          className="min-h-11 rounded-xl border border-border bg-card text-sm text-muted-foreground disabled:opacity-60"
        >
          {pending
            ? "در حال بارگذاری…"
            : `نمایش بیشتر (${users.length.toLocaleString("fa-IR")} از ${total.toLocaleString("fa-IR")})`}
        </button>
      )}

      <ConfirmDialog
        open={confirming !== null}
        tone={confirming?.kind === "unban" || confirming?.kind === "demote" ? "primary" : "danger"}
        title={confirming ? CONFIRM_COPY[confirming.kind].title : ""}
        body={
          confirming
            ? CONFIRM_COPY[confirming.kind].body(confirming.user.email || confirming.user.id)
            : ""
        }
        consequence={confirming ? CONFIRM_COPY[confirming.kind].consequence : undefined}
        confirmLabel={confirming ? CONFIRM_COPY[confirming.kind].confirmLabel : "تأیید"}
        // حذف حساب تنها کاری در این صفحه است که هیچ راه برگشتی ندارد — تایپ
        // کردن ایمیل یعنی مدیر حتماً نگاه کرده که دارد کدام حساب را حذف می‌کند.
        requireTyping={confirming?.kind === "delete" ? confirming.user.email : undefined}
        onConfirm={() => confirming && run(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

const CONFIRM_COPY: Record<
  PendingAction["kind"],
  {
    title: string;
    body: (who: string) => string;
    consequence?: string;
    confirmLabel: string;
  }
> = {
  ban: {
    title: "مسدود کردن کاربر",
    body: (who) => `${who} دیگر نمی‌تواند وارد حسابش شود.`,
    consequence: "همهٔ دستگاه‌هایی که با این حساب وارد شده‌اند بلافاصله خارج می‌شوند.",
    confirmLabel: "مسدود کن",
  },
  unban: {
    title: "رفع مسدودی",
    body: (who) => `${who} دوباره می‌تواند وارد حسابش شود.`,
    confirmLabel: "رفع مسدودی",
  },
  delete: {
    title: "حذف دائمی حساب",
    body: (who) => `حساب ${who} برای همیشه حذف می‌شود.`,
    consequence:
      "همهٔ کارنامه‌ها، سروده‌ها، دیدگاه‌ها و نشان‌شده‌های این کاربر هم پاک می‌شوند. این کار هیچ راه برگشتی ندارد.",
    confirmLabel: "برای همیشه حذف کن",
  },
  promote: {
    title: "ارتقا به مدیر",
    body: (who) => `${who} به مدیر تبدیل می‌شود.`,
    consequence:
      "مدیر به همهٔ بخش‌های پنل دسترسی کامل دارد: می‌تواند محتوا را حذف کند، کاربران را مسدود کند، و حتی مدیران دیگر را حذف کند.",
    confirmLabel: "مدیرش کن",
  },
  demote: {
    title: "برداشتن دسترسی مدیریت",
    body: (who) => `${who} دیگر به پنل مدیریت دسترسی نخواهد داشت.`,
    confirmLabel: "دانش‌آموزش کن",
  },
};

function RoleBadge({ role }: { role: "student" | "admin" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        role === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {role === "admin" ? "مدیر" : "دانش‌آموز"}
    </span>
  );
}

function StatusBadges({ user }: { user: AdminUserRow }) {
  return (
    <div className="flex flex-wrap gap-1">
      {user.isBanned && (
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
          مسدود
        </span>
      )}
      {!user.emailConfirmed && (
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
          ایمیل تأییدنشده
        </span>
      )}
      {!user.isBanned && user.emailConfirmed && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">فعال</span>
      )}
    </div>
  );
}

function RowActions({
  user,
  busy,
  onAsk,
}: {
  user: AdminUserRow;
  busy: boolean;
  onAsk: (a: PendingAction) => void;
}) {
  const btn =
    "min-h-9 rounded-lg border border-border bg-card px-2.5 text-xs disabled:opacity-60 transition-colors";

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* تغییر نقش دیگر یک select بی‌صدا نیست. قبلاً ارتقا به مدیر — خطرناک‌ترین
          کار کل پنل — با یک بار انتخاب از dropdown و بدون هیچ پرسشی انجام
          می‌شد. */}
      <button
        type="button"
        disabled={busy}
        onClick={() => onAsk({ kind: user.role === "admin" ? "demote" : "promote", user })}
        className={`${btn} ${user.role === "admin" ? "text-muted-foreground" : "text-primary hover:border-primary/50"}`}
      >
        {user.role === "admin" ? "برداشتن مدیریت" : "ارتقا به مدیر"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onAsk({ kind: user.isBanned ? "unban" : "ban", user })}
        className={`${btn} ${user.isBanned ? "text-primary" : "text-muted-foreground"}`}
      >
        {user.isBanned ? "رفع مسدودی" : "مسدود کردن"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onAsk({ kind: "delete", user })}
        className="min-h-9 rounded-lg bg-destructive/10 px-2.5 text-xs text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
      >
        حذف
      </button>
    </div>
  );
}
