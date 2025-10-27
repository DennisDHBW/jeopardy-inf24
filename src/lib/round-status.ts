export type RoundStatus = "idle" | "active" | "closed";

export type RoundWinner = {
  userId: string;
  name: string | null;
  score: number;
};

export function isRoundStatus(value: unknown): value is RoundStatus {
  return value === "idle" || value === "active" || value === "closed";
}
