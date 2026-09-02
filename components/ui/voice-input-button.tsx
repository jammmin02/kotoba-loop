"use client";

import { useState } from "react";

import { PixelMic } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";

export interface VoiceInputButtonProps {
  /** 인식된 텍스트를 확정("이 단어 사용하기")했을 때 호출된다. */
  onResult: (text: string) => void;
  /** 인식 언어. 기본값은 일본어 단어 입력에 맞춘 "ja-JP". */
  lang?: string;
  className?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "마이크 권한이 필요해요. 브라우저 설정에서 마이크 권한을 허용한 뒤 다시 시도해주세요.",
  "no-speech": "음성이 감지되지 않았어요. 다시 말해주세요.",
  unsupported: "이 브라우저에서는 음성 입력을 지원하지 않아요.",
  other: "음성 인식 중 오류가 발생했어요.",
};

/**
 * 검색창/단어 추가 폼의 "단어" 입력 옆에 붙는 음성 입력 버튼. 모바일 화면
 * 폭에서만 렌더링하고(데스크톱은 타이핑이 기본이라 제외), 실제 음성 인식을
 * 시작하기 전에 이 버튼이 먼저 안내 모달을 띄워 브라우저의 마이크 권한
 * 요청이 사용자에게 맥락 없이 갑자기 뜨지 않도록 한다.
 */
export function VoiceInputButton({ onResult, lang = "ja-JP", className }: VoiceInputButtonProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [open, setOpen] = useState(false);
  const { status, transcript, errorReason, isSupported, start, stop, reset } = useSpeechRecognition(lang);

  if (!isMobile) return null;

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    stop();
    setOpen(false);
    reset();
  }

  function handleUseResult() {
    onResult(transcript);
    setOpen(false);
    reset();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="md"
        className={cn("size-10 shrink-0 px-0", className)}
        onClick={handleOpen}
        aria-label="음성으로 입력하기"
      >
        <PixelMic className="size-4" aria-hidden="true" />
      </Button>

      <Modal open={open} onClose={handleClose} title="음성으로 입력">
        <div className="flex flex-col items-center gap-4 text-center">
          {status === "idle" && (
            <>
              <PixelMic className="size-10 text-foreground/60" aria-hidden="true" />
              <p className="text-sm text-foreground/70">
                마이크로 단어를 말하면 자동으로 입력돼요. 시작하면 브라우저가 마이크 사용 권한을
                물어볼 수 있어요.
              </p>
              <Button type="button" onClick={start} disabled={!isSupported} className="w-full">
                시작하기
              </Button>
              {!isSupported && (
                <p className="text-xs text-error">이 브라우저에서는 음성 입력을 지원하지 않아요.</p>
              )}
            </>
          )}

          {status === "listening" && (
            <>
              <PixelMic className="size-10 animate-pulse text-error" aria-hidden="true" />
              <p className="text-sm font-bold text-foreground">듣고 있어요...</p>
              <Button type="button" variant="outline" onClick={stop} className="w-full">
                중지
              </Button>
            </>
          )}

          {status === "result" && (
            <>
              <div className="w-full border-2 border-pixel-ink bg-background p-3">
                <p className="font-jp text-lg text-foreground">{transcript || "(인식된 내용 없음)"}</p>
              </div>
              <div className="flex w-full gap-2">
                <Button type="button" variant="outline" onClick={start} className="flex-1">
                  다시 말하기
                </Button>
                <Button type="button" onClick={handleUseResult} disabled={!transcript} className="flex-1">
                  이 단어 사용하기
                </Button>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <PixelMic className="size-10 text-error" aria-hidden="true" />
              <p className="text-sm text-foreground/70">
                {ERROR_MESSAGES[errorReason ?? "other"]}
              </p>
              <Button type="button" onClick={start} className="w-full">
                다시 시도
              </Button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
