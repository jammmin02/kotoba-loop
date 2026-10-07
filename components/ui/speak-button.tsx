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

/** 기기(OS)별로 일본어 음성 설치 방법을 안내하는 문구. */
function voiceInstallGuide(): string {
  const ua = navigator.userAgent;
  const head = "이 기기에 일본어 음성이 설치되어 있지 않아 발음을 들을 수 없습니다.\n\n";
  const tail = "\n\n설치 후 브라우저를 완전히 종료했다가 다시 열어 주세요.";

  // iPadOS는 Mac처럼 보이므로 터치 지원 여부로 구분한다.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return `${head}[iPhone/iPad]\n설정 → 손쉬운 사용 → 말하는 콘텐츠 → 음성 → 일본어 → 원하는 음성(예: Kyoko) 다운로드${tail}`;
  }
  if (/Android/.test(ua)) {
    return `${head}[안드로이드]\n설정 → 일반(또는 시스템) → 언어 및 입력 → 텍스트 음성 변환 → Google 음성 서비스 설정(톱니바퀴) → 음성 데이터 설치 → 일본어 다운로드\n(삼성 기기: 설정 → 일반 → 언어 → 텍스트 음성 변환 출력)${tail}`;
  }
  if (/Macintosh/.test(ua)) {
    return `${head}[Mac]\n시스템 설정 → 손쉬운 사용 → 말하는 콘텐츠 → 시스템 음성 → 음성 관리 → 일본어 음성 다운로드${tail}`;
  }
  return `${head}[Windows]\n설정 → 시간 및 언어 → 언어 및 지역 → 언어 추가 → "일본어" 선택 후 '텍스트 음성 변환' 옵션을 체크하고 설치${tail}`;
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
  const { isSupported, isSpeaking, isVoiceMissing, error, speak } = useSpeechSynthesis("ja-JP");

  if (!isSupported || !text.trim()) return null;

  const hint = isVoiceMissing ? "일본어 음성이 설치되어 있지 않습니다. 눌러서 설치 방법 보기" : error;

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn(
        size === "sm" ? "size-8 px-0" : "size-10 px-0",
        "shrink-0",
        isVoiceMissing && "opacity-50",
        className,
      )}
      onClick={(event) => {
        // 플래시카드처럼 부모가 클릭 이벤트를 쓰는 곳에서 카드가 뒤집히지 않게 한다.
        event.stopPropagation();
        if (isVoiceMissing) {
          window.alert(voiceInstallGuide());
          return;
        }
        speak(text);
      }}
      aria-label={label}
      aria-pressed={isSpeaking}
      title={hint ?? undefined}
    >
      <PixelSpeaker
        className={cn("size-4", isSpeaking && "animate-pulse text-primary")}
        aria-hidden="true"
      />
    </Button>
  );
}
