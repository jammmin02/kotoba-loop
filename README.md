# kotoba-loop

한국어 사용자를 위한 AI 기반 일본어 단어·한자 학습 웹 서비스. 내 단어장을 만들고, 간격 반복(SRS)·퀴즈·AI 설명으로 기억을 유지하도록 돕는다.

구조와 데이터 흐름은 [서비스 아키텍처](docs/service-architecture.md), 요구사항은 [요구사항 정의서](docs/requirements.md)를 참고한다. 두 문서는 2026-09-21 시점의 코드 기준이라, 그 이후에 추가된 기능(관리자 콘솔, 가입 승인제, 단어 가져오기/내보내기 등)은 이 README와 코드를 우선한다.

## 주요 기능

**계정·운영**

- 이메일 가입과 Google 로그인. 허용 이메일 도메인(기본 `@g.yju.ac.kr`, `/admin/settings`에서 변경)만 새로 가입할 수 있고, 가입은 관리자 승인(`PENDING` → `APPROVED`) 뒤에 로그인된다. 로그인 실패 횟수는 제한된다.
- 관리자 콘솔(`/admin`): 회원 승인·정지, 콘텐츠·신고 처리, 공지, 감사 로그, 통계, AI 사용량, 서비스 설정(점검 모드 포함).

**단어**

- 단어장·단어 관리: 직접 입력, 사진 OCR(서버 안에서 `tesseract.js`로 처리), AI 분석(Claude), 태그, 즐겨찾기, 중복 단어 처리, 공개 단어장 탐색·가져오기.
- 목록 필터·검색·정렬(복습 예정 포함)은 URL에 저장되어 새로고침·링크 공유 뒤에도 유지되고, 긴 목록은 나눠서 그린다.
- 파일로 가져오기/내보내기: CSV와 JSON(학습 기록·단어장 구성 포함 전체 백업). 가져오기는 미리보기, 중복 처리(건너뛰기/덮어쓰기/둘 다 유지), 부분 실패 재시도를 지원한다.
- 삭제 실행 취소: 단어·단어장 삭제는 10초 뒤에 서버로 전송되고, 그 안에는 되돌릴 수 있다.

**학습**

- 오늘의 학습: 새 단어 + 복습 + 오답 복습. 하루 신규 단어 수와 복습 상한을 설정할 수 있고, 다 채우면 "더 학습하기"로 이어서 할 수 있다.
- SRS: 1·3·7·14·30·60·90일 간격(`lib/srs/`). 플래시카드는 키보드 단축키(Space/Enter 뒤집기, 1~4 채점)와 다음 복습 간격 미리보기를 지원한다.
- 퀴즈: 단어 6종 + 한자 3종 유형, 커스텀 학습, 오답노트, 문장 첨삭, AI 작문 퀘스트.
- 한자: 常用漢字 2,136자, 획순(`hanzi-writer`), 손글씨 검색, 퀴즈·연습.
- AI: 자연어 검색, 표현 비교, 상황 예문 생성 등(사용자별 호출·토큰 한도 적용).

**동기부여**

- EXP·레벨, 일일 퀘스트, 업적, 스트릭(프리즈), 펫 육성, 친구, 실시간 대결 퀴즈(Pusher), 통계·취약점 분석, JLPT 시험 목표와 학습량 추천.

**화면**

- 라이트/다크/시스템 테마(마이페이지에서 선택), 모바일 하단 탭과 더보기 메뉴, 접근성(포커스 이동, 스크린리더 안내, 움직임 줄이기 설정 존중), PWA(설치 안내, 오프라인 화면).

## 기술 스택

