"use client";

import { Settings2, FileType2, Users, Volume2 } from "lucide-react";
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
    <div className="bg-surface-0 rounded-2xl shadow-card border border-surface-3 overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-2 flex items-center gap-2">
        <Settings2 size={16} className="text-brand-500" />
        <h2 className="font-display font-semibold text-ink-0 text-[0.95rem]">Configuration</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Document Type */}
        <div className="bg-surface-1 rounded-xl p-4 border border-surface-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-1 mb-2 uppercase tracking-wider">
            <FileType2 size={13} className="text-brand-500" />
            Document Type
          </label>
          <div className="space-y-1.5">
            {DOC_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => update("docType", t.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                  config.docType === t.value
                    ? "bg-brand-700 text-white shadow-sm"
                    : "bg-surface-0 text-ink-2 hover:bg-surface-2 border border-surface-3"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-colors ${
                  config.docType === t.value ? "bg-white border-white" : "border-ink-3"
                }`} />
                <div className="flex flex-col min-w-0">
                  <span>{t.label}</span>
                  <span className={`text-[0.62rem] font-normal leading-tight mt-0.5 ${
                    config.docType === t.value ? "text-white/70" : "text-ink-4"
                  }`}>{t.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div className="bg-surface-1 rounded-xl p-4 border border-surface-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-1 mb-2 uppercase tracking-wider">
            <Users size={13} className="text-brand-500" />
            Audience
          </label>
          <div className="space-y-1.5">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => update("audience", a.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                  config.audience === a.value
                    ? "bg-brand-700 text-white shadow-sm"
                    : "bg-surface-0 text-ink-2 hover:bg-surface-2 border border-surface-3"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-colors ${
                  config.audience === a.value ? "bg-white border-white" : "border-ink-3"
                }`} />
                <div className="flex flex-col min-w-0">
                  <span>{a.label}</span>
                  <span className={`text-[0.62rem] font-normal leading-tight mt-0.5 ${
                    config.audience === a.value ? "text-white/70" : "text-ink-4"
                  }`}>{a.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div className="bg-surface-1 rounded-xl p-4 border border-surface-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-1 mb-2 uppercase tracking-wider">
            <Volume2 size={13} className="text-brand-500" />
            Tone
          </label>
          <div className="space-y-1.5">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => update("tone", t.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                  config.tone === t.value
                    ? "bg-brand-700 text-white shadow-sm"
                    : "bg-surface-0 text-ink-2 hover:bg-surface-2 border border-surface-3"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-colors ${
                  config.tone === t.value ? "bg-white border-white" : "border-ink-3"
                }`} />
                <div className="flex flex-col min-w-0">
                  <span>{t.label}</span>
                  <span className={`text-[0.62rem] font-normal leading-tight mt-0.5 ${
                    config.tone === t.value ? "text-white/70" : "text-ink-4"
                  }`}>{t.desc}</span>
                </div>
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
