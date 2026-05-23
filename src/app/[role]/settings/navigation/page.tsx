"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useAppearanceStore, type NavOverride } from "@/store/appearance.store";
import { NAV_ITEMS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRoleHref } from "@/lib/hooks/use-role-href";
import {
    LayoutDashboard, Users, Contact, FolderKanban, Clock, CalendarOff,
    Wallet, Banknote, BarChart3, Settings, Bell, Building2, ClipboardList,
    FileSearch, AlarmClock, Shield, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
    LayoutDashboard, Users, Contact, FolderKanban, Clock, CalendarOff,
    Wallet, Banknote, BarChart3, Settings, Bell, Building2, ClipboardList,
    FileSearch, AlarmClock, Shield, FileText,
};

const AVAILABLE_ICONS = Object.keys(iconMap);

export default function NavigationPage() {
    const { currentUser } = useAuthStore();
    const navOverrides = useAppearanceStore((s) => s.navOverrides);
    const setNavOverrides = useAppearanceStore((s) => s.setNavOverrides);
    const updateNavOverride = useAppearanceStore((s) => s.updateNavOverride);
    const [editingHref, setEditingHref] = useState<string | null>(null);
    const rh = useRoleHref();

    // Merge defaults with overrides
    const items = useMemo(() => {
        return NAV_ITEMS.map((item, idx) => {
            const ovr = navOverrides.find((o) => o.href === item.href);
            return {
                defaultLabel: item.label,
                defaultIcon: item.icon,
                href: item.href,
                label: ovr?.label || "",
                icon: ovr?.icon || "",
                order: ovr?.order ?? idx,
                hidden: ovr?.hidden ?? false,
            };
        }).sort((a, b) => a.order - b.order);
    }, [navOverrides]);

    if (currentUser.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-muted-foreground">Admin access required.</p>
            </div>
        );
    }

    const moveItem = (href: string, direction: "up" | "down") => {
        const currentItems = [...items];
        const idx = currentItems.findIndex((i) => i.href === href);
        if (idx === -1) return;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= currentItems.length) return;

        // Swap orders
        const newOverrides: NavOverride[] = currentItems.map((item, i) => {
            let order = i;
            if (i === idx) order = swapIdx;
            if (i === swapIdx) order = idx;
            return {
                href: item.href,
                label: item.label || undefined,
                icon: item.icon || undefined,
                order,
                hidden: item.hidden,
            };
        });
        setNavOverrides(newOverrides);
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
                        <h1 className="text-2xl font-bold tracking-tight">Navigation</h1>
                        <p className="text-sm text-muted-foreground">Reorder, rename, or hide sidebar items</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => {
                        setNavOverrides([]);
                        toast.success("Navigation reset to defaults.");
                    }}
                >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
            </div>

            {/* Info */}
            <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                        <strong>Tip:</strong> Changes here affect all users. Hidden items are removed from the sidebar for every role.
                        Permission-based filtering still applies — users can only see items they have access to.
                    </p>
                </CardContent>
            </Card>

            {/* Nav Items List */}
            <div className="space-y-2">
                {items.map((item, idx) => {
                    const displayLabel = item.label || item.defaultLabel;
                    const displayIcon = item.icon || item.defaultIcon;
                    const Icon = iconMap[displayIcon] || Settings;
                    const isEditing = editingHref === item.href;
                    const hasOverride = item.label || item.icon || item.hidden;

                    return (
                        <Card
                            key={item.href}
                            className={cn(
                                "transition-all duration-200",
                                item.hidden && "opacity-50",
                                isEditing && "ring-2 ring-primary/30"
                            )}
                        >
                            <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                    {/* Reorder buttons */}
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            disabled={idx === 0}
                                            onClick={() => moveItem(item.href, "up")}
                                        >
                                            <ArrowUp className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            disabled={idx === items.length - 1}
                                            onClick={() => moveItem(item.href, "down")}
                                        >
                                            <ArrowDown className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Icon */}
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                        item.hidden ? "bg-muted" : "bg-primary/10"
                                    )}>
                                        <Icon className={cn("h-4 w-4", item.hidden ? "text-muted-foreground" : "text-primary")} />
                                    </div>

                                    {/* Label & href */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={cn("text-sm font-medium truncate", item.hidden && "line-through")}>
                                                {displayLabel}
                                            </p>
                                            {hasOverride && (
                                                <Badge variant="secondary" className="text-[9px]">Modified</Badge>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground font-mono">{item.href}</p>
                                    </div>

                                    {/* Toggle visibility */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                        onClick={() => updateNavOverride(item.href, { hidden: !item.hidden })}
                                    >
                                        {item.hidden ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>

                                    {/* Edit toggle */}
                                    <Button
                                        variant={isEditing ? "secondary" : "outline"}
                                        size="sm"
                                        className="text-xs shrink-0"
                                        onClick={() => setEditingHref(isEditing ? null : item.href)}
                                    >
                                        {isEditing ? "Done" : "Edit"}
                                    </Button>
                                </div>

                                {/* Expanded edit form */}
                                {isEditing && (
                                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">Custom Label</label>
                                            <Input
                                                value={item.label}
                                                onChange={(e) => updateNavOverride(item.href, { label: e.target.value || undefined })}
                                                placeholder={item.defaultLabel}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">Icon</label>
                                            <Select
                                                value={item.icon || item.defaultIcon}
                                                onValueChange={(v) => updateNavOverride(item.href, { icon: v === item.defaultIcon ? undefined : v })}
                                            >
                                                <SelectTrigger className="h-8 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {AVAILABLE_ICONS.map((iconName) => {
                                                        const I = iconMap[iconName];
                                                        return (
                                                            <SelectItem key={iconName} value={iconName}>
                                                                <div className="flex items-center gap-2">
                                                                    <I className="h-3.5 w-3.5" />
                                                                    <span>{iconName}</span>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
