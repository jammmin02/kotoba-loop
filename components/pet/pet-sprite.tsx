import type { PetSpecies, PetStage } from "@/lib/pet/types";
import { cn } from "@/lib/utils";

/**
 * 실제 아트가 준비되기 전까지 쓰는 1차 렌더러(계획서 외 신규 기능, 2026-08-25 확정) — Canvas가
 * 아니라 인라인 SVG를 쓴다(리액트 트리에 바로 조합 가능, 이 프로젝트 아이콘 컴포넌트와 같은
 * 방식). 나중에 실제 PNG/스프라이트로 교체할 때는 이 파일(구체적으로 아래 `PetSprite`의 내부
 * 렌더링부)만 "이미지 로드"로 바꿔 끼우면 되고, `getPetAppearance`가 노출하는
 * species/stage/expression → 파라미터 계산 로직과 이걸 호출하는 쪽(components/pet/pet-widget.tsx)은
 * 손댈 필요가 없다.
 */
export type PetExpression = "idle" | "blink" | "happy" | "sparkle";

const SPECIES_COLOR_TOKEN: Record<PetSpecies, "primary" | "secondary" | "accent"> = {
  cat: "primary",
  dinosaur: "secondary",
  rabbit: "accent",
};

// Tailwind는 클래스 문자열을 정적으로 스캔하므로 `fill-${token}` 같은 런타임 조합은 생성되지
// 않는다 — 항상 완전한 리터럴 클래스명을 맵에서 꺼내 쓴다.
const SPECIES_FILL_CLASS: Record<PetSpecies, string> = {
  cat: "fill-primary",
  dinosaur: "fill-secondary",
  rabbit: "fill-accent",
};

const SPECIES_STROKE_CLASS: Record<PetSpecies, string> = {
  cat: "stroke-primary",
  dinosaur: "stroke-secondary",
  rabbit: "stroke-accent",
};

export interface PetAppearance {
  isEgg: boolean;
  /** baby=0 … adult=3. egg는 의미 없음(0). */
  stageIndex: number;
  bodyRadius: number;
  limbLength: number;
  /** 공룡 등가시 개수(2→3→4→5). 다른 종은 미사용. */
  spikeCount: number;
  /** 토끼 귀 길이(baby→adult 증가). 다른 종은 미사용. */
  earLength: number;
  /** 고양이/공룡 꼬리 길이. */
  tailLength: number;
  eyesClosed: boolean;
  isHappy: boolean;
  showSparkle: boolean;
  colorToken: "primary" | "secondary" | "accent";
}

/** Pure 함수 — species/stage/expression 3개 입력만으로 도형 파라미터를 결정한다(테스트 가능, JSX 없음). */
export function getPetAppearance(
  species: PetSpecies,
  stage: PetStage,
  expression: PetExpression,
): PetAppearance {
  const isEgg = stage === "egg";
  const stageIndex = { egg: 0, baby: 0, child: 1, teen: 2, adult: 3 }[stage];

  return {
    isEgg,
    stageIndex,
    bodyRadius: isEgg ? 24 : 20 + stageIndex * 4,
    limbLength: isEgg ? 0 : 6 + stageIndex * 3,
    spikeCount: isEgg ? 0 : 2 + stageIndex,
    earLength: isEgg ? 0 : 12 + stageIndex * 6,
    tailLength: isEgg ? 0 : 8 + stageIndex * 4,
    eyesClosed: !isEgg && expression === "blink",
    isHappy: !isEgg && expression === "happy",
    showSparkle: expression === "sparkle",
    colorToken: SPECIES_COLOR_TOKEN[species],
  };
}

const CENTER_X = 60;
const CENTER_Y = 72;

function polar(radius: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTER_X + radius * Math.cos(rad), CENTER_Y + radius * Math.sin(rad)];
}

function Spikes({
  count,
  bodyRadius,
  fillClass,
}: {
  count: number;
  bodyRadius: number;
  fillClass: string;
}) {
  if (count <= 0) return null;
  const startAngle = -155;
  const endAngle = -25;
  const step = count > 1 ? (endAngle - startAngle) / (count - 1) : 0;
  const spikeHeight = bodyRadius * 0.4;
  const spikeWidth = bodyRadius * 0.22;

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = startAngle + step * i;
        const rad = (angle * Math.PI) / 180;
        const [bx, by] = polar(bodyRadius, angle);
        const [tx, ty] = polar(bodyRadius + spikeHeight, angle);
        const perpX = -Math.sin(rad) * (spikeWidth / 2);
        const perpY = Math.cos(rad) * (spikeWidth / 2);
        const points = `${bx + perpX},${by + perpY} ${bx - perpX},${by - perpY} ${tx},${ty}`;
        return (
          <polygon
            key={i}
            points={points}
            className={cn(fillClass, "stroke-pixel-ink")}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        );
      })}
    </>
  );
}

