"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

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

function findVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const prefix = lang.slice(0, 2).toLowerCase();
  return (
    voices.find((voice) => voice.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ??
    null
  );
}

// cancel() 직후 speak()를 부르면 Chrome에서 새 발화가 조용히 버려지는 문제가 있어 잠깐 띄운다.
const SPEAK_AFTER_CANCEL_MS = 80;

// 발화 중인 utterance를 모듈 전역에 붙잡아 둔다. 참조가 없으면 Chrome에서 GC되어 onend가
// 오지 않거나 발화가 끊긴다. 전역 하나뿐인 speechSynthesis 큐와 같은 수명이다.
let activeUtterance: SpeechSynthesisUtterance | null = null;

/** 재생 실패 원인. 화면에는 SpeakButton이 원인별 안내를 띄운다. */
export type SpeechProblem = "blocked" | "no-voice" | "no-sound" | "failed";

// 재생을 요청했는데 이 시간 안에 시작(onstart)되지 않으면 소리가 안 나는 것으로 본다.
// 모바일 브라우저는 음성이 없거나 막혀도 에러 없이 조용히 끝나는 경우가 많다.
const START_TIMEOUT_MS = 3000;

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export interface UseSpeechSynthesisResult {
  isSupported: boolean;
  isSpeaking: boolean;
  /** 음성 목록이 로드됐는데 해당 언어 음성이 하나도 없을 때 true. */
  isVoiceMissing: boolean;
  /** 재생 실패 원인. 다음 재생을 시도하면 지워진다. */
  error: SpeechProblem | null;
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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<SpeechProblem | null>(null);
  // 이 훅 인스턴스가 시작한 가장 최근 발화. 오래된 발화의 콜백이 상태를 덮어쓰지 않게 한다.
  const myUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = null;
  }, []);

  // Chrome은 getVoices()가 처음엔 빈 배열이고 voiceschanged 이후에 채워진다.
  useEffect(() => {
    if (!isSupported) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener("voiceschanged", load);
    return () => synth.removeEventListener("voiceschanged", load);
  }, [isSupported]);

  // 언마운트 시 내가 시작한 발화만 멈춘다(다른 버튼의 발화는 건드리지 않는다).
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      const mine = myUtteranceRef.current;
      if (mine && mine === activeUtterance && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        activeUtterance = null;
      }
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;
      const synth = window.speechSynthesis;
      setError(null);

      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      const voice = findVoice(voices.length ? voices : synth.getVoices(), lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        if (myUtteranceRef.current !== utterance) return;
        clearWatchdog();
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (activeUtterance === utterance) activeUtterance = null;
        if (myUtteranceRef.current !== utterance) return;
        clearWatchdog();
        setIsSpeaking(false);
      };
      utterance.onerror = (event) => {
        if (activeUtterance === utterance) activeUtterance = null;
        // 새 발화로 대체되거나 취소된 건 정상 동작이라 에러로 보지 않는다.
        if (event.error === "interrupted" || event.error === "canceled") return;
        if (myUtteranceRef.current !== utterance) return;
        clearWatchdog();
        setIsSpeaking(false);
        if (event.error === "not-allowed") setError("blocked");
        else if (event.error === "language-unavailable" || event.error === "voice-unavailable")
          setError("no-voice");
        else setError("failed");
      };

      myUtteranceRef.current = utterance;
      activeUtterance = utterance;

      const start = () => {
        pendingTimerRef.current = null;
        clearWatchdog();
        watchdogRef.current = setTimeout(() => {
          watchdogRef.current = null;
          if (myUtteranceRef.current !== utterance) return;
          synth.cancel();
          setIsSpeaking(false);
          setError("no-sound");
        }, START_TIMEOUT_MS);
        // paused 상태로 굳으면 이후 speak()가 전부 무음이 된다.
        if (synth.paused) synth.resume();
        synth.speak(utterance);
      };

      if (synth.speaking || synth.pending || synth.paused) {
        synth.cancel();
        // iOS Safari는 클릭과 같은 틱에서 speak()를 불러야 소리가 난다(타이머를 거치면 막힌다).
        if (isIos()) start();
        else pendingTimerRef.current = setTimeout(start, SPEAK_AFTER_CANCEL_MS);
      } else {
        start();
      }
    },
    [isSupported, lang, voices, clearWatchdog],
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    clearWatchdog();
    window.speechSynthesis.cancel();
    activeUtterance = null;
    setIsSpeaking(false);
  }, [isSupported, clearWatchdog]);

  const isVoiceMissing = voices.length > 0 && findVoice(voices, lang) === null;

  return { isSupported, isSpeaking, isVoiceMissing, error, speak, cancel };
}
