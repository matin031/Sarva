import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Throws unless the currently signed-in user (from the request's session
 * cookie) has role = 'admin' in profiles. Call at the top of every admin
 * server action / route handler before touching exam_bank tables — those
 * tables have no RLS policy for regular users, so this is the only gate.
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("باید وارد حساب کاربری خود شوید.");

  // profiles has no client-readable policy for rows other than your own,
  // and this check IS reading your own row, so the session-bound client
  // would work too — using the admin client here anyway to keep this
  // function's behavior independent of RLS policy changes on profiles.
  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("شما دسترسی مدیریت ندارید.");

  return user;
}