function CatEars({ bodyRadius, fillClass }: { bodyRadius: number; fillClass: string }) {
  const earSize = bodyRadius * 0.6;
  const baseY = CENTER_Y - bodyRadius * 0.7;
  const left = {
    base1: [CENTER_X - bodyRadius * 0.55, baseY],
    base2: [CENTER_X - bodyRadius * 0.1, baseY - earSize * 0.1],
    apex: [CENTER_X - bodyRadius * 0.45, baseY - earSize],
  };
  const right = {
    base1: [CENTER_X + bodyRadius * 0.55, baseY],
    base2: [CENTER_X + bodyRadius * 0.1, baseY - earSize * 0.1],
    apex: [CENTER_X + bodyRadius * 0.45, baseY - earSize],
  };
  const toPoints = (t: typeof left) =>
    `${t.base1.join(",")} ${t.base2.join(",")} ${t.apex.join(",")}`;
  return (
    <>
      <polygon
        points={toPoints(left)}
        className={cn(fillClass, "stroke-pixel-ink")}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <polygon
        points={toPoints(right)}
        className={cn(fillClass, "stroke-pixel-ink")}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </>
  );
}

function RabbitEars({
  bodyRadius,
  earLength,
  fillClass,
}: {
  bodyRadius: number;
  earLength: number;
  fillClass: string;
}) {
  const baseY = CENTER_Y - bodyRadius * 0.75;
  return (
    <>
      <ellipse
        cx={CENTER_X - bodyRadius * 0.32}
        cy={baseY - earLength * 0.45}
        rx={bodyRadius * 0.16}
        ry={earLength * 0.5}
        transform={`rotate(-10 ${CENTER_X - bodyRadius * 0.32} ${baseY - earLength * 0.45})`}
        className={cn(fillClass, "stroke-pixel-ink")}
        strokeWidth={2.5}
      />
      <ellipse
        cx={CENTER_X + bodyRadius * 0.32}
        cy={baseY - earLength * 0.45}
        rx={bodyRadius * 0.16}
        ry={earLength * 0.5}
        transform={`rotate(10 ${CENTER_X + bodyRadius * 0.32} ${baseY - earLength * 0.45})`}
        className={cn(fillClass, "stroke-pixel-ink")}
        strokeWidth={2.5}
      />
    </>
  );
}

function Tail({
  tailLength,
  bodyRadius,
  fillClass,
  strokeClass,
  rounded,
}: {
  tailLength: number;
  bodyRadius: number;
  fillClass: string;
  strokeClass: string;
  rounded?: boolean;
}) {
  if (tailLength <= 0) return null;
  if (rounded) {
    return (
      <circle
        cx={CENTER_X + bodyRadius * 0.85}
        cy={CENTER_Y + bodyRadius * 0.55}
        r={Math.max(4, tailLength * 0.35)}
        className={cn(fillClass, "stroke-pixel-ink")}
        strokeWidth={2}
      />
    );
  }
  const startX = CENTER_X + bodyRadius * 0.75;
  const startY = CENTER_Y + bodyRadius * 0.35;
  return (
    <path
      d={`M ${startX} ${startY} Q ${startX + tailLength} ${startY - tailLength * 0.3} ${startX + tailLength * 0.7} ${startY - tailLength}`}
      fill="none"
      className={strokeClass}
      strokeWidth={5}
      strokeLinecap="round"
    />
  );
}

function Limbs({ bodyRadius, limbLength }: { bodyRadius: number; limbLength: number }) {
  if (limbLength <= 0) return null;
  const legY = CENTER_Y + bodyRadius * 0.8;
  return (
    <>
      <rect
        x={CENTER_X - bodyRadius * 0.55 - limbLength * 0.25}
        y={legY}
        width={limbLength * 0.6}
        height={limbLength * 0.7}
        rx={limbLength * 0.2}
        className="fill-surface stroke-pixel-ink"
        strokeWidth={2}
      />
      <rect
        x={CENTER_X + bodyRadius * 0.55 - limbLength * 0.35}
        y={legY}
        width={limbLength * 0.6}
        height={limbLength * 0.7}
        rx={limbLength * 0.2}
        className="fill-surface stroke-pixel-ink"
        strokeWidth={2}
      />
      <circle
        cx={CENTER_X - bodyRadius * 0.85}
        cy={CENTER_Y + bodyRadius * 0.1}
        r={limbLength * 0.4}
        className="fill-surface stroke-pixel-ink"
        strokeWidth={2}
      />
      <circle
        cx={CENTER_X + bodyRadius * 0.85}
        cy={CENTER_Y + bodyRadius * 0.1}
        r={limbLength * 0.4}
        className="fill-surface stroke-pixel-ink"
        strokeWidth={2}
      />
    </>
  );
}

