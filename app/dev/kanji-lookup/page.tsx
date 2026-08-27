import { notFound } from "next/navigation";

import { db } from "@/lib/db";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kanji Lookup — kotoba-loop (dev)",
  robots: { index: false, follow: false },
};

export default async function KanjiLookupPage(props: PageProps<"/dev/kanji-lookup">) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const searchParams = await props.searchParams;
  const query = typeof searchParams.character === "string" ? searchParams.character.trim() : "";
  const character = Array.from(query)[0] ?? "";

  const kanji = character ? await db.kanji.findUnique({ where: { character } }) : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">常用漢字 조회</h1>
        <p className="mt-2 text-sm text-foreground/70">
          개발 전용 페이지입니다. 프로덕션 빌드에서는 404로 응답합니다. 常用漢字 2,136자 중 한
          글자를 입력하면 시딩된 데이터를 그대로 조회합니다.
        </p>
      </header>

      <form className="flex gap-2">
        <input
          type="text"
          name="character"
          defaultValue={character}
          placeholder="예: 愛"
          maxLength={2}
          className="w-32 rounded-md border border-foreground/20 bg-surface px-3 py-2 text-lg text-foreground"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          조회
        </button>
      </form>

      {character && !kanji && (
        <p className="text-sm text-foreground/60">
          &quot;{character}&quot;는 常用漢字 2,136자에 포함되어 있지 않습니다.
        </p>
      )}

      {kanji && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-foreground/10 bg-surface p-4 text-sm">
          <dt className="font-medium text-foreground/60">문자</dt>
          <dd className="text-3xl text-foreground">{kanji.character}</dd>

          <dt className="font-medium text-foreground/60">음독</dt>
          <dd className="text-foreground">{kanji.onyomi.join(", ") || "—"}</dd>

          <dt className="font-medium text-foreground/60">훈독</dt>
          <dd className="text-foreground">{kanji.kunyomi.join(", ") || "—"}</dd>

          <dt className="font-medium text-foreground/60">한국 한자음</dt>
          <dd className="text-foreground">{kanji.korean_reading}</dd>

          <dt className="font-medium text-foreground/60">뜻</dt>
          <dd className="text-foreground">{kanji.meaning}</dd>

          <dt className="font-medium text-foreground/60">획수</dt>
          <dd className="text-foreground">{kanji.stroke_count}</dd>

          <dt className="font-medium text-foreground/60">부수</dt>
          <dd className="text-foreground">{kanji.radical}</dd>

          <dt className="font-medium text-foreground/60">학년</dt>
          <dd className="text-foreground">
            {kanji.school_grade === 8 ? "중학교 이상" : `초등 ${kanji.school_grade}학년`}
          </dd>

          <dt className="font-medium text-foreground/60">JLPT (구 급수 환산)</dt>
          <dd className="text-foreground">{kanji.jlpt_level_ref ?? "—"}</dd>
        </dl>
      )}
    </main>
  );
}
