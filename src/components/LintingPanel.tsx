"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";

export interface LintIssue {
  id: string;
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  excerpt: string; // the offending text
  offset: number;  // char offset in content
  length: number;
}

// ---- CLIENT-SIDE LINTING RULES ----

function findPassiveVoice(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const pattern =
    /\b(is|are|was|were|be|been|being)\s+([\w]+ed|[\w]+en)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content)) !== null) {
    issues.push({
      id: `passive-${m.index}`,
      rule: "Passive voice detected",
      severity: "warning",
      message: `Consider rewriting in active voice: "${m[0]}"`,
      excerpt: m[0],
      offset: m.index,
      length: m[0].length,
    });
  }
  return issues;
}

function findLongSentences(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  // Split on sentence boundaries, track offset
  const sentenceRegex = /[^.!?\n]+[.!?]*/g;
  let m: RegExpExecArray | null;
  while ((m = sentenceRegex.exec(content)) !== null) {
    const sentence = m[0].trim();
    if (sentence.startsWith("#") || sentence.startsWith("|")) continue;
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length > 30) {
      issues.push({
        id: `long-${m.index}`,
        rule: "Sentence over 30 words",
        severity: "warning",
        message: `This sentence has ${words.length} words. Aim for under 30 for readability.`,
        excerpt: sentence.slice(0, 80) + (sentence.length > 80 ? "…" : ""),
        offset: m.index,
        length: sentence.length,
      });
    }
  }
  return issues;
}

function findUndefinedAcronyms(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const acronymRegex = /\b([A-Z]{2,6})\b/g;
  const seen = new Map<string, number>(); // acronym -> first occurrence offset
  const defined = new Set<string>();

  // First pass: find all definitions (e.g., "Application Programming Interface (API)")
  const defRegex = /[A-Za-z][\w\s]+\(([A-Z]{2,6})\)/g;
  let d: RegExpExecArray | null;
  while ((d = defRegex.exec(content)) !== null) {
    defined.add(d[1]);
  }

  // Second pass: find acronyms used before definition
  let m: RegExpExecArray | null;
  while ((m = acronymRegex.exec(content)) !== null) {
    const acr = m[1];
    // Skip common non-acronyms
    if (["AI", "OK", "ID", "UI", "UX", "OR", "IT", "VS", "TO", "AT", "IN", "ON", "IF", "DO", "HTML", "CSS", "JSON", "CSV", "PDF", "URL", "HTTP", "HTTPS", "API", "FAQ", "MD"].includes(acr)) continue;
    if (!seen.has(acr)) {
      seen.set(acr, m.index);
      if (!defined.has(acr)) {
        issues.push({
          id: `acronym-${m.index}`,
          rule: "Undefined acronym",
          severity: "info",
          message: `"${acr}" is used without being spelled out first.`,
          excerpt: acr,
          offset: m.index,
          length: acr.length,
        });
      }
    }
  }
  return issues;
}

function findMissingIntroduction(content: string): LintIssue[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 3) return [];
  // Check if first heading is H1 and there's a paragraph before the next heading
  const firstH1 = lines.findIndex((l) => /^# /.test(l));
  if (firstH1 === -1) return [];
  const nextHeading = lines.findIndex(
    (l, i) => i > firstH1 && /^#{1,3} /.test(l)
  );
  if (nextHeading === -1) return [];
  const bodyBetween = lines.slice(firstH1 + 1, nextHeading).filter((l) => !l.startsWith("#"));
  const introWords = bodyBetween.join(" ").split(/\s+/).filter(Boolean).length;
  if (introWords < 10) {
    return [
      {
        id: "missing-intro",
        rule: "Missing introduction section",
        severity: "warning",
        message:
          "The document appears to lack an introductory paragraph after the main heading. Add context about what this document covers.",
        excerpt: lines[firstH1].slice(0, 60),
        offset: content.indexOf(lines[firstH1]),
        length: lines[firstH1].length,
      },
    ];
  }
  return [];
}

