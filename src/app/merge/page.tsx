"use client";

import { useState, useRef } from "react";
import { Layers, Upload, FileText, X, GripVertical, ChevronRight, ArrowLeft, Shield, Zap } from "lucide-react";

interface PdfFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

export default function MergePage() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList) => {
    const pdfs: PdfFile[] = Array.from(incoming)
      .filter((f) => f.type.includes("pdf"))
      .map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, file: f }));
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const remove = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const next = [...files];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setFiles(next);
  };

  const formatBytes = (b: number) =>
    b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.round(b / 1000)} KB`;

  return (
    <div className="min-h-screen flex flex-col bg-tool-hero">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800/60">
        <a href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm">
          <ArrowLeft size={14} />
          DocCraft
        </a>
        <span className="text-slate-700">/</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Layers size={11} className="text-purple-400" />
          </div>
          <span className="text-sm font-semibold text-slate-300">Document Assembler</span>
        </div>
        <div className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600/10 border border-emerald-500/20">
          <Shield size={10} className="text-emerald-400" />
          <span className="text-[0.65rem] font-medium text-emerald-300">Local Processing — No Upload to Servers</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl">

          {files.length === 0 ? (
            <>
              {/* Hero empty state */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-purple-600/15 border border-purple-500/25 flex items-center justify-center mx-auto mb-5">
                  <Layers size={22} className="text-purple-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Document Assembler</h1>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Combine multiple PDFs into a single structured document. Drag to reorder pages before assembly — what you see is what you get.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  dragging
                    ? "border-purple-500 bg-purple-600/10 scale-[1.01]"
                    : "border-slate-700 hover:border-purple-500/40 hover:bg-slate-800/20"
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-all ${dragging ? "bg-purple-600/20 border-purple-500/40" : "bg-slate-800 border-slate-700"}`}>
                  <Upload size={18} className={dragging ? "text-purple-400" : "text-slate-500"} />
                </div>
                <p className="text-slate-200 font-semibold mb-1">Drop PDFs here to add them</p>
                <p className="text-slate-500 text-sm">Multiple files supported</p>
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[0.65rem] font-mono text-slate-500">PDF</span>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  title="Select PDFs to merge"
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                />
              </div>

              {/* Feature hints */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  { icon: GripVertical, title: "Drag to reorder", desc: "Set page sequence before merge" },
                  { icon: Zap, title: "Instant assembly", desc: "No server upload needed" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                    <item.icon size={13} className="text-purple-400 mt-0.5 shrink-0" />
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                    <Layers size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-100">Document Assembler</h1>
                    <p className="text-xs text-slate-500">{files.length} file{files.length > 1 ? "s" : ""} — drag to reorder</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                  <Upload size={11} />
                  Add more
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  title="Add more PDFs"
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                />
              </div>

              {/* Merge order list */}
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/40 group"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(i, i - 1)}
                        className="text-slate-700 hover:text-slate-400 transition-colors text-[10px] leading-none"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <GripVertical className="w-3.5 h-3.5 text-slate-700" />
                      <button
                        type="button"
                        onClick={() => move(i, i + 1)}
                        className="text-slate-700 hover:text-slate-400 transition-colors text-[10px] leading-none"
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="text-xs font-mono text-slate-600 w-5 text-center">{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-600/15 border border-purple-500/25 flex items-center justify-center shrink-0">
                      <FileText size={13} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{f.name}</p>
                      <p className="text-xs text-slate-600">{formatBytes(f.size)}</p>
                    </div>
                    <button
                      type="button"
                      title="Remove"
                      onClick={() => remove(f.id)}
                      className="text-slate-600 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Processing note */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <div className="flex items-center gap-2 text-purple-400/80">
                  <Shield size={12} />
                  <span className="font-semibold text-xs uppercase tracking-wider">Local Browser Processing</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Connect to <code className="text-slate-400">/api/merge</code> with <code className="text-slate-400">pdf-lib</code> to perform the merge. File order, upload handling, and UI are fully wired.
                </p>
              </div>

              <button
                type="button"
                className="w-full flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-purple-900/30"
                onClick={() => alert(`Connect to /api/merge to process ${files.length} files.`)}
              >
                <Layers size={15} />
                Assemble {files.length} PDF{files.length > 1 ? "s" : ""}
                <ChevronRight size={15} className="ml-auto" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
