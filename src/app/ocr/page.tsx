"use client";

import { Suspense, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ScanText, Upload, ImageIcon, X, FileText,
  ChevronRight, ArrowLeft, Shield, Zap,
  Loader2, CheckCircle2, AlertCircle, Copy, Sparkles,
} from "lucide-react";

interface QueuedFile {
  id: string;
  name: string;
  size: number;
  preview: string;
  file: File;
}

interface OcrFileResult {
  name: string;
  text: string;
  error?: string;
}

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/tiff", "application/pdf"];

function OcrInner() {
  const router = useRouter();

  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<OcrFileResult[] | null>(null);
  const [combined, setCombined] = useState("");
  const [apiError, setApiError] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList) => {
    Array.from(incoming)
      .filter((f) => ACCEPTED.includes(f.type) || f.name.toLowerCase().endsWith(".pdf"))
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
    setResults(null);
    setApiError("");
    setCombined("");
  };

  const remove = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const formatBytes = (b: number) =>
    b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.round(b / 1000)} KB`;

  const handleExtract = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setApiError("");
    setResults(null);
    setCombined("");

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f.file));

      const res = await fetch("/api/ocr", { method: "POST", body: formData });

      let data: { error?: string; results?: OcrFileResult[]; combined?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Server returned a non-JSON body (e.g. 413 Entity Too Large)
        const msg = res.status === 413
          ? "File too large — Vercel's request limit is 4.5 MB. Try a smaller file or split it first."
          : `Server error (${res.status}). Please try again.`;
        setApiError(msg);
        return;
      }

      if (!res.ok) {
        setApiError(data.error ?? "OCR failed. Please try again.");
        return;
      }

      setResults(data.results ?? []);
      setCombined(data.combined ?? "");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Network error — please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(combined).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendToGenerator = () => {
    if (!combined.trim()) return;
    sessionStorage.setItem("doccraft_ocr_text", combined.trim());
    sessionStorage.setItem(
      "doccraft_ocr_files",
      JSON.stringify(files.map((f) => f.name))
    );
    router.push("/");
  };

  const hasResults = results !== null;
  const successCount = results?.filter((r) => r.text).length ?? 0;
  const errorCount = results?.filter((r) => r.error).length ?? 0;

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
          <span className="text-[0.65rem] font-medium text-emerald-300">Powered by GPT-4o Vision</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl">

          {files.length === 0 && !hasResults ? (
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
                  { icon: ScanText, title: "GPT-4o Vision OCR", desc: "High-accuracy AI text extraction" },
                  { icon: Zap, title: "Feeds Doc Generator", desc: "One click to source material" },
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
          ) : !hasResults ? (
            /* ── Files queued, ready to extract ── */
            <div className="space-y-5 animate-fade-in-up">
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
                  disabled={processing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-50"
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
                      disabled={processing}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:pointer-events-none"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Error */}
              {apiError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-800/50 bg-red-950/30">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{apiError}</p>
                </div>
              )}

              <button
                type="button"
                className="w-full flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/30"
                onClick={handleExtract}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Extracting text…
                  </>
                ) : (
                  <>
                    <ScanText size={15} />
                    Extract Text from {files.length} File{files.length > 1 ? "s" : ""}
                    <ChevronRight size={15} className="ml-auto" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* ── Results panel ── */
            <div className="space-y-5 animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-100">Extraction Complete</h1>
                  <p className="text-xs text-slate-500">
                    {successCount} succeeded{errorCount > 0 ? `, ${errorCount} failed` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setResults(null); setCombined(""); setFiles([]); setApiError(""); }}
                  className="ml-auto text-slate-500 hover:text-slate-300 transition-colors text-xs border border-slate-700 rounded-lg px-2.5 py-1"
                >
                  Start over
                </button>
              </div>

              {/* Per-file results */}
              {results && results.length > 0 && (
                <div className="space-y-2">
                  {results.map((r) => (
                    <div
                      key={r.name}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                        r.error
                          ? "border-red-800/40 bg-red-950/20"
                          : "border-emerald-800/30 bg-emerald-950/20"
                      }`}
                    >
                      {r.error ? (
                        <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">{r.name}</p>
                        {r.error ? (
                          <p className="text-[10px] text-red-400 mt-0.5">{r.error}</p>
                        ) : (
                          <p className="text-[10px] text-emerald-500 mt-0.5">
                            {r.text.length} characters extracted
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Extracted text preview */}
              {combined && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Extracted Text
                    </label>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <Copy size={10} />
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      readOnly
                      title="Extracted text output"
                      value={combined}
                      className="w-full h-48 bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono resize-none focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Error (API-level) */}
              {apiError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-800/50 bg-red-950/30">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{apiError}</p>
                </div>
              )}

              {combined && (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-900/30"
                  onClick={handleSendToGenerator}
                >
                  <Sparkles size={15} />
                  Use in Doc Generator
                  <span className="ml-auto text-[10px] font-normal opacity-70 flex items-center gap-1">
                    <ImageIcon size={9} />
                    text pre-loaded
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OcrPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-tool-hero flex items-center justify-center text-slate-500 text-sm">Loading…</div>}>
      <OcrInner />
    </Suspense>
  );
}
