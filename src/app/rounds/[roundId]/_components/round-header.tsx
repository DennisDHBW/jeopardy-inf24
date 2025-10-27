"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Play } from "lucide-react";
import { useFormAction } from "@/lib/use-form-action";
import {
  startRoundAction,
  type StartRoundState,
} from "@/actions/rounds/start-round";
import { isRoundStatus, type RoundStatus } from "@/lib/round-status";

type RoundHeaderProps = {
  status: RoundStatus;
  roundId: string;
  isHost: boolean;
};

export function RoundHeader({ status, roundId, isHost }: RoundHeaderProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<RoundStatus>(status);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const {
    state: startState,
    formAction: startAction,
    pending: startPending,
  } = useFormAction<StartRoundState>(startRoundAction, {
    ok: false,
    error: null,
  });

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  useEffect(() => {
    if (startState?.ok) {
      router.refresh();
    }
  }, [startState?.ok, router]);

  useEffect(() => {
    let disposed = false;

    const handleRoundState = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          status?: RoundStatus;
        };
        if (isRoundStatus(payload?.status)) {
          setCurrentStatus(payload.status);
        }
      } catch {
        // ignore malformed payloads
      }
    };

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const closeEventSource = () => {
      const source = eventSourceRef.current;
      if (source) {
        source.removeEventListener(
          "round-state",
          handleRoundState as EventListener,
        );
        source.close();
        eventSourceRef.current = null;
      }
    };

    const connect = () => {
      closeEventSource();
      if (disposed) return;

      const source = new EventSource(`/api/rounds/${roundId}/events`);
      eventSourceRef.current = source;
      source.addEventListener("round-state", handleRoundState as EventListener);

      source.onerror = () => {
        if (disposed) return;
        source.removeEventListener(
          "round-state",
          handleRoundState as EventListener,
        );
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
  }, [roundId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roundId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/60 px-4 py-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-base text-muted-foreground">
        <span className="font-medium text-foreground">Status</span>
        <Badge variant="outline" className="uppercase tracking-wide">
          {currentStatus}
        </Badge>
      </div>

      {isHost ? (
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {currentStatus === "idle" ? (
            <form action={startAction} className="flex items-center gap-2">
              <input type="hidden" name="roundId" value={roundId} />
              <Button
                type="submit"
                variant="default"
                disabled={startPending}
                className="flex items-center gap-2"
              >
                <Play className="size-4" />
                {startPending ? "Startet…" : "Runde starten"}
              </Button>
            </form>
          ) : null}
          {startState?.error ? (
            <p className="text-sm text-destructive">{startState.error}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <span className="rounded-md bg-muted/60 px-3 py-1.5 font-mono text-base text-foreground">
          {roundId}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="flex items-center gap-2"
          aria-label="Spielcode kopieren"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Kopiert" : "Code kopieren"}
        </Button>
      </div>
    </div>
  );
}
