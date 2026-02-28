# DocCraft AI — Intelligent Documentation Generator

> **Live demo:** [doccraft-ten.vercel.app](https://doccraft-ten.vercel.app/)
> **GitHub:** [github.com/SulagnaSasmal/Doccraft](https://github.com/SulagnaSasmal/Doccraft)

Transform raw content into polished, structured documentation using AI. Feed it meeting notes, specs, screenshots, or any raw material — it analyzes gaps like a senior technical writer, asks clarifying questions, then generates publication-ready documentation with built-in Microsoft Style Guide compliance.

---

## Features

### Input & Context
- **Multi-format input** — Upload text files, paste content, drag-and-drop images
- **Context Layer** — Upload previous docs, style guides, glossaries, or OpenAPI specs to make the AI write consistently with your existing content
- **GitHub URL input** — Paste any public GitHub repo, file, or folder URL — content fetched and added to context automatically
- **Structured glossary** — Upload a `.json` glossary with `forbidden_terms`, `preferred_terms`, and `approved_terms` to enforce your terminology automatically

### Generation
- **Smart gap analysis** — AI identifies missing information, ambiguities, and assumptions before writing
- **Interactive Q&A loop** — Answer questions to improve output quality, skip what you don't know
- **5 document templates** — User Guide, Quick Start, API Reference, Troubleshooting, Release Notes
- **Audience-aware** — Adjusts language for technical, non-technical, or mixed audiences
- **Format recommendation** — AI analyses your uploaded content and suggests the best doc type before you configure

### Editing
- **Inline AI editing** — Select any text → Simplify, Expand, Add Example, Make Concise, Troubleshoot
- **Live split editor** — Edit Markdown on the left, see a styled preview on the right (Edit / Split / Preview modes)
- **Mermaid diagram generator** — Generate a flowchart, sequence diagram, or state diagram from your document with one click; insert directly into the doc

### MSTP Compliance (auto-runs after generation)
- **Automatic compliance check** — Runs the moment your document is generated, no button press needed
- **Microsoft Style Guide rules** — Checks for forbidden words, passive voice, Title Case headings, non-imperative procedure steps, incorrect callout formatting, and terminology drift
- **One-click Fix** — Apply a fix instantly per issue: instant string replace for terminology, AI-assisted rewrite for voice/structure/style issues
- **Severity levels** — Errors, Warnings, and Suggestions — sorted and color-coded
- **Dismiss per issue or all** — Full control over what you act on

### Export
- **HTML export** — Styled, standalone HTML file ready to publish
- **Markdown export** — Clean `.md` file for your repo
- **PDF export** — Browser print dialog with print-ready formatting
- **DOCX export** — Download as a Word `.docx` file with headings, lists, and formatting preserved
- **Copy to clipboard** — One click

### History
- **Document history** — Last 10 sessions saved to localStorage automatically; restore any previous document with one click

---

## How It Works

```
Upload raw content (files, paste, drag-drop)
        ↓
Add context docs (optional: previous docs, glossary, style guide, OpenAPI spec)
        ↓
Configure: doc type + audience + tone
        ↓
AI analyzes → flags gaps → asks clarifying questions
        ↓
You answer (or skip) questions
        ↓
AI generates structured documentation
        ↓
MSTP compliance check runs automatically
        ↓
Review issues → one-click Fix or dismiss
        ↓
Edit with inline AI tools → Export HTML / Markdown / PDF
```

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/SulagnaSasmal/Doccraft.git
cd Doccraft
npm install
```

### 2. Add your OpenAI API key

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your key:
```
OPENAI_API_KEY=sk-your_actual_key_here
```

Get a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Glossary JSON Format

Upload a `.json` file matching this schema to enforce terminology automatically:

```json
{
  "approved_terms": ["Feature Guide", "How-to"],
  "forbidden_terms": ["FAQ", "Docs"],
  "preferred_terms": {
    "sign in": "log in",
    "login": "log in",
    "utilize": "use"
  }
}
```

- `forbidden_terms` — flagged as Errors in the compliance panel
- `preferred_terms` — flagged as Suggestions with one-click replacement
- `approved_terms` — accepted as correct, not flagged

---

## MSTP Rules Enforced

| Category | Severity | What's checked |
|---|---|---|
| Forbidden words | Error | `please`, `simply`, `just` (trivialising), `easy/easily/straightforward`, `utilize`, `in order to`, `due to the fact that`, `note that`, `as mentioned` |
| Voice | Error | Passive voice; "the user" instead of "you" |
| Tense | Warning | Past tense verbs in procedure steps |
| Headings | Warning | Title Case instead of Sentence case |
| Procedures | Warning | Steps not starting with imperative verb; multiple actions joined by "and then" |
| Callouts | Suggestion | Non-standard callout formatting (NOTE:, > Note:) |
| Terminology | Error/Suggestion | Based on uploaded glossary |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | OpenAI GPT-4o (generation + compliance), GPT-4o-mini (inline edits + quick fixes) |
| Preview | React Markdown |
| Icons | Lucide React |

---

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add environment variable: `OPENAI_API_KEY`
4. Deploy

Vercel auto-deploys on every push to `main`.

---

## Roadmap

### Phase 1 — Complete ✅
- [x] Context Layer (previous docs, glossaries, style guides, OpenAPI spec)
- [x] MSTP Compliance Mode (auto-run, one-click fix, severity levels)
- [x] Terminology validator (synchronous, client-side, glossary JSON)
- [x] PDF export

### Phase 2 — Complete ✅
- [x] Document history — collapsible Recent panel, restore last 10 sessions from localStorage
- [x] GitHub URL input — paste any public GitHub repo/file/folder URL → fetched as context automatically
- [x] Mermaid diagram generation — GPT-4o generates flowchart, sequence, or state diagrams; rendered live; insert into doc with one click
- [x] Format recommendation engine — AI analyses your uploaded content and suggests the best doc type (with one-click accept)
- [x] DOCX export — download your document as a Word `.docx` file

### Phase 3 — Future
- [ ] User accounts + cloud storage (Supabase)
- [ ] GitHub write-back (create PR with generated docs)
- [ ] Publish to Confluence / Notion
- [ ] Team collaboration and review workflows
- [ ] DALL-E infographic generation

---

## License

MIT
