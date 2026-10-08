/**
 * 삭제 실행 취소를 위한 지연 전송 스케줄러. 삭제를 바로 서버에 보내지 않고 일정 시간(취소 가능
 * 시간) 뒤에 보낸다 — 그 안에 `undo()`하면 요청 자체가 나가지 않으므로 서버 데이터는 건드려지지
 * 않는다(소프트 삭제나 별도 휴지통 테이블이 필요 없다). 타이머와 전송을 주입받아 순수하게 테스트한다.
 */

export interface DeletionRequest {
  path: string;
  method: "DELETE" | "POST";
  body?: unknown;
}

export interface ScheduledDeletion {
  /** 같은 id로 다시 예약하면 이전 예약이 그대로 유지되고 새 예약은 무시된다(중복 클릭 방지). */
  id: string;
  request: DeletionRequest;
}

export interface SchedulerHandlers {
  /** 서버가 삭제를 받아들였을 때(취소 불가가 된 시점) — 되돌리기 버튼을 거두는 데 쓴다. */
  onCommitted?: () => void;
  /** 서버가 거절했거나 네트워크가 실패했을 때 — 숨겼던 항목을 다시 보여줘야 한다. */
  onFailed?: (error: unknown) => void;
}

export interface SchedulerDeps {
  delayMs: number;
  /** 실제 전송. `keepalive`는 페이지를 떠나는 중에도 요청이 끝까지 가도록 하는 플래그다. */
  send: (request: DeletionRequest, options: { keepalive: boolean }) => Promise<unknown>;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

interface PendingEntry {
  deletion: ScheduledDeletion;
  handlers: SchedulerHandlers;
  timer: unknown;
}

export function createDeletionScheduler({
  delayMs,
  send,
  setTimer = (callback, ms) => setTimeout(callback, ms),
  clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}: SchedulerDeps) {
  const pending = new Map<string, PendingEntry>();

  async function commit(id: string, keepalive: boolean) {
    const entry = pending.get(id);
    if (!entry) return;
    // 타이머와 페이지 이탈 flush가 겹쳐도 한 번만 보내도록 먼저 목록에서 뺀다.
    pending.delete(id);
    clearTimer(entry.timer);
    try {
      await send(entry.deletion.request, { keepalive });
      entry.handlers.onCommitted?.();
    } catch (error) {
      entry.handlers.onFailed?.(error);
    }
  }

  return {
    /** 예약하고, 취소 시간 안에 부르면 요청을 없애는 `undo`를 돌려준다. */
    schedule(deletion: ScheduledDeletion, handlers: SchedulerHandlers = {}) {
      if (!pending.has(deletion.id)) {
        const timer = setTimer(() => void commit(deletion.id, false), delayMs);
        pending.set(deletion.id, { deletion, handlers, timer });
      }
      return {
        /** 아직 전송 전이면 취소하고 true, 이미 전송됐거나 취소됐다면 false. */
        undo(): boolean {
          const entry = pending.get(deletion.id);
          if (!entry) return false;
          clearTimer(entry.timer);
          pending.delete(deletion.id);
          return true;
        },
      };
    },

    /** 페이지를 떠나기 직전에 대기 중인 삭제를 모두 보낸다(사용자가 이미 삭제를 확정했으므로). */
    flushAll() {
      for (const id of [...pending.keys()]) void commit(id, true);
    },

    get pendingCount() {
      return pending.size;
    },
  };
}
