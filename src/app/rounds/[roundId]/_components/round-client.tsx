"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import JeopardyBoard from "./jeopardy-board";
import { ParticipantsPanel } from "./participants-panel";
import type { RoundBoardData } from "../page";
import { RoundParticipantView } from "@/lib/rounds";

declare global {
  interface Window {
    __socket?: Socket;
  }
}

type Props = {
  initialBoard: RoundBoardData;
  initialParticipants: RoundParticipantView[];
  currentUserId?: string | null;
  role?: "host" | "player" | "spectator";
};

export default function RoundClient({
  initialBoard,
  initialParticipants,
  currentUserId,
  role = "player",
}: Props) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [board, setBoard] = useState<RoundBoardData>(initialBoard);
  const roundId = initialBoard.roundId;

  const socketOptions = useMemo(() => ({ path: "/api/socket" }), []);
  useEffect(() => {
    const socket: Socket = io(socketOptions);
    socket.emit("joinRound", roundId);

    socket.on("participantsUpdated", (p: RoundParticipantView[]) => {
      setParticipants(p);
    });

    socket.on("showQuestionDialog", ({ questionId }: { questionId: number }) => {
      // Host opened a question — you might want to update board state or open a modal
      console.log("showQuestionDialog", questionId);
      // For now, nothing else — child component can handle UI via onOpenQuestion
    });

    return () => {
      socket.disconnect();
    };
  }, [roundId, socketOptions]);

  // Handler when host opens a question from the board — emit to server
  const handleOpenQuestion = (questionId: number) => {
    // optimistic local action could go here
    const s = (window as any).__socket as Socket | undefined;
    if (s && s.connected) {
      s.emit("questionOpened", { roundId, questionId });
    } else {
      // fallback: open a temporary connection to emit
      const tmp = io(socketOptions);
      tmp.emit("questionOpened", { roundId, questionId });
      tmp.disconnect();
    }
  };

  return (
    <div className="space-y-6">
      <ParticipantsPanel participants={participants} currentUserId={currentUserId} />
      <JeopardyBoard data={board} role={role} onOpenQuestion={handleOpenQuestion} />
    </div>
  );
}
