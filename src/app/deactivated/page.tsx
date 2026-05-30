"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppearanceStore } from "@/store/appearance.store";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/branding";
import { ShieldOff } from "lucide-react";

export default function DeactivatedPage() {
    const logoUrl = useAppearanceStore((s) => s.logoUrl);
    const companyName = useAppearanceStore((s) => s.companyName);
    const effectiveLogo = logoUrl || BRAND_LOGO_PATH;
    const displayName = companyName || BRAND_NAME;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
            <div className="w-full max-w-md text-center space-y-8">
                <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={effectiveLogo} alt={displayName} className="h-14 w-14 object-contain" />
                </div>

                <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
                        <ShieldOff className="h-12 w-12 text-destructive" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-2xl font-bold tracking-tight">Account Deactivated</h1>
                    <p className="text-muted-foreground leading-relaxed">
                        Your account has been deactivated and you no longer have access to the portal.
                        Please contact your administrator to restore your access.
                    </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/40 px-6 py-4 text-sm text-muted-foreground">
                    If you believe this is a mistake, reach out to your HR or system administrator
                    and ask them to reactivate your account.
                </div>

                <Link href="/login">
                    <Button variant="outline" className="w-full gap-2">
                        Back to Sign In
                    </Button>
                </Link>
            </div>
        </div>
    );
}
