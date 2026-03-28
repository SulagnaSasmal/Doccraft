"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  ShieldCheck,
  GitGraph,
  FileDown,
  ImageIcon,
  Globe,
  Cloud,
  CloudUpload,
  GitCompare,
  ShieldPlus,
  Camera,
  Sparkles,
  Type,
  ListOrdered,
  Eraser,
} from "lucide-react";
import LintingPanel from "@/components/LintingPanel";
import InfographicPanel from "@/components/InfographicPanel";
import PublishPanel from "@/components/PublishPanel";
import type { DocConfig } from "@/app/page";
import type { GlossaryData } from "@/lib/validateTerminology";
import type { ComplianceIssue } from "@/app/api/compliance/route";
import CompliancePanel from "@/components/CompliancePanel";
import DiagramPanel from "@/components/DiagramPanel";
import ComplianceRulesPanel from "@/components/ComplianceRulesPanel";
import VersionDiffPanel from "@/components/VersionDiffPanel";
import { safeResJson } from "@/lib/safeResJson";
import ComplianceShield from "@/components/doccraft/ComplianceShield";
import {
  CUSTOM_COMPLIANCE_RULES_STORAGE_KEY,
  sanitizeComplianceRules,
  serializeComplianceRules,
  type CustomComplianceRule,
} from "@/lib/complianceRules";
import type { DocSession } from "@/lib/useDocHistory";
import { getSavedBrandKit } from "@/components/BrandKitPanel";

const AI_ACTIONS = [
  { key: "simplify", label: "Simplify", icon: Minimize2, desc: "Simpler language" },
  { key: "expand", label: "Expand", icon: Maximize2, desc: "Add more detail" },
  { key: "example", label: "Add Example", icon: BookOpen, desc: "Add practical example" },
  { key: "troubleshoot", label: "Troubleshoot", icon: AlignLeft, desc: "Add troubleshooting" },
  { key: "concise", label: "Make Concise", icon: Code2, desc: "Remove fluff" },
];

