"use client";

import { useState, useRef, DragEvent } from "react";
import {
  Library,
  Upload,
  ClipboardPaste,
  FileText,
  FileJson,
  X,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import type { GlossaryData } from "@/lib/validateTerminology";

interface LoadedFile {
  name: string;
  chars: number;
  isGlossary: boolean;
}

export default function ContextPanel({
  onContextChange,
  contextText,
  glossaryData,
}: {
  onContextChange: (text: string, glossary: GlossaryData | null) => void;
  contextText: string;
  glossaryData: GlossaryData | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Try to parse a JSON file as a GlossaryData object. */
  function tryParseGlossary(text: string): GlossaryData | null {
    try {
      const parsed = JSON.parse(text);
      if (
        parsed &&
        typeof parsed === "object" &&
        (Array.isArray(parsed.forbidden_terms) ||
          (parsed.preferred_terms && typeof parsed.preferred_terms === "object"))
      ) {
        return parsed as GlossaryData;
      }
    } catch {
      // Not valid JSON or not a glossary — fall through
    }
    return null;
  }

  /** Rebuild the combined context string and glossary from the current file list + new additions. */
  function applyChanges(
    newContextText: string,
    newGlossary: GlossaryData | null,
    newFiles: LoadedFile[]
  ) {
    setLoadedFiles(newFiles);
    onContextChange(newContextText, newGlossary);
  }

  // ─── File processing ──────────────────────────────────────────────────────

  async function processFiles(files: FileList) {
    const existingText = contextText;
    let combinedText = existingText;
    let detectedGlossary: GlossaryData | null = glossaryData;
    const newFiles: LoadedFile[] = [...loadedFiles];

    for (const file of Array.from(files)) {
      // Skip duplicates
      if (newFiles.find((f) => f.name === file.name)) continue;

      let text = "";
      let isGlossary = false;

      if (
        file.type === "text/plain" ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".csv")
      ) {
        text = await file.text();
      } else if (
        file.type === "application/json" ||
        file.name.endsWith(".json")
      ) {
        text = await file.text();
        const parsed = tryParseGlossary(text);
        if (parsed) {
          // Treat as glossary — don't add raw JSON to the context text
          detectedGlossary = parsed;
          isGlossary = true;
          text = ""; // glossary data is passed separately, not as context text
        }
      } else {
        // Try reading as plain text (handles .yaml, .rst, etc.)
        try {
          text = await file.text();
        } catch {
          continue; // Binary file — skip
        }
      }

      newFiles.push({ name: file.name, chars: isGlossary ? 0 : text.length, isGlossary });

      if (!isGlossary && text) {
        combinedText = combinedText
          ? `${combinedText}\n\n---\n\n${text}`
          : text;
      }
    }

    applyChanges(combinedText, detectedGlossary, newFiles);
  }

  // ─── Drag & drop handlers ─────────────────────────────────────────────────

  function handleDrag(e: DragEvent, entering: boolean) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(entering);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }

  // ─── Paste handler ────────────────────────────────────────────────────────

  function handlePasteSubmit() {
    if (!pasteText.trim()) return;
    const combined = contextText
      ? `${contextText}\n\n---\n\n${pasteText}`
      : pasteText;
    const newFile: LoadedFile = {
      name: "Pasted content",
      chars: pasteText.length,
      isGlossary: false,
    };
    applyChanges(combined, glossaryData, [...loadedFiles, newFile]);
    setPasteText("");
  }

  // ─── Clear ────────────────────────────────────────────────────────────────

  function handleClear() {
    setLoadedFiles([]);
    setPasteText("");
    onContextChange("", null);
  }

  // ─── Derived display values ───────────────────────────────────────────────

  const hasContext = contextText.length > 0 || glossaryData !== null;
  const glossaryFile = loadedFiles.find((f) => f.isGlossary);
  const textFiles = loadedFiles.filter((f) => !f.isGlossary);

  const collapsedSummary = hasContext
    ? [
        textFiles.length > 0
          ? `${textFiles.length} doc${textFiles.length > 1 ? "s" : ""}`
          : null,
        glossaryFile ? "glossary" : null,
      ]
        .filter(Boolean)
        .join(" + ") + " loaded"
    : "optional";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl shadow-card border border-surface-3 overflow-hidden">
      {/* Header — always visible, click to collapse/expand */}
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer select-none hover:bg-surface-1 transition-colors"
        onClick={() => setIsOpen((o) => !o)}
        role="button"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Library size={16} className="text-brand-500 shrink-0" />
          <div>
            <h2 className="font-display font-semibold text-ink-0 text-[0.95rem] leading-none">
              Context Documents
            </h2>
            <p
              className={`text-xs mt-0.5 transition-colors ${
                hasContext ? "text-accent-green font-medium" : "text-ink-3"
              }`}
            >
              {collapsedSummary}
            </p>
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-ink-3 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Expandable body */}
      {isOpen && (
        <div className="border-t border-surface-2 p-5">
          {/* Explanation */}
          <p className="text-xs text-ink-3 leading-relaxed mb-4">
            Upload previous docs, your style guide, or a product glossary. The AI
            writes consistently with your existing content and terminology.
            <br />
            <span className="text-ink-4">
              Accepted: .txt, .md, .json (glossary), .yaml, .csv
            </span>
          </p>

          {/* Tab switcher */}
          <div className="flex gap-1.5 mb-4">
            <button
              onClick={(e) => { e.stopPropagation(); setPasteMode(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !pasteMode
                  ? "bg-brand-100 text-brand-700"
                  : "text-ink-3 hover:bg-surface-2"
              }`}
            >
              <Upload size={13} className="inline mr-1 -mt-0.5" />
              Upload
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setPasteMode(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                pasteMode
                  ? "bg-brand-100 text-brand-700"
                  : "text-ink-3 hover:bg-surface-2"
              }`}
            >
              <ClipboardPaste size={13} className="inline mr-1 -mt-0.5" />
              Paste
            </button>
          </div>

          {/* Upload zone */}
          {!pasteMode ? (
            <div
              onDragEnter={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-brand-500 bg-brand-50"
                  : "border-surface-4 hover:border-brand-300 hover:bg-surface-1"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.json,.yaml,.yml,.csv,.rst"
                onChange={(e) => e.target.files && processFiles(e.target.files)}
                className="hidden"
              />
              <div className="w-10 h-10 bg-surface-2 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Upload size={18} className="text-ink-3" />
              </div>
              <p className="font-medium text-ink-1 text-xs">
                Drop files or <span className="text-brand-600">browse</span>
              </p>
              <p className="text-[0.68rem] text-ink-4 mt-1">
                JSON glossary detected automatically
              </p>
            </div>
          ) : (
            /* Paste zone */
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste a previous doc, style guide excerpt, or product terminology…"
                className="w-full h-36 px-3 py-2.5 rounded-xl border border-surface-3 bg-surface-1 text-xs
                           text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2
                           focus:ring-brand-200 focus:border-brand-400 resize-none font-mono transition-all"
              />
              <button
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                className="px-4 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg
                           hover:bg-brand-700 disabled:opacity-40 transition-colors"
              >
                Add as context
              </button>
            </div>
          )}

          {/* Loaded files list */}
          {loadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-2">
                  {loadedFiles.length} context source{loadedFiles.length > 1 ? "s" : ""} loaded
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleClear(); }}
                  className="text-xs text-accent-red hover:underline flex items-center gap-1"
                >
                  <X size={11} />
                  Clear all
                </button>
              </div>

              {loadedFiles.map((file, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                    file.isGlossary
                      ? "bg-green-50 border-green-100"
                      : "bg-surface-1 border-surface-2"
                  }`}
                >
                  {file.isGlossary ? (
                    <FileJson size={13} className="text-accent-green shrink-0" />
                  ) : (
                    <FileText size={13} className="text-brand-500 shrink-0" />
                  )}
                  <span className="text-ink-1 truncate flex-1">{file.name}</span>
                  {file.isGlossary ? (
                    <span className="text-accent-green font-medium shrink-0">glossary</span>
                  ) : (
                    <span className="text-ink-4 shrink-0">
                      {file.chars.toLocaleString()} chars
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Glossary breakdown badge */}
          {glossaryData && (
            <div className="mt-3 px-3 py-2.5 bg-green-50 border border-green-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 size={13} className="text-accent-green shrink-0" />
                <span className="text-xs font-semibold text-accent-green">
                  Glossary active
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {glossaryData.forbidden_terms &&
                  glossaryData.forbidden_terms.length > 0 && (
                    <span className="text-[0.68rem] text-ink-3">
                      {glossaryData.forbidden_terms.length} forbidden term
                      {glossaryData.forbidden_terms.length > 1 ? "s" : ""}
                    </span>
                  )}
                {glossaryData.preferred_terms &&
                  Object.keys(glossaryData.preferred_terms).length > 0 && (
                    <span className="text-[0.68rem] text-ink-3">
                      {Object.keys(glossaryData.preferred_terms).length} preferred
                      replacement
                      {Object.keys(glossaryData.preferred_terms).length > 1 ? "s" : ""}
                    </span>
                  )}
                {glossaryData.approved_terms &&
                  glossaryData.approved_terms.length > 0 && (
                    <span className="text-[0.68rem] text-ink-3">
                      {glossaryData.approved_terms.length} approved term
                      {glossaryData.approved_terms.length > 1 ? "s" : ""}
                    </span>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
