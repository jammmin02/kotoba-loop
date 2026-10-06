"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/members", label: "회원" },
  { href: "/admin/reports", label: "신고" },
  { href: "/admin/content", label: "단어장" },
  { href: "/admin/content-data", label: "학습 데이터" },
  { href: "/admin/announcements", label: "공지" },
  { href: "/admin/settings", label: "설정" },
  { href: "/admin/ai", label: "AI" },
  { href: "/admin/stats", label: "통계" },
  { href: "/admin/audit", label: "감사 로그" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="관리자 메뉴" className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-2 border-pixel-ink px-3 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active
                ? "bg-primary text-primary-foreground shadow-bevel-sunken"
                : "bg-surface text-foreground shadow-bevel-raised hover:bg-background",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
