"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Tailwind classes as constants (kept from original)
const BOARD_CLS = "rounded-3xl bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-slate-900 dark:to-slate-950 p-3 sm:p-4 shadow-xl border";
const GRID_CLS = "grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3";
const CATEGORY_CARD_CLS = "bg-card text-card-foreground border shadow-sm rounded-2xl";
const CATEGORY_TITLE_CLS = "text-xs tracking-widest text-center uppercase text-muted-foreground";
const TILE_CARD_CLS = "bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition-colors border text-indigo-50 shadow-lg rounded-2xl cursor-pointer select-none";
const TILE_VALUE_CLS = "text-3xl font-extrabold tracking-wide";

function CategoryHeader({ title }: { title: string }) {
  return (
    <Card className={CATEGORY_CARD_CLS}>
      <CardHeader className="p-3">
        <CardTitle className={CATEGORY_TITLE_CLS}>{title}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ValueTile({ amount }: { amount: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className={TILE_CARD_CLS}>
          <CardContent className="h-20 grid place-items-center">
            <span className={TILE_VALUE_CLS}>${amount}</span>
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

export function JeopardyBoard({ categoriesPromise }: { categoriesPromise: Promise<string[]> }) {
  const categories = React.use(categoriesPromise);
  const VALUES = [200, 400, 600, 800, 1000];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
      <div className={BOARD_CLS}>
        <div className={GRID_CLS}>
          {categories.map((c) => (
            <CategoryHeader key={c} title={c} />
          ))}
        </div>

        <div className="h-3" />

        <div className={GRID_CLS}>
          {VALUES.map((v) => (
            <React.Fragment key={v}>
              {categories.map((c) => (
                <ValueTile key={`${c}-${v}`} amount={v} />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
