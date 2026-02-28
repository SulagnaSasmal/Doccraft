import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { validateTerminology } from "@/lib/validateTerminology";
import type { GlossaryData } from "@/lib/validateTerminology";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ComplianceIssue {
  id: string;
  category: "terminology" | "voice" | "structure" | "style";
  severity: "error" | "warning" | "suggestion";
  rule: string;
  problematic_text?: string;
  suggestion: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { document, glossaryData }: { document: string; glossaryData?: GlossaryData } = body;

    if (!document?.trim()) {
      return NextResponse.json({ error: "No document provided" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // ── 1. Terminology issues (synchronous, no API call) ────────────────────
    const termIssues = validateTerminology(document, glossaryData);
    const terminologyResults: ComplianceIssue[] = termIssues.map((t, i) => ({
      id: `term-${i}`,
      category: "terminology",
      severity: t.issue_type === "forbidden" ? "error" : "suggestion",
      rule: t.issue_type === "forbidden"
        ? "MSTP: Avoid discouraged words"
        : "MSTP: Use preferred terminology",
      problematic_text: t.term,
      suggestion: t.suggestion
        ? `Replace "${t.term}" with "${t.suggestion}".`
        : `Remove or rephrase "${t.term}".`,
    }));

    // ── 2. AI-detected structural / voice / style issues ────────────────────
    const systemPrompt = `You are an MSTP (Microsoft Style Guide) compliance checker.

Analyse the provided documentation and return a JSON array of issues.

Check for:
- VOICE: passive voice constructions (flag the exact phrase, suggest active rewrite)
- VOICE: missing second person — steps or instructions not addressed to "you"
- STRUCTURE: numbered steps that do NOT start with an imperative verb (do, click, select, open, enter, etc.)
- STRUCTURE: headings that are NOT in sentence case (only first word and proper nouns capitalised)
- STYLE: paragraphs longer than 4 sentences
- STYLE: informal or overly casual phrases inconsistent with professional docs

Each issue object must have exactly these fields:
{
  "id": "ai-N",
  "category": "voice" | "structure" | "style",
  "severity": "error" | "warning" | "suggestion",
  "rule": "<short rule name>",
  "problematic_text": "<the exact excerpt from the document, max 120 chars>",
  "suggestion": "<specific, actionable fix>"
}

Return ONLY the JSON array. No markdown, no explanation. If there are no issues, return [].
Limit to the 15 most important issues.`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: document.slice(0, 14000) },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    let aiIssues: ComplianceIssue[] = [];
    const raw = aiResponse.choices[0]?.message?.content || "[]";
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      aiIssues = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return only terminology results
    }

    const issues: ComplianceIssue[] = [...terminologyResults, ...aiIssues];

    return NextResponse.json({ issues });
  } catch (err: any) {
    console.error("Compliance API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
