import { NextRequest, NextResponse } from "next/server";

// Must run on Node.js — uses full fetch + response handling
export const runtime = "nodejs";

const MOOD_LABELS: Record<string, string> = {
  frustrated: "😞 Frustrated",
  neutral:    "😐 Neutral",
  satisfied:  "😊 Satisfied",
  love:       "🤩 Love it!",
};

export async function POST(req: NextRequest) {
  try {
    const { mood, message } = await req.json();

    if (!mood || !MOOD_LABELS[mood]) {
      return NextResponse.json({ error: "Invalid mood" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const maskedIp = ip.replace(/\.\d+$/, ".x");
    const moodLabel = MOOD_LABELS[mood];
    const hasMessage = !!message?.trim();

    // ── 1. Track event (fire-and-forget) ────────────────────────────────────
    const origin = req.nextUrl.origin;
    fetch(`${origin}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "feedback_submitted",
        properties: { mood, hasMessage, ip: maskedIp },
      }),
    }).catch(() => {});

    // ── 2. Send email via Resend ─────────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY;
    const toEmail   = process.env.RESEND_TO_EMAIL;

    if (resendKey && toEmail) {
      const bodyHtml = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
          <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b">📬 New DocCraft Feedback</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr>
              <td style="padding:8px 0;color:#64748b;width:90px">Mood</td>
              <td style="padding:8px 0;font-weight:600;color:#1e293b">${moodLabel}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;vertical-align:top">Message</td>
              <td style="padding:8px 0;color:#1e293b">
                ${hasMessage
                  ? `<blockquote style="margin:0;padding:8px 12px;border-left:3px solid #6366f1;background:#f8fafc;border-radius:4px;color:#334155">${message.trim()}</blockquote>`
                  : `<em style="color:#94a3b8">No message provided.</em>`
                }
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b">Submitted</td>
              <td style="padding:8px 0;color:#1e293b">${new Date().toUTCString()}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b">IP</td>
              <td style="padding:8px 0;color:#94a3b8">${maskedIp}</td>
            </tr>
          </table>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DocCraft Feedback <onboarding@resend.dev>",
          to: [toEmail],
          subject: `DocCraft Feedback — ${moodLabel}`,
          html: bodyHtml,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Never surface internal errors to the client
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
