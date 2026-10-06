import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { announcementPhase } from "./announcement-window";

const t = (iso: string) => new Date(iso);

describe("announcementPhase", () => {
  const start = t("2026-10-10T00:00:00Z");
  const end = t("2026-10-12T00:00:00Z");

  it("is scheduled before the start", () => {
    assert.equal(announcementPhase(start, end, t("2026-10-09T23:59:59Z")), "SCHEDULED");
  });

  it("includes the start instant", () => {
    assert.equal(announcementPhase(start, end, start), "ACTIVE");
  });

  it("is active inside the window", () => {
    assert.equal(announcementPhase(start, end, t("2026-10-11T00:00:00Z")), "ACTIVE");
  });

  it("excludes the end instant", () => {
    assert.equal(announcementPhase(start, end, t("2026-10-11T23:59:59Z")), "ACTIVE");
    assert.equal(announcementPhase(start, end, end), "ENDED");
  });

  it("stays active forever without an end", () => {
    assert.equal(announcementPhase(start, null, t("2030-01-01T00:00:00Z")), "ACTIVE");
  });
});
