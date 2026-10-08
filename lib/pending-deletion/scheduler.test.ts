import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDeletionScheduler } from "./scheduler";

import type { DeletionRequest } from "./scheduler";

/** 시간을 직접 흘려보내는 가짜 타이머 + 전송 기록. */
function setup(delayMs = 10_000) {
  let now = 0;
  let nextHandle = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const sent: { request: DeletionRequest; keepalive: boolean }[] = [];
  let sendError: unknown = null;

  const scheduler = createDeletionScheduler({
    delayMs,
    send: async (request, { keepalive }) => {
      if (sendError) throw sendError;
      sent.push({ request, keepalive });
    },
    setTimer: (callback, ms) => {
      const handle = nextHandle++;
      timers.set(handle, { at: now + ms, callback });
      return handle;
    },
    clearTimer: (handle) => {
      timers.delete(handle as number);
    },
  });

  return {
    scheduler,
    sent,
    failNextSends(error: unknown) {
      sendError = error;
    },
    async advance(ms: number) {
      now += ms;
      for (const [handle, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(handle);
          timer.callback();
        }
      }
      // 전송은 비동기라 한 틱 흘려 보낸다.
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

const WORD_DELETE: { id: string; request: DeletionRequest } = {
  id: "word:w1",
  request: { path: "/api/vocabularies/w1", method: "DELETE" },
};

describe("createDeletionScheduler", () => {
  it("취소 시간이 지나면 한 번만 전송한다", async () => {
    const { scheduler, sent, advance } = setup();
    scheduler.schedule(WORD_DELETE);
    await advance(9_999);
    assert.equal(sent.length, 0);
    await advance(1);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0], { request: WORD_DELETE.request, keepalive: false });
    await advance(60_000);
    assert.equal(sent.length, 1);
  });

  it("취소 시간 안에 undo하면 요청이 나가지 않는다", async () => {
    const { scheduler, sent, advance } = setup();
    const { undo } = scheduler.schedule(WORD_DELETE);
    await advance(4_000);
    assert.equal(undo(), true);
    await advance(60_000);
    assert.equal(sent.length, 0);
    assert.equal(scheduler.pendingCount, 0);
  });

  it("이미 전송된 뒤의 undo는 false를 돌려준다", async () => {
    const { scheduler, advance } = setup();
    const { undo } = scheduler.schedule(WORD_DELETE);
    await advance(10_000);
    assert.equal(undo(), false);
  });

  it("같은 id를 다시 예약해도 한 번만 전송한다(중복 클릭)", async () => {
    const { scheduler, sent, advance } = setup();
    scheduler.schedule(WORD_DELETE);
    scheduler.schedule(WORD_DELETE);
    await advance(10_000);
    assert.equal(sent.length, 1);
  });

  it("페이지를 떠날 때 flushAll은 대기 중인 삭제를 keepalive로 즉시 보내고, 타이머로 다시 보내지 않는다", async () => {
    const { scheduler, sent, advance } = setup();
    scheduler.schedule(WORD_DELETE);
    scheduler.schedule({
      id: "book:b1",
      request: { path: "/api/vocabulary-books/b1", method: "DELETE" },
    });
    scheduler.flushAll();
    await advance(0);
    assert.equal(sent.length, 2);
    assert.ok(sent.every((entry) => entry.keepalive));
    await advance(60_000);
    assert.equal(sent.length, 2);
  });

  it("전송이 성공하면 onCommitted, 실패하면 onFailed를 부른다", async () => {
    const ok = setup();
    const events: string[] = [];
    ok.scheduler.schedule(WORD_DELETE, {
      onCommitted: () => events.push("committed"),
      onFailed: () => events.push("failed"),
    });
    await ok.advance(10_000);
    assert.deepEqual(events, ["committed"]);

    const bad = setup();
    bad.failNextSends(new Error("network"));
    const badEvents: string[] = [];
    bad.scheduler.schedule(WORD_DELETE, {
      onCommitted: () => badEvents.push("committed"),
      onFailed: () => badEvents.push("failed"),
    });
    await bad.advance(10_000);
    assert.deepEqual(badEvents, ["failed"]);
  });

  it("서로 다른 삭제는 각자 독립적으로 취소/전송된다", async () => {
    const { scheduler, sent, advance } = setup();
    const first = scheduler.schedule(WORD_DELETE);
    scheduler.schedule({
      id: "word:w2",
      request: { path: "/api/vocabularies/w2", method: "DELETE" },
    });
    first.undo();
    await advance(10_000);
    assert.deepEqual(
      sent.map((entry) => entry.request.path),
      ["/api/vocabularies/w2"],
    );
  });
});
