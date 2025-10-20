"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { RoundBoardData } from "../page";
import { useFormAction } from "@/lib/use-form-action";
import {
  revealClueAction,
  type RevealClueState,
} from "@/actions/rounds/reveal-clue";
import type { RoundEventCluePayload } from "@/lib/round_events";

const BOARD_CLS =
  "rounded-3xl bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-slate-900 dark:to-slate-950 p-3 sm:p-4 shadow-xl border";
const GRID_CLS = "grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3";
const CATEGORY_CARD_CLS =
  "bg-card text-card-foreground border shadow-sm rounded-2xl";
const CATEGORY_TITLE_CLS =
  "text-xs tracking-widest text-center uppercase text-muted-foreground";
const TILE_CARD_CLS =
  "bg-gradient-to-b from-indigo-600 to-indigo-700 transition-colors border text-indigo-50 shadow-lg rounded-2xl select-none";
const TILE_VALUE_CLS = "text-3xl font-extrabold tracking-wide";

const TIERS = [100, 200, 300, 400, 500] as const;

type JeopardyBoardProps = {
  data: RoundBoardData;
  roundId: string;
  canSelect: boolean;
};

type ValueTileProps = {
  value: number;
  questionId?: number;
  revealed: boolean;
  interactable: boolean;
  onSelect?: () => void;
};

function CategoryHeader({ title }: { title: string }) {
  return (
    <Card className={CATEGORY_CARD_CLS}>
      <CardHeader className="p-3">
        <CardTitle className={CATEGORY_TITLE_CLS}>{title}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ValueTile({
  value,
  questionId,
  revealed,
  interactable,
  onSelect,
}: ValueTileProps) {
  if (!questionId) {
    return (
      <Card className={`${TILE_CARD_CLS} opacity-50 pointer-events-none`}>
        <CardContent className="h-20 grid place-items-center">
          <span className={TILE_VALUE_CLS}>${value}</span>
        </CardContent>
      </Card>
    );
  }

  const tileClasses = cn(
    TILE_CARD_CLS,
    interactable && "hover:from-indigo-500 hover:to-indigo-600",
    revealed && "opacity-50 pointer-events-none",
    !interactable && !revealed && "cursor-default",
  );

  const content = (
    <Card className={tileClasses}>
      <CardContent className="h-20 grid place-items-center">
        <span className={cn(TILE_VALUE_CLS, revealed && "opacity-0")}>
          ${value}
        </span>
      </CardContent>
    </Card>
  );

  if (!interactable) {
    return content;
  }

  return (
    <button
      type="submit"
      name="questionId"
      value={String(questionId)}
      className="block"
      onClick={onSelect}
    >
      {content}
    </button>
  );
}

export default function JeopardyBoard({
  data,
  roundId,
  canSelect,
}: JeopardyBoardProps) {
  const { categories, clues } = data;

  const initialRevealedIds = useMemo(
    () =>
      clues
        .filter((clue) => clue.revealed === 1)
        .map((clue) => clue.questionId),
    [clues],
  );

  const [revealedIds, setRevealedIds] = useState<Set<number>>(
    () => new Set(initialRevealedIds),
  );
  const [activeClue, setActiveClue] = useState<RoundEventCluePayload | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingQuestionRef = useRef<number | null>(null);

  const { state, formAction, pending } = useFormAction<RevealClueState>(
    revealClueAction,
    { ok: false, error: null },
  );

  useEffect(() => {
    setRevealedIds(new Set(initialRevealedIds));
  }, [initialRevealedIds]);

  useEffect(() => {
    if (state?.ok && state.clue) {
      setActiveClue(state.clue);
      setDialogOpen(true);
      setErrorMessage(null);
      setRevealedIds((prev) => {
        if (prev.has(state.clue!.questionId)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(state.clue.questionId);
        return next;
      });
    } else if (state?.error) {
      setErrorMessage(state.error);
    }

    if (!pending) {
      pendingQuestionRef.current = null;
    }
  }, [state, pending]);

  useEffect(() => {
    let disposed = false;

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const closeEventSource = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };

    const handleClueRevealed = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as RoundEventCluePayload;
        if (payload?.questionId) {
          setActiveClue(payload);
          setDialogOpen(true);
          setErrorMessage(null);
          setRevealedIds((prev) => {
            if (prev.has(payload.questionId)) {
              return prev;
            }
            const next = new Set(prev);
            next.add(payload.questionId);
            return next;
          });
        }
      } catch {
        // ignore malformed payloads
      }
    };

    const connect = () => {
      closeEventSource();
      if (disposed) return;

      const source = new EventSource(`/api/rounds/${roundId}/events`);
      eventSourceRef.current = source;

      source.addEventListener(
        "clue-revealed",
        handleClueRevealed as EventListener,
      );

      source.onerror = () => {
        if (disposed) return;
        source.removeEventListener(
          "clue-revealed",
          handleClueRevealed as EventListener,
        );
        closeEventSource();
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(connect, 3_000);
      };
    };

    connect();

    return () => {
      disposed = true;
      const source = eventSourceRef.current;
      if (source) {
        source.removeEventListener(
          "clue-revealed",
          handleClueRevealed as EventListener,
        );
      }
      closeEventSource();
      clearReconnectTimeout();
    };
  }, [roundId]);

  const getClue = (categoryId: number, value: number) =>
    clues.find(
      (clue) => clue.categoryId === categoryId && clue.value === value,
    );

  return (
    <>
      <form action={formAction} className="w-full max-w-6xl mx-auto p-4 sm:p-0">
        <input type="hidden" name="roundId" value={roundId} />
        <div className={BOARD_CLS}>
          <div className={GRID_CLS}>
            {categories.map((category) => (
              <CategoryHeader key={category.categoryId} title={category.name} />
            ))}
          </div>

          <div className="h-3" />

          <div className="space-y-2">
            {TIERS.map((tier) => (
              <div className={GRID_CLS} key={tier}>
                {categories.map((category) => {
                  const clue = getClue(category.categoryId, tier);
                  const questionId = clue?.questionId;
                  const revealed = questionId
                    ? revealedIds.has(questionId)
                    : false;
                  return (
                    <ValueTile
                      key={`${category.categoryId}-${tier}`}
                      value={tier}
                      questionId={questionId}
                      revealed={revealed}
                      interactable={
                        Boolean(questionId) &&
                        canSelect &&
                        !revealed &&
                        pendingQuestionRef.current !== questionId &&
                        !pending
                      }
                      onSelect={() => {
                        if (!questionId) return;
                        pendingQuestionRef.current = questionId;
                        setErrorMessage(null);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {errorMessage && (
          <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
        )}
      </form>

      <Dialog
        open={dialogOpen && Boolean(activeClue)}
        onOpenChange={setDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="tracking-wide">
              {activeClue?.categoryName} • ${activeClue?.value}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-base text-foreground">{activeClue?.prompt}</p>
            {canSelect && activeClue?.answer ? (
              <>
                <Separator />
                <p className="italic text-sm text-muted-foreground">
                  Antwort:{" "}
                  <span className="font-semibold">{activeClue.answer}</span>
                </p>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
