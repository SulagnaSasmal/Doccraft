import { NextRequest, NextResponse } from "next/server";
import { publishDocumentToGithub } from "@/lib/githubPublish";

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

    if (action !== "commit" && action !== "pr") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    if (!filePath || !content) {
      return NextResponse.json({ error: "filePath and content are required" }, { status: 400 });
    }

    const result = await publishDocumentToGithub({
      repoUrl,
      filePath,
      content,
      token,
      action,
      commitMessage,
      prTitle,
      prBody,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GitHub publish error:", err);
    return NextResponse.json(
      { error: err.message || "GitHub publish failed" },
      { status: 500 }
    );
  }
}
