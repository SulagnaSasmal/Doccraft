"use client";

import { Settings2 } from "lucide-react";
import type { DocConfig } from "@/app/page";

const DOC_TYPES = [
  { value: "user-guide", label: "User Guide", desc: "Comprehensive end-user documentation" },
  { value: "quick-start", label: "Quick Start", desc: "Get up and running fast" },
  { value: "api-reference", label: "API Reference", desc: "Technical API documentation" },
  { value: "troubleshooting", label: "Troubleshooting Guide", desc: "Problem → Solution format" },
  { value: "release-notes", label: "Release Notes", desc: "What's new and changed" },
];

const AUDIENCES = [
  { value: "non-technical", label: "Non-Technical", desc: "End users, no jargon" },
  { value: "technical", label: "Technical", desc: "Developers & engineers" },
  { value: "mixed", label: "Mixed", desc: "Both technical & non-technical" },
];

const TONES = [
  { value: "conversational", label: "Conversational", desc: "Friendly & approachable" },
  { value: "formal", label: "Formal", desc: "Professional & enterprise" },
  { value: "instructional", label: "Instructional", desc: "Direct & action-oriented" },
];

export default function ConfigPanel({
  config,
  onChange,
}: {
  config: DocConfig;
  onChange: (c: DocConfig) => void;
}) {
  const update = (key: keyof DocConfig, value: string) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="bg-white rounded-2xl shadow-card border border-surface-3 overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-2 flex items-center gap-2">
        <Settings2 size={16} className="text-brand-500" />
        <h2 className="font-display font-semibold text-ink-0 text-[0.95rem]">Configuration</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Document Type */}
        <div>
          <label className="block text-xs font-semibold text-ink-1 mb-1.5 uppercase tracking-wider">
            Document Type
          </label>
          <select
            value={config.docType}
            onChange={(e) => update("docType", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-3 bg-surface-1 text-sm text-ink-0
                       focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="text-[0.7rem] text-ink-3 mt-1">
            {DOC_TYPES.find((t) => t.value === config.docType)?.desc}
          </p>
        </div>

        {/* Audience */}
        <div>
          <label className="block text-xs font-semibold text-ink-1 mb-1.5 uppercase tracking-wider">
            Audience
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                onClick={() => update("audience", a.value)}
                className={`px-2 py-2 rounded-lg text-xs font-medium text-center transition-all ${
                  config.audience === a.value
                    ? "bg-brand-100 text-brand-700 ring-1 ring-brand-200"
                    : "bg-surface-1 text-ink-2 hover:bg-surface-2 border border-surface-3"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-xs font-semibold text-ink-1 mb-1.5 uppercase tracking-wider">
            Tone
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => update("tone", t.value)}
                className={`px-2 py-2 rounded-lg text-xs font-medium text-center transition-all ${
                  config.tone === t.value
                    ? "bg-brand-100 text-brand-700 ring-1 ring-brand-200"
                    : "bg-surface-1 text-ink-2 hover:bg-surface-2 border border-surface-3"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Instructions */}
        <div>
          <label className="block text-xs font-semibold text-ink-1 mb-1.5 uppercase tracking-wider">
            Custom Instructions
            <span className="font-normal normal-case text-ink-3 ml-1">(optional)</span>
          </label>
          <textarea
            value={config.customInstructions}
            onChange={(e) => update("customInstructions", e.target.value)}
            placeholder="E.g., 'Use our brand voice guidelines', 'Include screenshots placeholders', 'Focus on mobile app features'…"
            className="w-full h-20 px-3 py-2 rounded-lg border border-surface-3 bg-surface-1 text-xs
                       text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-brand-200
                       focus:border-brand-400 resize-none transition-all"
          />
        </div>
      </div>
    </div>
  );
}
