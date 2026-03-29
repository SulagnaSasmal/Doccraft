"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Upload, Settings2, FileText } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    color: "text-blue-400",
    bg: "bg-blue-600/15 border-blue-500/20",
    title: "Drop your source material",
    body: "Upload any file — TXT, Markdown, JSON, PDF, or images. Paste raw notes directly if you prefer. DocCraft reads everything and extracts what matters.",
  },
  {
    icon: Settings2,
    color: "text-violet-400",
    bg: "bg-violet-600/15 border-violet-500/20",
    title: "Configure your output",
    body: "Use the left panel to pick the document type, target audience, and tone. DocCraft will auto-suggest the best format once it reads your content.",
  },
  {
    icon: FileText,
    color: "text-emerald-400",
    bg: "bg-emerald-600/15 border-emerald-500/20",
    title: "Analyze, generate & export",
    body: 'Click \u201cAnalyze & Identify Gaps\u201d to catch missing info before writing. Answer what you can, then generate. Export to Markdown, HTML, DOCX, or PDF \u2014 or publish directly to GitHub.',
  },
];

const STORAGE_KEY = "doccraft_onboarded";

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden">

        {/* Top bar: progress dots + close */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-5 bg-blue-400" : i < step ? "w-1.5 bg-slate-500" : "w-1.5 bg-slate-700"
                }`}
              />
            ))}
          </div>
          <button
            onClick={dismiss}
            className="text-slate-600 hover:text-slate-400 transition-colors"
            aria-label="Close tour"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pt-5 pb-5">
          <div className={`w-12 h-12 rounded-2xl border ${current.bg} flex items-center justify-center mb-4`}>
            <Icon size={22} className={current.color} />
          </div>
          <p className="text-[0.62rem] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Step {step + 1} of {STEPS.length}
          </p>
          <h3 className="text-[1.05rem] font-bold text-slate-100 mb-2 leading-snug">
            {current.title}
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">{current.body}</p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft size={13} />
              Back
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Skip tour
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 transition-colors shadow-sm shadow-blue-900/40"
            >
              Next
              <ArrowRight size={13} />
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-900/40"
            >
              Let&apos;s go
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
