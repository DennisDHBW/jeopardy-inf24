"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { RoundBoardData } from "../page";

// 🎨 Styles (wie bei dir)
const BOARD_CLS =
  "rounded-3xl bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-slate-900 dark:to-slate-950 p-3 sm:p-4 shadow-xl border";
const GRID_CLS = "grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3";
const CATEGORY_CARD_CLS =
  "bg-card text-card-foreground border shadow-sm rounded-2xl";
const CATEGORY_TITLE_CLS =
  "text-xs tracking-widest text-center uppercase text-muted-foreground";
const TILE_CARD_CLS =
  "bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition-colors border text-indigo-50 shadow-lg rounded-2xl cursor-pointer select-none";
const TILE_VALUE_CLS = "text-3xl font-extrabold tracking-wide";

// Fixe Wertstufen (bestimmen die Reihenfolge oben -> unten)
const TIERS = [100, 200, 300, 400, 500] as const;

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
  categoryName,
  prompt,
  answer,
  disabled,
}: {
  value: number;
  categoryName: string;
  prompt?: string;
  answer?: string;
  disabled?: boolean;
}) {
  // Wenn mal eine Stufe fehlt, zeigen wir eine deaktivierte Kachel
  if (disabled) {
    return (
      <Card className={`${TILE_CARD_CLS} opacity-50 pointer-events-none`}>
        <CardContent className="h-20 grid place-items-center">
          <span className={TILE_VALUE_CLS}>${value}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className={TILE_CARD_CLS}>
          <CardContent className="h-17 grid place-items-center">
            <span className={TILE_VALUE_CLS}>${value}</span>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="tracking-wide">
            {categoryName} • ${value}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-muted-foreground">{prompt}</p>
          <Separator />
          <p className="italic opacity-80">
            Antwort: <span className="font-semibold">{answer}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function JeopardyBoard({ data }: { data: RoundBoardData }) {
  const { categories, clues } = data;

  // Hilfszugriff: Frage anhand (categoryId, value) finden
  const getClue = (categoryId: number, value: number) =>
    clues.find((c) => c.categoryId === categoryId && c.value === value);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-0">
      <div className={BOARD_CLS}>
        {/* Kategorien-Header */}
        <div className={GRID_CLS}>
          {categories.map((c) => (
            <CategoryHeader key={c.categoryId} title={c.name} />
          ))}
        </div>

        <div className="h-3" />

        {/* Zeilen: 100 → 500; Spalten: Kategorien */}
        <div className="space-y-2">
          {TIERS.map((tier) => (
            <div className={GRID_CLS} key={tier}>
              {categories.map((c) => {
                const q = getClue(c.categoryId, tier);
                return (
                  <ValueTile
                    key={`${c.categoryId}-${tier}`}
                    value={tier}
                    categoryName={c.name}
                    prompt={q?.prompt}
                    answer={q?.answer}
                    disabled={!q} // falls eine Stufe in einer Kategorie fehlt
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
