import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fillDaily, kstDateKey, lastKstDays, weekStartKey } from "./series";

describe("kstDateKey", () => {
  it("uses the Korean calendar day, not UTC", () => {
    // 2026-10-06 16:00 UTC is already 2026-10-07 01:00 in KST.
    assert.equal(kstDateKey(new Date("2026-10-06T16:00:00Z")), "2026-10-07");
    assert.equal(kstDateKey(new Date("2026-10-06T14:59:59Z")), "2026-10-06");
  });
});

describe("lastKstDays", () => {
  it("ends today and runs oldest to newest", () => {
    const keys = lastKstDays(3, new Date("2026-10-07T03:00:00Z"));
    assert.deepEqual(keys, ["2026-10-05", "2026-10-06", "2026-10-07"]);
  });

  it("crosses month boundaries", () => {
    const keys = lastKstDays(3, new Date("2026-11-01T03:00:00Z"));
    assert.deepEqual(keys, ["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
});

describe("fillDaily", () => {
  it("fills days with no rows using the empty value", () => {
    const filled = fillDaily(
      ["2026-10-05", "2026-10-06", "2026-10-07"],
      [{ date: "2026-10-06", n: 4 }],
      (date) => ({ date, n: 0 }),
    );
    assert.deepEqual(filled, [
      { date: "2026-10-05", n: 0 },
      { date: "2026-10-06", n: 4 },
      { date: "2026-10-07", n: 0 },
    ]);
  });
});

describe("weekStartKey", () => {
  it("returns the Monday of the week", () => {
    assert.equal(weekStartKey("2026-10-07"), "2026-10-05"); // 수요일
    assert.equal(weekStartKey("2026-10-05"), "2026-10-05"); // 월요일
    assert.equal(weekStartKey("2026-10-11"), "2026-10-05"); // 일요일
  });
});
