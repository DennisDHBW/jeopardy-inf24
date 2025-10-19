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
import { JoinRoundForm } from "./_components/join-round-form";
import { ParticipantsPanel } from "./_components/participants-panel";
import { getRoundParticipants, type RoundParticipantView } from "@/lib/rounds";


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
  const rArr = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
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
      categoryId: questions.categoryId,        // wichtig fürs Board
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

// ⬇️ params ist ein Promise in Next 15
type PageProps = { params: Promise<{ roundId: string }> };

export default async function RoundPage({ params }: PageProps) {
  const { roundId } = await params;   // ⬅️ erst awaiten
  const [session, data, participants] = await Promise.all([
    getServerSession(),
    getBoardData(roundId),
    getRoundParticipants(roundId),
  ])

  if (!data) {
    return <div className="p-6">Runde {roundId} nicht gefunden.</div>;
  }

  const currentUserId = session?.user?.id ?? null;
  const currentParticipant = participants.find(p => p.userId === currentUserId);
  const currentRole = currentParticipant?.role ?? "player";
  const alreadyJoined = typeof currentUserId === "string"
    ? participants.some((p) => p.userId === currentUserId)
    : false;
  const playerName =
    typeof session?.user?.name === "string" ? session.user.name : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Runde: {data.gameId}</h1>
          <p className="text-muted-foreground">
            Status: {data.status} • Code:{" "}
            <span className="font-mono text-foreground">{roundId}</span>
          </p>
          {playerName && (
            <p className="text-muted-foreground text-sm mt-2">
              Angemeldet als <span className="font-medium">{playerName}</span>
            </p>
          )}
        </div>
        <JoinRoundForm
          roundId={roundId}
          isAuthenticated={typeof currentUserId === "string"}
          alreadyJoined={alreadyJoined}
        />
      </div>

      <ParticipantsPanel
        participants={participants}
        currentUserId={currentUserId}
      />

      <JeopardyBoard data={data} role={currentRole}/>
    </div>
  );
}
