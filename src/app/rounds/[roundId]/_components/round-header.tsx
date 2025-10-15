"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";

type RoundHeaderProps = {
  status: string;
  roundId: string;
};

export function RoundHeader({ status, roundId }: RoundHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roundId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/60 px-4 py-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-base text-muted-foreground">
        <span className="font-medium text-foreground">Status</span>
        <Badge variant="outline" className="uppercase tracking-wide">
          {status}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-md bg-muted/60 px-3 py-1.5 font-mono text-base text-foreground">
          {roundId}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="flex items-center gap-2"
          aria-label="Spielcode kopieren"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Kopiert" : "Code kopieren"}
        </Button>
      </div>
    </div>
  );
}
