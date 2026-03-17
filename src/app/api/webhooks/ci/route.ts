import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateDocument } from "@/lib/docGeneration";
import { fetchRepositoryContext } from "@/lib/githubRepo";
import { publishDocumentToGithub } from "@/lib/githubPublish";
import { sanitizeComplianceRules, type CustomComplianceRule } from "@/lib/complianceRules";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getSecret(req: NextRequest) {
  return (
    req.headers.get("x-doccraft-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

function getChangedFilesFromPush(payload: any): string[] {
  if (!Array.isArray(payload?.commits)) return [];

  return Array.from(
    new Set(
      payload.commits.flatMap((commit: any) => [
        ...(Array.isArray(commit.added) ? commit.added : []),
        ...(Array.isArray(commit.modified) ? commit.modified : []),
      ])
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.DOCCRAFT_WEBHOOK_SECRET;
    if (!configuredSecret) {
      return NextResponse.json({ error: "DOCCRAFT_WEBHOOK_SECRET is not configured" }, { status: 500 });
    }

    const providedSecret = getSecret(req);
    if (!providedSecret || providedSecret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const payload = await req.json();

    const repoUrl = payload.repositoryUrl || payload.repository?.html_url;
    if (!repoUrl) {
      return NextResponse.json({ error: "repositoryUrl or repository.html_url is required" }, { status: 400 });
    }

    const branch = payload.branch || payload.ref?.replace("refs/heads/", "") || undefined;
    const changedFiles = Array.isArray(payload.changedFiles)
      ? payload.changedFiles
      : getChangedFilesFromPush(payload);

    const repoContext = await fetchRepositoryContext({
      repoUrl,
      branch,
      changedFiles,
      token: payload.githubToken || process.env.GITHUB_TOKEN,
    });

    const config = {
      docType: payload.docType || "release-notes",
      audience: payload.audience || "mixed",
      tone: payload.tone || "instructional",
      customInstructions:
        payload.customInstructions ||
        "Summarize the repository changes clearly, call out impact, and keep the output ready for publication.",
    };

    const customRules = sanitizeComplianceRules(payload.customRules as CustomComplianceRule[] | undefined);
    const rulesAppendix = customRules.length > 0
      ? `\n\nCUSTOM COMPLIANCE RULES:\n${customRules.map((rule) => `- ${rule.name} [${rule.severity.toUpperCase()}]: ${rule.instruction}`).join("\n")}`
      : "";

    const sourceContent = [
      `Repository: ${repoContext.owner}/${repoContext.repo}`,
      `Branch: ${repoContext.branch}`,
      changedFiles.length > 0 ? `Changed files:\n- ${changedFiles.join("\n- ")}` : null,
      repoContext.content,
      payload.contextText ? `Additional context:\n${payload.contextText}` : null,
      rulesAppendix,
    ]
      .filter(Boolean)
      .join("\n\n");

    const document = await generateDocument(openai, sourceContent, config, [], payload.contextText);

    const response: Record<string, unknown> = {
      success: true,
      repo: `${repoContext.owner}/${repoContext.repo}`,
      branch: repoContext.branch,
      sourceFiles: repoContext.sourceFiles,
      document,
    };

    if (payload.publish?.enabled) {
      if (!payload.publish.repoUrl || !payload.publish.filePath) {
        return NextResponse.json({ error: "publish.repoUrl and publish.filePath are required when publish.enabled is true" }, { status: 400 });
      }

      const token = payload.publish.token || process.env.GITHUB_TOKEN;
      if (!token) {
        return NextResponse.json({ error: "A GitHub token is required for publish-enabled webhooks" }, { status: 400 });
      }

      response.publish = await publishDocumentToGithub({
        repoUrl: payload.publish.repoUrl,
        filePath: payload.publish.filePath,
        content: document,
        token,
        action: payload.publish.action === "commit" ? "commit" : "pr",
        commitMessage: payload.publish.commitMessage,
        prTitle: payload.publish.prTitle,
        prBody: payload.publish.prBody,
      });
    }

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("CI webhook error:", err);
    return NextResponse.json(
      { error: err.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}