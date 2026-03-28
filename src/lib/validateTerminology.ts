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
  // Trivialising / condescending words
  "please",
  "simply",
  "easy",
  "easily",
  "straightforward",
  "of course",
  "obviously",
  "needless to say",
  // Redundant meta-references
  "as mentioned",
  "as noted above",
  "it should be noted",
  "as previously stated",
  // Inclusive language — gendered terms
  "guys",
  "mankind",
  "manpower",
  "man-hours",
  "man hours",
  "chairman",
  "fireman",
  "policeman",
  "stewardess",
  "salesman",
  // Inclusive language — gendered pronouns in doc context
  "he or she",
  "him or her",
  "his or her",
  "she or he",
  "her or him",
  "his/her",
  "he/she",
  // Jargon / buzzwords
  "synergy",
  "paradigm shift",
  "circle back",
  "deep dive",
  "move the needle",
  "low-hanging fruit",
  "boil the ocean",
  "bandwidth",
  "touch base",
  // Informal usage
  "sanity check",
  "dummy",
];

/**
 * Words/phrases with a specific MSTP-preferred replacement.
 * Preferred terms are processed first (they have a replacement suggestion).
 */
const MSTP_PREFERRED: Record<string, string> = {
  // ── Wordiness ──────────────────────────────────────────────────────────────
  "utilize":                    "use",
  "leverage":                   "use",
  "in order to":                "to",
  "due to the fact that":       "because",
  "in the event that":          "if",
  "prior to":                   "before",
  "subsequent to":              "after",
  "in close proximity to":      "near",
  "with regard to":             "about",
  "has the ability to":         "can",
  "make use of":                "use",
  "for the purpose of":         "to",
  "at this point in time":      "now",
  "in spite of the fact that":  "although",
  "at the present time":        "currently",
  "in the near future":         "soon",
  "on a regular basis":         "regularly",
  "in the majority of cases":   "usually",
  "with the exception of":      "except",
  "in addition to":             "also",
  "a large number of":          "many",
  "take into account":          "consider",
  "make a decision":            "decide",
  "provide assistance":         "help",
  "perform maintenance":        "maintain",
  "in close proximity":         "near",
  // ── Callouts (MSTP requires bold + colon format) ───────────────────────────
  "note that":                  "**Note:**",
  // ── Sign-in terminology (MSTP strongly prefers "sign in" over "log in") ────
  "log in":                     "sign in",
  "log on":                     "sign in",
  "log off":                    "sign out",
  "log out":                    "sign out",
  "sign off":                   "sign out",
  "login":                      "sign in",
  "logon":                      "sign in",
  // ── Technical term preferences ─────────────────────────────────────────────
  "abort":                      "stop",
  "execute":                    "run",
  "kill":                       "end",
  "terminate":                  "end",
  "blacklist":                  "blocklist",
  "whitelist":                  "allowlist",
  "master":                     "primary",
  "slave":                      "secondary",
  "dummy variable":             "placeholder variable",
  "dummy data":                 "sample data",
  // ── Latin abbreviations (MSTP: spell them out) ─────────────────────────────
  "e.g.":                       "for example",
  "i.e.":                       "that is",
  "etc.":                       "(list specific items)",
  "cf.":                        "see",
  "via":                        "through",
  "vs.":                        "versus",
  // ── Spelling & form ────────────────────────────────────────────────────────
  "can not":                    "cannot",
  "set-up":                     "setup",
  "back-end":                   "backend",
  "front-end":                  "frontend",
  "e-mail":                     "email",
  "web site":                   "website",
  "web-site":                   "website",
  // ── App interaction (MSTP prefers specific verbs) ──────────────────────────
  "hit":                        "press",
  "hit the button":             "select the button",
  "click on":                   "select",
  "press on":                   "select",
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
