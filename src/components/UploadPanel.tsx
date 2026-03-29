"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload, FileText, Image, X, ClipboardPaste, Code, Table, FileJson, FileImage } from "lucide-react";

const FILE_TYPE_HINTS: Record<string, { label: string; desc: string; Icon: typeof FileText }> = {
  md: { label: "Markdown", desc: "Parse headings & structure", Icon: FileText },
  txt: { label: "Plain Text", desc: "Extract raw content", Icon: FileText },
  csv: { label: "CSV Data", desc: "Tabular data → docs", Icon: Table },
  json: { label: "JSON", desc: "Structured data → docs", Icon: FileJson },
  png: { label: "Image", desc: "OCR + AI vision analysis", Icon: FileImage },
  jpg: { label: "Image", desc: "OCR + AI vision analysis", Icon: FileImage },
  jpeg: { label: "Image", desc: "OCR + AI vision analysis", Icon: FileImage },
  gif: { label: "Image", desc: "AI vision analysis", Icon: FileImage },
  webp: { label: "Image", desc: "AI vision analysis", Icon: FileImage },
  pdf: { label: "PDF", desc: "Extract text & structure", Icon: FileText },
  docx: { label: "Word Doc", desc: "Parse document content", Icon: FileText },
};

export default function UploadPanel({
  onContentChange,
  uploadedContent,
  fileNames,
}: {
  onContentChange: (content: string, names: string[]) => void;
  uploadedContent: string;
  fileNames: string[];
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragFileTypes, setDragFileTypes] = useState<string[]>([]);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingName, setProcessingName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent, enter: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(enter);
    if (enter && e.dataTransfer.items) {
      const extensions: string[] = [];
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind === "file") {
          const type = item.type;
          if (type.startsWith("image/")) extensions.push(type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1]);
          else if (type === "text/plain") extensions.push("txt");
          else if (type === "text/csv") extensions.push("csv");
          else if (type === "application/json") extensions.push("json");
          else if (type === "application/pdf") extensions.push("pdf");
          else if (type.includes("word") || type.includes("document")) extensions.push("docx");
          else if (type === "text/markdown") extensions.push("md");
        }
      }
      setDragFileTypes(Array.from(new Set(extensions)));
    }
    if (!enter) setDragFileTypes([]);
  };

  const processFiles = async (files: FileList) => {
    const contents: string[] = [];
    const names: string[] = [];
    setIsProcessing(true);

    for (const file of Array.from(files)) {
      names.push(file.name);
      setProcessingName(file.name);

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImage = file.type.startsWith("image/");
      const isDocx =
        file.type.includes("word") ||
        file.type.includes("officedocument") ||
        file.name.toLowerCase().endsWith(".docx") ||
        file.name.toLowerCase().endsWith(".doc");

      if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
        contents.push(await file.text());
      } else if (file.name.endsWith(".json")) {
        contents.push(`[JSON File: ${file.name}]\n${await file.text()}`);
      } else if (isPdf || isImage) {
        // Route through /api/ocr — server-side PDF parser + OpenAI Vision for images
        try {
          const fd = new FormData();
          fd.append("files", file);
          const res = await fetch("/api/ocr", { method: "POST", body: fd });
          const data = await res.json();
          if (data.combined && data.combined.trim().length > 10) {
            contents.push(data.combined.trim());
          } else if (data.results?.[0]?.error) {
            contents.push(`[${file.name}] — ${data.results[0].error}`);
          } else {
            contents.push(`[${file.name}] — No readable text found. Try copy-pasting the content instead.`);
          }
        } catch {
          contents.push(`[${file.name}] — Extraction failed. Try copy-pasting the content instead.`);
        }
      } else if (isDocx) {
        // Route through /api/docx — mammoth-based parser, handles track changes
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/docx", { method: "POST", body: fd });
          const data = await res.json();
          if (data.text && data.text.trim().length > 10) {
            const header = data.hasTrackedChanges
              ? `[${file.name}] (Track Changes detected — accepted insertions included, deletions appended)\n\n`
              : `[${file.name}]\n\n`;
            contents.push(header + data.text.trim());
          } else if (data.error) {
            contents.push(`[${file.name}] — ${data.error} Try copy-pasting content using the Paste tab.`);
          } else {
            contents.push(`[${file.name}] — No text found. Try copy-pasting content using the Paste tab.`);
          }
        } catch {
          contents.push(`[${file.name}] — DOCX extraction failed. Try copy-pasting content using the Paste tab.`);
        }
      } else {
        contents.push(`[${file.name}] — Unsupported format. Try copy-pasting the content using the Paste tab.`);
      }
    }

    const combined = (uploadedContent ? uploadedContent + "\n\n---\n\n" : "") + contents.join("\n\n---\n\n");
    onContentChange(combined, [...fileNames, ...names]);
    setIsProcessing(false);
    setProcessingName("");
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    const combined = uploadedContent ? uploadedContent + "\n\n---\n\n" + pasteText : pasteText;
    onContentChange(combined, [...fileNames, "Pasted content"]);
    setPasteText("");
    setPasteMode(false);
  };

  const handleClear = () => {
    onContentChange("", []);
    setPasteText("");
  };

  return (
    <div className="bg-surface-0 rounded-2xl shadow-card border border-surface-3 overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-2 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-ink-0 text-[0.95rem]">Source Material</h2>
          <p className="text-xs text-ink-3 mt-0.5">Upload files or paste raw content</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPasteMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !pasteMode ? "bg-brand-100 text-brand-700" : "text-ink-3 hover:bg-surface-2"
            }`}
          >
            <Upload size={13} className="inline mr-1 -mt-0.5" />
            Upload
          </button>
          <button
            onClick={() => setPasteMode(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pasteMode ? "bg-brand-100 text-brand-700" : "text-ink-3 hover:bg-surface-2"
            }`}
          >
            <ClipboardPaste size={13} className="inline mr-1 -mt-0.5" />
            Paste
          </button>
        </div>
      </div>

      <div className="p-5">
        {!pasteMode ? (
          <div
            onDragEnter={(e) => !isProcessing && handleDrag(e, true)}
            onDragLeave={(e) => handleDrag(e, false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => !isProcessing && handleDrop(e)}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              isProcessing
                ? "border-surface-3 bg-surface-1 cursor-wait"
                : isDragging
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 drop-zone-active cursor-pointer"
                : "border-surface-4 hover:border-brand-300 hover:bg-surface-1 cursor-pointer"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.gif,.webp"
              onChange={(e) => e.target.files && processFiles(e.target.files)}
              className="hidden"
            />

            {/* Processing state */}
            {isProcessing ? (
              <div className="animate-fade-in-up">
                <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/40 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={22} className="text-brand-600 animate-bounce" />
                </div>
                <p className="font-medium text-ink-1 text-sm">Extracting text…</p>
                <p className="text-xs text-ink-3 mt-1 truncate max-w-[200px] mx-auto">{processingName}</p>
              </div>
            ) : isDragging && dragFileTypes.length > 0 ? (
              <div className="animate-fade-in-up">
                <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/40 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={22} className="text-brand-600" />
                </div>
                <p className="font-semibold text-brand-700 dark:text-brand-300 text-sm mb-3">Drop to process</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {dragFileTypes.map((ext) => {
                    const hint = FILE_TYPE_HINTS[ext];
                    if (!hint) return null;
                    const HintIcon = hint.Icon;
                    return (
                      <span key={ext} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-0 dark:bg-surface-2 rounded-lg border border-brand-200 dark:border-surface-4 text-xs shadow-sm">
                        <HintIcon size={12} className="text-brand-500" />
                        <span className="font-medium text-ink-0">{hint.label}</span>
                        <span className="text-ink-3">→ {hint.desc}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : isDragging ? (
              <div className="animate-fade-in-up">
                <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/40 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={22} className="text-brand-600" />
                </div>
                <p className="font-semibold text-brand-700 dark:text-brand-300 text-sm">Drop files here</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-surface-2 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={22} className="text-ink-3" />
                </div>
                <p className="font-medium text-ink-1 text-sm">
                  Drop files here or <span className="text-brand-600">browse</span>
                </p>
                <p className="text-xs text-ink-3 mt-1.5">
                  TXT, MD, JSON, CSV, Images • PDF &amp; DOCX with backend parser
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your raw content here — meeting notes, specs, feature descriptions, API details, anything…"
              className="w-full h-48 px-4 py-3 rounded-xl border border-surface-3 bg-surface-1 text-sm
                         text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-brand-200
                         focus:border-brand-400 resize-none font-mono transition-all"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg
                         hover:bg-brand-700 disabled:opacity-40 transition-colors"
            >
              Add Content
            </button>
          </div>
        )}

        {/* Uploaded files list */}
        {fileNames.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-2">
                {fileNames.length} source{fileNames.length > 1 ? "s" : ""} loaded
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-accent-red hover:underline flex items-center gap-1"
              >
                <X size={12} />
                Clear all
              </button>
            </div>
            {fileNames.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 bg-surface-1 rounded-lg border border-surface-2"
              >
                {name.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                  <Image size={14} className="text-brand-500 shrink-0" />
                ) : (
                  <FileText size={14} className="text-brand-500 shrink-0" />
                )}
                <span className="text-xs text-ink-1 truncate">{name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Content preview — auto-expanded so users see extracted text immediately */}
        {uploadedContent && (
          <div className="mt-4">
            <p className="text-xs font-medium text-ink-3 mb-2">
              Extracted content <span className="text-ink-4">({uploadedContent.length.toLocaleString()} characters)</span>
            </p>
            <pre className="p-3 bg-surface-1 rounded-lg text-xs text-ink-2 max-h-52 overflow-auto whitespace-pre-wrap font-mono border border-surface-2">
              {uploadedContent.slice(0, 3000)}
              {uploadedContent.length > 3000 && "\n\n… (truncated — full content sent to AI)"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
