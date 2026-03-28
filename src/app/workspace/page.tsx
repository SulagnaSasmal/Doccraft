"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ExternalLink, BookOpen, ChevronRight,
  Scissors, Layers, Eye, Download, CheckCircle2,
} from "lucide-react";

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

function fileType(name: string): "pdf" | "doc" | "other" {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "html" || ext === "md" || ext === "mdx") return "doc";
  return "other";
}

function WorkspaceViewer() {
  const searchParams = useSearchParams();
  const file = searchParams.get("file") ?? "index.html";
  const highlight = searchParams.get("highlight");
  const title = FILE_TITLES[file] ?? file;
  const BASE = "https://sulagnasasmal.github.io/doccraft-help-center";
  const src = `${BASE}/${encodeURIComponent(file)}`;
  const kind = fileType(file);

  return (
    <div className="flex flex-col h-full relative">

      {/* ── Breadcrumb bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 shrink-0">
        <nav className="flex items-center gap-1.5 text-xs">
          <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <Link href="/" className="text-slate-500 hover:text-slate-300 transition-colors">Workspaces</Link>
          <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
          <Link href="/workspace?file=index.html" className="text-slate-500 hover:text-slate-300 transition-colors">Help Center</Link>
          <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
          <span className="text-slate-200 font-medium">{title}</span>
        </nav>
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

      {/* ── Post-action highlight banner ── */}
      {highlight === "split-complete" && (
        <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-600/8 shrink-0">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300 font-medium">
            Split complete — your extracted files were downloaded. Return to the drop zone to process another document.
          </p>
        </div>
      )}
      {highlight === "merge-complete" && (
        <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-500/30 bg-violet-600/8 shrink-0">
          <CheckCircle2 size={15} className="text-violet-400 shrink-0" />
          <p className="text-xs text-violet-300 font-medium">
            Merge complete — your assembled PDF was downloaded. You can now open it via the workspace.
          </p>
        </div>
      )}

      {/* ── Iframe viewer ── */}
      <iframe
        src={src}
        className="flex-1 w-full border-none"
        title={title}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />

      {/* ── Floating Action Bar ── */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2">
        {kind === "pdf" && (
          <>
            <Link
              href={`/split?from=${encodeURIComponent(file)}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700
                         text-xs font-semibold text-slate-300 hover:border-blue-500/50 hover:text-white
                         transition-all shadow-xl shadow-black/40 backdrop-blur-sm"
            >
              <Scissors size={13} className="text-blue-400" />
              Split
            </Link>
            <Link
              href={`/merge?from=${encodeURIComponent(file)}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700
                         text-xs font-semibold text-slate-300 hover:border-violet-500/50 hover:text-white
                         transition-all shadow-xl shadow-black/40 backdrop-blur-sm"
            >
              <Layers size={13} className="text-violet-400" />
              Merge
            </Link>
          </>
        )}

        {kind === "doc" && (
          <>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700
                         text-xs font-semibold text-slate-300 hover:border-blue-500/50 hover:text-white
                         transition-all shadow-xl shadow-black/40 backdrop-blur-sm"
            >
              <Eye size={13} className="text-blue-400" />
              Preview
            </a>
            <a
              href={src}
              download={file}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700
                         text-xs font-semibold text-slate-300 hover:border-emerald-500/50 hover:text-white
                         transition-all shadow-xl shadow-black/40 backdrop-blur-sm"
            >
              <Download size={13} className="text-emerald-400" />
              Export
            </a>
          </>
        )}
      </div>
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
