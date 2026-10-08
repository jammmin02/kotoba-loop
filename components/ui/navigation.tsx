"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useSyncExternalStore } from "react";

import { PixelChevronDown } from "@/components/icons/pixel-icons";
import { NavSearchBox } from "@/components/search/nav-search-box";
import { Modal } from "@/components/ui/modal";
import {
  MORE_NAV_ITEMS,
  MORE_TAB_LABEL,
  MoreTabIcon,
  SIDEBAR_NAV_ITEMS,
  TAB_NAV_ITEMS,
  isNavItemActive,
  visibleNavItems,
} from "@/components/ui/nav-config";
import { isAdminRole } from "@/lib/auth-admin";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "kotoba-loop:sidebar-collapsed";
// 같은 탭에서는 storage 이벤트가 발생하지 않아, 토글 때 직접 알려 구독자를 갱신한다.
const SIDEBAR_COLLAPSED_EVENT = "kotoba-loop:sidebar-collapsed-change";

function subscribeSidebarCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onChange);
  };
}

function getSidebarCollapsedSnapshot() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navItems = visibleNavItems(SIDEBAR_NAV_ITEMS, isAdminRole(session?.user?.role));
  // 서버에서는 항상 펼친 상태로 그리고, 하이드레이션 뒤 저장된 값으로 바뀐다.
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    () => false,
  );

  const toggleCollapsed = () => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "0" : "1");
    } catch {
      // 저장소를 쓸 수 없으면 접힘 상태를 바꿀 수 없다.
    }
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
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
      {navItems.map((item) => {
        const active = isNavItemActive(pathname, item);
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
                : "border-transparent text-muted hover:border-pixel-ink hover:bg-background hover:text-foreground",
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

const tabItemClassName =
  "-mt-0.5 flex min-h-14 flex-1 flex-col items-center justify-center gap-1 border-t-2 py-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function tabItemStateClassName(active: boolean) {
  return active
    ? "border-primary text-primary"
    : "border-transparent text-muted hover:text-foreground";
}

export function BottomTabBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreItems = visibleNavItems(MORE_NAV_ITEMS, isAdminRole(session?.user?.role));
  // 더보기 안의 화면에 있으면 더보기 칸을 활성으로 표시해 현재 위치를 잃지 않게 한다.
  const moreActive = moreItems.some((item) => isNavItemActive(pathname, item));

  return (
    <>
      <nav
        aria-label="하단 메뉴"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex border-t-2 border-pixel-ink bg-surface pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden",
          className,
        )}
      >
        {TAB_NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(tabItemClassName, tabItemStateClassName(active))}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={cn(tabItemClassName, tabItemStateClassName(moreActive))}
        >
          <MoreTabIcon className="size-5" aria-hidden="true" />
          {MORE_TAB_LABEL}
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="메뉴">
        <nav aria-label="더보기 메뉴">
          <ul className="flex flex-col gap-2">
            {moreItems.map((item) => {
              const active = isNavItemActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 border-2 border-pixel-ink px-3 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      active
                        ? "bg-primary text-primary-foreground shadow-bevel-sunken"
                        : "bg-surface text-foreground shadow-bevel-raised hover:bg-background",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Modal>
    </>
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
    <div className="flex min-h-dvh w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <MobileTopBar />
        <div className="flex-1">{children}</div>
        <BottomTabBar />
      </div>
    </div>
  );
}
