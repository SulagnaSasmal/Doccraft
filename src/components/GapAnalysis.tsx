"use client";

import { useState } from "react";
import { AlertCircle, HelpCircle, AlertTriangle, ArrowLeft, ArrowRight, SkipForward, Star, CircleDot } from "lucide-react";
import type { GapQuestion } from "@/app/page";

const CATEGORY_CONFIG = {
  missing: {
    icon: AlertCircle,
    label: "Missing Info",
    color: "text-accent-red",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  ambiguous: {
    icon: HelpCircle,
    label: "Ambiguous",
    color: "text-accent-amber",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  assumption: {
    icon: AlertTriangle,
    label: "Assumption",
    color: "text-accent-teal",
    bg: "bg-teal-50",
    border: "border-teal-100",
  },
};

export default function GapAnalysis({
  questions,
  onSubmit,
  onBack,
}: {
  questions: GapQuestion[];
  onSubmit: (answered: GapQuestion[]) => void;
  onBack: () => void;
}) {
  const [localQuestions, setLocalQuestions] = useState<GapQuestion[]>(questions);

  const updateAnswer = (id: string, answer: string) => {
    setLocalQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer, skipped: false } : q))
    );
  };

  const toggleSkip = (id: string) => {
    const q = localQuestions.find((q) => q.id === id);
    if (q?.priority === "critical") return; // Critical cannot be skipped
    setLocalQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, skipped: !q.skipped, answer: "" } : q))
    );
  };

  const skipAllOptional = () => {
    setLocalQuestions((prev) =>
      prev.map((q) =>
        q.priority === "optional" ? { ...q, skipped: true, answer: "" } : q
      )
    );
  };

  const answered = localQuestions.filter((q) => q.answer.trim() || q.skipped).length;
  const total = localQuestions.length;
  const criticalQuestions = localQuestions.filter((q) => q.priority === "critical");
  const optionalQuestions = localQuestions.filter((q) => q.priority === "optional");
  const criticalAnswered = criticalQuestions.filter((q) => q.answer.trim()).length;
  const allOptionalSkipped = optionalQuestions.every((q) => q.skipped);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1 mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to upload
        </button>
        <h2 className="font-display text-2xl font-extrabold text-ink-0">
          Information Gap Analysis
        </h2>
        <p className="text-sm text-ink-2 mt-1">
          The AI identified {total} questions — <strong className="text-accent-red">{criticalQuestions.length} critical</strong> and{" "}
          <strong className="text-ink-2">{optionalQuestions.length} optional</strong>.
          Answer critical questions for best results.
        </p>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-ink-2">
            {answered}/{total}
          </span>
        </div>

        {/* Skip all optional button */}
        {optionalQuestions.length > 0 && !allOptionalSkipped && (
          <button
            onClick={skipAllOptional}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-ink-2
                       bg-surface-1 border border-surface-3 hover:bg-surface-2 rounded-lg transition-colors"
          >
            <SkipForward size={13} />
            Skip all optional questions
          </button>
        )}
      </div>

      {/* Critical Questions */}
      {criticalQuestions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-accent-red fill-accent-red" />
            <span className="text-xs font-bold text-accent-red uppercase tracking-wider">
              Required for generation
            </span>
          </div>
          <div className="space-y-4">
            {localQuestions.filter((q) => q.priority === "critical").map((q, i) =>
              renderQuestion(q, localQuestions.indexOf(q), updateAnswer, toggleSkip)
            )}
          </div>
        </div>
      )}

      {/* Optional Questions */}
      {optionalQuestions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CircleDot size={14} className="text-ink-3" />
            <span className="text-xs font-bold text-ink-3 uppercase tracking-wider">
              Improves output quality
            </span>
          </div>
          <div className="space-y-4">
            {localQuestions.filter((q) => q.priority === "optional").map((q, i) =>
              renderQuestion(q, localQuestions.indexOf(q), updateAnswer, toggleSkip)
            )}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="mt-8 flex items-center justify-between pb-8">
        <p className="text-xs text-ink-3">
          Skipped questions will be marked with ⚠️ in the generated doc
        </p>
        <button
          onClick={() => onSubmit(localQuestions)}
          className="flex items-center gap-2 px-6 py-3 bg-brand-700 text-white font-bold rounded-xl
                     hover:bg-brand-800 active:scale-[0.98] transition-all shadow-lg hover:shadow-xl text-sm"
        >
          Generate Documentation
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function renderQuestion(
  q: GapQuestion,
  globalIndex: number,
  updateAnswer: (id: string, answer: string) => void,
  toggleSkip: (id: string) => void
) {
  const cat = CATEGORY_CONFIG[q.category];
  const Icon = cat.icon;
  const isCritical = q.priority === "critical";

  return (
    <div
      key={q.id}
      className={`bg-white rounded-xl border shadow-card overflow-hidden transition-all duration-200 ${
        q.skipped
          ? "opacity-50 border-surface-3"
          : isCritical
          ? "border-red-100 ring-1 ring-red-50"
          : "border-surface-3"
      }`}
    >
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <span
            className={`text-xs font-bold rounded-md w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 ${
              isCritical
                ? "bg-red-50 text-accent-red"
                : "bg-surface-2 text-ink-4"
            }`}
          >
            {globalIndex + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.65rem] font-semibold uppercase tracking-wide ${cat.bg} ${cat.color} ${cat.border} border`}
              >
                <Icon size={11} />
                {cat.label}
              </span>
              {isCritical && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.65rem] font-semibold uppercase tracking-wide bg-red-50 text-accent-red border border-red-100">
                  <Star size={10} className="fill-current" />
                  Critical
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-ink-0 leading-relaxed">
              {q.question}
            </p>

            {!q.skipped && (
              <textarea
                value={q.answer}
                onChange={(e) => updateAnswer(q.id, e.target.value)}
                placeholder="Type your answer here…"
                className="w-full mt-3 px-3 py-2.5 rounded-lg border border-surface-3 bg-surface-1
                           text-sm text-ink-1 placeholder:text-ink-4 focus:outline-none
                           focus:ring-2 focus:ring-brand-200 focus:border-brand-400
                           resize-none transition-all min-h-[60px]"
                rows={2}
              />
            )}

            {!isCritical && (
              <button
                onClick={() => toggleSkip(q.id)}
                className={`mt-2 flex items-center gap-1 text-xs font-medium transition-colors ${
                  q.skipped
                    ? "text-brand-600 hover:text-brand-700"
                    : "text-ink-3 hover:text-ink-2"
                }`}
              >
                <SkipForward size={12} />
                {q.skipped ? "Unskip — I want to answer this" : "Skip — I don't know yet"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
