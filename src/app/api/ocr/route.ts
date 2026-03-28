import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

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
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
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
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });
    const results: { name: string; text: string; error?: string }[] = [];

    for (const file of files) {
      const mimeType = normaliseMime(file.type, file.name);

      if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
        // ── Image: send to OpenAI Vision ──────────────────────────────────
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
        // ── PDF: extract embedded text via raw content stream parsing ────
        // This covers text-based (non-scanned) PDFs without native dependencies.
        try {
          const arrayBuffer = await file.arrayBuffer();
          const text = extractPdfText(new Uint8Array(arrayBuffer));

          if (text.trim().length > 30) {
            results.push({ name: file.name, text: text.trim() });
          } else {
            results.push({
              name: file.name,
              text: "",
              error:
                "This appears to be a scanned (image-based) PDF. Convert each page to a PNG or JPG and upload those for OCR.",
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

/**
 * Lightweight PDF text extractor that works without native binaries.
 * Parses BT…ET text blocks from PDF content streams — covers most text-based PDFs.
 */
function extractPdfText(bytes: Uint8Array): string {
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(bytes);

  const chunks: string[] = [];

  // Extract text from BT...ET blocks
  const btEtRe = /BT([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  while ((match = btEtRe.exec(raw)) !== null) {
    const block = match[1];
    // Grab content inside parentheses: (hello)
    const parenRe = /\(([^)]*(?:\\.[^)]*)*)\)/g;
    let pm: RegExpExecArray | null;
    while ((pm = parenRe.exec(block)) !== null) {
      const decoded = pm[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")");
      if (decoded.trim()) chunks.push(decoded);
    }
    // Grab hex strings: <48656c6c6f>
    const hexRe = /<([0-9a-fA-F]+)>/g;
    let hm: RegExpExecArray | null;
    while ((hm = hexRe.exec(block)) !== null) {
      const hex = hm[1];
      if (hex.length % 2 !== 0) continue;
      let str = "";
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      }
      if (str.trim() && /[\x20-\x7E]/.test(str)) chunks.push(str);
    }
  }

  return chunks.join(" ").replace(/ {2,}/g, " ").trim();
}
