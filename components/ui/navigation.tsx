"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  PixelBarChart,
  PixelBookOpen,
  PixelChevronDown,
  PixelGlobe,
  PixelHome,
  PixelPenTool,
  PixelSparkles,
  PixelStar,
  PixelUser,
} from "@/components/icons/pixel-icons";
import type { PixelIconComponent } from "@/components/icons/pixel-icons";
import { NavSearchBox } from "@/components/search/nav-search-box";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: PixelIconComponent;
}

// Desktop sidebar: 7 top-level sections.
const desktopNavItems: NavItem[] = [
  { href: "/", label: "HOME", icon: PixelHome },
  { href: "/study", label: "단어 학습", icon: PixelStar },
  { href: "/vocabulary", label: "단어장", icon: PixelBookOpen },
  { href: "/kanji", label: "한자", icon: PixelPenTool },
  { href: "/ai", label: "AI학습", icon: PixelSparkles },
  { href: "/community", label: "커뮤니티", icon: PixelGlobe },
  { href: "/stats", label: "통계", icon: PixelBarChart },
  { href: "/my", label: "MY", icon: PixelUser },
];

// Mobile bottom tab bar: AI학습 lives inside the home screen, 통계 moves under MY.
const mobileNavItems: NavItem[] = [
  { href: "/", label: "홈", icon: PixelHome },
  { href: "/study", label: "학습", icon: PixelStar },
  { href: "/vocabulary", label: "단어장", icon: PixelBookOpen },
  { href: "/kanji", label: "한자", icon: PixelPenTool },
  { href: "/my", label: "MY", icon: PixelUser },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

const SIDEBAR_COLLAPSED_KEY = "kotoba-loop:sidebar-collapsed";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <nav
      aria-label="주 메뉴"
      className={cn(
        "relative hidden shrink-0 flex-col gap-1.5 border-r-2 border-pixel-ink bg-surface p-4 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.5rem] items-center px-2" : "w-56",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
        aria-pressed={collapsed}
        className="absolute -right-3.5 top-6 flex size-7 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground shadow-bevel hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <PixelChevronDown
          className={cn("size-4 transition-transform", collapsed ? "-rotate-90" : "rotate-90")}
          aria-hidden="true"
        />
      </button>

      {!collapsed && <NavSearchBox className="mb-2" />}
      {desktopNavItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 border-2 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              collapsed ? "w-11 justify-center px-0" : "px-3",
              active
                ? "border-pixel-ink bg-primary text-primary-foreground shadow-bevel-sunken"
                : "border-transparent text-foreground/70 hover:border-pixel-ink hover:bg-background hover:text-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomTabBar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="하단 메뉴"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex border-t-2 border-pixel-ink bg-surface lg:hidden",
        className,
      )}
    >
      {mobileNavItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 border-t-2 py-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active
                ? "-mt-0.5 border-primary text-primary"
                : "-mt-0.5 border-transparent text-foreground/60 hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile-only search bar, pinned above scrolling content (Sidebar covers this role on desktop). */
export function MobileTopBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 border-b-2 border-pixel-ink bg-surface p-3 lg:hidden",
        className,
      )}
    >
      <NavSearchBox />
    </div>
  );
}

/** Full app shell: desktop sidebar + mobile top search bar/bottom tabs around page content. */
export function Navigation({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <MobileTopBar />
        <div className="flex-1">{children}</div>
        <BottomTabBar />
      </div>
    </div>
  );
}
