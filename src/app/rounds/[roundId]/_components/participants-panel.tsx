"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export type RoundParticipantView = {
  userId: string;
  name: string | null;
  role: "host" | "player";
  score: number;
};

type ParticipantsPanelProps = {
  participantsPromise: Promise<RoundParticipantView[]>;
  currentUserId?: string | null;
  roundId: string;
  className?: string;
};

export function ParticipantsPanel({
  participantsPromise,
  currentUserId,
  roundId,
  className,
}: ParticipantsPanelProps) {
  const participants = use(participantsPromise);
  const hasParticipants = participants.length > 0;

  const router = useRouter();
  const visibilityRefreshRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const visibilityHandler = () => {
      if (
        document.visibilityState === "visible" &&
        visibilityRefreshRef.current
      ) {
        visibilityRefreshRef.current = false;
        router.refresh();
      }
    };

    document.addEventListener("visibilitychange", visibilityHandler);
    return () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [router]);

  useEffect(() => {
    let disposed = false;

    const handleUpdate = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      } else {
        visibilityRefreshRef.current = true;
      }
    };

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const closeEventSource = () => {
      const existing = eventSourceRef.current;
      if (existing) {
        existing.removeEventListener("participants-update", handleUpdate);
        existing.close();
        eventSourceRef.current = null;
      }
    };

    const connect = () => {
      closeEventSource();
      if (disposed) return;

      const source = new EventSource(`/api/rounds/${roundId}/events`);
      eventSourceRef.current = source;

      source.addEventListener("participants-update", handleUpdate);

      source.onerror = () => {
        if (disposed) {
          return;
        }
        closeEventSource();
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(connect, 3_000);
      };
    };

    connect();

    return () => {
      disposed = true;
      closeEventSource();
      clearReconnectTimeout();
    };
  }, [roundId, router]);

  return (
    <Card className={cn("border bg-card shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="size-4" />
          Spieler
        </CardTitle>
        <Badge variant="secondary" className="text-sm">
          {participants.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasParticipants ? (
          <ul className="space-y-2">
            {participants.map((participant) => {
              const isCurrent = participant.userId === currentUserId;
              const label =
                typeof participant.name === "string" &&
                participant.name.length > 0
                  ? participant.name
                  : "Unbenannt";

              return (
                <li
                  key={participant.userId}
                  className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-foreground">
                      {label}
                      {isCurrent && (
                        <span className="ml-2 text-xs text-primary font-semibold uppercase">
                          (Du)
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {participant.role === "host" ? "Host" : "Spieler"}
                    </span>
                  </div>
                  <Badge
                    variant={
                      participant.role === "host" ? "default" : "outline"
                    }
                    className="text-sm"
                  >
                    {participant.score} Punkte
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-base text-muted-foreground">
            Noch keine Spielenden beigetreten.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
