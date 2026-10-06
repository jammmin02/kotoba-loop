"use client";

import { PixelPlus, PixelSparkles, PixelX } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  JLPT_LEVEL_OPTIONS,
  MAX_EXAMPLES,
  MAX_MEANINGS,
  PART_OF_SPEECH_OPTIONS,
} from "@/lib/validations/vocabulary";

export interface ExtraWordEntry {
  key: string;
  /** The synonym/related-expression chip text that spawned this entry — used to detect toggle-off.
   * Empty for cards the user added manually. */
  sourceText: string;
  word: string;
  reading: string;
  partOfSpeech: string;
  jlptLevel: string;
  meanings: string[];
  examples: { japanese: string; korean: string }[];
  aiAnalysisId?: string;
  aiFieldsEdited: boolean;
  aiHighlight: { reading: boolean; partOfSpeech: boolean; jlptLevel: boolean };
  aiMeaningHighlight: boolean[];
  aiExampleHighlight: boolean[];
  analyzing: boolean;
  /** Last validation/save error for this card; cleared as soon as the card is edited. */
  error?: string;
  expanded: boolean;
}

export function createExtraWordEntry(key: string, sourceText: string): ExtraWordEntry {
  return {
    key,
    sourceText,
    word: sourceText,
    reading: "",
    partOfSpeech: "",
    jlptLevel: "",
    meanings: [""],
    examples: [],
    aiAnalysisId: undefined,
    aiFieldsEdited: false,
    aiHighlight: { reading: false, partOfSpeech: false, jlptLevel: false },
    aiMeaningHighlight: [],
    aiExampleHighlight: [],
    analyzing: false,
    error: undefined,
    expanded: true,
  };
}

const JLPT_SELECT_OPTIONS = [
  { value: "", label: "선택 안 함" },
  ...JLPT_LEVEL_OPTIONS.map((level) => ({ value: level, label: level })),
];

const PART_OF_SPEECH_SELECT_OPTIONS = [
  { value: "", label: "선택해주세요" },
  ...PART_OF_SPEECH_OPTIONS.map((pos) => ({ value: pos, label: pos })),
];

const AI_HIGHLIGHT_CLASS = "ring-2 ring-accent/60 bg-accent/5";

interface ExtraWordCardProps {
  entry: ExtraWordEntry;
  index: number;
  onChange: (patch: Partial<ExtraWordEntry>) => void;
  onRemove: () => void;
  onAnalyze: () => void;
}

