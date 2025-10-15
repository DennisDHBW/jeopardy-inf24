// src/actions/rounds/handler.ts

"use server";

import { createRoundAction } from "./create-round";
import { joinRoundAction } from "./join-round";

// Der State-Typ, den deine Komponente erwartet
type State = {
  ok: boolean;
  error: string;
  roundId?: string;
};

export async function roundFormAction(prevState: State, formData: FormData): Promise<State> {
  const intent = formData.get("intent");

  if (intent === "create") {
    console.log("Aktion: Spiel erstellen");
    return createRoundAction(prevState, formData);
  }

  if (intent === "join") {
    const roundId = formData.get("roundId");
    if (!roundId || typeof roundId !== 'string' || roundId.trim() === '') {
        return { ok: false, error: "Bitte eine gültige Spiel-ID eingeben." };
    }
    
    console.log("Aktion: Spiel beitreten mit ID:", roundId);
    return joinRoundAction(prevState, formData);
  }
  return { ok: false, error: "Unbekannte Aktion." };
}