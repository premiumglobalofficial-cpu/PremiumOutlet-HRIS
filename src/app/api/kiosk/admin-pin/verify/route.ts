import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/services/supabase-server";
import crypto from "crypto";

const ADMIN_KIOSK_DEVICE_ID = "ADMIN_KIOSK_CONFIG";

function hashPin(pin: string): string {
    return crypto.createHash("sha256").update(`kiosk-admin:${pin}`).digest("hex");
}

/**
 * POST /api/kiosk/admin-pin/verify
 * Body: { pin: string }
 * Verify a kiosk admin PIN — returns { valid: boolean }.
 * PIN is sent in the request body (never in the URL) to prevent log exposure.
 * Public endpoint (no Supabase session required) — kiosk page calls this.
 */
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({})) as { pin?: unknown };
    const pin = body.pin;

    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
        return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }

    try {
        const supabase = await createServerSupabaseClient();
        const { data } = await supabase
            .from("kiosk_pins")
            .select("pin_hash")
            .eq("kiosk_device_id", ADMIN_KIOSK_DEVICE_ID)
            .eq("is_active", true)
            .maybeSingle();

        if (!data) {
            // No PIN configured — deny access until an admin sets one
            return NextResponse.json({ valid: false, reason: "no_pin_configured" });
        }

        const valid = hashPin(pin) === data.pin_hash;
        return NextResponse.json({ valid });
    } catch {
        // On DB error, deny access — never fall back to a default PIN
        return NextResponse.json({ valid: false, reason: "verification_error" }, { status: 503 });
    }
}
