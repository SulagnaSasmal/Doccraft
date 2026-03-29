import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Lightweight event tracking endpoint.
 * All events are logged to stdout (visible in Vercel Functions logs).
 * Replace with a real analytics service (PostHog, Mixpanel, Supabase) when ready.
 */
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const body = await req.json();
    const { event, properties } = body;

    if (!event || typeof event !== "string") {
      return NextResponse.json({ error: "Missing event name" }, { status: 400 });
    }

    // Sanitize — strip any PII from properties before logging
    const safe = { ...properties };
    delete safe.email;
    delete safe.password;
    delete safe.content; // never log user content

    const entry = {
      ts: new Date().toISOString(),
      ip: ip.replace(/\.\d+$/, ".x"), // mask last octet
      event,
      ...safe,
    };

    // In Vercel, console.log goes to Functions logs (searchable)
    console.log("[doccraft:track]", JSON.stringify(entry));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
