import assert from "node:assert/strict";
import { test } from "node:test";

import { computeStageForLevels, getStageProgress, levelsUntilNextThreshold } from "@/lib/pet/engine";

test("선택 직후(0레벨 상승)에는 egg다", () => {
  assert.deepEqual(computeStageForLevels(0), { stage: "egg", isGraduated: false });
});

test("egg → baby 경계값: 1레벨 상승으로 즉시 부화한다", () => {
  assert.deepEqual(computeStageForLevels(1), { stage: "baby", isGraduated: false });
});

test("baby → child 경계값(5)", () => {
  assert.deepEqual(computeStageForLevels(4), { stage: "baby", isGraduated: false });
  assert.deepEqual(computeStageForLevels(5), { stage: "child", isGraduated: false });
});

test("child → teen 경계값(12)", () => {
  assert.deepEqual(computeStageForLevels(11), { stage: "child", isGraduated: false });
  assert.deepEqual(computeStageForLevels(12), { stage: "teen", isGraduated: false });
});

test("teen → adult 경계값(20)", () => {
  assert.deepEqual(computeStageForLevels(19), { stage: "teen", isGraduated: false });
  assert.deepEqual(computeStageForLevels(20), { stage: "adult", isGraduated: false });
});

test("adult 졸업 경계값(30) — adult 단계를 유지한 채 졸업 플래그만 선다", () => {
  assert.deepEqual(computeStageForLevels(29), { stage: "adult", isGraduated: false });
  assert.deepEqual(computeStageForLevels(30), { stage: "adult", isGraduated: true });
  assert.deepEqual(computeStageForLevels(45), { stage: "adult", isGraduated: true });
});

test("한 번에 여러 단계를 건너뛰는 경우도 최종 단계로 정확히 계산된다", () => {
  // 퀘스트 전체 완료 보너스 등이 겹쳐 egg 상태에서 한 번에 15레벨이 오른 경우
  assert.deepEqual(computeStageForLevels(15), { stage: "teen", isGraduated: false });
});

test("levelsUntilNextThreshold는 다음 단계까지 남은 레벨 수를 돌려준다", () => {
  assert.equal(levelsUntilNextThreshold(0), 1);
  assert.equal(levelsUntilNextThreshold(1), 4);
  assert.equal(levelsUntilNextThreshold(5), 7);
  assert.equal(levelsUntilNextThreshold(29), 1);
});

test("졸업 조건을 이미 채운 뒤에는 levelsUntilNextThreshold가 0이다", () => {
  assert.equal(levelsUntilNextThreshold(30), 0);
  assert.equal(levelsUntilNextThreshold(50), 0);
});

test("getStageProgress는 현재 단계 구간 안에서의 진행률을 돌려준다", () => {
  assert.deepEqual(getStageProgress(0), { current: 0, total: 1 }); // egg → baby
  assert.deepEqual(getStageProgress(3), { current: 2, total: 4 }); // baby → child(1~5)
  assert.deepEqual(getStageProgress(5), { current: 0, total: 7 }); // child → teen(5~12) 방금 진입
  assert.deepEqual(getStageProgress(19), { current: 7, total: 8 }); // teen → adult(12~20) 경계 직전
});

test("getStageProgress는 졸업 조건을 채운 뒤 마지막 구간을 가득 채운 상태로 고정한다", () => {
  assert.deepEqual(getStageProgress(30), { current: 10, total: 10 });
  assert.deepEqual(getStageProgress(50), { current: 10, total: 10 });
});
