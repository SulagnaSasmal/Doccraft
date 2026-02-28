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
  Github,
  Loader2,
  Link,
} from "lucide-react";
import type { GlossaryData } from "@/lib/validateTerminology";

type TabMode = "upload" | "paste" | "github";

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
  const [tab, setTab] = useState<TabMode>("upload");
  const [pasteText, setPasteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
          detectedGlossary = parsed;
          isGlossary = true;
          text = "";
        }
      } else {
        try {
          text = await file.text();
        } catch {
          continue;
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

  // ─── Drag & drop ──────────────────────────────────────────────────────────

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

  // ─── Paste ────────────────────────────────────────────────────────────────

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

  // ─── GitHub URL fetch ─────────────────────────────────────────────────────

  async function handleGitHubFetch() {
    if (!githubUrl.trim()) return;
    setGithubLoading(true);
    setGithubError("");

    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");

      const combined = contextText
        ? `${contextText}\n\n---\n\n${data.content}`
        : data.content;

      const newFile: LoadedFile = {
        name: data.label,
        chars: data.chars,
        isGlossary: false,
      };

      applyChanges(combined, glossaryData, [...loadedFiles, newFile]);
      setGithubUrl("");
    } catch (err: any) {
      setGithubError(err.message || "Failed to fetch from GitHub");
    } finally {
      setGithubLoading(false);
    }
  }

  // ─── Clear ────────────────────────────────────────────────────────────────

  function handleClear() {
    setLoadedFiles([]);
    setPasteText("");
    setGithubUrl("");
    setGithubError("");
    onContextChange("", null);
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

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

  const TAB_CLASSES = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      active ? "bg-brand-100 text-brand-700" : "text-ink-3 hover:bg-surface-2"
    }`;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-surface-3 overflow-hidden">
      {/* Header */}
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

      {/* Body */}
      {isOpen && (
        <div className="border-t border-surface-2 p-5">
          <p className="text-xs text-ink-3 leading-relaxed mb-4">
            Upload previous docs, your style guide, or a product glossary. The AI
            writes consistently with your existing content and terminology.
            <br />
            <span className="text-ink-4">
              Accepted: .txt, .md, .json (glossary), .yaml, .csv · or paste a GitHub URL
            </span>
          </p>

          {/* Tab switcher */}
          <div className="flex gap-1.5 mb-4">
            <button
              onClick={(e) => { e.stopPropagation(); setTab("upload"); }}
              className={TAB_CLASSES(tab === "upload")}
            >
              <Upload size={13} className="inline mr-1 -mt-0.5" />
              Upload
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setTab("paste"); }}
              className={TAB_CLASSES(tab === "paste")}
            >
              <ClipboardPaste size={13} className="inline mr-1 -mt-0.5" />
              Paste
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setTab("github"); }}
              className={TAB_CLASSES(tab === "github")}
            >
              <Github size={13} className="inline mr-1 -mt-0.5" />
              GitHub URL
            </button>
          </div>

          {/* Upload tab */}
          {tab === "upload" && (
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
          )}

          {/* Paste tab */}
          {tab === "paste" && (
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

          {/* GitHub URL tab */}
          {tab === "github" && (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <p className="text-[0.7rem] text-ink-3 leading-relaxed">
                Paste any public GitHub URL — a repo, a specific file, or a folder.
                DocCraft fetches README, docs files, or OpenAPI specs automatically.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
                  />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      setGithubError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleGitHubFetch()}
                    placeholder="https://github.com/owner/repo"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-surface-3 bg-surface-1 text-xs
                               text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2
                               focus:ring-brand-200 focus:border-brand-400 transition-all"
                  />
                </div>
                <button
                  onClick={handleGitHubFetch}
                  disabled={!githubUrl.trim() || githubLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-medium
                             rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors shrink-0"
                >
                  {githubLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Github size={13} />
                  )}
                  {githubLoading ? "Fetching…" : "Fetch"}
                </button>
              </div>
              {githubError && (
                <p className="text-[0.7rem] text-accent-red">{githubError}</p>
              )}
            </div>
          )}

          {/* Loaded files */}
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

          {/* Glossary breakdown */}
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
                      {Object.keys(glossaryData.preferred_terms).length > 1
                        ? "s"
                        : ""}
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
