import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_TYPES = [
  "user-guide",
  "quick-start",
  "api-reference",
  "troubleshooting",
  "release-notes",
];

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content?.trim() || content.length < 150) {
      return NextResponse.json(
        { error: "Not enough content to analyze" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a documentation expert. Analyze the provided content and recommend the most appropriate documentation type.

Available types:
- user-guide: Comprehensive end-user documentation covering features in depth
- quick-start: Short onboarding guide — get up and running in minutes
- api-reference: Technical API documentation with endpoints, parameters, responses
- troubleshooting: Problem → Cause → Solution format for error resolution
- release-notes: What's new and changed in a product release

Return a JSON object (no markdown):
{
  "type": "<one of the types above>",
  "reason": "<one sentence, max 12 words, why this type fits>",
  "confidence": <number 0.0 to 1.0>
}`,
        },
        {
          role: "user",
          content: `Analyze this content and recommend a doc type:\n\n${content.slice(0, 3000)}`,
        },
      ],
      max_tokens: 120,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("No response");

    const rec = JSON.parse(raw);
    if (!VALID_TYPES.includes(rec.type)) rec.type = "user-guide";
    rec.confidence = Math.min(1, Math.max(0, Number(rec.confidence) || 0.7));

    return NextResponse.json(rec);
  } catch (err: any) {
    console.error("Recommend error:", err);
    return NextResponse.json(
      { error: err.message || "Recommendation failed" },
      { status: 500 }
    );
  }
}
