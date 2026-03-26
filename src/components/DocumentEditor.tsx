"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Download,
  FileText,
  Code2,
  Wand2,
  Minimize2,
  Maximize2,
  BookOpen,
  AlignLeft,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import type { DocConfig } from "@/app/page";
import LintingPanel from "@/components/LintingPanel";

const AI_ACTIONS = [
  { key: "simplify", label: "Simplify", icon: Minimize2, desc: "Simpler language" },
  { key: "expand", label: "Expand", icon: Maximize2, desc: "Add more detail" },
  { key: "example", label: "Add Example", icon: BookOpen, desc: "Add practical example" },
  { key: "troubleshoot", label: "Troubleshoot", icon: AlignLeft, desc: "Add troubleshooting" },
  { key: "concise", label: "Make Concise", icon: Code2, desc: "Remove fluff" },
];

const INLINE_ACTIONS = [
  { key: "simplify", label: "Simplify", icon: Minimize2 },
  { key: "expand", label: "Expand", icon: Maximize2 },
  { key: "concise", label: "Make Concise", icon: Code2 },
  { key: "example", label: "Add Example", icon: BookOpen },
];

export default function DocumentEditor({
  content,
  onChange,
  onRefine,
  config,
  docType,
}: {
  content: string;
  onChange: (c: string) => void;
  onRefine: (text: string, action: string) => Promise<string>;
  config: DocConfig;
  docType: string;
}) {
  const [view, setView] = useState<"split" | "edit" | "preview">("split");
  const [refining, setRefining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inlineToolbar, setInlineToolbar] = useState<{
    x: number;
    y: number;
    start: number;
    end: number;
  } | null>(null);
  const [inlineLoading, setInlineLoading] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const getSelectedText = (): { text: string; start: number; end: number } | null => {
    const el = textareaRef.current;
    if (!el) return null;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return null;
    return { text: content.slice(start, end), start, end };
  };

  // Show inline toolbar on text selection in textarea
  const handleTextareaMouseUp = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) {
      setInlineToolbar(null);
      return;
    }
    // Get position of textarea relative to viewport
    const rect = el.getBoundingClientRect();
    // Approximate position: use selection start to estimate row/col
    const textBefore = content.slice(0, start);
    const lines = textBefore.split("\n");
    const lineIndex = lines.length - 1;
    const lineHeight = 22;
    const charWidth = 8;
    const col = lines[lineIndex]?.length || 0;

    const x = Math.min(rect.left + col * charWidth + 16, rect.right - 200);
    const y = rect.top + (lineIndex * lineHeight) - el.scrollTop - 48;

    setInlineToolbar({ x: Math.max(rect.left, x), y: Math.max(rect.top - 52, y), start, end });
  }, [content]);

  // Hide inline toolbar when clicking elsewhere
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const el = textareaRef.current;
      if (el && !el.contains(e.target as Node)) {
        // Small delay to allow toolbar buttons to register clicks
        setTimeout(() => {
          const sel = el.selectionStart === el.selectionEnd;
          if (sel) setInlineToolbar(null);
        }, 200);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInlineAction = async (actionKey: string) => {
    if (!inlineToolbar) return;
    const { start, end } = inlineToolbar;
    const text = content.slice(start, end);
    if (!text.trim()) return;

    setInlineLoading(actionKey);
    try {
      const refined = await onRefine(text, actionKey);
      const newContent = content.slice(0, start) + refined + content.slice(end);
      onChange(newContent);
      setInlineToolbar(null);
    } catch {
      // Silent fail
    } finally {
      setInlineLoading(null);
    }
  };

  const handleAIAction = async (actionKey: string) => {
    const selection = getSelectedText();
    const textToRefine = selection?.text || content;

    setRefining(true);
    try {
      const refined = await onRefine(textToRefine, actionKey);
      if (selection) {
        const newContent =
          content.slice(0, selection.start) + refined + content.slice(selection.end);
        onChange(newContent);
      } else {
        onChange(refined);
      }
    } catch {
      // Error handled silently; content unchanged
    } finally {
      setRefining(false);
    }
  };

  const exportHTML = () => {
    // Extract document title from first H1
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const docTitle = titleMatch ? titleMatch[1].trim() : "Documentation";
    const safeTitle = docTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase();
    const generationDate = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    // Build ToC from headings
    const headings: { level: number; text: string; id: string }[] = [];
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    let hm: RegExpExecArray | null;
    while ((hm = headingRegex.exec(content)) !== null) {
      const text = hm[2].trim();
      const id = text.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
      headings.push({ level: hm[1].length, text, id });
    }

    const tocHTML = headings.length > 1
      ? `<nav class="toc">
  <h2>Table of Contents</h2>
  <ul>${headings.map((h) =>
    `\n    <li class="toc-${h.level}"><a href="#${h.id}">${h.text}</a></li>`
  ).join("")}
  </ul>
</nav>`
      : "";

    // Convert markdown to HTML with heading IDs for ToC links
    const bodyHTML = markdownToStyledHTML(content, headings);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${docTitle}</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 16px; line-height: 1.6; color: #1a1a2e;
    max-width: 800px; margin: 0 auto; padding: 2rem;
    background: #ffffff;
  }
  /* Header */
  .doc-header {
    border-bottom: 2px solid #4c6ef5;
    padding-bottom: 1.5rem;
    margin-bottom: 2rem;
  }
  .doc-header h1 {
    font-size: 2.25rem; font-weight: 800; color: #0f1729;
    margin: 0 0 0.5rem 0; letter-spacing: -0.02em;
  }
  .doc-header .meta {
    font-size: 0.85rem; color: #8494b2;
  }
  /* Table of Contents */
  .toc {
    background: #f8f9fc; border: 1px solid #e8ecf4; border-radius: 8px;
    padding: 1.25rem 1.5rem; margin-bottom: 2.5rem;
  }
  .toc h2 {
    font-size: 0.9rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: #556889; margin-bottom: 0.75rem;
    border: none; padding: 0;
  }
  .toc ul { list-style: none; padding: 0; margin: 0; }
  .toc li { margin-bottom: 0.35rem; }
  .toc a {
    color: #4c6ef5; text-decoration: none; font-size: 0.9rem;
  }
  .toc a:hover { text-decoration: underline; }
  .toc .toc-2 { padding-left: 1rem; }
  .toc .toc-3 { padding-left: 2rem; font-size: 0.85rem; }
  /* Body Content */
  h1 { font-size: 2rem; font-weight: 700; margin: 2.5rem 0 1rem; color: #0f1729; }
  h2 {
    font-size: 1.5rem; font-weight: 600; margin: 2rem 0 0.75rem; color: #0f1729;
    padding-bottom: 0.5rem; border-bottom: 2px solid #e8ecf4;
  }
  h3 { font-size: 1.15rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: #2b3a5c; }
  p { margin-bottom: 1rem; }
  ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
  li { margin-bottom: 0.375rem; line-height: 1.65; }
  code {
    background: #f1f3f9; padding: 0.15rem 0.4rem; border-radius: 4px;
    font-size: 0.85em; font-family: 'Cascadia Code', 'Consolas', monospace;
  }
  pre {
    background: #0f1729; color: #dbe4ff; padding: 1rem 1.25rem;
    border-radius: 8px; margin-bottom: 1rem; overflow-x: auto;
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 0.85rem; }
  blockquote {
    border-left: 3px solid #4c6ef5; padding: 0.75rem 1rem;
    margin: 1rem 0; background: #f0f4ff; border-radius: 0 6px 6px 0;
  }
  strong { font-weight: 600; color: #0f1729; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
  th, td { border: 1px solid #e8ecf4; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.9rem; }
  th { background: #f8f9fc; font-weight: 600; }
  a { color: #4c6ef5; }
  hr { border: none; border-top: 1px solid #e8ecf4; margin: 2rem 0; }
  /* Footer */
  .doc-footer {
    margin-top: 3rem; padding-top: 1.5rem;
    border-top: 1px solid #e8ecf4; font-size: 0.8rem; color: #8494b2;
    display: flex; justify-content: space-between; align-items: center;
  }
  /* Print */
  @media print {
    body { padding: 0; max-width: 100%; font-size: 12pt; }
    .toc { break-after: page; }
    h2, h3 { break-after: avoid; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
    a { color: inherit; text-decoration: none; }
    .doc-footer { position: fixed; bottom: 0; width: 100%; }
  }
</style>
</head>
<body>
<header class="doc-header">
  <h1>${docTitle}</h1>
  <div class="meta">Generated on ${generationDate}</div>
</header>
${tocHTML}
<main>
${bodyHTML}
</main>
<footer class="doc-footer">
  <span>Generated by DocCraft AI &mdash; doccraft-ten.vercel.app</span>
  <span>${generationDate}</span>
</footer>
</body>
</html>`;

    downloadFile(htmlContent, `${safeTitle || "documentation"}.html`, "text/html");
  };

  const exportMarkdown = () => {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const docTitle = titleMatch ? titleMatch[1].trim() : "documentation";
    const safeTitle = docTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase();
    downloadFile(content, `${safeTitle || "documentation"}.md`, "text/markdown");
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in-up">
      {/* Toolbar */}
      <div className="bg-white rounded-t-2xl border border-surface-3 border-b-0 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {/* View toggle */}
          <div className="flex bg-surface-1 rounded-lg p-0.5 border border-surface-2">
            {(["edit", "split", "preview"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                  view === v
                    ? "bg-white text-ink-0 shadow-sm"
                    : "text-ink-3 hover:text-ink-1"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* AI Actions */}
          <div className="flex items-center gap-1">
            <Wand2 size={13} className="text-brand-500 mr-1" />
            {AI_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  onClick={() => handleAIAction(action.key)}
                  disabled={refining}
                  title={`${action.desc}${getSelectedText() ? " (selected text)" : " (full doc)"}`}
                  className="px-2.5 py-1 text-[0.7rem] font-medium text-ink-2 hover:text-brand-700
                             hover:bg-brand-50 rounded-md transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <Icon size={12} />
                  {action.label}
                </button>
              );
            })}
            {refining && (
              <span className="flex items-center gap-1 text-xs text-brand-600 ml-2">
                <Loader2 size={13} className="animate-spin" />
                Refining…
              </span>
            )}
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink-2
                       hover:bg-surface-2 rounded-lg transition-colors"
          >
            {copied ? <Check size={13} className="text-accent-green" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={exportMarkdown}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink-2
                       hover:bg-surface-2 rounded-lg transition-colors"
          >
            <Code2 size={13} />
            .md
          </button>
          <button
            onClick={exportHTML}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-700 text-white text-xs
                       font-semibold rounded-lg hover:bg-brand-800 transition-colors shadow-sm"
          >
            <Download size={13} />
            Export HTML
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="bg-white rounded-b-2xl border border-surface-3 overflow-hidden shadow-card">
        <div
          className={`grid ${
            view === "split" ? "grid-cols-2" : "grid-cols-1"
          } divide-x divide-surface-2`}
          style={{ minHeight: "65vh" }}
        >
          {/* Editor */}
          {view !== "preview" && (
            <div className="relative" ref={editorContainerRef}>
              <div className="absolute top-3 left-4 text-[0.65rem] font-semibold text-ink-4 uppercase tracking-wider z-10">
                Markdown
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onChange(e.target.value)}
                onMouseUp={handleTextareaMouseUp}
                onKeyUp={handleTextareaMouseUp}
                className="w-full h-full px-4 py-10 text-sm text-ink-1 font-mono leading-relaxed
                           focus:outline-none resize-none bg-transparent"
                spellCheck={false}
              />

              {/* Floating Inline AI Toolbar */}
              {inlineToolbar && (
                <div
                  className="fixed z-[100] bg-ink-0 text-white rounded-lg shadow-xl border border-ink-1
                             flex items-center gap-0.5 p-1 animate-fade-in-up"
                  style={{ left: inlineToolbar.x, top: inlineToolbar.y }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {INLINE_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    const isLoading = inlineLoading === action.key;
                    return (
                      <button
                        key={action.key}
                        onClick={() => handleInlineAction(action.key)}
                        disabled={inlineLoading !== null}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[0.7rem] font-medium
                                   rounded-md hover:bg-white/15 transition-colors disabled:opacity-40
                                   whitespace-nowrap"
                      >
                        {isLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Icon size={12} />
                        )}
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {view !== "edit" && (
            <div className="relative overflow-auto">
              <div className="absolute top-3 left-4 text-[0.65rem] font-semibold text-ink-4 uppercase tracking-wider">
                Preview
              </div>
              <div className="px-8 py-10 markdown-preview">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <p className="text-center text-xs text-ink-3 mt-3">
        💡 Select text in the editor, then click an AI action to refine just that section
      </p>

      {/* Linting Panel */}
      <LintingPanel
        content={content}
        docType={docType}
        onHighlight={(offset, length) => {
          const el = textareaRef.current;
          if (!el) return;
          setView("edit");
          setTimeout(() => {
            el.focus();
            el.setSelectionRange(offset, offset + length);
            // scroll textarea so selection is visible
            const linesBefore = content.slice(0, offset).split("\n").length;
            const lineHeight = 22;
            el.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
          }, 100);
        }}
      />
    </div>
  );
}

/** Markdown → HTML conversion for export with heading IDs for ToC linking */
function markdownToStyledHTML(
  md: string,
  headings: { level: number; text: string; id: string }[]
): string {
  const headingMap = new Map(headings.map((h) => [h.text, h.id]));

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  const outputLines: string[] = [];
  const lines = md.split("\n");

  for (const line of lines) {
    // Code fence handling
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        outputLines.push(`<pre><code>${codeBuffer.join("\n")}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(escapeHtml(line));
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2].trim();
      const id = headingMap.get(text) || text.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
      outputLines.push(`<h${level} id="${id}">${inlineFormat(text)}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      outputLines.push("<hr>");
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      outputLines.push(`<blockquote><p>${inlineFormat(line.slice(2))}</p></blockquote>`);
      continue;
    }

    // Unordered list items
    if (/^[-*+]\s/.test(line.trim())) {
      outputLines.push(`<li>${inlineFormat(line.replace(/^[\s]*[-*+]\s/, ""))}</li>`);
      continue;
    }

    // Ordered list items
    if (/^\d+\.\s/.test(line.trim())) {
      outputLines.push(`<li>${inlineFormat(line.replace(/^[\s]*\d+\.\s/, ""))}</li>`);
      continue;
    }

    // Table rows
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      if (line.includes("---")) continue; // separator row
      const cells = line.split("|").filter(Boolean).map((c) => c.trim());
      const tag = outputLines.filter((l) => l.includes("<th>") || l.includes("<td>")).length === 0 ? "th" : "td";
      outputLines.push(`<tr>${cells.map((c) => `<${tag}>${inlineFormat(c)}</${tag}>`).join("")}</tr>`);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      outputLines.push("");
      continue;
    }

    // Regular paragraph
    outputLines.push(`<p>${inlineFormat(line)}</p>`);
  }

  // Wrap consecutive <li> elements in <ul>
  let result = outputLines.join("\n");
  result = result.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  return result;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
