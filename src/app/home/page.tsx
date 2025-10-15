"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldDescription } from "@/components/ui/field";
import { useActionState, useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { UserProfile } from "@/components/user-profile"
import { roundFormAction } from "@/actions/rounds/handler";


type State = {
  ok: boolean;
  error: string;
  name?: string;
  roundId?: string;
};

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  }
};

export default function HomePage() {
  const router = useRouter();

  const [state, formAction, pending] = useActionState<State, FormData>(
      roundFormAction,
      { ok: false, error: "", roundId: undefined },
  );

  const [activeIntent, setActiveIntent] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok && typeof state.roundId === "string") {
      const href = `/rounds/${state.roundId}` as Route;
      router.push(href);
    }

    if (!pending) {
      setActiveIntent(null);
    }
  }, [pending, router, state]);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <Card className="w-96 shadow-lg border">
        <CardHeader>
          <CardTitle className="text-center text-4xl font-bold">Hauptmenü</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup className="space-y-4">
              {/* Button 1: Spiel erstellen */}
              <Button
                variant="jeopardy"
                type="submit"
                name="intent"
                value="create"
                onClick={() => setActiveIntent("create")}
                disabled={pending}
                className="w-full"
              >
                {pending && activeIntent == 'create' ? "Erstellen..." : "Spiel erstellen"}
              </Button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-400"></div>
                <span className="flex-shrink mx-4 text-gray-400">oder</span>
                <div className="flex-grow border-t border-gray-400"></div>
              </div>

              {/* Input-Feld für die Runden-ID */}
              <Input 
                name="roundId"
                placeholder="ID des Spiels eingeben..."
              />
              
              {/* Button 2: Spiel beitreten */}
              <Button
                variant="jeopardy"
                type="submit"
                name="intent" 
                value="join" 
                onClick={() => setActiveIntent("join")}
                disabled={pending}
                className="w-full"
              >
                {pending && activeIntent == 'join' ? "Beitreten…" : "Spiel beitreten"}
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
      <div className="absolute bottom-6 left-6">
        <UserProfile user={data.user}/>
      </div>
    </div>
  );
}
