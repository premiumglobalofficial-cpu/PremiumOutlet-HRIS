"use client";

import { useMemo } from "react";
import { Sparkles, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import {
  getApprovedSaIncentiveAllowances,
  type SaPayrollBridgeOptions,
} from "@/lib/sa-payroll-bridge";
import { isSaIncentiveEligibleCutoff, SA_EOM_BLOCKED_REASON } from "@/lib/sa-eom-policy";
import type { SaPayoutRecord } from "@/types";
import type { SaMonthlyPayoutBreakdown } from "@/lib/sa-commission";

export type SaIncentivePreview = {
  amount: number;
  note: string;
  breakdown: SaMonthlyPayoutBreakdown;
};

export function buildSaIncentivePreviewMap(
  payouts: SaPayoutRecord[],
  month: string,
  bridgeOptions: SaPayrollBridgeOptions = {},
  getPayFrequency?: (employeeId: string) => string | undefined,
): Map<string, SaIncentivePreview> {
  const map = new Map<string, SaIncentivePreview>();
  for (const p of payouts) {
    if (p.status !== "approved") continue;
    const options: SaPayrollBridgeOptions = getPayFrequency
      ? {
          cutoff: bridgeOptions.cutoff,
          payFrequency: getPayFrequency(p.employeeId) ?? bridgeOptions.payFrequency,
        }
      : bridgeOptions;
    const { amount, note, payout } = getApprovedSaIncentiveAllowances(
      payouts,
      month,
      p.employeeId,
      options,
    );
    if (amount > 0 && payout) {
      map.set(p.employeeId, { amount, note, breakdown: payout.breakdown });
    }
  }
  return map;
}

type Props = {
  month: string;
  monthLabel: string;
  cutoff: "first" | "second";
  payFrequency?: string;
  getEmployeePayFrequency?: (employeeId: string) => string | undefined;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  payouts: SaPayoutRecord[];
  selectedEmployeeIds: string[];
  getEmployeeName: (id: string) => string;
};

export function BulkPayrollSaIncentives({
  month,
  monthLabel,
  cutoff,
  payFrequency = "semi_monthly",
  getEmployeePayFrequency,
  enabled,
  onEnabledChange,
  payouts,
  selectedEmployeeIds,
  getEmployeeName,
}: Props) {
  const eomEligible = isSaIncentiveEligibleCutoff(payFrequency, cutoff);
  const bridgeOptions = useMemo(
    () => ({ cutoff, payFrequency }),
    [cutoff, payFrequency],
  );

  const previewMap = useMemo(
    () => buildSaIncentivePreviewMap(payouts, month, bridgeOptions, getEmployeePayFrequency),
    [payouts, month, bridgeOptions, getEmployeePayFrequency],
  );

  const summary = useMemo(() => {
    let totalAll = 0;
    let totalSelected = 0;
    let countSelected = 0;
    for (const [empId, preview] of previewMap) {
      totalAll += preview.amount;
      if (selectedEmployeeIds.includes(empId)) {
        totalSelected += preview.amount;
        countSelected++;
      }
    }
    return {
      totalAll,
      totalSelected,
      countAll: previewMap.size,
      countSelected,
    };
  }, [previewMap, selectedEmployeeIds]);

  const selectedLines = useMemo(() => {
    return selectedEmployeeIds
      .map((id) => {
        const preview = previewMap.get(id);
        if (!preview) return null;
        return { id, name: getEmployeeName(id), ...preview };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.amount - a.amount);
  }, [selectedEmployeeIds, previewMap, getEmployeeName]);

  const hasApproved = summary.countAll > 0;

  return (
    <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/90 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-semibold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            SA Incentives
          </p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            {eomEligible
              ? `EOM run — approved variable pay for ${monthLabel} adds to allowances.`
              : "1st cutoff — base pay only. Variable SA pay is blocked until 2nd cutoff (EOM)."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground">
              {enabled && eomEligible ? "On" : "Off"}
            </span>
            <Switch
              checked={enabled && eomEligible}
              onCheckedChange={onEnabledChange}
              disabled={!eomEligible}
              aria-label="Include SA incentives in payroll"
            />
          </div>
        </div>
      </div>

      {!eomEligible && (
        <div className="flex gap-2 rounded-md border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 px-2.5 py-2">
          <Info className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800 dark:text-amber-200 leading-relaxed">
            {SA_EOM_BLOCKED_REASON}
          </p>
        </div>
      )}

      {eomEligible && (
        !hasApproved ? (
        <div className="flex gap-2 rounded-md border border-dashed border-violet-300/60 dark:border-violet-700/60 bg-background/60 px-2.5 py-2">
          <Info className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            No approved SA payouts for this month. Open the <strong>SA Incentives</strong> tab to
            compute and approve before running payroll.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-background/80 border border-violet-100 dark:border-violet-900/50 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
                Month total (approved)
              </p>
              <p className="text-sm font-semibold tabular-nums text-violet-900 dark:text-violet-100">
                {formatCurrency(summary.totalAll)}
              </p>
              <p className="text-[9px] text-muted-foreground">{summary.countAll} SA associate(s)</p>
            </div>
            <div
              className={`rounded-md border px-2.5 py-2 ${
                enabled && summary.countSelected > 0
                  ? "bg-violet-600/10 border-violet-400/50 dark:border-violet-600"
                  : "bg-background/80 border-violet-100 dark:border-violet-900/50 opacity-70"
              }`}
            >
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
                Selected payroll add-on
              </p>
              <p className="text-sm font-semibold tabular-nums text-violet-900 dark:text-violet-100">
                {enabled ? formatCurrency(summary.totalSelected) : formatCurrency(0)}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {summary.countSelected} of {selectedEmployeeIds.length} selected
              </p>
            </div>
          </div>

          {enabled && selectedLines.length > 0 && (
            <div className="max-h-[120px] overflow-y-auto rounded-md border border-violet-100 dark:border-violet-900/40 bg-background/50 divide-y divide-violet-100/80 dark:divide-violet-900/40">
              {selectedLines.map((line) => (
                <div key={line.id} className="px-2.5 py-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">{line.name}</p>
                    <p className="text-[9px] text-muted-foreground truncate">
                      {[
                        line.breakdown.salesCommission > 0 &&
                          `sales ${formatCurrency(line.breakdown.salesCommission)}`,
                        line.breakdown.otPay > 0 && `OT ${formatCurrency(line.breakdown.otPay)}`,
                        line.breakdown.complianceCash > 0 &&
                          `compliance ${formatCurrency(line.breakdown.complianceCash)}`,
                        line.breakdown.storeGoalShare > 0 &&
                          `goal ${formatCurrency(line.breakdown.storeGoalShare)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Incentive bundle"}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[10px] font-mono bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200"
                  >
                    +{formatCurrency(line.amount)}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {enabled && summary.countSelected === 0 && selectedEmployeeIds.length > 0 && (
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              None of the selected employees have approved SA payouts this month.
            </p>
          )}
        </>
      ))}
    </div>
  );
}