function findWordiness(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const patterns: [RegExp, string][] = [
    [/\bin order to\b/gi, "to"],
    [/\bdue to the fact that\b/gi, "because"],
    [/\bat this point in time\b/gi, "now"],
    [/\bin the event that\b/gi, "if"],
    [/\bfor the purpose of\b/gi, "to"],
    [/\bhas the ability to\b/gi, "can"],
    [/\bin close proximity to\b/gi, "near"],
    [/\bwith regard to\b/gi, "about"],
    [/\bit is important to note that\b/gi, "note:"],
    [/\bprior to\b/gi, "before"],
    [/\bin spite of the fact that\b/gi, "although"],
    [/\bmake use of\b/gi, "use"],
  ];
  for (const [regex, replacement] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      issues.push({
        id: `wordy-${m.index}`,
        rule: "Wordiness",
        severity: "info",
        message: `"${m[0]}" → consider using "${replacement}" instead.`,
        excerpt: m[0],
        offset: m.index,
        length: m[0].length,
      });
    }
  }
  return issues;
}

function findLongUnheadedBlocks(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split("\n");
  let wordCount = 0;
  let blockStart = 0;
  let foundFirstHeading = false;

  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6} /.test(lines[i])) {
      if (foundFirstHeading && wordCount > 400) {
        issues.push({
          id: `long-block-${blockStart}`,
          rule: "Heading missing after 400+ words",
          severity: "warning",
          message: `${wordCount} words of body text without a heading break. Add a subheading for scannability.`,
          excerpt: lines[blockStart]?.slice(0, 60) || "",
          offset: content.indexOf(lines[blockStart]),
          length: 1,
        });
      }
      wordCount = 0;
      blockStart = i + 1;
      foundFirstHeading = true;
    } else {
      wordCount += lines[i].split(/\s+/).filter(Boolean).length;
    }
  }
  // Check trailing block
  if (foundFirstHeading && wordCount > 400) {
    issues.push({
      id: `long-block-${blockStart}`,
      rule: "Heading missing after 400+ words",
      severity: "warning",
      message: `${wordCount} words of body text without a heading break.`,
      excerpt: lines[blockStart]?.slice(0, 60) || "",
      offset: content.indexOf(lines[blockStart]),
      length: 1,
    });
  }
  return issues;
}

function findVagueLanguage(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const pattern =
    /\b(some|various|several|many|a number of|a lot of|numerous|a few|certain)\b(?!\s+(of the|specific|defined))/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content)) !== null) {
    // Skip if inside a heading or code block
    const before = content.slice(Math.max(0, m.index - 5), m.index);
    if (before.includes("#") || before.includes("`")) continue;
    issues.push({
      id: `vague-${m.index}`,
      rule: "Vague language",
      severity: "info",
      message: `"${m[0]}" is vague — consider specifying an exact quantity or listing specifics.`,
      excerpt: content.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20),
      offset: m.index,
      length: m[0].length,
    });
  }
  return issues;
}

