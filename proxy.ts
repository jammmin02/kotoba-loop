import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Routes (and their sub-paths) that don't require a session.
const PUBLIC_ROUTES = ["/welcome", "/login", "/register", "/dev"];
// Of those, the ones a signed-in user shouldn't be able to revisit (they'd just
// hit a "가입 중"/duplicate-email dead end instead of continuing where they left off).
const GUEST_ONLY_ROUTES = ["/welcome", "/login", "/register"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isGuestOnlyRoute(pathname: string) {
  return GUEST_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default auth((req) => {
  // 비로그인 방문자가 사이트 첫 화면(/)으로 들어오면 로그인 폼 대신 앱 소개 온보딩을 먼저 보여준다
  // (2026-09-23). 다른 보호 경로는 기존처럼 callbackUrl을 달고 로그인으로 보낸다.
  if (!req.auth && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/welcome", req.nextUrl));
  }

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
