import { PixelInfo } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export type DuplicateResolution = "create" | "skip" | "link";

export interface DuplicateReviewItem {
  /** `job.words`의 원래 인덱스 — 저장 결과를 다시 그 후보에 반영할 때 쓴다. */
  index: number;
  word: string;
  reading: string;
  meanings: string[];
  isDuplicate: boolean;
  existing?: {
    id: string;
    word: string;
    reading: string;
    meanings: string[];
  };
  resolution: DuplicateResolution;
}

interface DuplicateReviewModalProps {
  open: boolean;
  items: DuplicateReviewItem[];
  saving: boolean;
  onChangeResolution: (index: number, resolution: DuplicateResolution) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const RESOLUTION_OPTIONS: { value: DuplicateResolution; label: string }[] = [
  { value: "skip", label: "기존 단어 유지" },
  { value: "create", label: "새 단어로 저장" },
  { value: "link", label: "단어장에 연결" },
];

/**
 * 계획서 27장 — 저장 직전 중복 확인 화면. 이미 등록된 단어는 옅은 배경 + "이미 등록됨" 뱃지로
 * 구분하고, 세 가지 처리 방식(기존 유지/새로 저장/단어장에 연결) 중 하나를 고르게 한다.
 */
export function DuplicateReviewModal({
  open,
  items,
  saving,
  onChangeResolution,
  onCancel,
  onConfirm,
}: DuplicateReviewModalProps) {
  const duplicateCount = items.filter((item) => item.isDuplicate).length;
  const willCreateCount = items.filter(
    (item) => !item.isDuplicate || item.resolution === "create",
  ).length;
  const willLinkCount = items.filter(
    (item) => item.isDuplicate && item.resolution === "link",
  ).length;
  const willSkipCount = items.filter(
    (item) => item.isDuplicate && item.resolution === "skip",
  ).length;

  return (
    <Modal open={open} onClose={onCancel} title="중복 단어 확인">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground/70">
          이미 등록된 단어 {duplicateCount}개를 찾았어요. 각 단어를 어떻게 처리할지 골라주세요.
        </p>

        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
          {items.map((item) => (
            <Card
              key={item.index}
              className={cn(
                "flex flex-col gap-2",
                item.isDuplicate && "bg-warning/10 border-warning",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">{item.word}</span>
                <span className="text-xs text-foreground/60">({item.reading})</span>
                {item.isDuplicate && (
                  <span className="inline-flex items-center gap-1 border-2 border-pixel-ink bg-warning px-2 py-0.5 text-[11px] font-bold text-warning-foreground">
                    <PixelInfo className="size-2.5" aria-hidden="true" />
                    이미 등록됨
                  </span>
                )}
              </div>

              <p className="text-xs text-foreground/70">{item.meanings[0]}</p>

              {item.isDuplicate && (
                <>
                  <p className="text-[11px] text-foreground/50">
                    기존 등록: {item.existing?.meanings.join(", ")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {RESOLUTION_OPTIONS.map((option) => (
                      <ChipButton
                        key={option.value}
                        selected={item.resolution === option.value}
                        onClick={() => onChangeResolution(item.index, option.value)}
                        className="px-2.5 py-1.5 text-xs"
                      >
                        {option.label}
                      </ChipButton>
                    ))}
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>

        <p className="text-xs text-foreground/60">
          새로 저장 {willCreateCount}개 · 단어장에 연결 {willLinkCount}개 · 건너뛰기 {willSkipCount}
          개
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            취소
          </Button>
          <Button type="button" loading={saving} onClick={onConfirm}>
            저장하기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
