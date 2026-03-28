import { PDFDocument } from "pdf-lib";
import { NextRequest, NextResponse } from "next/server";

/** Convert Uint8Array to base64 without hitting the call-stack limit */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const rawFiles = formData.getAll("files");

    const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (files.length < 2) {
      return NextResponse.json({ error: "At least 2 PDF files are required to merge" }, { status: 400 });
    }

    const merged = await PDFDocument.create();

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        continue; // skip non-PDFs silently
      }
      const arrayBuffer = await file.arrayBuffer();
      let srcPdf: PDFDocument;
      try {
        srcPdf = await PDFDocument.load(arrayBuffer);
      } catch {
        // Skip corrupted or unreadable PDFs
        continue;
      }
      const indices = srcPdf.getPageIndices();
      if (indices.length === 0) continue;
      const copied = await merged.copyPages(srcPdf, indices);
      copied.forEach((p) => merged.addPage(p));
    }

    const pageCount = merged.getPageCount();
    if (pageCount === 0) {
      return NextResponse.json({ error: "No readable pages found in uploaded PDFs" }, { status: 400 });
    }

    const pdfBytes = await merged.save();

    return NextResponse.json({
      data: toBase64(pdfBytes),
      name: "merged.pdf",
      pageCount,
      fileCount: files.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Merge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
