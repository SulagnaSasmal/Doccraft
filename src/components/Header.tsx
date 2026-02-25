"use client";

import { FileText, RotateCcw } from "lucide-react";
import type { AppStage } from "@/app/page";

const STAGE_LABELS: Record<AppStage, string> = {
  upload: "Upload & Configure",
  analyzing: "Analyzing…",
  questions: "Review Gaps",
  generating: "Generating…",
  editing: "Edit & Export",
};

export default function Header({
  stage,
  onStartOver,
}: {
  stage: AppStage;
  onStartOver: () => void;
}) {
  const stages: AppStage[] = ["upload", "questions", "editing"];

  return (
    <header className="bg-white border-b border-surface-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-700 rounded-lg flex items-center justify-center shadow-sm">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-ink-0 tracking-tight leading-none">
              DocCraft <span className="text-brand-600">AI</span>
            </h1>
            <p className="text-[0.7rem] text-ink-3 tracking-wide uppercase font-medium mt-0.5">
              Documentation Generator
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="hidden sm:flex items-center gap-1">
          {stages.map((s, i) => {
            const current = stages.indexOf(
              stage === "analyzing" ? "upload" : stage === "generating" ? "questions" : stage
            );
            const isActive = i <= current;
            const isCurrent = i === current;
            return (
              <div key={s} className="flex items-center">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                    isCurrent
                      ? "bg-brand-100 text-brand-700 ring-1 ring-brand-200"
                      : isActive
                      ? "bg-accent-green/10 text-accent-green"
                      : "bg-surface-2 text-ink-4"
                  }`}
                >
                  {STAGE_LABELS[s]}
                </div>
                {i < stages.length - 1 && (
                  <div
                    className={`w-6 h-px mx-1 transition-colors ${
                      isActive && i < current ? "bg-accent-green" : "bg-surface-3"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {stage !== "upload" && (
          <button
            onClick={onStartOver}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-2
                       hover:text-ink-0 hover:bg-surface-2 rounded-lg transition-colors"
          >
            <RotateCcw size={13} />
            Start Over
          </button>
        )}
      </div>
    </header>
  );
}
