# kotoba-loop

AI 기반 일본어 단어·한자 학습 웹 서비스.

이 저장소는 현재 **프로젝트 골격(scaffold) 단계**입니다. 실제 화면/DB 연결/인증/비즈니스 로직은 아직 구현되어 있지 않습니다.

## 기술 스택

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **상태 관리**: TanStack Query(서버 상태), Zustand(클라이언트 상태) — 설치만 완료, 실사용은 이후 단계
- **Backend**: Next.js Route Handlers (`app/api/`)
- **Validation**: [zod](https://zod.dev) — 모든 API 입력 검증(요청 body/query/params)은 zod 스키마를 표준으로 사용한다. Route Handler 진입점에서 `schema.parse()` 또는 `schema.safeParse()`로 검증 후 비즈니스 로직에 전달할 것.
- **DB/ORM**: Prisma (스키마는 Phase 2에서 작성)
- **Lint/Format**: ESLint(+ import 정렬) / Prettier

## API 응답 규격

모든 API는 아래 두 형태 중 하나로만 응답한다 (타입: [types/api.ts](types/api.ts)).

```ts
// 성공
{ success: true, data: T }

// 실패
{ success: false, error: { code: ApiErrorCode, message: string } }
```

- **에러 코드**: `VALIDATION_ERROR`(400) · `UNAUTHORIZED`(401) · `NOT_FOUND`(404) · `EXTERNAL_API_ERROR`(502) · `AI_TIMEOUT`(504) · `INTERNAL_ERROR`(500). 코드-상태 매핑은 [lib/api/error.ts](lib/api/error.ts)에 고정되어 있다.
- **Route Handler 작성법**: [lib/api/handler.ts](lib/api/handler.ts)의 `withApiHandler`로 감싸고, 성공 시 데이터를 그대로 `return`, 실패 시 `throw new ApiError(code, message)` (또는 zod 검증 실패 시 자연스럽게 발생하는 `ZodError`)를 던진다. 래퍼가 표준 응답으로 변환한다. 예시: [app/api/health/route.ts](app/api/health/route.ts).
- **프론트엔드 호출**: [lib/api/client.ts](lib/api/client.ts)의 `apiFetch<T>(path, options)`를 TanStack Query의 `queryFn`/`mutationFn`으로 그대로 사용한다. 성공 시 `data`를 반환하고, 실패(서버 에러/네트워크 에러/타임아웃)는 모두 `ApiClientError`를 throw하므로 Query가 `error` 상태로 처리한다.

## 날짜/시간 규칙

복습일 계산 등 날짜가 관련된 모든 로직은 KST(UTC+9, 서머타임 없음) 기준으로 처리한다. [lib/datetime.ts](lib/datetime.ts)의 `startOfKstDay`, `addKstDays`, `formatKstISOString`을 사용하고, 서버에 `Date`를 직접 저장/비교하지 않는다.

## 폴더 구조

```
app/                # 라우트 (Next.js App Router). 페이지, 레이아웃, app/api/ 하위 Route Handler
  api/               # 백엔드 API 엔드포인트 (Route Handlers)
components/          # 여러 페이지에서 재사용하는 공통 UI 컴포넌트
  game/              # 게임화(퀴즈, 스트릭, 점수 등) 전용 UI 컴포넌트
lib/                 # 유틸 함수, 서버 로직 (DB 클라이언트, 인증 헬퍼 등)
  api/               # 프론트엔드에서 백엔드 API를 호출하는 클라이언트 함수
types/               # 여러 레이어에서 공유하는 공통 타입 정의
prisma/              # Prisma 스키마 및 마이그레이션 (Phase 2에서 채움)
styles/              # 전역 스타일 (globals.css 등)
public/              # 정적 파일
```

## 네이밍 규칙

- **파일/폴더**: 컴포넌트 파일은 `PascalCase.tsx` (예: `WordCard.tsx`), 그 외 유틸/훅/설정 파일은 `kebab-case.ts` 또는 `camelCase.ts` (예: `use-auth.ts`, `apiClient.ts`). 라우트 폴더는 Next.js 규칙을 따라 소문자(`app/word-list/page.tsx`).
- **컴포넌트**: `PascalCase` (예: `QuizCard`, `StreakBadge`).
- **함수/변수**: `camelCase`.
- **타입/인터페이스**: `PascalCase`, 접두사 `I` 사용하지 않음 (예: `User`, `QuizResult`).
- **상수**: `UPPER_SNAKE_CASE` (모듈 스코프의 불변 설정값에 한함).
- **zod 스키마**: 대상 타입 이름 뒤에 `Schema` 접미사 (예: `createWordSchema`, 대응 타입은 `z.infer<typeof createWordSchema>`).
- **API 라우트**: REST 관례를 따르는 리소스 기반 경로 (예: `app/api/words/route.ts`, `app/api/words/[id]/route.ts`).
- **import 정렬**: ESLint `import/order` 규칙에 따라 자동 검사됨 — builtin → external → internal(`@/*`) → parent/sibling 순, 그룹 사이 빈 줄 필수, 알파벳 순 정렬.

## 환경변수

`.env.example`을 참고해 `.env.local`을 생성한다. 실제 값이 들어간 `.env.local`은 절대 커밋하지 않는다 (`.gitignore`에 이미 포함됨).

| 변수                                                                                | 용도                                                      |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`                                                                      | Prisma DB 연결 문자열 (Phase 2에서 사용 시작)             |
| `AUTH_SECRET`                                                                       | 인증 토큰/세션 서명·암호화 키                             |
| `LLM_API_KEY`                                                                       | 단어/한자 설명, 퀴즈 생성 등에 사용하는 LLM API 키        |
| `STORAGE_REGION` / `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` / `STORAGE_BUCKET` | 사용자 업로드·생성 자산을 저장하는 AWS S3 설정(ACCESS/SECRET KEY는 로컬 개발용 — 프로덕션에선 비워두고 컴퓨트 역할에 S3 권한 부여) |

## 커밋 전 체크리스트

- [ ] `npm run lint` 에러 없이 통과
- [ ] `npm run format:check` 통과 (필요 시 `npm run format`으로 일괄 정리)
- [ ] `npm run build` 에러 없이 성공 (타입 에러 포함)
- [ ] 실제 값이 담긴 `.env.local` 등 민감 파일이 커밋에 포함되지 않았는지 확인
- [ ] 새로 추가한 API 입력에 zod 검증이 적용되었는지 확인
- [ ] 커밋 메시지는 변경 이유(why)를 간결하게 설명

## 개발 스크립트

```bash
npm run dev           # 개발 서버 실행
npm run build          # 프로덕션 빌드
npm run start           # 빌드 결과 실행
npm run lint             # ESLint 검사
npm run format           # Prettier로 전체 포맷팅
npm run format:check      # Prettier 포맷 검사만 수행 (수정 없음)
```
