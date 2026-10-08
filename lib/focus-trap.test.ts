import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTabWrapTarget } from "./focus-trap";

describe("getTabWrapTarget", () => {
  it("포커스 가능한 요소가 없으면 컨테이너에 붙잡아 둔다", () => {
    assert.equal(getTabWrapTarget(-1, 0, false), "container");
    assert.equal(getTabWrapTarget(-1, 0, true), "container");
  });

  it("마지막 요소에서 Tab이면 처음으로 돌아간다", () => {
    assert.equal(getTabWrapTarget(2, 3, false), "first");
  });

  it("처음 요소에서 Shift+Tab이면 마지막으로 돌아간다", () => {
    assert.equal(getTabWrapTarget(0, 3, true), "last");
  });

  it("중간 요소는 브라우저 기본 이동에 맡긴다", () => {
    assert.equal(getTabWrapTarget(1, 3, false), null);
    assert.equal(getTabWrapTarget(1, 3, true), null);
    assert.equal(getTabWrapTarget(0, 3, false), null);
    assert.equal(getTabWrapTarget(2, 3, true), null);
  });

  it("목록 밖(컨테이너 자신/대화상자 밖)에서는 안쪽 끝으로 끌어온다", () => {
    assert.equal(getTabWrapTarget(-1, 3, false), "first");
    assert.equal(getTabWrapTarget(-1, 3, true), "last");
  });

  it("요소가 하나뿐이면 어느 방향이든 그 요소에 머문다", () => {
    assert.equal(getTabWrapTarget(0, 1, false), "first");
    assert.equal(getTabWrapTarget(0, 1, true), "last");
  });
});
