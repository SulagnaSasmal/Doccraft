import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const HELP_CENTER_ROOT = path.resolve("D:\\doccraft-help-center");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileParam = searchParams.get("file") ?? "index.html";

  // Security: block path traversal and absolute paths
  if (fileParam.includes("..") || path.isAbsolute(fileParam)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const filePath = path.join(HELP_CENTER_ROOT, fileParam);

  // Security: ensure resolved path stays inside help-center root
  if (!filePath.startsWith(HELP_CENTER_ROOT)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let content: Buffer;
  try {
    content = fs.readFileSync(filePath);
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  // For HTML: rewrite relative links so assets + page links go through proxy/viewer
  if (ext === ".html") {
    let html = content.toString("utf-8");

    // Rewrite page links: href="foo.html" → href="/workspace?file=foo.html"
    html = html.replace(/href="([a-zA-Z0-9_-]+\.html)"/g, 'href="/workspace?file=$1"');

    // Rewrite asset links: href="assets/..." → href="/api/local-doc?file=assets/..."
    html = html.replace(/href="(assets\/[^"]+)"/g, 'href="/api/local-doc?file=$1"');
    html = html.replace(/src="(assets\/[^"]+)"/g, 'src="/api/local-doc?file=$1"');

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(content.buffer as ArrayBuffer, {
    headers: { "Content-Type": contentType },
  });
}
