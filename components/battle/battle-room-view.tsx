"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BattleResultView } from "@/components/battle/battle-result-view";
import { BattleRoundView } from "@/components/battle/battle-round-view";
import { WaitingRoomView } from "@/components/battle/waiting-room-view";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { useBattleChannel } from "@/lib/battle/use-battle-channel";
import type { BattleRoomState } from "@/types/battle";

interface BattleRoomViewProps {
  roomCode: string;
  currentUserId: string;
}

/**
 * 상태별 하위 화면을 고르는 오케스트레이터. 서버 GET(`loadBattleRoomState`)이 유일한 진실
 * 소스이고, Pusher 이벤트는 전부 "다시 조회해라"는 신호로만 쓴다(페이로드를 직접 반영하지
 * 않음) — 재연결로 이벤트를 놓쳐도 다음 신호(재구독 성공 포함)에 항상 최신 상태로 따라잡힌다.
 */
export function BattleRoomView({ roomCode, currentUserId }: BattleRoomViewProps) {
  const queryClient = useQueryClient();
  const queryKey = ["battle-room", roomCode];

  const roomQuery = useQuery({
    queryKey,
    queryFn: () => apiFetch<BattleRoomState>(`/api/battle-rooms/${roomCode}`),
  });

  useBattleChannel(roomCode, {
    onSync: () => queryClient.invalidateQueries({ queryKey }),
  });

  const startMutation = useMutation({
    mutationFn: () =>
      apiFetch<BattleRoomState>(`/api/battle-rooms/${roomCode}/start`, { method: "POST" }),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  if (roomQuery.isLoading) {
    return <p className="text-sm text-foreground/60">불러오는 중...</p>;
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <p className="text-sm text-error">
        {roomQuery.error instanceof ApiClientError
          ? roomQuery.error.message
          : "방을 불러오지 못했습니다."}
      </p>
    );
  }

  const room = roomQuery.data;

  if (room.status === "waiting") {
    return (
      <div className="flex w-full max-w-md flex-col gap-2">
        <WaitingRoomView
          room={room}
          currentUserId={currentUserId}
          onStart={() => startMutation.mutate()}
          starting={startMutation.isPending}
        />
        {startMutation.isError && (
          <p className="text-center text-xs text-error">
            {startMutation.error instanceof ApiClientError
              ? startMutation.error.message
              : "대결을 시작하지 못했습니다."}
          </p>
        )}
      </div>
    );
  }

  if (room.status === "playing" && room.currentRound) {
    return (
      <BattleRoundView
        key={room.currentRound.roundNumber}
        roomCode={roomCode}
        round={room.currentRound}
        participants={room.participants}
      />
    );
  }

  if (room.status === "finished") {
    return <BattleResultView participants={room.participants} />;
  }

  return <p className="text-sm text-foreground/60">불러오는 중...</p>;
}
