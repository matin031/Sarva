"use client";

import { useState } from "react";
import { adminDeleteUser, adminSetUserBanned, adminSetUserRole, type AdminUserRow } from "@/lib/admin/user-actions";

export default function UserAdminPanel({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: "student" | "admin") {
    setPendingId(userId);
    const result = await adminSetUserRole(userId, role);
    setPendingId(null);
    if (!result.ok) {
      alert(result.errors.join("\n"));
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
      alert(result.errors.join("\n"));
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isBanned: banning } : u)));
  }

  async function handleDelete(user: AdminUserRow) {
    if (!confirm(`حساب ${user.email || user.id} برای همیشه حذف شود؟ این کار قابل بازگشت نیست.`)) return;

    setPendingId(user.id);
    const result = await adminDeleteUser(user.id);
    setPendingId(null);
    if (!result.ok) {
      alert(result.errors.join("\n"));
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  }

  const filtered = users.filter(
    (u) =>
      !query ||
      u.email?.toLowerCase().includes(query.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div dir="rtl" className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 xs:px-5">
      <h1 className="text-xl font-bold">مدیریت کاربران</h1>

      <input
        dir="rtl"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="جست‌وجو با ایمیل یا نام..."
        className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="flex flex-col gap-2">
        {filtered.map((u) => (
          <div key={u.id} className="glass flex flex-col gap-3 rounded-2xl p-4 xs:flex-row xs:items-center xs:justify-between">
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <span className="flex items-center gap-2 truncate text-sm font-semibold">
                {u.fullName || u.email || u.id}
                {u.isBanned && (
                  <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                    بن‌شده
                  </span>
                )}
              </span>
              <span className="truncate text-xs text-muted-foreground" dir="ltr">
                {u.email}
              </span>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <select
                dir="rtl"
                disabled={pendingId === u.id}
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value as "student" | "admin")}
                className={`min-h-11 rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60 ${
                  u.role === "admin" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                }`}
              >
                <option value="student">دانش‌آموز</option>
                <option value="admin">مدیر</option>
              </select>

              <button
                type="button"
                disabled={pendingId === u.id}
                onClick={() => handleToggleBan(u)}
                className={`min-h-11 rounded-xl border px-3 text-xs disabled:opacity-60 ${
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
                className="min-h-11 rounded-xl bg-destructive/10 px-3 text-xs text-destructive disabled:opacity-60"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground">کاربری یافت نشد.</p>}
      </div>
    </div>
  );
}
