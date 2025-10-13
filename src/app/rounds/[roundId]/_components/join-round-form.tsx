"use client";

import { useMemo } from "react";
import { joinRoundAction, type JoinRoundState } from "@/actions/rounds/join-round";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { Check, LogIn, AlertCircle } from "lucide-react";

type JoinRoundFormProps = {
  roundId: string;
  isAuthenticated: boolean;
  alreadyJoined: boolean;
};

const baseState: JoinRoundState = { ok: false, error: "", alreadyJoined: false };

export function JoinRoundForm({
  roundId,
  isAuthenticated,
  alreadyJoined,
}: JoinRoundFormProps) {
  const initialState = useMemo(
    () => ({ ...baseState, alreadyJoined }),
    [alreadyJoined],
  );

  const { state, formAction, pending } = useFormAction<JoinRoundState>(
    joinRoundAction,
    initialState,
  );

  const joined =
    alreadyJoined || state.alreadyJoined === true || (state.ok && !state.error);

  const disabled = pending || joined || !isAuthenticated;

  return (
    <div className="flex flex-col gap-2 md:items-end">
      <form
        action={formAction}
        className="flex items-center gap-2"
        data-pending={pending ? "" : undefined}
      >
        <input type="hidden" name="roundId" value={roundId} />
        <Button
          type="submit"
          variant="jeopardy"
          disabled={disabled}
          className="min-w-40"
        >
          {joined ? (
            <>
              <Check className="size-4" />
              Bereits beigetreten
            </>
          ) : (
            <>
              <LogIn className="size-4" />
              Runde beitreten
            </>
          )}
        </Button>
      </form>
      <div className="text-sm text-muted-foreground" aria-live="polite">
        {!isAuthenticated && (
          <span className="inline-flex items-center gap-1 text-destructive">
            <AlertCircle className="size-4" />
            Bitte melde dich zuerst an.
          </span>
        )}
        {isAuthenticated && state.error && !joined && (
          <span className="inline-flex items-center gap-1 text-destructive">
            <AlertCircle className="size-4" />
            {state.error}
          </span>
        )}
        {isAuthenticated && joined && (
          <span className="inline-flex items-center gap-1 text-primary">
            <Check className="size-4" />
            Du bist Teil dieser Runde.
          </span>
        )}
      </div>
    </div>
  );
}
