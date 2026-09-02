import { shuffle } from "@/lib/quiz/random";
import { VOCAB_QUIZ_TYPES } from "@/lib/quiz/types";
import type { QuizType } from "@/lib/quiz/types";

/** `computeQuizTypeWeights`가 소비하는 유형별 정답률 표본 — `lib/study/weakness.ts`의
 * `QuizTypeAccuracy`와 같은 모양이지만, 퀴즈 엔진이 통계/DB 계층에 의존하지 않도록 이 모듈
 * 안에서 독립적으로 정의한다(호출자가 맞춰서 넘긴다). */
export interface QuizTypeAccuracySample {
  quizType: QuizType;
  /** 이 유형의 누적 응시 횟수 — 표본이 충분한지 판단하는 데만 쓰인다. */
  total: number;
  /** 0~100 정수(백분율). */
  accuracy: number;
}

/** 정답률 역수를 취하기 전에 적용하는 하한(계획서 36장 결정: 0%/데이터 없음도 이 하한으로 다룬다). */
const MIN_ACCURACY_FLOOR = 0.05;
/** 유형별 출제 비중의 최소/최대 캡 — 특정 유형이 완전히 사라지거나 절반을 넘게 독점하지 않게 한다. */
const MIN_SHARE = 0.05;
const MAX_SHARE = 0.5;
/** 가중치를 적용하기에 유의미한 데이터가 있는지 판단하는 기준(PROMPT 38의 판단 기준과 같은 의도). */
const MIN_REVIEWS_PER_TYPE = 5;
const MIN_TYPES_WITH_DATA = 2;

/**
 * 원시 가중치를 [min, max] 캡 안에서 합이 1이 되도록 나눈다(water-filling). 단순히 정규화한
 * 뒤 캡을 씌우면 캡을 넘긴 값을 깎아낸 만큼이 다른 유형에 재분배되지 않아, 유형 개수가 적을 때
 * (예: 6개 중 1개만 극단적으로 낮은 정답률) 캡을 씌운 값들끼리 다시 정규화하는 과정에서 실제
 * 비중이 max를 넘어버릴 수 있다(예: max=0.5인데 결과가 0.67이 되는 식). 그래서 이 함수는
 * 캡에 걸린 유형을 그 캡 값으로 고정하고, 남은 몫(1 - 고정된 값들의 합)을 아직 고정되지 않은
 * 유형들에게 그들의 원시 비율대로 다시 나누는 과정을 반복한다 — 새로 고정되는 유형이 없을
 * 때까지 반복하면 모든 유형이 실제로 [min, max] 범위 안에 있으면서 합이 정확히 1이 된다.
 */
function capAndRedistribute(rawWeights: readonly number[], min: number, max: number): number[] {
  const result = new Array<number>(rawWeights.length).fill(0);
  const unfixed = new Set(rawWeights.map((_, index) => index));
  let remainingMass = 1;

  while (unfixed.size > 0) {
    const sumRaw = [...unfixed].reduce((sum, i) => sum + rawWeights[i], 0);
    const overCapped = [...unfixed].find((i) => remainingMass * (rawWeights[i] / sumRaw) > max);
    const underCapped = [...unfixed].find((i) => remainingMass * (rawWeights[i] / sumRaw) < min);
    const fixIndex = overCapped ?? underCapped;

    if (fixIndex === undefined) {
      for (const i of unfixed) {
        result[i] = remainingMass * (rawWeights[i] / sumRaw);
      }
      break;
    }

    const fixedValue = fixIndex === overCapped ? max : min;
    result[fixIndex] = fixedValue;
    remainingMass -= fixedValue;
    unfixed.delete(fixIndex);
  }

  return result;
}

/**
 * 정답률 기반 출제 비중(PROMPT 39, 계획서 36장): 정답률이 낮을수록 1/정답률이 커지므로 비중이
 * 커진다. 데이터가 부족하면(비교할 유형이 2개 미만) 균등 배분으로 폴백하라는 신호로 `null`을
 * 반환한다 — `assignQuizTypes`가 이 경우 기존 균등 배분 경로를 그대로 쓴다.
 */
