import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

// 독립 실행 스크립트라 prisma/seed.ts와 동일한 방식으로 env를 직접 로드한다.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const TEST_EMAIL = "review-test@example.com";
const TEST_PASSWORD = "ReviewTest123!";
const TEST_NICKNAME = "복습테스트";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS);

type JlptLevel = "N5" | "N4";
type LearningStatus = "NEW" | "LEARNING" | "REVIEW" | "WEAK" | "MASTERED";

interface WordSeed {
  word: string;
  reading: string;
  partOfSpeech: string;
  jlptLevel: JlptLevel;
  meanings: string[];
  example: { japanese: string; korean: string };
  favorite?: boolean;
  tag?: string;
  /** 없으면 학습 전 새 단어(NEW) 상태 그대로 둔다. */
  review?: {
    learningStatus: LearningStatus;
    intervalStage: number;
    correctCount: number;
    wrongCount: number;
    lastReviewedDaysAgo: number;
    /** next_review_at을 "오늘"(0) 또는 그 이전(음수 아님, 0 이하만 사용)으로 둬서 오늘 큐에 뜨게 한다. */
    nextReviewInDays: number;
  };
  /** WEAK 단어의 오답노트 검증용 — 실제로 ReviewHistory에 남길 채점 기록. */
  reviewHistory?: { quizType: string; result: boolean; daysAgo: number }[];
}

// --- 단어장 1: JLPT N5 필수단어 (전부 NEW — "오늘의 학습"의 새 단어 버킷 확인용) --------------
const BOOK_1_NEW_WORDS: WordSeed[] = [
  {
    word: "食べる",
    reading: "たべる",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["먹다"],
    example: { japanese: "朝ごはんを食べる。", korean: "아침밥을 먹는다." },
    tag: "필수",
  },
  {
    word: "飲む",
    reading: "のむ",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["마시다"],
    example: { japanese: "水を飲む。", korean: "물을 마신다." },
    tag: "필수",
  },
  {
    word: "見る",
    reading: "みる",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["보다"],
    example: { japanese: "映画を見る。", korean: "영화를 본다." },
    tag: "필수",
  },
  {
    word: "行く",
    reading: "いく",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["가다"],
    example: { japanese: "学校に行く。", korean: "학교에 간다." },
  },
  {
    word: "来る",
    reading: "くる",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["오다"],
    example: { japanese: "友達が来る。", korean: "친구가 온다." },
  },
  {
    word: "学校",
    reading: "がっこう",
    partOfSpeech: "명사",
    jlptLevel: "N5",
    meanings: ["학교"],
    example: { japanese: "学校は九時に始まる。", korean: "학교는 9시에 시작한다." },
  },
  {
    word: "先生",
    reading: "せんせい",
    partOfSpeech: "명사",
    jlptLevel: "N5",
    meanings: ["선생님"],
    example: { japanese: "先生はやさしい。", korean: "선생님은 상냥하다." },
  },
  {
    word: "友達",
    reading: "ともだち",
    partOfSpeech: "명사",
    jlptLevel: "N5",
    meanings: ["친구"],
    example: { japanese: "友達と遊ぶ。", korean: "친구와 논다." },
    favorite: true,
  },
  {
    word: "水",
    reading: "みず",
    partOfSpeech: "명사",
    jlptLevel: "N5",
    meanings: ["물"],
    example: { japanese: "水を一杯ください。", korean: "물 한 잔 주세요." },
  },
  {
    word: "本",
    reading: "ほん",
    partOfSpeech: "명사",
    jlptLevel: "N5",
    meanings: ["책"],
    example: { japanese: "本を読む。", korean: "책을 읽는다." },
    favorite: true,
  },
];

