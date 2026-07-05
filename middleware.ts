import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "lj_session";

/**
 * Fast edge guard: if a protected route is requested without any session
 * cookie, redirect straight to sign-in. Full signature + role verification
 * still happens in the route-group layouts (Node runtime).
 */
export function middleware(req: NextRequest) {
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasCookie) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();
  url.pathname = "/auth/sign-in";
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
