"use client";

import { useState } from "react";
import { History, X, Trash2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import type { DocSession } from "@/lib/useDocHistory";

const DOC_TYPE_LABELS: Record<string, string> = {
  "user-guide": "User Guide",
  "quick-start": "Quick Start",
  "api-reference": "API Reference",
  "troubleshooting": "Troubleshooting",
  "release-notes": "Release Notes",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function HistoryPanel({
  history,
  onRestore,
  onRemove,
  onClearAll,
}: {
  history: DocSession[];
  onRestore: (session: DocSession) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-surface-3 shadow-card overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-1 transition-colors select-none"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <History size={15} className="text-brand-500 shrink-0" />
          <span className="font-display font-semibold text-ink-0 text-[0.9rem]">
            Recent Sessions
          </span>
          <span className="text-xs text-ink-3 bg-surface-2 px-2 py-0.5 rounded-full">
            {history.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearAll();
            }}
            className="text-xs text-accent-red hover:underline flex items-center gap-1"
          >
            <Trash2 size={11} />
            Clear all
          </button>
          {expanded ? (
            <ChevronUp size={15} className="text-ink-3" />
          ) : (
            <ChevronDown size={15} className="text-ink-3" />
          )}
        </div>
      </div>

      {/* Session list */}
      {expanded && (
        <div className="border-t border-surface-2 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {history.map((session) => (
            <div
              key={session.id}
              className="group relative flex flex-col gap-1.5 px-3.5 py-3 rounded-xl border border-surface-2
                         bg-surface-1 hover:border-brand-200 hover:bg-brand-50 transition-all cursor-pointer"
              onClick={() => onRestore(session)}
              role="button"
              title="Click to restore this session"
            >
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(session.id);
                }}
                className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100
                           hover:bg-surface-3 text-ink-4 hover:text-ink-2 transition-all"
                aria-label="Remove session"
              >
                <X size={11} />
              </button>

              {/* Doc type badge */}
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                  {DOC_TYPE_LABELS[session.config.docType] || session.config.docType}
                </span>
                <span className="text-[0.65rem] text-ink-4">{timeAgo(session.timestamp)}</span>
              </div>

              {/* Preview text */}
              <p className="text-[0.72rem] text-ink-2 leading-relaxed line-clamp-2 pr-4">
                {session.inputSummary || "No preview available"}
              </p>

              {/* Restore hint */}
              <div className="flex items-center gap-1 text-[0.65rem] text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <RotateCcw size={10} />
                Restore session
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
