"use client";

/**
 * Sync Zustand demo login to an httpOnly cookie so API routes can authenticate
 * without Supabase JWTs.
 */
export async function syncDemoSessionCookie(user: {
  id: string;
  role: string;
  email: string;
}): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return;

  await fetch("/api/auth/demo-session", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.id,
      role: user.role,
      email: user.email,
    }),
  }).catch(() => {
    // Non-fatal — UI still works with local Zustand state
  });
}

export async function clearDemoSessionCookie(): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return;
  await fetch("/api/auth/demo-session", {
    method: "DELETE",
    credentials: "include",
  }).catch(() => {});
}
