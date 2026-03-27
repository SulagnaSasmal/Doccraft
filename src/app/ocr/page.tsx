"use client";

import { useState, useRef } from "react";
import { ScanText, Upload, ImageIcon, X, FileText, ChevronRight } from "lucide-react";

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
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
          <ScanText className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">OCR Ingestion</h1>
          <p className="text-sm text-slate-500">Extract text from images and scanned PDFs</p>
        </div>
      </div>

      {/* Supported formats */}
      <div className="flex flex-wrap gap-2">
        {["PNG", "JPG", "WEBP", "TIFF", "Scanned PDF"].map((fmt) => (
          <span
            key={fmt}
            className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-400 font-mono"
          >
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
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragging
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
        }`}
      >
        <Upload className="w-7 h-7 text-slate-500 mx-auto mb-2" />
        <p className="text-slate-300 font-medium text-sm">Drop images or scanned PDFs</p>
        <p className="text-slate-600 text-xs mt-1">Extracted text loads into the Doc Generator</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
        />
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {files.length} file{files.length > 1 ? "s" : ""} queued
          </p>

          <div className="grid grid-cols-2 gap-3">
            {files.map((f) => (
              <div key={f.id} className="relative rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden group">
                {f.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt={f.name} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center bg-slate-900/50">
                    <FileText className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                <div className="px-3 py-2">
                  <p className="text-xs text-slate-300 truncate">{f.name}</p>
                  <p className="text-[10px] text-slate-600">{formatBytes(f.size)}</p>
                </div>
                <button
                  onClick={() => remove(f.id)}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
            <div className="flex items-center gap-2 text-emerald-500/80">
              <ImageIcon className="w-4 h-4" />
              <span className="font-medium text-xs uppercase tracking-wider">OCR Engine</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Connect to <code>/api/ocr</code> using <code>Tesseract.js</code> (browser) or Google Vision / AWS Textract for high-accuracy extraction.
              Extracted text will be forwarded to the Doc Generator as source material.
            </p>
          </div>

          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
            onClick={() => alert(`Connect to /api/ocr to process ${files.length} file(s).`)}
          >
            <ScanText className="w-4 h-4" />
            Extract Text
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      )}
    </div>
  );
}
