# DocCraft AI — Intelligent Documentation Generator

Transform raw content into polished, structured documentation using AI. Feed it meeting notes, specs, screenshots, or any raw material — it analyzes gaps like a senior technical writer, asks clarifying questions, then generates publication-ready documentation.

## Features

- **Multi-format input** — Upload text files, paste content, drag-and-drop images
- **Smart gap analysis** — AI identifies missing info, ambiguities, and assumptions before writing
- **Interactive Q&A loop** — Answer questions to improve output quality, skip what you don't know
- **5 document templates** — User Guide, Quick Start, API Reference, Troubleshooting, Release Notes
- **Audience-aware** — Adjusts language for technical, non-technical, or mixed audiences
- **Inline AI editing** — Select text → Simplify, Expand, Add Example, Make Concise
- **Live split editor** — Edit markdown on the left, see styled preview on the right
- **Export** — Download as styled HTML or Markdown

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/SulagnaSasmal/documentation-ai-agent.git
cd documentation-ai-agent
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

## How It Works

```
Upload raw content (files, paste, drag-drop)
        ↓
Configure: doc type + audience + tone
        ↓
AI analyzes → flags gaps → asks clarifying questions
        ↓
You answer (or skip) questions
        ↓
AI generates structured documentation
        ↓
Edit with inline AI tools → Export HTML/Markdown
```

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **OpenAI API** (GPT-4o for generation, GPT-4o-mini for inline edits)
- **React Markdown** (live preview)

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add environment variable: `OPENAI_API_KEY`
4. Deploy

## Roadmap

- [ ] PDF and DOCX file parsing (backend)
- [ ] Image analysis via GPT-4o Vision
- [ ] Rich text editor (TipTap)
- [ ] Git integration (version history, diff view)
- [ ] Publish API (Confluence, Notion, GitBook)
- [ ] DOCX export
- [ ] Team collaboration and review workflows
- [ ] Custom style guide upload

## License

MIT
