"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { UserProfile } from "@/components/user-profile";
import { roundFormAction } from "@/actions/rounds/handler";

type RoundFormState = {
  ok: boolean;
  error: string;
  name?: string;
  roundId?: string;
};

type HomeMenuProps = {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
};

export function HomeMenu({ user }: HomeMenuProps) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState<RoundFormState, FormData>(
    roundFormAction,
    { ok: false, error: "", roundId: undefined },
  );

  const [activeIntent, setActiveIntent] = useState<string | null>(null);

  const userProfile = useMemo(
    () => ({
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    }),
    [user.avatar, user.email, user.name],
  );

  useEffect(() => {
    if (state?.ok && typeof state.roundId === "string") {
      const href = `/rounds/${state.roundId}` as Route;
      router.push(href);
    }
    if (!pending) {
      setActiveIntent(null);
    }
  }, [router, pending, state?.ok, state?.roundId]);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <Card className="w-96 shadow-lg border">
        <CardHeader>
          <CardTitle className="text-center text-4xl font-bold">
            Hauptmenü
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup className="space-y-4">
              <Button
                variant="jeopardy"
                type="submit"
                name="intent"
                value="create"
                onClick={() => setActiveIntent("create")}
                disabled={pending}
                className="w-full"
              >
                {pending && activeIntent === "create"
                  ? "Erstellen..."
                  : "Spiel erstellen"}
              </Button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-400" />
                <span className="mx-4 flex-shrink text-gray-400">oder</span>
                <div className="flex-grow border-t border-gray-400" />
              </div>

              <Input name="roundId" placeholder="ID des Spiels eingeben..." />

              <Button
                variant="jeopardy"
                type="submit"
                name="intent"
                value="join"
                onClick={() => setActiveIntent("join")}
                disabled={pending}
                className="w-full"
              >
                {pending && activeIntent === "join"
                  ? "Beitreten…"
                  : "Spiel beitreten"}
              </Button>

              {state?.ok && (
                <FieldDescription className="text-center">
                  Runde erstellt:{" "}
                  <span className="font-semibold">{state.name}</span> (ID:{" "}
                  {state.roundId})
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
        <UserProfile user={userProfile} />
      </div>
    </div>
  );
}