function findMissingCodeExample(content: string, docType: string): LintIssue[] {
  if (docType !== "api-reference") return [];
  if (/```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content)) return [];
  return [
    {
      id: "missing-code",
      rule: "Missing code example",
      severity: "error",
      message:
        "API reference documents should include at least one code example.",
      excerpt: "No code blocks found",
      offset: 0,
      length: 0,
    },
  ];
}

function findMissingSteps(content: string, docType: string): LintIssue[] {
  if (!["user-guide", "quick-start", "troubleshooting"].includes(docType)) return [];
  if (/^\d+\.\s/m.test(content) || /^(Step\s+\d)/mi.test(content)) return [];
  return [
    {
      id: "missing-steps",
      rule: "Missing numbered steps",
      severity: "warning",
      message:
        "This document type typically includes numbered steps or a procedure. Consider adding a step-by-step section.",
      excerpt: "No numbered list found",
      offset: 0,
      length: 0,
    },
  ];
}

// Score calculation
function calcScore(issues: LintIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 8;
    else if (issue.severity === "warning") score -= 3;
    else score -= 1;
  }
  return Math.max(0, Math.min(100, score));
}

const SEVERITY_CONFIG = {
  error: { color: "text-accent-red", bg: "bg-red-50", border: "border-red-100", label: "Error" },
  warning: { color: "text-accent-amber", bg: "bg-amber-50", border: "border-amber-100", label: "Warning" },
  info: { color: "text-brand-600", bg: "bg-brand-50", border: "border-brand-100", label: "Info" },
};

export default function LintingPanel({
  content,
  docType,
  onHighlight,
}: {
  content: string;
  docType: string;
  onHighlight: (offset: number, length: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [semanticIssues, setSemanticIssues] = useState<LintIssue[]>([]);
  const [loadingSemantic, setLoadingSemantic] = useState(false);
  const [semanticRan, setSemanticRan] = useState(false);

  const clientIssues = useMemo(() => {
    if (!content.trim()) return [];
    return [
      ...findPassiveVoice(content),
      ...findLongSentences(content),
      ...findUndefinedAcronyms(content),
      ...findMissingIntroduction(content),
      ...findWordiness(content),
      ...findLongUnheadedBlocks(content),
      ...findVagueLanguage(content),
      ...findMissingCodeExample(content, docType),
      ...findMissingSteps(content, docType),
    ];
  }, [content, docType]);

  const allIssues = useMemo(
    () => [...clientIssues, ...semanticIssues],
    [clientIssues, semanticIssues]
  );

  const score = useMemo(() => calcScore(allIssues), [allIssues]);

  const runSemanticLint = useCallback(async () => {
    setLoadingSemantic(true);
    try {
      const res = await fetch("/api/lint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.slice(0, 8000), docType }),
      });
      if (res.ok) {
        const data = await res.json();
        setSemanticIssues(data.issues || []);
      }
    } catch {
      // Silently fail — client-side rules still work
    } finally {
      setLoadingSemantic(false);
      setSemanticRan(true);
    }
  }, [content, docType]);

  const scoreColor =
    score >= 80 ? "text-accent-green" : score >= 60 ? "text-accent-amber" : "text-accent-red";
  const scoreBg =
    score >= 80 ? "bg-green-50" : score >= 60 ? "bg-amber-50" : "bg-red-50";

  const errorCount = allIssues.filter((i) => i.severity === "error").length;
  const warnCount = allIssues.filter((i) => i.severity === "warning").length;
  const infoCount = allIssues.filter((i) => i.severity === "info").length;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-surface-3 overflow-hidden mt-6 animate-fade-in-up">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-1 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-brand-600" />
          <span className="font-display font-bold text-ink-0 text-base">Style Guide Lint</span>
          <div className="flex items-center gap-2 ml-2">
            {errorCount > 0 && (
              <span className="px-2 py-0.5 bg-red-50 text-accent-red text-[0.65rem] font-bold rounded-full">
                {errorCount} error{errorCount > 1 ? "s" : ""}
              </span>
            )}
            {warnCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-50 text-accent-amber text-[0.65rem] font-bold rounded-full">
                {warnCount} warning{warnCount > 1 ? "s" : ""}
              </span>
            )}
            {infoCount > 0 && (
              <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[0.65rem] font-bold rounded-full">
                {infoCount} suggestion{infoCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full ${scoreBg} ${scoreColor} text-sm font-extrabold`}>
            {score}/100
          </div>
          {expanded ? <ChevronUp size={16} className="text-ink-3" /> : <ChevronDown size={16} className="text-ink-3" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-surface-2">
          {/* Semantic lint button */}
          <div className="px-5 py-3 bg-surface-1 border-b border-surface-2 flex items-center justify-between">
            <span className="text-xs text-ink-2">
              {semanticRan
                ? `AI analysis complete — ${semanticIssues.length} additional issue${semanticIssues.length !== 1 ? "s" : ""} found`
                : "Run AI analysis for semantic rules (terminology, inconsistency)"}
            </span>
            <button
              onClick={runSemanticLint}
              disabled={loadingSemantic}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700
                         bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingSemantic ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {loadingSemantic ? "Analyzing…" : semanticRan ? "Re-run" : "Run AI Lint"}
            </button>
          </div>

          {/* Issues list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-surface-2">
            {allIssues.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <ShieldCheck size={28} className="text-accent-green mx-auto mb-2" />
                <p className="text-sm font-medium text-ink-1">No issues found</p>
                <p className="text-xs text-ink-3 mt-1">Your document looks great!</p>
              </div>
            ) : (
              allIssues.map((issue) => {
                const sev = SEVERITY_CONFIG[issue.severity];
                return (
                  <button
                    key={issue.id}
                    onClick={() => onHighlight(issue.offset, issue.length)}
                    className="w-full text-left px-5 py-3 hover:bg-surface-1 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[0.6rem] font-bold uppercase ${sev.bg} ${sev.color} ${sev.border} border`}
                      >
                        {sev.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink-0">{issue.rule}</p>
                        <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">
                          {issue.message}
                        </p>
                        {issue.excerpt && (
                          <p className="mt-1 text-[0.7rem] text-ink-3 font-mono truncate group-hover:text-brand-600 transition-colors">
                            <Eye size={10} className="inline mr-1 -mt-0.5" />
                            {issue.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
