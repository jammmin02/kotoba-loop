"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type SpeechRecognitionStatus = "idle" | "listening" | "result" | "error";

export type SpeechRecognitionErrorReason = "not-allowed" | "no-speech" | "unsupported" | "other";

export interface UseSpeechRecognitionResult {
  status: SpeechRecognitionStatus;
  transcript: string;
  errorReason: SpeechRecognitionErrorReason | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function subscribeNoop() {
  return () => {};
}

// window.SpeechRecognition doesn't exist during SSR — defer the support check to
// after hydration (useSyncExternalStore, same pattern as install-prompt-banner.tsx's
// useMounted) instead of setState-in-effect.
function useSpeechRecognitionSupported(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => getSpeechRecognitionCtor() !== null,
    () => false,
  );
}

/**
 * 브라우저 내장 Web Speech API를 감싼 훅. 서버 호출 없이 클라이언트에서만
 * 동작하며, `VoiceInputButton`이 이 훅의 상태에 따라 권한 요청/듣는 중/결과/
 * 오류 UI를 그린다.
 */
export function useSpeechRecognition(lang = "ja-JP"): UseSpeechRecognitionResult {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorReason, setErrorReason] = useState<SpeechRecognitionErrorReason | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const resolvedRef = useRef(false);
  const isSupported = useSpeechRecognitionSupported();

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("error");
      setErrorReason("unsupported");
      return;
    }

    recognitionRef.current?.stop();
    resolvedRef.current = false;
    setTranscript("");
    setErrorReason(null);
    setStatus("listening");

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      resolvedRef.current = true;
      const text = event.results.item(0)?.item(0)?.transcript ?? "";
      setTranscript(text.trim());
      setStatus("result");
    };

    recognition.onerror = (event) => {
      resolvedRef.current = true;
      setStatus("error");
      setErrorReason(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "not-allowed"
          : event.error === "no-speech"
            ? "no-speech"
            : "other",
      );
    };

    recognition.onend = () => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      setStatus("error");
      setErrorReason("no-speech");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.stop();
    resolvedRef.current = false;
    setStatus("idle");
    setTranscript("");
    setErrorReason(null);
  }, []);

  return { status, transcript, errorReason, isSupported, start, stop, reset };
}
