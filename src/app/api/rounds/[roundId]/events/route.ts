import "server-only";

import type { NextRequest } from "next/server";
import { subscribeToRoundEvents } from "@/lib/round_events";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const encoder = new TextEncoder();

type RouteContext = {
  params: {
    roundId: string;
  };
};

function encodeEvent(event: string, data: string = "{}"): Uint8Array {
  const payload = `event: ${event}\ndata: ${data}\n\n`;
  return encoder.encode(payload);
}

export function GET(_request: NextRequest, context: RouteContext): Response {
  const { roundId } = context.params;

  if (!roundId) {
    return new Response("roundId is required", { status: 400 });
  }

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let unsubscribe = () => {};

      const doCleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        unsubscribe();
        cleanup = null;
      };

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) {
          return;
        }
        try {
          controller.enqueue(chunk);
        } catch {
          doCleanup();
        }
      };

      safeEnqueue(encodeEvent("connected"));

      unsubscribe = subscribeToRoundEvents(roundId, (event) => {
        if (event.type === "participants-update") {
          safeEnqueue(encodeEvent("participants-update"));
          return;
        }

        if (event.type === "clue-revealed") {
          safeEnqueue(encodeEvent("clue-revealed", JSON.stringify(event.clue)));
          return;
        }

        if (event.type === "round-state") {
          safeEnqueue(encodeEvent("round-state", JSON.stringify(event.state)));
        }
      });

      heartbeat = setInterval(() => {
        safeEnqueue(encodeEvent("heartbeat", "keep-alive"));
      }, 25_000);

      safeEnqueue(encodeEvent("ready"));
      cleanup = doCleanup;
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
