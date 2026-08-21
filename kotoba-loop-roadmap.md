# kotoba-loop 개발 로드맵 — AI 기반 일본어 단어·한자 학습 웹 서비스

> 이 문서는 `# AI 기반 일본어 단어·한자 학습 웹 서비스 개발 계획서.txt`를 기반으로 작성되었습니다.
> 지금 이 문서는 **바로 개발을 시작하기 위한 것이 아니라**, 계획서를 정확히 이해하고 전체 구조를 설계한 뒤, 이후 PROMPT 01부터 순서대로 하나씩 AI 코딩 도구에 전달하여 개발을 진행하기 위한 **개발 지시서**입니다.
> 각 PROMPT는 이전 단계의 결과물을 유지·재사용한다는 전제로 작성되었으며, 폴더 구조·네이밍·API 규격·디자인 시스템은 Phase 0~1에서 한 번 확정한 뒤 프로젝트가 끝날 때까지 변경하지 않습니다.

---

## A. 계획서 분석

### A.1 프로젝트 목적 (계획서에서 확인됨)

일본어 학습자가 단어·한자를 단순 반복 암기하는 방식에서 벗어나, **간격 반복(SRS) + 능동 회상 + AI 분석 + 이미지 학습 + OCR**을 결합해 장기 기억으로 전환시키는 웹 학습 서비스를 만드는 것이 목적이다. 핵심은 "단어를 저장하는 서비스"가 아니라 "사용자가 무엇을 알고 무엇을 잊고 있는지 판단해서 다음 학습을 자동으로 결정하는 개인 학습 시스템"이라는 점이다(계획서 64장).

### A.2 핵심 사용자 (계획서에서 확인됨)

- JLPT(N5~N1)를 목표로 하는 일본어 학습자
- 일본 취업/유학/여행/회화/독해/자기계발 등 다양한 학습 목적을 가진 사용자 (회원가입 시 선택)
- 이미 자신만의 단어장(교재, 노트, 프린트)을 가진 학습자 — 사진으로 단어장을 디지털화하고 싶은 수요
- 상용한자 2,136자를 체계적으로 학습하고 싶은 사용자

### A.3 서비스 핵심 루프 (계획서에서 확인됨)

```text
단어 등록(직접입력/사진) → AI 자동 분석 → 사용자 검수 → 단어장 저장
→ 오늘의 새 단어 학습 → 퀴즈 → 정답/오답 기록 → 다음 복습일 자동 계산
→ 간격 반복 복습 → 문장 만들기 → (2차) AI 회화에서 실사용 → 장기 기억 전환
```

한자는 단어와 별도의 학습 축이지만 반드시 단어와 상호 연결되어야 한다(단어 상세 → 한자 클릭 → 한자 상세 → 그 한자가 포함된 다른 단어 목록, 양방향).

### A.4 버전 구조 (계획서에서 확인됨 — 4장, 63장)

계획서는 이미 3단계 버전 구조와 5개 Phase 우선순위를 제시하고 있다. 이 로드맵은 이 구조를 그대로 존중하되, 실제 "개발 착수 가능한 단위"로 더 세분화한다.

| 버전 | 내용 |
|---|---|
| 1차 버전 | 단어 저장 + AI 분석 + 자동 복습 (Phase 1: 회원/단어CRUD/AI분석/학습카드/SRS/퀴즈/오답노트/기본통계) |
| 1.5차 버전 | 사진 OCR + 한자 학습 (Phase 2) |
| 2차 버전 | AI 개인화 + 이미지 + 회화 + 고급 분석 (Phase 3~4) |
| 확장 | 한자 획순/따라쓰기, 음성, 브라우저 확장, PWA, 친구/공유 (Phase 5) |

게임화(레벨/EXP/스트릭/업적)는 계획서 55~56장에 등장하지만 특정 버전에 명시적으로 배정되어 있지 않다. → **추측한 내용**: 1차 버전의 핵심 학습 루프(학습카드/퀴즈/오답노트)가 먼저 동작해야 EXP를 지급할 이벤트가 존재하므로, 이 로드맵에서는 게임화 시스템을 "1차 버전 학습 루프 완료 직후, 1.5차 버전(사진/한자) 진입 이전"에 배치한다. 사용자가 원하면 순서를 조정할 수 있다.

### A.5 회원 기능 (계획서에서 확인됨 — 6~7장)

- 이메일 또는 소셜 로그인 (✅ **확정**: 소셜 로그인은 구글만 추가, B 섹션 참고)
- 회원 정보: 닉네임, 이메일, 비밀번호, 일본어 수준(입문~N1), JLPT 목표, 하루 학습량, 학습 목적(다중 선택으로 보임: JLPT/취업/유학/여행/회화/애니·드라마/독해/자기계발)
- 가입 직후 온보딩(현재 수준/목표/하루 단어 수/하루 학습 시간/주요 목적)을 진행하며, 이 값이 이후 추천 문제 난이도에 반영됨

### A.6 데이터 구조 (계획서에서 확인됨 — 60장)

계획서가 명시한 엔티티: `User, VocabularyBook, Vocabulary, VocabularyMeaning, ExampleSentence, Kanji, VocabularyKanji, UserVocabulary, ReviewHistory, Tag, VocabularyTag, Image, AIAnalysis`. 이 로드맵의 C.3, Phase 2에서 이 스키마를 기준으로 확장한다. **주의**: 계획서에는 게임화(EXP/Level/Quest/Streak/Achievement) 테이블이 정의되어 있지 않다 — 기능 자체는 확인되지만 스키마는 이 문서에서 새로 설계한다(→ 추가 결정 필요로 표시, D/E 섹션에서 확정).

### A.7 AI를 사용하는 기능 (계획서에서 확인됨 — 61장)

단어 뜻/후리가나/품사/예문 생성, 문장 첨삭, 유의어 추천, 헷갈리는 표현 비교, 사진 OCR 후 단어 분석, 학습 데이터 취약점 분석, 문제 자동 생성, 이미지 상황 설명 생성, 한자 기억법 생성, 자연어 단어 검색, AI 회화, 개인 맞춤 학습 추천. 계획서는 "사전/한자 기본 정보처럼 정확성이 중요한 정보는 AI 단독보다 **검증된 사전 DB + AI 보조 설명** 구조가 적절"하다고 명시한다 — 이는 한자 상용한자 DB는 정적 데이터로 미리 구축하고, AI는 어디까지나 "설명/기억법/예문" 보조 역할에 한정한다는 뜻으로 해석된다.

### A.8 외부 API가 필요한 기능 (계획서에서 확인됨 / 일부 추측)

- AI 텍스트 분석·생성 (LLM API) — 확인됨, ✅ **확정: Claude API**
- OCR (사진 → 텍스트) — 확인됨, ✅ **확정: Google Cloud Vision**
- AI 이미지 생성(기억용 이미지, 42장) — 계획서에는 확인되나 ✅ **확정**: 비용 이슈로 이번 프로젝트에서는 채택하지 않고 상황 설명 텍스트(PROMPT 46)로 대체(PROMPT 47은 로드맵에서 스킵 처리)
- 음성 합성 TTS(50장), 음성 인식/발음 평가(51장) — 확인됨이나 51장은 "향후 음성 인식 기능을 활용하여~"로 명시되어 있어 **확장 기능**으로 명확히 구분됨
- 사물 인식(카메라 사물 단어장, 48~49장) — 이미지 인식 AI 필요, 확인됨

### A.9 관리자 기능

계획서 전체에 관리자(운영자) 화면에 대한 언급이 없다. → **계획서에 명시되지 않음.** 다만 실제 서비스 운영을 위해서는 최소한 "신고/오류 단어 관리", "사용자 통계 조회" 정도가 필요할 가능성이 높다 → **추측한 내용**이며, 로드맵 마지막(Phase 15 이전)에 선택 단계로만 배치하고 필수 Phase에는 포함하지 않는다.

**확정(사용자 결정)**: 상용한자 2,136자는 관리자용 추가/수정 화면 없이 **서비스 출시 시점에 1회 완전 시딩되는 고정 내장 데이터**로 취급한다. 즉 "상용한자 마스터 데이터 관리" 같은 관리자 기능은 만들지 않는다 — Phase 9(PROMPT 33)에서 전체 2,136자를 한 번에 시드하고, 이후 어떤 사용자·운영자도 한자 데이터를 추가/수정하는 화면을 두지 않는다(콘텐츠 오류 수정이 필요하면 시드 스크립트를 고쳐 재배포하는 방식으로만 처리).

### A.10 학습/게임/보상 요소 (계획서에서 확인됨 — 55~56장)

업적(단어 수 기준: 첫 단어/10/100/500/1,000, 한자 기준: 100/500/1,000/2,136 MASTER), EXP 지급 규칙(단어학습 +1, 복습성공 +1, 문장만들기 +3, 한자학습 +2, 오늘의학습완료 +10), 학습 캘린더 + 연속학습(Streak) 기록. **Level 계산식, Daily/Weekly Quest의 구체 목록, 뱃지 티어 UI**는 계획서에 값이 없어 D/E에서 새로 확정한다.

### A.11 추후 확장 기능 (계획서에서 확인됨 — Phase 5, 57~58장)

한자 획순 애니메이션, 한자 따라쓰기(+ 향후 AI 필기인식/정확도 평가), 발음 연습(음성 인식), 브라우저 확장 프로그램, PWA/모바일 앱, 친구 기능/단어장 공유/커뮤니티 단어장.

### A.12 계획서 내부 연결 관계 (선행/후행 의존성 분석)

계획서에 흩어져 있는 기능들을 실제 구현 의존성으로 재정리하면 다음과 같다.

- **단어(Vocabulary) 없이는** 학습카드·퀴즈·오답노트·통계·게임화 EXP·한자↔단어 연결이 존재할 수 없다 → 단어 CRUD가 모든 학습 기능의 선행조건.
- **AI 분석은 단어 등록의 "옵션 강화"이지 필수 선행조건은 아니다.** 계획서 9장은 "AI 분석 → 사용자 확인 → 수정 가능 → 저장" 흐름을 명시하므로, 수동 입력만으로도 단어 저장은 가능해야 한다(AI 실패 시에도 서비스가 죽지 않아야 함) → AI 기능은 단어 CRUD와 분리 개발 가능.
- **SRS(간격반복) 스케줄이 있어야** "오늘의 학습" 페이지가 무엇을 보여줄지 계산할 수 있다 → SRS 엔진이 오늘의 학습 페이지의 선행조건.
- **퀴즈 → ReviewHistory 기록 → SRS 재계산**은 하나의 순환 구조다(15~17장) → 퀴즈와 SRS는 사실상 같은 단계에서 함께 설계해야 한다.
- **오답노트는 ReviewHistory에 대한 집계 뷰**이므로 반드시 퀴즈 기록 이후에 온다.
- **한자 학습(28~33장)은 단어 시스템과 독립적으로 구축 가능**하지만(정적 DB), "한자↔단어 연결"과 "한자 업적"은 Vocabulary·VocabularyKanji가 먼저 있어야 의미가 있다 → 한자 DB 구축은 병렬 가능, 연결 기능은 단어 시스템 이후.
- **사진 OCR(24~27장)은 AI 단어 분석 파이프라인을 재사용**한다(OCR로 추출한 텍스트를 9장과 동일한 AI 분석기에 통과시킴) → AI 단어 분석 기능이 먼저 있어야 OCR 파이프라인이 의미가 있다.
- **AI 취약점 분석·문제비율조절(35~37장)은 ReviewHistory 데이터가 충분히 쌓여야** 의미 있는 분석이 가능하다 → 반드시 퀴즈/SRS 이후 단계.
- **게임화 EXP(56장)는 모든 학습 액션(단어학습/복습/문장만들기/한자학습/오늘의학습완료)에 hook**되므로, 그 액션들이 먼저 구현되어 있어야 EXP 지급 지점을 연결할 수 있다 → 게임화는 1차 학습 루프 이후.
- **AI 회화(46~47장)는 "오늘 배운 단어" 목록이 있어야** "오늘 단어 사용 미션"을 만들 수 있다 → 오늘의 학습 기능 이후.
- **이미지 단어카드/AI 이미지생성(40~42장)은 Vocabulary + Image 테이블**을 재사용 → 단어 시스템 이후, AI 기능과는 독립적으로 나중에 붙여도 됨.

### A.13 핵심 기능 vs 부가 기능 정리

| 구분 | 기능 |
|---|---|
| 핵심(없으면 서비스가 성립하지 않음) | 회원/인증, 단어 CRUD, AI 단어 분석, SRS, 학습카드, 퀴즈, 오답노트, 기본 통계, 상용한자 DB |
| 중요 차별화(있어야 "이 서비스다운" 서비스가 됨) | 사진 OCR 단어장, 한자↔단어 연결, 게임화(EXP/레벨/스트릭/업적), AI 취약점 분석 |
| 부가(경험을 풍부하게 함) | AI 표현 비교, 자연어 검색, 이미지/상황 이미지, AI 회화, 자동 학습 계획, 주간 리포트 |
| 선택적으로 추가하면 좋음(계획서도 "확장"으로 명시) | 한자 획순/따라쓰기, 음성 학습/발음 평가, 브라우저 확장, PWA/앱, 친구/커뮤니티 |

---

## B. 구현 전 결정해야 할 사항

계획서에 값이 없어 실제 구현을 시작하려면 반드시 정해야 하는 항목이다. 아래 항목들은 **2026-08-21 사용자 확인을 거쳐 확정**되었으며, 이 로드맵 및 각 PROMPT는 이 확정값을 기준으로 작성되어 있다(F 섹션의 관련 PROMPT도 이 결정을 반영해 함께 수정됨).

| 항목 | 확정값 | 비고 |
|---|---|---|
| Frontend 프레임워크 | Next.js(React) + TypeScript | SSR/SEO, 모바일 대응, 생태계 고려 |
| 상태관리 | 서버상태: TanStack Query / 클라이언트상태: Zustand | 계획서 미지정, 로드맵 기본값 유지 |
| 스타일링 | Tailwind CSS + 자체 디자인 토큰 | D 섹션에서 토큰 확정 |
| Backend | Next.js Route Handlers(API) 단일 스택으로 시작 | 별도 백엔드 서버 분리는 트래픽 증가 시 재검토 |
| DB | PostgreSQL + Prisma ORM | 관계형 데이터(단어-한자-태그 다대다)가 많아 RDB 적합 |
| 인증 방식 | 이메일/비밀번호 + **구글 소셜 로그인** | ✅ **확정(사용자 결정)**: 카카오 등 추가 제공자는 넣지 않는다. PROMPT 07에서 정식 구현 |
| AI(LLM) 제공자 | **Claude API** (Structured Output/JSON 스키마 활용) | ✅ **확정(사용자 결정)**. PROMPT 13 AI Orchestration 모듈 전체가 이 제공자 기준 |
| OCR 제공자 | **Google Cloud Vision** | ✅ **확정(사용자 결정)**. PROMPT 29에서 이 제공자로 연동 |
| 이미지 저장소 | S3 호환 오브젝트 스토리지(Cloudflare R2 등) | 계획서 미지정, 로드맵 기본값 유지 |
| AI 이미지 생성(계획서 42장) | **채택하지 않음** — 상황 설명 텍스트(PROMPT 46)로 대체 | ✅ **확정(사용자 결정)**: PROMPT 47은 로드맵에서 제외(스킵)로 표시 |
| TTS/STT(음성학습/발음평가) | 계획서 그대로 **Phase 12(PROMPT 54~55, 고급 확장)**에서 진행 | ✅ **확정(사용자 결정)**: 순서 변경 없음 |
| 상용한자 2,136자 데이터 | **서비스 출시 시 1회 전량 시딩되는 고정 내장 데이터**, 관리자/사용자 추가·수정 기능 없음 | ✅ **확정(사용자 결정)**. PROMPT 33/A.9 참고 |
| 배포 환경 | **Vercel(Frontend) + 관리형 Postgres**(Neon/Supabase 등) | ✅ **확정(사용자 결정)**. PROMPT 61에서 적용 |
| 모바일 하단 탭 구성 | **4개로 압축: 홈 / 단어장 / 한자 / MY** — AI학습은 홈 화면에 통합, 통계는 MY 하위 메뉴로 이동. 데스크탑 사이드바는 계획서 59장 6개 메뉴 그대로 유지 | ✅ **확정(사용자 결정)**. D.3/PROMPT 04에 반영 |
| 유료화/결제 여부 | **없음(완전 무료)** | ✅ **확정(사용자 결정)**: 결제 관련 Phase를 추가하지 않는다 |
| Level 계산식 | EXP 누적 기반 로그형 성장 곡선(`50 × n`) | 계획서 미지정, 로드맵이 새로 정의(Phase 7에서 실사용해보며 수치만 조정 가능) |
| Daily/Weekly Quest 목록 | "오늘의 학습" 항목을 Daily Quest로 매핑(Weekly는 미도입) | 계획서 미지정, 로드맵이 새로 정의 |

### 선택적으로 추가하면 좋은 기능 (계획서에 없지만 제안)

- 다크모드(게임형 UI와 궁합이 좋음, 야간 학습 사용성)
- 학습 알림(리마인더 푸시/이메일) — 계획서엔 없으나 SRS 서비스 특성상 이탈 방지에 효과적
- 관리자 대시보드(A.9 참고, 최소 범위)

---

## C. 전체 시스템 구조

### C.1 아키텍처 개요

```text
[Client: Next.js(React) Web App, 반응형/PWA 대응]
        │  REST(or Route Handler) JSON API, 공통 응답 규격
        ▼
[Server: Next.js Route Handlers]
   ├─ Auth 모듈 (세션/JWT 발급·검증)
   ├─ Vocabulary/Kanji CRUD 모듈
   ├─ SRS 엔진 (복습일 계산)
   ├─ Quiz 엔진 (문제 생성/채점)
   ├─ Gamification 엔진 (EXP/Level/Quest/Streak/Achievement)
   ├─ AI Orchestration 모듈 ── LLM API (단어분석/예문/첨삭/취약점분석/회화/기억법 등)
   ├─ OCR 모듈 ── OCR API (사진 → 텍스트) → AI Orchestration 재사용
   ├─ Media 모듈 ── Object Storage(이미지) / TTS API(음성)
   └─ Stats/Report 모듈 (통계 집계, 주간 리포트)
        │
        ▼
[PostgreSQL] User / VocabularyBook / Vocabulary / Kanji / UserVocabulary /
             ReviewHistory / Tag / Image / AIAnalysis / Gamification 테이블군
```

### C.2 계층별 책임

- **Frontend**: 화면 렌더링, 디자인 시스템 기반 공통 컴포넌트 사용, 서버 상태는 TanStack Query로 캐싱, 클라이언트 전용 상태(모달/토스트/온보딩 진행 등)는 Zustand.
- **Backend**: 모든 비즈니스 로직(SRS 계산, EXP 계산, 오답 집계)은 서버에서만 수행하고 클라이언트는 결과만 표시한다 — 클라이언트에서 SRS/EXP를 재계산하지 않는다(치팅 방지, 일관성 보장).
- **AI Orchestration 모듈**은 모든 LLM 호출을 한곳에서 관리한다: 프롬프트 템플릿, Structured Output(JSON Schema) 검증, 실패 시 재시도(retry) 정책, 타임아웃, 캐싱 키 규칙을 이 모듈에서 표준화하고, 개별 기능(단어분석/예문생성/첨삭/취약점분석/회화 등)은 이 모듈을 통해서만 LLM을 호출한다. **AI가 반환한 값은 항상 사용자 입력과 동일한 수준으로 검증한 뒤 저장한다.**
- **OCR 모듈**은 이미지 → 텍스트 추출까지만 담당하고, 추출된 텍스트를 단어 후보로 분리·정제하는 것은 AI Orchestration 모듈에 위임한다(파이프라인 재사용).
- **Gamification 엔진**은 학습 액션 이벤트(단어학습완료/퀴즈정답/문장만들기완료/한자학습완료/오늘의학습완료)를 구독하여 EXP 지급 → Level 재계산 → Quest 진행도 갱신 → Streak 갱신 → Achievement 조건 체크를 한 트랜잭션 안에서 처리한다.

### C.3 데이터 모델 (전체 ERD 초안 — 최종 기능까지 고려, 단 필요 이상으로 미리 만들지 않음)

계획서 60장의 테이블을 그대로 유지하고, 게임화·한자·AI 파이프라인에 필요한 최소 테이블만 추가한다. **테이블은 각 기능이 실제로 구현되는 Phase에서 마이그레이션하지만, 컬럼명/관계는 지금 확정한다.**

```text
User(id, email, password_hash, nickname, jlpt_level, target_jlpt,
     daily_word_target, daily_study_time, purpose[], created_at)

VocabularyBook(id, user_id, name, description, is_public, created_at)

Vocabulary(id, word, reading, part_of_speech, jlpt_level, difficulty, created_at)
VocabularyMeaning(id, vocabulary_id, meaning)
ExampleSentence(id, vocabulary_id, japanese, korean, source)
Image(id, vocabulary_id, image_url, image_type)  # image_type: object|situation|ai_generated

Kanji(id, character, onyomi[], kunyomi[], korean_reading, meaning,
      stroke_count, radical, school_grade, jlpt_level_ref)
VocabularyKanji(vocabulary_id, kanji_id)

VocabularyBookItem(vocabulary_book_id, vocabulary_id)   # 단어의 다중 단어장 소속(8장)
UserVocabulary(user_id, vocabulary_id, learning_status, is_favorite,
               last_reviewed_at, next_review_at, interval_stage,
               correct_count, wrong_count)
UserKanji(user_id, kanji_id, learning_status, last_reviewed_at,
          next_review_at, correct_count, wrong_count)   # 한자용 UserVocabulary 대응 테이블

ReviewHistory(id, user_id, target_type[vocab|kanji], target_id, quiz_type,
              result, response_time, reviewed_at)

Tag(id, user_id, name)
VocabularyTag(vocabulary_id, tag_id)

AIAnalysis(id, user_id, analysis_type, input_ref, result_json,
           status[pending|confirmed|edited], created_at)

# 게임화 (계획서에 스키마 없음 — 이 문서에서 확정)
UserGameProfile(user_id, level, exp, current_streak, longest_streak, last_studied_date)
Quest(id, type[daily|weekly], code, title, target_count, exp_reward)
UserQuestProgress(user_id, quest_id, date_or_week_key, current_count, is_completed)
Achievement(id, code, category[word|kanji|streak], title, condition_value)
UserAchievement(user_id, achievement_id, unlocked_at)
```

