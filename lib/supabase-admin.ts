import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 *
 * NEVER import this from a Client Component or anything that ships to the
 * browser (no "use client" file, no client-exam.ts-style sanitized module).
 * It exists only for: (1) the exam page's server-side data loader, which
 * needs the full answer key to strip it via toClientExam() before the
 * response reaches the browser, (2) the grading server action, and (3) the
 * admin panel's write actions. All three are server-only by construction
 * (Server Components / "use server" actions), the same boundary
 * lib/exam/grading.ts already relies on.
 */
export function createSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — get it from Supabase dashboard → Project Settings → API → service_role, and add it to .env.local.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
