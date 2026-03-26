"use client";

import { FileText, RotateCcw, Check, Upload, Search, PenLine } from "lucide-react";
import type { AppStage } from "@/app/page";

const STEPS = [
  { key: "upload" as const, label: "Upload & Configure", icon: Upload },
  { key: "questions" as const, label: "Review Gaps", icon: Search },
  { key: "editing" as const, label: "Edit & Export", icon: PenLine },
];

export default function Header({
  stage,
  onStartOver,
}: {
  stage: AppStage;
  onStartOver: () => void;
}) {
  const currentIdx = STEPS.findIndex(
    (s) =>
      s.key ===
      (stage === "analyzing" ? "upload" : stage === "generating" ? "questions" : stage)
  );

  return (
    <header className="bg-white border-b border-surface-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-700 rounded-lg flex items-center justify-center shadow-sm">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-extrabold text-ink-0 tracking-tight leading-none">
              DocCraft <span className="text-brand-600">AI</span>
            </h1>
            <p className="text-[0.7rem] text-ink-3 tracking-wide uppercase font-medium mt-0.5">
              Documentation Generator
            </p>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="hidden sm:flex items-center gap-0">
          {STEPS.map((step, i) => {
            const isCompleted = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isUpcoming = i > currentIdx;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isCompleted
                        ? "bg-accent-green text-white"
                        : isCurrent
                        ? "bg-brand-700 text-white ring-2 ring-brand-200 ring-offset-1"
                        : "bg-surface-2 text-ink-4"
                    }`}
                  >
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : i + 1}
                  </div>
                  <span
                    className={`text-xs font-semibold transition-colors ${
                      isCompleted
                        ? "text-accent-green"
                        : isCurrent
                        ? "text-brand-700"
                        : "text-ink-4"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-10 h-0.5 mx-3 rounded-full transition-colors duration-300 ${
                      isCompleted ? "bg-accent-green" : "bg-surface-3"
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
