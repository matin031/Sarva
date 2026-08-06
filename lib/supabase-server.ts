import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        /** Supabase writes here whenever it rotates the session — and Next
         *  only permits a cookie write from a Server Action or a Route
         *  Handler. From a Server Component the same call throws, taking the
         *  whole page down with it, which is what «Cookies can only be
         *  modified in a Server Action or Route Handler» was.
         *
         *  Swallowing it is safe rather than merely convenient: this client
         *  only ever *reads* the session server-side, and the rotation itself
         *  happens where cookies may be written — in the browser, where
         *  `lib/supabase.ts`'s `createBrowserClient` owns these cookies, and
         *  in `middleware.ts` on /panel and /auth. A page render that cannot
         *  persist a refreshed token simply uses the one it was given.
         *
         *  Called from a Server Action (lib/club/actions.ts and friends) the
         *  write is allowed, nothing throws, and the new token is saved as
         *  usual — so the catch costs those paths nothing. */
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // a Server Component render; see above
          }
        },
      },
    },
  );
}
