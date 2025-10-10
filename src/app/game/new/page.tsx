"use client";

import { useActionState } from "react";
import { createRoundAction } from "@/actions/newgame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function NewGamePage() {
  const [state, formAction, pending] = useActionState(createRoundAction, {});

  return (
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

              {/* ▶️ Ausgabe NACH der Server Action */}
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
  );
}
