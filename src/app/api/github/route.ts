import { NextRequest, NextResponse } from "next/server";

interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
  urlType: "repo" | "file" | "tree";
}

function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  try {
    const u = new URL(url.trim());
    if (!["github.com", "www.github.com"].includes(u.hostname)) return null;

    const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const [owner, repo] = parts;

    if (parts.length === 2) {
      return { owner, repo, urlType: "repo" };
    }

    const urlType =
      parts[2] === "blob" ? "file" : parts[2] === "tree" ? "tree" : "repo";
    const branch = parts[3];
    const path = parts.slice(4).join("/");

    return { owner, repo, branch, path, urlType };
  } catch {
    return null;
  }
}

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "DocCraft-AI",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function ghFetch(url: string): Promise<Response> {
  return fetch(url, { headers: ghHeaders() });
}

async function fetchDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!res.ok) return "main";
  const data = await res.json();
  return data.default_branch || "main";
}

async function fetchFile(
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<string> {
  const ref = branch || "HEAD";
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  const res = await ghFetch(rawUrl);
  if (!res.ok) throw new Error(`Could not fetch file: ${path}`);
  return res.text();
}

async function fetchReadme(owner: string, repo: string): Promise<string> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/readme`
  );
  if (!res.ok) throw new Error("No README found in this repository");
  const data = await res.json();
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function fetchTree(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  );
  if (!res.ok) throw new Error(`Could not fetch directory: ${path}`);

  const items = await res.json();
  if (!Array.isArray(items)) throw new Error("Expected a directory listing");

  // Only fetch readable text files, cap at 5
  const textFiles = items
    .filter(
      (item: any) =>
        item.type === "file" &&
        /\.(md|txt|yaml|yml|json|rst)$/i.test(item.name)
    )
    .slice(0, 5);

  if (textFiles.length === 0)
    throw new Error("No readable text files found in this directory");

  const contents: string[] = [];
  for (const file of textFiles) {
    try {
      const text = await fetchFile(owner, repo, file.path, branch);
      contents.push(`### ${file.name}\n\n${text}`);
    } catch {
      // Skip files that fail
    }
  }

  if (contents.length === 0) throw new Error("Could not read any files");
  return contents.join("\n\n---\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url?.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { error: "Not a valid GitHub URL. Paste a link to a repo, file, or folder." },
        { status: 400 }
      );
    }

    const { owner, repo, branch, path, urlType } = parsed;
    let content = "";
    let label = "";

    if (urlType === "file" && path) {
      content = await fetchFile(owner, repo, path, branch);
      label = path.split("/").pop() || path;
    } else if (urlType === "tree" && path) {
      const defaultBranch = branch || (await fetchDefaultBranch(owner, repo));
      content = await fetchTree(owner, repo, path, defaultBranch);
      label = `${repo}/${path}`;
    } else {
      content = await fetchReadme(owner, repo);
      label = `${owner}/${repo} README`;
    }

    return NextResponse.json({ content, label, chars: content.length });
  } catch (err: any) {
    console.error("GitHub fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch from GitHub" },
      { status: 500 }
    );
  }
}
