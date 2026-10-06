/**
 * CSV 한 칸을 안전하게 만든다. 스프레드시트가 수식으로 실행할 수 있는 시작 문자(= + - @ 탭 CR)는
 * 앞에 작은따옴표를 붙여 문자열로 취급되게 하고(CSV injection 방지), 쉼표·따옴표·줄바꿈이 있으면
 * 따옴표로 감싼다.
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인 CSV 문자열을 만든다. */
export function toCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
