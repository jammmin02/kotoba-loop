import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

// 독립 실행 스크립트라 prisma/seed.ts와 동일한 방식으로 env를 직접 로드한다.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const TEST_EMAIL = "multi-book-test@example.com";
const TEST_PASSWORD = "MultiBook123!";
const TEST_NICKNAME = "멀티북테스트";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);

interface WordSeed {
  word: string;
  reading: string;
  meaning: string;
  example: { japanese: string; korean: string };
}

interface BookSeed {
  name: string;
  description: string;
  partOfSpeech: string;
  /** 이 단어장을 등록한 날(며칠 전) — 학습 캘린더의 "날짜별 등록 개수"를 다양하게 보여주기 위함. */
  registeredDaysAgo: number;
  words: WordSeed[];
}

// 커스텀 학습(단어장 다중 선택 + 게임 종류 선택) 테스트용 — 5개 단어장 x 10단어.
// 단어장마다 품사를 통일해 객관식 오답 풀이 잘 만들어지도록 했고, 모든 단어에 예문을
// 붙여 빈칸채우기/예문해석 유형도 문제없이 생성되게 했다.
const BOOKS: BookSeed[] = [
  {
    name: "동사 마스터 10",
    description: "커스텀 학습 테스트용 — N5 동사 10개.",
    partOfSpeech: "동사",
    registeredDaysAgo: 4,
    words: [
      { word: "食べる", reading: "たべる", meaning: "먹다", example: { japanese: "朝ご飯を食べる。", korean: "아침밥을 먹는다." } },
      { word: "飲む", reading: "のむ", meaning: "마시다", example: { japanese: "お茶を飲む。", korean: "차를 마신다." } },
      { word: "見る", reading: "みる", meaning: "보다", example: { japanese: "テレビを見る。", korean: "텔레비전을 본다." } },
      { word: "聞く", reading: "きく", meaning: "듣다", example: { japanese: "ラジオを聞く。", korean: "라디오를 듣는다." } },
      { word: "書く", reading: "かく", meaning: "쓰다", example: { japanese: "手紙を書く。", korean: "편지를 쓴다." } },
      { word: "読む", reading: "よむ", meaning: "읽다", example: { japanese: "本を読む。", korean: "책을 읽는다." } },
      { word: "買う", reading: "かう", meaning: "사다", example: { japanese: "りんごを買う。", korean: "사과를 산다." } },
      { word: "売る", reading: "うる", meaning: "팔다", example: { japanese: "花を売る。", korean: "꽃을 판다." } },
      { word: "走る", reading: "はしる", meaning: "달리다", example: { japanese: "毎朝走る。", korean: "매일 아침 달린다." } },
      { word: "泳ぐ", reading: "およぐ", meaning: "수영하다", example: { japanese: "プールで泳ぐ。", korean: "수영장에서 수영한다." } },
    ],
  },
  {
    name: "명사 마스터 10",
    description: "커스텀 학습 테스트용 — N5 명사 10개.",
    partOfSpeech: "명사",
    registeredDaysAgo: 3,
    words: [
      { word: "学校", reading: "がっこう", meaning: "학교", example: { japanese: "学校へ行く。", korean: "학교에 간다." } },
      { word: "会社", reading: "かいしゃ", meaning: "회사", example: { japanese: "会社で働く。", korean: "회사에서 일한다." } },
      { word: "病院", reading: "びょういん", meaning: "병원", example: { japanese: "病院に行く。", korean: "병원에 간다." } },
      { word: "図書館", reading: "としょかん", meaning: "도서관", example: { japanese: "図書館で勉強する。", korean: "도서관에서 공부한다." } },
      { word: "電車", reading: "でんしゃ", meaning: "전철", example: { japanese: "電車に乗る。", korean: "전철을 탄다." } },
      { word: "天気", reading: "てんき", meaning: "날씨", example: { japanese: "今日は天気がいい。", korean: "오늘은 날씨가 좋다." } },
      { word: "家族", reading: "かぞく", meaning: "가족", example: { japanese: "家族と旅行する。", korean: "가족과 여행한다." } },
      { word: "誕生日", reading: "たんじょうび", meaning: "생일", example: { japanese: "今日は誕生日だ。", korean: "오늘은 생일이다." } },
      { word: "財布", reading: "さいふ", meaning: "지갑", example: { japanese: "財布を忘れた。", korean: "지갑을 잊었다." } },
      { word: "時間", reading: "じかん", meaning: "시간", example: { japanese: "時間がない。", korean: "시간이 없다." } },
    ],
  },
  {
    name: "い형용사 마스터 10",
    description: "커스텀 학습 테스트용 — N5 い형용사 10개.",
    partOfSpeech: "い형용사",
    registeredDaysAgo: 2,
    words: [
      { word: "大きい", reading: "おおきい", meaning: "크다", example: { japanese: "この部屋は大きい。", korean: "이 방은 크다." } },
      { word: "小さい", reading: "ちいさい", meaning: "작다", example: { japanese: "犬が小さい。", korean: "개가 작다." } },
      { word: "新しい", reading: "あたらしい", meaning: "새롭다", example: { japanese: "新しい靴を買った。", korean: "새 신발을 샀다." } },
      { word: "古い", reading: "ふるい", meaning: "낡다", example: { japanese: "古い本を読む。", korean: "오래된 책을 읽는다." } },
      { word: "暑い", reading: "あつい", meaning: "덥다", example: { japanese: "今日は暑い。", korean: "오늘은 덥다." } },
      { word: "寒い", reading: "さむい", meaning: "춥다", example: { japanese: "冬は寒い。", korean: "겨울은 춥다." } },
      { word: "難しい", reading: "むずかしい", meaning: "어렵다", example: { japanese: "日本語は難しい。", korean: "일본어는 어렵다." } },
      { word: "易しい", reading: "やさしい", meaning: "쉽다", example: { japanese: "この問題は易しい。", korean: "이 문제는 쉽다." } },
      { word: "忙しい", reading: "いそがしい", meaning: "바쁘다", example: { japanese: "最近忙しい。", korean: "요즘 바쁘다." } },
      { word: "楽しい", reading: "たのしい", meaning: "즐겁다", example: { japanese: "旅行は楽しい。", korean: "여행은 즐겁다." } },
    ],
  },
  {
    name: "な형용사 마스터 10",
    description: "커스텀 학습 테스트용 — N5 な형용사 10개.",
    partOfSpeech: "な형용사",
    registeredDaysAgo: 1,
    words: [
      { word: "元気", reading: "げんき", meaning: "건강하다", example: { japanese: "元気な子供。", korean: "활기찬 아이." } },
      { word: "静か", reading: "しずか", meaning: "조용하다", example: { japanese: "静かな部屋。", korean: "조용한 방." } },
      { word: "便利", reading: "べんり", meaning: "편리하다", example: { japanese: "便利な道具。", korean: "편리한 도구." } },
      { word: "有名", reading: "ゆうめい", meaning: "유명하다", example: { japanese: "有名な歌手。", korean: "유명한 가수." } },
      { word: "親切", reading: "しんせつ", meaning: "친절하다", example: { japanese: "親切な人。", korean: "친절한 사람." } },
      { word: "大切", reading: "たいせつ", meaning: "소중하다", example: { japanese: "家族は大切だ。", korean: "가족은 소중하다." } },
      { word: "簡単", reading: "かんたん", meaning: "간단하다", example: { japanese: "簡単な料理。", korean: "간단한 요리." } },
      { word: "上手", reading: "じょうず", meaning: "잘하다", example: { japanese: "歌が上手だ。", korean: "노래를 잘한다." } },
      { word: "下手", reading: "へた", meaning: "서투르다", example: { japanese: "料理が下手だ。", korean: "요리가 서투르다." } },
      { word: "大変", reading: "たいへん", meaning: "힘들다", example: { japanese: "仕事が大変だ。", korean: "일이 힘들다." } },
    ],
  },
  {
    name: "부사 마스터 10",
    description: "커스텀 학습 테스트용 — N5 부사 10개.",
    partOfSpeech: "부사",
    registeredDaysAgo: 0,
    words: [
      { word: "とても", reading: "とても", meaning: "매우", example: { japanese: "とても暑い。", korean: "매우 덥다." } },
      { word: "あまり", reading: "あまり", meaning: "그다지", example: { japanese: "あまり好きじゃない。", korean: "그다지 좋아하지 않는다." } },
      { word: "すぐに", reading: "すぐに", meaning: "바로", example: { japanese: "すぐに来てください。", korean: "바로 와 주세요." } },
      { word: "いつも", reading: "いつも", meaning: "항상", example: { japanese: "いつも早起きする。", korean: "항상 일찍 일어난다." } },
      { word: "たくさん", reading: "たくさん", meaning: "많이", example: { japanese: "たくさん食べた。", korean: "많이 먹었다." } },
      { word: "少し", reading: "すこし", meaning: "조금", example: { japanese: "少し休みたい。", korean: "조금 쉬고 싶다." } },
      { word: "もう", reading: "もう", meaning: "이미", example: { japanese: "もう終わった。", korean: "벌써 끝났다." } },
      { word: "まだ", reading: "まだ", meaning: "아직", example: { japanese: "まだ終わっていない。", korean: "아직 끝나지 않았다." } },
      { word: "ゆっくり", reading: "ゆっくり", meaning: "천천히", example: { japanese: "ゆっくり歩く。", korean: "천천히 걷는다." } },
      { word: "きっと", reading: "きっと", meaning: "분명히", example: { japanese: "きっと大丈夫だ。", korean: "분명히 괜찮을 거다." } },
    ],
  },
];

