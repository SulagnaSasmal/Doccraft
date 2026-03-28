"use client";

import { useState, useRef } from "react";
import { ScanText, Upload, ImageIcon, X, FileText, ChevronRight, ArrowLeft, Shield, Zap } from "lucide-react";

interface ImageFile {
  id: string;
  name: string;
  size: number;
  preview: string;
  file: File;
}

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/tiff", "application/pdf"];

export default function OcrPage() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList) => {
    Array.from(incoming)
      .filter((f) => ACCEPTED.includes(f.type))
      .forEach((f) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              name: f.name,
              size: f.size,
              preview: f.type.startsWith("image/") ? (e.target?.result as string) : "",
              file: f,
            },
          ]);
        };
        reader.readAsDataURL(f);
      });
  };

  const remove = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));
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
          <div className="w-6 h-6 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
            <ScanText size={11} className="text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-slate-300">OCR Ingestion</span>
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
                <div className="w-14 h-14 rounded-2xl bg-emerald-600/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
                  <ScanText size={22} className="text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-100 mb-2">OCR Ingestion</h1>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Extract clean, structured text from scanned documents, images, and image-based PDFs. Extracted text flows directly into the Doc Generator as source material.
                </p>
              </div>

              {/* Supported formats */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {["PNG", "JPG", "WEBP", "TIFF", "Scanned PDF"].map((fmt) => (
                  <span key={fmt} className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-400 font-mono">
                    {fmt}
                  </span>
                ))}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  dragging
                    ? "border-emerald-500 bg-emerald-600/10 scale-[1.01]"
                    : "border-slate-700 hover:border-emerald-500/40 hover:bg-slate-800/20"
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-all ${dragging ? "bg-emerald-600/20 border-emerald-500/40" : "bg-slate-800 border-slate-700"}`}>
                  <Upload size={18} className={dragging ? "text-emerald-400" : "text-slate-500"} />
                </div>
                <p className="text-slate-200 font-semibold mb-1">Drop images or scanned PDFs</p>
                <p className="text-slate-500 text-sm">Multiple files supported</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  title="Select images or PDFs for OCR"
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                />
              </div>

              {/* Feature hints */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  { icon: ScanText, title: "High-accuracy OCR", desc: "Tesseract or Google Vision" },
                  { icon: Zap, title: "Feeds Doc Generator", desc: "Extracted text as source material" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                    <item.icon size={13} className="text-emerald-400 mt-0.5 shrink-0" />
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
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                    <ScanText size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-100">OCR Ingestion</h1>
                    <p className="text-xs text-slate-500">{files.length} file{files.length > 1 ? "s" : ""} queued for extraction</p>
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
                  accept="image/*,.pdf"
                  multiple
                  title="Add more files"
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                />
              </div>

              {/* Preview grid */}
              <div className="grid grid-cols-2 gap-3">
                {files.map((f) => (
                  <div key={f.id} className="relative rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden group">
                    {f.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.preview} alt={f.name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 flex items-center justify-center bg-slate-900/50">
                        <FileText size={24} className="text-slate-600" />
                      </div>
                    )}
                    <div className="px-3 py-2">
                      <p className="text-xs text-slate-300 truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-600">{formatBytes(f.size)}</p>
                    </div>
                    <button
                      type="button"
                      title="Remove"
                      onClick={() => remove(f.id)}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Processing note */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400/80">
                  <ImageIcon size={12} />
                  <span className="font-semibold text-xs uppercase tracking-wider">OCR Engine</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Connect to <code className="text-slate-400">/api/ocr</code> using <code className="text-slate-400">Tesseract.js</code> (browser) or Google Vision / AWS Textract. Extracted text will be forwarded to the Doc Generator as source material.
                </p>
              </div>

              <button
                type="button"
                className="w-full flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/30"
                onClick={() => alert(`Connect to /api/ocr to process ${files.length} file(s).`)}
              >
                <ScanText size={15} />
                Extract Text from {files.length} File{files.length > 1 ? "s" : ""}
                <ChevronRight size={15} className="ml-auto" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
