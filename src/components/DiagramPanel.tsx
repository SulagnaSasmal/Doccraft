"use client";

import { useState, useEffect, useRef } from "react";
import { GitGraph, Loader2, Copy, Check, Plus, RefreshCw, X, ChevronDown } from "lucide-react";

type DiagramType = "flowchart" | "sequenceDiagram" | "stateDiagram-v2";

const DIAGRAM_TYPES: { value: DiagramType; label: string }[] = [
  { value: "flowchart", label: "Flowchart" },
  { value: "sequenceDiagram", label: "Sequence" },
  { value: "stateDiagram-v2", label: "State" },
];

export default function DiagramPanel({
  document,
  onInsert,
  onClose,
}: {
  document: string;
  onInsert: (mermaidBlock: string) => void;
  onClose: () => void;
}) {
  const [mermaidCode, setMermaidCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [diagramType, setDiagramType] = useState<DiagramType>("flowchart");
  const [renderError, setRenderError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const generate = async (type: DiagramType = diagramType) => {
    setLoading(true);
    setError("");
    setMermaidCode("");
    setRenderError("");
    try {
      const res = await fetch("/api/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, diagramType: type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setMermaidCode(data.mermaid);
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on first mount
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render diagram when code changes
  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return;
    setRenderError("");

    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
        });
        const id = `dc-diagram-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        setRenderError("Diagram syntax error — try regenerating");
      }
    };
    render();
  }, [mermaidCode]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTypeChange = (type: DiagramType) => {
    setDiagramType(type);
    generate(type);
  };

  const insertIntoDoc = () => {
    onInsert(`\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n\n`);
    onClose();
  };

  return (
    <div className="mt-4 bg-white rounded-2xl border border-surface-3 shadow-card overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitGraph size={15} className="text-brand-500" />
          <span className="font-semibold text-ink-0 text-sm">Diagram Generator</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Diagram type pills */}
          <div className="flex bg-surface-1 rounded-lg p-0.5 border border-surface-2">
            {DIAGRAM_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTypeChange(t.value)}
                disabled={loading}
                className={`px-2.5 py-1 rounded-md text-[0.7rem] font-medium transition-colors disabled:opacity-50 ${
                  diagramType === t.value
                    ? "bg-white text-ink-0 shadow-sm"
                    : "text-ink-3 hover:text-ink-1"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-3 transition-colors"
            aria-label="Close diagram panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-12 text-ink-3 gap-2">
            <Loader2 size={18} className="animate-spin text-brand-500" />
            <span className="text-sm">Generating diagram…</span>
          </div>
        )}

        {!loading && error && (
          <div className="py-8 text-center">
            <p className="text-sm text-accent-red mb-3">{error}</p>
            <button
              onClick={() => generate()}
              className="px-4 py-2 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && mermaidCode && (
          <div className="space-y-3">
            {/* Rendered diagram */}
            <div className="border border-surface-2 rounded-xl p-4 bg-surface-1 overflow-auto min-h-32">
              {renderError ? (
                <p className="text-xs text-accent-red text-center py-6">{renderError}</p>
              ) : (
                <div ref={containerRef} className="flex justify-center [&>svg]:max-w-full" />
              )}
            </div>

            {/* Mermaid source code (collapsed) */}
            <details className="group">
              <summary className="text-xs text-ink-3 cursor-pointer hover:text-ink-1 transition-colors select-none flex items-center gap-1 list-none">
                <ChevronDown
                  size={12}
                  className="transition-transform group-open:rotate-180 shrink-0"
                />
                View Mermaid source
              </summary>
              <pre className="mt-2 px-3 py-2.5 bg-surface-1 border border-surface-2 rounded-lg text-[0.68rem] font-mono text-ink-2 overflow-auto whitespace-pre-wrap">
                {mermaidCode}
              </pre>
            </details>

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                onClick={() => generate()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-2
                           hover:bg-surface-2 rounded-lg border border-surface-3 transition-colors"
              >
                <RefreshCw size={12} />
                Regenerate
              </button>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-2
                           hover:bg-surface-2 rounded-lg border border-surface-3 transition-colors"
              >
                {copied ? (
                  <Check size={12} className="text-accent-green" />
                ) : (
                  <Copy size={12} />
                )}
                {copied ? "Copied" : "Copy code"}
              </button>
              <button
                onClick={insertIntoDoc}
                disabled={!!renderError}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 text-white text-xs
                           font-semibold rounded-lg hover:bg-brand-800 transition-colors shadow-sm
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
                Insert into doc
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
