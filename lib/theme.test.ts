import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseThemePreference, resolveTheme } from "./theme";

describe("parseThemePreference", () => {
  it("유효한 값은 그대로 돌려준다", () => {
    assert.equal(parseThemePreference("light"), "light");
    assert.equal(parseThemePreference("dark"), "dark");
    assert.equal(parseThemePreference("system"), "system");
  });

  it("없거나 알 수 없는 값은 light로 폴백한다", () => {
    assert.equal(parseThemePreference(null), "light");
    assert.equal(parseThemePreference(undefined), "light");
    assert.equal(parseThemePreference("sepia"), "light");
  });
});

describe("resolveTheme", () => {
  it("명시적 선택은 OS 설정을 무시한다", () => {
    assert.equal(resolveTheme("light", true), "light");
    assert.equal(resolveTheme("dark", false), "dark");
  });

  it("system은 OS 설정을 따른다", () => {
    assert.equal(resolveTheme("system", true), "dark");
    assert.equal(resolveTheme("system", false), "light");
  });
});
