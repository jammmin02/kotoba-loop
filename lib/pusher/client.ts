"use client";

import PusherClient from "pusher-js";

let client: PusherClient | undefined;

/** Lazily-created singleton `pusher-js` client, shared across every `useBattleChannel` mount. */
export function getPusherClient(): PusherClient {
  if (!client) {
    client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY ?? "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "",
      authEndpoint: "/api/pusher/auth",
    });
  }
  return client;
}
