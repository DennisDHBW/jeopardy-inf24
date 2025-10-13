import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export type RoundParticipantView = {
  userId: string;
  name: string | null;
  role: "host" | "player";
  score: number;
};

type ParticipantsPanelProps = {
  participants: RoundParticipantView[];
  currentUserId?: string | null;
};

export function ParticipantsPanel({
  participants,
  currentUserId,
}: ParticipantsPanelProps) {
  const hasParticipants = participants.length > 0;

  return (
    <Card className="border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="size-4" />
          Spielende
        </CardTitle>
        <Badge variant="secondary">{participants.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasParticipants ? (
          <ul className="space-y-1">
            {participants.map((participant) => {
              const isCurrent = participant.userId === currentUserId;
              const label =
                typeof participant.name === "string" && participant.name.length > 0
                  ? participant.name
                  : "Unbenannt";

              return (
                <li
                  key={participant.userId}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {label}
                      {isCurrent && (
                        <span className="ml-2 text-xs text-primary font-semibold">
                          (Du)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {participant.role === "host" ? "Host" : "Spieler"}
                    </span>
                  </div>
                  <Badge variant={participant.role === "host" ? "default" : "outline"}>
                    {participant.score} Punkte
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine Spielenden beigetreten.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
