import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ACTIONS: Record<string, string> = {
  simplify:
    "Rewrite this section in simpler language. Remove jargon. Use shorter sentences. Make it understandable by someone with no technical background. Keep the same meaning and structure.",
  expand:
    "Expand this section with more detail, examples, and explanation. Add context that would help the reader understand WHY, not just WHAT. Keep the same tone.",
  example:
    "Add a practical, real-world example to illustrate this section. The example should be concrete and relatable to the target audience.",
  troubleshoot:
    "Add troubleshooting content for this section. Include common issues, their causes, and step-by-step fixes. Format as: Problem → Cause → Solution.",
  formal:
    "Rewrite this section in a more formal, professional tone. Use third person. Remove contractions. Suitable for enterprise documentation.",
  concise:
    "Make this section more concise. Remove redundant words and phrases. Keep only essential information. Every sentence should earn its place.",
};

export async function POST(req: NextRequest) {
  try {
    const { text, action, fullDocument, config } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const instruction = ACTIONS[action] || ACTIONS.simplify;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a senior technical writer refining documentation.
Audience: ${config?.audience || "general"}
Tone: ${config?.tone || "conversational"}

Your task: ${instruction}

Return ONLY the rewritten text in Markdown. No explanations, no preamble, no "Here's the rewritten version" — just the refined content.`,
        },
        {
          role: "user",
          content: `Section to refine:\n\n${text}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const refined =
      response.choices[0]?.message?.content || text;

    return NextResponse.json({ refined });
  } catch (err: any) {
    console.error("Refine error:", err);
    return NextResponse.json(
      { error: err.message || "Refinement failed" },
      { status: 500 }
    );
  }
}