### C.4 외부 연동 지점

| 연동 | 트리거 | 데이터 흐름 |
|---|---|---|
| LLM API | 단어 등록, OCR 후처리, 예문/첨삭/취약점분석/회화/기억법/자연어검색 | 서버 → LLM → JSON Schema 검증 → AIAnalysis 저장 → 사용자 확인 후 실 데이터 테이블 반영 |
| OCR API | 사진 단어장 업로드 | 서버 → OCR → 텍스트 → AI Orchestration(단어분리) → AIAnalysis(pending) |
| Object Storage | 이미지 업로드/AI 이미지 생성 결과 저장 | 서버 → Storage 업로드 → URL을 Image 테이블에 저장 |
| TTS API(확장) | 학습카드/퀴즈 음성 재생 | 서버가 사전 생성 후 캐싱 또는 클라이언트 요청 시 생성 |

---

## D. 디자인 방향

### D.1 컨셉

**"학습 서비스 + RPG/수집형 게임 + 현대적인 웹 UI"**. 유치한 어린이용 게임 톤은 피하고, 성인 학습자가 사용해도 어색하지 않은 "성장/수집" 메타포를 사용한다. 게임 요소는 다음 화면에 우선 배치하고, 그 외 화면(설정, 목록, 상세 정보 등)은 정보 밀도를 우선하는 절제된 스타일을 유지한다.

- 게임 연출 우선 화면: 오늘의 학습 홈, 학습 결과 화면, 레벨업/EXP 획득, 한자·단어 수집 현황, 업적/뱃지, 학습 캘린더/스트릭
- 정보 우선 화면: 단어 상세, 단어장 목록, 검색, 설정/MY, 통계 표, 오답노트 표

### D.2 디자인 시스템 토큰 (Phase 1에서 실제 구현, 이후 변경 금지)

| 토큰 | 값 |
|---|---|
| Primary | `#5B5FEF` (인디고 — 메인 브랜드/버튼/포커스) |
| Secondary | `#14B8A6` (틸 — 보조 강조, 한자 영역 포인트로 사용 가능) |
| Accent | `#F59E0B` (골드/앰버 — EXP, 레벨업, 보상, 업적 강조 전용) |
| Background (Light) | `#F8FAFC` / (Dark) `#0B1220` |
| Surface (Light) | `#FFFFFF` / (Dark) `#151B2C` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Error | `#EF4444` |
| Text Primary (Light) | `#0F172A` / (Dark) `#F1F5F9` |
| Text Secondary | `#64748B` (Dark: `#94A3B8`) |
| Font | 한국어/UI: **Pretendard**, 일본어 본문: **Noto Sans JP** (fallback 체인 구성) |
| Font Size Scale | 12 / 14 / 16(base) / 18 / 20 / 24 / 30 / 36 / 48 px |
| Font Weight | 400(본문) / 500(강조) / 600(제목) / 700(주요 지표) / 800(레벨업·EXP 강조 전용) |
| Border Radius | sm 4 / md 8 / lg 12 / xl 16 / 2xl 24 / full 9999 (카드류는 lg~xl 기본) |
| Shadow | sm / md / lg / **glow**(Accent 색상 발광, 레벨업·보상 연출 전용) |
| Spacing Scale | 4px 배수: 4/8/12/16/20/24/32/40/48/64 |
| Breakpoint | sm 640 / md 768 / lg 1024 / xl 1280 |
| Icon | Lucide (outline 스타일, 라인 두께 통일) |
| Animation | 기본 트랜지션 150–250ms ease-out, 보상 연출은 400–600ms 이내로 절제 |

### D.3 컴포넌트 변형(Variant) 규칙

- **Button**: `primary / secondary / ghost / outline / danger` × 크기 `sm/md/lg`, 그리고 "퀘스트 시작" 등 핵심 CTA 전용 `quest`(pill 형태 + 은은한 shadow) 변형.
- **Card**: `default / elevated / quest / achievement(locked/unlocked)`. locked 상태는 그레이스케일 + 잠금 아이콘, unlocked는 Accent 테두리.
- **Badge**: 상태 뱃지(NEW/LEARNING/REVIEW/WEAK/MASTERED — 각각 고정 색상 매핑), JLPT 뱃지(N5~N1 난이도 그라데이션), 레벨 뱃지(원형+숫자).
- **Progress**: 선형 바(EXP 바) + 원형 링(오늘의 학습 진행도, 한자 학습률).
- **Modal**: 데스크탑 중앙 모달 / 모바일 하단 시트(bottom sheet)로 반응형 전환.
- **Navigation**: 데스크탑 좌측 사이드바(59장 메뉴 구조 6개 그대로: HOME/단어장/한자/AI학습/통계/MY) / 모바일 하단 탭바는 **4개로 압축(홈/단어장/한자/MY)** — AI학습(문장만들기/표현비교/AI회화/단어찾기)은 홈 화면 내 섹션으로, 통계는 MY 하위 메뉴로 흡수(✅ 확정, B 섹션 참고).

### D.4 게임화 UI 요소 매핑 (계획서 요소 → 실제 컴포넌트)

| 계획서 요소 | 컴포넌트 |
|---|---|
| 오늘의 퀘스트 수행 | Daily Quest Card 목록 (홈 상단) |
| 경험치 획득 | EXP Bar + 토스트형 "+EXP" 획득 애니메이션 |
| 연속 학습 기록 | Streak Flame Indicator + 학습 캘린더 |
| 단어/한자 수집 | Collection Grid (수집률 %, 미획득은 실루엣) |
| 학습 진행도 | Progress Ring (오늘의 학습 진행도, 한자 학습률) |
| 복습 미션화 | Mission Card (오늘의 학습 리스트 항목) |
| 성취감 | 학습 완료 화면(요약 + 오늘 획득 EXP + 완료 애니메이션) |
| 레벨업 | Level Badge 갱신 + glow 애니메이션 |

**원칙**: 단어 상세, 검색 결과, 설정 화면처럼 "빠르게 정보를 찾는" 화면에는 게임 연출을 넣지 않는다. 학습 흐름(오늘의 학습→카드→퀴즈→완료)에서만 게임 연출을 적용한다.


## E. 전체 개발 로드맵

아래 Phase 순서는 계획서의 버전 구조(1차/1.5차/2차/확장)를 유지하되, A.12의 의존성 분석에 따라 실제 구현 가능한 단위로 재배열한 것이다. 각 Phase는 여러 PROMPT로 세분화되며, PROMPT 번호는 F 섹션과 1:1로 대응한다.

### Phase 0. 프로젝트 초기화 & 공통 규칙 확정
목적: 이후 모든 단계가 지킬 폴더 구조·네이밍·API 응답 규격을 한 번에 확정한다.
- PROMPT 01 — 기술 스택 확정 & 프로젝트 스캐폴딩
- PROMPT 02 — 공통 타입/유틸/API 응답 규격 & 에러 처리 규칙

### Phase 1. 디자인 시스템 (게임형 학습 UI, 이후 변경 금지)
목적: D 섹션에서 정의한 토큰과 컴포넌트를 실제 코드로 구현한다. 이후 모든 화면은 이 컴포넌트만 재사용한다.
- PROMPT 03 — 디자인 토큰 & 전역 스타일
- PROMPT 04 — 공통 UI 컴포넌트 (Button/Card/Input/Modal/Badge/Toast/Tooltip/Navigation)
- PROMPT 05 — 게임화 UI 컴포넌트 (EXP Bar/Level Badge/Streak/Quest Card/Achievement/Progress Ring/Collection Grid)

### Phase 2. DB 기반 & 인증
목적: 1차 버전에 필요한 최소 테이블을 만들고, 회원가입/로그인/온보딩까지 완성한다.
- PROMPT 06 — DB/ORM 설정 & 1차 버전 핵심 테이블 마이그레이션
- PROMPT 07 — 회원가입/로그인
- PROMPT 08 — 온보딩(학습 설정 마법사)

### Phase 3. 단어장 & 단어 CRUD (AI 이전, 수동 입력)
목적: AI 없이도 단어 저장이 성립하는 기본 CRUD를 먼저 완성한다(A.12 의존성 분석 근거).
- PROMPT 09 — 개인 단어장(VocabularyBook) CRUD
- PROMPT 10 — 단어 수동 등록/목록/상세 페이지
- PROMPT 11 — 즐겨찾기 & 태그
- PROMPT 12 — 통합 검색

### Phase 4. AI 단어 분석 (AI 기능 최초 분리 단계)
목적: AI Orchestration 모듈을 구축하고 단어 등록 흐름에 연결한다.
- PROMPT 13 — AI 단어 분석 API (Prompt/Schema/검증/재시도/캐싱)
- PROMPT 14 — AI 분석 결과 확인·수정 UI 연동
- PROMPT 15 — AI 예문 생성(상황별)

### Phase 5. 간격반복(SRS) · 오늘의 학습 · 학습카드
목적: 복습 스케줄 엔진과 이를 보여주는 홈 화면, 플래시카드 UI를 완성한다.
- PROMPT 16 — SRS 엔진(복습 스케줄 계산)
- PROMPT 17 — 오늘의 학습 홈 페이지
- PROMPT 18 — 학습 카드(플래시카드) UI + 평가 연동

### Phase 6. 퀴즈 · 오답노트 · 기본 통계 (1차 버전 마무리)
목적: 계획서 17~22장 기능을 완성하여 "1차 버전"을 종료한다.
- PROMPT 19 — 퀴즈 엔진(문제 유형별 로직)
- PROMPT 20 — 퀴즈 UI + ReviewHistory 기록 연동
- PROMPT 21 — 오답노트
- PROMPT 22 — 기본 통계 대시보드
- PROMPT 23 — [체크포인트] 1차 버전 통합 점검 & 회귀 테스트

### Phase 7. 게임화 시스템
목적: 1차 학습 루프에서 발생하는 이벤트에 EXP/레벨/퀘스트/스트릭/업적을 연결한다(A.12 근거로 학습 루프 이후 배치).
- PROMPT 24 — 게임화 데이터 모델 & EXP/Level 엔진 연동
- PROMPT 25 — Daily Quest 시스템
- PROMPT 26 — Streak & 학습 캘린더
- PROMPT 27 — 업적/뱃지 시스템

### Phase 8. 사진 OCR 단어장 (1.5차 버전 시작)
목적: AI 분석 파이프라인을 재사용하여 사진 → 단어장 자동 등록 흐름을 완성한다.
- PROMPT 28 — 사진 업로드 & 이미지 검증
- PROMPT 29 — OCR 연동(텍스트 추출)
- PROMPT 30 — AI 단어 분리 + 정보 자동 생성(일괄 처리)
- PROMPT 31 — OCR 결과 검수 UI
- PROMPT 32 — 중복 단어 검사 & 최종 등록

### Phase 9. 상용한자 2,136자 시스템
목적: 정적 한자 DB를 구축하고 단어 시스템과 연결한다.
- PROMPT 33 — 한자 DB 구축 & 마이그레이션
- PROMPT 34 — 한자 상세 페이지 + 한자↔단어 연결
- PROMPT 35 — 한자 학습률 & 레벨별 분류
- PROMPT 36 — 한자 퀴즈 + 한자 업적 연동
- PROMPT 37 — [체크포인트] 1.5차 버전 통합 점검

### Phase 10. AI 개인화 분석 (2차 버전)
목적: ReviewHistory 누적 데이터를 기반으로 개인화 분석 기능을 구현한다(A.12 근거로 퀴즈/SRS 이후 배치).
- PROMPT 38 — AI 취약점 분석
- PROMPT 39 — 문제 비율 자동 조절
- PROMPT 40 — 취약 한자 분석
- PROMPT 41 — 유사 표현 AI 비교
- PROMPT 42 — AI 자연어 단어 검색
- PROMPT 43 — AI 자동 학습 계획
- PROMPT 44 — 주간/월간 AI 리포트

### Phase 11. 이미지 & AI 회화 학습
목적: 시각 자료와 실전 회화로 학습 경험을 확장한다.
- PROMPT 45 — 이미지 단어 카드
- PROMPT 46 — 상황 이미지 학습
- PROMPT 47 — [스킵됨] AI 기억 이미지 생성(✅ 사용자 확정으로 미채택, 상황 설명 텍스트로 대체)
- PROMPT 48 — 한자 기억법 AI 생성
- PROMPT 49 — AI 회화 + 오늘 단어 사용 미션
- PROMPT 50 — 카메라 사물 단어장 / 여행 사진 단어장
- PROMPT 51 — [체크포인트] 2차 버전 통합 점검

### Phase 12. 고급 확장 (계획서가 명시적으로 "향후 확장"으로 표시한 선택 기능)
- PROMPT 52 — 한자 획순 애니메이션
- PROMPT 53 — 한자 따라쓰기
- PROMPT 54 — 음성 학습(TTS)
- PROMPT 55 — 발음 평가(STT, 확장)
- PROMPT 56 — PWA 전환
- PROMPT 57 — 브라우저 확장 프로그램
- PROMPT 58 — 친구 기능 / 단어장 공유 / 커뮤니티 단어장

### Phase 13. 최적화 · 테스트 · 배포
- PROMPT 59 — 반응형/모바일 UX 최종 점검 & 성능 최적화
- PROMPT 60 — 통합 테스트 & QA
- PROMPT 61 — 배포(CI/CD, 환경 분리, 모니터링)

---

## F. 단계별 실행 프롬프트

아래 프롬프트를 **PROMPT 01부터 순서대로** 그대로 복사하여 AI 코딩 도구에 전달하세요. 각 프롬프트는 이전 프롬프트들의 결과물이 이미 존재한다고 가정하고 작성되었습니다. 모든 프롬프트에는 다음 공통 원칙이 내재되어 있습니다: *기존 폴더 구조·네이밍·API 응답 규격·디자인 시스템·DB 테이블/컬럼명을 임의로 변경하지 않는다. 이번 단계에서 요구되지 않은 기존 기능은 삭제하거나 동작을 변경하지 않는다. 기존 컴포넌트/타입/API가 있다면 재사용하고 중복 생성하지 않는다. 새 라이브러리는 꼭 필요한 경우에만, 기존 스택과 충돌하지 않을 때 추가한다.*


### PROMPT 01 — 기술 스택 확정 & 프로젝트 스캐폴딩

**목적**: kotoba-loop 프로젝트의 기술 스택을 확정하고, 이후 모든 개발의 기반이 되는 프로젝트 골격을 생성한다.

**현재 프로젝트 상태**: 아무 코드도 없는 빈 상태(계획서 분석만 완료됨).

**구현 범위**:
- Next.js(React) + TypeScript 프로젝트 초기화
- 폴더 구조 확정 및 생성: `app/`(라우트), `components/`(공통 UI), `components/game/`(게임화 UI), `lib/`(유틸/서버 로직), `lib/api/`(API 클라이언트), `types/`(공통 타입), `prisma/`(스키마, Phase 2에서 채움), `styles/`(전역 스타일)
- ESLint + Prettier 설정, import 정렬 규칙
- 환경변수 구조 설계: `.env.example` 파일에 향후 필요한 키(DATABASE_URL, AUTH_SECRET, LLM_API_KEY, OCR_API_KEY, STORAGE_* 등)를 주석과 함께 미리 나열(값은 비워둠)
- README에 "폴더 구조/네이밍 규칙/커밋 전 체크리스트" 문서화

**구현하지 않을 범위**: 실제 화면, DB 연결, 인증, 어떤 비즈니스 로직도 구현하지 않는다. 오직 골격만 만든다.

**기술적 요구사항**:
- Frontend: Next.js(App Router) + TypeScript + Tailwind CSS
- 상태 관리: TanStack Query, Zustand는 설치만 하고 실사용은 이후 단계
- Backend: Next.js Route Handlers를 사용할 것을 전제로 `app/api/` 디렉터리 생성
- Validation: `zod`를 설치하고 이후 모든 API 입력 검증에 표준으로 사용할 것을 README에 명시

**UI/UX 요구사항**: 이번 단계에는 없음(디자인 시스템은 Phase 1에서 시작).

**기존 코드와의 연결**: 없음(최초 단계).

**완료 조건**:
- [ ] `npm run dev`로 빈 페이지가 정상 구동된다
- [ ] `npm run build`가 에러 없이 성공한다
- [ ] `npm run lint`가 에러 없이 성공한다
- [ ] 폴더 구조/네이밍 규칙이 README에 문서화되어 있다

**테스트 항목**: 빌드 성공 여부, Type Error 여부, Lint Error 여부. (아직 런타임 기능이 없으므로 그 외 테스트는 해당 없음)

---

### PROMPT 02 — 공통 타입/유틸/API 응답 규격 & 에러 처리 규칙

**목적**: 프로젝트 전체가 끝까지 지킬 API 응답 형식과 에러 처리 표준을 확정한다. 이후 모든 API는 이 규격을 따른다.

**현재 프로젝트 상태**: PROMPT 01의 프로젝트 골격이 존재하며, 화면/DB/기능은 아직 없다.

