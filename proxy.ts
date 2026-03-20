import { NextRequest, NextResponse } from "next/server";
import {
  SUPABASE_ACCESS_COOKIE,
  SUPABASE_REFRESH_COOKIE,
} from "@/src/lib/supabase/types";
import {
  getSupabaseUser,
  refreshSupabaseSession,
  serializeSessionCookies,
  supabaseAuthConfigured,
} from "@/src/lib/supabase/server";

const PROTECTED_ROUTES = ["/dashboard", "/settings"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!supabaseAuthConfigured) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("reason", "auth-not-configured");
    redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  const accessToken = request.cookies.get(SUPABASE_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(SUPABASE_REFRESH_COOKIE)?.value;

  if (accessToken) {
    const userResult = await getSupabaseUser(accessToken);
    if (userResult.user) {
      return NextResponse.next();
    }
  }

  if (refreshToken) {
    const refreshResult = await refreshSupabaseSession(refreshToken);
    if (refreshResult.session) {
      const response = NextResponse.next();
      for (const cookie of serializeSessionCookies(refreshResult.session)) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      return response;
    }
  }

  const redirectUrl = new URL("/auth", request.url);
  redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
