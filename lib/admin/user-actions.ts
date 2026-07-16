"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type AdminUserRow = {
  id: string;
  email: string | undefined;
  fullName: string | undefined;
  role: "student" | "admin";
  createdAt: string;
  isBanned: boolean;
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

/** auth.users isn't exposed over PostgREST, so listing users goes through
 *  the GoTrue admin API (supabase.auth.admin.*) instead of a table query —
 *  only available with the service-role key. Merged with each user's role
 *  from profiles (users created before the 0002 migration's trigger existed
 *  won't have a profiles row yet, hence the "student" fallback). */
export async function adminListUsers(): Promise<AdminUserRow[]> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) throw new Error(`adminListUsers: ${usersError.message}`);

  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, role, full_name");
  if (profilesError) throw new Error(`adminListUsers profiles: ${profilesError.message}`);

  const roleById = new Map((profiles ?? []).map((p) => [p.id, p.role as "student" | "admin"]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? undefined]));

  return usersPage.users
    .map((u) => ({
      id: u.id,
      email: u.email,
      fullName: nameById.get(u.id) ?? (u.user_metadata?.full_name as string | undefined),
      role: roleById.get(u.id) ?? "student",
      createdAt: u.created_at,
      isBanned: !!u.banned_until && new Date(u.banned_until) > new Date(),
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Creates the profiles row if the user pre-dates the signup trigger
 *  (same situation the very first admin promotion hit manually). */
export async function adminSetUserRole(userId: string, role: "student" | "admin"): Promise<ActionResult<null>> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { error } = await supabase.from("profiles").upsert({ id: userId, role }, { onConflict: "id" });
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, data: null };
}

/** GoTrue has no permanent-ban flag, only a duration — "876000h" (~100
 *  years) is the standard way every Supabase project represents "banned
 *  indefinitely"; "none" lifts it. A banned user's existing sessions stay
 *  valid until they expire, but they can't sign in again. */
export async function adminSetUserBanned(userId: string, banned: boolean): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, errors: ["نمی‌توانید حساب خودتان را بن کنید."] };

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, data: null };
}

/** Permanently deletes the auth user; profiles row cascades with it. */
export async function adminDeleteUser(userId: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, errors: ["نمی‌توانید حساب خودتان را حذف کنید."] };

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, data: null };
}
