"use client";

import { useAuthStore } from "@/store/auth.store";
import { useAppearanceStore, MODULE_INFO } from "@/store/appearance.store";
import { saveModuleFlags } from "@/services/appearance.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, FolderArchive, FileText, Gavel, ReceiptText, EyeOff } from "lucide-react";
import { toast } from "sonner";

// The 4 super-admin-controlled feature flags
const SUPER_FEATURES = ["docs201", "documentCenter", "disciplinary", "vbirAlphaList"] as const;

const FEATURE_ICONS: Record<typeof SUPER_FEATURES[number], React.ElementType> = {
    docs201: FolderArchive,
    documentCenter: FileText,
    disciplinary: Gavel,
    vbirAlphaList: ReceiptText,
};

export default function SuperModulesPage() {
    const currentUser = useAuthStore((s) => s.currentUser);
    const modules = useAppearanceStore((s) => s.modules);
    const toggleModule = useAppearanceStore((s) => s.toggleModule);
    const setModules = useAppearanceStore((s) => s.setModules);

    const persistModules = async (nextModules: typeof modules, fallback?: typeof modules) => {
        const result = await saveModuleFlags(nextModules);
        if (!result.ok) {
            if (fallback) {
                setModules(fallback);
            }
            toast.error(result.error ?? "Failed to save feature toggles");
            return false;
        }
        return true;
    };

    const handleToggleModule = async (key: keyof typeof modules) => {
        const previous = modules;
        const next = { ...modules, [key]: !modules[key] };
        toggleModule(key);
        await persistModules(next, previous);
    };

    // Only admin may access this page
    if (currentUser.role !== "admin") {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Shield className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Access restricted to Super Admin only.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-8">
            {/* Header */}
            <div className="flex items-start gap-3">
                <EyeOff className="h-6 w-6 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                    <h1 className="text-xl font-semibold">Feature Toggles</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Enable or disable experimental and optional modules system-wide.
                        Changes take effect immediately — disabled modules are hidden from all navigation and routes.
                    </p>
                    <div className="mt-2">
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                            Hidden page — accessible only at /{currentUser.role}/super
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Feature Toggle Cards */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Optional Modules</CardTitle>
                    <CardDescription>
                        These modules are off by default. Enable only when the client has requested and configured them.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-0 divide-y">
                    {SUPER_FEATURES.map((key) => {
                        const info = MODULE_INFO[key];
                        const Icon = FEATURE_ICONS[key];
                        const enabled = modules[key];

                        return (
                            <div key={key} className="flex items-center gap-4 py-4">
                                <div className={`p-2 rounded-lg ${enabled ? "bg-primary/10" : "bg-muted"}`}>
                                    <Icon className={`h-5 w-5 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm">{info.label}</p>
                                        <Badge
                                            variant="secondary"
                                            className={
                                                enabled
                                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs"
                                                    : "bg-muted text-muted-foreground text-xs"
                                            }
                                        >
                                            {enabled ? "Enabled" : "Disabled"}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                                </div>
                                <Switch
                                    checked={enabled}
                                    onCheckedChange={() => void handleToggleModule(key)}
                                    aria-label={`Toggle ${info.label}`}
                                />
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <p className="text-xs text-center text-muted-foreground">
                These settings are saved to the shared appearance configuration and sync across sessions.
            </p>
        </div>
    );
}
