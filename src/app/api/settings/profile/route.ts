import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/api-auth";

const ALLOWED_FIELDS = [
  "phone",
  "birthday",
  "address",
  "emergency_contact",
  "preferred_channel",
  "whatsapp_number",
  "avatar_url",
] as const;

type ProfilePatchField = (typeof ALLOWED_FIELDS)[number];

const VALID_CHANNELS = ["email", "whatsapp", "sms", "in_app"] as const;

/**
 * GET /api/settings/profile
 */
export async function GET() {
  try {
    const ctx = await getApiAuthContext();
    if (!ctx?.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = ctx.demoMode ? ctx.adminDb : ctx.supabase;
    const { data, error } = await db
      .from("employees")
      .select("phone, birthday, address, emergency_contact, preferred_channel, whatsapp_number, avatar_url, name, email, role, department, status, work_type, salary, join_date, location, shift_id, team_leader, work_days, job_title")
      .eq("profile_id", ctx.userId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API] settings/profile GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/profile
 */
export async function PATCH(request: Request) {
  try {
    const ctx = await getApiAuthContext();
    if (!ctx?.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const patch: Partial<Record<ProfilePatchField, string | null>> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        const val = body[field];
        if (val !== null && typeof val !== "string") {
          return NextResponse.json(
            { error: `Field '${field}' must be a string or null` },
            { status: 400 },
          );
        }
        if (field === "preferred_channel" && val !== null) {
          if (!VALID_CHANNELS.includes(val as (typeof VALID_CHANNELS)[number])) {
            return NextResponse.json(
              { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(", ")}` },
              { status: 400 },
            );
          }
        }
        patch[field] = val || null;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = ctx.demoMode ? ctx.adminDb : ctx.supabase;
    const { data, error } = await db
      .from("employees")
      .update(patch)
      .eq("profile_id", ctx.userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API] settings/profile PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
