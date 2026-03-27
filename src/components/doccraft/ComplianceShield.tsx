"use client";

import { ShieldCheck, ShieldAlert, ShieldOff, AlertTriangle, Loader2 } from "lucide-react";
import type { ComplianceIssue } from "@/app/api/compliance/route";

// ── PII pattern registry ─────────────────────────────────────────────────────
const PII_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "SSN",          pattern: /\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/ },
  { label: "Credit Card",  pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/ },
  { label: "Email",        pattern: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/ },
  { label: "Phone",        pattern: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/ },
  { label: "IBAN",         pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/ },
  { label: "IP Address",   pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ },
  { label: "Acct Number",  pattern: /\b(?:account\s*(?:number|#|no\.?)\s*[:–\-]?\s*)\d{6,16}\b/i },
];

function detectPII(content: string): string[] {
  return PII_PATTERNS
    .filter(({ pattern }) => pattern.test(content))
    .map(({ label }) => label);
}

interface Props {
  content: string;
  complianceIssues: ComplianceIssue[];
  complianceRan: boolean;
  complianceLoading: boolean;
}

export default function ComplianceShield({
  content,
  complianceIssues,
  complianceRan,
  complianceLoading,
}: Props) {
  const piiDetected = detectPII(content);
  const hasPII = piiDetected.length > 0;
  const errorCount = complianceIssues.filter((i) => i.severity === "error").length;
  const isVerified = complianceRan && !complianceLoading && errorCount === 0 && !hasPII;
  const isLoading = complianceLoading;

  // Overall shield state
  type ShieldState = "loading" | "verified" | "pii" | "issues" | "pending";
  const state: ShieldState = isLoading
    ? "loading"
    : hasPII
    ? "pii"
    : complianceRan && errorCount > 0
    ? "issues"
    : complianceRan
    ? "verified"
    : "pending";

  const stateConfig = {
    loading: {
      icon: Loader2,
      iconClass: "text-slate-400 animate-spin",
      label: "Scanning…",
      labelClass: "text-slate-400",
      barClass: "border-slate-700/60 bg-slate-900/70",
    },
    verified: {
      icon: ShieldCheck,
      iconClass: "text-emerald-400",
      label: "Audit-Verified",
      labelClass: "text-emerald-300 font-semibold",
      barClass: "border-emerald-700/40 bg-emerald-950/60",
    },
    pii: {
      icon: ShieldAlert,
      iconClass: "text-amber-400",
      label: "PII Detected",
      labelClass: "text-amber-300 font-semibold",
      barClass: "border-amber-700/40 bg-amber-950/60",
    },
    issues: {
      icon: ShieldAlert,
      iconClass: "text-red-400",
      label: `${errorCount} Compliance Issue${errorCount > 1 ? "s" : ""}`,
      labelClass: "text-red-300 font-semibold",
      barClass: "border-red-800/40 bg-red-950/60",
    },
    pending: {
      icon: ShieldOff,
      iconClass: "text-slate-500",
      label: "Not Yet Verified",
      labelClass: "text-slate-500",
      barClass: "border-slate-700/50 bg-slate-900/50",
    },
  }[state];

  const Icon = stateConfig.icon;

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border
                  backdrop-blur-sm mb-5 flex-wrap gap-y-2 ${stateConfig.barClass}`}
      role="status"
      aria-label="Compliance Shield"
    >
      {/* Shield status */}
      <div className="flex items-center gap-2 shrink-0">
        <Icon size={15} className={stateConfig.iconClass} />
        <span className={`text-[0.75rem] ${stateConfig.labelClass}`}>
          {stateConfig.label}
        </span>
      </div>

      {/* PII type pills */}
      {hasPII && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[0.62rem] text-amber-500/70">Patterns found:</span>
          {piiDetected.map((label) => (
            <span
              key={label}
              className="flex items-center gap-1 text-[0.62rem] font-semibold px-2 py-0.5
                         rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40"
            >
              <AlertTriangle size={9} />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Compliance issue summary */}
      {state === "issues" && !hasPII && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {complianceIssues.slice(0, 3).map((issue, i) => (
            <span
              key={i}
              className="text-[0.62rem] px-2 py-0.5 rounded-full bg-red-900/40 text-red-300
                         border border-red-800/40 truncate max-w-[160px]"
              title={issue.suggestion}
            >
              {issue.rule}
            </span>
          ))}
          {complianceIssues.length > 3 && (
            <span className="text-[0.62rem] text-red-400">
              +{complianceIssues.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Verified checkmarks */}
      {state === "verified" && (
        <div className="flex items-center gap-1.5 ml-auto">
          {["No PII", "MSTP Clean", "Audit Ready"].map((tag) => (
            <span
              key={tag}
              className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full
                         bg-emerald-900/40 text-emerald-400 border border-emerald-700/40"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