// --- 단어장 2: 일상 회화 표현 (어제/3일/7일/14일+ 복습 버킷 확인용) -----------------------------
const BOOK_2_REVIEW_WORDS: WordSeed[] = [
  {
    word: "買う",
    reading: "かう",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["사다"],
    example: { japanese: "服を買う。", korean: "옷을 산다." },
    review: {
      learningStatus: "LEARNING",
      intervalStage: 0,
      correctCount: 1,
      wrongCount: 0,
      lastReviewedDaysAgo: 1,
      nextReviewInDays: 0,
    },
  },
  {
    word: "話す",
    reading: "はなす",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["이야기하다", "말하다"],
    example: { japanese: "日本語で話す。", korean: "일본어로 이야기한다." },
    review: {
      learningStatus: "LEARNING",
      intervalStage: 0,
      correctCount: 1,
      wrongCount: 0,
      lastReviewedDaysAgo: 1,
      nextReviewInDays: 0,
    },
  },
  {
    word: "聞く",
    reading: "きく",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["듣다", "묻다"],
    example: { japanese: "音楽を聞く。", korean: "음악을 듣는다." },
    review: {
      learningStatus: "LEARNING",
      intervalStage: 0,
      correctCount: 1,
      wrongCount: 0,
      lastReviewedDaysAgo: 1,
      nextReviewInDays: 0,
    },
  },
  {
    word: "書く",
    reading: "かく",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["쓰다"],
    example: { japanese: "手紙を書く。", korean: "편지를 쓴다." },
    review: {
      learningStatus: "LEARNING",
      intervalStage: 1,
      correctCount: 2,
      wrongCount: 0,
      lastReviewedDaysAgo: 3,
      nextReviewInDays: 0,
    },
  },
  {
    word: "読む",
    reading: "よむ",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["읽다"],
    example: { japanese: "新聞を読む。", korean: "신문을 읽는다." },
    review: {
      learningStatus: "LEARNING",
      intervalStage: 1,
      correctCount: 2,
      wrongCount: 0,
      lastReviewedDaysAgo: 3,
      nextReviewInDays: 0,
    },
  },
  {
    word: "走る",
    reading: "はしる",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["달리다"],
    example: { japanese: "公園を走る。", korean: "공원을 달린다." },
    review: {
      learningStatus: "LEARNING",
      intervalStage: 1,
      correctCount: 2,
      wrongCount: 0,
      lastReviewedDaysAgo: 3,
      nextReviewInDays: 0,
    },
  },
  {
    word: "高い",
    reading: "たかい",
    partOfSpeech: "형용사",
    jlptLevel: "N5",
    meanings: ["비싸다", "높다"],
    example: { japanese: "このかばんは高い。", korean: "이 가방은 비싸다." },
    review: {
      learningStatus: "REVIEW",
      intervalStage: 2,
      correctCount: 3,
      wrongCount: 0,
      lastReviewedDaysAgo: 7,
      nextReviewInDays: 0,
    },
  },
  {
    word: "安い",
    reading: "やすい",
    partOfSpeech: "형용사",
    jlptLevel: "N5",
    meanings: ["싸다"],
    example: { japanese: "この店は安い。", korean: "이 가게는 싸다." },
    review: {
      learningStatus: "REVIEW",
      intervalStage: 2,
      correctCount: 3,
      wrongCount: 0,
      lastReviewedDaysAgo: 7,
      nextReviewInDays: 0,
    },
  },
  {
    word: "元気",
    reading: "げんき",
    partOfSpeech: "형용사",
    jlptLevel: "N5",
    meanings: ["건강하다", "활기차다"],
    example: { japanese: "元気な子供。", korean: "건강한 아이." },
    review: {
      learningStatus: "REVIEW",
      intervalStage: 3,
      correctCount: 4,
      wrongCount: 0,
      lastReviewedDaysAgo: 14,
      nextReviewInDays: 0,
    },
  },
  {
    word: "大切",
    reading: "たいせつ",
    partOfSpeech: "형용사",
    jlptLevel: "N5",
    meanings: ["소중하다", "중요하다"],
    example: { japanese: "家族は大切だ。", korean: "가족은 소중하다." },
    review: {
      learningStatus: "REVIEW",
      intervalStage: 3,
      correctCount: 4,
      wrongCount: 0,
      lastReviewedDaysAgo: 14,
      nextReviewInDays: 0,
    },
  },
];