**구현 범위**:
- 공통 API 응답 타입 정의: 성공 시 `{ success: true, data: T }`, 실패 시 `{ success: false, error: { code: string, message: string } }` 형태로 고정
- 공통 에러 코드 체계 정의(예: `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `AI_TIMEOUT`, `EXTERNAL_API_ERROR`, `INTERNAL_ERROR`)
- API Route Handler에서 사용할 공통 에러 핸들링 래퍼 함수(try/catch → 표준 응답 변환) 구현
- 프론트엔드에서 사용할 공통 fetch 클라이언트(`lib/api/client.ts`) 구현: 응답 규격 파싱, 에러 시 throw, 로딩/에러 상태를 TanStack Query와 연동할 수 있는 형태
- 공통 타입 파일(`types/`)에 `ApiResponse<T>`, `PaginationParams`, `PaginatedResponse<T>` 등 전역에서 재사용할 타입 정의
- 날짜/시간 유틸(타임존 처리 포함, 복습일 계산에 사용될 예정이므로 KST 기준 명시)

**구현하지 않을 범위**: 실제 도메인 API(단어, 사용자 등)는 아직 만들지 않는다. 오직 규격과 예시용 헬스체크 API(`/api/health`) 하나만 이 규격으로 구현하여 검증한다.

**기술적 요구사항**:
- Backend: Next.js Route Handlers, zod로 요청 검증
- Error Handling: 모든 API가 위 표준 에러 포맷을 따르도록 공통 wrapper 강제
- 상태 관리: TanStack Query의 queryFn/mutationFn이 공통 client를 사용하도록 구성

**UI/UX 요구사항**: 없음.

**기존 코드와의 연결**: PROMPT 01에서 만든 폴더 구조(`lib/`, `types/`, `app/api/`)를 그대로 사용한다.

**완료 조건**:
- [ ] `/api/health` 호출 시 표준 성공 응답이 반환된다
- [ ] 의도적으로 잘못된 요청을 보내면 표준 에러 응답이 반환된다
- [ ] 프론트엔드 공통 client를 통해 두 경우 모두 정상적으로 파싱된다

**테스트 항목**: 정상 응답 파싱, 실패 응답 파싱, 네트워크 타임아웃 시 클라이언트 동작, 빌드/타입/린트 에러 여부.

---

### PROMPT 03 — 디자인 토큰 & 전역 스타일

**목적**: D 섹션에서 확정한 디자인 시스템 토큰(색상/타이포/spacing/radius/shadow/breakpoint)을 실제 Tailwind 설정과 CSS 변수로 구현한다. 이후 모든 화면은 이 토큰만 사용하고 임의의 색상값/px값을 하드코딩하지 않는다.

**현재 프로젝트 상태**: PROMPT 01~02까지 완료. 화면 컴포넌트는 아직 없다.

**구현 범위**:
- Tailwind 설정에 Primary(#5B5FEF)/Secondary(#14B8A6)/Accent(#F59E0B)/Background/Surface/Success/Warning/Error/Text 색상 토큰 등록(Light/Dark 모두)
- 다크모드 지원 설정(class 전략) — B섹션 "선택적으로 추가하면 좋은 기능"에 따라 초기부터 다크모드 변수 구조는 만들어두되, 실제 다크모드 토글 UI는 이후 단계에서 추가 가능
- 폰트 연결: Pretendard(한국어/UI), Noto Sans JP(일본어 본문) — fallback 체인 포함, 폰트 크기 스케일(12~48px) 및 weight(400/500/600/700/800) 토큰화
- Border Radius(sm~2xl~full), Shadow(sm/md/lg/glow), Spacing(4px 배수), Breakpoint(sm/md/lg/xl) 토큰화
- 전역 CSS 리셋 및 기본 타이포그래피 스타일 적용
- 토큰을 시각적으로 확인할 수 있는 임시 스타일 가이드 페이지(`/dev/style-guide`, 배포 시 노출되지 않도록 처리) 생성

**구현하지 않을 범위**: 실제 버튼/카드 등 재사용 컴포넌트는 PROMPT 04에서 만든다. 이번 단계는 토큰/전역 스타일까지만.

**기술적 요구사항**:
- Frontend: Tailwind CSS 설정 파일(`tailwind.config`)에 theme.extend로 토큰 등록
- 성능: 폰트는 `next/font`로 최적화 로드

**UI/UX 요구사항**: 스타일 가이드 페이지에서 모든 색상 스와치, 타이포 스케일, radius, shadow, spacing 예시를 한눈에 확인할 수 있어야 한다.

**기존 코드와의 연결**: PROMPT 01의 `styles/` 폴더와 Tailwind 설정을 그대로 확장한다.

**완료 조건**:
- [ ] 스타일 가이드 페이지에서 모든 토큰이 시각적으로 정상 렌더링된다
- [ ] 다크모드 전환 시 색상 토큰이 올바르게 스위칭된다
- [ ] 일본어 텍스트(예: 見逃す)와 한국어 텍스트가 각각 지정된 폰트로 렌더링된다

**테스트 항목**: 빌드/타입/린트 에러 여부, 모바일/태블릿/데스크탑 반응형에서 스타일 가이드 레이아웃 깨짐 여부, 다크모드 토글 시 대비(contrast) 확인.

---

### PROMPT 04 — 공통 UI 컴포넌트 라이브러리

**목적**: D.3에서 정의한 공통 컴포넌트(Button, Card, Input, Modal, Badge, Toast, Tooltip, Navigation, ProgressBar)를 구현한다. 이후 모든 화면은 이 컴포넌트를 재사용하고 임의로 새로운 버튼/카드 스타일을 만들지 않는다.

**현재 프로젝트 상태**: PROMPT 03까지 완료되어 디자인 토큰이 존재한다.

**구현 범위**:
- Button: variant(`primary/secondary/ghost/outline/danger/quest`) × size(`sm/md/lg`), loading/disabled 상태 포함
- Card: variant(`default/elevated/quest/achievement`), achievement는 locked/unlocked 상태 prop 지원
- Input(text/number/select/textarea): 라벨, 에러 메시지, 도움말 텍스트, focus ring 스타일 통일
- Modal: 데스크탑 중앙 모달 / 모바일 하단 시트로 자동 반응형 전환, ESC/배경클릭 닫기
- Badge: 상태 뱃지(NEW/LEARNING/REVIEW/WEAK/MASTERED 색상 매핑), JLPT 뱃지(N5~N1)
- Toast(알림 메시지, success/error/info)
- Tooltip
- ProgressBar(선형)
- Navigation: 데스크탑 좌측 사이드바(59장 메뉴 6개: HOME/단어장/한자/AI학습/통계/MY) + 모바일 하단 탭바(✅ 확정 4개: 홈/단어장/한자/MY, AI학습은 홈 화면 섹션으로, 통계는 MY 하위 메뉴로 흡수) 골격을 구현. 실제 페이지 연결은 각 기능 구현 시점에 채움 — 지금은 메뉴 항목과 아이콘, 활성 상태 스타일만 구현

**구현하지 않을 범위**: 게임화 전용 컴포넌트(EXP Bar, Level Badge, Streak, Quest Card, Progress Ring, Collection Grid)는 PROMPT 05에서 별도로 구현한다.

**기술적 요구사항**:
- Frontend: 모든 컴포넌트는 TypeScript로 props 타입을 명시하고 `components/ui/`에 위치
- 접근성: 키보드 포커스, aria-label 기본 지원
- Icon: Lucide 아이콘 사용

**UI/UX 요구사항**: PROMPT 03의 토큰만 사용하며 컴포넌트 내부에 하드코딩된 색상/px 값이 없어야 한다.

**기존 코드와의 연결**: PROMPT 03의 디자인 토큰(Tailwind 클래스, CSS 변수)을 그대로 사용한다.

**완료 조건**:
- [ ] 스타일 가이드 페이지에 모든 컴포넌트의 variant/state 예시가 추가되어 있다
- [ ] 모바일 너비에서 Modal이 하단 시트로 정상 전환된다
- [ ] 다크모드에서 모든 컴포넌트가 정상적으로 보인다

**테스트 항목**: 각 컴포넌트의 disabled/loading/error 상태, 키보드 접근성, 반응형 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 05 — 게임화 UI 컴포넌트 라이브러리

**목적**: D.4에서 매핑한 게임화 전용 컴포넌트를 구현한다. 이 시점에는 실제 데이터가 없으므로 목(mock) 데이터로 컴포넌트만 완성한다.

**현재 프로젝트 상태**: PROMPT 04까지 완료되어 공통 UI 컴포넌트가 존재한다.

**구현 범위**:
- EXP Bar(선형 progress + 현재 EXP/다음 레벨까지 필요한 EXP 텍스트)
- Level Badge(원형 + 레벨 숫자, 레벨업 시 glow 애니메이션 variant 포함)
- Streak Indicator(연속 학습일 수, 불꽃 아이콘 강도 단계별 표현)
- Quest Card(제목, 진행도 바, 목표/현재값, 완료 시 체크 상태)
- Achievement Badge(locked/unlocked, 카테고리별 아이콘)
- Progress Ring(원형 진행률 — 오늘의 학습 진행도, 한자 학습률 등 재사용 가능하도록 값/라벨을 prop으로 받음)
- Collection Grid(수집 아이템 그리드, 미보유 항목은 실루엣 처리)
- EXP 획득 토스트 애니메이션("+3 EXP" 형태로 잠깐 나타났다 사라짐)

**구현하지 않을 범위**: 실제 EXP/레벨/퀘스트 데이터 연동 로직(Phase 7에서 구현). 지금은 mock props로 스토리만 완성한다.

**기술적 요구사항**:
- Frontend: `components/game/`에 위치, 모든 컴포넌트는 순수 프레젠테이션(데이터 fetching 없음)
- Animation: 150~600ms 이내, CSS transition 또는 경량 애니메이션 라이브러리(신규 라이브러리 추가 전 Tailwind transition으로 구현 가능한지 먼저 검토)

**UI/UX 요구사항**: D.1 원칙에 따라 과장되지 않은 절제된 게임 연출을 유지한다(유치한 스타일 금지, Accent 컬러의 glow는 보상 순간에만 사용).

**기존 코드와의 연결**: PROMPT 03~04의 토큰 및 공통 컴포넌트(Card, Badge, ProgressBar 등)를 내부적으로 재사용한다.

**완료 조건**:
- [ ] 스타일 가이드 페이지에 모든 게임화 컴포넌트의 mock 예시가 추가되어 있다
- [ ] locked/unlocked, 진행 중/완료 등 각 상태가 시각적으로 명확히 구분된다
- [ ] 모바일에서도 레이아웃이 깨지지 않는다

**테스트 항목**: mock 데이터 극단값(0%, 100%, 초과값) 렌더링, 반응형, 다크모드, 빌드/타입/린트 에러.

---

### PROMPT 06 — DB/ORM 설정 & 1차 버전 핵심 테이블 마이그레이션

**목적**: PostgreSQL + Prisma를 연결하고, C.3 ERD 중 1차 버전(회원/단어/복습)에 필요한 테이블만 실제로 마이그레이션한다.

**현재 프로젝트 상태**: PROMPT 01~05까지 완료(프로젝트 골격 + 디자인 시스템). DB는 아직 연결되지 않았다.

**구현 범위**:
- Prisma 초기화 및 PostgreSQL 연결 설정(`.env`의 `DATABASE_URL` 사용)
- C.3 ERD 중 다음 테이블만 마이그레이션: `User, VocabularyBook, VocabularyBookItem, Vocabulary, VocabularyMeaning, ExampleSentence, Image, UserVocabulary, ReviewHistory, Tag, VocabularyTag, AIAnalysis`
- 각 테이블의 컬럼명은 C.3에 정의된 그대로 사용(향후 Phase에서 임의 변경 금지)
- Seed 스크립트 골격 생성(테스트용 더미 데이터 1~2건, 실제 대량 시딩은 아님)
- Prisma Client를 서버에서만 사용하도록 `lib/db.ts` 싱글턴 구성

**구현하지 않을 범위**: `Kanji, VocabularyKanji, UserKanji`(Phase 9), 게임화 테이블(`UserGameProfile` 등, Phase 7)은 아직 만들지 않는다. 화면/기능도 구현하지 않는다.

**기술적 요구사항**:
- Database: PostgreSQL, Prisma ORM, 마이그레이션 파일은 버전 관리됨
- 보안: DB 접속 정보는 반드시 환경변수로만 관리하고 코드에 하드코딩하지 않는다

**UI/UX 요구사항**: 없음.

**기존 코드와의 연결**: PROMPT 02의 공통 응답 규격을 사용하는 `/api/health/db`(DB 연결 확인용) 엔드포인트를 하나 추가하여 검증한다.

**완료 조건**:
- [ ] `prisma migrate dev`가 에러 없이 성공한다
- [ ] `/api/health/db` 호출 시 DB 연결 정상 응답이 온다
- [ ] Seed 스크립트 실행 후 데이터가 정상 삽입된다

**테스트 항목**: 마이그레이션 성공 여부, 잘못된 DATABASE_URL일 때 에러 처리, 빌드/타입 에러.


### PROMPT 07 — 회원가입/로그인 (이메일 + 구글 소셜 로그인)

**목적**: 이메일/비밀번호 기반 회원가입·로그인과, ✅ 확정된 구글 소셜 로그인을 함께 구현하여 인증된 사용자만 이후 기능을 사용할 수 있도록 한다.

**현재 프로젝트 상태**: PROMPT 06까지 완료(DB 연결, `User` 테이블 존재). 인증은 아직 없다.

**구현 범위**:
- 회원가입 폼(닉네임/이메일/비밀번호) — 계획서 6장 항목 중 인증에 필요한 최소 필드만 우선 처리하고, jlpt_level/target_jlpt/daily_word_target/daily_study_time/purpose는 PROMPT 08(온보딩)에서 채운다
- 비밀번호 해싱(bcrypt 등) 및 안전한 저장
- **구글 소셜 로그인**(OAuth) 연동 — Auth.js의 Google Provider 활용 권장, 최초 구글 로그인 시 `User` 레코드를 자동 생성(닉네임은 구글 프로필 이름으로 기본값 설정 후 온보딩에서 수정 가능)하고 이후에도 동일 이메일로 재로그인 시 같은 계정으로 연결
- 로그인 폼 및 세션 발급(JWT 또는 세션 쿠키 — 이메일 로그인과 구글 로그인 모두 동일한 세션 체계 사용), 로그인 유지(refresh) 처리
- 로그아웃
- 인증 미들웨어: 로그인하지 않은 사용자가 보호된 라우트에 접근 시 로그인 페이지로 리다이렉트
- 로그인/회원가입 화면에 "이메일로 계속하기"와 "Google로 계속하기" 두 가지 진입점을 함께 제공

**구현하지 않을 범위**: 온보딩 마법사(PROMPT 08), 비밀번호 재설정 이메일 발송(계획서 미언급, 필요 시 별도 결정), 구글 외 다른 소셜 로그인 제공자(카카오 등 — ✅ 확정: 추가하지 않음).

**기술적 요구사항**:
- Authentication: Auth.js(NextAuth) 권장 — Credentials Provider(이메일/비밀번호) + Google Provider를 함께 구성, httpOnly 쿠키 세션 사용
- Validation: zod로 이메일 형식/비밀번호 최소 길이 검증
- Error Handling: 이메일 중복, 잘못된 비밀번호, 존재하지 않는 계정, 구글 인증 실패/취소 각각 명확한 에러 메시지(PROMPT 02 표준 에러 포맷 사용)
- Security: 비밀번호 평문 저장 금지, 무차별 대입 방지를 위한 최소한의 rate limit 고려(간단한 수준), 구글 OAuth 클라이언트 ID/시크릿은 환경변수로만 관리

**UI/UX 요구사항**: PROMPT 04의 Input/Button/Toast 컴포넌트를 재사용하여 회원가입/로그인 폼을 구성한다. 새로운 폼 스타일을 만들지 않는다.

**기존 코드와의 연결**: PROMPT 02 API 클라이언트, PROMPT 04 UI 컴포넌트, PROMPT 06 `User` 테이블을 재사용한다.

**완료 조건**:
- [ ] 신규 이메일로 회원가입이 성공하고 자동 로그인된다
- [ ] 중복 이메일 가입 시도 시 명확한 에러가 표시된다
- [ ] 구글 로그인으로 신규/기존 사용자 모두 정상적으로 로그인된다
- [ ] 로그인/로그아웃이 정상 동작한다
- [ ] 비로그인 상태로 보호된 페이지 접근 시 로그인 페이지로 이동한다

**테스트 항목**: 정상 가입/로그인(이메일), 구글 로그인 신규 가입, 구글 로그인 기존 계정 재로그인, 구글 인증 취소/실패, 중복 이메일, 잘못된 비밀번호, 빈 값 제출, 세션 만료 시 동작, 새로고침 후 로그인 상태 유지 여부, 모바일 화면에서 폼 사용성.

---

### PROMPT 08 — 온보딩(학습 설정 마법사)

**목적**: 계획서 7장의 최초 학습 설정(현재 JLPT 수준/목표/하루 단어 수/하루 학습 시간/학습 목적)을 가입 직후 입력받는다.

**현재 프로젝트 상태**: PROMPT 07까지 완료되어 회원가입 직후 로그인된 상태다.

**구현 범위**:
- 다단계(step) 온보딩 UI: ①일본어 수준(입문~N1) ②JLPT 목표 ③하루 새 단어 수(5/10/15/20/직접입력) ④하루 목표 학습 시간(10/20/30/60분) ⑤학습 목적(다중 선택: JLPT/취업/유학/여행/회화/애니·드라마/독해/자기계발)
- 온보딩 완료 시 `User` 테이블의 `jlpt_level, target_jlpt, daily_word_target, daily_study_time, purpose` 갱신
- 온보딩을 건너뛴 미완료 사용자를 위한 처리(예: 기본값 적용 후 MY 설정에서 나중에 수정 가능하도록 안내) — 계획서에 강제 여부가 명시되어 있지 않으므로 **건너뛰기 허용 + 기본값 적용**을 기본 정책으로 채택(추측한 내용, 필요 시 사용자가 변경 가능)
- 온보딩 값은 MY > 학습 목표 화면(추후 Phase에서 화면 구현)에서 재수정 가능하도록 API를 설계해둔다(이번 단계에서는 API만 재사용 가능하게 만들고 별도 설정 화면은 만들지 않음)

**구현하지 않을 범위**: 이 설정값을 실제 추천 문제 난이도에 반영하는 로직(AI 취약점 분석/자동 학습 계획 Phase에서 사용). 지금은 저장까지만.

**기술적 요구사항**:
- Frontend: 다단계 폼 상태는 Zustand로 관리(단계 이동 시 값 유지)
- Validation: 각 단계 필수값 검증
- API: `PATCH /api/users/me/onboarding`

**UI/UX 요구사항**: 게임형 온보딩 톤(진행 단계 표시를 Progress Ring/Step Indicator로) — 단, 과한 연출 없이 명확한 정보 입력에 집중한다(D.1 원칙: 정보 입력 화면은 절제).

**기존 코드와의 연결**: PROMPT 04 UI 컴포넌트, PROMPT 05 Progress Ring, PROMPT 07 인증 세션을 재사용한다.

**완료 조건**:
- [ ] 온보딩 5단계를 모두 완료하면 User 레코드에 값이 저장된다
- [ ] 건너뛰기 시 기본값이 적용되고 서비스 이용이 막히지 않는다
- [ ] 새로고침해도 이전 입력한 단계 값이 유지된다(마지막 단계 이전 이탈 시)

**테스트 항목**: 각 단계 필수값 누락 시 다음 단계 진행 차단, 중간 이탈 후 재접속 시 처리, 모바일 단계 이동 UX, 빌드/타입/린트 에러.

---

### PROMPT 09 — 개인 단어장(VocabularyBook) CRUD

**목적**: 계획서 8장의 "여러 개의 개인 단어장" 기능을 구현한다.

**현재 프로젝트 상태**: PROMPT 08까지 완료(인증+온보딩). 단어장/단어 관련 화면은 아직 없다.

**구현 범위**:
- 단어장 목록 페이지(이름/설명/생성일/단어 개수/학습 완료 개수/공개 여부 표시)
- 단어장 생성/수정/삭제 모달(PROMPT 04 Modal 재사용)
- 단어장 상세 진입 시 해당 단어장에 속한 단어 목록 표시(단어 자체는 PROMPT 10에서 구현되므로 이번 단계에서는 목록 컴포넌트 자리만 마련하고 빈 상태 UI를 완성)
- 단어 개수/학습 완료 개수는 실시간 계산(집계 쿼리)
- 공개 여부(is_public) 토글 — 실제 "공개 단어장 열람" 기능은 계획서에 상세 정의가 없으므로 **이 단계에서는 플래그 저장까지만** 하고 공개 열람 화면은 범위 밖(Phase 12 커뮤니티 단어장에서 재검토)

**구현하지 않을 범위**: 단어 등록/상세(PROMPT 10), 단어의 다중 단어장 소속 UI(단어 등록 시 함께 처리, PROMPT 10에서), 공개 단어장 열람.

**기술적 요구사항**:
- API: `GET/POST /api/vocabulary-books`, `PATCH/DELETE /api/vocabulary-books/:id`
- Validation: 이름 필수, 길이 제한
- Error Handling: 삭제 시 소속 단어가 있는 경우 확인 모달(단어 자체를 삭제하지 않고 단어장 소속만 해제한다는 점을 명확히 안내)

**UI/UX 요구사항**: Card 컴포넌트(D.3)로 단어장 목록을 표시, 빈 상태(단어장 없음)는 게임형 톤의 안내 일러스트/문구로 CTA 유도.

**기존 코드와의 연결**: PROMPT 04 Card/Modal/Button, PROMPT 06 `VocabularyBook`/`VocabularyBookItem` 테이블, PROMPT 07 인증 세션(본인 단어장만 조회/수정 가능하도록 소유권 검증).

**완료 조건**:
- [ ] 단어장 생성/수정/삭제가 정상 동작한다
- [ ] 다른 사용자의 단어장에 접근/수정 시도 시 차단된다
- [ ] 빈 단어장 목록 상태가 정상적으로 안내된다

**테스트 항목**: 이름 미입력 생성 시도, 타 사용자 단어장 접근, 삭제 확인 플로우, 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 10 — 단어 수동 등록 / 목록 / 상세 페이지

**목적**: AI 없이 사용자가 직접 모든 필드를 입력하여 단어를 저장할 수 있는 기본 CRUD를 완성한다(A.12 근거: AI는 단어 CRUD의 필수 선행조건이 아니다).

**현재 프로젝트 상태**: PROMPT 09까지 완료(단어장 CRUD 존재). Vocabulary 관련 화면은 없다.

**구현 범위**:
- 단어 수동 등록 폼: 단어/후리가나/품사/JLPT 난이도/뜻(복수 가능)/예문(일본어+한국어, 복수 가능), 등록 시 하나 이상의 단어장에 연결(다중 선택 가능 — 8장 "한 단어를 여러 단어장에 동시에 포함")
- 단어 목록 페이지(단어장별 필터, 학습 상태별 필터 자리 마련 — 상태값 자체는 PROMPT 16 SRS 단계에서 채워짐, 지금은 기본값 `NEW`로 저장)
- 단어 상세 페이지(계획서 10장 레이아웃: 후리가나/뜻/품사/JLPT/학습 상태/마지막 학습/다음 복습/예문/관련 표현) — 학습 상태/마지막 학습/다음 복습 값은 PROMPT 16 이전이므로 임시로 `NEW`/`-`/`-` 표시
- 단어 수정/삭제

**구현하지 않을 범위**: AI 자동 분석 버튼(PROMPT 13~14), 즐겨찾기/태그(PROMPT 11), 검색(PROMPT 12), 관련 한자 연결(Phase 9).

**기술적 요구사항**:
- API: `GET/POST /api/vocabularies`, `GET/PATCH/DELETE /api/vocabularies/:id`
- Database: `Vocabulary, VocabularyMeaning, ExampleSentence, VocabularyBookItem, UserVocabulary`(등록 시 `UserVocabulary` 레코드를 `learning_status=NEW`로 함께 생성)
- Validation: 단어/뜻 최소 1개 이상 필수

**UI/UX 요구사항**: 계획서 14장(플래시카드)과 겹치지 않도록, 상세 페이지는 "정보 우선" 톤(D.1)으로 구성한다. 학습 상태는 D.3 상태 뱃지로 표시.

**기존 코드와의 연결**: PROMPT 04 Input/Badge/Card, PROMPT 06 `Vocabulary`군 테이블, PROMPT 09 단어장 선택 UI.

**완료 조건**:
- [ ] 단어 등록/수정/삭제가 정상 동작하고 다중 단어장 연결이 저장된다
- [ ] 단어 상세 페이지가 계획서 10장 정보 구조와 일치한다
- [ ] 단어장 상세(PROMPT 09)에서 방금 등록한 단어가 목록에 나타난다

**테스트 항목**: 필수값 누락, 다중 단어장 선택/해제, 단어 삭제 시 연관 데이터(예문/뜻) 정리 여부, 빈 목록 상태, 모바일 폼 사용성, 빌드/타입/린트 에러.

---

### PROMPT 11 — 즐겨찾기 & 태그

**목적**: 계획서 11~12장의 즐겨찾기와 태그 기능을 구현한다.

**현재 프로젝트 상태**: PROMPT 10까지 완료(단어 CRUD 존재).

**구현 범위**:
- 단어 상세/목록에서 즐겨찾기 토글(`UserVocabulary.is_favorite`)
- 즐겨찾기만 모아보는 필터/목록
- 태그 생성/삭제(사용자별 태그, `Tag` 테이블), 단어에 여러 태그 지정/해제(`VocabularyTag`)
- 태그 기준 필터링(단어 목록에서 태그 선택 시 해당 태그가 달린 단어만 표시)

**구현하지 않을 범위**: 태그를 활용한 학습(태그 기준 학습 세션 구성)은 계획서에 "검색 및 학습할 수 있다"고만 되어 있고 구체 화면 정의가 없어 이번 단계에서는 필터링까지만 구현하고, 태그 기반 학습 세션 구성은 Phase 5(오늘의 학습) 이후 필요 시 재검토(→ **추가 결정 필요**로 표시).

**기술적 요구사항**:
- API: `POST/DELETE /api/vocabularies/:id/favorite`, `GET/POST/DELETE /api/tags`, `POST/DELETE /api/vocabularies/:id/tags`
- Validation: 태그 이름 중복 방지(사용자 범위 내)

**UI/UX 요구사항**: 즐겨찾기는 별(★) 아이콘 토글(계획서 예시와 동일한 메타포), 태그는 Badge 컴포넌트로 표시하고 `#` 접두사 유지.

**기존 코드와의 연결**: PROMPT 04 Badge, PROMPT 10 단어 상세/목록 페이지에 UI를 통합한다(새 페이지를 만들지 않고 기존 페이지를 확장).

**완료 조건**:
- [ ] 즐겨찾기 토글이 즉시 반영되고 새로고침 후에도 유지된다
- [ ] 태그 생성/삭제/할당/해제가 정상 동작한다
- [ ] 태그/즐겨찾기 필터가 단어 목록에 정확히 반영된다

**테스트 항목**: 동일 태그 중복 생성 시도, 태그 0개 상태, 즐겨찾기 대량 토글 시 목록 갱신, 모바일 UX, 빌드/타입/린트 에러.

---

### PROMPT 12 — 통합 검색

**목적**: 계획서 21장의 검색 기능(일본어/후리가나/한국어/한자/태그/JLPT/품사 기준)을 구현한다.

**현재 프로젝트 상태**: PROMPT 11까지 완료(단어/태그/즐겨찾기 존재). 한자 데이터는 아직 없다(Phase 9 예정).

**구현 범위**:
- 검색 입력창(전역 네비게이션에 위치, PROMPT 04 Navigation 확장)
- 검색 대상: 단어(word)/후리가나(reading)/뜻(meaning)/태그/JLPT/품사 — 한자 검색은 Kanji 테이블이 생기는 Phase 9 이후 결과에 포함되도록 검색 로직을 미리 확장 가능한 구조로 설계(지금은 한자 결과 없이 동작)
- 검색 결과 페이지(단어 카드 목록, 일치 항목 하이라이트)
- 최근 검색어 로컬 저장(선택 사항, 간단 수준)

**구현하지 않을 범위**: 한자 검색 결과 실제 연동(Phase 9), AI 자연어 검색(Phase 10, 완전히 다른 기능이므로 혼동하지 않는다).

**기술적 요구사항**:
- API: `GET /api/search?q=`, DB 인덱스(단어/후리가나/뜻 컬럼에 검색 인덱스 고려)
- Validation: 빈 검색어 처리, 특수문자 이스케이프

**UI/UX 요구사항**: 검색 결과 없음 상태를 게임형 톤이 아닌 명확한 안내 문구로 처리(D.1: 정보 화면은 절제).

**기존 코드와의 연결**: PROMPT 10 단어 카드 UI, PROMPT 04 Navigation/Input.

**완료 조건**:
- [ ] 일본어/후리가나/한국어/태그/JLPT/품사 각 기준으로 정확한 결과가 반환된다
- [ ] 결과 없음 상태가 정상 표시된다
- [ ] 모바일에서 검색 UX가 정상 동작한다

**테스트 항목**: 빈 검색어, 특수문자 입력, 대소문자/전각·반각 처리, 결과 0건, 결과 다건 페이지네이션, 빌드/타입/린트 에러.

---

### PROMPT 13 — AI 단어 분석 API (AI Orchestration 모듈)

**목적**: C.2에서 정의한 AI Orchestration 모듈을 처음으로 구축하고, 계획서 9장의 단어 자동 분석 기능(후리가나/품사/뜻/JLPT/관련한자/예문/유의어/관련표현 생성)을 API로 구현한다. 이 단계는 **UI 없이 API와 검증 로직만** 완성한다(지침 8: AI 기능은 일반 CRUD와 분리 개발).

**현재 프로젝트 상태**: PROMPT 12까지 완료(단어 수동 CRUD, 검색 존재). AI 연동은 전혀 없다.

**구현 범위**:
- LLM API(Claude API) 연동 클라이언트(`lib/ai/`)
- 단어 분석 Prompt 템플릿 설계: 입력(일본어 단어 1개) → 출력(후리가나/품사/뜻 배열/JLPT 추정/관련 한자 배열/예문 1개 이상/유의어/관련 표현)
- Structured Output(JSON Schema) 정의 및 응답 파싱, zod로 스키마 검증(AI가 스키마를 어기면 재시도)
- 실패 처리: 타임아웃/스키마 검증 실패 시 최대 N회 재시도 후 명확한 에러 반환(사용자에게 "AI 분석 실패, 직접 입력해주세요" 형태로 폴백 가능하게)
- 결과 캐싱: 동일 단어에 대한 중복 AI 호출 방지(예: 이미 분석된 단어는 캐시된 `AIAnalysis` 결과 재사용)
- `AIAnalysis` 테이블에 요청/결과/상태(pending) 저장
- 비용/토큰 사용량 로깅(추후 모니터링을 위한 최소 로그)

**구현하지 않을 범위**: 분석 결과를 실제 `Vocabulary`에 확정 저장하는 것(사용자 확인 UI, PROMPT 14), 예문 생성 별도 기능(PROMPT 15, 이번엔 분석에 포함된 예문 1개만).

**기술적 요구사항**:
- AI: Claude API, Structured Output/JSON Schema, Retry(exponential backoff), Timeout 설정
- Validation: AI 응답을 zod 스키마로 검증 후에만 신뢰(외부 입력과 동일하게 취급 — instructions 8 원칙)
- Error Handling: `AI_TIMEOUT`, `AI_SCHEMA_INVALID` 등 전용 에러 코드(PROMPT 02 규격 확장)

**UI/UX 요구사항**: 없음(API 전용 단계).

**기존 코드와의 연결**: PROMPT 02 에러 포맷, PROMPT 06 `AIAnalysis` 테이블, PROMPT 10 `Vocabulary` 스키마(출력 필드가 이 스키마와 일치해야 함).

**완료 조건**:
- [ ] `見逃す` 등 샘플 단어로 API를 호출하면 계획서 9장 예시와 유사한 구조의 JSON이 반환된다
- [ ] 스키마를 벗어난 응답은 자동 재시도되고, 최종 실패 시 명확한 에러가 반환된다
- [ ] 동일 단어 재요청 시 캐시된 결과가 반환되어 중복 API 비용이 발생하지 않는다

**테스트 항목**: 정상 단어, 존재하지 않는/의미없는 문자열 입력, API 타임아웃 시뮬레이션, 스키마 위반 응답 처리, 캐시 히트/미스, 동시 다중 요청(중복 방지) 처리.

---

### PROMPT 14 — AI 분석 결과 확인·수정 UI 연동

**목적**: 계획서 9장 "AI 분석 → 사용자 확인 → 수정 가능 → 저장" 흐름을 단어 등록 폼(PROMPT 10)에 연결한다.

**현재 프로젝트 상태**: PROMPT 13까지 완료(AI 분석 API 존재, UI 미연동). 단어 등록은 여전히 수동 입력만 가능하다.

**구현 범위**:
- 단어 등록 폼에 "AI로 자동 분석" 버튼 추가(단어 입력 후 클릭 시 PROMPT 13 API 호출)
- 분석 중 로딩 상태(스켈레톤 또는 스피너, 예상 소요 시간 안내)
- 분석 결과를 폼 필드에 자동 채움(후리가나/품사/뜻/JLPT/예문/유의어/관련 한자 후보) — **필드는 여전히 수정 가능한 입력 상태**를 유지(자동완성일 뿐 확정 저장 아님)
- 사용자가 수정 후 "저장" 클릭 시에만 실제 `Vocabulary` 테이블에 반영, 이때 `AIAnalysis.status`를 `confirmed` 또는 `edited`로 갱신
- AI 실패 시 폴백: 에러 토스트 표시 후 수동 입력 모드로 자연스럽게 전환(서비스가 막히지 않음)
- 관련 한자 후보는 이 시점엔 `Kanji` 테이블이 없으므로(Phase 9 예정) 텍스트로만 표시하고 실제 연결은 Phase 9에서 소급 처리(→ 설계에 명시)

**구현하지 않을 범위**: 관련 한자 실제 DB 연결(Phase 9), 예문 상황별 재생성(PROMPT 15).

**기술적 요구사항**:
- Frontend: TanStack Query mutation으로 AI 호출 상태(loading/error/success) 관리
- Error Handling: 실패 시 폴백 메시지, 재시도 버튼 제공

**UI/UX 요구사항**: AI 분석 중임을 나타내는 은은한 로딩 연출(과하지 않게), 분석 완료 시 필드가 채워지는 것을 시각적으로 구분(예: 채워진 필드에 옅은 하이라이트, "AI가 채운 값" 표시 후 사용자가 수정하면 하이라이트 제거).

**기존 코드와의 연결**: PROMPT 10 단어 등록 폼을 그대로 확장(새 폼을 만들지 않는다), PROMPT 13 AI API.

**완료 조건**:
- [ ] AI 분석 버튼 클릭 → 필드 자동 채움 → 수정 → 저장까지 전체 흐름이 동작한다
- [ ] AI 실패 시에도 수동 저장이 가능하다
- [ ] AIAnalysis 상태가 저장 시점에 정확히 갱신된다

**테스트 항목**: AI 성공/실패/타임아웃 각 시나리오, 자동 채움 후 미수정 저장, 자동 채움 후 일부 수정 저장, 중복 클릭 방지, 모바일에서 로딩 UX, 빌드/타입/린트 에러.

---

### PROMPT 15 — AI 예문 생성(상황별)

**목적**: 계획서 19장의 상황별 예문 생성 기능(일상회화/비즈니스/JLPT/친구와 대화/학교/여행)을 단어 상세 페이지에 추가한다.

**현재 프로젝트 상태**: PROMPT 14까지 완료(AI 분석이 등록 흐름에 연결됨). 단어 상세에는 아직 예문 재생성 기능이 없다.

**구현 범위**:
- 단어 상세 페이지에 "AI 예문 생성" 버튼 + 상황 선택(6종) UI
- 선택한 상황에 맞는 예문(일본어+한국어)을 PROMPT 13 AI Orchestration 모듈 재사용하여 생성(새로운 AI 클라이언트를 만들지 않는다)
- 생성된 예문을 `ExampleSentence`에 추가 저장할지, 미리보기만 할지 사용자가 선택(저장 버튼 별도 제공)
- 동일 단어+상황 조합에 대한 캐싱(중복 요청 방지)

**구현하지 않을 범위**: 문장 만들기 연습(사용자가 직접 문장을 작성하고 AI가 첨삭하는 기능)은 계획서 20장으로 별도 기능이며 학습 루프(Phase 6 이후)에 포함되므로 여기서는 구현하지 않는다.

**기술적 요구사항**:
- AI: PROMPT 13 모듈 재사용, 상황별 프롬프트 변수만 다르게 구성
- API: `POST /api/vocabularies/:id/ai-example`

**UI/UX 요구사항**: 상황 선택은 Chip/Segmented Control 형태(D.3 컴포넌트 범위 내에서 Button 그룹으로 구현), AI 생성 결과는 카드로 표시 후 "추가하기" 액션 제공.

**기존 코드와의 연결**: PROMPT 10 단어 상세 페이지, PROMPT 13 AI 모듈, PROMPT 06 `ExampleSentence` 테이블.

**완료 조건**:
- [ ] 상황을 바꿔가며 예문을 생성하면 각각 다른 결과가 나온다
- [ ] "추가하기"를 누른 예문만 실제 저장된다
- [ ] AI 실패 시 명확한 에러와 재시도 옵션이 제공된다

**테스트 항목**: 각 상황별 생성, 동일 조합 재요청 캐시 확인, 저장/미저장 분기, 실패 처리, 모바일 UX, 빌드/타입/린트 에러.


### PROMPT 16 — SRS 엔진(간격반복 스케줄 계산)

**목적**: 계획서 15~16장의 간격 반복 로직(복습 간격, 평가별 처리, 학습 상태 전이)을 서버 로직으로 구현한다.

**현재 프로젝트 상태**: PROMPT 15까지 완료. `UserVocabulary`에 `learning_status/next_review_at` 컬럼은 있으나 실제 계산 로직은 없다(등록 시 NEW로만 세팅됨).

**구현 범위**:
- 복습 간격 테이블 구현: 첫 학습→1일→3일→7일→14일→30일→60일→90일(계획서 15장 그대로)
- 사용자 평가 4단계(모르겠음/헷갈림/기억남/쉬움)에 따른 처리 로직: 모르겠음→다음날 재출제(간격 초기화), 헷갈림→1~2일 후, 기억남→다음 단계로 진행, 쉬움→간격 크게 증가(단계 스킵 또는 배수 적용 — 구체 배수는 계획서에 값이 없어 **추가 결정 필요**, 기본값으로 "다음 단계보다 1단계 더 건너뜀"을 채택)
- 학습 상태(NEW/LEARNING/REVIEW/WEAK/MASTERED, 16장) 전이 규칙 구현: 예) 오답 누적 시 WEAK로 전이, 최고 간격(90일) 통과 시 MASTERED로 전이(전이 세부 임계값은 계획서 미명시 → 이 문서 기본값: 오답률 40% 이상 또는 최근 3회 중 2회 오답 시 WEAK, 90일 간격 통과 후 정답 시 MASTERED)
- 이 로직을 순수 함수(`lib/srs/`)로 분리하여 단위 테스트 가능하게 구현
- 아직 퀴즈 UI가 없으므로, 이번 단계는 내부 API(`POST /api/user-vocabulary/:id/review-result`)와 위 로직만 완성하고 임시 테스트 페이지(`/dev/srs-test`)에서 평가 버튼 4개를 눌러 결과를 확인할 수 있게 한다

