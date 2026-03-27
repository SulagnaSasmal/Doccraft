"use client";

import { FileText, RotateCcw, Trash2, X, Plus, Shield, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DocSession } from "@/lib/useDocHistory";

const DOC_TYPE_LABELS: Record<string, string> = {
  "user-guide": "User Guide",
  "quick-start": "Quick Start",
  "api-reference": "API Reference",
  "troubleshooting": "Troubleshooting",
  "release-notes": "Release Notes",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  "user-guide": "bg-blue-600/20 text-blue-300 border-blue-500/30",
  "quick-start": "bg-emerald-600/20 text-emerald-300 border-emerald-500/30",
  "api-reference": "bg-violet-600/20 text-violet-300 border-violet-500/30",
  "troubleshooting": "bg-amber-600/20 text-amber-300 border-amber-500/30",
  "release-notes": "bg-cyan-600/20 text-cyan-300 border-cyan-500/30",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// Deterministic compliance stub — in a real system this comes from the compliance API
function getComplianceStatus(session: DocSession): "clean" | "flagged" | "pending" {
  const text = session.generatedDoc.toLowerCase();
  if (text.includes("ssn") || text.includes("account number") || text.includes("password")) return "flagged";
  if (session.config.docType === "api-reference") return "clean";
  return "pending";
}

interface Props {
  history: DocSession[];
  onRestore: (session: DocSession) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onNewDoc: () => void;
}

export default function DocumentLibrary({ history, onRestore, onRemove, onClearAll, onNewDoc }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-100">Document Library</h2>
          {history.length > 0 && (
            <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
              {history.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-[0.72rem] text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              Clear all
            </button>
          )}
          <button
            onClick={onNewDoc}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white
                       text-[0.78rem] font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={13} />
            New Doc
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-5">
          {history.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50
                              flex items-center justify-center mb-4">
                <FileText size={28} className="text-slate-600" />
              </div>
              <p className="text-slate-300 font-medium text-sm mb-1">No documents yet</p>
              <p className="text-slate-600 text-xs max-w-[220px] leading-relaxed">
                Upload source material in the Utility Toolbox and analyze it to generate your first document.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
              {history.map((session) => {
                const compliance = getComplianceStatus(session);
                const typeColor = DOC_TYPE_COLORS[session.config.docType] ?? "bg-slate-700/40 text-slate-300 border-slate-600/40";

                return (
                  <Card
                    key={session.id}
                    className="group relative flex flex-col gap-3 p-4 cursor-pointer
                               bg-slate-800/40 border-slate-700/40 rounded-xl
                               hover:border-blue-500/40 hover:bg-slate-800/70
                               transition-all duration-150 shadow-none"
                    onClick={() => onRestore(session)}
                  >
                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(session.id); }}
                      className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100
                                 hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-all"
                      aria-label="Remove document"
                    >
                      <X size={12} />
                    </button>

                    {/* Top row: type badge + compliance + time */}
                    <div className="flex items-center gap-2 flex-wrap pr-5">
                      <span className={`text-[0.62rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeColor}`}>
                        {session.label || DOC_TYPE_LABELS[session.config.docType] || session.config.docType}
                      </span>
                      {session.kind === "snapshot" && (
                        <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-full border border-slate-600/40">
                          Snapshot
                        </span>
                      )}
                      {/* Compliance badge — FinTech layer */}
                      {compliance === "clean" && (
                        <span className="flex items-center gap-1 text-[0.6rem] font-semibold text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-700/30">
                          <Shield size={9} /> PII Clean
                        </span>
                      )}
                      {compliance === "flagged" && (
                        <span className="flex items-center gap-1 text-[0.6rem] font-semibold text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-700/30">
                          <AlertTriangle size={9} /> PII Flagged
                        </span>
                      )}
                      <span className="text-[0.62rem] text-slate-600 ml-auto">{timeAgo(session.timestamp)}</span>
                    </div>

                    {/* Preview */}
                    <p className="text-[0.72rem] text-slate-400 leading-relaxed line-clamp-2 pr-4">
                      {session.inputSummary || "No preview available"}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-[0.62rem] text-slate-600">
                      <span>{session.config.audience}</span>
                      <span>·</span>
                      <span>{session.config.tone}</span>
                    </div>

                    {/* Restore hint */}
                    <div className="flex items-center gap-1 text-[0.65rem] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <RotateCcw size={10} />
                      Open in editor
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
