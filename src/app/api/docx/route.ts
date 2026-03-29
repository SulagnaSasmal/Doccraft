import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

// Node.js runtime — mammoth requires Node APIs (not edge-compatible)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // extractRawText preserves tracked changes — accepted insertions are included,
    // deleted text is excluded (same as what a reader sees in "accept all changes" view).
    // Use convertToHtml if you want both ins/del marks visible.
    const [rawResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }, {
        styleMap: [
          "b => b",
          "i => i",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
        ],
      }),
    ]);

    const rawText = rawResult.value.trim();

    // Detect tracked changes in the HTML output (ins/del tags from mammoth)
    const hasTrackedChanges =
      /<ins\b/i.test(htmlResult.value) || /<del\b/i.test(htmlResult.value);

    // Build a readable text version that notes track-change context
    let finalText = rawText;
    if (hasTrackedChanges) {
      // Extract deleted text so the user is aware what was removed
      const deletedMatches = htmlResult.value.match(/<del[^>]*>([\s\S]*?)<\/del>/gi) || [];
      const deletedSnippets = deletedMatches
        .map((m) => m.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
        .slice(0, 20); // cap at 20 deletions to avoid bloat

      if (deletedSnippets.length > 0) {
        finalText +=
          "\n\n---\n[Track Changes — Deleted text (not in final)]\n" +
          deletedSnippets.map((s) => `- ${s}`).join("\n");
      }
    }

    if (!finalText || finalText.length < 10) {
      return NextResponse.json(
        { error: "No readable text found in this DOCX file." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text: finalText,
      hasTrackedChanges,
      warnings: rawResult.messages.map((m) => m.message),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "DOCX parsing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
