import { db } from "@/db";
import {
  rounds,
  roundCategories,
  roundClues,
  categories,
  questions,
  roundPlayers,
  user as users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-server";
import JeopardyBoard from "./_components/jeopardy-board";
import {
  ParticipantsPanel,
  type RoundParticipantView,
} from "./_components/participants-panel";
import { RoundHeader } from "./_components/round-header";
import { UserProfile } from "@/components/user-profile";
import type { RoundStatus, RoundWinner } from "@/lib/round-status";

type BoardCategory = {
  columnIndex: number;
  categoryId: number;
  name: string;
};

type BoardClue = {
  categoryId: number;
  columnIndex: number;
  rowIndex: number;
  questionId: number;
  prompt: string;
  answer: string;
  value: number;
  revealed: 0 | 1;
  answered: 0 | 1;
};

export type RoundBoardData = {
  roundId: string;
  gameId: string;
  status: RoundStatus;
  categories: BoardCategory[];
  clues: BoardClue[];
  currentPlayerId: string | null;
};

async function getBoardData(roundId: string): Promise<RoundBoardData | null> {
  const rArr = await db
    .select()
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);
  if (rArr.length === 0) return null;
  const r = rArr[0];
  if (!r) return null;

  const cats = await db
    .select({
      columnIndex: roundCategories.columnIndex,
      categoryId: roundCategories.categoryId,
      name: categories.name,
    })
    .from(roundCategories)
    .innerJoin(categories, eq(categories.id, roundCategories.categoryId))
    .where(eq(roundCategories.roundId, roundId))
    .orderBy(roundCategories.columnIndex);

  const cluesRaw = await db
    .select({
      categoryId: questions.categoryId,
      columnIndex: roundClues.columnIndex,
      rowIndex: roundClues.rowIndex,
      questionId: roundClues.questionId,
      prompt: questions.prompt,
      answer: questions.answer,
      value: questions.value,
      revealed: roundClues.revealed,
      answered: roundClues.answered,
    })
    .from(roundClues)
    .innerJoin(questions, eq(questions.id, roundClues.questionId))
    .where(eq(roundClues.roundId, roundId))
    .orderBy(roundClues.columnIndex, roundClues.rowIndex);

  const clues: BoardClue[] = cluesRaw.map((c) => ({
    ...c,
    revealed: (c.revealed ? 1 : 0) as 0 | 1,
    answered: (c.answered ? 1 : 0) as 0 | 1,
  }));

  return {
    roundId,
    gameId: r.gameId,
    status: r.status as RoundStatus,
    categories: cats,
    clues,
    currentPlayerId: r.currentPlayerId ?? null,
  };
}

async function getRoundParticipants(roundId: string): Promise<{
  participants: RoundParticipantView[];
  activePlayerId: string | null;
}> {
  const [participants, roundState] = await Promise.all([
    db
      .select({
        userId: roundPlayers.userId,
        role: roundPlayers.role,
        score: roundPlayers.score,
        name: users.name,
      })
      .from(roundPlayers)
      .leftJoin(users, eq(users.id, roundPlayers.userId))
      .where(eq(roundPlayers.roundId, roundId))
      .orderBy(roundPlayers.joinedAt),
    db
      .select({ currentPlayerId: rounds.currentPlayerId })
      .from(rounds)
      .where(eq(rounds.id, roundId))
      .limit(1),
  ]);

  return {
    participants: participants.map((p) => ({
      ...p,
      role: p.role === "host" ? "host" : "player",
    })),
    activePlayerId: roundState[0]?.currentPlayerId ?? null,
  };
}

function selectWinner(
  participants: RoundParticipantView[],
): RoundWinner | null {
  const players = participants.filter(
    (participant) => participant.role === "player",
  );
  if (players.length === 0) {
    return null;
  }

  const top = players.reduce(
    (best, participant) =>
      participant.score > best.score ? participant : best,
    players[0],
  );

  return {
    userId: top.userId,
    name: top.name,
    score: top.score,
  };
}

// ⬇️ params ist ein Promise in Next 15
type PageProps = { params: Promise<{ roundId: string }> };

export default async function RoundPage({ params }: PageProps) {
  const { roundId } = await params; // ⬅️ erst awaiten
  const participantsPromise = getRoundParticipants(roundId);

  const [session, data, participantsData] = await Promise.all([
    getServerSession(),
    getBoardData(roundId),
    participantsPromise,
  ]);

  if (!data) {
    return <div className="p-6">Runde {roundId} nicht gefunden.</div>;
  }

  const participantsPromiseForClient = Promise.resolve(participantsData);
  const hostId =
    participantsData.participants.find(
      (participant) => participant.role === "host",
    )?.userId ?? null;

  const currentUserId = session?.user?.id ?? null;
  const playerName =
    typeof session?.user?.name === "string" ? session.user.name : null;

  const userProfileData = {
    name: session?.user?.name ?? playerName ?? "Gast",
    email: session?.user?.email ?? "unknown@example.com",
    avatar: session?.user?.image ?? "/avatars/shadcn.jpg",
  };

  const isHost = Boolean(currentUserId) && currentUserId === hostId;

  const initialWinner =
    data.status === "closed"
      ? selectWinner(participantsData.participants)
      : null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1024px] mx-auto">
        <div className="relative flex min-h-svh flex-col gap-2 bg-muted p-6">
          <RoundHeader
            status={data.status}
            roundId={roundId}
            isHost={currentUserId === hostId}
          />

          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
            <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-80 lg:h-full">
              <ParticipantsPanel
                participantsPromise={participantsPromiseForClient}
                currentUserId={currentUserId}
                roundId={roundId}
                className="h-full"
              />
            </aside>

            <main className="flex-1 lg:flex lg:flex-col lg:justify-start">
              <JeopardyBoard
                data={data}
                roundId={roundId}
                canSelect={isHost}
                status={data.status}
                isHost={isHost}
                initialWinner={initialWinner}
              />
            </main>

            <div className="fixed bottom-6 left-6 z-50">
              <UserProfile user={userProfileData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
