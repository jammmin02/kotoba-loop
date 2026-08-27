import assert from "node:assert/strict";
import { test } from "node:test";

import { toKstDateKey } from "@/lib/datetime";
import { resolveReportPeriod } from "@/lib/study/report";

// 2026-08-27(목)은 이 문서의 currentDate 기준값 — 캘린더 주 월요일은 2026-08-24.
const THURSDAY = new Date("2026-08-27T10:00:00+09:00");

test("주간 리포트 offset=0은 가장 최근에 완결된 캘린더 주(월~일)를 가리킨다", () => {
  const period = resolveReportPeriod("week", THURSDAY, 0);
  assert.equal(toKstDateKey(period.start), "2026-08-17");
  assert.equal(toKstDateKey(period.end), "2026-08-24");
  assert.equal(period.key, "2026-08-17");
  assert.equal(period.label, "2026.08.17 ~ 2026.08.23");
});

test("주간 리포트 offset=1은 그 이전 주를 가리킨다", () => {
  const period = resolveReportPeriod("week", THURSDAY, 1);
  assert.equal(toKstDateKey(period.start), "2026-08-10");
  assert.equal(toKstDateKey(period.end), "2026-08-17");
});

test("진행 중인 이번 주는 절대 반환되지 않는다(end가 현재 캘린더 주 시작을 넘지 않음)", () => {
  const period = resolveReportPeriod("week", THURSDAY, 0);
  assert.ok(period.end.getTime() <= new Date("2026-08-24T00:00:00+09:00").getTime());
});

test("주간 리포트가 연도 경계를 넘어가도 정확히 계산된다", () => {
  // 2026-01-05(월)의 지난 완결 주는 2025-12-29(월) ~ 2026-01-04(일).
  const monday = new Date("2026-01-05T09:00:00+09:00");
  const period = resolveReportPeriod("week", monday, 0);
  assert.equal(toKstDateKey(period.start), "2025-12-29");
  assert.equal(toKstDateKey(period.end), "2026-01-05");
});

test("월간 리포트 offset=0은 가장 최근에 완결된 캘린더 월(1일~말일)을 가리킨다", () => {
  const period = resolveReportPeriod("month", THURSDAY, 0);
  assert.equal(toKstDateKey(period.start), "2026-07-01");
  assert.equal(toKstDateKey(period.end), "2026-08-01");
  assert.equal(period.key, "2026-07");
  assert.equal(period.label, "2026년 7월");
});

test("월간 리포트 offset=1은 그 이전 달을 가리킨다", () => {
  const period = resolveReportPeriod("month", THURSDAY, 1);
  assert.equal(period.key, "2026-06");
});

test("월간 리포트가 연도 경계를 넘어가도 정확히 계산된다", () => {
  // 2026-01-15의 지난 완결 달은 2025-12.
  const midJanuary = new Date("2026-01-15T09:00:00+09:00");
  const period = resolveReportPeriod("month", midJanuary, 0);
  assert.equal(period.key, "2025-12");
  assert.equal(period.label, "2025년 12월");
});

test("음수 offset은 0으로 clamp된다", () => {
  const period = resolveReportPeriod("week", THURSDAY, -3);
  assert.equal(period.key, resolveReportPeriod("week", THURSDAY, 0).key);
});

test("과도하게 큰 offset은 상한(MAX_REPORT_OFFSET)으로 clamp된다", () => {
  const period = resolveReportPeriod("week", THURSDAY, 999);
  const clamped = resolveReportPeriod("week", THURSDAY, 52);
  assert.equal(period.key, clamped.key);
});
