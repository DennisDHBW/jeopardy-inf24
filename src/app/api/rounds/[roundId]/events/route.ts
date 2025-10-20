import "server-only";

import type { NextRequest } from "next/server";
import { subscribeToRoundParticipants } from "@/lib/round_events";

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

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encodeEvent("connected"));

      const unsubscribe = subscribeToRoundParticipants(roundId, () => {
        controller.enqueue(encodeEvent("participants-update"));
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encodeEvent("heartbeat", "keep-alive"));
      }, 25_000);

      controller.enqueue(encodeEvent("ready"));

      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      // NO-OP: start cleanup handles this.
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
