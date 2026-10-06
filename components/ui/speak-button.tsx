"use client";

import { PixelSpeaker } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis";
import { cn } from "@/lib/utils";

export interface SpeakButtonProps {
  /** 읽어줄 일본어 텍스트. 단어는 한자 발음이 틀리지 않도록 후리가나(reading)를 넘기는 걸 권장한다. */
  text: string;
  /** 스크린리더용 라벨. 기본값은 "발음 듣기". */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * 브라우저 내장 TTS로 일본어를 읽어주는 작은 아이콘 버튼. speechSynthesis를 지원하지 않는
 * 브라우저에서는 아무것도 렌더링하지 않는다.
 */
export function SpeakButton({
  text,
  label = "발음 듣기",
  size = "sm",
  className,
}: SpeakButtonProps) {
  const { isSupported, isSpeaking, speak } = useSpeechSynthesis("ja-JP");

  if (!isSupported || !text.trim()) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn(size === "sm" ? "size-8 px-0" : "size-10 px-0", "shrink-0", className)}
      onClick={(event) => {
        // 플래시카드처럼 부모가 클릭 이벤트를 쓰는 곳에서 카드가 뒤집히지 않게 한다.
        event.stopPropagation();
        speak(text);
      }}
      aria-label={label}
      aria-pressed={isSpeaking}
    >
      <PixelSpeaker
        className={cn("size-4", isSpeaking && "animate-pulse text-primary")}
        aria-hidden="true"
      />
    </Button>
  );
}
