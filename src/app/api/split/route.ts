import { PDFDocument } from "pdf-lib";
import { NextRequest, NextResponse } from "next/server";

/** Parse a range string like "1-3, 5, 7-9" into 0-based page-index arrays.
 *  Each array in the result becomes one output file.
 *  If rangeStr is blank, every page becomes its own single-page file. */
function parseRanges(rangeStr: string, totalPages: number): number[][] {
  const clean = rangeStr.trim();
  if (!clean) {
    return Array.from({ length: totalPages }, (_, i) => [i]);
  }
  const groups: number[][] = [];
  for (const seg of clean.split(",")) {
    const part = seg.trim();
    if (!part) continue;
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n.trim(), 10) - 1);
      const pages: number[] = [];
      for (let i = Math.max(0, a); i <= Math.min(b, totalPages - 1); i++) {
        pages.push(i);
      }
      if (pages.length) groups.push(pages);
    } else {
      const idx = parseInt(part, 10) - 1;
      if (idx >= 0 && idx < totalPages) groups.push([idx]);
    }
  }
  return groups.length ? groups : Array.from({ length: totalPages }, (_, i) => [i]);
}

/** Convert Uint8Array to base64 without hitting the call-stack limit */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ranges = (formData.get("ranges") as string) ?? "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const srcPdf = await PDFDocument.load(arrayBuffer);
    const totalPages = srcPdf.getPageCount();

    if (totalPages === 0) {
      return NextResponse.json({ error: "PDF has no pages" }, { status: 400 });
    }

    const pageGroups = parseRanges(ranges, totalPages);

    // Hard limit: max 50 output files per request
    const capped = pageGroups.slice(0, 50);
    const baseName = file.name.replace(/\.pdf$/i, "");

    const results = await Promise.all(
      capped.map(async (pages) => {
        const newPdf = await PDFDocument.create();
        const copied = await newPdf.copyPages(srcPdf, pages);
        copied.forEach((p) => newPdf.addPage(p));
        const pdfBytes = await newPdf.save();
        const label =
          pages.length === 1
            ? `p${pages[0] + 1}`
            : `p${pages[0] + 1}-${pages[pages.length - 1] + 1}`;
        return {
          name: `${baseName}_${label}.pdf`,
          data: toBase64(pdfBytes),
          pages: pages.length,
        };
      })
    );

    return NextResponse.json({
      files: results,
      count: results.length,
      totalPages,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Split failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
