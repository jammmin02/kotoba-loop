"use client";

import { useEffect } from "react";

// 루트 레이아웃 자체가 깨졌을 때만 쓰이는 화면이라 전역 CSS·폰트·Tailwind가 없다.
// 그래서 의존성 없이 인라인 스타일만 쓰고, 색은 OS 라이트/다크 설정을 따른다.
const STYLES = `
  .ge { min-height: 100vh; margin: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px; padding: 16px; text-align: center;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #fff; color: #1a1a2e; }
  .ge h1 { margin: 0; font-size: 20px; }
  .ge p { margin: 0; font-size: 14px; opacity: 0.7; }
  .ge button { margin-top: 8px; padding: 10px 20px; font-size: 16px; font-weight: 700; cursor: pointer;
    border: 2px solid #1a1a2e; border-radius: 0; background: #5b5fef; color: #fff; }
  @media (prefers-color-scheme: dark) { .ge { background: #14141f; color: #f1f1f8; } .ge button { border-color: #f1f1f8; } }
`;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="ge">
        <style>{STYLES}</style>
        <h1>문제가 발생했어요</h1>
        <p>일시적인 오류일 수 있어요. 다시 시도해주세요.</p>
        {error.digest && <p>오류 코드: {error.digest}</p>}
        <button type="button" onClick={() => retry()}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
