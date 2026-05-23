import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/services/supabase-server";
import crypto from "crypto";

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
 * Requires admin authentication.
 */
export async function POST(req: Request) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is an admin
    const { data: emp } = await supabase
        .from("employees")
        .select("role")
        .eq("profile_id", user.id)
        .single();

    if (emp?.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json() as { pin?: unknown };
    const pin = body.pin;

    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
        return NextResponse.json({ error: "PIN must be 4–8 digits" }, { status: 400 });
    }

    const pinHash = hashPin(pin);

    // Check if an admin PIN record already exists (upsert)
    const { data: existing } = await supabase
        .from("kiosk_pins")
        .select("id")
        .eq("kiosk_device_id", ADMIN_KIOSK_DEVICE_ID)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from("kiosk_pins")
            .update({
                pin_hash: pinHash,
                last_used_at: new Date().toISOString(),
                is_active: true,
            })
            .eq("kiosk_device_id", ADMIN_KIOSK_DEVICE_ID);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
        const { error } = await supabase
            .from("kiosk_pins")
            .insert({
                kiosk_device_id: ADMIN_KIOSK_DEVICE_ID,
                pin_hash: pinHash,
                created_by: user.id,
                is_active: true,
            });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
