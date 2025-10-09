"use client";
import * as React from "react"; // warum?
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Statisches UI ohne Spiellogik – nur Layout & Komponenten.
// Tech: Next.js/React + Tailwind + shadcn/ui (Radix basiert)

const CATEGORIES = [
  "GUESSTHE MOVIE TITLE",
  "SPELL IT OUT",
  "TV SHOW INTROS",
  "3 MOVIES, 1 ACTOR",
  "A STAR IS BORN…",
  "7TH GRADE SCIENCE",
];

const VALUES = [200, 400, 600, 800, 1000];

function CategoryHeader({ title }: { title: string }) {
  return (
    <Card className="bg-card text-card-foreground border shadow-sm rounded-2xl">
      <CardHeader className="p-3">
        <CardTitle className="text-xs tracking-widest text-center uppercase text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function ValueTile({ amount }: { amount: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition-colors border text-indigo-50 shadow-lg rounded-2xl cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-300">
          <CardContent className="h-20 grid place-items-center">
            <span className="text-3xl font-extrabold tracking-wide">${amount}</span>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="tracking-wide">Kategorie • ${amount}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-muted-foreground">Hier könnte die Frage stehen. (Nur UI, keine Logik.)</p>
          <Separator />
          <p className="italic opacity-80">Antwort kommt hierhin – z. B. per Toggle später.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function JeopardyBoard() {
  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
      {/* Rahmen */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-slate-900 dark:to-slate-950 p-3 sm:p-4 shadow-xl border">
        {/* Kategorien-Zeile */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3">
          {CATEGORIES.map((c) => (
            <CategoryHeader key={c} title={c} />
          ))}
        </div>

        <div className="h-3" />

        {/* Spielfeld: 5 Reihen x 6 Spalten */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3">
          {VALUES.map((v) => (
            <React.Fragment key={v}>
              {CATEGORIES.map((c) => (
                <ValueTile key={`${c}-${v}`} amount={v} />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
