import {
  PixelBarChart,
  PixelBookOpen,
  PixelGlobe,
  PixelHome,
  PixelLock,
  PixelMenu,
  PixelPenTool,
  PixelSparkles,
  PixelStar,
  PixelUser,
} from "@/components/icons/pixel-icons";
import type { PixelIconComponent } from "@/components/icons/pixel-icons";

/**
 * 내비게이션 메뉴의 단일 출처. 사이드바(데스크톱)와 하단 탭바/더보기 시트(모바일)가
 * 같은 라벨·아이콘·활성 규칙을 공유해야 화면 크기에 따라 이름이 달라지지 않는다.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: PixelIconComponent;
  /**
   * 이 메뉴의 하위 화면으로 취급할 경로 접두사(href 자신은 항상 포함). 사이드바에 없는
   * 화면(/words, /wrong-notes 등)이 어느 메뉴 아래에 있는지 알려 활성 표시를 유지한다.
   */
  alsoActiveFor?: string[];
  /** 관리자에게만 보이는 메뉴. */
  adminOnly?: boolean;
}

export const NAV_HOME: NavItem = { href: "/", label: "홈", icon: PixelHome };
export const NAV_STUDY: NavItem = {
  href: "/study",
  label: "학습",
  icon: PixelStar,
  alsoActiveFor: ["/wrong-notes"],
};
export const NAV_VOCABULARY: NavItem = {
  href: "/vocabulary",
  label: "단어장",
  icon: PixelBookOpen,
  alsoActiveFor: ["/words"],
};
export const NAV_KANJI: NavItem = { href: "/kanji", label: "한자", icon: PixelPenTool };
export const NAV_AI: NavItem = { href: "/ai", label: "AI 학습", icon: PixelSparkles };
export const NAV_COMMUNITY: NavItem = { href: "/community", label: "커뮤니티", icon: PixelGlobe };
export const NAV_STATS: NavItem = { href: "/stats", label: "통계", icon: PixelBarChart };
export const NAV_MY: NavItem = {
  href: "/my",
  label: "마이페이지",
  icon: PixelUser,
  alsoActiveFor: ["/achievements"],
};
export const NAV_ADMIN: NavItem = {
  href: "/admin",
  label: "관리자",
  icon: PixelLock,
  adminOnly: true,
};

/** 데스크톱 사이드바: 전체 메뉴. */
export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  NAV_HOME,
  NAV_STUDY,
  NAV_VOCABULARY,
  NAV_KANJI,
  NAV_AI,
  NAV_COMMUNITY,
  NAV_STATS,
  NAV_MY,
  NAV_ADMIN,
];

/** 모바일 하단 탭바에 항상 노출되는 핵심 메뉴(마지막 칸은 '더보기'). */
export const TAB_NAV_ITEMS: NavItem[] = [NAV_HOME, NAV_STUDY, NAV_VOCABULARY, NAV_KANJI];

/** 모바일 '더보기' 시트에 들어가는 나머지 메뉴. */
export const MORE_NAV_ITEMS: NavItem[] = [NAV_MY, NAV_AI, NAV_COMMUNITY, NAV_STATS, NAV_ADMIN];

export const MORE_TAB_LABEL = "더보기";
export const MoreTabIcon = PixelMenu;

/** 접두사가 경로 세그먼트 경계에서 일치하는지 본다(`/my`는 `/my/pet`에는 맞고 `/mypage`에는 아니다). */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  return [item.href, ...(item.alsoActiveFor ?? [])].some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

/** 역할에 맞는 메뉴만 남긴다. */
export function visibleNavItems(items: NavItem[], isAdmin: boolean): NavItem[] {
  return items.filter((item) => !item.adminOnly || isAdmin);
}
