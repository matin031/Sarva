"use client";

import { useState } from "react";
import { adminSetUserRole, type AdminUserRow } from "@/lib/admin/user-actions";

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
          <div key={u.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <span className="truncate text-sm font-semibold">{u.fullName || u.email || u.id}</span>
              <span className="truncate text-xs text-muted-foreground" dir="ltr">
                {u.email}
              </span>
            </div>
            <select
              dir="rtl"
              disabled={pendingId === u.id}
              value={u.role}
              onChange={(e) => handleRoleChange(u.id, e.target.value as "student" | "admin")}
              className={`min-h-11 shrink-0 rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary ${
                u.role === "admin" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
              }`}
            >
              <option value="student">دانش‌آموز</option>
              <option value="admin">مدیر</option>
            </select>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground">کاربری یافت نشد.</p>}
      </div>
    </div>
  );
}
