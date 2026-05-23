"use client";

import { Shield } from "lucide-react";

interface AccessDeniedProps {
    title?: string;
    message?: string;
}

export function AccessDenied({
    title = "Access Denied",
    message = "You do not have permission to view this page.",
}: AccessDeniedProps) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
        </div>
    );
}
