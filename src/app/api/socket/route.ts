import { NextRequest } from "next/server";
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { db } from "@/db"; // 👈 deine DB-Verbindung
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
import { getRoundParticipants, RoundParticipantView } from "@/lib/rounds";

// Optional: Wenn du Better Auth Sessions prüfen willst
import { auth } from "@/lib/auth";
import { string } from "zod";

declare module "http" {
  interface Server {
    io?: SocketIOServer;
  }
}

let io: SocketIOServer | null = null;

export const GET = async (req: NextRequest) => {
  // @ts-ignore: Zugriff auf internen Next-HTTP-Server
  const server: HTTPServer = (req as any).socket?.server;

  if (!server.io) {
    console.log("🚀 Initialisiere Socket.IO Server...");
    io = new SocketIOServer(server, {
      path: "/api/socket",
      cors: { origin: "*" },
    });

    io.on("connection", async (socket) => {
      console.log("🟢 Client verbunden:", socket.id);

      // Optional: Session prüfen über Better Auth
      const cookieHeader = socket.handshake.headers.cookie || "";
      const session = await auth.api.getSession({ headers: { cookie: cookieHeader } });
      const currentUserId = session?.user?.id ?? null;

      console.log("👤 Verbundener User:", currentUserId ?? "anonymous");

      // 🟩 Event: Client tritt einer Runde bei
      socket.on("joinRound", async (roundId: string) => {
        if (!roundId) return;

        console.log(`🏁 User ${currentUserId} tritt Runde ${roundId} bei`);

        // Socket einem "Raum" hinzufügen, damit Nachrichten nur an diese Runde gehen
        socket.join(`round-${roundId}`);

        // Teilnehmer aus DB abrufen
        const participants = await getRoundParticipants(roundId);
        const currentParticipant = participants.find(p => p.userId === currentUserId);
        const currentRole = currentParticipant?.role ?? "player";

        console.log("🎭 Rolle:", currentRole);

        // Teilnehmerliste an alle Clients in dieser Runde schicken
        io?.to(`round-${roundId}`).emit("participantsUpdated", participants);
      });

      // 🟩 Event: Host öffnet eine Frage
      socket.on("questionOpened", async (data: { roundId: string; questionId: number }) => {
        const { roundId, questionId } = data;

        // Teilnehmer laden, um Rolle des aktuellen Users zu prüfen
        const participants = await getRoundParticipants(roundId);
        const currentParticipant = participants.find(p => p.userId === currentUserId);
        const currentRole = currentParticipant?.role ?? "player";

        if (currentRole !== "host") {
          console.log("🚫 Nicht berechtigt, Frage zu öffnen:", currentUserId);
          return;
        }

        console.log(`📣 Host öffnet Frage ${questionId} in Runde ${roundId}`);

        // An alle anderen Clients in derselben Runde senden
        socket.to(`round-${roundId}`).emit("showQuestionDialog", { questionId });
      });

      // 🟥 Client trennt Verbindung
      socket.on("disconnect", () => {
        console.log("🔴 Client getrennt:", socket.id);
      });
    });

    server.io = io;
  }

  return new Response("✅ Socket.IO läuft", { status: 200 });
};