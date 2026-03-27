"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, BookOpen } from "lucide-react";

const FILE_TITLES: Record<string, string> = {
  "index.html": "Help Center — Home",
  "getting-started.html": "Getting Started",
  "workflows.html": "Workflow Guides",
  "feature-generate.html": "Generating Documentation",
  "ui-reference.html": "UI Reference",
  "faq.html": "Frequently Asked Questions",
  "troubleshooting.html": "Troubleshooting",
  "release-notes.html": "Release Notes",
};

function WorkspaceViewer() {
  const searchParams = useSearchParams();
  const file = searchParams.get("file") ?? "index.html";
  const title = FILE_TITLES[file] ?? file;
  const src = `/api/local-doc?file=${encodeURIComponent(file)}`;

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="text-slate-500">Help Center</span>
          <span className="text-slate-700">/</span>
          <span className="text-slate-200 font-medium">{title}</span>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open raw
        </a>
      </div>

      {/* Iframe viewer */}
      <iframe
        src={src}
        className="flex-1 w-full border-none"
        title={title}
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <div className="h-full flex flex-col">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Loading document...
          </div>
        }
      >
        <WorkspaceViewer />
      </Suspense>
    </div>
  );
}
