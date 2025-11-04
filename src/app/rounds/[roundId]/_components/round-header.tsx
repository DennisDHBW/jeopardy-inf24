"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Play, StopCircle, DoorOpen } from "lucide-react";
import { useFormAction } from "@/lib/use-form-action";
import {
  startRoundAction,
  type StartRoundState,
} from "@/actions/rounds/start-round";
import { isRoundStatus, type RoundStatus } from "@/lib/round-status";
import {
  closeRoundAction,
  type CloseRoundState,
} from "@/actions/rounds/close-round";
import {
  leaveRoundAction,
  type LeaveRoundState,
} from "@/actions/rounds/leave-round";

type RoundHeaderProps = {
  status: RoundStatus;
  roundId: string;
  isHost: boolean;
  canLeave: boolean;
};

export function RoundHeader({
  status,
  roundId,
  isHost,
  canLeave,
}: RoundHeaderProps) {
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

  const {
    state: closeState,
    formAction: closeAction,
    pending: closePending,
  } = useFormAction<CloseRoundState>(closeRoundAction, {
    ok: false,
    error: null,
  });

  const {
    state: leaveState,
    formAction: leaveAction,
    pending: leavePending,
  } = useFormAction<LeaveRoundState>(leaveRoundAction, {
    ok: false,
    error: null,
  });

  const hasErrorMessage = Boolean(
    startState?.error || closeState?.error || leaveState?.error,
  );
  const showHostStart = isHost && currentStatus === "idle";
  const showHostClose = isHost;
  const showLeave = canLeave;
  const showActions = showHostStart || showHostClose || showLeave;

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  useEffect(() => {
    if (startState?.ok) {
      router.refresh();
    }
  }, [startState?.ok, router]);

  useEffect(() => {
    if (closeState?.ok) {
      router.refresh();
    }
  }, [closeState?.ok, router]);

  useEffect(() => {
    if (leaveState?.ok) {
      router.push("/home");
    }
  }, [leaveState?.ok, router]);

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

      {showActions ? (
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {showHostStart ? (
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
          {showHostClose ? (
            <form action={closeAction} className="flex items-center gap-2">
              <input type="hidden" name="roundId" value={roundId} />
              <Button
                type="submit"
                variant="destructive"
                disabled={closePending || currentStatus === "closed"}
                className="flex items-center gap-2"
              >
                <StopCircle className="size-4" />
                {closePending ? "Schließt…" : "Runde schließen"}
              </Button>
            </form>
          ) : null}
          {showLeave ? (
            <form action={leaveAction} className="flex items-center gap-2">
              <input type="hidden" name="roundId" value={roundId} />
              <Button
                type="submit"
                variant="outline"
                disabled={leavePending}
                className="flex items-center gap-2"
              >
                <DoorOpen className="size-4" />
                {leavePending ? "Verlasse…" : "Runde verlassen"}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {hasErrorMessage ? (
        <div className="flex flex-col gap-1 text-sm text-destructive">
          {startState?.error ? <span>{startState.error}</span> : null}
          {closeState?.error ? <span>{closeState.error}</span> : null}
          {leaveState?.error ? <span>{leaveState.error}</span> : null}
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
