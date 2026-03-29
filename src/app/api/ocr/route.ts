import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import * as pdfParseModule from "pdf-parse";
// pdf-parse ships both CJS and ESM; pick whichever export is available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buf: Buffer, opts?: Record<string, unknown>) => Promise<{ text: string; numpages: number }> =
  (pdfParseModule as any).default ?? (pdfParseModule as any);

// Must run on Node.js — pdf-parse uses Buffer APIs not available in Edge
export const runtime = "nodejs";

const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/tiff",
];

/** Convert ArrayBuffer to base64 in chunks to avoid stack overflow */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/** Normalise MIME type for common mismatches */
function normaliseMime(type: string, name: string): string {
  if (type && type !== "application/octet-stream") return type;
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    tiff: "image/tiff",
    tif: "image/tiff",
    pdf: "application/pdf",
  };
  return map[ext ?? ""] ?? type;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const rawFiles = formData.getAll("files");
    const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const openai = apiKey ? new OpenAI({ apiKey }) : null;

    const results: { name: string; text: string; error?: string }[] = [];

    for (const file of files) {
      const mimeType = normaliseMime(file.type, file.name);

      if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
        // ── Image: send to OpenAI Vision ──────────────────────────────────
        if (!openai) {
          results.push({ name: file.name, text: "", error: "OpenAI API key not configured — cannot process images." });
          continue;
        }
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);
          const dataUrl = `data:${mimeType};base64,${base64}`;

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract all text from this image exactly as it appears. Preserve the original structure, headings, bullet points, tables, and paragraph breaks. Return only the extracted text — no commentary, no explanations, no markdown code fences.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: dataUrl, detail: "high" },
                  },
                ],
              },
            ],
          });

          const extracted = response.choices[0]?.message?.content ?? "";
          results.push({ name: file.name, text: extracted.trim() });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Vision API failed";
          results.push({ name: file.name, text: "", error: msg });
        }
      } else if (mimeType === "application/pdf") {
        // ── PDF: use pdf-parse for proper ToUnicode/CMap-aware extraction ──
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const data = await pdfParse(buffer);
          const text = data.text?.trim() ?? "";

          if (text.length > 30) {
            results.push({ name: file.name, text });
          } else {
            results.push({
              name: file.name,
              text: "",
              error:
                "This appears to be a scanned (image-based) PDF with no embedded text. Convert each page to a PNG or JPG and upload those for OCR.",
            });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "PDF parsing failed";
          results.push({ name: file.name, text: "", error: msg });
        }
      } else {
        results.push({
          name: file.name,
          text: "",
          error: `Unsupported file type: ${mimeType || "unknown"}. Supported: PNG, JPG, WEBP, TIFF, GIF, PDF.`,
        });
      }
    }

    // Combine all successful extractions into one block
    const combined = results
      .filter((r) => r.text)
      .map((r) => (files.length > 1 ? `## ${r.name}\n\n${r.text}` : r.text))
      .join("\n\n---\n\n");

    return NextResponse.json({ results, combined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OCR failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
