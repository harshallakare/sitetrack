import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/session";

// /invite/* is a public accept flow reached from an emailed/shared link --
// the recipient may have no session (or no account) yet, so it must never be
// gated behind the tenant login.
const PUBLIC_PATHS = ["/login", "/register", "/invite", "/forgot-password", "/reset-password"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin/* is a fully separate auth domain (its own cookie, its own
  // login page at /admin/login) -- it must never be gated by the tenant
  // st_access cookie here. The (platform-admin)/admin layout does its own
  // server-side check against the admin session and redirects to
  // /admin/login itself, so this middleware simply stays out of the way.
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasSession = Boolean(req.cookies.get(ACCESS_COOKIE)?.value);

  if (!isPublic && !hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Bounce already-logged-in users away from login/register only. NOT from
  // /invite -- an existing user following an invite link is joining an
  // additional organization and must be allowed to reach the accept page.
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
