"use client";

import { useState } from "react";
import { ImageIcon, Loader2, Download, RefreshCw, X } from "lucide-react";

const STYLES = [
  { key: "summary",   label: "Summary Grid",  desc: "Structured info graphic with sections" },
  { key: "flowchart", label: "Flowchart",      desc: "Process diagram with directional arrows" },
  { key: "concept",   label: "Concept Map",   desc: "Central topic with satellite nodes" },
  { key: "timeline",  label: "Timeline",      desc: "Horizontal milestone timeline" },
];

export default function InfographicPanel({
  content,
  onClose,
}: {
  content: string;
  onClose: () => void;
}) {
  const [style, setStyle] = useState("summary");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setImageUrl(null);

    try {
      const res = await fetch("/api/infographic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, style }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      setImageUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Failed to generate infographic");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `doccraft-infographic-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback — open in new tab
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <div className="border border-surface-3 rounded-2xl bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-2 bg-surface-1">
        <div className="flex items-center gap-2">
          <ImageIcon size={15} className="text-brand-600" />
          <span className="text-sm font-semibold text-ink-0">DALL-E Infographic</span>
          <span className="text-[0.65rem] text-ink-4 font-medium uppercase tracking-wide bg-surface-2 px-2 py-0.5 rounded-full">
            Phase 3
          </span>
        </div>
        <button onClick={onClose} className="text-ink-4 hover:text-ink-1 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="p-5">
        {/* Style selector */}
        <p className="text-xs font-medium text-ink-2 mb-2">Visual style</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {STYLES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStyle(s.key)}
              className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                style === s.key
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-surface-3 text-ink-2 hover:border-brand-200 hover:bg-brand-50/40"
              }`}
            >
              <span className="font-semibold block">{s.label}</span>
              <span className="text-ink-4 leading-tight">{s.desc}</span>
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-700 text-white text-sm font-semibold rounded-xl hover:bg-brand-800 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Generating with DALL-E 3…
            </>
          ) : (
            <>
              <ImageIcon size={14} />
              Generate Infographic
            </>
          )}
        </button>

        {error && (
          <p className="mt-3 text-xs text-accent-red bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Generated image */}
        {imageUrl && (
          <div className="mt-4">
            <img
              src={imageUrl}
              alt="Generated documentation infographic"
              className="w-full rounded-xl border border-surface-3 shadow-sm"
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={downloadImage}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 text-white text-xs font-semibold rounded-lg hover:bg-brand-800 transition-colors"
              >
                <Download size={12} />
                Download PNG
              </button>
              <button
                onClick={generate}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-surface-3 text-ink-2 text-xs font-medium rounded-lg hover:bg-surface-2 transition-colors"
              >
                <RefreshCw size={12} />
                Regenerate
              </button>
              <p className="text-[0.65rem] text-ink-4 ml-1">
                DALL-E 3 · 1792×1024
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
