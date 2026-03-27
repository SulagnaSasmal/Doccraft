"use client";

import { useState, useRef } from "react";
import { Scissors, Upload, FileText, X, ChevronRight, Download } from "lucide-react";

interface PdfFile {
  name: string;
  size: number;
  file: File;
}

export default function SplitPage() {
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
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <Scissors className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">PDF Atomicizer</h1>
          <p className="text-sm text-slate-500">Split a PDF into individual pages or page ranges</p>
        </div>
      </div>

      {/* Drop zone */}
      {!pdfFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
          }`}
        >
          <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Drop your PDF here</p>
          <p className="text-slate-500 text-sm mt-1">or click to browse</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* File card */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/40">
            <FileText className="w-8 h-8 text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{pdfFile.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(pdfFile.size)}</p>
            </div>
            <button
              onClick={() => setPdfFile(null)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Range input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
              Specify ranges like <code className="text-slate-500">1-3, 5, 8-10</code> to extract those pages as separate files.
            </p>
          </div>

          {/* Action */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-yellow-500/80">
              <Download className="w-4 h-4" />
              <span className="font-medium text-xs uppercase tracking-wider">Processing Note</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Browser-native PDF splitting requires a PDF processing library (e.g. <code>pdf-lib</code>).
              Connect this page to the <code>/api/split</code> endpoint to enable real extraction.
              The UI, file handling, and range parsing are ready.
            </p>
          </div>

          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            onClick={() => alert("Connect to /api/split to process. File and range are ready.")}
          >
            <Scissors className="w-4 h-4" />
            Split PDF
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      )}
    </div>
  );
}
