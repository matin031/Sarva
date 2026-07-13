import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // اگه لاگینه و میخواد بره /auth، بفرستش پنل
  if (user && request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  // اگه لاگین نیست و میخواد بره /panel، بفرستش auth
  if (!user && request.nextUrl.pathname.startsWith("/panel")) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/panel/:path*", "/auth/:path*", "/auth"],
};
