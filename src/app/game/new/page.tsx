"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { createRoundAction } from "@/actions/rounds/create-round";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type State = {
  ok: boolean;
  error: string;
  name?: string;
  roundId?: string;
};

export default function NewGamePage() {
  const router = useRouter();

  const [state, formAction, pending] = useActionState<State, FormData>(
    createRoundAction,
    { ok: false, error: "", name: undefined, roundId: undefined },
  );

  // Variante B: nach Erfolg clientseitig navigieren
  useEffect(() => {
    if (state?.ok && typeof state.roundId === "string") {
      const href = `/rounds/${state.roundId}` as Route;
      router.push(href);
    }
  }, [state?.ok, state?.roundId, router]);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-96 shadow-lg border">
          <CardHeader>
            <CardTitle className="text-center">Neues Spiel erstellen</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction}>
              <FieldGroup className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="name">Rundenname</FieldLabel>
                  <Input id="name" name="name" placeholder="z. B. Freitagabend" />
                </Field>

                <Button variant="jeopardy" type="submit" disabled={pending}>
                  {pending ? "Erstelle…" : "Neue Runde"}
                </Button>

                {/* Fallback-Ausgabe */}
                {state?.ok && (
                  <FieldDescription className="text-center">
                    Runde erstellt: <span className="font-semibold">{state.name}</span> (ID: {state.roundId})
                  </FieldDescription>
                )}
                {state?.error && (
                  <p className="text-center text-red-600">{state.error}</p>
                )}
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