**구현하지 않을 범위**: 실제 학습카드 UI(PROMPT 18), 퀴즈 UI(PROMPT 19~20), ReviewHistory 실제 기록(퀴즈 단계에서 함께 연결, 이번엔 SRS 계산 검증용 임시 호출까지만).

**기술적 요구사항**:
- Backend: 순수 함수 기반 SRS 계산 로직, 단위 테스트 작성 권장
- Database: `UserVocabulary` 갱신 트랜잭션

**UI/UX 요구사항**: 임시 테스트 페이지는 배포 시 노출되지 않도록 처리(PROMPT 03 style-guide와 동일한 `/dev/` 규칙).

**기존 코드와의 연결**: PROMPT 06 `UserVocabulary` 테이블, PROMPT 02 API 규격.

**완료 조건**:
- [ ] 4가지 평가 버튼 각각에 대해 `next_review_at`이 명세대로 계산된다
- [ ] 학습 상태 전이가 규칙대로 동작한다
- [ ] 동일 단어를 반복 평가해도 데이터 정합성이 깨지지 않는다

**테스트 항목**: 각 평가 단계별 계산 검증(단위 테스트), 최초 학습(NEW→LEARNING) 케이스, 최고 간격 도달 후 처리, 잘못된 vocabulary id 요청, 빌드/타입 에러.

---

### PROMPT 17 — 오늘의 학습 홈 페이지

**목적**: 계획서 13장의 "오늘의 학습" 요약 화면을 구현한다. 로그인 후 가장 먼저 보이는 화면이다.

**현재 프로젝트 상태**: PROMPT 16까지 완료(SRS 계산 로직 존재). 이를 보여주는 화면은 없다.

**구현 범위**:
- 오늘 학습해야 할 항목 집계 API: 새 단어(하루 목표 개수만큼 미학습 NEW 단어), 어제 복습, 3일/7일/14일 복습(각각 `next_review_at`이 오늘 이하인 단어), 오답 복습(WEAK 상태 또는 최근 오답)
- 각 카테고리별 개수와 총 학습 개수, 예상 소요 시간(단어당 평균 시간 추정치를 상수로 정의 — 계획서 예시처럼 "약 32분" 형태로 표시, 계산식은 이 문서에서 확정: 단어당 약 35초 가정) 표시
- "오늘 공부 시작" CTA 버튼 → 학습 세션 시작(다음 PROMPT의 학습카드로 이동)
- 학습할 항목이 0개일 때의 빈 상태(완료 축하 메시지, 게임형 톤 허용 — D.1상 학습 흐름 화면이므로)

**구현하지 않을 범위**: 실제 학습카드/퀴즈 진행 화면(PROMPT 18~20), 오늘의 한자(Phase 9 이후 연동).

**기술적 요구사항**:
- API: `GET /api/study/today-summary`
- Database: `UserVocabulary` 쿼리(사용자별 next_review_at, learning_status 기준 집계)

**UI/UX 요구사항**: 계획서 13장 레이아웃(카테고리별 개수 목록 + 총합 + 예상시간 + CTA)을 그대로 따르되 D.3 Card/Button 재사용. 이 화면은 게임 연출 우선 화면(D.1)이므로 오늘의 진행도를 Progress Ring(PROMPT 05)으로 함께 보여준다.

**기존 코드와의 연결**: PROMPT 05 Progress Ring, PROMPT 16 SRS 로직, PROMPT 04 Navigation(로그인 후 기본 진입 라우트로 연결).

**완료 조건**:
- [ ] 각 카테고리 개수가 실제 DB 상태와 정확히 일치한다
- [ ] 오늘 학습할 항목이 0개일 때 빈 상태가 정상 표시된다
- [ ] "오늘 공부 시작" 클릭 시 다음 단계로 정상 진입한다(다음 PROMPT 구현 전이라면 임시 placeholder 페이지로 연결)

**테스트 항목**: 신규 가입 직후(모든 항목 0), 다수 복습 항목 존재, 자정 경계(날짜 변경) 처리, 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 18 — 학습 카드(플래시카드) UI + 평가 연동

**목적**: 계획서 14장의 플래시카드 학습 화면을 구현하고 PROMPT 16의 SRS 로직과 연결한다.

**현재 프로젝트 상태**: PROMPT 17까지 완료(오늘의 학습 요약 및 시작 버튼 존재). 실제 카드 학습 화면은 없다.

**구현 범위**:
- 오늘의 학습 세션 큐 생성(PROMPT 17의 카테고리별 항목을 하나의 순서 있는 큐로 구성 — 새 단어 → 복습 순서, 구체 순서는 계획서 3.1 "기본 일일 학습 루틴"을 따름)
- 플래시카드 UI: 앞면(단어) → "뜻 보기" 클릭 → 뒷면(단어/후리가나/뜻/예문)
- 평가 버튼 4개(모르겠음/헷갈림/기억남/쉬움) → PROMPT 16 API 호출 → 다음 카드로 자동 이동
- 세션 진행률 표시(Progress Ring 또는 선형 바, 예: "12/56")
- 세션 중 이탈 시 이어하기(진행 상태를 세션 단위로 저장하거나, 간단히는 남은 큐를 클라이언트 상태로 유지 — 새로고침 시 처음부터인지 여부는 **추가 결정 필요**, 기본값으로 새로고침 시 오늘의 요약에서 다시 시작하도록 채택)

**구현하지 않을 범위**: 퀴즈(객관식/빈칸 등 다양한 문제 유형)는 PROMPT 19~20에서 별도로 구현한다. 이번 단계는 순수 플래시카드(뜻 확인형)만.

**기술적 요구사항**:
- Frontend: 카드 뒤집기 애니메이션(과하지 않게), 세션 큐는 Zustand로 관리
- API: PROMPT 16 review-result 엔드포인트 재사용(신규 API 불필요)

**UI/UX 요구사항**: 학습 흐름 화면이므로 정답 평가 시 짧은 피드백 애니메이션(D.1 게임 연출 허용 구간) 적용 가능. 모바일에서 스와이프 제스처는 선택 사항(있으면 좋지만 필수 아님 — **선택적으로 추가하면 좋은 기능**).

**기존 코드와의 연결**: PROMPT 17 오늘의 학습 큐, PROMPT 16 SRS API, PROMPT 04/05 컴포넌트.

**완료 조건**:
- [ ] 큐에 있는 모든 카드를 순서대로 학습할 수 있다
- [ ] 평가 버튼 클릭 시 SRS 데이터가 정확히 갱신된다
- [ ] 세션 완료 시 완료 화면(요약)으로 전환된다(EXP 등 게임화 수치는 Phase 7 이전이므로 아직 표시하지 않거나 0으로 표시)

**테스트 항목**: 카드 0개(빈 세션), 카드 1개, 다수 카드, 평가 버튼 연타 방지, 세션 중 새로고침, 모바일 터치 UX, 빌드/타입/린트 에러.

---

### PROMPT 19 — 퀴즈 엔진(문제 유형별 로직)

**목적**: 계획서 17장의 6가지 퀴즈 유형(일→한/한→일/후리가나/객관식/빈칸/예문해석)에 대한 문제 생성·채점 로직을 서버에 구현한다.

**현재 프로젝트 상태**: PROMPT 18까지 완료(플래시카드 학습 존재). 퀴즈 로직은 없다.

**구현 범위**:
- 문제 생성기(`lib/quiz/`): 대상 단어와 문제 유형을 입력받아 문제 데이터(질문, 정답, 객관식이면 오답 보기 3개 등) 생성
- 객관식 오답 보기는 같은 JLPT 레벨/품사의 다른 단어 뜻에서 무작위 추출(단어 풀이 부족할 경우의 처리 포함 — 최소 풀 크기 미달 시 해당 유형 제외하고 다른 유형으로 대체)
- 채점 로직(정답 비교, 후리가나/한국어 뜻은 정규화 후 비교 — 공백/전각반각 처리)
- 문제 유형 배분 로직의 기본값(1차 버전에서는 균등 랜덤 배분, 유형별 자동 조절은 Phase 10에서 고도화)
- 순수 함수로 분리하여 이후 Phase 10(문제 비율 자동 조절)에서 이 모듈을 재사용할 수 있는 구조로 설계

**구현하지 않을 범위**: 퀴즈 UI(PROMPT 20), ReviewHistory 저장(PROMPT 20에서 함께), 문제 비율 개인화 조절(Phase 10).

**기술적 요구사항**:
- Backend: 순수 함수 기반, 단위 테스트 권장
- Validation: 채점 시 사용자 입력 정규화(trim, 전각/반각, 히라가나-가타카나 처리 등)

**UI/UX 요구사항**: 없음(로직 전용).

**기존 코드와의 연결**: PROMPT 06 `Vocabulary`군 테이블, PROMPT 16 SRS 로직(퀴즈 결과가 SRS 평가로 매핑되어야 함 — 정답/오답을 "기억남/모르겠음" 등으로 매핑하는 규칙을 이 단계에서 정의: 정답=기억남 상당, 오답=모르겠음 상당, 구체 매핑은 **추가 결정 필요**로 문서화하고 기본값 채택).

**완료 조건**:
- [ ] 6가지 유형 모두 정상적으로 문제가 생성된다
- [ ] 채점 로직이 오탈자/공백 등 사소한 차이를 적절히 처리한다
- [ ] 문제 풀 부족 상황에서도 에러 없이 폴백된다

**테스트 항목**: 유형별 단위 테스트, 객관식 보기 부족 상황, 정답 정규화(공백/전각반각), 특수문자 포함 단어, 빌드/타입 에러.

---

### PROMPT 20 — 퀴즈 UI + ReviewHistory 기록 연동

