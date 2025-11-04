export type RoundStatus = "idle" | "active" | "closed";

export type RoundWinner = {
  userId: string;
  name: string | null;
  score: number;
};

export function isRoundStatus(value: unknown): value is RoundStatus {
  return value === "idle" || value === "active" || value === "closed";
}

export type RoundParticipantScore = {
  userId: string;
  name: string | null;
  role: "host" | "player";
  score: number;
};

export function determineRoundWinners(
  participants: RoundParticipantScore[],
): RoundWinner[] {
  const players = participants.filter(
    (participant) => participant.role === "player",
  );

  if (players.length === 0) {
    return [];
  }

  const highestScore = players.reduce(
    (best, participant) =>
      participant.score > best ? participant.score : best,
    players[0]?.score ?? 0,
  );

  return players
    .filter((participant) => participant.score === highestScore)
    .map((participant) => ({
      userId: participant.userId,
      name: participant.name ?? null,
      score: participant.score ?? 0,
    }));
}