| 영역        | 사용 기술                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------- |
| 프레임워크  | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript                                   |
| 스타일      | Tailwind CSS v4 (픽셀 데스크톱 테마, 토큰은 `styles/globals.css`)                            |
| 상태·데이터 | TanStack Query 5(서버 상태) · Zustand 5(클라이언트 상태) · zod 4(모든 입력 검증)             |
| 인증        | Auth.js (`next-auth` v5 beta) — Google + 이메일/비밀번호(`bcryptjs`), JWT 세션               |
| DB          | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`). 운영은 Neon을 가정한다.                        |
| AI·OCR      | Anthropic SDK(Claude), `tesseract.js`(일본어 학습 데이터 `public/tesseract/jpn.traineddata`) |
| 실시간      | Pusher Channels (실시간 대결)                                                                |
| 파일 저장   | Backblaze B2 (S3 호환, `@aws-sdk/client-s3`)                                                 |
| 품질        | ESLint(+ import 정렬) · Prettier · 단위 테스트(`node:test` + `tsx`)                          |

## 시작하기

**준비물**: Node.js 20.9 이상, PostgreSQL(로컬 또는 [Neon](https://neon.tech)).

```bash
# 1) 의존성 설치 (postinstall에서 `prisma generate`가 함께 실행된다)
npm install

# 2) 환경변수 파일 만들기 — 아래 "환경변수" 표를 보고 값을 채운다
cp .env.example .env.local

# 3) DB 스키마 적용 (개발 DB)
npm run db:migrate

# 4) 기본 데이터 넣기
npm run db:seed:kanji        # 常用漢字 2,136자 (한자 기능에 필요)
npm run db:seed              # 개발용 샘플 단어 1개와 시드 계정(로그인 불가)

# 5) 개발 서버
npm run dev                  # http://localhost:3000
```

### 관리자 계정

가입은 관리자 승인이 필요하므로, 처음에는 관리자를 직접 만들어야 한다.

```bash
# 무작위 비밀번호로 관리자 계정(admin@kotoba-loop.app)을 만든다. 비밀번호는 이때 한 번만 출력된다.
npx tsx prisma/seed-admin-account.ts

# 이미 가입한 다른 계정을 관리자로 지정/해제
npm run db:set-admin -- <email>
npm run db:set-admin -- <email> --revoke
```

### 선택 데이터 스크립트 (`prisma/`)

| 명령                                                             | 용도                                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npx tsx prisma/seed-jlpt-books.ts`                              | 커뮤니티에 노출할 공식 JLPT N5~N1 단어장(관리자 계정 소유라 관리자 시드 뒤에 실행)        |
| `npx tsx prisma/seed-gap-vocab.ts`                               | 단어와 연결되지 않은 한자를 위한 대표 단어 1,981개                                        |
| `npm run db:backfill:vocabulary-kanji`                           | 단어 ↔ 한자 연결 재계산(위 스크립트 뒤에 실행)                                            |
| `npm run db:backfill:imported-book-user-vocabulary`              | 커뮤니티 단어장 가져오기 버그로 빠진 "내 단어" 등록을 한 번 채워 넣는 과거 데이터 보정    |
| `npm run db:validate:kanji`                                      | 한자 시드 데이터 검증                                                                     |
| `npx tsx prisma/seed-test-account.ts`, `seed-multi-book-test.ts` | 수동 테스트용 계정. **비밀번호가 코드에 고정**이라 로컬 DB에서만 쓴다(공유·운영 DB 금지). |

> **주의**: `npm run db:migrate`(`prisma migrate dev`)는 개발용이다. 이미 데이터가 있는 공유·운영 DB에는 `npx prisma migrate deploy`를 쓰고, 적용 전에 `npx prisma migrate status`로 대기 중인 마이그레이션을 확인한다.

## 환경변수

`.env.example`을 복사해 `.env.local`을 만든다. 값이 들어간 `.env.local`은 절대 커밋하지 않는다(`.gitignore`에 포함). Prisma CLI도 같은 `.env` → `.env.local` 순서로 읽는다([prisma.config.ts](prisma.config.ts)).

