"use client";

import { useEffect, useRef } from "react";

import { battleChannelName } from "@/lib/battle/channel";
import { getPusherClient } from "@/lib/pusher/client";

import type { PresenceChannel } from "pusher-js";

export interface BattleChannelHandlers {
  /** 라운드 시작/종료/방 종료 브로드캐스트 — 페이로드를 직접 쓰지 않고 항상 최신 상태를 다시
   * 조회하는 트리거로만 쓴다(서버 GET이 유일한 진실 소스, 클라이언트에서 페이로드를 짜맞춰
   * 상태를 복원하지 않음 — 재연결로 이벤트를 놓쳐도 다음 신호에 바로 따라잡힌다). */
  onSync: () => void;
}

/**
 * 방 프레즌스 채널을 구독한다. 참가자 입장/퇴장은 Pusher 프레즌스 채널의 내장 이벤트로 감지하고,
 * 라운드 진행 이벤트가 오거나 구독이 (재)성공할 때마다 `onSync`를 호출해 최신 상태를 다시 받아오게
 * 한다 — 연결이 끊겼다 재연결돼도 `pusher:subscription_succeeded`가 다시 발생해 자동으로
 * 따라잡힌다(수동 재연결 로직 불필요, pusher-js가 재구독을 알아서 처리).
 */
export function useBattleChannel(roomCode: string, handlers: BattleChannelHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const pusher = getPusherClient();
    const channelName = battleChannelName(roomCode);
    const channel = pusher.subscribe(channelName) as PresenceChannel;

    const sync = () => handlersRef.current.onSync();

    channel.bind("pusher:subscription_succeeded", sync);
    channel.bind("pusher:member_added", sync);
    channel.bind("pusher:member_removed", sync);
    channel.bind("round-started", sync);
    channel.bind("round-result", sync);
    channel.bind("battle-finished", sync);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [roomCode]);
}