function Face({
  bodyRadius,
  eyesClosed,
  isHappy,
}: {
  bodyRadius: number;
  eyesClosed: boolean;
  isHappy: boolean;
}) {
  const eyeY = CENTER_Y - bodyRadius * 0.1;
  const eyeOffsetX = bodyRadius * 0.32;

  if (eyesClosed) {
    return (
      <>
        <rect
          x={CENTER_X - eyeOffsetX - 3}
          y={eyeY}
          width={6}
          height={2}
          rx={1}
          className="fill-pixel-ink"
        />
        <rect
          x={CENTER_X + eyeOffsetX - 3}
          y={eyeY}
          width={6}
          height={2}
          rx={1}
          className="fill-pixel-ink"
        />
      </>
    );
  }

  if (isHappy) {
    return (
      <>
        <path
          d={`M ${CENTER_X - eyeOffsetX - 4} ${eyeY + 2} Q ${CENTER_X - eyeOffsetX} ${eyeY - 4} ${CENTER_X - eyeOffsetX + 4} ${eyeY + 2}`}
          fill="none"
          className="stroke-pixel-ink"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d={`M ${CENTER_X + eyeOffsetX - 4} ${eyeY + 2} Q ${CENTER_X + eyeOffsetX} ${eyeY - 4} ${CENTER_X + eyeOffsetX + 4} ${eyeY + 2}`}
          fill="none"
          className="stroke-pixel-ink"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d={`M ${CENTER_X - 6} ${eyeY + 10} Q ${CENTER_X} ${eyeY + 16} ${CENTER_X + 6} ${eyeY + 10}`}
          fill="none"
          className="stroke-pixel-ink"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </>
    );
  }

  return (
    <>
      <circle cx={CENTER_X - eyeOffsetX} cy={eyeY} r={2.6} className="fill-pixel-ink" />
      <circle cx={CENTER_X + eyeOffsetX} cy={eyeY} r={2.6} className="fill-pixel-ink" />
    </>
  );
}

function Sparkles() {
  const spots: [number, number, number][] = [
    [22, 30, 6],
    [96, 26, 5],
    [90, 88, 4],
    [18, 84, 4],
  ];
  return (
    <g>
      {spots.map(([x, y, s], i) => (
        <path
          key={i}
          d={`M ${x} ${y - s} L ${x + s * 0.3} ${y - s * 0.3} L ${x + s} ${y} L ${x + s * 0.3} ${y + s * 0.3} L ${x} ${y + s} L ${x - s * 0.3} ${y + s * 0.3} L ${x - s} ${y} L ${x - s * 0.3} ${y - s * 0.3} Z`}
          className="fill-accent"
        />
      ))}
    </g>
  );
}

export interface PetSpriteProps {
  species: PetSpecies;
  stage: PetStage;
  expression: PetExpression;
  size?: number;
  className?: string;
}

export function PetSprite({ species, stage, expression, size = 96, className }: PetSpriteProps) {
  const appearance = getPetAppearance(species, stage, expression);
  const fillClass = SPECIES_FILL_CLASS[species];
  const strokeClass = SPECIES_STROKE_CLASS[species];

  return (
    <div
      role="img"
      aria-label={`${species} 펫, ${stage} 단계`}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full",
        appearance.isHappy && "animate-quiz-flash",
        appearance.showSparkle && "animate-level-up shadow-glow",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 120 120" className="size-full" shapeRendering="geometricPrecision">
        {appearance.isEgg ? (
          <>
            <ellipse
              cx={CENTER_X}
              cy={CENTER_Y}
              rx={appearance.bodyRadius * 0.78}
              ry={appearance.bodyRadius}
              className="fill-surface stroke-pixel-ink"
              strokeWidth={3}
            />
            <path
              d={`M ${CENTER_X - 10} ${CENTER_Y - 6} L ${CENTER_X - 2} ${CENTER_Y + 4} L ${CENTER_X + 6} ${CENTER_Y - 2} L ${CENTER_X + 12} ${CENTER_Y + 10}`}
              fill="none"
              className="stroke-pixel-ink"
              strokeWidth={1.5}
              opacity={0.4}
            />
          </>
        ) : (
          <>
            {species === "dinosaur" && (
              <Spikes
                count={appearance.spikeCount}
                bodyRadius={appearance.bodyRadius}
                fillClass={fillClass}
              />
            )}
            {species === "cat" && (
              <CatEars bodyRadius={appearance.bodyRadius} fillClass={fillClass} />
            )}
            {species === "rabbit" && (
              <RabbitEars
                bodyRadius={appearance.bodyRadius}
                earLength={appearance.earLength}
                fillClass={fillClass}
              />
            )}
            <Tail
              tailLength={appearance.tailLength}
              bodyRadius={appearance.bodyRadius}
              fillClass={fillClass}
              strokeClass={strokeClass}
              rounded={species === "rabbit"}
            />
            <Limbs bodyRadius={appearance.bodyRadius} limbLength={appearance.limbLength} />
            <ellipse
              cx={CENTER_X}
              cy={CENTER_Y}
              rx={appearance.bodyRadius}
              ry={appearance.bodyRadius * 0.92}
              className="fill-surface stroke-pixel-ink"
              strokeWidth={3}
            />
            <Face
              bodyRadius={appearance.bodyRadius}
              eyesClosed={appearance.eyesClosed}
              isHappy={appearance.isHappy}
            />
          </>
        )}
        {appearance.showSparkle && <Sparkles />}
      </svg>
    </div>
  );
}