| 변수                                                                                                   | 필수 | 용도                                                                                         |
| ------------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                         | ✅   | PostgreSQL 연결 문자열(Neon은 제공된 값을 그대로, `sslmode=require` 포함)                    |
| `AUTH_SECRET`                                                                                          | ✅   | 세션 서명 키. `openssl rand -base64 32`로 생성                                               |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`                                                                | 선택 | "Google로 로그인" 버튼용. 로그인 화면에 버튼은 항상 보이므로, 키가 없으면 이메일 가입만 쓴다 |
| `LLM_API_KEY`                                                                                          | AI   | Claude API 키. 없으면 AI 기능이 동작하지 않는다                                              |
| `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_MAX_RETRIES`                                                          | 선택 | AI 호출 설정(기본값은 `lib/ai/client.ts`)                                                    |
| `AI_LIMIT_PER_MINUTE`, `AI_LIMIT_PER_DAY`, `AI_LIMIT_TOKENS_PER_DAY`                                   | 선택 | 사용자별 AI 한도(기본 15회/분, 300회/일, 500,000토큰/일, `lib/ai/usage-limit.ts`)            |
| `STORAGE_ENDPOINT` / `STORAGE_REGION` / `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` / `STORAGE_BUCKET` | 사진 | 사진 단어 등록 업로드용 Backblaze B2. 서버 전용으로 등록(`NEXT_PUBLIC_` 금지)                |
| `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER`                                    | 대결 | 실시간 대결 서버 설정                                                                        |
| `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER`                                                | 대결 | 같은 키·클러스터를 브라우저(`pusher-js`)에 노출                                              |

"필수"가 아닌 변수는 해당 기능을 쓸 때만 필요하다. 어떤 변수가 어느 기능에 영향을 주는지는 위 표의 용도를 따른다.

## 스크립트

| 명령                                | 설명                                                       |
| ----------------------------------- | ---------------------------------------------------------- |
| `npm run dev` / `build` / `start`   | 개발 서버 / 프로덕션 빌드 / 빌드 결과 실행                 |
| `npm run lint`                      | ESLint                                                     |
| `npm run typecheck`                 | 라우트 타입 생성(`next typegen`) 후 `tsc --noEmit`         |
| `npm test`                          | 단위 테스트(`lib/**/*.test.ts`, `components/**/*.test.ts`) |
| `npm run format` / `format:check`   | Prettier 일괄 정리 / 검사만                                |
| `npm run db:migrate`                | `prisma migrate dev` (개발 DB 전용)                        |
| `npm run db:seed` / `db:seed:kanji` | 샘플 데이터 / 常用漢字 시드                                |
| `npm run db:set-admin -- <email>`   | 관리자 지정                                                |
| `npm run db:studio`                 | Prisma Studio                                              |
| `npm run icons:generate`            | `scripts/icon-source.png`에서 PWA 아이콘 생성              |

## 개발 규칙

### API 응답 규격

모든 API는 두 형태 중 하나로만 응답한다(타입: [types/api.ts](types/api.ts)).

```ts
// 성공
{ success: true, data: T }

