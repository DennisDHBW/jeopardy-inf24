import { NextRequest } from "next/server";
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { db } from "@/db"; // 👈 deine DB-Verbindung
import { getRoundParticipants } from "@/lib/rounds"; // 👈 deine Funktion (z. B. in lib/rounds.ts)

// Optional: Wenn du Better Auth Sessions prüfen willst
import { auth } from "@/lib/auth";

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

      // (optional) Better Auth Session prüfen
      const cookieHeader = socket.handshake.headers.cookie || "";
      const session = await auth.api.getSession({ headers: { cookie: cookieHeader } });
      const user = session?.user ?? null;
      const currentUserId = session?.user?.id ?? null;
      const currentParticipant = participants.find(p => p.userId === currentUserId);
      const currentRole = currentParticipant?.role ?? "player";
      console.log("👤 User:", user?.id ?? "anonymous");

      // Nur Host darf Fragen öffnen
      socket.on("questionOpened", (data) => {
        if (user?.role !== "host") return; // Sicherheit
        console.log("📣 Frage geöffnet:", data);
        socket.broadcast.emit("showQuestionDialog", data);
      });

      socket.on("disconnect", () => {
        console.log("🔴 Client getrennt:", socket.id);
      });
    });

    server.io = io;
  }

  return new Response("Socket.IO server läuft ✅", { status: 200 });
};