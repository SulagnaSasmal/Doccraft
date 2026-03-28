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
  Download,
  BookOpen,
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

// ─── Readability ──────────────────────────────────────────────────────────────

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

interface ReadabilityStats {
  fleschEase: number;
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
}

function calcReadability(content: string): ReadabilityStats | null {
  // Strip markdown formatting before analysis
  const text = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/#{1,6}\s+.+/g, " ")
    .replace(/[*_~|>]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().split(/\s+/).length > 3);
  const words = text.split(/\s+/).filter((w) => w.replace(/[^a-zA-Z]/g, "").length > 0);

  if (words.length < 10 || sentences.length === 0) return null;

  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const fleschEase = Math.round(
    Math.max(0, Math.min(100,
      206.835
      - 1.015 * (words.length / sentences.length)
      - 84.6 * (syllableCount / words.length)
    ))
  );

  return {
    fleschEase,
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgSentenceLength: Math.round(words.length / sentences.length),
    avgSyllablesPerWord: Math.round((syllableCount / words.length) * 10) / 10,
  };
}

function fleschLabel(score: number): { label: string; color: string; bg: string; hint: string } {
  if (score >= 70) return { label: "Easy", color: "text-accent-green", bg: "bg-green-50", hint: "Well-suited for general audiences" };
  if (score >= 60) return { label: "Standard", color: "text-accent-green", bg: "bg-green-50", hint: "Good for most technical docs" };
  if (score >= 50) return { label: "Fairly Difficult", color: "text-accent-amber", bg: "bg-amber-50", hint: "Consider simplifying some sentences" };
  if (score >= 30) return { label: "Difficult", color: "text-accent-amber", bg: "bg-amber-50", hint: "High reading demand — target: 50–70" };
  return { label: "Very Difficult", color: "text-accent-red", bg: "bg-red-50", hint: "Very dense — significantly simplify" };
}

