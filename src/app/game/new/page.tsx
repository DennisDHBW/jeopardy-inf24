"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Play } from "lucide-react";

function CreateGame() {
  return (
    <Card className="w-96 shadow-lg border">
      <CardHeader>
        <CardTitle>
            <center>Neues Spiel erstellen</center>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex justify-center">
        <Button asChild variant="jeopardy">
          <Link href="/game/roundId">
            <Play className="h-4 w-4" aria-hidden="true" />
            Neue Runde
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <CreateGame />
    </div>
  );
}