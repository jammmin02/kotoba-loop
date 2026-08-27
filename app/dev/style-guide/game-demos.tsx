"use client";

import { useState } from "react";

import { AchievementBadge, type AchievementCategory } from "@/components/game/achievement-badge";
import { CollectionGrid, type CollectionItem } from "@/components/game/collection-grid";
import { ExpBar } from "@/components/game/exp-bar";
import { expToast } from "@/components/game/exp-toast";
import { LevelBadge } from "@/components/game/level-badge";
import { ProgressRing } from "@/components/game/progress-ring";
import { QuestCard } from "@/components/game/quest-card";
import { StreakIndicator } from "@/components/game/streak-indicator";
import { Button } from "@/components/ui/button";

export function ExpBarDemo() {
  return (
    <div className="flex flex-col gap-4">
      <ExpBar currentExp={0} requiredExp={300} />
      <ExpBar currentExp={120} requiredExp={300} />
      <ExpBar currentExp={300} requiredExp={300} />
      <ExpBar currentExp={350} requiredExp={300} />
    </div>
  );
}

export function LevelBadgeDemo() {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div className="flex flex-wrap items-end gap-6">
      <LevelBadge level={3} size="sm" />
      <LevelBadge level={12} size="md" />
      <LevelBadge level={27} size="lg" />
      <div className="flex flex-col items-center gap-2">
        <LevelBadge key={replayKey} level={12} variant="level-up" size="md" />
        <Button size="sm" variant="outline" onClick={() => setReplayKey((k) => k + 1)}>
          레벨업 애니메이션 재생
        </Button>
      </div>
    </div>
  );
}

export function StreakIndicatorDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <StreakIndicator days={0} />
      <StreakIndicator days={2} />
      <StreakIndicator days={5} />
      <StreakIndicator days={10} />
      <StreakIndicator days={7} freezeCount={2} />
    </div>
  );
}

export function QuestCardDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <QuestCard title="새 단어 0개 학습" current={0} target={5} rewardExp={5} />
      <QuestCard title="새 단어 5개 학습" current={3} target={5} rewardExp={5} />
      <QuestCard title="복습 10개 완료" current={10} target={10} rewardExp={5} />
      <QuestCard title="문장 만들기 1회" current={2} target={1} rewardExp={5} />
    </div>
  );
}

const achievementMock: { title: string; category: AchievementCategory; locked: boolean }[] = [
  { title: "첫 단어 등록", category: "word", locked: false },
  { title: "단어 500개", category: "word", locked: true },
  { title: "한자 마스터", category: "kanji", locked: false },
  { title: "한자 2,136자", category: "kanji", locked: true },
  { title: "7일 연속 학습", category: "streak", locked: false },
  { title: "100일 연속 학습", category: "streak", locked: true },
];

export function AchievementBadgeDemo() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {achievementMock.map((item) => (
        <AchievementBadge key={item.title} {...item} />
      ))}
    </div>
  );
}

export function ProgressRingDemo() {
  return (
    <div className="flex flex-wrap gap-8">
      <ProgressRing value={0} label="오늘의 학습" />
      <ProgressRing value={45} label="한자 학습률" />
      <ProgressRing value={100} label="완료" />
      <ProgressRing value={120} max={100} label="초과값" />
    </div>
  );
}

const collectionMock: CollectionItem[] = Array.from({ length: 12 }, (_, index) => ({
  id: `word-${index}`,
  label: `단어${index + 1}`,
  unlocked: index % 3 !== 0,
}));

export function CollectionGridDemo() {
  return <CollectionGrid items={collectionMock} />;
}

export function ExpToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => expToast.show(1)}>
        +1 EXP 발생
      </Button>
      <Button variant="outline" onClick={() => expToast.show(10)}>
        +10 EXP 발생 (오늘의 학습 완료)
      </Button>
    </div>
  );
}
