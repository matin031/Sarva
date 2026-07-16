"use client";

import { useState } from "react";
import { adminDeleteUser, adminSetUserBanned, adminSetUserRole, type AdminUserRow } from "@/lib/admin/user-actions";
import { useAdminToast } from "./AdminToast";

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
}

export default function UserAdminPanel({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const toast = useAdminToast();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: "student" | "admin") {
    setPendingId(userId);
    const result = await adminSetUserRole(userId, role);
    setPendingId(null);
    if (!result.ok) {
      toast(result.errors.join("\n"));
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  }

  async function handleToggleBan(user: AdminUserRow) {
    const banning = !user.isBanned;
    if (banning && !confirm(`${user.email || user.id} بن شود؟ دیگر نمی‌تواند وارد حساب خود شود.`)) return;

    setPendingId(user.id);
    const result = await adminSetUserBanned(user.id, banning);
    setPendingId(null);
    if (!result.ok) {
      toast(result.errors.join("\n"));
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isBanned: banning } : u)));
    toast(banning ? "کاربر بن شد." : "بن کاربر برداشته شد.", "success");
  }

  async function handleDelete(user: AdminUserRow) {
    if (!confirm(`حساب ${user.email || user.id} برای همیشه حذف شود؟ این کار قابل بازگشت نیست.`)) return;

    setPendingId(user.id);
    const result = await adminDeleteUser(user.id);
    setPendingId(null);
    if (!result.ok) {
      toast(result.errors.join("\n"));
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    toast("کاربر حذف شد.", "success");
  }

  const filtered = users.filter(
    (u) =>
      !query ||
      u.email?.toLowerCase().includes(query.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div dir="rtl" className="flex flex-col gap-5 p-4 xs:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">مدیریت کاربران</h1>
          <p className="text-sm text-muted-foreground">{users.length} کاربر ثبت‌شده</p>
        </div>
        <input
          dir="rtl"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو با ایمیل یا نام..."
          className="min-h-11 w-full max-w-xs rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">کاربر</th>
                <th className="px-4 py-3 font-medium">نقش</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">تاریخ عضویت</th>
                <th className="px-4 py-3 font-medium">آخرین ورود</th>
                <th className="px-4 py-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{u.fullName || u.email || u.id}</span>
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {u.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      dir="rtl"
                      disabled={pendingId === u.id}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as "student" | "admin")}
                      className={`min-h-9 rounded-lg border px-2 py-1 text-xs outline-none focus:border-primary disabled:opacity-60 ${
                        u.role === "admin" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                      }`}
                    >
                      <option value="student">دانش‌آموز</option>
                      <option value="admin">مدیر</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.isBanned && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                          بن‌شده
                        </span>
                      )}
                      {!u.emailConfirmed && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
                          ایمیل تأییدنشده
                        </span>
                      )}
                      {!u.isBanned && u.emailConfirmed && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">فعال</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(u.lastSignInAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={pendingId === u.id}
                        onClick={() => handleToggleBan(u)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-60 ${
                          u.isBanned
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {u.isBanned ? "رفع بن" : "بن"}
                      </button>
                      <button
                        type="button"
                        disabled={pendingId === u.id}
                        onClick={() => handleDelete(u)}
                        className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive disabled:opacity-60"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">کاربری یافت نشد.</p>}
      </div>
    </div>
  );
}
