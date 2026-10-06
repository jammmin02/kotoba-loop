"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { adminKanjiUpdateSchema, adminVocabularyUpdateSchema } from "@/lib/validations/admin-data";
import type {
  AdminDataList,
  AdminJlptLevel,
  AdminKanjiRow,
  AdminVocabularyRow,
} from "@/types/admin";

type Kind = "vocabulary" | "kanji";

const JLPT_OPTIONS = [
  { value: "", label: "없음" },
  ...(["N5", "N4", "N3", "N2", "N1"] as const).map((l) => ({ value: l, label: l })),
];

function splitList(value: string, separator: RegExp): string[] {
  return value
    .split(separator)
    .map((v) => v.trim())
    .filter(Boolean);
}

function jlptOrNull(value: string): AdminJlptLevel | null {
  return value === "" ? null : (value as AdminJlptLevel);
}

function useSave<T>(kind: Kind, id: string | undefined, onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: T) =>
      apiFetch<{ ok: true }>(`/api/admin/data/${kind}/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      toast.success("저장했습니다. 변경 내용은 감사 로그에 기록됩니다.");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      onDone();
    },
  });
}

function VocabularyEditModal({ row, onClose }: { row: AdminVocabularyRow; onClose: () => void }) {
  const [word, setWord] = useState(row.word);
  const [reading, setReading] = useState(row.reading);
  const [pos, setPos] = useState(row.partOfSpeech);
  const [jlpt, setJlpt] = useState<string>(row.jlptLevel ?? "");
  const [meanings, setMeanings] = useState(row.meanings.join("\n"));
  const [error, setError] = useState<string>();
  const save = useSave<unknown>("vocabulary", row.id, onClose);

  function submit() {
    const body = {
      word,
      reading,
      partOfSpeech: pos,
      jlptLevel: jlptOrNull(jlpt),
      meanings: splitList(meanings, /\n/),
    };
    const parsed = adminVocabularyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    save.mutate(parsed.data, {
      onError: (err) =>
        setError(err instanceof ApiClientError ? err.message : "저장에 실패했습니다."),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-foreground/60">
        단어는 모든 사용자가 공유합니다. 수정하면 전체에 반영됩니다.
      </p>
      <Input label="단어" value={word} onChange={(e) => setWord(e.target.value)} />
      <Input label="읽기" value={reading} onChange={(e) => setReading(e.target.value)} />
      <Input label="품사" value={pos} onChange={(e) => setPos(e.target.value)} />
      <Select
        label="JLPT"
        value={jlpt}
        onChange={(e) => setJlpt(e.target.value)}
        options={JLPT_OPTIONS}
      />
      <Textarea
        label="뜻 (한 줄에 하나)"
        value={meanings}
        rows={4}
        onChange={(e) => setMeanings(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button loading={save.isPending} onClick={submit}>
          저장
        </Button>
      </div>
    </div>
  );
}

function KanjiEditModal({ row, onClose }: { row: AdminKanjiRow; onClose: () => void }) {
  const [onyomi, setOnyomi] = useState(row.onyomi.join(", "));
  const [kunyomi, setKunyomi] = useState(row.kunyomi.join(", "));
  const [korean, setKorean] = useState(row.koreanReading);
  const [meaning, setMeaning] = useState(row.meaning);
  const [strokes, setStrokes] = useState(String(row.strokeCount));
  const [radical, setRadical] = useState(row.radical);
  const [grade, setGrade] = useState(row.schoolGrade === null ? "" : String(row.schoolGrade));
  const [jlpt, setJlpt] = useState<string>(row.jlptLevelRef ?? "");
  const [error, setError] = useState<string>();
  const save = useSave<unknown>("kanji", row.id, onClose);

  function submit() {
    const body = {
      onyomi: splitList(onyomi, /[,、]/),
      kunyomi: splitList(kunyomi, /[,、]/),
      koreanReading: korean,
      meaning,
      strokeCount: Number(strokes),
      radical,
      schoolGrade: grade === "" ? null : Number(grade),
      jlptLevelRef: jlptOrNull(jlpt),
    };
    const parsed = adminKanjiUpdateSchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    save.mutate(parsed.data, {
      onError: (err) =>
        setError(err instanceof ApiClientError ? err.message : "저장에 실패했습니다."),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-foreground/60">글자({row.character}) 자체는 바꿀 수 없습니다.</p>
      <Input
        label="음독 (쉼표로 구분)"
        value={onyomi}
        onChange={(e) => setOnyomi(e.target.value)}
      />
      <Input
        label="훈독 (쉼표로 구분)"
        value={kunyomi}
        onChange={(e) => setKunyomi(e.target.value)}
      />
      <Input label="한국어 음" value={korean} onChange={(e) => setKorean(e.target.value)} />
      <Input label="뜻" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
      <Input
        label="획수"
        type="number"
        value={strokes}
        onChange={(e) => setStrokes(e.target.value)}
      />
      <Input label="부수" value={radical} onChange={(e) => setRadical(e.target.value)} />
      <Input
        label="학년 (비우면 없음)"
        type="number"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
      />
      <Select
        label="JLPT"
        value={jlpt}
        onChange={(e) => setJlpt(e.target.value)}
        options={JLPT_OPTIONS}
      />
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button loading={save.isPending} onClick={submit}>
          저장
        </Button>
      </div>
    </div>
  );
}

export function AdminContentDataView() {
  const [kind, setKind] = useState<Kind>("vocabulary");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editingVocab, setEditingVocab] = useState<AdminVocabularyRow | null>(null);
  const [editingKanji, setEditingKanji] = useState<AdminKanjiRow | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "data", kind, q, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set("q", q);
      return apiFetch<AdminDataList<AdminVocabularyRow | AdminKanjiRow>>(
        `/api/admin/data/${kind}?${params}`,
      );
    },
  });

  return (
    <Card variant="elevated" title="DATA.EXE" titleColor="pink" className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-bold">학습 데이터</h1>

      <div className="flex gap-2">
        <ChipButton
          selected={kind === "vocabulary"}
          onClick={() => {
            setKind("vocabulary");
            setPage(1);
          }}
        >
          단어
        </ChipButton>
        <ChipButton
          selected={kind === "kanji"}
          onClick={() => {
            setKind("kanji");
            setPage(1);
          }}
        >
          한자
        </ChipButton>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(searchInput.trim());
          setPage(1);
        }}
      >
        <Input
          aria-label="검색"
          placeholder={kind === "vocabulary" ? "단어, 읽기, 뜻 검색" : "한자, 뜻, 음 검색"}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="outline">
          검색
        </Button>
      </form>

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && data.rows.length === 0 && (
        <p className="text-sm text-foreground/60">검색 결과가 없습니다.</p>
      )}

      {data && data.rows.length > 0 && (
        <ul className="flex flex-col divide-y-2 divide-pixel-ink border-2 border-pixel-ink">
          {kind === "vocabulary"
            ? (data.rows as AdminVocabularyRow[]).map((v) => (
                <li key={v.id} className="flex items-center gap-3 bg-surface p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-jp text-base font-bold">
                      {v.word}{" "}
                      <span className="text-xs font-normal text-foreground/60">{v.reading}</span>
                    </p>
                    <p className="truncate text-xs text-foreground/70">
                      {v.partOfSpeech} · {v.meanings.join(", ")}
                    </p>
                  </div>
                  {v.jlptLevel && (
                    <span className="border-2 border-pixel-ink bg-background px-2 py-0.5 text-xs font-bold">
                      {v.jlptLevel}
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditingVocab(v)}>
                    수정
                  </Button>
                </li>
              ))
            : (data.rows as AdminKanjiRow[]).map((k) => (
                <li key={k.id} className="flex items-center gap-3 bg-surface p-3">
                  <span className="font-jp w-10 shrink-0 text-center text-3xl">{k.character}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {k.meaning} · {k.koreanReading}
                    </p>
                    <p className="truncate text-xs text-foreground/70">
                      음 {k.onyomi.join("・") || "-"} / 훈 {k.kunyomi.join("・") || "-"} ·{" "}
                      {k.strokeCount}획
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditingKanji(k)}>
                    수정
                  </Button>
                </li>
              ))}
        </ul>
      )}

      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onChange={setPage}
        />
      )}

      <Modal open={editingVocab !== null} onClose={() => setEditingVocab(null)} title="단어 수정">
        {editingVocab && (
          <VocabularyEditModal
            key={editingVocab.id}
            row={editingVocab}
            onClose={() => setEditingVocab(null)}
          />
        )}
      </Modal>
      <Modal open={editingKanji !== null} onClose={() => setEditingKanji(null)} title="한자 수정">
        {editingKanji && (
          <KanjiEditModal
            key={editingKanji.id}
            row={editingKanji}
            onClose={() => setEditingKanji(null)}
          />
        )}
      </Modal>
    </Card>
  );
}