export function ExtraWordCard({ entry, index, onChange, onRemove, onAnalyze }: ExtraWordCardProps) {
  // Every user edit clears the card's error and — for an AI-analyzed card — flags the AI values as
  // edited, so a single helper owns both side effects.
  function edit(patch: Partial<ExtraWordEntry>) {
    onChange({
      ...patch,
      error: undefined,
      ...(entry.aiAnalysisId ? { aiFieldsEdited: true } : {}),
    });
  }

  const summaryMeaning = entry.meanings.find((m) => m.trim());

  return (
    <Card className={cn("flex flex-col gap-4", entry.error ? "border-error" : "border-accent/60")}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ expanded: !entry.expanded })}
          aria-expanded={entry.expanded}
          aria-label={entry.expanded ? "카드 접기" : "카드 펼치기"}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-xs font-bold text-foreground/60" aria-hidden="true">
            {entry.expanded ? "▾" : "▸"}
          </span>
          <span className="shrink-0 text-sm font-medium text-foreground">단어 {index + 2}</span>
          {!entry.expanded && (
            <span className="min-w-0 flex-1 truncate text-sm text-foreground/70">
              {entry.word || "(단어 없음)"}
              {summaryMeaning ? ` — ${summaryMeaning}` : ""}
            </span>
          )}
          {!entry.expanded && entry.error && (
            <span className="shrink-0 text-xs font-bold text-error">⚠ 확인 필요</span>
          )}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="추가 단어 삭제"
          className="flex size-11 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background"
        >
          <PixelX className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {entry.error && (
        <p role="alert" className="text-xs text-error">
          {entry.error}
        </p>
      )}

      {entry.expanded && (
        <>
          <Input
            label="단어"
            value={entry.word}
            onChange={(e) => edit({ word: e.target.value, aiAnalysisId: undefined })}
            required
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            loading={entry.analyzing}
            disabled={!entry.word.trim() || entry.analyzing}
            onClick={onAnalyze}
          >
            <PixelSparkles className="size-3.5" aria-hidden="true" />
            AI로 자동 분석
          </Button>

          <div className="flex flex-col gap-1">
            <Input
              label="후리가나"
              value={entry.reading}
              onChange={(e) =>
                edit({
                  reading: e.target.value,
                  aiHighlight: { ...entry.aiHighlight, reading: false },
                })
              }
              className={cn(entry.aiHighlight.reading && AI_HIGHLIGHT_CLASS)}
              required
            />
            {entry.aiHighlight.reading && (
              <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Select
                label="품사"
                value={entry.partOfSpeech}
                onChange={(e) =>
                  edit({
                    partOfSpeech: e.target.value,
                    aiHighlight: { ...entry.aiHighlight, partOfSpeech: false },
                  })
                }
                options={PART_OF_SPEECH_SELECT_OPTIONS}
                className={cn(entry.aiHighlight.partOfSpeech && AI_HIGHLIGHT_CLASS)}
                required
              />
              {entry.aiHighlight.partOfSpeech && (
                <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Select
                label="JLPT 난이도"
                value={entry.jlptLevel}
                onChange={(e) =>
                  edit({
                    jlptLevel: e.target.value,
                    aiHighlight: { ...entry.aiHighlight, jlptLevel: false },
                  })
                }
                options={JLPT_SELECT_OPTIONS}
                className={cn(entry.aiHighlight.jlptLevel && AI_HIGHLIGHT_CLASS)}
              />
              {entry.aiHighlight.jlptLevel && (
                <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                뜻<span className="text-error"> *</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (entry.meanings.length >= MAX_MEANINGS) return;
                  onChange({
                    meanings: [...entry.meanings, ""],
                    aiMeaningHighlight: [...entry.aiMeaningHighlight, false],
                  });
                }}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <PixelPlus className="size-3" aria-hidden="true" />뜻 추가
              </button>
            </div>
            {entry.meanings.map((meaning, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={meaning}
                    onChange={(e) =>
                      edit({
                        meanings: entry.meanings.map((m, j) => (j === i ? e.target.value : m)),
                        aiMeaningHighlight: entry.aiMeaningHighlight.map((h, j) =>
                          j === i ? false : h,
                        ),
                      })
                    }
                    placeholder={`뜻 ${i + 1}`}
                    className={cn("flex-1", entry.aiMeaningHighlight[i] && AI_HIGHLIGHT_CLASS)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        meanings: entry.meanings.filter((_, j) => j !== i),
                        aiMeaningHighlight: entry.aiMeaningHighlight.filter((_, j) => j !== i),
                      })
                    }
                    disabled={entry.meanings.length <= 1}
                    aria-label="뜻 삭제"
                    className="flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background disabled:pointer-events-none disabled:opacity-40"
                  >
                    <PixelX className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                {entry.aiMeaningHighlight[i] && (
                  <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">예문</span>
              <button
                type="button"
                onClick={() => {
                  if (entry.examples.length >= MAX_EXAMPLES) return;
                  onChange({
                    examples: [...entry.examples, { japanese: "", korean: "" }],
                    aiExampleHighlight: [...entry.aiExampleHighlight, false],
                  });
                }}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <PixelPlus className="size-3" aria-hidden="true" />
                예문 추가
              </button>
            </div>
            {entry.examples.length === 0 && (
              <p className="text-xs text-foreground/50">선택 사항이에요. 필요하면 추가해보세요.</p>
            )}
            {entry.examples.map((example, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div
                  className={cn(
                    "flex items-start gap-2 border-2 border-pixel-ink bg-background p-3",
                    entry.aiExampleHighlight[i] && AI_HIGHLIGHT_CLASS,
                  )}
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      value={example.japanese}
                      onChange={(e) =>
                        edit({
                          examples: entry.examples.map((ex, j) =>
                            j === i ? { ...ex, japanese: e.target.value } : ex,
                          ),
                          aiExampleHighlight: entry.aiExampleHighlight.map((h, j) =>
                            j === i ? false : h,
                          ),
                        })
                      }
                      placeholder="일본어 예문"
                    />
                    <Input
                      value={example.korean}
                      onChange={(e) =>
                        edit({
                          examples: entry.examples.map((ex, j) =>
                            j === i ? { ...ex, korean: e.target.value } : ex,
                          ),
                          aiExampleHighlight: entry.aiExampleHighlight.map((h, j) =>
                            j === i ? false : h,
                          ),
                        })
                      }
                      placeholder="한국어 해석"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        examples: entry.examples.filter((_, j) => j !== i),
                        aiExampleHighlight: entry.aiExampleHighlight.filter((_, j) => j !== i),
                      })
                    }
                    aria-label="예문 삭제"
                    className="flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background"
                  >
                    <PixelX className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                {entry.aiExampleHighlight[i] && (
                  <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
