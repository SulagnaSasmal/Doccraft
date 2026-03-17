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
- **Token streaming output** — Watch documentation arrive live while the model generates it
- **5 document templates** — User Guide, Quick Start, API Reference, Troubleshooting, Release Notes
- **Audience-aware** — Adjusts language for technical, non-technical, or mixed audiences
- **Format recommendation** — AI analyses your uploaded content and suggests the best doc type before you configure

### Editing
- **Inline AI editing** — Select any text → Simplify, Expand, Add Example, Make Concise, Troubleshoot
- **Live split editor** — Edit Markdown on the left, see a styled preview on the right (Edit / Split / Preview modes)
- **Version diffing** — Compare the current draft against the original output or saved snapshots side-by-side
- **Saved snapshots** — Capture revision checkpoints before major edits or publish actions
- **Mermaid diagram generator** — Generate a flowchart, sequence diagram, or state diagram from your document with one click; insert directly into the doc

### MSTP Compliance (auto-runs after generation)
- **Automatic compliance check** — Runs the moment your document is generated, no button press needed
- **Microsoft Style Guide rules** — Checks for forbidden words, passive voice, Title Case headings, non-imperative procedure steps, incorrect callout formatting, and terminology drift
- **Custom compliance profiles** — Add company-specific rules, trigger terms, and replacement hints on top of MSTP
- **One-click Fix** — Apply a fix instantly per issue: instant string replace for terminology, AI-assisted rewrite for voice/structure/style issues
- **Severity levels** — Errors, Warnings, and Suggestions — sorted and color-coded
- **Dismiss per issue or all** — Full control over what you act on

### Automation
- **CI/CD webhook endpoint** — Trigger doc generation from repo pushes, release events, or manual pipelines
- **Auto-publish option** — Webhook jobs can open a GitHub PR or commit generated docs directly back to a repo

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
| AI | OpenAI GPT-4o-mini (all generation, compliance, inline edits) |
| Preview | React Markdown |
| Icons | Lucide React |

---

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add environment variables:
   - `OPENAI_API_KEY` — required for AI generation
   - `NEXT_PUBLIC_SUPABASE_URL` — required for auth and cloud save
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required for auth and cloud save
   - `GITHUB_TOKEN` — optional, for GitHub repo imports
        - `DOCCRAFT_WEBHOOK_SECRET` — required if you want CI/CD or GitHub Actions to call the webhook endpoint
4. Deploy

Vercel auto-deploys on every push to `main`.

### CI/CD webhook payload

POST to `/api/webhooks/ci` with either the `x-doccraft-secret` header or a `Bearer` token matching `DOCCRAFT_WEBHOOK_SECRET`.

```json
{
        "repositoryUrl": "https://github.com/owner/repo",
        "branch": "main",
        "changedFiles": ["src/api/payments.ts", "README.md"],
        "docType": "release-notes",
        "audience": "mixed",
        "tone": "instructional",
        "customInstructions": "Generate concise release notes for customer-facing docs.",
        "customRules": [
                {
                        "id": "ga-only",
                        "name": "No beta language",
                        "instruction": "Do not describe shipped features as beta or experimental.",
                        "severity": "error",
                        "triggerTerms": ["beta", "experimental"],
                        "replacement": "general availability"
                }
        ],
        "publish": {
                "enabled": true,
                "repoUrl": "https://github.com/owner/repo",
                "filePath": "docs/releases/latest.md",
                "action": "pr"
        }
}
```

### GitHub Actions example

