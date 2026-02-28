"use client";

import { useState } from "react";
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ComplianceIssue } from "@/app/api/compliance/route";

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY = {
  error: {
    badge: "bg-red-100 text-accent-red border-red-200",
    row: "border-red-100",
    Icon: AlertCircle,
    label: "Error",
    order: 0,
  },
  warning: {
    badge: "bg-amber-50 text-accent-amber border-amber-200",
    row: "border-amber-100",
    Icon: AlertTriangle,
    label: "Warning",
    order: 1,
  },
  suggestion: {
    badge: "bg-brand-50 text-brand-600 border-brand-200",
    row: "border-surface-3",
    Icon: Lightbulb,
    label: "Suggestion",
    order: 2,
  },
} as const;

const CATEGORY_LABEL: Record<ComplianceIssue["category"], string> = {
  terminology: "Terminology",
  voice: "Voice",
  structure: "Structure",
  style: "Style",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompliancePanel({
  issues,
  isLoading,
  onClose,
}: {
  issues: ComplianceIssue[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const dismiss = (id: string) =>
    setDismissed((prev) => {
      const next = new Set(Array.from(prev));
      next.add(id);
      return next;
    });

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(Array.from(prev));
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const visible = issues
    .filter((i) => !dismissed.has(i.id))
    .sort((a, b) => SEVERITY[a.severity].order - SEVERITY[b.severity].order);

  const errorCount = visible.filter((i) => i.severity === "error").length;
  const warningCount = visible.filter((i) => i.severity === "warning").length;
  const suggestionCount = visible.filter((i) => i.severity === "suggestion").length;

  return (
    <div className="mt-4 bg-white rounded-2xl border border-surface-3 shadow-card animate-fade-in-up overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-surface-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={16} className="text-brand-500 shrink-0" />
          <span className="font-display font-semibold text-ink-0 text-[0.95rem]">
            MSTP Compliance
          </span>

          {/* Summary chips — shown after load */}
          {!isLoading && (
            <div className="flex items-center gap-1.5 ml-1">
              {errorCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-red-100 text-accent-red border border-red-200">
                  {errorCount} error{errorCount > 1 ? "s" : ""}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-amber-50 text-accent-amber border border-amber-200">
                  {warningCount} warning{warningCount > 1 ? "s" : ""}
                </span>
              )}
              {suggestionCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-brand-50 text-brand-600 border border-brand-200">
                  {suggestionCount} suggestion{suggestionCount > 1 ? "s" : ""}
                </span>
              )}
              {visible.length === 0 && !isLoading && (
                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-green-50 text-accent-green border border-green-200">
                  All clear
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-ink-1 transition-colors"
          aria-label="Close compliance panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 max-h-[420px] overflow-y-auto">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-2.5 py-6 justify-center text-ink-3">
            <Loader2 size={18} className="animate-spin text-brand-500" />
            <span className="text-sm">Checking document against MSTP rules…</span>
          </div>
        )}

        {/* All clear */}
        {!isLoading && visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <ShieldCheck size={20} className="text-accent-green" />
            </div>
            <p className="font-medium text-ink-1 text-sm">No compliance issues found</p>
            <p className="text-xs text-ink-3">
              Your document follows MSTP style guidelines.
            </p>
          </div>
        )}

        {/* Issue list */}
        {!isLoading && visible.length > 0 && (
          <div className="space-y-2">
            {visible.map((issue) => {
              const sev = SEVERITY[issue.severity];
              const Icon = sev.Icon;
              const isOpen = expanded.has(issue.id);

              return (
                <div
                  key={issue.id}
                  className={`rounded-xl border ${sev.row} bg-white overflow-hidden`}
                >
                  {/* Issue row */}
                  <div className="flex items-start gap-2.5 px-3.5 py-2.5">
                    <Icon size={14} className={`mt-0.5 shrink-0 ${sev.badge.split(" ")[1]}`} />

                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[0.62rem] font-semibold border ${sev.badge}`}
                        >
                          {sev.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md text-[0.62rem] font-medium bg-surface-2 text-ink-3 border border-surface-3">
                          {CATEGORY_LABEL[issue.category]}
                        </span>
                        <span className="text-[0.68rem] text-ink-3 truncate">{issue.rule}</span>
                      </div>

                      {/* Suggestion — always visible */}
                      <p className="text-xs text-ink-1 leading-relaxed">{issue.suggestion}</p>

                      {/* Problematic text — expandable */}
                      {issue.problematic_text && (
                        <button
                          onClick={() => toggleExpand(issue.id)}
                          className="mt-1.5 flex items-center gap-1 text-[0.68rem] text-ink-3 hover:text-ink-1 transition-colors"
                        >
                          {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          {isOpen ? "Hide excerpt" : "Show excerpt"}
                        </button>
                      )}
                      {issue.problematic_text && isOpen && (
                        <div className="mt-1.5 px-2.5 py-1.5 bg-surface-1 rounded-lg border border-surface-3">
                          <p className="text-[0.7rem] font-mono text-ink-2 leading-relaxed line-clamp-3">
                            …{issue.problematic_text}…
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={() => dismiss(issue.id)}
                      className="shrink-0 p-1 rounded-md hover:bg-surface-2 text-ink-4 hover:text-ink-2 transition-colors mt-0.5"
                      aria-label="Dismiss issue"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer — dismiss all */}
      {!isLoading && visible.length > 0 && (
        <div className="px-5 py-2.5 border-t border-surface-2 flex justify-end">
          <button
            onClick={() => setDismissed(new Set(issues.map((i) => i.id)))}
            className="text-xs text-ink-3 hover:text-accent-red transition-colors"
          >
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
