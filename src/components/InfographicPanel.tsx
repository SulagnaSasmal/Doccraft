"use client";

import { useState, useEffect, useRef } from "react";
import { BarChart2, Loader2, Copy, Check, Plus, RefreshCw, X, ChevronRight } from "lucide-react";
import { safeResJson } from "@/lib/safeResJson";

const VISUAL_TYPES = [
  { key: "mindmap",   label: "Mind Map",  desc: "Topic hierarchy & relationships" },
  { key: "timeline",  label: "Timeline",  desc: "Phases, steps & milestones" },
  { key: "flowchart", label: "Flowchart", desc: "Process flow & decisions" },
  { key: "pie",       label: "Pie Chart", desc: "Topic / component distribution" },
];

export default function InfographicPanel({
  content,
  onInsert,
  onClose,
}: {
  content: string;
  onInsert?: (mermaidBlock: string) => void;
  onClose: () => void;
}) {
  const [style, setStyle]             = useState("mindmap");
  const [mermaidCode, setMermaidCode] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [copied, setCopied]           = useState(false);
  const [renderError, setRenderError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const generate = async (type = style) => {
    setLoading(true);
    setError("");
    setMermaidCode("");
    setRenderError("");
    try {
      const res = await fetch("/api/infographic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, style: type }),
      });
      const data = await safeResJson(res);
      if (!res.ok) throw new Error(data.error || "Visual generation failed");
      setMermaidCode(data.mermaid);
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on mount
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render whenever Mermaid code changes
  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return;
    setRenderError("");
    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        const id = `dc-visual-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        if (containerRef.current) containerRef.current.innerHTML = svg;
      } catch {
        setRenderError("Diagram syntax error — try regenerating");
      }
    };
    render();
  }, [mermaidCode]);

  const handleTypeChange = (type: string) => {
    setStyle(type);
    generate(type);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertIntoDoc = () => {
    onInsert?.(`\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n\n`);
    onClose();
  };

  return (
    <div className="border border-surface-3 rounded-2xl bg-surface-0 shadow-card overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-2">
        <div className="flex items-center gap-2">
          <BarChart2 size={15} className="text-brand-600" />
          <span className="text-sm font-semibold text-ink-0">Visual Generator</span>
          <span className="text-[0.65rem] text-ink-4 font-medium uppercase tracking-wide bg-surface-2 px-2 py-0.5 rounded-full">
            Mermaid
          </span>
        </div>
        <button onClick={onClose} className="text-ink-4 hover:text-ink-1 transition-colors" aria-label="Close">
          <X size={15} />
        </button>
      </div>

      <div className="p-4">
        {/* Visual type selector */}
        <div className="grid grid-cols-4 gap-1 mb-4 p-0.5 bg-surface-1 rounded-xl border border-surface-2">
          {VISUAL_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTypeChange(t.key)}
              disabled={loading}
              title={t.desc}
              className={`py-1.5 px-1 rounded-lg text-[0.68rem] font-medium transition-all disabled:opacity-50 ${
                style === t.key
                  ? "bg-surface-0 text-ink-0 shadow-sm"
                  : "text-ink-3 hover:text-ink-1"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-ink-3 gap-2">
            <Loader2 size={18} className="animate-spin text-brand-500" />
            <span className="text-sm">Generating…</span>
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
            <div className="border border-surface-2 rounded-xl p-3 bg-surface-1 overflow-auto min-h-[120px]">
              {renderError ? (
                <p className="text-xs text-accent-red text-center py-6">{renderError}</p>
              ) : (
                <div ref={containerRef} className="flex justify-center [&>svg]:max-w-full" />
              )}
            </div>

            {/* Mermaid source (collapsible) */}
            <details className="group">
              <summary className="text-xs text-ink-3 cursor-pointer hover:text-ink-1 transition-colors select-none list-none flex items-center gap-1">
                <ChevronRight size={11} className="transition-transform group-open:rotate-90 shrink-0" />
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
                {copied ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy code"}
              </button>
              {onInsert && (
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
