import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildInfographicPrompt(docContent: string, style: string): string {
  // Extract the first 1200 chars as the key conceptual content
  const excerpt = docContent.slice(0, 1200).replace(/[#*`]/g, "").trim();

  const styleGuide: Record<string, string> = {
    flowchart:
      "Clean flowchart/process diagram style, pastel backgrounds, rounded rectangles, clear directional arrows, minimal text, professional consulting aesthetic",
    concept:
      "Visual concept map style, central topic in the middle, satellite nodes connected by lines, color-coded categories, white background, clean sans-serif labels",
    summary:
      "Structured information graphic with sections, icon bullets, a title banner, clean grid layout, teal and amber accent colors, professional documentation style",
    timeline:
      "Horizontal timeline infographic, milestones as circles on a line, brief labels below each milestone, gradient accent, flat design",
  };

  const styleDesc = styleGuide[style] || styleGuide.summary;

  return `Create a professional documentation infographic visualizing the following technical content.
Style: ${styleDesc}.
Do NOT include any people, faces, or photorealistic elements.
Do NOT include long blocks of text — use short labels (3-6 words max per element).
The output should look like a professional technical writer created it for enterprise documentation.
Content to visualize:
---
${excerpt}
---`;
}

export async function POST(req: NextRequest) {
  try {
    const { content, style = "summary" } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const prompt = buildInfographicPrompt(content, style);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
      style: "natural",
    });

    const url = response.data?.[0]?.url;
    if (!url) throw new Error("No image returned");

    return NextResponse.json({ url, style });
  } catch (err: any) {
    console.error("Infographic generation error:", err);
    return NextResponse.json(
      { error: err.message || "Infographic generation failed" },
      { status: 500 }
    );
  }
}
