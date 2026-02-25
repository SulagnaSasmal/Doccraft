import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const body = await req.json();
    const { action, content, config, answers } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    if (action === "analyze") {
      return handleAnalyze(content, config);
    } else if (action === "generate") {
      return handleGenerate(content, config, answers);
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

async function handleAnalyze(content: string, config: any) {
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

Aim for 5-12 focused, specific questions. Don't ask generic questions — ask things that would genuinely block a technical writer.

${config.customInstructions ? `Additional instructions: ${config.customInstructions}` : ""}

IMPORTANT: Return ONLY the JSON array, no markdown fences, no explanation. Example:
[{"id":"q1","question":"What happens when...","category":"missing"}]`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is the raw source material:\n\n${content.slice(0, 12000)}` },
    ],
    max_tokens: 2000,
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
  }));

  return NextResponse.json({ questions: formatted });
}

async function handleGenerate(content: string, config: any, answers: any[]) {
  const template = TEMPLATES[config.docType] || TEMPLATES["user-guide"];
  const audienceNote = AUDIENCE_INSTRUCTIONS[config.audience] || "";
  const toneNote = TONE_INSTRUCTIONS[config.tone] || "";

  const answeredContext = answers
    .filter((a: any) => !a.skipped && a.answer.trim())
    .map((a: any) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const skippedContext = answers
    .filter((a: any) => a.skipped)
    .map((a: any) => `- ${a.question} [SKIPPED — make reasonable assumption and mark with ⚠️]`)
    .join("\n");

  const systemPrompt = `You are a senior technical writer creating production-ready documentation.

DOCUMENT TYPE: ${config.docType}
TEMPLATE STRUCTURE:
${template}

AUDIENCE: ${config.audience}
${audienceNote}

TONE: ${config.tone}
${toneNote}

RULES:
1. Follow the template structure exactly
2. Write from the user's perspective — what do THEY need to do?
3. Use consistent formatting: headings, numbered steps, callout boxes
4. Mark any assumed information with ⚠️ emoji so reviewers can verify
5. Include practical examples where helpful
6. Keep paragraphs short (3-4 sentences max)
7. For steps, use the format: "Step N: [Action]" with a brief explanation below
8. Add a "Note:" or "Tip:" callout where useful
9. Output in clean Markdown format

${config.customInstructions ? `ADDITIONAL INSTRUCTIONS: ${config.customInstructions}` : ""}`;

  const userMessage = `SOURCE MATERIAL:
${content.slice(0, 12000)}

${answeredContext ? `\nCLARIFICATIONS FROM SME:\n${answeredContext}` : ""}
${skippedContext ? `\nUNANSWERED QUESTIONS (make reasonable assumptions):\n${skippedContext}` : ""}

Please generate the complete documentation now.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 4000,
    temperature: 0.4,
  });

  const document = response.choices[0]?.message?.content || "# Error\nFailed to generate documentation.";

  return NextResponse.json({ document });
}
