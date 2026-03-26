# DocCraft Product Handoff

Last updated: March 18, 2026

## Purpose

This document is the single source of truth for where DocCraft stands today, what the MVP is, what has already been built, and what remains before launch. Use this file to resume work in the next session without reconstructing context.

## Product Summary

DocCraft is an AI documentation workspace for turning raw product, API, and operations input into usable documentation that can be edited, validated, versioned, and exported.

Core positioning:

- Generate documentation from rough source material.
- Let the user edit the output directly.
- Validate output against style and compliance rules.
- Save versions and compare diffs.
- Export or hand off into existing docs workflows.

Short positioning statement:

"Generate, edit, validate, and version product documentation in one place."

## Target Users

- Product managers
- Developer advocates
- API and platform teams
- Startup founders shipping docs without a full technical writing function
- Compliance-heavy documentation owners

## MVP Definition

The real MVP is not every feature currently in the codebase. The commercial MVP is the smallest version that solves one painful workflow better than a generic chatbot.

### True MVP

1. AI document generation
2. Editable output
3. Save drafts and version history
4. Version diffing
5. Basic compliance and custom rules
6. Markdown export

### Good-to-have in MVP if stable

- Streaming generation
- HTML export
- DOCX export
- GitHub context import
- Help center links

### Not required for MVP

- Advanced CI/CD automation
- Multi-user collaboration
- Deep analytics
- Role-based permissions
- Complex enterprise governance
- Multi-repo publishing workflows

## Productized MVP Offer

Recommended initial offer:

- Solo plan
- 3 to 5 strong templates
- Limited monthly generations or fair usage
- Unlimited editing
- Version history and diff view
- Custom compliance rules
- Markdown export

Recommended V2 scope:

- Team collaboration
- Webhook-based publishing automation
- GitHub PR creation flow
- Advanced workflow automation
- Shared workspaces and permissions

## What Has Already Been Built

### Core generation and editing

- Multi-format input and context layer
- Clarification question flow before generation
- Multiple doc templates
- Audience and tone controls
- Inline AI editing actions
- Split editor and preview workflow
- Token streaming generation

### Quality and governance

- Automatic MSTP-style compliance checks
- Built-in style and terminology validation
- Custom compliance rules
- One-click fixes and dismiss actions

### Versioning and history

- Local document history
- Saved snapshots
- Version diffing between draft states

### Integrations and extensions

- GitHub URL context import
- Mermaid diagram generation
- Recommendation engine for doc type selection
- CI webhook receiver
- Automation panel in-app
- Help icon and help center references

### Export and output

- Markdown export
- HTML export
- PDF export
- DOCX export

## Current Technical Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- OpenAI models, including gpt-4o-mini for lower-latency production paths
- Supabase for auth and persistence
- Vercel for deployment
- GitHub for source control and webhook automation

## Important Repositories and Assets

- App repo: D:\doccraft
- Help center repo: D:\doccraft-help-center
- Live help center: https://sulagnasasmal.github.io/doccraft-help-center/
- Main app repo on GitHub: SulagnaSasmal/Doccraft

## Major Work Completed In This Session History

### Production stability work completed

- Fixed unsafe JSON parsing issues that caused runtime failures
- Fixed build failures and TypeScript issues
- Fixed icon import and component issues
- Added configuration guards for missing auth and database env vars
- Reduced timeout risk by moving heavy paths to lighter model/runtime combinations

### Feature work completed

- Streaming generation
- Version diffing UI
- Custom compliance rules
- CI/CD webhook support
- In-app automation/help access
- Help center updates for the new feature set

## Current State

Implementation is largely complete.

What remains is mostly launch validation, not feature development.

### Local progress already made

- Local env file was updated with `DOCCRAFT_WEBHOOK_SECRET`
- Local Next dev server was started successfully from the app directory
- Invalid-secret webhook path was exercised already

### What still needs verification

1. Real streaming generation test end to end
2. Snapshot save plus diff view test end to end
3. Custom compliance rule create/apply test end to end
4. Valid webhook secret success-path test
5. Production verification on Vercel after env vars are updated

## Production Environment Variables

Required or effectively required:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DOCCRAFT_WEBHOOK_SECRET`

Optional depending on workflow:

- `GITHUB_TOKEN`

## Launch Blockers

These are the remaining blockers before a confident launch:

1. Add `DOCCRAFT_WEBHOOK_SECRET` in Vercel
2. Redeploy production after env var update
3. Run the smoke test against the deployed app

## Smoke Test Checklist

Run this locally and then again on the live deployment.

### Smoke test flow

1. Open the app
2. Upload or paste representative product or API content
3. Generate a document and verify streaming output appears progressively
4. Confirm generated output renders correctly in the editor/preview
5. Save a snapshot
6. Modify the document
7. Open diff view and confirm snapshot comparison works
8. Add a custom compliance rule
9. Re-run validation and confirm the custom rule is enforced
10. Call the CI webhook endpoint with the correct secret and confirm success response

### Expected outcome

- No runtime crash
- No malformed JSON response handling
- No blocked generation flow
- Snapshot and diff work without data loss
- Custom rule appears in results when applicable
- Webhook rejects bad secret and accepts valid secret

## Suggested Productization Path

Do not treat every implemented feature as part of the first paid offer. Package around the shortest path to value.

### MVP messaging

DocCraft helps teams turn raw product input into editable, compliant, versioned documentation faster than manual drafting.

### First value promise

"Paste messy product input, get a polished first draft, clean it up with built-in checks, and export it for publishing."

### Recommended launch scope

- Generation
- Editing
- History and diff
- Custom rules
- Markdown export

### Defer in messaging until stable adoption

- Heavy automation claims
- Team workflow claims
- Enterprise governance positioning
- Complex publishing workflow promises

## Pricing Direction

Keep the initial pricing simple.

### Suggested first pricing model

- Free: limited generations, basic export
- Pro: more generations, version history, compliance rules, diffing, premium export
- Team: later, once shared workflows are proven

## Help Center and Documentation Status

The help center was already updated to reflect the newer feature set, including automation and feature workflow guidance.

Areas already covered:

- Getting started
- Generate workflow
- Release notes and feature updates
- Workflow guidance

## Resume Here Next Session

If work resumes tomorrow or later, start in this order:

1. Confirm Vercel has `DOCCRAFT_WEBHOOK_SECRET`
2. Run production smoke test
3. Record results in this file
4. Decide launch scope and pricing page copy
5. Draft launch announcement and landing page copy

## Decision Log

- Focus productization on a narrow, credible MVP rather than every implemented capability
- Treat automation as a secondary differentiator, not the core initial promise
- Keep launch centered on documentation generation, editing, validation, and versioning

## Notes For Future Updates

When revisiting this file, add:

- Actual production smoke test results
- Final launch date
- Pricing decision
- Landing page positioning
- First user segment to target