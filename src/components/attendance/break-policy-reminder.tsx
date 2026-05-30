"use client";

import { Coffee } from "lucide-react";
import { SA_BREAK_REMINDER, SA_BREAK_RULES } from "@/lib/break-policy";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  compact?: boolean;
};

export function BreakPolicyReminder({ compact = false }: Props) {
  if (compact) {
    return (
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        <Coffee className="h-3 w-3 inline mr-1 text-amber-500" />
        <strong>BREAK REMINDER:</strong> {SA_BREAK_REMINDER}
      </p>
    );
  }

  return (
    <Card className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardContent className="p-3 space-y-2">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Coffee className="h-3.5 w-3.5 text-amber-600" />
          BREAK REMINDER — DOLE Compliant
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{SA_BREAK_REMINDER}</p>
        <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
          {SA_BREAK_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
