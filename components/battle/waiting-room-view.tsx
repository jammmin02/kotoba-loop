"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BATTLE_MIN_PARTICIPANTS } from "@/lib/battle/constants";
import type { BattleRoomState } from "@/types/battle";

interface WaitingRoomViewProps {
  room: BattleRoomState;
  currentUserId: string;
  onStart: () => void;
  starting: boolean;
}

export function WaitingRoomView({ room, currentUserId, onStart, starting }: WaitingRoomViewProps) {
  const isHost = room.hostUserId === currentUserId;
  const canStart = room.participants.length >= BATTLE_MIN_PARTICIPANTS;

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Card variant="elevated" title="대기실" className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">{room.bookName}</p>
        <p className="text-xs text-foreground/60">
          방 코드{" "}
          <span className="font-mono text-sm font-bold text-primary">{room.roomCode}</span>를 친구에게
          공유해서 초대하세요.
        </p>
      </Card>

      <Card
        variant="elevated"
        title={`참가자 (${room.participants.length}명)`}
        className="flex flex-col gap-2"
      >
        {room.participants.map((participant) => (
          <div
            key={participant.userId}
            className="flex items-center justify-between border-2 border-pixel-ink bg-background px-3 py-2"
          >
            <span className="text-sm font-bold text-foreground">{participant.nickname}</span>
            {participant.isHost && <span className="text-xs text-primary">방장</span>}
          </div>
        ))}
      </Card>

      {isHost ? (
        <Button
          type="button"
          variant="quest"
          size="lg"
          disabled={!canStart}
          loading={starting}
          onClick={onStart}
        >
          {canStart ? "대결 시작" : `참가자 ${BATTLE_MIN_PARTICIPANTS}명 이상 필요해요`}
        </Button>
      ) : (
        <p className="text-center text-sm text-foreground/60">방장이 시작하기를 기다리는 중...</p>
      )}
    </div>
  );
}
