# DocCraft — Enhancement Plan

> Working reference. Update this file as features are built.

---

## Vision

Transform DocCraft from a single-doc generator into a documentation production platform that enforces enterprise style standards and retains knowledge about the product it's documenting — making it genuinely useful for replacing manual TW work.

---

## Phase 1 — COMPLETE ✅

### What was shipped

**Feature 1: Context Layer**

A "Context Documents" panel on the upload screen. Users upload or paste:
- Previous docs (so AI writes in the same voice and structure)
- Product glossary (`.json` matching the old project's schema, or plain text)
- Company style guide (plain text)
- OpenAPI/Swagger spec (`.yaml` or `.json`)

Context is injected into both the Analyze and Generate GPT-4o calls. Up to 6 000 tokens for context, 12 000 for source material. If the user uploads a `.json` with `forbidden_terms` / `preferred_terms` keys, it is also fed into the terminology validator.

**Feature 2: MSTP Compliance Mode**

Auto-runs immediately after document generation (no button press needed). Results appear in a slide-out compliance panel with:
- Issues grouped by severity: Error / Warning / Suggestion
- One-click Fix button per issue — instant string replace for terminology, AI rewrite via `/api/refine` for voice/structure/style
- Auto-dismiss after fix with "Applied ✓" flash
- Dismiss all / dismiss individual
- Issue count badge on MSTP Check toolbar button

**Also shipped in Phase 1:**
- PDF export via browser print dialog (zero added dependencies)
- Two-pass compliance check: synchronous terminology validator → GPT-4o-mini AI check

### Files created / modified

| File | Status |
|---|---|
| `src/lib/validateTerminology.ts` | Created — TypeScript port of Python terminology validator |
| `src/components/ContextPanel.tsx` | Created — upload + paste UI, file chips, JSON glossary detection |
| `src/components/CompliancePanel.tsx` | Created — compliance sidebar, per-issue fix/dismiss |
| `src/app/api/compliance/route.ts` | Created — compliance endpoint, ComplianceIssue interface |
| `src/app/api/generate/route.ts` | Modified — contextText injection into analyze + generate |
| `src/app/api/refine/route.ts` | Modified — fix-compliance action for AI-assisted fixes |
| `src/components/DocumentEditor.tsx` | Modified — MSTP auto-run, one-click fix, PDF export |
| `src/app/page.tsx` | Modified — context state, glossaryData passthrough |

### Git commits (Phase 1)

```
52d6cac Auto-compliance, one-click fix, and PDF export
25a5103 Fix: Replace Set spread with Array.from for TS compat
b53f8b2 Step 8: Pass glossaryData to DocumentEditor
6d90bc3 Step 7: Add MSTP Check button and CompliancePanel to DocumentEditor
8c35311 Step 6: Add CompliancePanel component
3353c83 Step 5: Add MSTP compliance check API route
d5bc01d Step 4: Inject contextText into analyze and generate prompts
1d90de5 Wire ContextPanel into page state and API calls (Step 3)
f5e890f Add terminology validator and ContextPanel component
1c2f12d Fix clone URL in README to match actual repo name (Doccraft)
7f6ca6b Initial commit
```

---

## What was carried forward from `D:\Documentation AI Agent Setup`

| Old project asset | What was ported | How |
|---|---|---|
| `config/terminology/glossary.json` | Glossary schema | Same structure: `forbidden_terms[]`, `preferred_terms{}`, `approved_terms[]` |
| `src/validators/terminology.py` | Terminology validator logic | Ported to TypeScript as `src/lib/validateTerminology.ts` — synchronous, client-side |
| `config/style_rules/default.json` | Style rule schema | Expanded into MSTP rules in the compliance API prompt |
| `config/templates/*.md.j2` | Template section structure | Problem → Prerequisites → Steps → Edge Cases → Screenshots → Known Limitations → CTA informs gap analysis questions |
| `data/sample_walkthroughs/how_to.json` | Input structure | Used as example/seed input reference |

---

## Phase 2 — COMPLETE ✅

### What was shipped

| Feature | Status |
|---|---|
| **Document history** | ✅ localStorage, last 10 sessions, collapsible Recent panel, restore/delete |
| **GitHub URL input** | ✅ Third tab in Context panel — fetches public repo READMEs, files, folders via GitHub API |
| **Mermaid diagram generation** | ✅ GPT-4o generates flowchart/sequence/state; renders live; copy or insert into doc |
| **Format recommendation engine** | ✅ GPT-4o-mini analyses uploaded content (debounced 1.5s), callout with one-click accept |
| **DOCX export** | ✅ Dynamic `docx` import — headings, paragraphs, lists, bold, code → Word .docx |

### Files created / modified

| File | Status |
|---|---|
| `src/lib/useDocHistory.ts` | Created — localStorage history hook |
| `src/components/HistoryPanel.tsx` | Created — collapsible recent sessions panel |
| `src/app/api/github/route.ts` | Created — GitHub URL fetcher (supports GITHUB_TOKEN) |
| `src/app/api/diagram/route.ts` | Created — Mermaid diagram generation via GPT-4o |
| `src/app/api/recommend/route.ts` | Created — format recommendation via GPT-4o-mini |
| `src/components/DiagramPanel.tsx` | Created — Mermaid renderer with copy/insert |
| `src/app/page.tsx` | Modified — history, recommendation callout, restore session |
| `src/components/ContextPanel.tsx` | Modified — GitHub URL tab added |
| `src/components/DocumentEditor.tsx` | Modified — Diagram button, DOCX export |

### Git commit (Phase 2)

```
614dd6b feat: Phase 2 — document history, GitHub URL, Mermaid diagrams, format recommendation, DOCX export
```

### Document history detail

- Store last 10 sessions in `localStorage` keyed by timestamp
- Each session: `{ id, timestamp, config, inputSummary, generatedDoc }`
- UI: "Recent" panel on upload screen — click to restore
- Clear individual or all sessions

### GitHub URL input detail

- Input field accepting any public GitHub URL (repo, file, directory)
- Backend: fetch raw content via `github.com/raw` or GitHub API
- Auto-detect: README → context doc; OpenAPI file → spec context; `/docs` folder → batch context
- Adds fetched content to the Context Layer automatically

### Mermaid diagram generation detail

- Analyse generated doc for sequences, flows, state machines, entity relationships
- New API route: `/api/diagram` — GPT-4o generates Mermaid syntax
- Render in preview via `mermaid.js`
- User can copy or insert diagram block into doc

### Format recommendation detail

- After content upload but before doc type selection
- `/api/recommend` — GPT-4o reads content, returns `{ type, reason, alternatives[] }`
- Surfaces as a callout: "Based on your content, a **Quick Start Guide** would work best — here's why..."
- User can accept or override

### DOCX export detail

- `docx` npm package: convert markdown → DOCX AST
- Preserve headings, bold, code blocks, lists, tables
- Styled to match exported HTML (Segoe UI, correct heading sizes)

---

## Phase 3 — Future

- GitHub write-back (create PR with generated docs in target repo)
- User accounts + Supabase (save docs server-side, share links)
- Stripe monetization (free tier: 3 docs/month; Pro: unlimited)
- DALL-E infographic generation
- Video script → PPT-to-MP4 bridge
- Publish to Confluence / Notion
- Multi-doc project view (manage a doc set)

---

## Glossary JSON schema (carried forward from old project)

```json
{
  "approved_terms": ["Feature Guide", "How-to"],
  "forbidden_terms": ["FAQ", "Docs"],
  "preferred_terms": {
    "sign in": "log in",
    "login": "log in"
  }
}
```

---

## MSTP rules enforced (Phase 1)

**Forbidden words** (Error): `please`, `simply`, `just` (trivialising), `easy/easily/straightforward`, `utilize` → use `use`, `in order to` → use `to`, `due to the fact that` → use `because`, `note that` → use `**Note:**` callout, `as mentioned / as noted above`

**Voice** (Error): Passive voice; "the user" / "users" instead of "you"

**Tense** (Warning): Past tense verbs in procedure steps

**Headings** (Warning): Title Case instead of Sentence case

**Procedures** (Warning): Steps not starting with imperative verb; multiple actions per step

**Callouts** (Suggestion): Non-standard callout formatting

**Contractions** (context-aware): Flag if `config.tone === "formal"`

---

*Last updated: February 2026 — Phase 1 complete, Phase 2 starting*
