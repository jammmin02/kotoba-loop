import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Routes (and their sub-paths) that don't require a session.
const PUBLIC_ROUTES = ["/login", "/register", "/dev"];
// Of those, the ones a signed-in user shouldn't be able to revisit (they'd just
// hit a "가입 중"/duplicate-email dead end instead of continuing where they left off).
const GUEST_ONLY_ROUTES = ["/login", "/register"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isGuestOnlyRoute(pathname: string) {
  return GUEST_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default auth((req) => {
  if (!req.auth && !isPublicRoute(req.nextUrl.pathname)) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth && isGuestOnlyRoute(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
