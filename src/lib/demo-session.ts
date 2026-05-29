import crypto from "crypto";
import { cookies } from "next/headers";
import { getQrHmacSecret } from "@/lib/env";

export const DEMO_SESSION_COOKIE = "po-demo-session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export type DemoSessionPayload = {
  userId: string;
  role: string;
  email: string;
  exp: number;
};

function getSigningSecret(): string {
  return getQrHmacSecret();
}

function encodePayload(payload: DemoSessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): DemoSessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DemoSessionPayload;
    if (!parsed?.userId || !parsed?.role || !parsed?.email || !parsed?.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function signDemoSession(payload: Omit<DemoSessionPayload, "exp">): string {
  const full: DemoSessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const body = encodePayload(full);
  const sig = crypto.createHmac("sha256", getSigningSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyDemoSessionToken(token: string): DemoSessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", getSigningSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const payload = decodePayload(body);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function readDemoSession(): Promise<DemoSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
    if (!raw) return null;
    return verifyDemoSessionToken(raw);
  } catch {
    return null;
  }
}

export function demoSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}
