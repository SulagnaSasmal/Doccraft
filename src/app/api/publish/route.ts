import { NextRequest, NextResponse } from "next/server";

// ─── Confluence ────────────────────────────────────────────────────────────

interface ConfluenceParams {
  baseUrl: string;   // e.g. https://yoursite.atlassian.net/wiki
  email: string;
  token: string;     // Atlassian API token
  spaceKey: string;
  title: string;
  content: string;   // Markdown — converted to basic XHTML storage
  parentPageId?: string;
}

function markdownToConfluenceStorage(md: string): string {
  // Convert the most common Markdown patterns to Confluence XHTML storage format
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(?!<[h|l|u|o|p])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "")
    .trim();
}

async function publishToConfluence(params: ConfluenceParams): Promise<string> {
  const { baseUrl, email, token, spaceKey, title, content, parentPageId } = params;

  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const cleanBase = baseUrl.replace(/\/+$/, "");

  const storageContent = markdownToConfluenceStorage(content);

  const body: Record<string, unknown> = {
    type: "page",
    title,
    space: { key: spaceKey },
    body: {
      storage: {
        value: storageContent,
        representation: "storage",
      },
    },
  };

  if (parentPageId) {
    body.ancestors = [{ id: parentPageId }];
  }

  const res = await fetch(`${cleanBase}/rest/api/content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Confluence returned ${res.status}`);
  }

  const data = await res.json();
  return `${cleanBase}${data._links?.webui || `/pages/${data.id}`}`;
}

// ─── Notion ────────────────────────────────────────────────────────────────

interface NotionParams {
  token: string;
  parentPageId: string;  // parent page or database ID
  title: string;
  content: string;       // Markdown text
}

function markdownToNotionBlocks(md: string): unknown[] {
  const lines = md.split("\n");
  const blocks: unknown[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.startsWith("### ")) {
      blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: line.slice(4) } }] } });
    } else if (line.startsWith("## ")) {
      blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] } });
    } else if (line.startsWith("# ")) {
      blocks.push({ object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } });
    } else if (/^\d+\. /.test(line)) {
      blocks.push({ object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: [{ type: "text", text: { content: line.replace(/^\d+\. /, "") } }] } });
    } else if (line.startsWith("> ")) {
      blocks.push({ object: "block", type: "quote", quote: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } });
    } else if (line.startsWith("```")) {
      // skip code fence markers
    } else {
      // Plain paragraph — strip bold/italic markers for simplicity
      const text = line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1");
      if (text.trim()) {
        blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: text } }] } });
      }
    }
  }

  return blocks;
}

async function publishToNotion(params: NotionParams): Promise<string> {
  const { token, parentPageId, title, content } = params;

  const children = markdownToNotionBlocks(content);

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: {
        title: { title: [{ type: "text", text: { content: title } }] },
      },
      children: children.slice(0, 100), // Notion API limit per request
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Notion returned ${res.status}`);
  }

  const data = await res.json();
  return `https://notion.so/${data.id.replace(/-/g, "")}`;
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, ...params } = body;

    if (!target) {
      return NextResponse.json({ error: "target is required (confluence | notion)" }, { status: 400 });
    }

    if (target === "confluence") {
      const { baseUrl, email, token, spaceKey, title, content, parentPageId } = params;
      if (!baseUrl || !email || !token || !spaceKey || !title || !content) {
        return NextResponse.json({ error: "confluence requires: baseUrl, email, token, spaceKey, title, content" }, { status: 400 });
      }
      const url = await publishToConfluence({ baseUrl, email, token, spaceKey, title, content, parentPageId });
      return NextResponse.json({ success: true, url, target: "confluence" });
    }

    if (target === "notion") {
      const { token, parentPageId, title, content } = params;
      if (!token || !parentPageId || !title || !content) {
        return NextResponse.json({ error: "notion requires: token, parentPageId, title, content" }, { status: 400 });
      }
      const url = await publishToNotion({ token, parentPageId, title, content });
      return NextResponse.json({ success: true, url, target: "notion" });
    }

    return NextResponse.json({ error: `Unknown target: ${target}` }, { status: 400 });
  } catch (err: any) {
    console.error("Publish error:", err);
    return NextResponse.json({ error: err.message || "Publish failed" }, { status: 500 });
  }
}