**목적**: PROMPT 19의 퀴즈 엔진을 실제 화면으로 구현하고, 결과를 `ReviewHistory`에 기록하며 SRS(PROMPT 16)와 연결한다.

**현재 프로젝트 상태**: PROMPT 19까지 완료(퀴즈 로직 존재, UI 없음).

**구현 범위**:
- 퀴즈 화면(문제 표시 → 답안 입력/선택 → 제출 → 정답/오답 즉시 피드백 → 다음 문제)
- 유형별 입력 UI: 단답형(일→한/한→일/후리가나), 객관식(4지선다), 빈칸(단답 또는 선택), 예문 해석(단답 또는 서술형 — 채점은 키워드 매칭 수준으로 간단히, 완전한 자연어 채점은 범위 밖)
- 제출 시 `ReviewHistory` 기록(quiz_type/result/response_time) + PROMPT 16 SRS 갱신 API 호출을 하나의 트랜잭션 흐름으로 연결
- 퀴즈 세션 결과 요약 화면(정답 수/오답 수/정답률)
- 오늘의 학습(PROMPT 17)의 "학습 카드" 이후 단계로 자연스럽게 이어지도록 학습 흐름 라우팅 정리(계획서 3.1: 새 단어 학습 → 어제 복습 테스트 → 3/7/14일 복습 → 오답 재시험 → 문장 만들기)

**구현하지 않을 범위**: 문장 만들기 AI 첨삭(계획서 20장, Phase 4 AI 예문과 다른 기능 — **추가 결정 필요**: 이 기능을 정식 Phase로 넣을지, 별도 확인 후 Phase 6 이후 추가 배치 권장), 오답노트 화면(PROMPT 21).

**기술적 요구사항**:
- API: `POST /api/quiz/session`(문제셋 생성), `POST /api/quiz/submit`(채점+기록+SRS갱신)
- Error Handling: 제출 중 네트워크 실패 시 재시도/보존(답안 유실 방지)

**UI/UX 요구사항**: 정답/오답 피드백은 짧고 명확한 게임형 연출(초록/빨강 컬러 + 짧은 애니메이션), 과도한 지연 없이 즉시 다음 문제로 이동 가능하게.

**기존 코드와의 연결**: PROMPT 19 퀴즈 엔진, PROMPT 16 SRS API, PROMPT 06 `ReviewHistory` 테이블, PROMPT 04/05 UI 컴포넌트.

**완료 조건**:
- [ ] 6가지 유형 모두 화면에서 정상 풀이 가능하다
- [ ] 제출 시 ReviewHistory가 정확히 기록되고 SRS가 갱신된다
- [ ] 세션 종료 후 정답률 요약이 정확히 표시된다

**테스트 항목**: 각 유형별 정답/오답 제출, 빈 답안 제출, 제출 중 네트워크 오류, 세션 중 이탈 후 재진입, 모바일 입력 UX(특히 일본어 입력), 빌드/타입/린트 에러.

---

### PROMPT 21 — 오답노트

**목적**: 계획서 18장의 오답노트 기능을 구현한다.

**현재 프로젝트 상태**: PROMPT 20까지 완료(ReviewHistory 누적 시작). 오답을 모아보는 화면은 없다.

**구현 범위**:
- 단어별 오답 집계(총 문제 수/정답 수/오답 수/정답률/최근 오답 날짜) — `ReviewHistory` 집계 쿼리
- "이번 주 오답" 목록(오답 횟수 내림차순, 계획서 예시 형태)
- 오답노트에서 바로 재시험 시작(해당 단어들만으로 구성된 퀴즈 세션, PROMPT 19~20 엔진 재사용)
- 오답노트 진입 경로를 오늘의 학습(PROMPT 17) 흐름의 "오답 복습" 단계와 연결

**구현하지 않을 범위**: 없음(계획서 18장은 이 범위로 완결됨). AI 기반 취약점 원인 분석은 Phase 10.

**기술적 요구사항**:
- API: `GET /api/wrong-notes?period=week|all`
- Database: `ReviewHistory` 집계 인덱스 고려

**UI/UX 요구사항**: 상태 뱃지(WEAK)와 연동하여 목록에 시각적으로 강조.

**기존 코드와의 연결**: PROMPT 06 `ReviewHistory`, PROMPT 19~20 퀴즈 엔진/UI, PROMPT 04 Badge/Card.

**완료 조건**:
- [ ] 오답 통계가 실제 ReviewHistory와 정확히 일치한다
- [ ] 오답노트에서 재시험 시작이 정상 동작하고 결과가 다시 반영된다
- [ ] 오답이 없는 경우 빈 상태가 정상 표시된다

**테스트 항목**: 오답 0건, 대량 오답, 재시험 후 정답률 갱신 확인, 기간 필터(주간/전체), 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 22 — 기본 통계 대시보드

**목적**: 계획서 22장의 1차 버전 학습 통계를 구현한다.

**현재 프로젝트 상태**: PROMPT 21까지 완료(퀴즈/오답 데이터 누적 중).

**구현 범위**:
- 요약 카드: 총 등록 단어/학습 완료/학습 중/복습 필요/취약 단어(각 `UserVocabulary.learning_status` 기준 집계)
- 기간별 학습량: 오늘/이번 주/이번 달(학습 완료 건수, `ReviewHistory` 또는 학습 이벤트 로그 기준)
- 홈 또는 별도 통계 페이지(59장 메뉴 구조상 "통계 > 일간/주간/월간"에 해당하는 최소 버전 — 상세 캘린더는 Phase 7 Streak 단계에서 추가)

**구현하지 않을 범위**: 학습 캘린더 시각화(Phase 7), AI 기반 취약점 리포트(Phase 10 주간 리포트).

**기술적 요구사항**:
- API: `GET /api/stats/summary`
- Database: 집계 쿼리 성능 고려(필요 시 캐싱)

**UI/UX 요구사항**: 숫자 중심의 정보 화면(D.1 원칙: 통계는 정보 우선), 단 총 학습 단어 수 등 성장 지표는 Progress Ring/숫자 카운트업 애니메이션 정도는 허용.

**기존 코드와의 연결**: PROMPT 06 `UserVocabulary`/`ReviewHistory`, PROMPT 04 Card, PROMPT 05 Progress Ring(선택적 재사용).

**완료 조건**:
- [ ] 모든 통계 수치가 실제 데이터와 일치한다
- [ ] 데이터가 전혀 없는 신규 계정에서도 0으로 정상 표시된다

**테스트 항목**: 신규 계정(전부 0), 대량 데이터 성능, 날짜 경계(자정/월말) 처리, 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 23 — [체크포인트] 1차 버전(MVP) 통합 점검 & 회귀 테스트

**목적**: PROMPT 01~22까지 구현된 1차 버전 전체가 계획서 5~22장의 요구사항과 일치하는지, 그리고 서로 다른 단계에서 만든 기능들이 함께 정상 동작하는지 통합 검증한다. **새로운 기능을 추가하지 않는다.**

**현재 프로젝트 상태**: 회원가입~기본통계까지 1차 버전 전체 기능이 개별적으로는 구현되어 있으나 통합 회귀 테스트는 아직 수행되지 않았다.

**구현 범위**:
- 전체 사용자 흐름 End-to-End 점검: 회원가입 → 온보딩 → 단어 등록(수동+AI) → 단어장 관리 → 오늘의 학습 → 학습카드 → 퀴즈 → 오답노트 → 통계까지 끊김 없이 진행되는지 확인
- 발견된 버그 수정(단, 새 기능 추가는 금지 — 계획서 5~22장 범위 내 결함만 수정)
- 반응형 레이아웃 전수 점검(Desktop/Tablet/Mobile)
- 빈 데이터, 잘못된 입력, API 실패, 로딩/에러 상태 전 화면 점검
- 접근성 기본 점검(키보드 내비게이션, 대비)

**구현하지 않을 범위**: 게임화(Phase 7), OCR/한자(Phase 8~9) 등 이후 Phase의 어떤 기능도 이 단계에서 손대지 않는다.

**기술적 요구사항**: 없음(신규 기술 도입 없음), 기존 스택 내에서 버그 수정만 수행.

**UI/UX 요구사항**: 기존 디자인 시스템/컴포넌트를 벗어나는 임시방편 스타일 수정 금지 — 버그라면 컴포넌트 자체를 고친다.

**기존 코드와의 연결**: PROMPT 01~22 전체.

**완료 조건**:
- [ ] 전체 E2E 흐름이 에러 없이 완주된다
- [ ] `npm run build`, `npm run lint`, 타입체크가 모두 통과한다
- [ ] 반응형 3개 breakpoint에서 주요 화면이 깨지지 않는다
- [ ] 빈 데이터/실패 상태가 모든 화면에서 사용자에게 명확히 안내된다

**테스트 항목**: 신규 계정 전체 흐름, 기존 계정 재로그인 흐름, API 강제 실패 시 각 화면 반응, 느린 네트워크 시뮬레이션, 다양한 화면 크기, 다크모드 전환.


### PROMPT 24 — 게임화 데이터 모델 & EXP/Level 엔진 연동

**목적**: C.3에서 설계한 게임화 테이블을 마이그레이션하고, 1차 버전 학습 액션(단어학습/복습성공/문장만들기/한자학습/오늘의학습완료)에 EXP 지급 로직을 연결한다(계획서 56장 수치 그대로 사용).

**현재 프로젝트 상태**: 1차 버전 전체(PROMPT 01~23)가 완성되어 있다. 게임화 관련 테이블/로직은 없다.

**구현 범위**:
- `UserGameProfile(user_id, level, exp, current_streak, longest_streak, last_studied_date)` 마이그레이션
- EXP 지급 규칙 구현(계획서 56장): 단어 학습 +1, 복습 성공 +1, 문장 만들기 +3, 한자 학습 +2(Phase 9 이후 실제 연결), 오늘의 학습 완료 +10
- Level 계산식 확정 및 구현: **추가 결정 필요 항목을 이 문서에서 확정** — `필요 EXP(레벨 n→n+1) = 50 × n` (예: 1→2레벨 50EXP, 9→10레벨 450EXP)의 누적 합산 방식을 기본값으로 채택, 레벨업 시 초과분 EXP는 다음 레벨로 이월
- PROMPT 18(학습카드)/PROMPT 20(퀴즈 제출) 완료 시점에 EXP 지급 이벤트를 트랜잭션으로 연결(같은 요청 안에서 SRS 갱신 + ReviewHistory 기록 + EXP 지급이 함께 처리되도록 기존 API를 확장 — 새 API를 중복 생성하지 않는다)
- 오늘의 학습(PROMPT 17) "완료" 시점 판정 로직 구현(오늘 목표로 잡힌 모든 항목 완료 시 +10 EXP 1회 지급, 중복 지급 방지)
- Level Badge/EXP Bar(PROMPT 05 컴포넌트) 실제 데이터 연동 및 레벨업 시 glow 애니메이션 트리거

**구현하지 않을 범위**: Daily Quest(PROMPT 25), Streak(PROMPT 26), Achievement(PROMPT 27) — 이번 단계는 EXP/Level만.

**기술적 요구사항**:
- Database: `UserGameProfile` 마이그레이션, 기존 사용자에 대한 기본값 시딩(마이그레이션 스크립트)
- Backend: EXP 지급은 반드시 서버에서만 계산(클라이언트가 EXP 값을 직접 보내지 않음)
- Error Handling: 동시 다발적 EXP 지급 요청 시 race condition 방지(트랜잭션/락)

**UI/UX 요구사항**: EXP 획득 시 PROMPT 05의 토스트 애니메이션 사용, 레벨업 시 Level Badge glow 연출(과하지 않게 1회성으로).

**기존 코드와의 연결**: PROMPT 16 SRS API, PROMPT 20 퀴즈 제출 API, PROMPT 17 오늘의 학습 완료 판정, PROMPT 05 게임화 UI 컴포넌트 — 기존 API 엔드포인트를 확장하는 방식으로 구현하고 중복 API를 만들지 않는다.

**완료 조건**:
- [ ] 단어 학습/복습/문장만들기/오늘의학습완료 각 액션 시 정확한 EXP가 지급된다
- [ ] Level 계산이 확정된 공식대로 정확히 동작하고 레벨업 UI가 트리거된다
- [ ] 동일 액션에 대한 중복 EXP 지급이 발생하지 않는다

**테스트 항목**: 각 EXP 지급 시나리오, 레벨업 경계값(정확히 필요 EXP에 도달), 동시 요청 시 정합성, 오늘의 학습 완료 중복 판정 방지, 빌드/타입/린트 에러.

---

### PROMPT 25 — Daily Quest 시스템

**목적**: D.4/C.3에서 정의한 Daily Quest를 구현한다. "오늘의 학습" 항목을 퀘스트 형태로 표현하여 계획서 55장 "게임화 요소" 취지를 구체화한다.

**현재 프로젝트 상태**: PROMPT 24까지 완료(EXP/Level 동작). Quest 테이블/UI는 없다.

**구현 범위**:
- `Quest(id, type, code, title, target_count, exp_reward)`, `UserQuestProgress(user_id, quest_id, date_or_week_key, current_count, is_completed)` 마이그레이션
- 기본 Daily Quest 목록 확정(**추가 결정 필요 항목을 이 문서에서 확정**): "새 단어 N개 학습"(N=사용자 hariday_word_target), "복습 M개 완료", "오답 문제 재도전 1회 이상", "문장 만들기 1회 이상" — 각 완료 시 보상 EXP(예: 5 EXP)
- 매일 자정(KST) 기준 Daily Quest 진행도 초기화 로직
- 오늘의 학습(PROMPT 17) 화면 상단에 Quest Card(PROMPT 05) 목록 표시, 학습 액션 발생 시 실시간 진행도 갱신(PROMPT 24에서 확장한 API 응답에 quest 진행도 포함)
- 퀘스트 전체 완료 시 추가 보상(선택적, EXP 소량 보너스)

**구현하지 않을 범위**: Weekly Quest(계획서에 "Weekly Quest" 언급은 지침 7의 예시에만 있고 계획서 본문엔 없음 → **추측한 내용이므로 이번 단계에서는 제외**하고 Daily만 구현, 필요 시 별도 확인 후 추가), Streak/Achievement(다음 단계).

**기술적 요구사항**:
- Backend: 날짜 키(KST 기준 `YYYY-MM-DD`)로 UserQuestProgress를 구분, 자정 경계 처리
- Database: 사용자별 매일 Quest 인스턴스를 미리 생성할지 조회 시점에 생성할지 결정(제안: 조회 시점 lazy 생성)

**UI/UX 요구사항**: Quest Card 진행 바가 학습 액션 즉시 갱신되어야 하며, 완료 시 체크 애니메이션.

**기존 코드와의 연결**: PROMPT 05 Quest Card, PROMPT 17 오늘의 학습 페이지, PROMPT 24 EXP 지급 로직(퀘스트 보상도 동일 로직 재사용).

**완료 조건**:
- [ ] 하루 동안의 학습 액션이 정확히 퀘스트 진행도에 반영된다
- [ ] 자정이 지나면 퀘스트가 초기화된다
- [ ] 퀘스트 완료 시 보상 EXP가 정확히 1회 지급된다

**테스트 항목**: 자정 경계 테스트, 하루 목표량 변경 시 퀘스트 목표 재계산, 퀘스트 중복 완료 방지, 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 26 — Streak(연속 학습) & 학습 캘린더

**목적**: 계획서 54장의 연속 학습 기록과 학습 캘린더를 구현한다.

**현재 프로젝트 상태**: PROMPT 25까지 완료. `UserGameProfile`에 streak 컬럼은 있으나 갱신 로직/캘린더 UI는 없다.

**구현 범위**:
- "오늘의 학습 완료"(PROMPT 24의 +10 EXP 트리거 시점)를 기준으로 `current_streak` 증가, 하루라도 미학습 시 초기화 로직(자정 기준 배치 또는 조회 시점 계산 — lazy 계산 권장)
- `longest_streak` 갱신
- 학습 캘린더 UI(월 단위, 학습한 날짜에 🔥 표시, 계획서 54장 예시 형태)
- Streak Indicator(PROMPT 05)를 오늘의 학습 페이지/MY 페이지에 실제 데이터로 연동
- 스트릭이 끊길 위험(오늘 아직 미학습)에 대한 안내 문구(과도한 압박감을 주지 않는 톤으로)

**구현하지 않을 범위**: 스트릭 프리즈(보호권) 같은 부가 기능은 계획서에 없음 → **선택적으로 추가하면 좋은 기능**으로만 기록, 이번 단계에서 구현하지 않는다.

**기술적 요구사항**:
- Backend: 타임존(KST) 기준 "하루"의 경계를 명확히 정의하고 전 로직에서 일관되게 사용(PROMPT 02의 날짜 유틸 재사용)
- Database: 캘린더 조회를 위한 월별 학습일 집계 쿼리

**UI/UX 요구사항**: 캘린더는 정보 화면이지만 스트릭 자체는 성장 지표이므로 Streak Indicator에 한해 게임형 연출(불꽃 강도 단계) 허용.

**기존 코드와의 연결**: PROMPT 24 오늘의 학습 완료 판정, PROMPT 05 Streak Indicator, PROMPT 02 날짜 유틸.

**완료 조건**:
- [ ] 연속/최고 기록이 계획서 54장 예시처럼 정확히 계산된다
- [ ] 캘린더에 학습일이 정확히 표시된다
- [ ] 학습을 건너뛴 다음 날 스트릭이 정확히 초기화된다

**테스트 항목**: 연속 학습 시나리오, 하루 건너뛴 시나리오, 자정 경계, 월 전환 시 캘린더 조회, 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 27 — 업적/뱃지 시스템

**목적**: 계획서 55장의 업적(단어 수/한자 수 기준)을 구현한다. 한자 업적은 Phase 9 완료 후 실제 데이터가 채워지도록 조건만 지금 정의해둔다.

**현재 프로젝트 상태**: PROMPT 26까지 완료(EXP/Level/Quest/Streak 동작 중). 아직 한자 시스템(Phase 9)은 없다.

**구현 범위**:
- `Achievement(id, code, category, title, condition_value)`, `UserAchievement(user_id, achievement_id, unlocked_at)` 마이그레이션
- 단어 업적 시딩: 첫 단어 등록, 10/100/500/1,000단어 학습(MASTERED 또는 학습 완료 기준 — 계획서 문구가 "학습"이므로 `learning_status`가 NEW를 벗어난 시점 기준으로 정의, **추가 결정 필요 사항을 이 문서에서 확정**)
- 한자 업적 시딩(조건만 정의, 실제 잠금 해제 로직은 Phase 9에서 `UserKanji` 테이블 생성 후 연결): 漢字 초보(100자)/중급(500자)/고급(1,000자)/常用漢字 MASTER(2,136자)
- 학습 액션 발생 시 업적 조건 체크(비동기 또는 동일 트랜잭션 내에서, 조건 충족 시 `UserAchievement` 생성 + EXP 보상 없음/소량 — 계획서에 업적 보상 EXP 명시 없어 **보상 없음을 기본값**으로 채택)
- 업적 목록 화면(Collection Grid, PROMPT 05 재사용) — locked/unlocked 상태 표시

**구현하지 않을 범위**: 한자 업적의 실제 달성 판정(Phase 9 이후).

**기술적 요구사항**:
- Backend: 업적 조건 체크를 학습 액션 이벤트 처리 로직에 hook(PROMPT 24의 EXP 지급 트랜잭션과 같은 지점)
- Database: 업적 코드/조건은 seed 데이터로 관리(하드코딩 금지)

**UI/UX 요구사항**: 업적 달성 시 짧은 축하 연출(토스트 또는 모달), Collection Grid에서 unlocked는 컬러, locked는 실루엣(D.4 매핑 그대로).

**기존 코드와의 연결**: PROMPT 05 Achievement Badge/Collection Grid, PROMPT 24 EXP 트랜잭션 로직.

**완료 조건**:
- [ ] 단어 업적 4종이 조건 충족 시 정확히 잠금 해제된다
- [ ] 한자 업적은 잠금 상태로 정상 표시되며 Phase 9 이전에는 달성되지 않는다
- [ ] 업적 목록 화면이 unlocked/locked를 정확히 구분한다

**테스트 항목**: 업적 조건 경계값(정확히 10/100번째 단어), 중복 달성 방지, 업적 0개 상태, 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 28 — 사진 업로드 & 이미지 검증

**목적**: 계획서 24장의 사진 단어장 등록 흐름 중 첫 단계(업로드+검증)를 구현한다. 여기서부터 1.5차 버전이 시작된다.

**현재 프로젝트 상태**: 1차 버전 + 게임화(PROMPT 01~27)가 완성되어 있다. 이미지 업로드/OCR 기능은 없다.

**구현 범위**:
- 사진 업로드 UI(파일 선택 + 모바일 카메라 촬영 지원, `capture` 속성 활용)
- 클라이언트/서버 양쪽에서 이미지 검증: 파일 형식(jpg/png/heic 등), 최대 용량, 최소 해상도
- Object Storage(B섹션 결정: Cloudflare R2 등)에 업로드, URL 저장
- 업로드 진행률 표시, 실패 시 명확한 에러(용량 초과/형식 불일치/네트워크 실패 구분)
- 업로드된 사진에 대한 임시 레코드 생성(다음 단계 OCR 처리를 위한 대기열 역할)

**구현하지 않을 범위**: OCR 처리(PROMPT 29), 단어 분리(PROMPT 30).

**기술적 요구사항**:
- 파일 저장: Object Storage 클라이언트 연동, presigned URL 방식 권장
- Validation: 파일 크기/형식 서버측 재검증(클라이언트 검증만 신뢰하지 않음)
- 보안: 업로드 파일 스캔/확장자 위변조 방지 기본 처리

**UI/UX 요구사항**: 모바일 사용성 최우선(계획서 58장 — 사진 단어장 등록은 모바일에서 특히 중요). 업로드 중 로딩 상태를 게임형 톤 없이 명확하게.

**기존 코드와의 연결**: PROMPT 04 UI 컴포넌트, PROMPT 02 에러 규격.

**완료 조건**:
- [ ] 모바일/데스크탑 모두에서 사진 업로드가 정상 동작한다
- [ ] 잘못된 형식/과대 용량 파일이 명확히 거부된다
- [ ] 업로드 성공 시 다음 단계로 진입할 수 있는 레코드가 생성된다

