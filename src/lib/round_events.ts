import "server-only";

import { EventEmitter } from "node:events";
import type { RoundWinner } from "./round-status";

declare global {
  // eslint-disable-next-line no-var
  var __roundEventEmitter: EventEmitter | undefined;
}

export type RoundEventCluePayload = {
  roundId: string;
  questionId: number;
  prompt: string;
  answer: string;
  value: number;
  categoryName: string;
};

export type RoundParticipantsEvent = {
  type: "participants-update";
};

export type RoundClueRevealedEvent = {
  type: "clue-revealed";
  clue: RoundEventCluePayload;
};

export type RoundStatePayload = {
  roundId: string;
  activePlayerId: string | null;
  questionId?: number;
  result?: "correct" | "incorrect";
  status?: "idle" | "active" | "closed";
  winners?: RoundWinner[];
};

export type RoundStateEvent = {
  type: "round-state";
  state: RoundStatePayload;
};

export type RoundEvent =
  | RoundParticipantsEvent
  | RoundClueRevealedEvent
  | RoundStateEvent;

type RoundEventName = RoundEvent["type"];

const emitter = globalThis.__roundEventEmitter ?? new EventEmitter();
emitter.setMaxListeners(0);
globalThis.__roundEventEmitter = emitter;

function getEventKey(roundId: string, event: RoundEventName): string {
  return `round:${roundId}:${event}`;
}

function emitRoundEvent(roundId: string, event: RoundEvent): void {
  emitter.emit(getEventKey(roundId, event.type), event);
}

export function emitRoundParticipantsUpdate(roundId: string): void {
  emitRoundEvent(roundId, { type: "participants-update" });
}

export function emitRoundClueReveal(
  roundId: string,
  clue: RoundEventCluePayload,
): void {
  emitRoundEvent(roundId, { type: "clue-revealed", clue });
}

export function emitRoundStateChange(
  roundId: string,
  state: RoundStatePayload,
): void {
  emitRoundEvent(roundId, { type: "round-state", state });
}

export function subscribeToRoundEvents(
  roundId: string,
  listener: (event: RoundEvent) => void,
): () => void {
  const keys: RoundEventName[] = [
    "participants-update",
    "clue-revealed",
    "round-state",
  ];
  for (const key of keys) {
    emitter.on(getEventKey(roundId, key), listener);
  }

  return () => {
    for (const key of keys) {
      emitter.off(getEventKey(roundId, key), listener);
    }
  };
}
