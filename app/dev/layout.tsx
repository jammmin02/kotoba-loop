import { notFound } from "next/navigation";

import type { ReactNode } from "react";

/**
 * `/dev/*`는 개발용 화면(스타일 가이드, SRS 테스트, 가짜 API 미리보기 등)이라 운영에서는 존재하지
 * 않아야 한다. 운영의 1차 방어는 `proxy.ts`(렌더링 전에 404)이고, 이 레이아웃은 그 설정이 바뀌어도
 * 이 폴더의 어떤 화면(앞으로 추가될 것 포함)도 내용을 렌더하지 않게 하는 2차 방어다. 이 방어만으로는
 * 상태 코드가 200이 되고 제목이 노출되므로 단독으로 믿지 않는다.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
