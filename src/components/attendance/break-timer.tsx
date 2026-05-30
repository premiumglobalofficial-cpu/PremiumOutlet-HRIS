"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocationStore } from "@/store/location.store";
import * as locationService from "@/services/location-actions.service";
import { useProjectsStore } from "@/store/projects.store";
import { isWithinGeofence } from "@/lib/geofence";
import { notifyGeofenceViolation } from "@/lib/notifications";
import {
  breakDurationMinutes,
  SA_DINNER_BREAK_MINUTES,
  SA_LUNCH_BREAK_MINUTES,
  type SaBreakType,
} from "@/lib/break-policy";
import { BreakPolicyReminder } from "@/components/attendance/break-policy-reminder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  UtensilsCrossed,
  Play,
  Square,
  AlertTriangle,
  MapPin,
  Clock,
  Loader2,
  Moon,
} from "lucide-react";
import { toast } from "sonner";

interface BreakTimerProps {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  disabled?: boolean;
}

export function BreakTimer({ employeeId, employeeName, employeeEmail, disabled }: BreakTimerProps) {
  const config = useLocationStore((s) => s.config);
  const { getActiveBreak, getBreaksToday } = useLocationStore();
  const getProjectForEmployee = useProjectsStore((s) => s.getProjectForEmployee);

  const activeBreak = getActiveBreak(employeeId);
  const todayBreaks = getBreaksToday(employeeId);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);

  const lunchTaken = todayBreaks.some((b) => b.breakType === "lunch" && b.endTime);
  const dinnerTaken = todayBreaks.some((b) => b.breakType === "dinner" && b.endTime);
  const activeType = activeBreak?.breakType ?? null;

  const allowedDuration = useMemo(() => {
    if (!activeType) return config.lunchDuration;
    return breakDurationMinutes(activeType as SaBreakType, config.lunchDuration);
  }, [activeType, config.lunchDuration]);

  useEffect(() => {
    if (!activeBreak) return;
    const tick = () => {
      const ms = Date.now() - new Date(activeBreak.startTime).getTime();
      setElapsed(Math.floor(ms / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeBreak]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const elapsedMinutes = Math.floor(elapsed / 60);
  const isOvertime = elapsedMinutes > allowedDuration + config.lunchOvertimeThreshold;
  const isWarning = elapsedMinutes >= allowedDuration;

  const canStart = (type: SaBreakType) => {
    if (activeBreak) return false;
    if (todayBreaks.length >= config.allowedBreaksPerDay) return false;
    if (type === "lunch" && (lunchTaken || todayBreaks.some((b) => b.breakType === "lunch")))
      return false;
    if (type === "dinner" && (dinnerTaken || todayBreaks.some((b) => b.breakType === "dinner")))
      return false;
    return true;
  };

  const handleStart = useCallback(
    (breakType: SaBreakType) => {
      if (!canStart(breakType)) {
        toast.error(
          breakType === "lunch"
            ? "Lunch break already taken or another break is active."
            : "Dinner break already taken or another break is active.",
        );
        return;
      }
      const label = breakType === "lunch" ? "Lunch" : "Dinner";
      const start = (lat?: number, lng?: number) => {
        locationService.startBreak({ employeeId, breakType, lat, lng });
        toast.success(`${label} break started (${breakDurationMinutes(breakType, config.lunchDuration)} min, unpaid)`);
      };
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => start(pos.coords.latitude, pos.coords.longitude),
          () => start(),
          { enableHighAccuracy: true, timeout: 10000 },
        );
      } else {
        start();
      }
    },
    [canStart, config.lunchDuration, employeeId],
  );

  const handleEnd = useCallback(() => {
    if (!activeBreak) return;
    setEnding(true);

    const finalize = (lat?: number, lng?: number) => {
      const project = getProjectForEmployee(employeeId);
      let geofencePass: boolean | undefined;
      let distanceFromSite: number | undefined;

      if (project && lat !== undefined && lng !== undefined && config.lunchGeofenceRequired) {
        const result = isWithinGeofence(
          lat,
          lng,
          project.location.lat,
          project.location.lng,
          project.location.radius,
        );
        geofencePass = result.within;
        distanceFromSite = result.distanceMeters;

        if (!result.within) {
          toast.warning(`You are ${result.distanceMeters}m from your work site. This has been logged.`, {
            duration: 8000,
          });
          if (config.alertAdminOnGeofenceViolation) {
            notifyGeofenceViolation({
              employeeId,
              employeeName,
              employeeEmail: employeeEmail || "",
              distance: result.distanceMeters,
              time: new Date().toLocaleTimeString(),
            });
          }
        }
      }

      locationService.endBreak(activeBreak.id, { lat, lng, geofencePass, distanceFromSite });
      setEnding(false);
      const label = activeBreak.breakType === "dinner" ? "Dinner" : "Lunch";
      toast.success(`${label} break ended`);
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finalize(pos.coords.latitude, pos.coords.longitude),
        () => finalize(),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      finalize();
    }
  }, [activeBreak, employeeId, employeeName, employeeEmail, config, getProjectForEmployee]);

  const breakLabel =
    activeType === "dinner" ? "Dinner Break" : activeType === "lunch" ? "Lunch Break" : "Break";

  return (
    <Card className="border border-amber-200/60 dark:border-amber-900/40">
      <CardContent className="p-4 space-y-3">
        <BreakPolicyReminder compact />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {activeType === "dinner" ? (
              <Moon className="h-4 w-4 text-indigo-500" />
            ) : (
              <UtensilsCrossed className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-sm font-medium">{breakLabel}</span>
            <Badge variant="outline" className="text-[9px]">
              Unpaid
            </Badge>
          </div>

          {activeBreak ? (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span
                  className={`font-mono text-sm font-semibold ${isOvertime ? "text-red-500" : isWarning ? "text-amber-500" : ""}`}
                >
                  {formatTime(elapsed)}
                </span>
                <span className="text-[10px] text-muted-foreground">/ {allowedDuration}min</span>
              </div>
              {isOvertime && (
                <Badge variant="destructive" className="text-[10px] gap-0.5">
                  <AlertTriangle className="h-3 w-3" /> Over limit
                </Badge>
              )}
              {isWarning && !isOvertime && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400"
                >
                  Break over
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnd}
                disabled={ending}
                className="gap-1 text-xs h-7"
              >
                {ending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
                End Break
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {todayBreaks.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {todayBreaks.filter((b) => b.endTime).length}/{config.allowedBreaksPerDay} used
                </div>
              )}
              <Button
                size="sm"
                variant={lunchTaken ? "secondary" : "default"}
                onClick={() => handleStart("lunch")}
                disabled={disabled || !canStart("lunch")}
                className="gap-1 text-xs h-7"
              >
                <Play className="h-3 w-3" />
                Lunch ({SA_LUNCH_BREAK_MINUTES}m)
              </Button>
              <Button
                size="sm"
                variant={dinnerTaken ? "secondary" : "outline"}
                onClick={() => handleStart("dinner")}
                disabled={disabled || !canStart("dinner")}
                className="gap-1 text-xs h-7"
              >
                <Moon className="h-3 w-3" />
                Dinner ({SA_DINNER_BREAK_MINUTES}m)
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