async function seedBook(userId: string, bookSeed: BookSeed) {
  const registeredAt = daysAgo(bookSeed.registeredDaysAgo);

  const book = await db.vocabularyBook.create({
    data: {
      user_id: userId,
      name: bookSeed.name,
      description: bookSeed.description,
      is_public: false,
      created_at: registeredAt,
    },
  });

  for (const word of bookSeed.words) {
    const vocabulary = await db.vocabulary.create({
      data: {
        word: word.word,
        reading: word.reading,
        part_of_speech: bookSeed.partOfSpeech,
        jlpt_level: "N5",
        created_at: registeredAt,
        meanings: { create: [{ meaning: word.meaning }] },
        examples: { create: [{ ...word.example, source: "seed-multi-book-test" }] },
      },
    });

    await db.vocabularyBookItem.create({
      data: { vocabulary_book_id: book.id, vocabulary_id: vocabulary.id },
    });

    await db.userVocabulary.create({
      data: { user_id: userId, vocabulary_id: vocabulary.id, learning_status: "NEW" },
    });
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
      jlpt_level: "N5",
      target_jlpt: "N4",
      daily_word_target: 10,
      daily_study_time: 20,
      purpose: ["JLPT 대비"],
    },
  });

  for (const bookSeed of BOOKS) {
    await seedBook(user.id, bookSeed);
  }

  console.log("커스텀 학습 테스트 계정 생성 완료");
  console.log("  email:", TEST_EMAIL);
  console.log("  password:", TEST_PASSWORD);
  console.log(`  단어장 ${BOOKS.length}개 x 단어 ${BOOKS[0].words.length}개 = 총 ${BOOKS.length * BOOKS[0].words.length}개`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
