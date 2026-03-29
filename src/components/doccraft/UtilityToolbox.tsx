"use client";

import {
  Upload, ClipboardPaste, X, FileText, Image,
  Table, FileJson, FileImage, FolderOpen, FolderClosed, ChevronRight,
  ChevronDown, FileCode2, Shield, Wrench, Settings, BookOpen, HardDrive,
} from "lucide-react";
import type { DocConfig } from "@/app/page";
import type { GlossaryData } from "@/lib/validateTerminology";
import ConfigPanel from "@/components/ConfigPanel";
import ContextPanel from "@/components/ContextPanel";
import { useRef, useState, DragEvent, MouseEvent } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Recommendation {
  type: string;
  reason: string;
  confidence: number;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  "user-guide": "User Guide",
  "quick-start": "Quick Start",
  "api-reference": "API Reference",
  "troubleshooting": "Troubleshooting Guide",
  "release-notes": "Release Notes",
};

const FILE_TYPE_HINTS: Record<string, { label: string; Icon: typeof FileText }> = {
  md: { label: "Markdown", Icon: FileText },
  txt: { label: "Plain Text", Icon: FileText },
  csv: { label: "CSV", Icon: Table },
  json: { label: "JSON", Icon: FileJson },
  png: { label: "Image", Icon: FileImage },
  jpg: { label: "Image", Icon: FileImage },
  jpeg: { label: "Image", Icon: FileImage },
  pdf: { label: "PDF", Icon: FileText },
  docx: { label: "Word", Icon: FileText },
};

// ── File System Access API types ─────────────────────────────────────────────
interface FsNode {
  name: string;
  kind: "file" | "directory";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: any;
  path: string;
  children?: FsNode[];
}

interface Props {
  uploadedContent: string;
  fileNames: string[];
  onContentChange: (content: string, names: string[]) => void;
  config: DocConfig;
  onConfigChange: (c: DocConfig) => void;
  contextText: string;
  glossaryData: GlossaryData | null;
  onContextChange: (text: string, glossary: GlossaryData | null) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  recommendation: Recommendation | null;
  recDismissed: boolean;
  onApplyRecommendation: (type: string) => void;
  onDismissRecommendation: () => void;
  onDirectLoadMarkdown: (content: string, fileName: string) => void;
}

