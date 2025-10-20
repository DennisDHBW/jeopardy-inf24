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
  status: string;
  categories: BoardCategory[];
  clues: BoardClue[];
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
    status: r.status,
    categories: cats,
    clues,
  };
}

async function getRoundParticipants(
  roundId: string,
): Promise<RoundParticipantView[]> {
  const participants = await db
    .select({
      userId: roundPlayers.userId,
      role: roundPlayers.role,
      score: roundPlayers.score,
      name: users.name,
    })
    .from(roundPlayers)
    .leftJoin(users, eq(users.id, roundPlayers.userId))
    .where(eq(roundPlayers.roundId, roundId))
    .orderBy(roundPlayers.joinedAt);

  return participants.map((p) => ({
    ...p,
    role: p.role === "host" ? "host" : "player",
  }));
}

// ⬇️ params ist ein Promise in Next 15
type PageProps = { params: Promise<{ roundId: string }> };

export default async function RoundPage({ params }: PageProps) {
  const { roundId } = await params; // ⬅️ erst awaiten
  const participantsPromise = getRoundParticipants(roundId);
  const hostIdPromise = participantsPromise.then(
    (items) =>
      items.find((participant) => participant.role === "host")?.userId ?? null,
  );

  const [session, data, hostId] = await Promise.all([
    getServerSession(),
    getBoardData(roundId),
    hostIdPromise,
  ]);

  if (!data) {
    return <div className="p-6">Runde {roundId} nicht gefunden.</div>;
  }

  const currentUserId = session?.user?.id ?? null;
  const playerName =
    typeof session?.user?.name === "string" ? session.user.name : null;

  const userProfileData = {
    name: session?.user?.name ?? playerName ?? "Gast",
    email: session?.user?.email ?? "unknown@example.com",
    avatar: session?.user?.image ?? "/avatars/shadcn.jpg",
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1024px] mx-auto">
        <div className="relative flex min-h-svh flex-col gap-2 bg-muted p-6">
          <RoundHeader status={data.status} roundId={roundId} />

          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
            <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-80 lg:h-full">
              <ParticipantsPanel
                participantsPromise={participantsPromise}
                currentUserId={currentUserId}
                roundId={roundId}
                className="h-full"
              />
            </aside>

            <main className="flex-1 lg:flex lg:flex-col lg:justify-start">
              <JeopardyBoard
                data={data}
                roundId={roundId}
                canSelect={Boolean(currentUserId) && currentUserId === hostId}
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
