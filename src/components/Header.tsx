"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, RotateCcw, Users, LogOut, User, Cloud, HelpCircle, Webhook, Check, Sun, Moon, Search, Scissors, Layers, ScanText, ChevronDown } from "lucide-react";
import type { AppStage } from "@/app/page";

const STAGE_LABELS: Record<AppStage, string> = {
  upload: "Upload & Configure",
  analyzing: "Analyzing…",
  questions: "Review Gaps",
  generating: "Generating…",
  editing: "Edit & Export",
};

const PDF_TOOLS = [
  { href: "/split", icon: Scissors, label: "Split PDF", desc: "Divide into sections or page ranges", accent: "text-blue-400" },
  { href: "/merge", icon: Layers, label: "Merge PDFs", desc: "Combine multiple files into one PDF", accent: "text-violet-400" },
  { href: "/ocr", icon: ScanText, label: "OCR Extraction", desc: "Extract text from scanned images & PDFs", accent: "text-emerald-400" },
];

export default function Header({
  stage,
  onStartOver,
  user,
  onShowAuth,
  onSignOut,
  onShowTeam,
  onShowAutomation,
  isDark,
  onToggleTheme,
  onOpenCommandPalette,
}: {
  stage: AppStage;
  onStartOver: () => void;
  user?: { id: string; email: string } | null;
  onShowAuth?: () => void;
  onSignOut?: () => void;
  onShowTeam?: () => void;
  onShowAutomation?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onOpenCommandPalette?: () => void;
}) {
  const stages: AppStage[] = ["upload", "questions", "editing"];
  const [showTools, setShowTools] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setShowTools(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md">
      <div className="w-full px-5 py-3 flex items-center gap-3 min-w-0">

        {/* ── Brand ── */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
            <FileText size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">
              DocCraft <span className="text-blue-400">AI</span>
            </h1>
            <p className="text-[0.65rem] text-slate-500 tracking-wide uppercase font-medium mt-0.5">
              Documentation Generator
            </p>
          </div>
        </div>

        {/* ── Progress stepper — centred ── */}
        <div className="hidden md:flex items-center gap-1 mx-auto">
          {stages.map((s, i) => {
            const current = stages.indexOf(
              stage === "analyzing" ? "upload" : stage === "generating" ? "questions" : stage
            );
            const isDone = i < current;
            const isCurrent = i === current;
            return (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold transition-all duration-300 shrink-0 ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-blue-600 text-white ring-2 ring-blue-400/30"
                        : "bg-slate-800 text-slate-500 border border-slate-700"
                    }`}
                  >
                    {isDone ? <Check size={10} strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={`text-[0.72rem] font-medium transition-colors whitespace-nowrap ${
                      isCurrent
                        ? "text-blue-400"
                        : isDone
                        ? "text-emerald-400"
                        : "text-slate-600"
                    }`}
                  >
                    {STAGE_LABELS[s]}
                  </span>
                </div>
                {i < stages.length - 1 && (
                  <div
                    className={`w-6 h-px mx-2 transition-colors ${
                      isDone ? "bg-emerald-700" : "bg-slate-800"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right controls ── */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400
                         hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60"
              title="Command Palette"
            >
              <Search size={13} />
              <kbd className="text-[0.6rem] font-mono text-slate-600">⌘K</kbd>
            </button>
          )}

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center justify-center w-8 h-8 text-slate-400
                         hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}

          {stage !== "upload" && (
            <button
              type="button"
              onClick={onStartOver}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400
                         hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw size={13} />
              Start Over
            </button>
          )}

          {onShowAutomation && (
            <button
              type="button"
              onClick={onShowAutomation}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400
                         hover:text-blue-400 hover:bg-blue-600/10 rounded-lg transition-colors"
              title="CI/CD Automation"
            >
              <Webhook size={14} />
              <span className="hidden md:inline">Automate</span>
            </button>
          )}

          {/* ── PDF Tools dropdown ── */}
          <div ref={toolsRef} className="relative">
            <button
              type="button"
              onClick={() => setShowTools((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400
                         hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60"
              title="PDF Tools"
            >
              <Scissors size={13} />
              <span className="hidden md:inline">PDF Tools</span>
              <ChevronDown size={11} className={`transition-transform ${showTools ? "rotate-180" : ""}`} />
            </button>

            {showTools && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-xl border border-slate-700/60
                              bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">PDF Utilities</p>
                </div>
                {PDF_TOOLS.map((tool) => (
                  <a
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setShowTools(false)}
                    className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700/60
                                    flex items-center justify-center shrink-0 mt-0.5
                                    group-hover:border-slate-600 transition-colors">
                      <tool.icon size={12} className={tool.accent} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.75rem] font-semibold text-slate-200 group-hover:text-white">{tool.label}</p>
                      <p className="text-[0.62rem] text-slate-500 mt-0.5 leading-relaxed">{tool.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <a
            href="https://sulagnasasmal.github.io/doccraft-help-center/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 text-slate-400
                       hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Help Center"
          >
            <HelpCircle size={15} />
          </a>

          {onShowTeam && user && (
            <button
              type="button"
              onClick={onShowTeam}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400
                         hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Team workspace"
            >
              <Users size={13} />
              Team
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400">
                <User size={12} className="text-blue-400" />
                <span className="max-w-[110px] truncate">{user.email}</span>
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center justify-center w-8 h-8 text-slate-500
                           hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            onShowAuth && (
              <button
                type="button"
                onClick={onShowAuth}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white
                           bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm shadow-blue-900/40"
              >
                <Cloud size={13} />
                Sign in
              </button>
            )
          )}
        </div>

      </div>
    </header>
  );
}
