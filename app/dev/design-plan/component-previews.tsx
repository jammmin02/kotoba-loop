"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";

export function ModalPreview() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>모달 열기</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="학습 완료">
        <p className="text-sm text-foreground/80">
          오늘의 단어 학습을 모두 마쳤습니다. 데스크탑에서는 가운데 모달, 좁은 화면에서는 하단
          시트로 표시된다 — 모든 안내/확인 팝업이 이 컴포넌트 하나로 통일된다.
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

export function ToastPreview() {
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

export function TooltipPreview() {
  return (
    <div className="flex flex-wrap gap-6">
      <Tooltip content="복습 예정 단어입니다">
        <Button variant="outline">위쪽 툴팁</Button>
      </Tooltip>
      <Tooltip content="정답률 82%" side="bottom">
        <Button variant="outline">아래쪽 툴팁</Button>
      </Tooltip>
    </div>
  );
}

export function ProgressBarPreview() {
  return (
    <div className="flex flex-col gap-4">
      <ProgressBar value={70} label="오늘의 학습 진행도" />
      <ProgressBar value={35} label="한자 학습률" />
    </div>
  );
}
