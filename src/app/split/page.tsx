"use client";

import { Suspense, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Scissors, Upload, FileText, X, ChevronRight, ArrowLeft,
  Shield, Zap, Loader2, CheckCircle2, AlertCircle, Download,
} from "lucide-react";

interface PdfFile {
  name: string;
  size: number;
  file: File;
}

interface SplitResult {
  name: string;
  data: string; // base64
  pages: number;
}

function downloadBase64Pdf(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SplitInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromFile = searchParams.get("from");

  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [rangeInput, setRangeInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<SplitResult[] | null>(null);
  const [apiError, setApiError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.includes("pdf") && !f.name.toLowerCase().endsWith(".pdf")) return;
    setPdfFile({ name: f.name, size: f.size, file: f });
    setRangeInput("");
    setResults(null);
    setApiError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const formatBytes = (b: number) =>
    b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.round(b / 1000)} KB`;

  const handleAtomicize = async () => {
    if (!pdfFile) return;
    setProcessing(true);
    setApiError("");
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile.file);
      formData.append("ranges", rangeInput.trim());

      const res = await fetch("/api/split", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error ?? "Split failed. Please try again.");
        return;
      }

      const files: SplitResult[] = data.files;
      setResults(files);

      // Auto-download all split files
      files.forEach((f) => downloadBase64Pdf(f.data, f.name));

      // Redirect back to workspace with success highlight after a moment
      const returnTo = fromFile
        ? `/workspace?file=${encodeURIComponent(fromFile)}&highlight=split-complete`
        : `/workspace?highlight=split-complete`;

      setTimeout(() => router.push(returnTo), 1200);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Network error — please try again.");
    } finally {
      setProcessing(false);
    }
  };

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
                  { icon: Zap, title: "Instant split", desc: "pdf-lib — runs in seconds" },
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
                  onClick={() => { setPdfFile(null); setResults(null); setApiError(""); }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  disabled={processing}
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
                  disabled={processing}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-600">
                  Specify ranges like <code className="text-slate-500">1-3, 5, 8-10</code> to extract those pages as separate files. Leave blank to split every page individually.
                </p>
              </div>

              {/* Error */}
              {apiError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-800/50 bg-red-950/30">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{apiError}</p>
                </div>
              )}

              {/* Success */}
              {results && (
                <div className="p-4 rounded-xl border border-emerald-700/40 bg-emerald-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-semibold">
                      {results.length} file{results.length > 1 ? "s" : ""} downloaded — redirecting to workspace…
                    </span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {results.slice(0, 6).map((r) => (
                      <div key={r.name} className="flex items-center gap-2">
                        <Download size={10} className="text-emerald-500 shrink-0" />
                        <span className="text-[11px] text-emerald-300/80 truncate">{r.name}</span>
                        <span className="text-[10px] text-emerald-600 ml-auto shrink-0">{r.pages}p</span>
                      </div>
                    ))}
                    {results.length > 6 && (
                      <p className="text-[10px] text-emerald-600">+{results.length - 6} more files</p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                className="w-full flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-900/30"
                onClick={handleAtomicize}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Splitting PDF…
                  </>
                ) : (
                  <>
                    <Scissors size={15} />
                    Atomicize PDF
                    <ChevronRight size={15} className="ml-auto" />
                  </>
                )}
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
