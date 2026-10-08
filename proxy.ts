import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-admin";
import { getMaintenanceState } from "@/lib/settings";

// Routes (and their sub-paths) that don't require a session.
// `/dev`는 개발 중 로그인 없이 개발용 화면을 보려고 열어 둔 것이다. 운영에서는 아래 `isDevRoute` 검사가
// 렌더링 전에 404로 막는다(app/dev/layout.tsx는 2차 방어).
const PUBLIC_ROUTES = ["/welcome", "/login", "/register", "/pending", "/maintenance", "/dev"];
// 점검 중에도 관리자가 로그인할 수 있어야 하므로 로그인 경로는 막지 않는다.
const MAINTENANCE_EXEMPT_ROUTES = ["/login", "/maintenance"];
// Of those, the ones a signed-in user shouldn't be able to revisit (they'd just
// hit a "가입 중"/duplicate-email dead end instead of continuing where they left off).
const GUEST_ONLY_ROUTES = ["/welcome", "/login", "/register"];

function isDevRoute(pathname: string) {
  return pathname === "/dev" || pathname.startsWith("/dev/");
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isGuestOnlyRoute(pathname: string) {
  return GUEST_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isMaintenanceExempt(pathname: string) {
  return MAINTENANCE_EXEMPT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default auth(async (req) => {
  // 운영에서는 개발 전용 화면이 아예 없는 것처럼 보이게 한다. 페이지 안에서 notFound()를 던지면 루트
  // loading.tsx 때문에 스트리밍이 먼저 시작돼 상태 코드가 200으로 확정되고 페이지 제목도 새 나가므로,
  // 렌더링 전에 존재하지 않는 경로로 재작성해 진짜 404(상태 코드 + not-found 화면)가 나가게 한다.
  if (process.env.NODE_ENV === "production" && isDevRoute(req.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL("/dev-disabled", req.nextUrl));
  }

  // 점검 모드: 관리자를 뺀 모든 사용자를 점검 안내 화면으로 보낸다. 조회에 실패하면 서비스를 열어 둔다
  // (getMaintenanceState가 fail-open). /api/* 는 이 파일의 matcher에서 빠져 있어 영향받지 않는다.
  if (!isAdminRole(req.auth?.user?.role) && !isMaintenanceExempt(req.nextUrl.pathname)) {
    const maintenance = await getMaintenanceState();
    if (maintenance.enabled) {
      return NextResponse.redirect(new URL("/maintenance", req.nextUrl));
    }
  }

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

  // /admin 은 관리자만. 실제 권한 검사는 각 페이지·API가 서버에서 다시 한다(여기는 빠른 차단용).
  const { pathname } = req.nextUrl;
  if (req.auth && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    if (!isAdminRole(req.auth.user?.role)) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
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
