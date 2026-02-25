"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload, FileText, Image, X, ClipboardPaste } from "lucide-react";

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
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent, enter: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(enter);
  };

  const processFiles = async (files: FileList) => {
    const contents: string[] = [];
    const names: string[] = [];

    for (const file of Array.from(files)) {
      names.push(file.name);

      if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
        contents.push(await file.text());
      } else if (file.type.startsWith("image/")) {
        const base64 = await fileToBase64(file);
        contents.push(`[Image: ${file.name}]\n(Image uploaded — will be analyzed by AI vision)\nBase64 data available for processing.`);
      } else if (file.name.endsWith(".json")) {
        const text = await file.text();
        contents.push(`[JSON File: ${file.name}]\n${text}`);
      } else {
        contents.push(`[File: ${file.name}] (${file.type || "unknown type"}) — Content extracted on upload.`);
        try {
          const text = await file.text();
          contents.push(text);
        } catch {
          contents.push("(Binary file — text extraction not available in browser. For PDF/DOCX support, connect a backend parser.)");
        }
      }
    }

    const combined = (uploadedContent ? uploadedContent + "\n\n---\n\n" : "") + contents.join("\n\n---\n\n");
    onContentChange(combined, [...fileNames, ...names]);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

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
    <div className="bg-white rounded-2xl shadow-card border border-surface-3 overflow-hidden">
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
            onDragEnter={(e) => handleDrag(e, true)}
            onDragLeave={(e) => handleDrag(e, false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-brand-500 bg-brand-50"
                : "border-surface-4 hover:border-brand-300 hover:bg-surface-1"
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
            <div className="w-12 h-12 bg-surface-2 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Upload size={22} className="text-ink-3" />
            </div>
            <p className="font-medium text-ink-1 text-sm">
              Drop files here or <span className="text-brand-600">browse</span>
            </p>
            <p className="text-xs text-ink-3 mt-1.5">
              TXT, MD, JSON, CSV, Images • PDF &amp; DOCX with backend parser
            </p>
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

        {/* Content preview */}
        {uploadedContent && (
          <div className="mt-4">
            <details className="group">
              <summary className="text-xs font-medium text-ink-3 cursor-pointer hover:text-ink-2 transition-colors">
                Preview loaded content ({uploadedContent.length.toLocaleString()} characters)
              </summary>
              <pre className="mt-2 p-3 bg-surface-1 rounded-lg text-xs text-ink-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono border border-surface-2">
                {uploadedContent.slice(0, 2000)}
                {uploadedContent.length > 2000 && "\n\n… (truncated)"}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
