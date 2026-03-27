"use client";

import { useState, useRef } from "react";
import { Layers, Upload, FileText, X, GripVertical, ChevronRight, Download } from "lucide-react";

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
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
          <Layers className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Structure Merge</h1>
          <p className="text-sm text-slate-500">Combine multiple PDFs into a single document</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragging
            ? "border-purple-500 bg-purple-500/10"
            : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
        }`}
      >
        <Upload className="w-7 h-7 text-slate-500 mx-auto mb-2" />
        <p className="text-slate-300 font-medium text-sm">Drop PDFs here to add them</p>
        <p className="text-slate-600 text-xs mt-1">Multiple files supported — drag to reorder after adding</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Merge Order — {files.length} file{files.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/40 group"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(i, i - 1)}
                    className="text-slate-700 hover:text-slate-400 transition-colors text-[10px] leading-none"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <GripVertical className="w-3.5 h-3.5 text-slate-700" />
                  <button
                    onClick={() => move(i, i + 1)}
                    className="text-slate-700 hover:text-slate-400 transition-colors text-[10px] leading-none"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>
                <span className="text-xs font-mono text-slate-600 w-5 text-center">{i + 1}</span>
                <FileText className="w-5 h-5 text-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{f.name}</p>
                  <p className="text-xs text-slate-600">{formatBytes(f.size)}</p>
                </div>
                <button
                  onClick={() => remove(f.id)}
                  className="text-slate-600 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-yellow-500/80">
              <Download className="w-4 h-4" />
              <span className="font-medium text-xs uppercase tracking-wider">Processing Note</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Connect to <code>/api/merge</code> with <code>pdf-lib</code> to perform the merge.
              File order, upload handling, and UI are fully ready.
            </p>
          </div>

          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            onClick={() => alert(`Connect to /api/merge to process ${files.length} files.`)}
          >
            <Layers className="w-4 h-4" />
            Merge {files.length} PDF{files.length > 1 ? "s" : ""}
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      )}
    </div>
  );
}
