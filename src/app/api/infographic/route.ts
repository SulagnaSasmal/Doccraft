import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = 'edge';
export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VISUAL_SYSTEM_PROMPTS: Record<string, string> = {
  mindmap: `You are a diagram expert. Generate a Mermaid mindmap that visualizes the key concepts from the provided documentation.
Rules:
- Use mindmap syntax (starts with "mindmap")
- Root node should be the main topic wrapped in double parens: root((Main Topic))
- Add 4-6 top-level branches with 2-3 sub-nodes each
- Keep all labels concise: 3-5 words max
- Return ONLY valid Mermaid mindmap code, no explanation, no markdown fences`,

  timeline: `You are a diagram expert. Generate a Mermaid timeline showing the key phases, steps, or milestones from the provided documentation.
Rules:
- Use timeline syntax (starts with "timeline")
- Include a title line
- Organize into 2-4 sections using "section" keyword
- Add 1-3 entries per section in format: Label : Short description
- Keep labels concise
- Return ONLY valid Mermaid timeline code, no explanation, no markdown fences`,

  pie: `You are a diagram expert. Generate a Mermaid pie chart showing the distribution of topics, components, or concerns in the provided documentation.
Rules:
- Use pie syntax (starts with "pie title ...")
- Include 4-7 slices
- Values must be positive numbers (they will be normalized automatically, no need to sum to 100)
- Format: "Label" : value
- Labels should be concise (2-4 words)
- Return ONLY valid Mermaid pie code, no explanation, no markdown fences`,

  flowchart: `You are a diagram expert. Generate a detailed Mermaid flowchart showing the main process, workflow, or decision tree from the provided documentation.
Rules:
- Use flowchart TD syntax
- Include at least one decision diamond (e.g., Q{Decision?})
- Use rectangles for processes, diamonds for decisions, rounded rects for start/end
- Add clear directional arrows with optional labels
- Keep node labels concise (3-6 words)
- Return ONLY valid Mermaid flowchart code, no explanation, no markdown fences`,
};

export async function POST(req: NextRequest) {
  try {
    const { content, style = "mindmap" } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const excerpt = content.slice(0, 2000).replace(/\r/g, "");
    const systemPrompt = VISUAL_SYSTEM_PROMPTS[style] ?? VISUAL_SYSTEM_PROMPTS.mindmap;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Documentation content to visualize:\n\n${excerpt}` },
      ],
      max_tokens: 700,
      temperature: 0.3,
    });

    let mermaid = response.choices[0]?.message?.content?.trim() ?? "";
    // Strip markdown fences if the model wrapped the output
    mermaid = mermaid.replace(/^```(?:mermaid)?\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    if (!mermaid) throw new Error("No diagram generated");

    return NextResponse.json({ mermaid, style });
  } catch (err: any) {
    console.error("Visual generator error:", err);
    return NextResponse.json(
      { error: err.message || "Visual generation failed" },
      { status: 500 }
    );
  }
}