export function computeQuizTypeWeights(
  samples: readonly QuizTypeAccuracySample[],
  allowedTypes: readonly QuizType[],
): Partial<Record<QuizType, number>> | null {
  const byType = new Map(samples.map((sample) => [sample.quizType, sample]));

  const typesWithEnoughData = allowedTypes.filter(
    (type) => (byType.get(type)?.total ?? 0) >= MIN_REVIEWS_PER_TYPE,
  );
  if (typesWithEnoughData.length < MIN_TYPES_WITH_DATA) return null;

  const rawWeights = allowedTypes.map((type) => {
    const accuracyFraction = (byType.get(type)?.accuracy ?? 0) / 100;
    return 1 / Math.max(accuracyFraction, MIN_ACCURACY_FLOOR);
  });
  const capped = capAndRedistribute(rawWeights, MIN_SHARE, MAX_SHARE);

  const weights: Partial<Record<QuizType, number>> = {};
  allowedTypes.forEach((type, index) => {
    weights[type] = capped[index];
  });
  return weights;
}

/**
 * 오늘의 학습 화면에 "오늘은 한→일 문제가 더 많이 나와요" 같은 짧은 안내를 띄우기 위한
 * 선택적 힌트(계획서 36장 UI 요구사항 — 가중치 자체를 노출/조작하게 하지는 않는다). 가중치가
 * 없으면(데이터 부족 폴백) 안내할 것이 없으므로 null을 반환한다.
 */
export function pickBoostedType(
  weights: Partial<Record<QuizType, number>> | null,
): QuizType | null {
  if (!weights) return null;

  let best: QuizType | null = null;
  let bestWeight = -Infinity;
  for (const [type, weight] of Object.entries(weights) as [QuizType, number][]) {
    if (weight > bestWeight) {
      bestWeight = weight;
      best = type;
    }
  }
  return best;
}

/**
 * 요청한 개수를 유형별 비중에 맞춰 정수 개수로 나눈다(최대 나머지법 — 몫의 정수부를 먼저
 * 배정하고, 남는 자리는 소수부가 큰 유형부터 채운다). 동률 소수부는 `random`으로 섞은 순서로
 * 판단해 순수 함수 특성(같은 random 시퀀스 → 같은 결과)을 유지한다.
 */
function distributeByWeight(
  count: number,
  types: readonly QuizType[],
  weights: Partial<Record<QuizType, number>>,
  random: () => number,
): QuizType[] {
  const rawCounts = types.map((type) => (weights[type] ?? 1 / types.length) * count);
  const floorCounts = rawCounts.map(Math.floor);
  const remaining = count - floorCounts.reduce((sum, n) => sum + n, 0);

  const order = shuffle(
    types.map((_, index) => index),
    random,
  ).sort(
    (a, b) => rawCounts[b] - Math.floor(rawCounts[b]) - (rawCounts[a] - Math.floor(rawCounts[a])),
  );

  for (let i = 0; i < remaining; i++) {
    floorCounts[order[i]] += 1;
  }

  const result: QuizType[] = [];
  types.forEach((type, index) => {
    for (let n = 0; n < floorCounts[index]; n++) result.push(type);
  });
  return result;
}

/**
 * 1차 버전 기본 배분(계획서 17장/PROMPT 19): 유형별 출제 비중을 동일하게 두고, 배정 순서만
 * 무작위로 섞는다. `weights`를 넘기면(PROMPT 39, 계획서 36장) 정답률이 낮은 유형의 비중을 높인
 * 배분으로 바뀐다 — 데이터가 부족해 `computeQuizTypeWeights`가 `null`을 반환한 경우를 포함해,
 * `weights`가 없거나 비어 있으면 이 균등 배분으로 자연히 폴백한다.
 */
export function assignQuizTypes(
  count: number,
  random: () => number = Math.random,
  allowedTypes: readonly QuizType[] = VOCAB_QUIZ_TYPES,
  weights?: Partial<Record<QuizType, number>> | null,
): QuizType[] {
  if (count <= 0) return [];
  const types = allowedTypes.length > 0 ? allowedTypes : VOCAB_QUIZ_TYPES;

  if (!weights) {
    const repeated: QuizType[] = [];
    while (repeated.length < count) {
      repeated.push(...types);
    }
    repeated.length = count;
    return shuffle(repeated, random);
  }

  return shuffle(distributeByWeight(count, types, weights, random), random);
}