// --- 단어장 3: 헷갈리는 단어 (WEAK — 오답노트/오답 복습 확인용) ------------------------------
// 앞 5개는 퀴즈로, 뒤 5개는 플래시카드로 틀린 것처럼 ReviewHistory를 남겨서
// "플래시카드 오답도 오답노트에 잡히는지"(최근에 고친 버그)를 함께 검증한다.
const BOOK_3_WEAK_WORDS: WordSeed[] = [
  {
    word: "上げる",
    reading: "あげる",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["올리다", "주다"],
    example: { japanese: "手を上げる。", korean: "손을 올린다." },
    tag: "헷갈림",
    review: weakReview(),
    reviewHistory: quizWrongHistory(),
  },
  {
    word: "下げる",
    reading: "さげる",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["내리다"],
    example: { japanese: "音量を下げる。", korean: "음량을 내린다." },
    tag: "헷갈림",
    review: weakReview(),
    reviewHistory: quizWrongHistory(),
  },
  {
    word: "開ける",
    reading: "あける",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["열다"],
    example: { japanese: "窓を開ける。", korean: "창문을 연다." },
    tag: "헷갈림",
    review: weakReview(),
    reviewHistory: quizWrongHistory(),
  },
  {
    word: "閉める",
    reading: "しめる",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["닫다"],
    example: { japanese: "ドアを閉める。", korean: "문을 닫는다." },
    tag: "헷갈림",
    review: weakReview(),
    reviewHistory: quizWrongHistory(),
  },
  {
    word: "貸す",
    reading: "かす",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["빌려주다"],
    example: { japanese: "友達に本を貸す。", korean: "친구에게 책을 빌려준다." },
    tag: "헷갈림",
    review: weakReview(),
    reviewHistory: quizWrongHistory(),
  },
  {
    word: "借りる",
    reading: "かりる",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["빌리다"],
    example: { japanese: "図書館で本を借りる。", korean: "도서관에서 책을 빌린다." },
    tag: "헷갈림",
    review: weakReview(),
    reviewHistory: flashcardWrongHistory(),
  },
  {
    word: "教える",
    reading: "おしえる",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["가르치다"],
    example: { japanese: "日本語を教える。", korean: "일본어를 가르친다." },
    tag: "헷갈림",
    review: weakReview(),
    reviewHistory: flashcardWrongHistory(),
  },
  {
    word: "習う",
    reading: "ならう",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["배우다"],
    example: { japanese: "ピアノを習う。", korean: "피아노를 배운다." },
    tag: "헷갈림",
    review: weakReview(),
    reviewHistory: flashcardWrongHistory(),
  },
  {
    word: "忘れる",
    reading: "わすれる",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["잊다"],
    example: { japanese: "傘を忘れる。", korean: "우산을 잊는다." },
    tag: "헷갈림",
    review: weakReview(),
    reviewHistory: flashcardWrongHistory(),
  },
  {
    word: "覚える",
    reading: "おぼえる",
    partOfSpeech: "동사",
    jlptLevel: "N4",
    meanings: ["외우다", "기억하다"],
    example: { japanese: "単語を覚える。", korean: "단어를 외운다." },
    tag: "헷갈림",
    favorite: true,
    review: weakReview(),
    reviewHistory: flashcardWrongHistory(),
  },
];

// WEAK 판정 기준(lib/srs/constants.ts): 누적 3회 이상 + 오답률 40% 이상.
function weakReview(): NonNullable<WordSeed["review"]> {
  return {
    learningStatus: "WEAK",
    intervalStage: 0,
    correctCount: 1,
    wrongCount: 2,
    lastReviewedDaysAgo: 1,
    nextReviewInDays: 0,
  };
}

function quizWrongHistory(): NonNullable<WordSeed["reviewHistory"]> {
  return [
    { quizType: "JA_TO_KO", result: false, daysAgo: 3 },
    { quizType: "JA_TO_KO", result: false, daysAgo: 2 },
    { quizType: "JA_TO_KO", result: true, daysAgo: 1 },
  ];
}

