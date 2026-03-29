# DocCraft Bridge Architecture

## 1. Unified Workspace (The Bridge)
- **Route:** `/workspace/[file]`
- **The Center:** High-fidelity document viewer (HTML/PDF/MD).
- **The Left:** Navigation tree reflecting `D:\doccraft-help-center`.
- **The Right (The Engine):** Collapsible tabs for 'Split', 'Merge', and 'OCR'. 
- **The Goal:** Perform all processing without leaving the file view.

## 2. Agentic Toolbars
- If file == PDF: Enable 'Atomicizer' (Split) & 'Assembler' (Merge).
- If file == Image: Enable 'Ingestion' (OCR).
- Global: Enable 'Compliance Check' (FinTech Audit).

## 3. Persistent State
- The 'Recent Activity' sidebar must update in real-time as the Processing Engine finishes tasks.
- Use a 'Toast' notification system for technical logs (e.g., "Page 4 split successful, 202kb saved").