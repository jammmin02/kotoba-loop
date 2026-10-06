"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminSettings } from "@/types/admin";

const MESSAGE_MAX = 500;

type Patch = Partial<AdminSettings>;

function SettingsForm({ settings }: { settings: AdminSettings }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(settings.maintenanceEnabled);
  const [message, setMessage] = useState(settings.maintenanceMessage);
  const [domains, setDomains] = useState(settings.allowedEmailDomains);
  const [domainInput, setDomainInput] = useState("");
  const [confirmOn, setConfirmOn] = useState(false);

  const save = useMutation({
    mutationFn: (patch: Patch) =>
      apiFetch<AdminSettings>("/api/admin/settings", { method: "PATCH", body: patch }),
    onSuccess: (next) => {
      toast.success("저장했습니다.");
      setEnabled(next.maintenanceEnabled);
      setMessage(next.maintenanceMessage);
      setDomains(next.allowedEmailDomains);
      setConfirmOn(false);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "저장에 실패했습니다.");
    },
  });

  function addDomain() {
    const value = domainInput.trim();
    if (!value) return;
    const normalized = value.startsWith("@") ? value.toLowerCase() : `@${value.toLowerCase()}`;
    if (domains.includes(normalized)) {
      toast.info("이미 추가된 도메인입니다.");
      return;
    }
    setDomains([...domains, normalized]);
    setDomainInput("");
  }

  function saveMaintenance() {
    // 점검을 새로 켜는 순간만 확인을 거친다 — 관리자 외 모든 사용자가 막히기 때문이다.
    if (enabled && !settings.maintenanceEnabled) {
      setConfirmOn(true);
      return;
    }
    save.mutate({ maintenanceEnabled: enabled, maintenanceMessage: message });
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold">점검 모드</h2>
        <div className="flex gap-2">
          <ChipButton selected={!enabled} onClick={() => setEnabled(false)}>
            꺼짐
          </ChipButton>
          <ChipButton selected={enabled} onClick={() => setEnabled(true)}>
            켜짐
          </ChipButton>
        </div>
        <Textarea
          label="점검 안내 문구"
          value={message}
          maxLength={MESSAGE_MAX}
          rows={3}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="text-xs text-foreground/50">
          켜면 관리자를 제외한 모든 사용자가 점검 안내 화면을 봅니다. 로그인 화면은 계속 열려 있어
          관리자가 로그인할 수 있습니다. 설정 변경은 몇 초 안에 반영됩니다.
        </p>
        <div>
          <Button
            loading={save.isPending && !confirmOn}
            disabled={!message.trim()}
            onClick={saveMaintenance}
          >
            점검 설정 저장
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t-2 border-pixel-ink pt-4">
        <h2 className="text-base font-bold">허용 이메일 도메인</h2>
        <p className="text-xs text-foreground/50">
          새로 가입할 수 있는 이메일 도메인입니다. 이미 가입한 계정에는 영향이 없습니다.
        </p>
        <ul className="flex flex-wrap gap-2">
          {domains.map((domain) => (
            <li
              key={domain}
              className="flex items-center gap-2 border-2 border-pixel-ink bg-background px-2 py-1 text-sm"
            >
              {domain}
              <button
                type="button"
                aria-label={`${domain} 삭제`}
                disabled={domains.length <= 1}
                onClick={() => setDomains(domains.filter((d) => d !== domain))}
                className="font-bold text-error disabled:opacity-30"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addDomain();
          }}
        >
          <Input
            aria-label="도메인 추가"
            placeholder="example.ac.kr"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            추가
          </Button>
        </form>
        <div>
          <Button
            loading={save.isPending && !confirmOn}
            onClick={() => save.mutate({ allowedEmailDomains: domains })}
          >
            도메인 저장
          </Button>
        </div>
      </section>

      <Modal open={confirmOn} onClose={() => setConfirmOn(false)} title="점검 모드 켜기">
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            점검 모드를 켜면 관리자를 제외한 모든 사용자가 서비스를 이용할 수 없게 됩니다. 켤까요?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOn(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              loading={save.isPending}
              onClick={() => save.mutate({ maintenanceEnabled: true, maintenanceMessage: message })}
            >
              켜기
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function AdminSettingsView() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => apiFetch<AdminSettings>("/api/admin/settings"),
  });

  return (
    <Card
      variant="elevated"
      title="SETTINGS.EXE"
      titleColor="primary"
      className="flex flex-col gap-6 p-4"
    >
      <h1 className="text-lg font-bold">운영 설정</h1>
      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {/* key로 서버 값이 바뀌면 폼 상태를 다시 초기화한다. */}
      {data && <SettingsForm key={JSON.stringify(data)} settings={data} />}
    </Card>
  );
}
