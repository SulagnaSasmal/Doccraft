import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildGenerateMessages } from "@/lib/docGeneration";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = 'edge'; // 25s on Hobby, 30s on Pro (vs 10s for Node.js serverless on Hobby)
export const maxDuration = 30;

// Use Groq (free, no credit risk) if GROQ_API_KEY is set, else fall back to OpenAI
const isGroq = !!process.env.GROQ_API_KEY;
const openai = new OpenAI(
  isGroq
    ? { apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }
    : { apiKey: process.env.OPENAI_API_KEY }
);
// Groq: llama-3.3-70b-versatile ≈ GPT-4o-mini quality, completely free with hard rate limits
const MODEL_FAST = isGroq ? "llama-3.1-8b-instant" : "gpt-4o-mini";
const MODEL_QUALITY = isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

const TEMPLATES: Record<string, string> = {
  "user-guide": `Structure: 
1. Overview / Introduction
2. Prerequisites 
3. Getting Started
4. Core Features (step-by-step)
5. Advanced Usage
6. Troubleshooting / FAQ
7. Glossary (if needed)`,
  "quick-start": `Structure:
1. What You'll Build / Achieve
2. Before You Begin (prerequisites, 2-3 bullet max)
3. Steps (numbered, concise, action-oriented)
4. Verify It Works
5. Next Steps`,
  "api-reference": `Structure:
1. Overview
2. Authentication
3. Base URL & Endpoints
4. Request/Response Format
5. Endpoints (grouped by resource)
6. Error Codes
7. Rate Limits
8. Examples`,
  "troubleshooting": `Structure:
1. Common Issues (symptom → cause → fix)
2. Error Messages Reference
3. Diagnostic Steps
4. Escalation / Contact Support`,
  "release-notes": `Structure:
1. Version & Date
2. Highlights
3. New Features
4. Improvements
5. Bug Fixes
6. Known Issues
7. Migration Notes (if applicable)`,
};

const AUDIENCE_INSTRUCTIONS: Record<string, string> = {
  "non-technical":
    "Write for end-users with no technical background. Avoid jargon. Use simple language, analogies, and screenshots/visual descriptions. Every step should be explicit.",
  technical:
    "Write for developers or technical staff. You can use technical terminology, code snippets, and assume familiarity with common tools.",
  mixed:
    "Write for a mixed audience. Lead with simple explanations, then provide technical details in collapsible/optional sections or notes.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal:
    "Use formal, professional language. Third person. No contractions. Suitable for enterprise documentation.",
  conversational:
    "Use friendly, approachable language. Second person (you/your). Contractions are fine. Guide the reader like a helpful colleague.",
  instructional:
    "Use direct, imperative language. Focus on clear commands and actions. Minimal fluff. Every sentence should drive the user forward.",
};

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rl = checkRateLimit(ip);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter ?? 60) },
        }
      );
    }

    const body = await req.json();
    const { action, content, config, answers, contextText, stream } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    if (action === "analyze") {
      return handleAnalyze(content, config, contextText);
    } else if (action === "generate") {
      if (stream) {
        return handleGenerateStream(content, config, answers, contextText);
      }
      return handleGenerate(content, config, answers, contextText);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleAnalyze(content: string, config: any, contextText?: string) {
  const template = TEMPLATES[config.docType] || TEMPLATES["user-guide"];
  const audienceNote = AUDIENCE_INSTRUCTIONS[config.audience] || "";

  const systemPrompt = `You are a senior technical writer analyzing raw source material to create documentation.

Your task: Analyze the provided content and identify GAPS, AMBIGUITIES, and ASSUMPTIONS that need clarification before you can write high-quality documentation.

Target document type: ${config.docType}
Target template structure:
${template}

Audience: ${config.audience} — ${audienceNote}

Think from the END USER's perspective. What would they need to know that isn't clearly covered?

Return your analysis as a JSON array of questions. Each question should have:
- "id": a unique string (e.g., "q1", "q2")
- "question": the specific question you need answered
- "category": one of "missing" (information not provided), "ambiguous" (information is unclear), or "assumption" (you're making an assumption that needs confirmation)
- "priority": "critical" if the answer is essential for a usable document, or "optional" if it would improve quality but isn't blocking

Aim for 5-12 focused, specific questions. Don't ask generic questions — ask things that would genuinely block a technical writer.

${config.customInstructions ? `Additional instructions: ${config.customInstructions}` : ""}

IMPORTANT: Return ONLY the JSON array, no markdown fences, no explanation. Example:
[{"id":"q1","question":"What happens when...","category":"missing","priority":"critical"}]`;

  const response = await openai.chat.completions.create({
    model: MODEL_FAST,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: contextText?.trim()
          ? `CONTEXT DOCUMENTS (existing docs, style guide, terminology — identify gaps relative to these):\n${contextText.slice(0, 3000)}\n\n---\n\nSOURCE MATERIAL TO DOCUMENT:\n${content.slice(0, 8000)}`
          : `Here is the raw source material:\n\n${content.slice(0, 8000)}`,
      },
    ],
    max_tokens: 800,
    temperature: 0.3,
  });

  const text = response.choices[0]?.message?.content || "[]";

  let questions;
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    questions = JSON.parse(cleaned);
  } catch {
    questions = [
      {
        id: "q1",
        question: "Could you provide more context about the primary users of this documentation?",
        category: "missing",
      },
    ];
  }

  const formatted = questions.map((q: any) => ({
    ...q,
    answer: "",
    skipped: false,
    priority: q.priority || "optional",
  }));

  return NextResponse.json({ questions: formatted });
}

async function handleGenerate(content: string, config: any, answers: any[], contextText?: string) {
  const response = await openai.chat.completions.create({
    ...buildGenerateMessages(content, config, answers, contextText),
    model: MODEL_QUALITY,
  });

  const document = response.choices[0]?.message?.content || "# Error\nFailed to generate documentation.";

  return NextResponse.json({ document });
}

async function handleGenerateStream(content: string, config: any, answers: any[], contextText?: string) {
  const completion = await openai.chat.completions.create({
    ...buildGenerateMessages(content, config, answers, contextText),
    model: MODEL_QUALITY,
    stream: true,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (!delta) continue;

          controller.enqueue(
            encoder.encode(`event: chunk\ndata: ${JSON.stringify({ delta })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode('event: done\ndata: {"ok":true}\n\n'));
      } catch (error: any) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: error?.message || "Streaming failed" })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
