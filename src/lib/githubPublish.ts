export interface PublishDocumentParams {
  repoUrl: string;
  filePath: string;
  content: string;
  token: string;
  action: "commit" | "pr";
  commitMessage?: string;
  prTitle?: string;
  prBody?: string;
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "DocCraft-AI",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function parseRepoUrl(repoUrl: string) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub repository URL");

  const [, owner, repo] = match;
  return { owner, repo: repo.replace(/\.git$/, "") };
}

async function getDefaultBranch(owner: string, repo: string, token: string) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: ghHeaders(token),
  });
  if (!res.ok) throw new Error(`Cannot access repo ${owner}/${repo} - check permissions`);
  const data = await res.json();
  return data.default_branch || "main";
}

async function getFileSha(owner: string, repo: string, filePath: string, branch: string, token: string) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
    { headers: ghHeaders(token) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

async function createBranch(owner: string, repo: string, newBranch: string, baseBranch: string, token: string) {
  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    { headers: ghHeaders(token) }
  );
  if (!refRes.ok) throw new Error(`Cannot get ref for ${baseBranch}`);

  const { object } = await refRes.json();
  const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: ghHeaders(token),
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: object.sha }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    if (err.message !== "Reference already exists") {
      throw new Error(`Failed to create branch: ${err.message}`);
    }
  }
}

async function commitFile(params: {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  content: string;
  message: string;
  token: string;
}) {
  const sha = await getFileSha(params.owner, params.repo, params.filePath, params.branch, params.token);
  const body: Record<string, unknown> = {
    message: params.message,
    content: Buffer.from(params.content, "utf-8").toString("base64"),
    branch: params.branch,
  };

  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${params.filePath}`,
    {
      method: "PUT",
      headers: ghHeaders(params.token),
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to commit file: ${err.message}`);
  }

  const data = await res.json();
  return data.content?.html_url || `https://github.com/${params.owner}/${params.repo}/blob/${params.branch}/${params.filePath}`;
}

async function createPullRequest(params: {
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body: string;
  token: string;
}) {
  const res = await fetch(`https://api.github.com/repos/${params.owner}/${params.repo}/pulls`, {
    method: "POST",
    headers: ghHeaders(params.token),
    body: JSON.stringify({
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create PR: ${err.message}`);
  }

  const data = await res.json();
  return data.html_url;
}

export async function publishDocumentToGithub(params: PublishDocumentParams) {
  const { owner, repo } = parseRepoUrl(params.repoUrl);
  const defaultBranch = await getDefaultBranch(owner, repo, params.token);

  if (params.action === "commit") {
    const url = await commitFile({
      owner,
      repo,
      branch: defaultBranch,
      filePath: params.filePath,
      content: params.content,
      message: params.commitMessage || "docs: update documentation via DocCraft AI",
      token: params.token,
    });

    return { success: true, url, action: "committed" as const };
  }

  const prBranch = `doccraft/docs-update-${Date.now()}`;
  await createBranch(owner, repo, prBranch, defaultBranch, params.token);

  await commitFile({
    owner,
    repo,
    branch: prBranch,
    filePath: params.filePath,
    content: params.content,
    message: params.commitMessage || "docs: update documentation via DocCraft AI",
    token: params.token,
  });

  const url = await createPullRequest({
    owner,
    repo,
    head: prBranch,
    base: defaultBranch,
    title: params.prTitle || "DocCraft AI: Documentation Update",
    body: params.prBody || "Documentation updated via DocCraft AI. Please review and merge.",
    token: params.token,
  });

  return { success: true, url, action: "pr_created" as const, branch: prBranch };
}