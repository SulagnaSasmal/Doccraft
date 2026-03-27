# Claude Code Rules for DocCraft

## Architecture
- Use Next.js 15 App Router.
- Preserve existing PDF logic in `/lib/engine`.
- All new UI components must be in `/components/doccraft`.

## Design Tokens
- Border Radius: `rounded-xl` (12px)
- Shadows: Soft, multi-layered (SaaS style).
- Background: `bg-slate-950` with a subtle radial gradient.

## Interaction Pattern
- Implement CMD+K for "Global Doc Search."
- Use "Glassmorphism" for overlays and sidebars.