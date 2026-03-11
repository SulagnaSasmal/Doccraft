import { NextRequest, NextResponse } from "next/server";

interface CommitFileParams {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  content: string;
  message: string;
  token: string;
}

interface CreatePRParams {
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body: string;
  token: string;
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "DocCraft-AI",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function getDefaultBranch(owner: string, repo: string, token: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: ghHeaders(token),
  });
  if (!res.ok) throw new Error(`Cannot access repo ${owner}/${repo} — check permissions`);
  const data = await res.json();
  return data.default_branch || "main";
}

async function getFileSha(
  owner: string,
  repo: string,
  filePath: string,
  branch: string,
  token: string
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
    { headers: ghHeaders(token) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

async function createBranch(
  owner: string,
  repo: string,
  newBranch: string,
  baseBranch: string,
  token: string
): Promise<void> {
  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    { headers: ghHeaders(token) }
  );
  if (!refRes.ok) throw new Error(`Cannot get ref for ${baseBranch}`);
  const { object } = await refRes.json();

  const createRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs`,
    {
      method: "POST",
      headers: ghHeaders(token),
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: object.sha }),
    }
  );
  if (!createRes.ok) {
    const err = await createRes.json();
    // Branch may already exist — treat as non-fatal
    if (err.message !== "Reference already exists") {
      throw new Error(`Failed to create branch: ${err.message}`);
    }
  }
}

async function commitFile(params: CommitFileParams): Promise<string> {
  const { owner, repo, branch, filePath, content, message, token } = params;

  const sha = await getFileSha(owner, repo, filePath, branch, token);
  const encoded = Buffer.from(content, "utf-8").toString("base64");

  const body: Record<string, unknown> = {
    message,
    content: encoded,
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: ghHeaders(token),
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to commit file: ${err.message}`);
  }

  const data = await res.json();
  return data.content?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
}

async function createPR(params: CreatePRParams): Promise<string> {
  const { owner, repo, head, base, title, body, token } = params;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: ghHeaders(token),
    body: JSON.stringify({ title, body, head, base }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create PR: ${err.message}`);
  }

  const data = await res.json();
  return data.html_url;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, repoUrl, filePath, content, commitMessage, prTitle, prBody, token } = body;

    if (!repoUrl || !token) {
      return NextResponse.json(
        { error: "repoUrl and token are required" },
        { status: 400 }
      );
    }

    // Parse owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return NextResponse.json({ error: "Invalid GitHub repository URL" }, { status: 400 });
    }
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");

    const defaultBranch = await getDefaultBranch(owner, cleanRepo, token);

    if (action === "commit") {
      // Direct commit to default branch
      if (!filePath || !content) {
        return NextResponse.json({ error: "filePath and content are required for commit" }, { status: 400 });
      }
      const fileUrl = await commitFile({
        owner, repo: cleanRepo, branch: defaultBranch,
        filePath, content,
        message: commitMessage || "docs: update documentation via DocCraft AI",
        token,
      });
      return NextResponse.json({ success: true, url: fileUrl, action: "committed" });
    }

    if (action === "pr") {
      // Create a PR: make a new branch, commit the file, open PR
      if (!filePath || !content) {
        return NextResponse.json({ error: "filePath and content are required for PR" }, { status: 400 });
      }

      const prBranch = `doccraft/docs-update-${Date.now()}`;
      await createBranch(owner, cleanRepo, prBranch, defaultBranch, token);

      await commitFile({
        owner, repo: cleanRepo, branch: prBranch,
        filePath, content,
        message: commitMessage || "docs: update documentation via DocCraft AI",
        token,
      });

      const prUrl = await createPR({
        owner, repo: cleanRepo,
        head: prBranch,
        base: defaultBranch,
        title: prTitle || "DocCraft AI: Documentation Update",
        body: prBody || "Documentation updated via [DocCraft AI](https://doccraft-ten.vercel.app/).\n\nPlease review and merge.",
        token,
      });

      return NextResponse.json({ success: true, url: prUrl, action: "pr_created", branch: prBranch });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("GitHub publish error:", err);
    return NextResponse.json(
      { error: err.message || "GitHub publish failed" },
      { status: 500 }
    );
  }
}