**테스트 항목**: 정상 이미지, 손상된 파일, 과대 용량, 지원하지 않는 형식, 느린 네트워크에서 업로드 중단/재시도, 모바일 카메라 촬영 플로우.

---

### PROMPT 29 — OCR 연동(텍스트 추출)

**목적**: 업로드된 사진에서 일본어 텍스트를 추출한다(계획서 24장 OCR 단계).

**현재 프로젝트 상태**: PROMPT 28까지 완료(사진 업로드 존재). 텍스트 추출 기능은 없다.

**구현 범위**:
- OCR API(✅ B섹션 확정: **Google Cloud Vision**) 연동 클라이언트(`lib/ocr/`)
- 업로드된 이미지 URL을 OCR API에 전달하여 텍스트(및 가능하다면 좌표) 추출
- 추출 실패/텍스트 없음 상황 처리(사용자에게 재촬영 유도)
- OCR 원본 결과를 임시 저장(다음 단계 AI 단어 분리의 입력으로 사용)
- 비용/처리 시간 로깅

**구현하지 않을 범위**: 텍스트를 단어 단위로 분리하고 각 단어의 상세 정보를 생성하는 것(PROMPT 30, AI Orchestration 모듈 재사용).

**기술적 요구사항**:
- 외부 API: OCR 제공자 연동, Timeout/Retry 정책(PROMPT 13 AI 모듈과 동일한 원칙 적용)
- Error Handling: `OCR_NO_TEXT_FOUND`, `OCR_TIMEOUT` 등 전용 에러 코드

**UI/UX 요구사항**: OCR 처리 중 대기 화면(예상 소요 시간 안내).

**기존 코드와의 연결**: PROMPT 28 업로드 레코드, PROMPT 02 에러 규격.

**완료 조건**:
- [ ] 일본어 텍스트가 포함된 이미지에서 텍스트가 정상 추출된다
- [ ] 텍스트가 없는 이미지에서 명확한 안내가 표시된다
- [ ] OCR 실패 시 재시도가 가능하다

**테스트 항목**: 선명한 인쇄물 이미지, 손글씨 이미지(정확도 낮을 수 있음을 안내), 텍스트 없는 이미지, 저해상도 이미지, API 실패 시뮬레이션.

---

### PROMPT 30 — AI 단어 분리 + 정보 자동 생성(일괄 처리)

**목적**: 계획서 25~26장의 흐름대로, OCR 텍스트를 단어 후보로 분리하고 각 단어에 대해 PROMPT 13 AI Orchestration 모듈을 재사용하여 후리가나/뜻/예문/한자 정보를 일괄 생성한다.

**현재 프로젝트 상태**: PROMPT 29까지 완료(OCR 텍스트 추출 존재). AI 분석 모듈(PROMPT 13)은 이미 존재한다.

**구현 범위**:
- OCR 원본 텍스트를 일본어 단어 후보 목록으로 분리하는 AI 프롬프트(형태소 분석적 접근, LLM에게 "이 텍스트에서 학습할 만한 일본어 단어를 추출하라" 형태로 요청 — 정확도가 중요하므로 최소 품사 필터링 포함)
- 분리된 각 단어에 대해 PROMPT 13 모듈을 배치(batch)로 호출하여 후리가나/뜻/품사/예문/관련 한자 생성(계획서 26장 예시처럼 최대 20개 이상 단어를 한 번에 처리 가능해야 함 — 동시 요청 수 제한/큐잉 고려)
- 처리 중 진행률(몇 개 중 몇 개 완료) 표시용 상태 저장
- 결과를 `AIAnalysis(status=pending)`으로 임시 저장(아직 확정 저장 아님, PROMPT 31에서 검수)

**구현하지 않을 범위**: 검수 UI(PROMPT 31), 중복 검사(PROMPT 32), 최종 저장.

**기술적 요구사항**:
- AI: PROMPT 13 모듈 재사용(신규 AI 클라이언트 생성 금지), 배치 처리 시 Rate Limit 고려한 큐/동시성 제어
- 비용: 단어 수가 많을 경우 비용이 커질 수 있으므로 사용자에게 처리 전 "약 N개 단어 발견, 분석을 시작합니다" 안내

**UI/UX 요구사항**: 처리 중 화면에서 실시간 진행률 표시(모바일에서도 앱을 떠나지 않고 대기 가능하도록 안내).

**기존 코드와의 연결**: PROMPT 13 AI Orchestration 모듈, PROMPT 29 OCR 결과.

**완료 조건**:
- [ ] 계획서 26장 예시처럼 여러 단어가 한 번에 분석된다
- [ ] 일부 단어 분석 실패 시 전체가 중단되지 않고 실패한 단어만 표시된다
- [ ] 처리 결과가 다음 단계(검수)로 정확히 전달된다

**테스트 항목**: 단어 1개짜리 사진, 20개 이상 단어가 포함된 사진, 일부 단어 분석 실패 상황, 동시성 처리, API 비용/시간 초과 상황.

---

### PROMPT 31 — OCR 결과 검수 UI

**목적**: 계획서 25장의 검수 화면(체크박스 선택/수정/삭제)을 구현한다.

**현재 프로젝트 상태**: PROMPT 30까지 완료(AI가 분석한 단어 후보 목록이 pending 상태로 존재).

**구현 범위**:
- 발견된 단어 목록을 체크박스와 함께 표시(계획서 25장 예시: "사진에서 23개의 단어를 발견했습니다")
- 전체 선택/선택 해제, 개별 단어 수정(PROMPT 10 단어 등록 폼 재사용), 개별 삭제
- "단어장에 추가" 버튼(대상 단어장 선택 포함)
- 수정 후에도 원본 사진을 참조할 수 있도록 이미지 미리보기 병행 표시(정확도 낮은 OCR 결과를 사용자가 원본과 대조 확인 가능하게)

**구현하지 않을 범위**: 중복 검사(PROMPT 32에서 저장 직전에 수행).

**기술적 요구사항**:
- Frontend: 다건 선택 상태 관리(체크박스 배열), 수정 시 PROMPT 10 폼 컴포넌트 재사용(새 폼 중복 생성 금지)

**UI/UX 요구사항**: 모바일에서 다건 리스트 선택/스크롤 사용성 중요(계획서 58장). 원본 이미지와 텍스트 비교가 쉽도록 레이아웃 구성.

**기존 코드와의 연결**: PROMPT 10 단어 등록 폼, PROMPT 09 단어장 선택 UI, PROMPT 30 pending 분석 결과.

**완료 조건**:
- [ ] 전체 선택/해제/개별 수정/삭제가 모두 정상 동작한다
- [ ] 수정된 내용이 다음 단계(저장)에 정확히 반영된다
- [ ] 원본 이미지 대조가 가능하다

**테스트 항목**: 전체 선택 후 일부 삭제, 모든 항목 삭제(빈 상태), 개별 수정 후 저장, 대량 항목(20개 이상) 스크롤 성능, 모바일 UX.

---

### PROMPT 32 — 중복 단어 검사 & 최종 등록

**목적**: 계획서 27장의 중복 검사 흐름을 구현하고, 검수 완료된 단어를 실제 단어장에 최종 저장한다(1.5차 버전 사진 단어장 흐름 완결).

**현재 프로젝트 상태**: PROMPT 31까지 완료(검수 UI 존재). 저장 시 중복 처리는 아직 없다.

**구현 범위**:
- 저장 직전, 선택된 단어들을 기존 사용자 단어(전체 또는 대상 단어장 기준 — 계획서 27장 예시는 "기존 단어장과 비교"이므로 사용자 전체 단어 기준으로 채택)와 비교하여 중복 후보 탐지(정확 일치 기준, 유사도 매칭은 범위 밖)
- 중복 발견 시 선택지 제공: 기존 단어 유지(스킵) / 새 단어로 다시 저장(신규 생성) / 기존 단어장에 연결(신규 생성 없이 VocabularyBookItem만 추가)
- 최종 저장 실행: `Vocabulary`(신규분), `VocabularyMeaning`, `ExampleSentence`, `VocabularyBookItem`, `UserVocabulary`(NEW 상태) 일괄 생성/연결
- 저장 완료 후 요약 화면("N개 단어가 추가되었습니다") 및 단어장 상세로 이동

**구현하지 않을 범위**: 없음(1.5차 버전 사진 단어장 흐름은 이 단계로 완결).

**기술적 요구사항**:
- Database: 대량 insert 트랜잭션 처리
- Validation: 중복 판정 기준(정확 일치)을 명확히 문서화

**UI/UX 요구사항**: 중복 항목은 시각적으로 구분(예: 옅은 배경 + "이미 등록됨" 뱃지) 후 선택지를 계획서 27장 예시 그대로 제공.

**기존 코드와의 연결**: PROMPT 10 저장 로직, PROMPT 09 단어장 연결, PROMPT 31 검수 결과.

**완료 조건**:
- [ ] 중복 단어가 정확히 탐지되고 3가지 선택지가 모두 정상 동작한다
- [ ] 최종 저장 후 단어장 상세/단어 목록에 정확히 반영된다
- [ ] 대량 저장 시에도 데이터 정합성이 유지된다

**테스트 항목**: 중복 0건, 전량 중복, 일부 중복, 대량 저장(20개 이상) 성능, 저장 중 실패 시 롤백 여부, 모바일 UX.

---

### PROMPT 33 — 한자 DB 구축 & 마이그레이션

**목적**: 계획서 28장의 상용한자 2,136자 데이터베이스를 구축한다. 여기서부터 한자 학습 시스템(계획서 29~33장)이 시작된다.

**현재 프로젝트 상태**: PROMPT 32까지 완료(1.5차 버전 사진 단어장 흐름 완결). `Kanji` 테이블은 아직 없다.

**구현 범위**:
- `Kanji(id, character, onyomi[], kunyomi[], korean_reading, meaning, stroke_count, radical, school_grade, jlpt_level_ref)`, `VocabularyKanji(vocabulary_id, kanji_id)`, `UserKanji(user_id, kanji_id, learning_status, last_reviewed_at, next_review_at, correct_count, wrong_count)` 마이그레이션
- 常用漢字 2,136자 시드 데이터 구축(공개된 상용한자 데이터 소스를 활용해 음독/훈독/한국 한자음/뜻/획수/부수/학년 데이터 시딩 — 데이터 출처는 정확성이 중요한 정보이므로 A.7 원칙대로 검증된 사전 데이터 사용, 예: KANJIDIC2 등 공개 한자 사전 데이터셋 + 학년별 常用漢字 공식 목록 조합)
- **(사용자 확정 사항)** 이 2,136자는 이 단계에서 **한 번에 전량 시딩하여 완결**한다. 관리자/사용자가 한자를 개별 추가·수정·삭제하는 화면·API는 프로젝트 전체에서 만들지 않는다 — 한자 데이터는 "기본 제공되는 고정 참고 자료"로 취급하고, 이후 모든 Phase(한자 상세/퀴즈/학습률/업적 등)는 이 시드 데이터만을 대상으로 동작한다. 데이터 오류 수정이 필요할 경우에도 화면이 아니라 시드 스크립트 수정 후 재배포로 처리한다.
- PROMPT 14에서 임시 텍스트로만 저장했던 단어의 "관련 한자" 후보를 실제 `Kanji`/`VocabularyKanji`에 소급 연결하는 마이그레이션 스크립트(기존 단어 데이터를 다시 스캔하여 매칭)
- JLPT 한자 분류는 常用漢字 학년 분류와 별도 관리(계획서 32장 명시: "공식 常用漢字 분류와 JLPT 한자 분류는 동일하지 않으므로 데이터는 별도로 관리")

**구현하지 않을 범위**: 한자 상세 페이지(PROMPT 34), 한자 퀴즈(PROMPT 36), 화면 UI 전반.

**기술적 요구사항**:
- Database: 대량 시드 데이터(2,136건) 삽입 스크립트, 성능 고려한 인덱스(character 컬럼 unique)
- Validation: 시드 데이터 무결성 검증(음독/훈독 누락 여부 점검 스크립트)

**UI/UX 요구사항**: 없음.

**기존 코드와의 연결**: PROMPT 10/14의 `Vocabulary` 데이터(관련 한자 소급 연결 대상), PROMPT 06 마이그레이션 체계.

**완료 조건**:
- [ ] 2,136자 전체가 정상 시딩된다
- [ ] 기존 단어들의 관련 한자가 정확히 소급 연결된다
- [ ] `/dev` 임시 페이지 등에서 임의 한자 조회 시 데이터가 정확히 반환된다

**테스트 항목**: 시드 데이터 개수/무결성 검증, 특수 한자(이체자 등) 처리, 소급 연결 정확도 샘플 검증, 빌드/타입/린트 에러.

---

### PROMPT 34 — 한자 상세 페이지 + 한자↔단어 연결

**목적**: 계획서 29~30장의 한자 상세 페이지와 양방향 연결 기능을 구현한다.

**현재 프로젝트 상태**: PROMPT 33까지 완료(한자 DB + 소급 연결 존재). 한자 화면은 없다.

**구현 범위**:
- 한자 상세 페이지(계획서 29장 레이아웃: 음독/훈독/한국 한자음/뜻/획수/부수 + 관련 단어 목록)
- 단어 상세 페이지(PROMPT 10)에서 한자 클릭 시 해당 한자 상세로 이동(계획서 30장)
- 한자 상세에서 그 한자가 포함된 단어 목록 표시, 클릭 시 단어 상세로 이동(양방향)
- 한자 목록/탐색 페이지(59장 메뉴 "常用漢字" 진입점)

**구현하지 않을 범위**: 한자 학습률(PROMPT 35), 한자 퀴즈(PROMPT 36).

**기술적 요구사항**:
- API: `GET /api/kanji/:character`, `GET /api/kanji/:character/vocabularies`
- Frontend: 단어 상세의 한자 표기 부분을 클릭 가능한 링크로 변경(기존 PROMPT 10 페이지 확장, 재작성 아님)

**UI/UX 요구사항**: 한자 상세는 정보 우선 화면(D.1), 학습 상태 뱃지(PROMPT 04)로 UserKanji 상태 표시.

**기존 코드와의 연결**: PROMPT 33 Kanji 데이터, PROMPT 10 단어 상세 페이지(확장), PROMPT 04 Badge/Card.

**완료 조건**:
- [ ] 단어→한자, 한자→단어 양방향 이동이 계획서 30장 예시(見逃す ↔ 見/逃)처럼 정확히 동작한다
- [ ] 한자 목록/탐색 페이지에서 원하는 한자를 찾을 수 있다

**테스트 항목**: 관련 단어가 없는 한자(빈 상태), 관련 단어가 많은 한자, 존재하지 않는 한자 접근, 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 35 — 한자 학습률 & 레벨별 분류

**목적**: 계획서 31~32장의 전체 진행률 표시와 레벨별(학년/JLPT) 분류 탐색을 구현한다.

**현재 프로젝트 상태**: PROMPT 34까지 완료(한자 상세/연결 존재). 학습 상태 갱신 로직(SRS와 유사한)이 한자에는 아직 없다.

**구현 범위**:
- `UserKanji.learning_status/next_review_at` 갱신 로직 — PROMPT 16 SRS 엔진을 재사용하되 대상 타입을 vocab/kanji로 파라미터화(신규 로직 중복 구현 금지, 기존 `lib/srs/` 모듈 확장)
- 상용한자 전체 학습 진행률 표시(계획서 31장: "982/2,136, 45.9%") — Progress Ring 재사용
- 학년별(초1~중학교 이후) 분류 탐색 화면, JLPT 참고 분류 탐색 화면(별도 데이터 기준, 계획서 32장 명시대로 혼동 없이 분리)

**구현하지 않을 범위**: 한자 퀴즈(PROMPT 36).

**기술적 요구사항**:
- Backend: PROMPT 16 SRS 모듈의 타입 파라미터화(`target_type: 'vocab' | 'kanji'`)
- API: `GET /api/kanji/progress`, `GET /api/kanji?grade=` / `?jlpt=`

**UI/UX 요구사항**: Progress Ring(PROMPT 05)으로 전체 학습률 시각화, 분류 탐색은 탭/필터 형태.

**기존 코드와의 연결**: PROMPT 16 SRS 로직 확장, PROMPT 33 Kanji 데이터, PROMPT 05 Progress Ring.

**완료 조건**:
- [ ] 학습률 수치가 실제 UserKanji 데이터와 정확히 일치한다
- [ ] 학년별/JLPT별 필터가 각각 올바른 결과를 반환한다(두 분류가 섞이지 않는다)

**테스트 항목**: 학습률 0%/100% 경계, 분류 필터 교차 검증, 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 36 — 한자 퀴즈 + 한자 업적 연동

**목적**: 계획서 33장의 한자 퀴즈(뜻 맞히기/읽기/한자 선택)를 구현하고, PROMPT 27에서 조건만 정의해둔 한자 업적을 실제로 연결한다.

**현재 프로젝트 상태**: PROMPT 35까지 완료(한자 학습 상태/진행률 존재). 한자 퀴즈는 없다.

**구현 범위**:
- PROMPT 19 퀴즈 엔진을 확장하여 한자 대상 문제 유형 추가: 뜻 맞히기, 읽기(음독/훈독), 한자 선택(계획서 33장 예시: すごす → 過ごす/通ごす/超ごす)
- 한자 퀴즈 UI(PROMPT 20 퀴즈 화면 재사용, 대상 타입만 kanji로 확장 — 새 퀴즈 화면 중복 생성 금지)
- 퀴즈 결과를 `ReviewHistory`(target_type=kanji)에 기록하고 PROMPT 35의 UserKanji SRS 갱신과 연결
- 한자 학습/퀴즈 정답 시 EXP 지급(계획서 56장: 한자 학습 +2) — PROMPT 24 로직 재사용
- PROMPT 27 한자 업적 조건(100/500/1,000/2,136자)을 UserKanji 데이터 기준으로 실제 판정하도록 연결

**구현하지 않을 범위**: 없음(한자 학습 시스템은 이 단계로 1.5차 버전 범위 완결).

**기술적 요구사항**: PROMPT 19/20 퀴즈 엔진·UI, PROMPT 24 EXP 로직, PROMPT 27 업적 로직 — 모두 기존 모듈을 파라미터 확장 방식으로 재사용하고 중복 구현하지 않는다.

**UI/UX 요구사항**: 기존 퀴즈 UI와 완전히 동일한 톤 유지(한자라고 별도 디자인을 만들지 않는다).

**기존 코드와의 연결**: PROMPT 19/20, PROMPT 24, PROMPT 27, PROMPT 33~35.

**완료 조건**:
- [ ] 3가지 한자 퀴즈 유형이 정상 동작한다
- [ ] 한자 학습 EXP와 업적이 정확히 연동된다
- [ ] 오늘의 학습(PROMPT 17)에 "오늘의 한자" 항목이 자연스럽게 통합된다(59장 메뉴/62장 최종 흐름 기준)

**테스트 항목**: 유형별 정답/오답, 업적 경계값(정확히 100/500/1,000/2,136번째), EXP 중복 지급 방지, 모바일 UX, 빌드/타입/린트 에러.

---

### PROMPT 37 — [체크포인트] 1.5차 버전 통합 점검

**목적**: PROMPT 24~36(게임화 + 사진 OCR + 한자)까지의 기능이 1차 버전과 함께 정상적으로 동작하는지 통합 회귀 테스트를 수행한다. **새로운 기능을 추가하지 않는다.**

**현재 프로젝트 상태**: 1차 버전 + 게임화 + 1.5차 버전(OCR/한자) 전체가 개별 구현되어 있으나 통합 검증은 아직이다.

**구현 범위**:
- 전체 흐름 재점검: 오늘의 학습(단어+한자 통합) → 퀴즈(단어+한자) → EXP/퀘스트/스트릭/업적 반영 → 사진으로 단어 추가 → 한자 자동 연결까지
- PROMPT 23과 동일한 수준의 회귀 테스트(반응형, 빈 데이터, 실패 상태, 접근성)를 1.5차 버전 범위까지 확장
- 게임화 수치(EXP/레벨/스트릭)가 여러 액션(단어+한자+OCR로 추가한 단어)에 걸쳐 일관되게 누적되는지 확인
- 발견된 버그 수정(신규 기능 추가 금지)

**구현하지 않을 범위**: Phase 10 이후(AI 개인화, 이미지/회화 등)의 어떤 기능도 다루지 않는다.

**기술적 요구사항**: 없음(버그 수정만).

**UI/UX 요구사항**: 기존 디자인 시스템 범위 내에서만 수정한다.

**기존 코드와의 연결**: PROMPT 01~36 전체.

**완료 조건**:
- [ ] 단어/한자 두 축의 학습 루프가 게임화 수치와 함께 끊김 없이 동작한다
- [ ] 사진 업로드 → 검수 → 저장 → 한자 자동 연결까지 E2E로 확인된다
- [ ] 빌드/타입/린트 전부 통과한다

**테스트 항목**: 단어+한자 혼합 학습 세션, 사진으로 추가한 단어의 한자 연결 확인, 대량 데이터에서의 통계/진행률 정확성, 반응형 3종, 다크모드.


### PROMPT 38 — AI 취약점 분석

**목적**: 계획서 35장의 AI 취약점 분석을 구현한다. 여기서부터 2차 버전(AI 개인화)이 시작된다.

**현재 프로젝트 상태**: 1차+1.5차 버전 전체(PROMPT 01~37)가 완성되어 있고, `ReviewHistory`에 단어/한자 학습 데이터가 충분히 누적되는 구조다.

**구현 범위**:
- 문제 유형별(일→한/한→일/후리가나/빈칸/예문해석 등) 정답률 집계 API(`ReviewHistory` 기준)
- 집계 결과를 PROMPT 13 AI Orchestration 모듈에 전달하여 자연어 분석 코멘트 생성(계획서 35장 예시 형태: "한국어를 보고 일본어를 떠올리는 능력이 상대적으로 약합니다")
- 분석 결과 캐싱(예: 주 1회 갱신 등 — 매 요청마다 AI 호출하지 않도록 정책 수립, **추가 결정 필요** 항목이며 기본값으로 "하루 1회 갱신" 채택)
- 통계 페이지(PROMPT 22)에 AI 분석 섹션 추가