// 최근에 고친 버그 확인용 — 플래시카드 평가(review-result API)도 이 quiz_type으로
// ReviewHistory에 남아야 오답노트에 잡힌다.
function flashcardWrongHistory(): NonNullable<WordSeed["reviewHistory"]> {
  return [
    { quizType: "FLASHCARD", result: false, daysAgo: 3 },
    { quizType: "FLASHCARD", result: false, daysAgo: 2 },
    { quizType: "FLASHCARD", result: true, daysAgo: 1 },
  ];
}

async function seedBook(userId: string, bookName: string, bookDescription: string, words: WordSeed[]) {
  const book = await db.vocabularyBook.create({
    data: { user_id: userId, name: bookName, description: bookDescription, is_public: false },
  });

  for (const word of words) {
    const vocabulary = await db.vocabulary.create({
      data: {
        word: word.word,
        reading: word.reading,
        part_of_speech: word.partOfSpeech,
        jlpt_level: word.jlptLevel,
        meanings: { create: word.meanings.map((meaning) => ({ meaning })) },
        examples: { create: [{ ...word.example, source: "seed-test-account" }] },
      },
    });

    await db.vocabularyBookItem.create({
      data: { vocabulary_book_id: book.id, vocabulary_id: vocabulary.id },
    });

    const review = word.review;
    await db.userVocabulary.create({
      data: {
        user_id: userId,
        vocabulary_id: vocabulary.id,
        is_favorite: word.favorite ?? false,
        learning_status: review?.learningStatus ?? "NEW",
        interval_stage: review?.intervalStage ?? 0,
        correct_count: review?.correctCount ?? 0,
        wrong_count: review?.wrongCount ?? 0,
        last_reviewed_at: review ? daysAgo(review.lastReviewedDaysAgo) : null,
        next_review_at: review ? daysFromNow(review.nextReviewInDays) : null,
      },
    });

    if (word.tag) {
      const tag = await db.tag.upsert({
        where: { user_id_name: { user_id: userId, name: word.tag } },
        update: {},
        create: { user_id: userId, name: word.tag },
      });
      await db.vocabularyTag.create({
        data: { vocabulary_id: vocabulary.id, tag_id: tag.id },
      });
    }

    if (word.reviewHistory) {
      await db.reviewHistory.createMany({
        data: word.reviewHistory.map((entry) => ({
          user_id: userId,
          target_type: "vocab" as const,
          target_id: vocabulary.id,
          quiz_type: entry.quizType,
          result: entry.result,
          response_time: 2000,
          reviewed_at: daysAgo(entry.daysAgo),
        })),
      });
    }
  }

  return book;
}

async function main() {
  const existing = await db.user.findUnique({ where: { email: TEST_EMAIL } });
  if (existing) {
    throw new Error(
      `${TEST_EMAIL} 계정이 이미 있습니다. 다시 만들려면 먼저 이 계정을 지우고 실행하세요(user id: ${existing.id}).`,
    );
  }

  const password_hash = await bcrypt.hash(TEST_PASSWORD, 10);
  const user = await db.user.create({
    data: {
      email: TEST_EMAIL,
      password_hash,
      nickname: TEST_NICKNAME,
      jlpt_level: "N4",
      target_jlpt: "N3",
      daily_word_target: 10,
      daily_study_time: 20,
      purpose: ["JLPT 대비"],
    },
  });

  await seedBook(user.id, "JLPT N5 필수단어", "새 단어 학습 확인용 — 전부 미학습(NEW) 상태.", BOOK_1_NEW_WORDS);
  await seedBook(
    user.id,
    "일상 회화 표현",
    "복습 큐 확인용 — 어제/3일/7일/14일+ 복습이 골고루 섞여 있음.",
    BOOK_2_REVIEW_WORDS,
  );
  await seedBook(
    user.id,
    "헷갈리는 단어",
    "오답 복습/오답노트 확인용 — 전부 WEAK 상태, 절반은 퀴즈 오답 기록, 절반은 플래시카드 오답 기록.",
    BOOK_3_WEAK_WORDS,
  );

  console.log("테스트 계정 생성 완료");
  console.log("  email:", TEST_EMAIL);
  console.log("  password:", TEST_PASSWORD);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