// ─── CLIENT-SIDE LINTING RULES ────────────────────────────────────────────────

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
  const seen = new Map<string, number>();
  const defined = new Set<string>();

  const defRegex = /[A-Za-z][\w\s]+\(([A-Z]{2,6})\)/g;
  let d: RegExpExecArray | null;
  while ((d = defRegex.exec(content)) !== null) {
    defined.add(d[1]);
  }

  const COMMON = new Set(["AI", "OK", "ID", "UI", "UX", "OR", "IT", "VS", "TO", "AT", "IN",
    "ON", "IF", "DO", "HTML", "CSS", "JSON", "CSV", "PDF", "URL", "HTTP", "HTTPS", "API",
    "FAQ", "MD", "SDK", "CLI", "GUI", "CMS", "SLA", "SLO", "KPI", "ROI", "CTA", "SSO",
    "MFA", "TLS", "SSL", "DNS", "IP", "TCP", "REST", "SOAP", "JWT", "SQL", "AWS", "GCP",
    "CI", "CD", "VM", "OS", "DB", "QA", "PII", "GDPR", "SaaS", "PaaS", "IaaS"]);

  let m: RegExpExecArray | null;
  while ((m = acronymRegex.exec(content)) !== null) {
    const acr = m[1];
    if (COMMON.has(acr)) continue;
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
  const firstH1 = lines.findIndex((l) => /^# /.test(l));
  if (firstH1 === -1) return [];
  const nextHeading = lines.findIndex((l, i) => i > firstH1 && /^#{1,3} /.test(l));
  if (nextHeading === -1) return [];
  const bodyBetween = lines.slice(firstH1 + 1, nextHeading).filter((l) => !l.startsWith("#"));
  const introWords = bodyBetween.join(" ").split(/\s+/).filter(Boolean).length;
  if (introWords < 10) {
    return [{
      id: "missing-intro",
      rule: "Missing introduction",
      severity: "warning",
      message: "The document lacks an introductory paragraph after the main heading. Add context about what this document covers.",
      excerpt: lines[firstH1].slice(0, 60),
      offset: content.indexOf(lines[firstH1]),
      length: lines[firstH1].length,
    }];
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
    [/\bit is important to note that\b/gi, "**Note:**"],
    [/\bprior to\b/gi, "before"],
    [/\bin spite of the fact that\b/gi, "although"],
    [/\bmake use of\b/gi, "use"],
    [/\bprovide assistance\b/gi, "help"],
    [/\btake into account\b/gi, "consider"],
    [/\bmake a decision\b/gi, "decide"],
    [/\bwith the exception of\b/gi, "except"],
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
  if (foundFirstHeading && wordCount > 400) {
    issues.push({
      id: `long-block-end`,
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
    const before = content.slice(Math.max(0, m.index - 5), m.index);
    if (before.includes("#") || before.includes("`")) continue;
    issues.push({
      id: `vague-${m.index}`,
      rule: "Vague language",
      severity: "info",
      message: `"${m[0]}" is vague — specify an exact quantity or list specifics.`,
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
  return [{
    id: "missing-code",
    rule: "Missing code example",
    severity: "error",
    message: "API reference documents should include at least one code example.",
    excerpt: "No code blocks found",
    offset: 0,
    length: 0,
  }];
}

function findMissingSteps(content: string, docType: string): LintIssue[] {
  if (!["user-guide", "quick-start", "troubleshooting"].includes(docType)) return [];
  if (/^\d+\.\s/m.test(content) || /^(Step\s+\d)/mi.test(content)) return [];
  return [{
    id: "missing-steps",
    rule: "Missing numbered steps",
    severity: "warning",
    message: "This document type typically includes numbered steps or a procedure. Consider adding a step-by-step section.",
    excerpt: "No numbered list found",
    offset: 0,
    length: 0,
  }];
}

// ─── NEW: Bad link text ───────────────────────────────────────────────────────

function findBadLinkText(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const patterns: [RegExp, string][] = [
    [/\[click here\]/gi, 'Use descriptive link text — describe the destination instead of "click here"'],
    [/\[here\]/gi, '"here" is not descriptive — use the page or section title as the link text'],
    [/\[this page\]/gi, '"this page" is vague — use the page title as link text'],
    [/\[this link\]/gi, '"this link" is vague — use the destination name as link text'],
    [/\[this article\]/gi, '"this article" is vague — use the article title as link text'],
    [/\[read more\]/gi, '"Read more" is vague — describe what the reader will learn'],
    [/\[learn more\]/gi, '"Learn more" is vague — describe what the reader will learn'],
    [/\[more information\]/gi, 'Use a specific link label instead of "more information"'],
  ];
  for (const [regex, msg] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      issues.push({
        id: `link-${m.index}`,
        rule: "Non-descriptive link text",
        severity: "warning",
        message: msg,
        excerpt: m[0],
        offset: m.index,
        length: m[0].length,
      });
    }
  }
  return issues;
}

// ─── NEW: Callout format enforcement ─────────────────────────────────────────

function findBadCallouts(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  // Flag ALL-CAPS callout keywords not formatted per MSTP (bold + colon)
  const badPatterns: [RegExp, string, string][] = [
    [/^NOTE:/gm, "NOTE:", "**Note:**"],
    [/^WARNING:/gm, "WARNING:", "**Warning:**"],
    [/^CAUTION:/gm, "CAUTION:", "**Caution:**"],
    [/^TIP:/gm, "TIP:", "**Tip:**"],
    [/^IMPORTANT:/gm, "IMPORTANT:", "**Important:**"],
    // Also catch lowercase without bold
    [/^note:/gm, "note:", "**Note:**"],
    [/^warning:/gm, "warning:", "**Warning:**"],
    [/^caution:/gm, "caution:", "**Caution:**"],
    [/^tip:/gm, "tip:", "**Tip:**"],
    [/^important:/gm, "important:", "**Important:**"],
  ];
  for (const [regex, found, expected] of badPatterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      issues.push({
        id: `callout-${m.index}`,
        rule: "Callout format",
        severity: "warning",
        message: `Use "${expected}" (bold + colon) per MSTP callout format, not "${found}"`,
        excerpt: m[0],
        offset: m.index,
        length: m[0].length,
      });
    }
  }
  return issues;
}

// ─── NEW: Number formatting ───────────────────────────────────────────────────

function findNumberFormatting(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  // MSTP: numbers 10 and above should use numerals, not words
  const largeWords = [
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
    "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
    "hundred", "thousand", "million", "billion",
  ];
  // Only flag when NOT at start of sentence and NOT inside a heading
  const pattern = new RegExp(`\\b(${largeWords.join("|")})\\b`, "gi");
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content)) !== null) {
    const before = content.slice(Math.max(0, m.index - 80), m.index);
    // Skip if at start of sentence (preceded by . or newline)
    if (/[.!?\n]\s*$/.test(before)) continue;
    // Skip if inside a heading
    const lineStart = content.lastIndexOf("\n", m.index);
    const lineContent = content.slice(lineStart + 1, m.index);
    if (/^#{1,6}\s/.test(lineContent.trimStart())) continue;
    // Skip if inside a code block
    const codesBefore = (content.slice(0, m.index).match(/```/g) || []).length;
    if (codesBefore % 2 !== 0) continue;

    issues.push({
      id: `num-${m.index}`,
      rule: "Number formatting",
      severity: "info",
      message: `MSTP: use numerals for numbers 10 and above — replace "${m[0]}" with its digit form.`,
      excerpt: m[0],
      offset: m.index,
      length: m[0].length,
    });
  }
  return issues;
}

// ─── NEW: Parallel structure in lists ────────────────────────────────────────

function findParallelStructure(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  // Find consecutive list blocks (3+ items)
  const lines = content.split("\n");
  let listStart = -1;
  let listItems: Array<{ text: string; lineIdx: number }> = [];

  const checkBlock = () => {
    if (listItems.length < 3) return;
    // Check: inconsistent trailing punctuation
    const endsWithPeriod = listItems.map((item) => /[.!?]$/.test(item.text.trim()));
    const hasperiod = endsWithPeriod.filter(Boolean).length;
    if (hasperiod > 0 && hasperiod < listItems.length) {
      const offset = content.indexOf(listItems[0].text);
      issues.push({
        id: `parallel-punct-${listStart}`,
        rule: "Inconsistent list punctuation",
        severity: "info",
        message: `Some list items end with punctuation and others don't. Either all items should end with a period or none should.`,
        excerpt: listItems[0].text.slice(0, 60),
        offset: offset >= 0 ? offset : 0,
        length: listItems[0].text.length,
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const isList = /^(\s*[-*+]|\s*\d+\.)\s/.test(lines[i]);
    if (isList) {
      if (listStart === -1) listStart = i;
      // Strip the bullet/number prefix to get item content
      listItems.push({ text: lines[i].replace(/^\s*[-*+\d.]+\s+/, ""), lineIdx: i });
    } else {
      if (listItems.length > 0) {
        checkBlock();
        listStart = -1;
        listItems = [];
      }
    }
  }
  if (listItems.length > 0) checkBlock();
  return issues;
}

// ─── NEW: Gender-neutral language ─────────────────────────────────────────────

function findGenderLanguage(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const patterns: [RegExp, string][] = [
    [/\bhe\s+(?:is|was|has|had|will|would|can|could|should|shall|may|might|does|did)\b/gi, 'Use "they" — MSTP recommends gender-neutral language'],
    [/\bshe\s+(?:is|was|has|had|will|would|can|could|should|shall|may|might|does|did)\b/gi, 'Use "they" — MSTP recommends gender-neutral language'],
    [/\bhis\s+(?:own|[a-z])/gi, 'Use "their" — MSTP recommends gender-neutral language'],
    [/\bher\s+(?:own|[a-z])/gi, 'Use "their" — MSTP recommends gender-neutral language'],
    [/\bhe\/she\b/gi, 'Use "they" instead of "he/she"'],
    [/\bhis\/her\b/gi, 'Use "their" instead of "his/her"'],
    [/\bhe or she\b/gi, 'Use "they" instead of "he or she"'],
    [/\bhim or her\b/gi, 'Use "them" instead of "him or her"'],
    [/\bhis or her\b/gi, 'Use "their" instead of "his or her"'],
    [/\bmankind\b/gi, 'Use "humanity" or "people" instead of "mankind"'],
    [/\bmanpower\b/gi, 'Use "workforce" or "staff" instead of "manpower"'],
    [/\bman-hours\b/gi, 'Use "person-hours" instead of "man-hours"'],
  ];
  for (const [regex, msg] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      // Skip code blocks
      const codesBefore = (content.slice(0, m.index).match(/```/g) || []).length;
      if (codesBefore % 2 !== 0) continue;
      issues.push({
        id: `gender-${m.index}`,
        rule: "Gendered language",
        severity: "warning",
        message: msg,
        excerpt: m[0],
        offset: m.index,
        length: m[0].length,
      });
    }
  }
  return issues;
}

// ─── Score calculation ────────────────────────────────────────────────────────

function calcScore(issues: LintIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 8;
    else if (issue.severity === "warning") score -= 3;
    else score -= 1;
  }
  return Math.max(0, Math.min(100, score));
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportLintReport(issues: LintIssue[], score: number, readability: ReadabilityStats | null): void {
  const lines: string[] = [
    "# Style Guide Lint Report",
    `Generated: ${new Date().toLocaleString()}`,
    `Lint Score: ${score}/100`,
  ];

  if (readability) {
    lines.push(
      "",
      "## Readability",
      `- Flesch Reading Ease: ${readability.fleschEase}/100`,
      `- Word Count: ${readability.wordCount}`,
      `- Sentence Count: ${readability.sentenceCount}`,
      `- Avg Sentence Length: ${readability.avgSentenceLength} words`,
      `- Avg Syllables/Word: ${readability.avgSyllablesPerWord}`,
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  lines.push("", `## Summary`, `- Errors: ${errors.length}`, `- Warnings: ${warnings.length}`, `- Suggestions: ${infos.length}`);

  const renderGroup = (label: string, group: LintIssue[]) => {
    if (group.length === 0) return;
    lines.push("", `## ${label}`);
    for (const issue of group) {
      lines.push(`### ${issue.rule}`);
      lines.push(`**Message:** ${issue.message}`);
      if (issue.excerpt) lines.push(`**Excerpt:** \`${issue.excerpt}\``);
      lines.push("");
    }
  };
  renderGroup("Errors", errors);
  renderGroup("Warnings", warnings);
  renderGroup("Suggestions", infos);

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lint-report-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  error: { color: "text-accent-red", bg: "bg-red-50", border: "border-red-100", label: "Error" },
  warning: { color: "text-accent-amber", bg: "bg-amber-50", border: "border-amber-100", label: "Warning" },
  info: { color: "text-brand-600", bg: "bg-brand-50", border: "border-brand-100", label: "Info" },
};

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [readabilityExpanded, setReadabilityExpanded] = useState(false);
  const [semanticIssues, setSemanticIssues] = useState<LintIssue[]>([]);
  const [loadingSemantic, setLoadingSemantic] = useState(false);
  const [semanticRan, setSemanticRan] = useState(false);

  const readabilityStats = useMemo(() => calcReadability(content), [content]);

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
      ...findBadLinkText(content),
      ...findBadCallouts(content),
      ...findNumberFormatting(content),
      ...findParallelStructure(content),
      ...findGenderLanguage(content),
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
    <div className="bg-surface-0 rounded-2xl shadow-card border border-surface-3 overflow-hidden mt-6 animate-fade-in-up">
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
          {/* Readability stats bar */}
          {readabilityStats && (
            <div className="px-5 py-3 bg-surface-1/70 border-b border-surface-2">
              <button
                onClick={(e) => { e.stopPropagation(); setReadabilityExpanded((v) => !v); }}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={12} className="text-brand-500" />
                  <span className="text-xs font-semibold text-ink-1">Readability</span>
                  {(() => {
                    const r = fleschLabel(readabilityStats.fleschEase);
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-[0.62rem] font-bold ${r.bg} ${r.color}`}>
                        {r.label} — {readabilityStats.fleschEase}/100
                      </span>
                    );
                  })()}
                  <span className="text-[0.68rem] text-ink-3 ml-1">
                    {readabilityStats.wordCount} words · avg {readabilityStats.avgSentenceLength} words/sentence
                  </span>
                </div>
                <span className="text-[0.65rem] text-ink-4 group-hover:text-ink-2">
                  {readabilityExpanded ? "hide" : "details"}
                </span>
              </button>
              {readabilityExpanded && (
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Flesch Ease", value: `${readabilityStats.fleschEase}/100`, hint: "Target: 50–70" },
                    { label: "Words", value: readabilityStats.wordCount.toLocaleString() },
                    { label: "Avg Sentence", value: `${readabilityStats.avgSentenceLength} wds`, hint: "Target: <20" },
                    { label: "Syllables/Word", value: readabilityStats.avgSyllablesPerWord, hint: "Target: <2" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface-0 rounded-lg px-3 py-2 border border-surface-3 text-center">
                      <p className="text-[0.62rem] text-ink-3 uppercase tracking-wide">{stat.label}</p>
                      <p className="text-sm font-bold text-ink-0 mt-0.5">{stat.value}</p>
                      {stat.hint && <p className="text-[0.58rem] text-ink-4 mt-0.5">{stat.hint}</p>}
                    </div>
                  ))}
                </div>
              )}
              {readabilityExpanded && (
                <p className="text-[0.62rem] text-ink-4 mt-2">
                  {fleschLabel(readabilityStats.fleschEase).hint}
                </p>
              )}
            </div>
          )}

          {/* Toolbar: AI lint + Export */}
          <div className="px-5 py-3 bg-surface-1 border-b border-surface-2 flex items-center justify-between gap-2">
            <span className="text-xs text-ink-2 flex-1 min-w-0">
              {semanticRan
                ? `AI analysis complete — ${semanticIssues.length} additional issue${semanticIssues.length !== 1 ? "s" : ""} found`
                : "Run AI analysis for semantic rules (terminology, inconsistency)"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportLintReport(allIssues, score, readabilityStats ?? null)}
                title="Download lint report as Markdown"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-ink-2
                           bg-surface-0 hover:bg-surface-2 border border-surface-3 rounded-lg transition-colors"
              >
                <Download size={12} />
                Export
              </button>
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
                {loadingSemantic ? "Analyzing…" : semanticRan ? "Re-run AI" : "Run AI Lint"}
              </button>
            </div>
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
