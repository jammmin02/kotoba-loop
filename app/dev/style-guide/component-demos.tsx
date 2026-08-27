"use client";

import { useState } from "react";

import { JlptBadge, StatusBadge, type JlptLevel, type WordStatus } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { BottomTabBar, Sidebar } from "@/components/ui/navigation";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";

const buttonVariants: NonNullable<ButtonProps["variant"]>[] = [
  "primary",
  "secondary",
  "ghost",
  "outline",
  "danger",
  "quest",
];

const buttonSizes: NonNullable<ButtonProps["size"]>[] = ["sm", "md", "lg"];

const wordStatuses: WordStatus[] = ["NEW", "LEARNING", "REVIEW", "WEAK", "MASTERED"];

const jlptLevels: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

export function ButtonDemo() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {buttonSizes.map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-3">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant} size={size}>
              {variant}
            </Button>
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          loading={loading}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
        >
          {loading ? "로딩 중" : "로딩 시작"}
        </Button>
        <Button disabled>disabled</Button>
      </div>
    </div>
  );
}

export function CardDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card variant="default">
        <p className="font-semibold">Default</p>
        <p className="mt-1 text-sm text-foreground/60">기본 카드</p>
      </Card>
      <Card variant="elevated">
        <p className="font-semibold">Elevated</p>
        <p className="mt-1 text-sm text-foreground/60">그림자가 있는 카드</p>
      </Card>
      <Card variant="quest">
        <p className="font-semibold">Quest</p>
        <p className="mt-1 text-sm text-foreground/60">퀘스트 카드</p>
      </Card>
      <Card variant="achievement" locked>
        <p className="font-semibold">Achievement (locked)</p>
        <p className="mt-1 text-sm text-foreground/60">잠긴 업적</p>
      </Card>
      <Card variant="achievement">
        <p className="font-semibold">Achievement (unlocked)</p>
        <p className="mt-1 text-sm text-foreground/60">해금된 업적</p>
      </Card>
    </div>
  );
}

export function InputDemo() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Input label="단어" placeholder="見逃す" helperText="일본어 단어를 입력하세요" />
      <Input label="반복 횟수" type="number" defaultValue={5} />
      <Input
        label="이메일"
        type="email"
        error="올바른 이메일 형식이 아닙니다"
        defaultValue="invalid"
      />
      <Select
        label="JLPT 레벨"
        options={jlptLevels.map((level) => ({ value: level, label: level }))}
        helperText="목표 레벨을 선택하세요"
      />
      <Textarea label="메모" placeholder="복습 메모를 남겨보세요" className="sm:col-span-2" />
      <Input label="비활성 입력" placeholder="수정 불가" disabled />
    </div>
  );
}

export function ModalDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>모달 열기</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="학습 완료">
        <p className="text-sm text-foreground/80">
          오늘의 단어 학습을 모두 마쳤습니다. 데스크탑에서는 중앙 모달로, 모바일 너비에서는 하단
          시트로 표시됩니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={() => setOpen(false)}>확인</Button>
        </div>
      </Modal>
    </div>
  );
}

export function BadgeDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {wordStatuses.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {jlptLevels.map((level) => (
          <JlptBadge key={level} level={level} />
        ))}
      </div>
    </div>
  );
}

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => toast.success("저장되었습니다")}>
        Success 토스트
      </Button>
      <Button variant="danger" onClick={() => toast.error("저장에 실패했습니다")}>
        Error 토스트
      </Button>
      <Button variant="outline" onClick={() => toast.info("새로운 업데이트가 있습니다")}>
        Info 토스트
      </Button>
    </div>
  );
}

export function TooltipDemo() {
  return (
    <div className="flex gap-6">
      <Tooltip content="복습 예정 단어입니다">
        <Button variant="outline">위쪽 툴팁</Button>
      </Tooltip>
      <Tooltip content="정답률 82%" side="bottom">
        <Button variant="outline">아래쪽 툴팁</Button>
      </Tooltip>
    </div>
  );
}

export function ProgressBarDemo() {
  return (
    <div className="flex flex-col gap-4">
      <ProgressBar label="오늘의 학습 목표" value={30} max={50} />
      <ProgressBar label="한자 마스터율" value={82} />
      <ProgressBar label="완료" value={100} />
    </div>
  );
}

export function NavigationDemo() {
  return (
    <div className="flex flex-col gap-6 overflow-hidden rounded-lg border border-foreground/10">
      <div>
        <p className="border-b border-foreground/10 bg-background px-4 py-2 text-xs font-semibold text-foreground/60">
          Desktop Sidebar (6개 메뉴)
        </p>
        <Sidebar className="static !flex h-auto w-full flex-row flex-wrap gap-2 border-r-0" />
      </div>
      <div>
        <p className="border-b border-foreground/10 bg-background px-4 py-2 text-xs font-semibold text-foreground/60">
          Mobile Bottom Tab (4개 메뉴)
        </p>
        <BottomTabBar className="static !flex w-full" />
      </div>
    </div>
  );
}
