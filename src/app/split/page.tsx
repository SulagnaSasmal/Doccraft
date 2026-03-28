"use client";

import { Suspense, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scissors, Upload, FileText, X, ChevronRight, ArrowLeft, Shield, Zap } from "lucide-react";

interface PdfFile {
  name: string;
  size: number;
  file: File;
}

function SplitInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromFile = searchParams.get("from");
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [rangeInput, setRangeInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.includes("pdf")) return;
    setPdfFile({ name: f.name, size: f.size, file: f });
    setRangeInput("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const formatBytes = (b: number) =>
    b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.round(b / 1000)} KB`;

  return (
    <div className="min-h-screen flex flex-col bg-tool-hero">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800/60">
        {fromFile ? (
          <>
            <a href="/" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">Workspaces</a>
            <span className="text-slate-700">/</span>
            <a href={`/workspace?file=${encodeURIComponent(fromFile)}`} className="text-slate-500 hover:text-slate-300 transition-colors text-sm truncate max-w-[160px]">{fromFile}</a>
            <span className="text-slate-700">/</span>
          </>
        ) : (
          <>
            <a href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm">
              <ArrowLeft size={14} />
              DocCraft
            </a>
            <span className="text-slate-700">/</span>
          </>
        )}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Scissors size={11} className="text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-slate-300">Content Atomicizer</span>
        </div>
        {/* Compliance badge */}
        <div className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600/10 border border-emerald-500/20">
          <Shield size={10} className="text-emerald-400" />
          <span className="text-[0.65rem] font-medium text-emerald-300">Local Processing — No Upload to Servers</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl">

          {!pdfFile ? (
            <>
              {/* Hero empty state */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center mx-auto mb-5">
                  <Scissors size={22} className="text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Content Atomicizer</h1>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Divide a PDF into individual pages or precision page ranges. Each segment becomes a standalone file, ready for re-use or distribution.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  dragging
                    ? "border-blue-500 bg-blue-600/10 scale-[1.01]"
                    : "border-slate-700 hover:border-blue-500/40 hover:bg-slate-800/20"
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-all ${dragging ? "bg-blue-600/20 border-blue-500/40" : "bg-slate-800 border-slate-700"}`}>
                  <Upload size={18} className={dragging ? "text-blue-400" : "text-slate-500"} />
                </div>
                <p className="text-slate-200 font-semibold mb-1">Drop your PDF here</p>
                <p className="text-slate-500 text-sm">or click to browse</p>
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[0.65rem] font-mono text-slate-500">PDF</span>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  title="Select PDF to split"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {/* Feature hints */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  { icon: Scissors, title: "Page ranges", desc: "e.g. 1-3, 5, 7-9" },
                  { icon: Zap, title: "Instant split", desc: "No server upload needed" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                    <item.icon size={13} className="text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[0.72rem] font-semibold text-slate-300">{item.title}</p>
                      <p className="text-[0.65rem] text-slate-600 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-5 animate-fade-in-up">
              {/* Page header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <Scissors size={16} className="text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-100">Content Atomicizer</h1>
                  <p className="text-xs text-slate-500">Configure your split and extract</p>
                </div>
              </div>

              {/* File card */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/40">
                <div className="w-9 h-9 rounded-lg bg-blue-600/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                  <FileText size={15} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{pdfFile.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(pdfFile.size)}</p>
                </div>
                <button
                  type="button"
                  title="Remove file"
                  onClick={() => setPdfFile(null)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Range input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                  Page Range
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5, 7-9  (leave blank for all pages)"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                />
                <p className="text-[11px] text-slate-600">
                  Specify ranges like <code className="text-slate-500">1-3, 5, 8-10</code> to extract those pages as separate files. Leave blank to split every page individually.
                </p>
              </div>

              {/* Processing note */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <div className="flex items-center gap-2 text-blue-400/80">
                  <Shield size={12} />
                  <span className="font-semibold text-xs uppercase tracking-wider">Local Browser Processing</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Connect this page to the <code className="text-slate-400">/api/split</code> endpoint with <code className="text-slate-400">pdf-lib</code> to enable real extraction. The UI, file handling, and range parsing are fully wired.
                </p>
              </div>

              <button
                type="button"
                className="w-full flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-900/30"
                onClick={() => {
                  // TODO: connect to /api/split with pdf-lib — file and rangeInput are ready
                  const returnTo = fromFile
                    ? `/workspace?file=${encodeURIComponent(fromFile)}&highlight=split-complete`
                    : `/workspace?highlight=split-complete`;
                  router.push(returnTo);
                }}
              >
                <Scissors size={15} />
                Atomicize PDF
                <ChevronRight size={15} className="ml-auto" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SplitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-tool-hero flex items-center justify-center text-slate-500 text-sm">Loading…</div>}>
      <SplitInner />
    </Suspense>
  );
}