export default function DocumentEditor({
  content,
  onChange,
  onRefine,
  config,
  docType,
  glossaryData,
  history,
  baselineContent,
  onSaveToCloud,
  onSaveVersion,
  cloudSaving,
  cloudSaved,
  isLoggedIn,
}: {
  content: string;
  onChange: (c: string) => void;
  onRefine: (text: string, action: string) => Promise<string>;
  config: DocConfig;
  docType?: string;
  glossaryData?: GlossaryData | null;
  history: DocSession[];
  baselineContent?: string;
  onSaveToCloud?: () => Promise<void>;
  onSaveVersion?: () => void;
  cloudSaving?: boolean;
  cloudSaved?: boolean;
  isLoggedIn?: boolean;
}) {
  const [view, setView] = useState<"split" | "edit" | "preview">("split");
  const [refining, setRefining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [complianceRan, setComplianceRan] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [docxExporting, setDocxExporting] = useState(false);
  const [showInfographic, setShowInfographic] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [customRules, setCustomRules] = useState<CustomComplianceRule[]>([]);
  const [showLinting, setShowLinting] = useState(false);
  const [styleGuide, setStyleGuide] = useState<"mstp" | "google">("mstp");
  const [inlineToolbar, setInlineToolbar] = useState<{ top: number; left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(CUSTOM_COMPLIANCE_RULES_STORAGE_KEY);
      setCustomRules(sanitizeComplianceRules(raw ? JSON.parse(raw) : []));
    } catch {
      setCustomRules([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      CUSTOM_COMPLIANCE_RULES_STORAGE_KEY,
      serializeComplianceRules(customRules)
    );
  }, [customRules]);

  const versionOptions = useMemo(() => {
    const options = [] as Array<{ id: string; label: string; content: string; timestamp?: number }>;

    if (baselineContent?.trim()) {
      options.push({ id: "baseline", label: "Original draft", content: baselineContent });
    }

    history.forEach((session) => {
      options.push({
        id: session.id,
        label: session.label || (session.kind === "snapshot" ? "Saved snapshot" : "Generated draft"),
        content: session.generatedDoc,
        timestamp: session.timestamp,
      });
    });

    return options.filter((option, index, collection) =>
      collection.findIndex((candidate) => candidate.id === option.id) === index
    );
  }, [baselineContent, history]);

  const getSelectedText = (): { text: string; start: number; end: number } | null => {
    const el = textareaRef.current;
    if (!el) return null;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return null;
    return { text: content.slice(start, end), start, end };
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

  /* ── Inline floating toolbar on text selection ───────────────────────── */
  const handleEditorMouseUp = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) { setInlineToolbar(null); return; }

    const rect = el.getBoundingClientRect();
    // Estimate position: line-based approximation
    const textBefore = content.slice(0, end);
    const lines = textBefore.split("\n");
    const lineHeight = 22; // approximate
    const top = rect.top + Math.min(lines.length * lineHeight, rect.height - 40) - 48;
    const left = rect.left + Math.min(200, rect.width / 2);
    setInlineToolbar({ top, left });
  };

  const INLINE_ACTIONS = [
    { key: "simplify", label: "Simplify", icon: Type },
    { key: "expand", label: "Expand", icon: ListOrdered },
    { key: "concise", label: "Concise", icon: Eraser },
    { key: "example", label: "Example", icon: Sparkles },
  ];

  const buildHTMLExport = () => {
    const brandKit = getSavedBrandKit();

    // Extract headings for Table of Contents
    const headings = (content.match(/^#{1,3} .+/gm) || []).map((h) => {
      const level = (h.match(/^#+/) || [""])[0].length;
      const text = h.replace(/^#+\s*/, "");
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return { level, text, id };
    });
    const tocHTML = headings.length > 2
      ? `<nav class="toc"><h2>Table of Contents</h2><ul>${headings
          .map((h) => `<li class="toc-h${h.level}"><a href="#${h.id}">${h.text}</a></li>`)
          .join("\n")}</ul></nav>`
      : "";

    // Inject IDs into headings in the converted HTML
    let bodyHTML = markdownToBasicHTML(content);
    headings.forEach((h) => {
      bodyHTML = bodyHTML.replace(
        `<h${h.level}>${h.text}</h${h.level}>`,
        `<h${h.level} id="${h.id}">${h.text}</h${h.level}>`
      );
    });

    const docLabel = docType || config.docType || "Documentation";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${docLabel} — DocCraft AI</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1a1a2e; line-height: 1.7; max-width: 800px;
    margin: 0 auto; padding: 3rem 2rem; background: #ffffff;
  }
  /* Header bar */
  .doc-header { display: flex; justify-content: space-between; align-items: center;
                padding-bottom: 1rem; margin-bottom: 2rem; border-bottom: 2px solid #e8ecf4; }
  .doc-header h1 { font-size: 1.5rem; font-weight: 700; color: #0f1729; }
  .doc-header .badge { font-size: 0.7rem; padding: 0.25rem 0.6rem; background: #4c6ef5;
                       color: white; border-radius: 999px; font-weight: 600; }
  /* ToC */
  .toc { background: #f8f9fc; border: 1px solid #e8ecf4; border-radius: 8px;
         padding: 1.25rem 1.5rem; margin-bottom: 2rem; }
  .toc h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;
            color: #8494b2; margin-bottom: 0.75rem; }
  .toc ul { list-style: none; }
  .toc li { margin-bottom: 0.35rem; }
  .toc a { text-decoration: none; color: #4c6ef5; font-size: 0.9rem; }
  .toc a:hover { text-decoration: underline; }
  .toc .toc-h3 { padding-left: 1.2rem; }
  /* Content */
  h1 { font-size: 2rem; font-weight: 700; margin: 2rem 0 1rem; color: #0f1729; }
  h2 { font-size: 1.5rem; font-weight: 600; margin: 1.75rem 0 0.75rem; color: #0f1729;
       padding-bottom: 0.5rem; border-bottom: 2px solid #e8ecf4; }
  h3 { font-size: 1.15rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: #2b3a5c; }
  p { margin-bottom: 1rem; }
  ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
  li { margin-bottom: 0.375rem; }
  li.nested { margin-left: 1.5rem; list-style-type: circle; }
  code { background: #f1f3f9; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; }
  pre { background: #0f1729; color: #dbe4ff; padding: 1rem 1.25rem; border-radius: 8px;
        margin-bottom: 1rem; overflow-x: auto; }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote { border-left: 3px solid #4c6ef5; padding: 0.5rem 1rem; margin: 1rem 0;
               background: #f0f4ff; border-radius: 0 6px 6px 0; }
  strong { font-weight: 600; color: #0f1729; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
  th, td { border: 1px solid #e8ecf4; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f8f9fc; font-weight: 600; }
  .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e8ecf4;
            font-size: 0.8rem; color: #8494b2; text-align: center; }
  .brand-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  .brand-header img { max-height: 40px; max-width: 120px; object-fit: contain; }
  .brand-header .company { font-size: 0.9rem; font-weight: 600; }
  .brand-header .tagline { font-size: 0.75rem; color: #8494b2; }
  @media print {
    body { padding: 1rem; }
    .toc { break-after: page; }
    .doc-header .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>
${brandKit?.logoUrl || brandKit?.companyName ? `<div class="brand-header">
  ${brandKit.logoUrl ? `<img src="${brandKit.logoUrl}" alt="Logo" />` : ""}
  <div>
    ${brandKit.companyName ? `<div class="company">${brandKit.companyName}</div>` : ""}
    ${brandKit.tagline ? `<div class="tagline">${brandKit.tagline}</div>` : ""}
  </div>
</div>` : ""}
<div class="doc-header">
  <h1>${docLabel}</h1>
  <span class="badge"${brandKit?.primaryColor ? ` style="background:${brandKit.primaryColor}"` : ""}>Generated by DocCraft AI</span>
</div>
${tocHTML}
${bodyHTML}
<div class="footer">${brandKit?.companyName ? `${brandKit.companyName} • ` : ""}Generated by DocCraft AI on ${new Date().toLocaleDateString()} • ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
</body>
</html>`;
  };

  const exportHTML = () => downloadTextFile(buildHTMLExport(), "documentation.html", "text/html;charset=utf-8");
  const exportMarkdown = () => downloadTextFile(content, "documentation.md", "text/markdown");

  const downloadTextFile = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    downloadBlob(blob, filename);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
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

  const copyAsPlainText = async () => {
    const plain = content
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`\n]+)`/g, "$1")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, "• ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    await navigator.clipboard.writeText(plain);
    setCopiedPlain(true);
    setTimeout(() => setCopiedPlain(false), 2000);
  };

  const exportPDF = () => {
    const htmlContent = buildHTMLExport();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // ─── DOCX export ──────────────────────────────────────────────────────────

  const exportDOCX = async () => {
    setDocxExporting(true);
    try {
      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        HeadingLevel,
      } = await import("docx");

      const paragraphs = markdownToDocxParagraphs(content, {
        Paragraph,
        TextRun,
        HeadingLevel,
      });

      const doc = new Document({
        sections: [{ children: paragraphs }],
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, "documentation.docx");
    } catch (err) {
      console.error("DOCX export error:", err);
    } finally {
      setDocxExporting(false);
    }
  };

  // ─── Compliance ───────────────────────────────────────────────────────────

  const runComplianceCheck = async (doc: string) => {
    setShowCompliance(true);
    setComplianceLoading(true);
    setComplianceRan(true);
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: doc,
          glossaryData: glossaryData ?? null,
          customRules,
          styleGuide,
        }),
      });
      if (!res.ok) throw new Error("Compliance check failed");
      const data = await safeResJson(res);
      setComplianceIssues(data.issues);
    } catch {
      setComplianceIssues([]);
    } finally {
      setComplianceLoading(false);
    }
  };

  useEffect(() => {
    if (content) runComplianceCheck(content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplianceCheck = () => {
    if (showCompliance && complianceRan) {
      setShowCompliance(false);
    } else {
      runComplianceCheck(content);
    }
  };

  const handleApplyFix = async (issue: ComplianceIssue) => {
    if (!issue.problematic_text) return;

    if (issue.replacement) {
      const escaped = issue.problematic_text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      onChange(content.replace(new RegExp(`\\b${escaped}\\b`, "gi"), issue.replacement));
      return;
    }

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: issue.problematic_text,
          action: "fix-compliance",
          instruction: issue.suggestion,
          fullDocument: content,
        }),
      });
      if (!res.ok) return;
      const data = await safeResJson(res);
      onChange(content.replace(issue.problematic_text, data.refined));
    } catch {
      // Fix silently fails; user can edit manually
    }
  };

  const errorCount = complianceIssues.filter((i) => i.severity === "error").length;
  const issueCount = complianceIssues.length;
  const badgeColor =
    errorCount > 0
      ? "bg-accent-red text-white"
      : issueCount > 0
      ? "bg-accent-amber text-white"
      : complianceRan
      ? "bg-accent-green text-white"
      : null;

  return (
    <div className="animate-fade-in-up">
      {/* Toolbar */}
      <div className="bg-surface-0 rounded-t-2xl border border-surface-3 border-b-0 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {/* View toggle */}
          <div className="flex bg-surface-1 rounded-lg p-0.5 border border-surface-2">
            {(["edit", "split", "preview"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                  view === v
                    ? "bg-surface-0 text-ink-0 shadow-sm"
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

        {/* Right-side controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Diagram button */}
          <button
            onClick={() => setShowDiff((state) => !state)}
            disabled={versionOptions.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border disabled:opacity-40 ${
              showDiff
                ? "bg-brand-50 text-brand-700 border-brand-200"
                : "text-ink-2 hover:bg-surface-2 border-surface-3"
            }`}
            title="Compare this draft with earlier versions"
          >
            <GitCompare size={13} />
            Diff
          </button>

          <button
            onClick={() => setShowRules((state) => !state)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              showRules
                ? "bg-brand-50 text-brand-700 border-brand-200"
                : "text-ink-2 hover:bg-surface-2 border-surface-3"
            }`}
            title="Manage custom compliance rules"
          >
            <ShieldPlus size={13} />
            Rules
            {customRules.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-surface-0 border border-brand-200 text-[0.62rem] font-bold">
                {customRules.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowLinting((s) => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              showLinting
                ? "bg-brand-50 text-brand-700 border-brand-200"
                : "text-ink-2 hover:bg-surface-2 border-surface-3"
            }`}
            title="Style guide linting"
          >
            <Sparkles size={13} />
            Lint
          </button>

          {onSaveVersion && (
            <button
              onClick={onSaveVersion}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border border-surface-3 text-ink-2 hover:bg-surface-2"
              title="Save this draft as a snapshot for later comparison"
            >
              <Camera size={13} />
              Snapshot
            </button>
          )}

          <button
            onClick={() => setShowDiagram((s) => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                        transition-colors border
                        ${showDiagram
                          ? "bg-brand-50 text-brand-700 border-brand-200"
                          : "text-ink-2 hover:bg-surface-2 border-surface-3"
                        }`}
            title="Generate a Mermaid diagram from your document"
          >
            <GitGraph size={13} />
            Diagram
          </button>

          {/* Style guide toggle + Compliance check */}
          <div className="flex items-center rounded-lg border border-surface-3 overflow-hidden">
            {/* Style guide selector */}
            <div className="flex bg-surface-1 border-r border-surface-3">
              {(["mstp", "google"] as const).map((sg) => (
                <button
                  key={sg}
                  type="button"
                  onClick={() => setStyleGuide(sg)}
                  title={sg === "mstp" ? "Microsoft Style Guide" : "Google Developer Style Guide"}
                  className={`px-2 py-1.5 text-[0.65rem] font-semibold transition-colors uppercase tracking-wide ${
                    styleGuide === sg
                      ? "bg-brand-700 text-white"
                      : "text-ink-3 hover:text-ink-1 hover:bg-surface-2"
                  }`}
                >
                  {sg === "mstp" ? "MSTP" : "Google"}
                </button>
              ))}
            </div>
            {/* Compliance check trigger */}
            <button
              type="button"
              onClick={handleComplianceCheck}
              disabled={complianceLoading}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                          transition-colors disabled:opacity-40
                          ${showCompliance && complianceRan
                            ? "bg-brand-50 text-brand-700"
                            : "text-ink-2 hover:bg-surface-2"
                          }`}
            >
              {complianceLoading
                ? <Loader2 size={13} className="animate-spin" />
                : <ShieldCheck size={13} />
              }
              Check
              {complianceRan && badgeColor && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1
                                 rounded-full text-[0.6rem] font-bold flex items-center justify-center
                                 ${badgeColor}`}>
                  {issueCount > 0 ? issueCount : "✓"}
                </span>
              )}
            </button>
          </div>

          {/* Phase 3: Infographic + Publish + Cloud Save */}
          <button
            onClick={() => { setShowInfographic(s => !s); setShowPublish(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              showInfographic ? "bg-brand-50 text-brand-700 border-brand-200" : "text-ink-2 hover:bg-surface-2 border-surface-3"
            }`}
            title="Generate a Mermaid visual (mind map, timeline, flowchart, pie chart)"
          >
            <ImageIcon size={13} />
            Infographic
          </button>
          <button
            onClick={() => { setShowPublish(s => !s); setShowInfographic(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              showPublish ? "bg-brand-50 text-brand-700 border-brand-200" : "text-ink-2 hover:bg-surface-2 border-surface-3"
            }`}
            title="Publish to GitHub PR, Confluence, or Notion"
          >
            <Globe size={13} />
            Publish
          </button>
          {onSaveToCloud && (
            <button
              onClick={onSaveToCloud}
              disabled={cloudSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border border-surface-3 text-ink-2 hover:bg-surface-2 disabled:opacity-40"
              title={isLoggedIn ? "Save to your cloud library" : "Sign in to save to cloud"}
            >
              {cloudSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : cloudSaved ? (
                <CloudUpload size={13} className="text-accent-green" />
              ) : (
                <Cloud size={13} />
              )}
              {cloudSaved ? "Saved" : "Save ☁"}
            </button>
          )}

          {/* Export buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink-2
                         hover:bg-surface-2 rounded-lg transition-colors"
              title="Copy as Markdown"
            >
              {copied ? <Check size={13} className="text-accent-green" /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy .md"}
            </button>
            <button
              onClick={copyAsPlainText}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink-2
                         hover:bg-surface-2 rounded-lg transition-colors"
              title="Copy as plain text (no markdown symbols)"
            >
              {copiedPlain ? <Check size={13} className="text-accent-green" /> : <Copy size={13} />}
              {copiedPlain ? "Copied" : "Plain text"}
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
              onClick={exportPDF}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink-2
                         hover:bg-surface-2 rounded-lg transition-colors border border-surface-3"
            >
              <FileText size={13} />
              PDF
            </button>
            <button
              onClick={exportDOCX}
              disabled={docxExporting}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink-2
                         hover:bg-surface-2 rounded-lg transition-colors border border-surface-3
                         disabled:opacity-40"
              title="Export as Word document"
            >
              {docxExporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileDown size={13} />
              )}
              .docx
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
      </div>

      {/* Editor + Preview */}
      <div className="bg-surface-0 rounded-b-2xl border border-surface-3 overflow-hidden shadow-card">
        <div
          className={`grid ${
            view === "split" ? "grid-cols-2" : "grid-cols-1"
          } divide-x divide-surface-2`}
          style={{ minHeight: "65vh" }}
        >
          {/* Editor */}
          {view !== "preview" && (
            <div className="relative">
              <div className="absolute top-3 left-4 text-[0.65rem] font-semibold text-ink-4 uppercase tracking-wider">
                Markdown
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                title="Document markdown editor"
                aria-label="Document markdown editor"
                onChange={(e) => onChange(e.target.value)}
                onMouseUp={handleEditorMouseUp}
                onKeyUp={handleEditorMouseUp}
                onBlur={() => setTimeout(() => setInlineToolbar(null), 200)}
                className="w-full h-full px-4 py-10 text-sm text-ink-1 font-mono leading-relaxed
                           focus:outline-none resize-none bg-transparent"
                spellCheck={false}
              />

              {/* Floating inline AI toolbar */}
              {inlineToolbar && (
                <div
                  className="fixed z-50 flex items-center gap-1 bg-surface-0 border border-surface-3 shadow-lg rounded-lg px-1.5 py-1 animate-fade-in-up"
                  style={{ top: inlineToolbar.top, left: inlineToolbar.left }}
                >
                  {INLINE_ACTIONS.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.key}
                        onMouseDown={(e) => { e.preventDefault(); handleAIAction(a.key); setInlineToolbar(null); }}
                        className="flex items-center gap-1 px-2 py-1 text-[0.65rem] font-medium text-ink-2
                                   hover:text-brand-700 hover:bg-brand-50 rounded-md transition-colors"
                        title={a.label}
                      >
                        <Icon size={11} />
                        {a.label}
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
                <ComplianceShield
                  content={content}
                  complianceIssues={complianceIssues}
                  complianceRan={complianceRan}
                  complianceLoading={complianceLoading}
                />
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

      {/* Diagram panel */}
      {showDiagram && (
        <DiagramPanel
          document={content}
          onInsert={(block) => onChange(content + block)}
          onClose={() => setShowDiagram(false)}
        />
      )}

      {/* Compliance panel */}
      {showCompliance && (
        <CompliancePanel
          issues={complianceIssues}
          isLoading={complianceLoading}
          onClose={() => setShowCompliance(false)}
          onApplyFix={handleApplyFix}
          customRuleCount={customRules.length}
        />
      )}

      {showRules && (
        <ComplianceRulesPanel
          rules={customRules}
          onChange={setCustomRules}
          onClose={() => setShowRules(false)}
        />
      )}

      {showDiff && versionOptions.length > 0 && (
        <VersionDiffPanel
          currentContent={content}
          versions={versionOptions}
          onClose={() => setShowDiff(false)}
        />
      )}

      {/* Style Guide Linting Panel */}
      {showLinting && (
        <LintingPanel
          content={content}
          docType={docType || config.docType || "user-guide"}
          onHighlight={(offset, length) => {
            const el = textareaRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(offset, offset + length);
          }}
        />
      )}

      {/* Visual Generator (Mermaid) Panel */}
      {showInfographic && (
        <InfographicPanel
          content={content}
          onInsert={(block) => { onChange(content + block); setShowInfographic(false); }}
          onClose={() => setShowInfographic(false)}
        />
      )}

      {/* Publish Panel */}
      {showPublish && (
        <PublishPanel
          content={content}
          docTitle={docType || config.docType || "Documentation"}
          onClose={() => setShowPublish(false)}
        />
      )}
    </div>
  );
}

/** Markdown → HTML for export. Handles nested lists, code fences, emoji. */
function markdownToBasicHTML(md: string): string {
  const src = stripOuterFence(md);

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

  const lines = src.split(/\r?\n/);
  const out: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let inUL = false;
  let inOL = false;

  const closeLists = () => {
    if (inUL) { out.push("</ul>"); inUL = false; }
    if (inOL) { out.push("</ol>"); inOL = false; }
  };

  for (const line of lines) {
    // Code fence toggle
    if (/^```/.test(line)) {
      if (inCode) {
        out.push(`<pre><code>${escape(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeLists();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    // Headings
    const hm = line.match(/^(#{1,3}) (.*)/);
    if (hm) {
      closeLists();
      out.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`);
      continue;
    }

    // Blockquote
    if (/^> /.test(line)) {
      closeLists();
      out.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`);
      continue;
    }

    // Nested bullet (2+ leading spaces)
    const nb = line.match(/^ {2,}[-*] (.*)/);
    if (nb) {
      if (!inUL) { out.push("<ul>"); inUL = true; }
      out.push(`<li class="nested">${inline(nb[1])}</li>`);
      continue;
    }

    // Top-level bullet
    const b = line.match(/^[-*] (.*)/);
    if (b) {
      if (inOL) { out.push("</ol>"); inOL = false; }
      if (!inUL) { out.push("<ul>"); inUL = true; }
      out.push(`<li>${inline(b[1])}</li>`);
      continue;
    }

    // Ordered list
    const ol = line.match(/^\d+\. (.*)/);
    if (ol) {
      if (inUL) { out.push("</ul>"); inUL = false; }
      if (!inOL) { out.push("<ol>"); inOL = true; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    // Empty line
    if (!line.trim()) { closeLists(); continue; }

    // Paragraph
    closeLists();
    out.push(`<p>${inline(line)}</p>`);
  }

  closeLists();
  return out.join("\n");
}

/** Convert markdown to docx Paragraph array */
function markdownToDocxParagraphs(
  md: string,
  { Paragraph, TextRun, HeadingLevel }: any
): any[] {
  const lines = stripOuterFence(md).split("\n");
  const paragraphs: any[] = [];
  let inCodeBlock = false;
  const codeLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeLines.join("\n"),
                font: "Courier New",
                size: 18,
              }),
            ],
            spacing: { before: 120, after: 120 },
          })
        );
        codeLines.length = 0;
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 })
      );
    } else if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 })
      );
    } else if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 })
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(line.slice(2), { TextRun }),
          indent: { left: 720 },
          spacing: { before: 60, after: 60 },
        })
      );
    } else if (/^\d+\. /.test(line)) {
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(line.replace(/^\d+\. /, ""), { TextRun }),
          indent: { left: 720 },
          spacing: { before: 60, after: 60 },
        })
      );
    } else if (line.startsWith("> ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line.slice(2), italics: true })],
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
        })
      );
    } else if (line.trim() === "") {
      paragraphs.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
    } else {
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(line, { TextRun }),
          spacing: { before: 100, after: 100 },
        })
      );
    }
  }

  return paragraphs;
}

/** Strip a wrapping ```lang ... ``` fence if the AI added one around its output */
function stripOuterFence(md: string): string {
  const s = md.trim();
  const m = s.match(/^```[\w]*\r?\n([\s\S]+)\r?\n```$/);
  return m ? m[1].trim() : s;
}

function parseInlineRuns(text: string, { TextRun }: any): any[] {
  const runs: any[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: "Courier New", size: 18 }));
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: "" })];
}
