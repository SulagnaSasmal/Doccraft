export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
  urlType: "repo" | "file" | "tree";
}

export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  try {
    const parsed = new URL(url.trim());
    if (!["github.com", "www.github.com"].includes(parsed.hostname)) return null;

    const parts = parsed.pathname.replace(/^\//, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const [owner, repo] = parts;
    if (parts.length === 2) {
      return { owner, repo, urlType: "repo" };
    }

    const urlType = parts[2] === "blob" ? "file" : parts[2] === "tree" ? "tree" : "repo";
    return {
      owner,
      repo,
      branch: parts[3],
      path: parts.slice(4).join("/"),
      urlType,
    };
  } catch {
    return null;
  }
}

export function ghHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "DocCraft-AI",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function ghFetch(url: string, token?: string): Promise<Response> {
  return fetch(url, { headers: ghHeaders(token) });
}

export async function fetchDefaultBranch(owner: string, repo: string, token?: string) {
  const res = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, token);
  if (!res.ok) return "main";
  const data = await res.json();
  return data.default_branch || "main";
}

export async function fetchFile(
  owner: string,
  repo: string,
  path: string,
  branch?: string,
  token?: string
) {
  const ref = branch || "HEAD";
  const res = await ghFetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
    token
  );

  if (!res.ok) {
    throw new Error(`Could not fetch file: ${path}`);
  }

  return res.text();
}

export async function fetchReadme(owner: string, repo: string, token?: string) {
  const res = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/readme`, token);
  if (!res.ok) throw new Error("No README found in this repository");
  const data = await res.json();
  return Buffer.from(data.content, "base64").toString("utf-8");
}

function isReadableTextFile(path: string) {
  return /\.(md|mdx|txt|yaml|yml|json|rst|ts|tsx|js|jsx|py|java|cs|go|rs|sh)$/i.test(path);
}

export async function fetchRepositoryContext(options: {
  repoUrl: string;
  branch?: string;
  changedFiles?: string[];
  token?: string;
}) {
  const parsed = parseGitHubUrl(options.repoUrl);
  if (!parsed) throw new Error("Invalid GitHub repository URL");

  const owner = parsed.owner;
  const repo = parsed.repo.replace(/\.git$/, "");
  const branch = options.branch || parsed.branch || (await fetchDefaultBranch(owner, repo, options.token));

  const selectedFiles = (options.changedFiles || [])
    .filter(isReadableTextFile)
    .slice(0, 8);

  const sections: string[] = [];
  const sourceFiles: string[] = [];

  try {
    const readme = await fetchReadme(owner, repo, options.token);
    sections.push(`## README\n\n${readme.slice(0, 4000)}`);
    sourceFiles.push("README");
  } catch {
    // README is optional for webhook processing.
  }

  for (const file of selectedFiles) {
    try {
      const text = await fetchFile(owner, repo, file, branch, options.token);
      sections.push(`## ${file}\n\n${text.slice(0, 4000)}`);
      sourceFiles.push(file);
    } catch {
      // Skip unreadable files and continue with what is available.
    }
  }

  if (sections.length === 0) {
    throw new Error("No readable repository content was available for this webhook run");
  }

  return {
    owner,
    repo,
    branch,
    sourceFiles,
    content: sections.join("\n\n---\n\n"),
  };
}