// ── Collapsible section wrapper ───────────────────────────────────────────────
function Section({
  id,
  label,
  icon: Icon,
  accent = "text-slate-400",
  expanded,
  onToggle,
  children,
  badge,
  step,
  stepDone,
}: {
  id: string;
  label: string;
  icon: typeof FileText;
  accent?: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  badge?: string;
  step?: number;
  stepDone?: boolean;
}) {
  return (
    <div className={`border rounded-xl overflow-hidden bg-slate-900/40 transition-colors ${
      stepDone ? "border-emerald-700/40" : "border-slate-800/60"
    }`}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 px-3.5 py-3 bg-slate-800/40 hover:bg-slate-800/70 transition-colors text-left"
      >
        {step != null ? (
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[0.6rem] font-bold border ${
            stepDone
              ? "bg-emerald-600/30 border-emerald-600/50 text-emerald-400"
              : "bg-slate-700/60 border-slate-600/50 text-slate-400"
          }`}>
            {stepDone ? "✓" : step}
          </div>
        ) : (
          <div className="w-5 h-5 rounded-md bg-slate-700/60 flex items-center justify-center shrink-0">
            <Icon size={11} className={`${accent} shrink-0`} />
          </div>
        )}
        <span className="flex-1 text-[0.78rem] font-semibold text-slate-200 tracking-tight">
          {label}
        </span>
        {badge && (
          <span className="px-1.5 py-0.5 rounded-full bg-blue-600/20 border border-blue-700/40 text-blue-400 text-[0.6rem] font-bold">
            {badge}
          </span>
        )}
        <ChevronDown
          size={12}
          className={`text-slate-500 transition-transform duration-200 shrink-0 ${expanded ? "" : "-rotate-90"}`}
        />
      </button>
      {expanded && (
        <div className="px-3.5 py-3.5 border-t border-slate-800/60">
          {children}
        </div>
      )}
    </div>
  );
}

export default function UtilityToolbox({
  uploadedContent,
  fileNames,
  onContentChange,
  config,
  onConfigChange,
  contextText,
  glossaryData,
  onContextChange,
  onAnalyze,
  isAnalyzing,
  recommendation,
  recDismissed,
  onApplyRecommendation,
  onDismissRecommendation,
  onDirectLoadMarkdown,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Source tab: "upload" | "paste" | "local"
  const [sourceTab, setSourceTab] = useState<"upload" | "paste" | "local">("upload");

  // Default expanded sections
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(["source", "config"])
  );

  const toggleSection = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Local Workspace state ───────────────────────────────────
  const [fsNodes, setFsNodes] = useState<FsNode[]>([]);
  const [fsLoading, setFsLoading] = useState(false);
  const [fsDirName, setFsDirName] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const readDirRecursive = async (
    dirHandle: any,
    path: string
  ): Promise<FsNode[]> => {
    const nodes: FsNode[] = [];
    for await (const [name, handle] of dirHandle.entries()) {
      const nodePath = path ? `${path}/${name}` : name;
      if (handle.kind === "directory") {
        const children = await readDirRecursive(handle, nodePath);
        if (children.length > 0) {
          nodes.push({ name, kind: "directory", handle, path: nodePath, children });
        }
      } else if (name.endsWith(".md") || name.endsWith(".markdown")) {
        nodes.push({ name, kind: "file", handle, path: nodePath });
      }
    }
    return nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const openWorkspaceFolder = async () => {
    if (!("showDirectoryPicker" in window)) {
      alert("Your browser does not support the File System Access API. Try Chrome or Edge.");
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "read" });
      setFsDirName(dirHandle.name);
      setFsLoading(true);
      const nodes = await readDirRecursive(dirHandle, "");
      setFsNodes(nodes);
      // Ensure Source Material section is expanded
      setExpanded((prev) => { const next = new Set(prev); next.add("source"); return next; });
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error("Workspace folder error:", e);
    } finally {
      setFsLoading(false);
    }
  };

  const handleWorkspaceFileClick = async (node: FsNode) => {
    try {
      const file = await node.handle.getFile();
      const content: string = await file.text();
      onDirectLoadMarkdown(content, node.name);
    } catch (e) {
      console.error("Failed to read workspace file:", e);
    }
  };

  const handleAddAsSource = async (node: FsNode, e: MouseEvent) => {
    e.stopPropagation();
    try {
      const file = await node.handle.getFile();
      const content: string = await file.text();
      const combined = uploadedContent
        ? uploadedContent + "\n\n---\n\n" + content
        : content;
      onContentChange(combined, [...fileNames, node.name]);
    } catch (err) {
      console.error("Failed to add workspace file as source:", err);
    }
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

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
        contents.push(`[Image: ${file.name}]\n(Image uploaded — will be analyzed by AI vision)`);
      } else if (file.name.endsWith(".json")) {
        contents.push(`[JSON File: ${file.name}]\n${await file.text()}`);
      } else {
        try { contents.push(await file.text()); }
        catch { contents.push(`[File: ${file.name}] (Binary — text extraction unavailable in browser)`); }
      }
    }
    const combined = (uploadedContent ? uploadedContent + "\n\n---\n\n" : "") + contents.join("\n\n---\n\n");
    onContentChange(combined, [...fileNames, ...names]);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    onContentChange(uploadedContent ? uploadedContent + "\n\n---\n\n" + pasteText : pasteText, [...fileNames, "Pasted content"]);
    setPasteText("");
    setSourceTab("upload");
  };

  const showRecommendation = recommendation && !recDismissed && uploadedContent.length > 0;

  return (
    <aside className="flex flex-col h-full border-r border-slate-800/80 bg-slate-950">
      {/* ── Header ── */}
      <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center gap-3 bg-slate-900/60">
        <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Wrench size={13} className="text-blue-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[0.82rem] font-bold text-slate-100 tracking-tight leading-none">
            Document Generator
          </h2>
          <p className="text-[0.6rem] text-slate-500 tracking-wide uppercase font-medium mt-0.5">
            Configure &amp; Analyze
          </p>
        </div>
        {fileNames.length > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-600/15 border border-emerald-700/30 text-emerald-400 text-[0.6rem] font-bold shrink-0">
            {fileNames.length} loaded
          </span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-3 space-y-2.5">

          {/* ── Source Material ─────────────────────────────── */}
          <Section
            id="source"
            label="Source Material"
            icon={Upload}
            accent="text-blue-400"
            expanded={expanded.has("source")}
            onToggle={toggleSection}
            badge={fileNames.length > 0 ? `${fileNames.length}` : undefined}
            step={1}
            stepDone={fileNames.length > 0}
          >
            <div className="space-y-2">
              {/* Upload / Paste / Local tabs */}
              <div className="flex gap-0.5 p-0.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
                {(["upload", "paste", "local"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSourceTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[0.65rem] font-medium transition-all ${
                      sourceTab === tab ? "bg-slate-700 text-slate-200 shadow-sm" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {tab === "upload" && <Upload size={9} />}
                    {tab === "paste" && <ClipboardPaste size={9} />}
                    {tab === "local" && <HardDrive size={9} />}
                    {tab === "upload" ? "Upload" : tab === "paste" ? "Paste" : "Local"}
                  </button>
                ))}
              </div>

              {sourceTab === "upload" ? (
                <div
                  onDragEnter={(e) => handleDrag(e, true)}
                  onDragLeave={(e) => handleDrag(e, false)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? "border-blue-500 bg-blue-900/20"
                      : "border-slate-700/60 hover:border-blue-500/50 hover:bg-slate-800/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    title="Select source files to upload"
                    accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={(e) => e.target.files && processFiles(e.target.files)}
                    className="hidden"
                  />
                  <div className="w-8 h-8 bg-slate-700/60 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Upload size={14} className="text-slate-400" />
                  </div>
                  <p className="text-[0.72rem] font-medium text-slate-300">
                    Drop or <span className="text-blue-400">browse</span>
                  </p>
                  <p className="text-[0.62rem] text-slate-500 mt-0.5">
                    TXT · MD · PDF · DOCX · JSON · Images
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Shield size={8} className="text-emerald-500/70" />
                    <span className="text-[0.58rem] text-emerald-600/80">Local — no upload to servers</span>
                  </div>
                </div>
              ) : sourceTab === "paste" ? (
                <div className="space-y-2">
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste raw content — notes, specs, API details…"
                    className="w-full h-28 px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-800/60
                               text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none
                               focus:ring-1 focus:ring-blue-500/50 resize-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handlePasteSubmit}
                    disabled={!pasteText.trim()}
                    className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg
                               hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    Add Content
                  </button>
                </div>
              ) : (
                /* Local Workspace tab */
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={openWorkspaceFolder}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                               text-[0.72rem] font-medium text-slate-400 bg-slate-800/60
                               hover:bg-slate-700/60 hover:text-slate-200 border border-slate-700/40
                               transition-all"
                  >
                    <FolderOpen size={11} />
                    {fsDirName ? "Change folder" : "Open .md folder"}
                  </button>

                  {fsLoading && (
                    <div className="flex items-center gap-2 px-2 py-2 text-[0.72rem] text-slate-500">
                      <span className="w-3 h-3 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin" />
                      Scanning…
                    </div>
                  )}

                  {fsDirName && !fsLoading && (
                    <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 overflow-hidden">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-700/40
                                      bg-slate-700/20 text-[0.68rem] text-slate-400 font-medium">
                        <FolderClosed size={10} className="text-blue-400 shrink-0" />
                        <span className="truncate">{fsDirName}</span>
                      </div>
                      {fsNodes.length === 0 ? (
                        <p className="text-[0.65rem] text-slate-600 px-3 py-2.5 text-center">
                          No .md files found
                        </p>
                      ) : (
                        <div className="max-h-[200px] overflow-y-auto">
                          <WorkspaceFileTree
                            nodes={fsNodes}
                            expandedPaths={expandedPaths}
                            onToggle={toggleExpand}
                            onFileClick={handleWorkspaceFileClick}
                            onAddAsSource={handleAddAsSource}
                            depth={0}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {!fsDirName && !fsLoading && (
                    <p className="text-[0.62rem] text-slate-600 text-center px-2">
                      Browse local <span className="text-slate-500">.md</span> files and open them directly in the editor
                    </p>
                  )}
                </div>
              )}

              {/* Loaded files */}
              {fileNames.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-slate-500">
                      {fileNames.length} source{fileNames.length > 1 ? "s" : ""} loaded
                    </span>
                    <button
                      type="button"
                      onClick={() => onContentChange("", [])}
                      className="text-[0.65rem] text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <X size={9} /> Clear all
                    </button>
                  </div>
                  {fileNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/40 rounded-lg border border-slate-700/40">
                      {name.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                        ? <Image size={10} className="text-blue-400 shrink-0" />
                        : <FileText size={10} className="text-blue-400 shrink-0" />}
                      <span className="text-[0.65rem] text-slate-300 truncate">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* ── Output Configuration ────────────────────────────── */}
          <Section
            id="config"
            label="Output Configuration"
            icon={Settings}
            accent="text-slate-500"
            expanded={expanded.has("config")}
            onToggle={toggleSection}
            step={2}
            stepDone={fileNames.length > 0}
          >
            <div className="[&_.bg-surface-0]:bg-slate-800/40 [&_.bg-surface-0]:border-slate-700/50
                            [&_.bg-surface-1]:bg-slate-800/30 [&_.text-ink-0]:text-slate-200
                            [&_.text-ink-1]:text-slate-300 [&_.text-ink-2]:text-slate-400
                            [&_.text-ink-3]:text-slate-500 [&_.text-ink-4]:text-slate-600
                            [&_.border-surface-3]:border-slate-700/50 [&_.rounded-2xl]:rounded-xl">
              <ConfigPanel config={config} onChange={onConfigChange} />
            </div>
          </Section>

          {/* ── Context & Glossary ───────────────────────── */}
          <Section
            id="context"
            label="Context & Glossary"
            icon={BookOpen}
            accent="text-slate-500"
            expanded={expanded.has("context")}
            onToggle={toggleSection}
            step={3}
            stepDone={contextText.length > 0}
          >
            <div className="[&_.bg-surface-0]:bg-slate-800/40 [&_.bg-surface-0]:border-slate-700/50
                            [&_.bg-surface-1]:bg-slate-800/30 [&_.text-ink-0]:text-slate-200
                            [&_.text-ink-1]:text-slate-300 [&_.text-ink-2]:text-slate-400
                            [&_.text-ink-3]:text-slate-500 [&_.text-ink-4]:text-slate-600
                            [&_.border-surface-3]:border-slate-700/50 [&_.rounded-2xl]:rounded-xl">
              <ContextPanel
                onContextChange={onContextChange}
                contextText={contextText}
                glossaryData={glossaryData}
              />
            </div>
          </Section>

          {/* ── Recommendation callout ───────────────────── */}
          {showRecommendation && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-blue-600/10 border border-blue-500/30 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-[0.72rem] font-semibold text-blue-300">
                  Suggested: {DOC_TYPE_LABELS[recommendation!.type] || recommendation!.type}
                </p>
                <p className="text-[0.65rem] text-slate-400 mt-0.5 leading-relaxed">
                  {recommendation!.reason}
                </p>
                <button
                  type="button"
                  onClick={() => onApplyRecommendation(recommendation!.type)}
                  className="mt-1 text-[0.65rem] font-semibold text-blue-400 hover:underline"
                >
                  Use this →
                </button>
              </div>
              <button type="button" title="Dismiss recommendation" onClick={onDismissRecommendation} className="text-slate-600 hover:text-slate-400">
                <X size={12} />
              </button>
            </div>
          )}

          <div className="pb-1" />
        </div>
      </ScrollArea>

      {/* ── Sticky Analyze CTA ───────────────────────── */}
      <div className="px-3 py-3 border-t border-slate-800/60 bg-slate-950/95 shrink-0">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!uploadedContent.trim() || isAnalyzing}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-xl
                     hover:bg-blue-700 active:scale-[0.98] transition-all duration-150
                     disabled:opacity-40 disabled:cursor-not-allowed
                     shadow-lg shadow-blue-900/30 text-[0.82rem] tracking-wide"
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing…
            </span>
          ) : (
            "Analyze & Identify Gaps"
          )}
        </button>
      </div>
    </aside>
  );
}

// ── WorkspaceFileTree ─────────────────────────────────────────────────────────
function WorkspaceFileTree({
  nodes,
  expandedPaths,
  onToggle,
  onFileClick,
  onAddAsSource,
  depth,
}: {
  nodes: FsNode[];
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onFileClick: (node: FsNode) => void;
  onAddAsSource: (node: FsNode, e: MouseEvent) => void;
  depth: number;
}) {
  return (
    <>
      {nodes.map((node) =>
        node.kind === "directory" ? (
          <div key={node.path}>
            <button
              type="button"
              title={`Toggle folder ${node.name}`}
              onClick={() => onToggle(node.path)}
              className="w-full flex items-center gap-1.5 py-1 hover:bg-slate-700/30 transition-colors"
              style={{ paddingLeft: `${10 + depth * 12}px` }}
            >
              {expandedPaths.has(node.path) ? (
                <ChevronDown size={10} className="text-slate-500 shrink-0" />
              ) : (
                <ChevronRight size={10} className="text-slate-500 shrink-0" />
              )}
              <FolderClosed size={11} className="text-slate-500 shrink-0" />
              <span className="text-[0.68rem] text-slate-400 truncate">{node.name}</span>
            </button>
            {expandedPaths.has(node.path) && node.children && (
              <WorkspaceFileTree
                nodes={node.children}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                onFileClick={onFileClick}
                onAddAsSource={onAddAsSource}
                depth={depth + 1}
              />
            )}
          </div>
        ) : (
          <div
            key={node.path}
            className="flex items-center gap-1.5 py-1 hover:bg-blue-600/10 transition-colors
                       group cursor-pointer"
            style={{ paddingLeft: `${10 + depth * 12}px`, paddingRight: "8px" }}
            onClick={() => onFileClick(node)}
            title={`Open "${node.name}" in editor`}
          >
            <FileCode2 size={10} className="text-blue-400 shrink-0" />
            <span className="text-[0.68rem] text-slate-300 truncate flex-1 group-hover:text-white">
              {node.name}
            </span>
            <button
              type="button"
              onClick={(e) => onAddAsSource(node, e)}
              className="opacity-0 group-hover:opacity-100 text-[0.58rem] font-semibold shrink-0
                         px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400
                         hover:bg-blue-600/30 hover:text-blue-300 transition-all"
              title="Append to source material"
            >
              +Src
            </button>
          </div>
        )
      )}
    </>
  );
}
