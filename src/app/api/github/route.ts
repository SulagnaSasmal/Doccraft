import { NextRequest, NextResponse } from "next/server";
import {
  fetchDefaultBranch,
  fetchFile,
  fetchReadme,
  parseGitHubUrl,
} from "@/lib/githubRepo";

async function fetchTree(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DocCraft-AI",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    }
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
      content = await fetchFile(owner, repo, path, branch, process.env.GITHUB_TOKEN);
      label = path.split("/").pop() || path;
    } else if (urlType === "tree" && path) {
      const defaultBranch = branch || (await fetchDefaultBranch(owner, repo, process.env.GITHUB_TOKEN));
      content = await fetchTree(owner, repo, path, defaultBranch);
      label = `${repo}/${path}`;
    } else {
      content = await fetchReadme(owner, repo, process.env.GITHUB_TOKEN);
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
