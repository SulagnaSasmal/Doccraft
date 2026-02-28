/**
 * Terminology validator — ported from the Python CLI predecessor
 * (D:\Documentation AI Agent Setup\documentation-ai-agent\src\validators\terminology.py)
 *
 * Checks a document string against:
 *   1. Built-in MSTP (Microsoft Style Guide) baseline rules — always active
 *   2. User-supplied glossary (optional) — uploaded via the Context panel
 *
 * Runs entirely client-side. No API call needed.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GlossaryData {
  approved_terms?: string[];
  forbidden_terms?: string[];
  preferred_terms?: Record<string, string>;
}

export interface TerminologyIssue {
  term: string;
  issue_type: "forbidden" | "preferred";
  message: string;
  suggestion?: string;
}

// ─── Built-in MSTP baseline ───────────────────────────────────────────────────

/**
 * Words/phrases the Microsoft Style Guide says to avoid.
 * No replacement suggestion — just flag and remove.
 */
const MSTP_FORBIDDEN: string[] = [
  "please",
  "simply",
  "easy",
  "easily",
  "straightforward",
  "as mentioned",
  "as noted above",
  "it should be noted",
];

/**
 * Words/phrases with a specific MSTP-preferred replacement.
 * Shown with a suggestion in the UI.
 */
const MSTP_PREFERRED: Record<string, string> = {
  "utilize":              "use",
  "in order to":          "to",
  "due to the fact that": "because",
  "note that":            "**Note:**",
  "sign in":              "log in",
  "login":                "log in",
};

// ─── Core logic (mirrors Python _contains_term + validate_terminology) ────────

/**
 * Word-boundary, case-insensitive match.
 * Mirrors Python: re.search(rf"\b{re.escape(term)}\b", text, flags=re.IGNORECASE)
 */
function containsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

/**
 * Validate a document string against MSTP rules + an optional user glossary.
 *
 * Preferred terms are processed first (they carry a suggestion → more useful).
 * A term already flagged as preferred won't be re-flagged as forbidden.
 */
export function validateTerminology(
  text: string,
  glossary?: GlossaryData
): TerminologyIssue[] {
  const issues: TerminologyIssue[] = [];
  const flagged = new Set<string>(); // prevent double-flagging the same term

  // Merge built-in rules with user glossary
  const forbiddenTerms: string[] = [
    ...MSTP_FORBIDDEN,
    ...(glossary?.forbidden_terms ?? []),
  ];
  const preferredTerms: Record<string, string> = {
    ...MSTP_PREFERRED,
    ...(glossary?.preferred_terms ?? {}),
  };

  // Pass 1 — preferred terms (have a replacement suggestion)
  for (const [term, preferred] of Object.entries(preferredTerms)) {
    const key = term.toLowerCase();
    if (containsTerm(text, term)) {
      flagged.add(key);
      issues.push({
        term,
        issue_type: "preferred",
        message: `Replace "${term}" with "${preferred}".`,
        suggestion: preferred,
      });
    }
  }

  // Pass 2 — forbidden terms not already caught above
  for (const term of forbiddenTerms) {
    const key = term.toLowerCase();
    if (flagged.has(key)) continue;
    if (containsTerm(text, term)) {
      flagged.add(key);
      issues.push({
        term,
        issue_type: "forbidden",
        message: `Avoid "${term}" — Microsoft Style Guide flags this word.`,
      });
    }
  }

  return issues;
}
