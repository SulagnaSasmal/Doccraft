import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Event tracking endpoint.
 * - Always logs to stdout (visible in Vercel Functions logs).
 * - When POSTHOG_API_KEY is set, also forwards events to PostHog (1M events/month free).
 *   Get a free key at https://posthog.com — add POSTHOG_API_KEY and POSTHOG_HOST to .env.local
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

    // Sanitize — never log PII or user content
    const safe = { ...properties };
    delete safe.email;
    delete safe.password;
    delete safe.content;

    const maskedIp = ip.replace(/\.\d+$/, ".x");

    const entry = {
      ts: new Date().toISOString(),
      ip: maskedIp,
      event,
      ...safe,
    };

    // Always log to Vercel Functions stdout
    console.log("[doccraft:track]", JSON.stringify(entry));

    // Forward to PostHog if configured
    if (process.env.POSTHOG_API_KEY) {
      const host = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";
      fetch(`${host}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.POSTHOG_API_KEY,
          event,
          distinct_id: maskedIp, // anonymised; replace with user.id once auth is enabled
          timestamp: new Date().toISOString(),
          properties: { ...safe, $ip: maskedIp, source: "doccraft" },
        }),
      }).catch(() => {}); // fire-and-forget, never block the response
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
