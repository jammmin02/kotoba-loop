import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

import joyoKanji from "./data/joyo-kanji.json";

// 常用漢字(2010년 개정, 2,136자) 전량을 한 번에 시딩하는 스크립트다(PROMPT 33) — 이 파일은
// 이후 재실행(재배포) 외에는 다시 손대지 않는다. `prisma/data/joyo-kanji.json`은 아래 세 검증된
// 공개 데이터를 조합해 생성했다(생성에 쓴 스크립트는 1회성이라 보관하지 않고, 조합 결과만
// 커밋한다):
//   - 문자 목록(정확히 2,136자): npm `joyo-kanji`(x0213.org 常用漢字表 데이터) — Unicode
//     Unihan의 `kJoyoKanji=2010` 플래그와 전수 대조해 2,136자가 정확히 일치함을 확인했다.
//   - 음독/훈독/영문 뜻/획수/학년/(비공식 구JLPT 급수): npm `kanji-data`(KANJIDIC2 파생).
//   - 한국 한자음(훈음 중 음): npm `hanja`의 `hanjaeum` 테이블 + Unicode Unihan `kHangul`
//     필드(교차 검증용). 2,136자 중 2010년 개정으로 추가된 `𠮟`(U+20B9F) 한 글자만 두 소스
//     모두 값이 없어, 그 이체자 `叱`(U+53F1, Unihan에 동일 부수/획수로 기록됨)의 한자음 "질"을
//     그대로 가져와 채웠다.
//   - 부수: Unicode Unihan `kRSUnicode`(radical.residual-strokes)에서 radical 번호를 뽑아
//     Unicode "Kangxi Radicals" 블록(U+2F00~U+2FD5, 부수 214자를 사전순으로 표준화한 블록)의
//     해당 문자로 변환했다.
// `meaning`은 위 소스에 한국어 훈(訓) 데이터가 없어 KANJIDIC2 영문 뜻을 한국어로 번역해 담았다
// (원문에 없는 뜻을 임의로 지어내지 않고, KANJIDIC2가 제공하는 뜻풀이만 번역했다). 전통적인
// 한자 훈(訓) 사전과 정확히 일치하지 않을 수 있으니, 더 권위 있는 훈 데이터가 확보되면
// 교체를 검토한다.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type JoyoKanjiEntry = {
  character: string;
  onyomi: string[];
  kunyomi: string[];
  korean_reading: string;
  meaning: string;
  stroke_count: number;
  radical: string;
  school_grade: number | null;
  jlpt_level_ref: "N5" | "N4" | "N3" | "N2" | "N1" | null;
};

const entries = joyoKanji as JoyoKanjiEntry[];

async function main() {
  if (entries.length !== 2136) {
    throw new Error(`Expected exactly 2136 Joyo kanji entries, got ${entries.length}`);
  }

  for (const entry of entries) {
    await db.kanji.upsert({
      where: { character: entry.character },
      update: {
        onyomi: entry.onyomi,
        kunyomi: entry.kunyomi,
        korean_reading: entry.korean_reading,
        meaning: entry.meaning,
        stroke_count: entry.stroke_count,
        radical: entry.radical,
        school_grade: entry.school_grade,
        jlpt_level_ref: entry.jlpt_level_ref,
      },
      create: {
        character: entry.character,
        onyomi: entry.onyomi,
        kunyomi: entry.kunyomi,
        korean_reading: entry.korean_reading,
        meaning: entry.meaning,
        stroke_count: entry.stroke_count,
        radical: entry.radical,
        school_grade: entry.school_grade,
        jlpt_level_ref: entry.jlpt_level_ref,
      },
    });
  }

  const total = await db.kanji.count();
  console.log(`Seed complete: processed ${entries.length} entries, table now has ${total} rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
