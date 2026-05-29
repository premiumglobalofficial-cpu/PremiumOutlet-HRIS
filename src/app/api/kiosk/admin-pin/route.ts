import { NextResponse } from "next/server";
import crypto from "crypto";
import { getApiAuthContext } from "@/lib/api-auth";

const ADMIN_KIOSK_DEVICE_ID = "ADMIN_KIOSK_CONFIG";

function hashPin(pin: string): string {
    return crypto.createHash("sha256").update(`kiosk-admin:${pin}`).digest("hex");
}

/**
 * GET /api/kiosk/admin-pin
 * Disabled — PIN verification must use POST /api/kiosk/admin-pin/verify
 */
export async function GET() {
    return NextResponse.json({ error: "Method not allowed. Use POST /api/kiosk/admin-pin/verify" }, { status: 405 });
}

/**
 * POST /api/kiosk/admin-pin
 * Body: { pin: string }
 * Save a new admin PIN (hashed) to kiosk_pins table.
 * Requires admin authentication (Supabase session or demo mode).
 */
export async function POST(req: Request) {
    const ctx = await getApiAuthContext({ requireAdmin: true });
    if (!ctx) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { pin?: unknown };
    const pin = body.pin;

    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
        return NextResponse.json({ error: "PIN must be 4–8 digits" }, { status: 400 });
    }

    const pinHash = hashPin(pin);
    const db = ctx.adminDb;

    const { data: existing } = await db
        .from("kiosk_pins")
        .select("id")
        .eq("kiosk_device_id", ADMIN_KIOSK_DEVICE_ID)
        .maybeSingle();

    if (existing) {
        const { error } = await db
            .from("kiosk_pins")
            .update({
                pin_hash: pinHash,
                last_used_at: new Date().toISOString(),
                is_active: true,
            })
            .eq("kiosk_device_id", ADMIN_KIOSK_DEVICE_ID);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
        const { error } = await db
            .from("kiosk_pins")
            .insert({
                kiosk_device_id: ADMIN_KIOSK_DEVICE_ID,
                pin_hash: pinHash,
                created_by: ctx.userId,
                is_active: true,
            });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, demoMode: ctx.demoMode });
}
