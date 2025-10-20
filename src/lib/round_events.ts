import "server-only";

import { EventEmitter } from "node:events";

declare global {
  // eslint-disable-next-line no-var
  var __roundEventEmitter: EventEmitter | undefined;
}

type RoundEventName = "participants-update";

const emitter = globalThis.__roundEventEmitter ?? new EventEmitter();
emitter.setMaxListeners(0);
globalThis.__roundEventEmitter = emitter;

function getEventKey(roundId: string, event: RoundEventName): string {
  return `round:${roundId}:${event}`;
}

export function emitRoundParticipantsUpdate(roundId: string): void {
  emitter.emit(getEventKey(roundId, "participants-update"));
}

export function subscribeToRoundParticipants(
  roundId: string,
  listener: () => void,
): () => void {
  const eventKey = getEventKey(roundId, "participants-update");
  emitter.on(eventKey, listener);

  return () => {
    emitter.off(eventKey, listener);
  };
}