```yaml
name: Auto Docs

on:
        push:
                branches: [main]

jobs:
        doccraft:
                runs-on: ubuntu-latest
                steps:
                        - name: Trigger DocCraft webhook
                                run: |
                                        curl -X POST "https://your-app.vercel.app/api/webhooks/ci" \
                                                -H "Content-Type: application/json" \
                                                -H "x-doccraft-secret: ${{ secrets.DOCCRAFT_WEBHOOK_SECRET }}" \
                                                -d '{
                                                        "repository": {"html_url": "https://github.com/${{ github.repository }}"},
                                                        "ref": "${{ github.ref }}",
                                                        "changedFiles": ["README.md"],
                                                        "docType": "release-notes",
                                                        "publish": {
                                                                "enabled": true,
                                                                "repoUrl": "https://github.com/${{ github.repository }}",
                                                                "filePath": "docs/releases/latest.md",
                                                                "action": "pr"
                                                        }
                                                }'
```

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

### Phase 3 — Complete ✅
- [x] User accounts + cloud storage (Supabase auth + document library)
- [x] GitHub write-back — create a PR with generated docs in one click
- [x] Publish to Confluence / Notion
- [x] Team collaboration and review workflows (team workspaces + invite codes)
- [x] DALL-E infographic generation from document content

### Phase 4 — In Progress 🚧
- [x] Streaming responses — stream AI output token-by-token for instant feedback
- [ ] Multi-language output — generate docs in Spanish, French, German, Japanese
- [x] Version diffing — compare two document versions side-by-side
- [x] Custom compliance rule sets — upload your own style rules beyond MSTP
- [x] Webhook / CI integration — auto-generate docs on repo push via GitHub Actions

### Phase 5 — Marketability & Growth 🚀
- [ ] **Landing page** — marketing site with feature showcase, demo video, testimonials, and pricing
- [ ] **Freemium pricing model** — Free tier (5 docs/month, 3 exports) → Pro ($12/mo: unlimited docs, priority API, team features) → Enterprise (custom: SSO, audit logs, SLA)
- [ ] **Template marketplace** — community-contributed doc templates (onboarding guides, SOPs, runbooks, incident reports, design docs)
- [ ] **Chrome extension** — right-click any web page → send content to DocCraft for instant documentation
- [ ] **VS Code extension** — generate docs from code comments, README stubs, or selected code blocks without leaving the editor
- [ ] **REST API / SDK** — headless API for CI/CD pipelines, enabling auto-doc generation on every pull request
- [ ] **White-label / embed** — embeddable widget that other SaaS products can integrate into their own dashboards
- [ ] **Analytics dashboard** — doc generation stats, compliance scores over time, team productivity metrics
- [ ] **SSO / SAML** — enterprise single sign-on (Okta, Azure AD, Google Workspace)
- [ ] **Audit log** — full history of who generated, edited, approved, and published each document
- [ ] **Custom branding** — teams can set their logo, colors, and footer on exported documents
- [ ] **Approval workflows** — route generated docs through review → approve → publish pipeline with email notifications
- [ ] **Slack / Teams bot** — `/doccraft generate` from a channel; share generated docs directly in chat
- [ ] **Doc quality score** — AI-powered readability + completeness + compliance composite score per document
- [ ] **SEO optimization** — auto-generate meta descriptions, slugs, and structured data for published docs

---

## Competitive Positioning

| Feature | DocCraft AI | Notion AI | GitBook | ReadMe | Mintlify |
|---|---|---|---|---|---|
| AI doc generation from raw content | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gap analysis before writing | ✅ | ❌ | ❌ | ❌ | ❌ |
| MSTP compliance checking | ✅ | ❌ | ❌ | ❌ | ❌ |
| One-click compliance fix | ✅ | ❌ | ❌ | ❌ | ❌ |
| AI inline editing (simplify, expand, etc.) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mermaid diagram generation | ✅ | ❌ | ❌ | ❌ | ✅ |
| Multi-format export (HTML, MD, PDF, DOCX) | ✅ | Partial | Partial | ❌ | ❌ |
| GitHub PR publishing | ✅ | ❌ | ✅ | ❌ | ✅ |
| Glossary + terminology enforcement | ✅ | ❌ | ❌ | ❌ | ❌ |
| Free self-hosted option | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## License

MIT
