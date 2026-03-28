"use client";

import { useState } from "react";
import { AlertCircle, HelpCircle, AlertTriangle, ArrowLeft, ArrowRight, SkipForward, Star } from "lucide-react";
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
    setLocalQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, skipped: !q.skipped, answer: "" } : q))
    );
  };

  const skipAllOptional = () => {
    setLocalQuestions((prev) =>
      prev.map((q) =>
        (q.priority || "optional") === "optional" ? { ...q, skipped: true, answer: "" } : q
      )
    );
  };

  const criticalQs = localQuestions.filter((q) => q.priority === "critical");
  const optionalQs = localQuestions.filter((q) => (q.priority || "optional") === "optional");

  const answered = localQuestions.filter((q) => q.answer.trim() || q.skipped).length;
  const total = localQuestions.length;

  const renderQuestion = (q: GapQuestion, i: number) => {
    const cat = CATEGORY_CONFIG[q.category];
    const Icon = cat.icon;
    const isCritical = q.priority === "critical";

    return (
      <div
        key={q.id}
        className={`bg-surface-0 rounded-xl border shadow-card overflow-hidden transition-all duration-200 ${
          q.skipped ? "opacity-50 border-surface-3" : isCritical ? "border-red-200" : "border-surface-3"
        }`}
        style={{ animationDelay: `${i * 60}ms` }}
      >
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-ink-4 bg-surface-2 rounded-md w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
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
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[0.6rem] font-bold uppercase bg-red-50 text-accent-red border border-red-200">
                    <Star size={9} className="fill-accent-red" />
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

              {/* Critical questions cannot be skipped */}
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
  };

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
        <h2 className="font-display text-xl font-bold text-ink-0">
          Information Gap Analysis
        </h2>
        <p className="text-sm text-ink-2 mt-1">
          The AI identified {total} questions that would help produce better documentation.
          Answer what you can — skip what you don't know yet.
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
      </div>

      {/* Questions — grouped by priority */}
      <div className="space-y-6">
        {/* Critical section */}
        {criticalQs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-accent-red fill-accent-red" />
              <span className="text-xs font-bold text-accent-red uppercase tracking-wider">
                Critical ({criticalQs.length})
              </span>
            </div>
            <div className="space-y-4">
              {criticalQs.map((q) => {
                const globalIdx = localQuestions.findIndex((lq) => lq.id === q.id);
                return renderQuestion(q, globalIdx);
              })}
            </div>
          </div>
        )}

        {/* Optional section */}
        {optionalQs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ink-3 uppercase tracking-wider">
                Optional ({optionalQs.length})
              </span>
              <button
                onClick={skipAllOptional}
                className="text-[0.7rem] font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                Skip all optional →
              </button>
            </div>
            <div className="space-y-4">
              {optionalQs.map((q) => {
                const globalIdx = localQuestions.findIndex((lq) => lq.id === q.id);
                return renderQuestion(q, globalIdx);
              })}
            </div>
          </div>
        )}

        {/* Fallback: no priority info — render all flat */}
        {criticalQs.length === 0 && optionalQs.length === 0 && (
          <div className="space-y-4">
            {localQuestions.map((q, i) => renderQuestion(q, i))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="mt-8 pb-8 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-3">
            Skipped questions will be marked with ⚠️ in the generated doc
          </p>
          <button
            onClick={() => onSubmit(localQuestions)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-700 text-white font-semibold rounded-xl
                       hover:bg-brand-800 active:scale-[0.98] transition-all shadow-md hover:shadow-lg text-sm"
          >
            Generate Documentation
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => onSubmit(localQuestions.map((q) => ({ ...q, skipped: true, answer: "" })))}
            className="text-[0.72rem] text-ink-3 hover:text-ink-1 transition-colors underline underline-offset-2"
            title="Skip all questions and let the AI make reasonable assumptions"
          >
            Skip all & generate with AI assumptions →
          </button>
        </div>
      </div>
    </div>
  );
}