**구현하지 않을 범위**: 문제 비율 자동 조절(PROMPT 39, 별도 기능), 취약 한자 분석(PROMPT 40, 별도 기능).

**기술적 요구사항**:
- AI: PROMPT 13 모듈 재사용, 입력은 집계된 수치 데이터(원본 개인정보 최소화)
- Database: 집계 쿼리 성능(인덱스), 분석 결과 캐시 저장(`AIAnalysis` 재사용, analysis_type='weakness')

**UI/UX 요구사항**: 정답률은 수치/그래프로, AI 코멘트는 카드 형태로 구분 표시(D.1: 통계는 정보 우선이되 AI 코멘트는 도움말 톤).

**기존 코드와의 연결**: PROMPT 13 AI 모듈, PROMPT 06 `ReviewHistory`/`AIAnalysis`, PROMPT 22 통계 페이지.

**완료 조건**:
- [ ] 문제 유형별 정답률이 정확히 집계된다
- [ ] AI 코멘트가 실제 데이터에 근거하여 생성된다(가짜/무관한 코멘트 방지 위해 프롬프트에 실제 수치 포함 필수)
- [ ] 데이터가 부족한 신규 사용자에게는 "데이터가 더 필요합니다" 같은 안내가 표시된다

**테스트 항목**: 데이터 부족(신규 계정), 데이터 충분, 극단적 정답률(0%/100%), AI 실패 시 폴백, 캐시 갱신 주기 확인, 빌드/타입/린트 에러.

---

### PROMPT 39 — 문제 비율 자동 조절

**목적**: 계획서 36장의 로직을 구현한다. PROMPT 38의 분석 결과를 바탕으로 PROMPT 19 퀴즈 엔진의 문제 유형 배분을 개인화한다.

**현재 프로젝트 상태**: PROMPT 38까지 완료(취약점 분석 데이터 존재). 퀴즈는 아직 균등 랜덤 배분(PROMPT 19 기본값)이다.

**구현 범위**:
- PROMPT 19 문제 유형 배분 로직을 확장: 정답률이 높은 유형은 출제 비중을 낮추고, 낮은 유형(예: 한→일)의 비중을 높이는 가중치 계산(계획서 36장 예시 그대로)
- 가중치 계산식 확정(**추가 결정 필요**, 기본값: 정답률의 역수에 비례하는 가중치, 단 최소/최대 비중 캡(예: 5%~50%)을 두어 특정 유형이 완전히 사라지지 않게 함)
- 오늘의 학습/퀴즈 세션 생성 시 이 가중치를 적용하도록 PROMPT 19 모듈 파라미터화(신규 엔진 중복 생성 금지)

**구현하지 않을 범위**: UI상 사용자에게 가중치를 직접 노출/수정하게 하는 기능은 계획서에 없음(자동 조절만 명시) → 구현하지 않는다.

**기술적 요구사항**: PROMPT 19 퀴즈 엔진 확장, PROMPT 38 분석 데이터 소비.

**UI/UX 요구사항**: 사용자에게는 "오늘은 한→일 문제가 더 많이 나와요" 같은 짧은 안내만 제공(선택 사항).

**기존 코드와의 연결**: PROMPT 19/20 퀴즈 엔진, PROMPT 38 분석 결과.

**완료 조건**:
- [ ] 정답률이 낮은 유형의 출제 비중이 실제로 증가한다
- [ ] 어떤 유형도 완전히 0%가 되지 않는다(최소 비중 보장)
- [ ] 데이터 부족 시 기본 균등 배분으로 폴백된다

**테스트 항목**: 극단적 정답률 편차, 데이터 부족 폴백, 가중치 경계값(캡 적용 확인), 빌드/타입/린트 에러.

---

### PROMPT 40 — 취약 한자 분석

**목적**: 계획서 37장의 기능을 구현한다. 특정 한자가 포함된 단어에서 반복 오답이 발생하는지 분석하고 관련 단어를 추천한다.

**현재 프로젝트 상태**: PROMPT 39까지 완료.

**구현 범위**:
- `ReviewHistory`(오답) × `VocabularyKanji`를 조인하여 한자별 오답 빈도 집계
- 임계값 이상(예: 최근 N회 중 오답 비율 기준, **추가 결정 필요**, 기본값 "최근 10회 중 3회 이상 오답") 한자를 "취약 한자"로 판정
- 취약 한자가 포함된 다른 단어 추천(계획서 37장 예시: 逃 → 逃げる/逃す/見逃す/逃亡)
- 통계 또는 한자 페이지에 취약 한자 섹션 추가

**구현하지 않을 범위**: 없음(단일 기능으로 완결).

**기술적 요구사항**: Database 조인 쿼리 성능, PROMPT 06/33 스키마 재사용.

**UI/UX 요구사항**: 취약 한자는 상태 뱃지(WEAK류)와 연결, 추천 단어는 Card 목록.

**기존 코드와의 연결**: PROMPT 33~36 한자 시스템, PROMPT 21 오답노트 패턴 재사용.

**완료 조건**:
- [ ] 임계값을 넘는 한자가 정확히 판정된다
- [ ] 추천 단어 목록이 실제로 해당 한자를 포함한다
- [ ] 취약 한자가 없는 경우 정상적으로 빈 상태가 표시된다

**테스트 항목**: 임계값 경계, 추천 단어 0개 상황, 다수 취약 한자 상황, 빌드/타입/린트 에러.

---

### PROMPT 41 — 유사 표현 AI 비교

**목적**: 계획서 38장의 기능을 구현한다. 사용자가 헷갈리는 여러 단어를 AI가 비교 설명한다.

**현재 프로젝트 상태**: PROMPT 40까지 완료.

**구현 범위**:
- 사용자가 2~5개 단어(자신의 단어장에서 선택 또는 직접 입력)를 선택하면 PROMPT 13 AI 모듈로 비교 요청
- 출력: 각 단어의 핵심 뉘앙스 차이 + 자연스러운 예문(계획서 38장 예시: わざと/わざわざ/あえて/せっかく)
- 결과 캐싱(동일 조합 재요청 방지)
- AI 학습 메뉴(59장 "표현 비교")에 진입점 추가

**구현하지 않을 범위**: 없음.

**기술적 요구사항**: PROMPT 13 모듈 재사용, 입력 검증(최소 2개, 최대 5개).

**UI/UX 요구사항**: 비교 결과를 표 또는 카드 나열로, 정보 우선 톤.

**기존 코드와의 연결**: PROMPT 13 AI 모듈, PROMPT 10 단어 선택 UI 패턴.

**완료 조건**:
- [ ] 2개 이상 단어 선택 시 비교 결과가 정상 생성된다
- [ ] 동일 조합 재요청 시 캐시된 결과가 반환된다
- [ ] AI 실패 시 명확한 에러가 표시된다

**테스트 항목**: 최소/최대 개수 경계, 캐시 히트, AI 실패, 존재하지 않는 단어 조합, 빌드/타입/린트 에러.

---

### PROMPT 42 — AI 자연어 단어 검색

**목적**: 계획서 39장의 기능을 구현한다. 정확한 단어를 몰라도 한국어 상황 설명으로 검색한다.

**현재 프로젝트 상태**: PROMPT 41까지 완료. PROMPT 12(기본 검색)와는 별개 기능이다.

**구현 범위**:
- 자연어 질의 입력 UI(예: "일부러라는 뜻인데 상대방이 나를 위해 수고했다는 느낌의 일본어가 뭐였지?")
- PROMPT 13 AI 모듈로 질의를 분석하여 가장 적절한 일본어 표현 + 예문 반환(계획서 39장 예시)
- AI가 제안한 단어가 사용자의 기존 단어장에 있으면 바로 링크, 없으면 "단어장에 추가하기" 액션 제공(PROMPT 10 등록 흐름 재사용)
- 자연어 검색과 PROMPT 12 기본 검색을 UI상 명확히 구분(다른 진입점/탭)

**구현하지 않을 범위**: 없음.

**기술적 요구사항**: PROMPT 13 모듈 재사용, Rate Limit(악용 방지를 위한 요청 빈도 제한 고려).

**UI/UX 요구사항**: 대화형 검색 UI(챗봇 톤이 아니라 "질문→답변 카드" 형태로 단순하게).

**기존 코드와의 연결**: PROMPT 13 AI 모듈, PROMPT 10 단어 등록 흐름.

**완료 조건**:
- [ ] 계획서 39장 예시와 유사한 질의에 적절한 결과가 반환된다
- [ ] 결과에서 바로 단어장에 추가할 수 있다
- [ ] 무관하거나 모호한 질의에 대해 합리적인 폴백 응답이 온다

**테스트 항목**: 명확한 질의, 모호한 질의, 존재하지 않는 개념 질의, AI 실패, 남용 방지(연속 요청) 처리, 빌드/타입/린트 에러.

---

### PROMPT 43 — AI 자동 학습 계획

**목적**: 계획서 52장의 기능을 구현한다. 사용자의 목표/기간/가용 시간을 기반으로 일일 추천 학습량을 생성한다.

**현재 프로젝트 상태**: PROMPT 42까지 완료. 온보딩(PROMPT 08)에서 목표/현재 수준 데이터는 이미 존재한다.

**구현 범위**:
- 목표 JLPT/시험일(사용자가 입력, 온보딩에 없던 "시험까지 D-day" 값은 이 단계에서 MY 설정에 추가 입력받음)과 하루 가용 시간을 바탕으로 추천 학습량 계산(계획서 52장 예시: 새 단어 12개/복습 31개/한자 5개/문장 3문제/예상 29분)
- 계산 로직은 규칙 기반(현재 단어/한자 진행률 + 목표까지 남은 기간 기반 역산)으로 우선 구현하고, AI는 이 수치를 자연어로 설명하는 역할에 한정(정확성이 중요한 "수량 계산"은 AI 단독에 맡기지 않는다 — A.7 원칙 적용)
- 오늘의 학습(PROMPT 17) 페이지에 "AI 추천 학습량 적용" 옵션 제공(기존 하루 목표값을 임시 조정)

**구현하지 않을 범위**: 없음.

**기술적 요구사항**: 규칙 기반 계산 로직(순수 함수) + PROMPT 13 AI 모듈(설명 문구 생성만).

**UI/UX 요구사항**: 추천 계획을 카드 형태로 제시, "적용"과 "무시하고 기존 설정 유지" 둘 다 명확히 제공.

**기존 코드와의 연결**: PROMPT 08 온보딩 데이터, PROMPT 17 오늘의 학습, PROMPT 35 한자 진행률.

**완료 조건**:
- [ ] 입력값에 따라 합리적인 추천 학습량이 계산된다
- [ ] 추천을 적용/무시 모두 정상 동작한다
- [ ] 극단적 입력(시험이 내일, 시험이 1년 뒤)에서도 계산이 깨지지 않는다

**테스트 항목**: 목표 기간 경계값, 가용시간 0/과다 입력, 추천 적용 후 오늘의 학습 반영 확인, 빌드/타입/린트 에러.

---

### PROMPT 44 — 주간/월간 AI 리포트

**목적**: 계획서 53장의 리포트 기능을 구현한다. 2차 버전(AI 개인화)을 마무리한다.

**현재 프로젝트 상태**: PROMPT 43까지 완료. 필요한 데이터(학습시간/신규단어/복습/신규한자/정답률/취약점)는 이미 각 Phase에서 누적되고 있다.

**구현 범위**:
- 주간/월간 리포트 집계 API(학습 시간, 새 단어 수, 복습 수, 새 한자 수, 전체 정답률 — 계획서 53장 예시)
- 취약점 요약(PROMPT 38/40 재사용) + AI 다음 주 추천 코멘트(PROMPT 13 재사용)
- 리포트 화면(59장 메뉴 "통계 > 주간/월간"과 통합, 별도 신규 메뉴 생성 금지)
- 리포트는 배치성으로 매주/매월 갱신되는 캐시 방식 채택(요청마다 재계산하지 않음)

**구현하지 않을 범위**: 리포트 이메일/알림 발송(계획서 미언급, 필요 시 별도 논의).

**기술적 요구사항**: 집계 쿼리, AI 모듈 재사용, 캐시(주/월 단위 배치 갱신).

**UI/UX 요구사항**: 리포트는 정보 우선이되 취약점/추천 섹션만 카드로 강조.

**기존 코드와의 연결**: PROMPT 22 기본 통계, PROMPT 38 취약점 분석, PROMPT 13 AI 모듈.

**완료 조건**:
- [ ] 주간/월간 수치가 정확히 집계된다
- [ ] AI 추천 코멘트가 실제 수치에 근거한다
- [ ] 데이터가 없는 첫 주/첫 달에도 정상적으로 안내된다

**테스트 항목**: 첫 주(데이터 부족), 데이터 충분, 주/월 경계 전환, 캐시 갱신 확인, 빌드/타입/린트 에러.

---

### PROMPT 45 — 이미지 단어 카드

**목적**: 계획서 40장의 기능을 구현한다. 구체적인 명사 단어에 실제 이미지를 연결한다. 여기서부터 이미지/회화 학습(2차 버전 후반)이 시작된다.

**현재 프로젝트 상태**: PROMPT 44까지 완료(AI 개인화 완결). `Image` 테이블은 PROMPT 06에서 이미 존재하지만 사용되지 않고 있다.

**구현 범위**:
- 단어가 "구체 명사"인지 판별(품사+AI 분석 시점의 부가 분류, 또는 등록 시 사용자가 "이미지 유형" 선택 — **추가 결정 필요**, 기본값: AI 분석 단계에서 image_type 힌트를 함께 반환하도록 PROMPT 13 스키마를 확장)
- 이미지 검색/업로드: 초기에는 사용자가 직접 이미지를 업로드하거나 URL을 지정하는 방식으로 시작(자동 이미지 검색 API 연동은 비용/저작권 이슈로 **추가 결정 필요** 항목으로 별도 표시)
- 단어 상세/학습카드에 이미지 표시 영역 추가(이미지 없는 단어는 기존과 동일하게 텍스트만 표시 — 기존 레이아웃 깨지지 않도록)

**구현하지 않을 범위**: AI 이미지 생성(PROMPT 47, 별도 기능), 상황 이미지(PROMPT 46).

**기술적 요구사항**: Object Storage(PROMPT 28에서 이미 연동됨, 재사용), `Image.image_type='object'`.

**UI/UX 요구사항**: 이미지가 있는 카드/상세는 이미지 영역이 추가되지만 기존 텍스트 레이아웃 구조는 유지(전면 재설계 금지).

**기존 코드와의 연결**: PROMPT 06 `Image` 테이블, PROMPT 28 Object Storage 클라이언트, PROMPT 10/18 단어 상세·학습카드.

**완료 조건**:
- [ ] 이미지가 있는 단어와 없는 단어 모두 정상적으로 렌더링된다
- [ ] 업로드/연결한 이미지가 상세/학습카드에 일관되게 표시된다

**테스트 항목**: 이미지 없는 기존 단어(회귀 확인), 이미지 업로드 실패, 대용량 이미지, 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 46 — 상황 이미지 학습

**목적**: 계획서 41장의 기능을 구현한다. 추상적 표현을 상황 이미지+문장으로 학습한다.

**현재 프로젝트 상태**: PROMPT 45까지 완료(구체 명사 이미지 지원). 추상 표현용 상황 이미지는 아직 없다.

**구현 범위**:
- 추상 표현 단어에 대해 "상황 설명 텍스트"를 AI로 생성(계획서 41장 예시: わざわざ → "친구가 먼 곳에서 선물을 가져오기 위해 찾아오는 장면") — PROMPT 13 모듈 재사용
- 상황 설명 + 관련 예문을 함께 카드로 표시(`Image.image_type='situation'`) — ✅ **확정(사용자 결정)**: 실제 이미지 생성(계획서 42장)은 이번 프로젝트에서 채택하지 않으므로, 이 텍스트 상황 설명이 추상 표현의 **최종 형태**다(임시 단계가 아님). PROMPT 47은 스킵되므로 여기서 "우선 텍스트만"이 아니라 완결된 기능으로 구현한다.

**구현하지 않을 범위**: 실제 이미지 생성(PROMPT 47 — ✅ 확정: 로드맵에서 제외됨, 아래 참고).

**기술적 요구사항**: PROMPT 13 AI 모듈 재사용.

**UI/UX 요구사항**: 상황 설명은 짧은 카드 문구로, 예문과 함께 배치(D.1: 학습 흐름 화면이므로 은은한 삽화적 톤 허용).

**기존 코드와의 연결**: PROMPT 45 Image 구조, PROMPT 13 AI 모듈.

**완료 조건**:
- [ ] 추상 표현 단어에 상황 설명이 정상 생성/표시된다
- [ ] 구체 명사(PROMPT 45)와 추상 표현(이번 단계) UI가 자연스럽게 구분된다

**테스트 항목**: AI 생성 실패 폴백, 이미 상황 설명이 있는 단어 재요청(캐시), 모바일 레이아웃, 빌드/타입/린트 에러.

---

### PROMPT 47 — [스킵됨] AI 기억 이미지 생성

**상태**: ✅ **사용자 확정으로 이번 프로젝트에서 제외**(2026-08-21). 계획서 42장의 "AI 기억 이미지 생성" 기능은 비용 이슈로 채택하지 않기로 했다. 추상 표현 학습은 PROMPT 46의 상황 설명 텍스트로 충분히 대체하며, 이 PROMPT는 실행하지 않고 건너뛴다.

번호 결속성(다른 PROMPT의 "PROMPT 47" 참조, 전체 카운트)을 유지하기 위해 이 자리는 비워두되 번호는 삭제하지 않는다. 이후 사용량이 늘어나거나 비용이 부담스럽지 않은 시점에 이 기능을 다시 검토하고 싶다면, 원래 설계(AI 이미지 생성 API 연동 → PROMPT 46 상황 설명을 이미지 프롬프트로 변환 → Object Storage 저장 → `Image.image_type='ai_generated'`로 연결, 온디맨드 생성+캐싱, 사용자당 일일 생성 한도)를 그대로 되살려 별도로 진행하면 된다.

---

### PROMPT 48 — 한자 기억법 AI 생성

**목적**: 계획서 43장의 기능을 구현한다. 한자 구성 요소를 활용한 기억법을 AI로 생성한다.

**현재 프로젝트 상태**: PROMPT 46까지 완료(PROMPT 47은 스킵됨). 한자 시스템(Phase 9)은 이미 존재한다.

**구현 범위**:
- 한자 상세 페이지에 "AI 기억법 보기" 버튼 추가
- 한자의 부수/구성 정보를 PROMPT 13 AI 모듈에 전달하여 기억법 텍스트 생성(계획서 43장 예시: 休 = 亻(사람)+木(나무))
- 결과 캐싱(한자당 1회 생성 후 재사용, 사용자가 "다시 생성" 요청 시에만 재호출)

**구현하지 않을 범위**: 없음.

**기술적 요구사항**: PROMPT 13 AI 모듈 재사용, PROMPT 33 한자 데이터(부수 정보) 활용.

**UI/UX 요구사항**: 한자 상세 페이지(PROMPT 34) 기존 레이아웃에 섹션 추가(재작성 금지).

**기존 코드와의 연결**: PROMPT 34 한자 상세, PROMPT 13 AI 모듈.

**완료 조건**:
- [ ] 기억법이 부수 정보에 기반하여 자연스럽게 생성된다
- [ ] 캐싱으로 동일 한자 재요청 시 중복 비용이 발생하지 않는다

**테스트 항목**: 부수 정보 누락 한자 처리, AI 실패 폴백, 재생성 요청, 빌드/타입/린트 에러.

---

### PROMPT 49 — AI 회화 학습 + 오늘 단어 사용 미션

**목적**: 계획서 46~47장의 기능을 구현한다. 오늘 배운 단어를 실제 대화에서 사용하도록 유도한다.

**현재 프로젝트 상태**: PROMPT 48까지 완료. 오늘의 학습(PROMPT 17)에서 "오늘 배운 단어" 목록을 조회할 수 있는 구조가 이미 존재한다.

**구현 범위**:
- AI 회화 세션 UI(채팅 형태), 세션 시작 시 오늘 배운 단어 목록을 컨텍스트로 AI에 전달
- 사용자 발화에 대한 AI 응답 + 자연스러운 표현 첨삭(계획서 46장 예시 형태)
- 대화 중 오늘 단어 사용 여부 자동 판정(텍스트 매칭 + AI 보조 판정) 및 "오늘의 단어 사용" 체크리스트 갱신(계획서 47장: "3/4 사용 완료")
- 대화 세션은 저장하지 않거나(비용/개인정보 고려) 최소한만 로깅 — **추가 결정 필요**(기본값: 세션 히스토리는 저장하지 않고 사용 여부 판정 결과만 저장)

**구현하지 않을 범위**: 발음 평가(Phase 12, 음성 관련 별도 기능).

**기술적 요구사항**: PROMPT 13 AI 모듈 확장(대화형 프롬프트, 멀티턴 컨텍스트 관리), Timeout/Rate Limit.

**UI/UX 요구사항**: 채팅 UI는 D.3 컴포넌트 재사용(말풍선 Card 변형), 사용 완료 미션은 Quest Card 스타일 재사용(PROMPT 05).

**기존 코드와의 연결**: PROMPT 17 오늘의 학습 데이터, PROMPT 13 AI 모듈, PROMPT 05 Quest Card.

**완료 조건**:
- [ ] 대화가 멀티턴으로 자연스럽게 이어진다
- [ ] 오늘 단어 사용 여부가 정확히 판정되고 체크리스트에 반영된다
- [ ] 세션 종료 시 요약이 제공된다

**테스트 항목**: 오늘 배운 단어가 0개인 경우, 대화 중 AI 실패, 사용 여부 오탐/미탐 케이스, 모바일 채팅 UX, 빌드/타입/린트 에러.

---

### PROMPT 50 — 카메라 사물 단어장 / 여행 사진 단어장

**목적**: 계획서 48~49장의 기능을 구현한다. 주변 사물/여행 사진에서 AI가 단어를 추출한다.

**현재 프로젝트 상태**: PROMPT 49까지 완료. 사진 업로드(PROMPT 28~29)와 AI 단어 분석(PROMPT 13/30) 파이프라인이 이미 존재한다.

