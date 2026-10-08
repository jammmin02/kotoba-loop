/** Content-Disposition 헤더에서 파일 이름을 꺼낸다(없으면 fallback). */
export function filenameFromDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

/** 메모리에 만든 파일을 브라우저 다운로드로 내려준다. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 클릭 직후 바로 해제하면 일부 브라우저가 다운로드를 시작하기 전에 URL이 사라진다.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
