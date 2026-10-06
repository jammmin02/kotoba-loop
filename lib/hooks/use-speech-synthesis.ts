"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}

// window.speechSynthesis doesn't exist during SSR — defer the support check to after
// hydration (same useSyncExternalStore pattern as use-speech-recognition.ts).
function useSpeechSynthesisSupported(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );
}

/** 주어진 언어의 음성 중 첫 번째를 고른다. 없으면 null(브라우저 기본 음성에 맡긴다). */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const prefix = lang.slice(0, 2).toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ??
    null
  );
}

export interface UseSpeechSynthesisResult {
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string) => void;
  cancel: () => void;
}

/**
 * 브라우저 내장 Web Speech API(speechSynthesis)로 텍스트를 읽어주는 훅. 서버 호출 없이
 * 클라이언트에서만 동작한다. `SpeakButton`이 이 훅을 쓴다.
 */
export function useSpeechSynthesis(lang = "ja-JP"): UseSpeechSynthesisResult {
  const isSupported = useSpeechSynthesisSupported();
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 언마운트 시 재생 중인 음성을 멈춘다(카드가 넘어가는데 앞 카드 음성이 계속 나오지 않도록).
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      const voice = pickVoice(lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synth.speak(utterance);
    },
    [isSupported, lang],
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { isSupported, isSpeaking, speak, cancel };
}