// 실패
{ success: false, error: { code: ApiErrorCode, message: string, details?: {...} } }
```

- **에러 코드와 HTTP 상태**: 코드↔상태 매핑은 [lib/api/error.ts](lib/api/error.ts)에 고정되어 있다(예: `VALIDATION_ERROR` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `RATE_LIMITED` 429, `INTERNAL_ERROR` 500, `EXTERNAL_API_ERROR` 502, `AI_TIMEOUT` 504 등). 새 코드는 `types/api.ts`와 이 매핑에 함께 추가한다.
- **Route Handler**: [lib/api/handler.ts](lib/api/handler.ts)의 `withApiHandler`로 감싸고, 성공은 데이터를 그대로 `return`, 실패는 `throw new ApiError(code, message)`(zod 검증 실패의 `ZodError`는 자동 변환)로 처리한다. 파일을 응답하는 라우트(내보내기)는 래퍼를 쓰지 않고 오류만 같은 형식으로 변환한다.
- **입력 검증**: 모든 요청 body/query/params는 zod 스키마로 검증한 뒤 로직에 넘긴다.
- **프론트엔드 호출**: [lib/api/client.ts](lib/api/client.ts)의 `apiFetch<T>()`를 TanStack Query의 `queryFn`/`mutationFn`으로 쓴다. 실패는 모두 `ApiClientError`로 던져진다.

### 날짜·시간

복습일 등 날짜 로직은 모두 KST(UTC+9, 서머타임 없음) 기준이다. [lib/datetime.ts](lib/datetime.ts)의 `startOfKstDay`, `addKstDays`, `toKstDateKey`, `formatKstISOString`을 쓰고, 서버에 `Date`를 직접 비교하지 않는다.

### 디자인 토큰

글자색은 `text-foreground/NN` 같은 반투명을 직접 쓰지 말고 `text-muted`(보조 설명, AA 4.5:1 이상), `text-subtle`(비활성·보조 아이콘, 3:1 이상)을 쓴다. 작은 버튼은 시각 크기를 유지한 채 `touch-target`으로 터치 영역을 44px 이상으로 넓힌다. 다크 모드는 `<html>`의 `.dark` 클래스로 동작한다. 자세한 토큰은 `/dev/style-guide`에서 본다.

### 네이밍·정렬

- 파일/폴더: 컴포넌트·훅·유틸 모두 `kebab-case`(예: `word-list-item.tsx`, `use-theme-preference.ts`). 라우트 폴더는 Next.js 규칙에 따른다.
- 컴포넌트·타입은 `PascalCase`(타입에 `I` 접두사 없음), 함수·변수는 `camelCase`, 모듈 상수는 `UPPER_SNAKE_CASE`, zod 스키마는 `...Schema` 접미사.
- import 순서는 ESLint `import/order`가 검사한다(builtin → external → internal `@/*` → parent/sibling, 그룹 사이 빈 줄).

### 폴더 구조

```
app/                  라우트(App Router). 화면과 app/api/ 아래 Route Handler
  dev/                개발 전용 화면 (운영에서는 404)
components/           UI 컴포넌트 — 도메인별(vocabulary, kanji, study, game, admin …)과 공통(ui)
lib/                  서버·공용 로직 — 도메인별(srs, study, quiz, ai, vocabulary-io …)
  api/                API 응답·오류·클라이언트 헬퍼
  generated/          Prisma Client (생성물, 커밋하지 않는다)
types/                레이어가 공유하는 타입
prisma/               schema.prisma, migrations/, 시드·백필 스크립트
public/               정적 파일 (PWA 아이콘, sw.js, offline.html, tesseract 학습 데이터)
styles/               globals.css (디자인 토큰, 다크 모드)
docs/                 요구사항·아키텍처 문서
scripts/              PWA 아이콘 생성
proxy.ts              인증·점검 모드·관리자 경로 접근 제어(Next.js proxy)
```

## 개발 전용 화면 (`/dev/*`)

`style-guide`(디자인 토큰·컴포넌트 데모), `design-plan`, `srs-test`(SRS 시뮬레이션, 로그인 필요), `kanji-lookup`, `words-preview`(가짜 API로 대량 목록·가져오기·삭제 실행 취소 확인)가 있다. [app/dev/layout.tsx](app/dev/layout.tsx)가 운영(`NODE_ENV=production`)에서는 이 폴더 전체를 404로 막는다. 새 개발 화면은 이 폴더 아래에 만들면 자동으로 보호된다.

## 배포

- 호스팅은 Vercel(`vercel.json`의 리전 `sin1`), DB는 Neon, 저장소는 Backblaze B2, 실시간은 Pusher를 쓰도록 구성되어 있다. 실제 Vercel 프로젝트·환경변수 설정은 저장소만으로 확인할 수 없다(**확인 필요**).
- 새 마이그레이션이 있는 배포 전에는 대상 DB에서 `npx prisma migrate status` → `npx prisma migrate deploy` 순서로 적용한다.
- OCR 학습 데이터(`public/tesseract/jpn.traineddata`, 약 2.4MB)는 OCR 함수 번들에 포함되도록 `next.config.ts`에서 지정한다.
- PWA: `app/manifest.ts`, `public/sw.js`(캐시 금지 헤더로 서빙), `public/offline.html`.

## 커밋 전 체크리스트

- [ ] `npm run lint` · `npm run typecheck` · `npm test` 통과
- [ ] `npm run format:check` 통과(필요 시 `npm run format`)
- [ ] `npm run build` 성공
- [ ] 새 API 입력에 zod 검증 적용, 인증이 필요한 API는 소유권(본인 데이터인지)까지 확인
- [ ] DB 스키마를 바꿨다면 `prisma/migrations/`에 마이그레이션을 함께 커밋
- [ ] `.env.local` 등 실제 값이 담긴 파일이 포함되지 않았는지 확인
- [ ] 커밋 메시지는 변경 이유(why)를 간결하게 설명