**구현 범위**:
- 이 기능은 PROMPT 28~32(사진 OCR 단어장) 파이프라인과 유사하지만 **OCR이 아니라 이미지 인식(사물 인식)**이 필요하다는 점이 다르다 — PROMPT 29 OCR 모듈과는 별도로 이미지 인식 AI 호출 경로 추가(멀티모달 LLM의 이미지 인식 기능 활용 검토, 신규 벤더 도입은 신중히)
- 사진 속 사물을 인식하여 일본어 단어 후보 목록 생성(계획서 48장 예시: 책상 사진 → 机/椅子/パソコン 등) → PROMPT 30의 AI 단어 정보 생성 파이프라인 재사용
- 여행 사진의 경우 동일 파이프라인을 사용하되 "여행" 컨텍스트 힌트를 프롬프트에 추가(계획서 49장)
- 검수/중복 검사 단계는 PROMPT 31~32를 그대로 재사용(신규 UI 중복 생성 금지)

**구현하지 않을 범위**: 없음.

**기술적 요구사항**: 멀티모달 AI 호출(이미지 입력), PROMPT 30/31/32 파이프라인 재사용.

**UI/UX 요구사항**: PROMPT 28 업로드 화면에 "사물 인식으로 추가" / "여행 사진으로 추가" 진입점 추가(기존 "사진으로 단어 추가" 메뉴 확장, 신규 메뉴 남발 금지).

**기존 코드와의 연결**: PROMPT 28~32 전체 파이프라인.

**완료 조건**:
- [ ] 사물 사진에서 계획서 48장 예시 수준의 단어들이 추출된다
- [ ] 여행 사진에서도 정상 동작하며 기존 OCR 경로와 혼동되지 않는다
- [ ] 검수/중복검사 단계가 기존과 동일하게 동작한다

**테스트 항목**: 사물이 명확한 사진, 사물이 불분명한 사진, 여러 사물이 섞인 사진, 검수/중복 흐름 재확인, 빌드/타입/린트 에러.

---

### PROMPT 51 — [체크포인트] 2차 버전 통합 점검

**목적**: PROMPT 38~50(AI 개인화 + 이미지/회화)까지의 기능을 1~1.5차 버전과 함께 통합 검증한다. **새 기능을 추가하지 않는다.**

**현재 프로젝트 상태**: 계획서의 핵심 기능(1~2차 버전) 전체가 구현되어 있다.

**구현 범위**:
- 계획서 62장의 "최종 사용자 학습 흐름" 전체를 E2E로 재현: 로그인 → 오늘의 학습 확인 → 새 단어 → 각 복습 단계 → 오답 복습 → 오늘의 한자 → AI 문장 만들기 → 학습 완료, 그리고 신규 단어 발견 시 직접입력/사진촬영 → AI 분석 → 검수 → 등록 → 다음 학습부터 자동 출제까지 확인
- 게임화 수치, AI 개인화 분석, 이미지/회화 기능이 서로 충돌 없이 동작하는지 확인
- 성능(특히 AI 호출이 몰리는 화면)과 비용(중복 호출 여부) 재점검
- 발견된 버그 수정(신규 기능 금지)

**구현하지 않을 범위**: Phase 12(고급 확장) 이후 기능.

**기술적 요구사항**: 없음(검증/버그 수정만).

**UI/UX 요구사항**: 기존 디자인 시스템 범위 내 수정만.

**기존 코드와의 연결**: PROMPT 01~50 전체.

**완료 조건**:
- [ ] 계획서 62장 흐름이 처음부터 끝까지 에러 없이 완주된다
- [ ] AI 관련 기능들의 중복 호출/캐시 미스가 비정상적으로 발생하지 않는다
- [ ] 빌드/타입/린트 전부 통과한다

**테스트 항목**: 전체 E2E 플로우, AI 기능 동시 사용 시나리오, 반응형 3종, 다크모드, 느린 네트워크에서의 AI 대기 UX.


### PROMPT 52 — 한자 획순 애니메이션

**목적**: 계획서 44장의 기능을 구현한다. 여기서부터 Phase 12(선택적 고급 확장)이다 — 계획서가 명시적으로 "향후 확장"이라 표시한 영역이므로, 우선순위는 낮고 필요 시 건너뛸 수 있다.

**현재 프로젝트 상태**: 1~2차 버전 전체(PROMPT 01~51)가 완성되어 있다. 한자 상세 페이지(PROMPT 34)는 존재하나 획순 정보는 없다.

**구현 범위**:
- 획순 데이터 소스 확보(공개 획순 데이터셋 또는 라이브러리 검토 — 신규 라이브러리 도입 전 B섹션 원칙(13장)에 따라 유지보수 활발성/번들 크기 검토)
- 한자 상세 페이지에 획순 애니메이션 표시(단계별 재생 또는 자동 재생)
- 기존 한자 상세 레이아웃(PROMPT 34/48)에 섹션으로 추가(재작성 금지)

**구현하지 않을 범위**: 따라쓰기(PROMPT 53, 별도 기능).

**기술적 요구사항**: 획순 데이터/라이브러리 선정, SVG 기반 애니메이션 권장(번들 크기 고려).

**UI/UX 요구사항**: 재생/일시정지 컨트롤, 모바일에서도 매끄럽게 동작.

**기존 코드와의 연결**: PROMPT 34/48 한자 상세 페이지.

**완료 조건**:
- [ ] 주요 한자에서 획순 애니메이션이 정확히 재생된다
- [ ] 데이터가 없는 한자는 이전과 동일하게(획순 섹션만 생략) 정상 표시된다

**테스트 항목**: 획순 데이터 유무에 따른 폴백, 모바일 재생 성능, 빌드/타입/린트 에러.

---

### PROMPT 53 — 한자 따라쓰기

**목적**: 계획서 45장의 기능을 구현한다.

**현재 프로젝트 상태**: PROMPT 52까지 완료(획순 애니메이션 존재).

**구현 범위**:
- 터치/스타일러스 입력을 받는 캔버스 컴포넌트(한자 표시 → 획순 보기 → 한자 숨기기 → 직접 따라쓰기)
- 필기 결과 저장 여부는 선택 사항(정확도 평가 없이 연습 목적이면 저장 불필요 — **추가 결정 필요**, 기본값: 저장하지 않고 연습 전용으로 구현)

**구현하지 않을 범위**: AI 필기 인식/정확도 평가(계획서 45장 "향후 확장"으로 명시된 부분 — 이번 단계에서 구현하지 않는다).

**기술적 요구사항**: Canvas API 기반 필기 컴포넌트(신규 라이브러리 최소화, 기본 Canvas API로 우선 구현 검토).

**UI/UX 요구사항**: 모바일 터치 우선 설계(계획서 58장).

**기존 코드와의 연결**: PROMPT 52 획순 데이터, PROMPT 34 한자 상세.

**완료 조건**:
- [ ] 한자 표시/획순보기/숨기기/따라쓰기 4단계가 모두 동작한다
- [ ] 모바일 터치와 데스크탑 마우스 양쪽에서 정상 동작한다

**테스트 항목**: 터치 입력, 마우스 입력, 캔버스 초기화, 모바일 성능, 빌드/타입/린트 에러.

---

### PROMPT 54 — 음성 학습(TTS)

**목적**: 계획서 50장의 기능을 구현한다. B섹션에서 TTS 제공자를 확정한 뒤 진행한다.

**현재 프로젝트 상태**: PROMPT 53까지 완료.

**구현 범위**:
- TTS API 연동(일본어 음성 합성)
- 단어 상세/학습카드/퀴즈에 발음 재생 버튼(🔊) 추가
- 생성된 음성 캐싱(동일 단어 재생성 방지, Object Storage에 저장)
- 퀴즈에 "듣고 맞추기" 유형 추가(계획서 50장: "[음성 재생] 들린 단어를 입력하세요") — PROMPT 19 퀴즈 엔진 확장

**구현하지 않을 범위**: 발음 평가/STT(PROMPT 55).

**기술적 요구사항**: TTS API, 오디오 캐싱, PROMPT 19 퀴즈 엔진 확장.

**UI/UX 요구사항**: 재생 버튼은 기존 카드/상세 레이아웃에 자연스럽게 통합(아이콘 버튼 하나 추가 수준, 레이아웃 재작성 금지).

**기존 코드와의 연결**: PROMPT 10/18/19 단어 상세·학습카드·퀴즈, PROMPT 28 Storage.

**완료 조건**:
- [ ] 주요 화면에서 발음 재생이 정상 동작한다
- [ ] 듣기 퀴즈 유형이 기존 퀴즈 플로우에 자연스럽게 통합된다
- [ ] 캐싱으로 동일 단어 재생성 비용이 발생하지 않는다

**테스트 항목**: 재생 성공/실패, 캐시 히트, 듣기 퀴즈 정답/오답, 모바일 오디오 재생 정책(자동재생 제한 등), 빌드/타입/린트 에러.

---

### PROMPT 55 — 발음 평가(STT, 확장 기능)

**목적**: 계획서 51장의 기능을 구현한다. 계획서 자체가 "향후 발전시킬 수 있다"고 명시한 확장 기능이므로 우선순위가 가장 낮다.

**현재 프로젝트 상태**: PROMPT 54까지 완료(TTS 존재).

**구현 범위**:
- 음성 인식(STT) API 연동, 사용자 발음을 텍스트로 변환 후 목표 발음과 비교
- 정확도(%) 표시(계획서 51장 예시)
- 장음/촉음/억양 등 세부 분석은 계획서가 "향후 확장"으로 명시 → 이번 단계에서는 기본 정확도 비교까지만

**구현하지 않을 범위**: 세부 음운 분석(장음/촉음/억양 정확도).

**기술적 요구사항**: STT API, 마이크 권한 처리(브라우저), 신규 라이브러리 도입 시 B섹션 원칙 재검토.

**UI/UX 요구사항**: 마이크 녹음 UI, 결과는 단순 정확도 수치로.

**기존 코드와의 연결**: PROMPT 54 TTS 목표 발음 데이터.

**완료 조건**:
- [ ] 녹음 → 인식 → 정확도 비교까지 동작한다
- [ ] 마이크 권한 거부 시 명확히 안내된다

**테스트 항목**: 권한 거부, 인식 실패, 다양한 정확도 케이스, 브라우저 호환성, 빌드/타입/린트 에러.

---

### PROMPT 56 — PWA 전환

**목적**: 계획서 58장의 "향후 PWA 또는 모바일 앱으로 확장" 요구를 구현한다.

**현재 프로젝트 상태**: PROMPT 55까지 완료. 지금까지 반응형 웹으로만 개발되어 있다.

**구현 범위**:
- 매니페스트(manifest.json), 서비스 워커 기본 설정(오프라인 캐싱은 정적 자산 위주로 최소화, 학습 데이터 오프라인 동기화는 범위 밖)
- 홈 화면 추가(설치) 프롬프트
- 아이콘/스플래시 화면(D.2 디자인 토큰 기반 브랜드 아이콘)

**구현하지 않을 범위**: 완전한 오프라인 학습 지원(데이터 동기화 등, 계획서 미언급 — 필요 시 별도 논의).

**기술적 요구사항**: Next.js PWA 설정(신규 라이브러리 도입 시 유지보수성 확인).

**UI/UX 요구사항**: 설치 후 앱처럼 보이는 최소한의 처리(상태바 색상 등, D.2 토큰 기반).

**기존 코드와의 연결**: 기존 전체 화면(신규 화면 없음, 설정 추가 성격).

**완료 조건**:
- [ ] 모바일 브라우저에서 홈 화면에 추가 가능하다
- [ ] 설치 후 기본 화면들이 정상 동작한다

**테스트 항목**: iOS/Android 설치 플로우, 오프라인 상태에서의 기본 동작(에러 처리 확인), 빌드/타입/린트 에러.

---

### PROMPT 57 — 브라우저 확장 프로그램

**목적**: 계획서 57장의 기능을 구현한다. 이 기능은 웹 서비스와 별도의 프로젝트(Chrome 확장)로 개발되므로 착수 전 범위를 명확히 사용자와 재확인할 것을 권장한다.

**현재 프로젝트 상태**: 웹 서비스 본체(PROMPT 01~56)가 완성되어 있다.

**구현 범위**:
- 별도 Chrome 확장 프로젝트 스캐폴딩(manifest v3)
- 웹페이지에서 텍스트 드래그 → 우클릭 메뉴 "내 일본어 단어장에 추가"
- 확장에서 웹 서비스 API(PROMPT 13 AI 분석 API 등)를 인증된 상태로 호출(토큰 공유 방식 설계 필요)

**구현하지 않을 범위**: 확장 자체의 복잡한 UI(간단한 컨텍스트 메뉴 + 토스트 알림 수준).

**기술적 요구사항**: Chrome Extension Manifest V3, 웹 서비스와의 인증 토큰 공유 방식(**추가 결정 필요**).

**UI/UX 요구사항**: 확장은 별도 프로젝트이므로 D 디자인 시스템을 완전히 이식하기보다 최소한의 톤앤매너만 맞춘다.

**기존 코드와의 연결**: PROMPT 13 AI 분석 API, PROMPT 07 인증 방식(토큰 재사용 방식 설계 필요).

**완료 조건**:
- [ ] 드래그한 단어가 확장을 통해 웹 서비스 단어장에 정상 등록된다
- [ ] 미인증 상태에서 명확한 로그인 안내가 표시된다

**테스트 항목**: 다양한 웹사이트에서의 드래그 선택, 인증 만료 처리, 등록 실패 처리.

---

### PROMPT 58 — 친구 기능 / 단어장 공유 / 커뮤니티 단어장

**목적**: 계획서 57장 하단 목록(Phase 5)의 소셜 기능을 구현한다.

**현재 프로젝트 상태**: PROMPT 57까지 완료. `VocabularyBook.is_public` 필드는 PROMPT 09에서 이미 존재하지만 실제 공개 열람 기능은 구현되지 않았다.

**구현 범위**:
- 친구 추가/목록(간단한 팔로우 방식 — 계획서에 구체 스펙 없음, **추가 결정 필요**)
- 단어장 공유(is_public=true인 단어장을 다른 사용자가 조회/가져오기(복제) 가능하게)
- 커뮤니티 단어장 탐색 페이지(공개 단어장 목록, 인기순/최신순)

**구현하지 않을 범위**: 소셜 피드, 댓글, 랭킹 등 계획서에 없는 부가 기능(추측 확대 금지).

**기술적 요구사항**: 신규 테이블(Friend, 공유 관련) 설계, 권한 검증(본인 단어장이 아닌 경우 읽기 전용 접근만).

**UI/UX 요구사항**: 커뮤니티 화면은 정보 우선 톤(목록/카드), 과도한 게임 연출 지양.

**기존 코드와의 연결**: PROMPT 09 VocabularyBook.is_public, PROMPT 07 인증.

**완료 조건**:
- [ ] 공개 단어장이 다른 사용자에게 정상 노출된다
- [ ] 가져오기(복제) 시 원본과 독립된 사본이 생성된다
- [ ] 비공개 단어장은 절대 노출되지 않는다(권한 검증 필수)

**테스트 항목**: 공개/비공개 경계 검증(보안 중요), 가져오기 후 원본 수정이 사본에 영향 없는지, 대량 커뮤니티 목록 페이지네이션, 빌드/타입/린트 에러.

---

### PROMPT 59 — 반응형/모바일 UX 최종 점검 & 성능 최적화

**목적**: 전체 서비스의 반응형 완성도와 성능을 최종적으로 끌어올린다. 새로운 기능을 추가하지 않는다.

**현재 프로젝트 상태**: 계획서의 모든 기능(1차~확장, PROMPT 01~58)이 구현되어 있다.

**구현 범위**:
- 전체 화면 반응형 재점검(Desktop/Tablet/Mobile), 특히 계획서 58장이 강조한 모바일 우선 기능(사진 단어장 등록/플래시카드/퀴즈/한자 따라쓰기/음성학습/카메라 사물인식) 집중 점검
- 성능 최적화: 코드 스플리팅, 이미지 최적화(next/image), 불필요한 리렌더링 제거, DB 쿼리 N+1 점검, API 응답 캐싱(TanStack Query staleTime 조정)
- Lighthouse 등으로 성능/접근성/SEO 기본 점수 측정 및 개선
- 번들 크기 점검(불필요하게 커진 의존성 확인)

**구현하지 않을 범위**: 신규 기능 없음.

**기술적 요구사항**: 기존 스택 내 최적화만, 신규 라이브러리는 성능 측정 도구(Lighthouse 등) 외 최소화.

**UI/UX 요구사항**: 기존 디자인 시스템 유지, 최적화 과정에서 시각적 변화가 없어야 한다(회귀 방지).

**기존 코드와의 연결**: 전체 코드베이스.

**완료 조건**:
- [ ] 모든 주요 화면이 3개 breakpoint에서 정상 동작한다
- [ ] Lighthouse 성능 점수가 합리적 수준(목표치는 실제 측정 후 팀 논의)으로 개선된다
- [ ] N+1 쿼리 등 명백한 성능 이슈가 제거된다

**테스트 항목**: 각 breakpoint별 회귀 테스트, 저사양 기기/느린 네트워크 시뮬레이션, 번들 크기 비교(전/후), 빌드/타입/린트 에러.

---

### PROMPT 60 — 통합 테스트 & QA

**목적**: 배포 전 마지막 품질 검증을 수행한다.

**현재 프로젝트 상태**: PROMPT 59까지 완료(최적화 완료).

**구현 범위**:
- 핵심 흐름에 대한 자동화 테스트 작성(회원가입~학습~퀴즈~통계 등 핵심 E2E 시나리오, 이미 존재하는 로직에 대한 단위 테스트 보강 — PROMPT 16/19 등 순수 함수 위주)
- 수동 QA 체크리스트 전 항목 재실행(지침 11의 검증 항목: 빌드/Type/Lint/Runtime/API/DB Migration/반응형/기존 기능 회귀/빈 데이터/잘못된 입력/API 실패/로딩/에러 상태)
- 접근성 최종 점검(키보드 내비게이션, 스크린리더 기본 호환)
- 보안 점검(인증 우회 가능성, 타 사용자 데이터 접근 가능성 재검증 — 특히 PROMPT 58 공유 기능)

**구현하지 않을 범위**: 신규 기능 없음, 발견된 버그 수정만 수행.

**기술적 요구사항**: 테스트 프레임워크(Vitest/Playwright 등 — 기존 스택과 충돌 없는 선에서 도입, B섹션 원칙 적용).

**UI/UX 요구사항**: 없음.

**기존 코드와의 연결**: 전체 코드베이스.

**완료 조건**:
- [ ] 핵심 E2E 시나리오 자동화 테스트가 통과한다
- [ ] 수동 QA 체크리스트 전 항목이 통과한다
- [ ] 보안 점검에서 타 사용자 데이터 노출 이슈가 발견되지 않는다

**테스트 항목**: 지침 11 전체 목록(빌드/Type/Lint/Runtime/API/Migration/반응형/회귀/빈 데이터/잘못된 입력/API 실패/로딩/에러), 보안 시나리오(권한 우회 시도).

---

### PROMPT 61 — 배포(CI/CD, 환경 분리, 모니터링)

**목적**: 서비스를 실제 사용자에게 배포한다.

**현재 프로젝트 상태**: PROMPT 60까지 완료(QA 통과). 아직 프로덕션 환경은 없다.

**구현 범위**:
- 배포 환경 구성(B섹션 결정: Vercel + 관리형 Postgres 등), 환경변수 프로덕션 값 설정(비밀값은 안전하게 관리)
- 개발/스테이징/프로덕션 환경 분리
- CI 파이프라인: PR 시 자동 빌드/타입체크/린트/테스트 실행
- DB 마이그레이션 배포 절차 확립(프로덕션 마이그레이션 시 롤백 계획 포함)
- 최소한의 모니터링/에러 로깅 연동(에러 트래킹 도구 — 신규 도입 시 B섹션 원칙 적용)
- 도메인 연결, HTTPS 설정

**구현하지 않을 범위**: 없음(배포로 로드맵 완결).

**기술적 요구사항**: CI/CD, 환경 분리, 시크릿 관리, 에러 모니터링.

**UI/UX 요구사항**: 없음.

**기존 코드와의 연결**: 전체 프로젝트.

**완료 조건**:
- [ ] 프로덕션 URL에서 서비스가 정상 동작한다
- [ ] CI에서 빌드/테스트가 자동으로 실행된다
- [ ] 마이그레이션이 프로덕션 DB에 안전하게 적용된다
- [ ] 에러 발생 시 모니터링 도구에서 확인 가능하다

**테스트 항목**: 프로덕션 환경 스모크 테스트(핵심 흐름 재확인), 마이그레이션 롤백 시나리오, 환경변수 누락 시 배포 실패 여부(fail-fast 확인), 실제 도메인 HTTPS 접속.

---

## 이 문서 사용 방법

1. B 섹션의 핵심 기술/제품 결정 사항은 2026-08-21에 사용자 확인을 거쳐 모두 확정되었습니다(AI: Claude API / OCR: Google Cloud Vision / 소셜 로그인: 구글만 / 모바일 하단 탭: 4개(홈·단어장·한자·MY) / AI 이미지 생성: 미채택 / TTS·STT: 계획대로 Phase 12 / 배포: Vercel+관리형 Postgres / 유료화: 없음 / 상용한자: 관리 기능 없는 고정 내장 데이터). PROMPT 01부터는 이 확정값을 그대로 따라 진행하면 됩니다.
2. PROMPT 01을 복사하여 AI 코딩 도구에 전달하고, 완료되면 완료 조건 체크리스트를 확인합니다.
3. 다음 PROMPT로 넘어가기 전, 테스트 항목에 있는 실패/예외 케이스까지 확인합니다.
4. 각 PROMPT는 "이전 단계 결과가 이미 존재한다"고 전제하므로, 순서를 건너뛰거나 뒤바꾸지 않습니다.
5. 계획서에 없어 이 문서가 새로 정의한 값(Level 계산식, Quest 목록, 업적 임계값 등)은 실제 사용해보면서 조정이 필요할 수 있습니다 — 단, 조정 시에도 컬럼명/API 규격 자체는 바꾸지 않고 값만 바꾸는 것을 원칙으로 합니다.
