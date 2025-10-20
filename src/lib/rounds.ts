// src/lib/rounds.ts
export type RoundParticipantView = {
  userId: string;
  name: string | null;
  role: "host" | "player";
  score: number;
};

// Beispiel für spätere DB-Funktion (falls du Drizzle o.ä. nutzt)
import { db } from "@/db";
import { roundPlayers, user as users} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getRoundParticipants(roundId: string): Promise<RoundParticipantView[]> {
  const participants = await db
    .select({
      userId: roundPlayers.userId,
      name: users.name,
      role: roundPlayers.role,
      score: roundPlayers.score,
    })
    .from(roundPlayers)
    .leftJoin(users, eq(users.id, roundPlayers.userId))
    .where(eq(roundPlayers.roundId, roundId))
    .orderBy(roundPlayers.joinedAt);

  // Normalize role string into the expected union type ("host" | "player")
  return participants.map((p) => ({
    userId: p.userId,
    name: p.name,
    role: p.role === "host" ? "host" : "player",
    score: p.score,
  }));
}
