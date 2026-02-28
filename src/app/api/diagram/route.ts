import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { document, diagramType } = await req.json();

    if (!document?.trim()) {
      return NextResponse.json({ error: "Document is required" }, { status: 400 });
    }

    const typeHint = diagramType
      ? `Generate a ${diagramType} diagram.`
      : "Choose the most appropriate diagram type (flowchart, sequenceDiagram, or stateDiagram-v2) based on the content.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a technical documentation expert who generates Mermaid diagrams.

${typeHint}

Rules:
- Output ONLY valid Mermaid v10 syntax — no explanation, no markdown fences, no preamble
- Keep diagrams concise (max 15 nodes or steps)
- For flowcharts: start with "flowchart TD" or "flowchart LR"
- For sequences: start with "sequenceDiagram"
- For state: start with "stateDiagram-v2"
- Wrap node labels containing special chars in double quotes
- Do NOT start with \`\`\`mermaid — just output the raw syntax`,
        },
        {
          role: "user",
          content: `Generate a Mermaid diagram for this documentation:\n\n${document.slice(0, 6000)}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const mermaid = response.choices[0]?.message?.content?.trim();
    if (!mermaid) throw new Error("No diagram generated");

    // Strip any accidental code fences the model may have included
    const clean = mermaid
      .replace(/^```mermaid\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    return NextResponse.json({ mermaid: clean });
  } catch (err: any) {
    console.error("Diagram error:", err);
    return NextResponse.json(
      { error: err.message || "Diagram generation failed" },
      { status: 500 }
    );
  }
}
