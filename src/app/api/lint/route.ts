import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { content, docType } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ issues: [] });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a documentation style guide linter. Analyze the document and find ONLY these semantic issues:

1. Inconsistent terminology — the same concept is referred to by different names (e.g., "user" vs "customer" vs "client" meaning the same thing)
2. Missing transitions between sections
3. Tone inconsistencies (mixing formal and informal)

For each issue found, return a JSON object with:
- "id": unique string
- "rule": short rule name (e.g., "Inconsistent terminology")
- "severity": "warning" or "info"
- "message": specific description of the issue
- "excerpt": the offending text (short, max 60 chars)
- "offset": approximate character offset in the document (integer)
- "length": length of the offending text (integer)

Return ONLY a JSON array. No markdown fences. If no issues, return [].
Maximum 8 issues. Focus on the most impactful ones.`,
        },
        {
          role: "user",
          content: `Document type: ${docType}\n\n${content}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content || "[]";
    let issues;
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      issues = JSON.parse(cleaned);
    } catch {
      issues = [];
    }

    return NextResponse.json({ issues });
  } catch (err: any) {
    console.error("Lint API error:", err);
    return NextResponse.json({ issues: [] });
  }
}
