"use client";

import { useAuthStore } from "@/store/auth.store";
import {
    useAppearanceStore,
    MODULE_INFO,
    DEFAULT_MODULE_FLAGS,
    type ModuleFlags,
} from "@/store/appearance.store";
import { saveModuleFlags } from "@/services/appearance.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import { useRoleHref } from "@/lib/hooks/use-role-href";
import {
    Contact, FolderKanban, Clock,
    CalendarOff, Wallet, Banknote, BarChart3, Bell,
    Building2, ClipboardList, FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const iconMap: Record<string, React.ElementType> = {
    Clock, CalendarOff, Wallet, Banknote, FolderKanban,
    BarChart3, ClipboardList, Building2, Bell, FileSearch, Contact,
};

export default function ModulesPage() {
    const { currentUser } = useAuthStore();
    const modules = useAppearanceStore((s) => s.modules);
    const toggleModule = useAppearanceStore((s) => s.toggleModule);
    const setModules = useAppearanceStore((s) => s.setModules);
    const [resetOpen, setResetOpen] = useState(false);
    const rh = useRoleHref();

    if (currentUser.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-muted-foreground">Admin access required.</p>
            </div>
        );
    }

    const moduleKeys = Object.keys(MODULE_INFO) as (keyof ModuleFlags)[];
    const enabledCount = moduleKeys.filter((k) => modules[k]).length;

    const persistModules = async (nextModules: ModuleFlags, fallback?: ModuleFlags) => {
        const result = await saveModuleFlags(nextModules);
        if (!result.ok) {
            if (fallback) {
                setModules(fallback);
            }
            toast.error(result.error ?? "Failed to save modules");
            return false;
        }
        return true;
    };

    const handleToggleModule = async (key: keyof ModuleFlags) => {
        const previous = modules;
        const next = { ...modules, [key]: !modules[key] };
        toggleModule(key);
        await persistModules(next, previous);
    };

    const handleSetModules = async (next: ModuleFlags, successMessage: string) => {
        const previous = modules;
        setModules(next);
        const ok = await persistModules(next, previous);
        if (ok) {
            toast.success(successMessage);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href={rh("/settings")}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Modules</h1>
                        <p className="text-sm text-muted-foreground">
                            Enable or disable system modules &middot;{" "}
                            <span className="font-medium text-foreground">{enabledCount}/{moduleKeys.length}</span> active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                            const allOn = moduleKeys.every((k) => modules[k]);
                            const target: ModuleFlags = {} as ModuleFlags;
                            moduleKeys.forEach((k) => { target[k] = !allOn; });
                            void handleSetModules(target, allOn ? "All modules disabled." : "All modules enabled.");
                        }}
                    >
                        {moduleKeys.every((k) => modules[k]) ? (
                            <><PowerOff className="h-3.5 w-3.5" /> Disable All</>
                        ) : (
                            <><Power className="h-3.5 w-3.5" /> Enable All</>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResetOpen(true)}
                        className="gap-1.5 text-muted-foreground"
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </Button>
                </div>
            </div>

            {/* Info */}
            <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                        <strong>Note:</strong> Disabling a module hides its navigation entry from all roles.
                        Existing data is preserved and will reappear when re-enabled.
                        Dashboard and Employees modules are always available.
                    </p>
                </CardContent>
            </Card>

            {/* Module Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {moduleKeys.map((key) => {
                    const info = MODULE_INFO[key];
                    const Icon = iconMap[info.icon] || Clock;
                    const enabled = modules[key];

                    return (
                        <Card
                            key={key}
                            className={cn(
                                "transition-all duration-200",
                                enabled
                                    ? "border-primary/20 bg-primary/5"
                                    : "border-border opacity-60"
                            )}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                            enabled ? "bg-primary/10" : "bg-muted"
                                        )}>
                                            <Icon className={cn("h-4 w-4", enabled ? "text-primary" : "text-muted-foreground")} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold">{info.label}</p>
                                                <Badge variant="secondary" className={cn(
                                                    "text-[10px]",
                                                    enabled
                                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                                        : "bg-muted text-muted-foreground"
                                                )}>
                                                    {enabled ? "ON" : "OFF"}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={enabled}
                                        onCheckedChange={() => void handleToggleModule(key)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Reset Dialog */}
            <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Modules?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will re-enable all modules to their default state.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => void handleSetModules({ ...DEFAULT_MODULE_FLAGS }, "Modules reset to defaults.")}
                        >
                            Reset
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
