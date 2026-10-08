import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MORE_NAV_ITEMS,
  NAV_AI,
  NAV_HOME,
  NAV_MY,
  NAV_STUDY,
  NAV_VOCABULARY,
  SIDEBAR_NAV_ITEMS,
  TAB_NAV_ITEMS,
  isNavItemActive,
  visibleNavItems,
} from "./nav-config";

describe("isNavItemActive", () => {
  it("홈은 정확히 / 일 때만 활성이다", () => {
    assert.equal(isNavItemActive("/", NAV_HOME), true);
    assert.equal(isNavItemActive("/study", NAV_HOME), false);
  });

  it("하위 경로에서도 상위 메뉴가 활성이다", () => {
    assert.equal(isNavItemActive("/study/session", NAV_STUDY), true);
    assert.equal(isNavItemActive("/my/pet", NAV_MY), true);
  });

  it("세그먼트 경계가 아닌 접두사 일치는 활성이 아니다", () => {
    assert.equal(isNavItemActive("/mypage", NAV_MY), false);
    assert.equal(isNavItemActive("/study-guide", NAV_STUDY), false);
  });

  it("사이드바에 없는 화면은 연관 메뉴 아래에서 활성이다", () => {
    assert.equal(isNavItemActive("/words", NAV_VOCABULARY), true);
    assert.equal(isNavItemActive("/words/abc/edit", NAV_VOCABULARY), true);
    assert.equal(isNavItemActive("/wrong-notes", NAV_STUDY), true);
    assert.equal(isNavItemActive("/achievements", NAV_MY), true);
  });

  it("연관 없는 화면은 활성이 아니다", () => {
    assert.equal(isNavItemActive("/words", NAV_STUDY), false);
    assert.equal(isNavItemActive("/wrong-notes", NAV_AI), false);
  });
});

describe("메뉴 구성", () => {
  it("관리자 메뉴는 관리자에게만 보인다", () => {
    const labels = (isAdmin: boolean) =>
      visibleNavItems(SIDEBAR_NAV_ITEMS, isAdmin).map((item) => item.label);
    assert.ok(labels(true).includes("관리자"));
    assert.ok(!labels(false).includes("관리자"));
  });

  it("모바일 탭 + 더보기가 사이드바 메뉴를 빠짐없이 덮는다", () => {
    const mobile = new Set([...TAB_NAV_ITEMS, ...MORE_NAV_ITEMS].map((item) => item.href));
    for (const item of SIDEBAR_NAV_ITEMS) assert.ok(mobile.has(item.href), item.href);
  });

  it("같은 목적지는 어느 화면에서나 같은 라벨을 쓴다", () => {
    const byHref = new Map(SIDEBAR_NAV_ITEMS.map((item) => [item.href, item.label]));
    for (const item of [...TAB_NAV_ITEMS, ...MORE_NAV_ITEMS]) {
      assert.equal(item.label, byHref.get(item.href));
    }
  });
});
