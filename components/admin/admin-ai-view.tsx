"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { BarChart } from "@/components/admin/bar-chart";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminAiAnalysisList, AdminAiAnalysisRow, AdminAiUsage } from "@/types/admin";

function n(value: number): string {
  return value.toLocaleString("ko-KR");
}

function shortDate(key: string): string {
  return key.slice(5).replace("-", "/");
}

function UsageSection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "ai", "usage"],
    queryFn: () => apiFetch<AdminAiUsage>("/api/admin/ai/usage"),
  });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-bold">사용량 (최근 {data?.days ?? 30}일)</h2>
      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center border-2 border-pixel-ink bg-background p-3">
              <span className="text-xs font-bold text-foreground/60">호출</span>
              <span className="text-xl font-bold">{n(data.totals.calls)}</span>
            </div>
            <div className="flex flex-col items-center border-2 border-pixel-ink bg-background p-3">
              <span className="text-xs font-bold text-foreground/60">입력 토큰</span>
              <span className="text-xl font-bold">{n(data.totals.inputTokens)}</span>
            </div>
            <div className="flex flex-col items-center border-2 border-pixel-ink bg-background p-3">
              <span className="text-xs font-bold text-foreground/60">출력 토큰</span>
              <span className="text-xl font-bold">{n(data.totals.outputTokens)}</span>
            </div>
          </div>

          <BarChart
            title="일별 호출 수"
            unit="회"
            data={data.daily.map((d) => ({ label: shortDate(d.date), value: d.calls }))}
          />
          <BarChart
            title="일별 토큰 (입력+출력)"
            barClassName="bg-secondary"
            data={data.daily.map((d) => ({
              label: shortDate(d.date),
              value: d.inputTokens + d.outputTokens,
            }))}
          />

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold">기능별</h3>
            {data.byFeature.length === 0 ? (
              <p className="text-xs text-foreground/60">기록이 없습니다.</p>
            ) : (
              <ul className="flex flex-col divide-y-2 divide-pixel-ink border-2 border-pixel-ink text-sm">
                {data.byFeature.map((f) => (
                  <li key={f.feature} className="flex justify-between gap-2 bg-surface p-2">
                    <span className="min-w-0 truncate font-bold">{f.feature}</span>
                    <span className="shrink-0 text-xs text-foreground/70">
                      {n(f.calls)}회 · {n(f.inputTokens + f.outputTokens)} 토큰
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold">사용자별 상위 10명</h3>
            {data.topUsers.length === 0 ? (
              <p className="text-xs text-foreground/60">기록이 없습니다.</p>
            ) : (
              <ul className="flex flex-col divide-y-2 divide-pixel-ink border-2 border-pixel-ink text-sm">
                {data.topUsers.map((u) => (
                  <li key={u.userId} className="flex justify-between gap-2 bg-surface p-2">
                    <span className="min-w-0 truncate">
                      <span className="font-bold">{u.nickname}</span>{" "}
                      <span className="text-xs text-foreground/60">{u.email}</span>
                    </span>
                    <span className="shrink-0 text-xs text-foreground/70">
                      {n(u.calls)}회 · {n(u.inputTokens + u.outputTokens)} 토큰
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function AnalysesSection() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [blocking, setBlocking] = useState<AdminAiAnalysisRow | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "ai", "analyses", q, type, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set("q", q);
      if (type) params.set("type", type);
      return apiFetch<AdminAiAnalysisList>(`/api/admin/ai/analyses?${params}`);
    },
  });

  const block = useMutation({
    mutationFn: (input: { id: string; reason?: string }) =>
      apiFetch<{ ok: true }>("/api/admin/ai/analyses/block", { method: "POST", body: input }),
    onSuccess: () => {
      toast.success("차단했습니다. 같은 요청이 오면 AI가 새로 생성합니다.");
      setBlocking(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "차단에 실패했습니다.");
    },
  });

  return (
    <section className="flex flex-col gap-3 border-t-2 border-pixel-ink pt-4">
      <h2 className="text-base font-bold">AI 생성 결과 점검</h2>
      <p className="text-xs text-foreground/50">
        차단하면 저장된 결과가 삭제되고, 같은 요청이 들어올 때 AI가 다시 생성합니다.
      </p>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(searchInput.trim());
          setPage(1);
        }}
      >
        <Select
          aria-label="유형"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "전체 유형" },
            ...(data?.types ?? []).map((t) => ({ value: t, label: t })),
          ]}
        />
        <Input
          aria-label="결과 검색"
          placeholder="입력값, 사용자 검색"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="min-w-0 flex-1"
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
        <p className="text-sm text-foreground/60">저장된 결과가 없습니다.</p>
      )}

      {data?.rows.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 border-2 border-pixel-ink bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-sm">
              <span className="border-2 border-pixel-ink bg-background px-1.5 py-0.5 text-xs font-bold">
                {r.analysisType}
              </span>{" "}
              <span className="font-bold">{r.inputRef}</span>
            </p>
            <Button size="sm" variant="danger" onClick={() => setBlocking(r)}>
              차단
            </Button>
          </div>
          <p className="text-xs text-foreground/60">
            {r.user.nickname} ({r.user.email}) ·{" "}
            {new Date(r.createdAt).toLocaleString("ko-KR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
          <p className="break-all font-mono text-[11px] text-foreground/70">{r.preview}</p>
        </div>
      ))}

      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onChange={setPage}
        />
      )}

      <Modal open={blocking !== null} onClose={() => setBlocking(null)} title="AI 결과 차단">
        {blocking && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              {blocking.user.email}의 「{blocking.inputRef}」 결과를 차단할까요?
              <span className="mt-1 block text-xs text-foreground/60">
                저장된 결과가 삭제되며 되돌릴 수 없습니다.
              </span>
            </p>
            <Textarea
              label="사유 (선택)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBlocking(null)}>
                취소
              </Button>
              <Button
                variant="danger"
                loading={block.isPending}
                onClick={() =>
                  block.mutate({ id: blocking.id, reason: reason.trim() || undefined })
                }
              >
                차단
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export function AdminAiView() {
  return (
    <Card variant="elevated" title="AI.EXE" titleColor="accent" className="flex flex-col gap-5 p-4">
      <h1 className="text-lg font-bold">AI 관리</h1>
      <UsageSection />
      <AnalysesSection />
    </Card>
  );
}
