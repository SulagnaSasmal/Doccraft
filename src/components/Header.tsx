"use client";

import { FileText, RotateCcw, Users, LogOut, User, Cloud, HelpCircle, Webhook, Check, Sun, Moon, Search } from "lucide-react";
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

  return (
    <header className="border-b border-surface-3 sticky top-0 z-50 glass">
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

        {/* Progress Steps — numbered stepper */}
        <div className="hidden sm:flex items-center gap-1">
          {stages.map((s, i) => {
            const current = stages.indexOf(
              stage === "analyzing" ? "upload" : stage === "generating" ? "questions" : stage
            );
            const isDone = i < current;
            const isCurrent = i === current;
            return (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-2">
                  {/* Numbered circle or check */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-bold transition-all duration-300 ${
                      isDone
                        ? "bg-accent-green text-white"
                        : isCurrent
                        ? "bg-brand-700 text-white ring-2 ring-brand-200"
                        : "bg-surface-2 text-ink-4"
                    }`}
                  >
                    {isDone ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isCurrent ? "text-brand-700" : isDone ? "text-accent-green" : "text-ink-4"
                    }`}
                  >
                    {STAGE_LABELS[s]}
                  </span>
                </div>
                {i < stages.length - 1 && (
                  <div
                    className={`w-8 h-px mx-2 transition-colors ${
                      isDone ? "bg-accent-green" : "bg-surface-3"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* CMD+K Command Palette trigger */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-ink-3
                         hover:text-ink-0 hover:bg-surface-2 rounded-lg transition-colors border border-surface-3"
              title="Command Palette"
            >
              <Search size={13} />
              <kbd className="text-[0.6rem] font-mono text-ink-4">⌘K</kbd>
            </button>
          )}
          {/* Dark mode toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center w-8 h-8 text-ink-3
                         hover:text-ink-0 hover:bg-surface-2 rounded-lg transition-colors"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}
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
          {/* Automation tab */}
          {onShowAutomation && (
            <button
              onClick={onShowAutomation}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-ink-3
                         hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
              title="CI/CD Automation"
            >
              <Webhook size={14} />
              <span className="hidden md:inline">Automate</span>
            </button>
          )}
          {/* Help Center link */}
          <a
            href="https://sulagnasasmal.github.io/doccraft-help-center/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-ink-3
                       hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Help Center"
          >
            <HelpCircle size={15} />
          </a>
          {/* Phase 3: Auth + Team */}
          {onShowTeam && user && (
            <button
              onClick={onShowTeam}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-2
                         hover:text-ink-0 hover:bg-surface-2 rounded-lg transition-colors"
              title="Team workspace"
            >
              <Users size={13} />
              Team
            </button>
          )}
          {user ? (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink-2">
                <User size={12} className="text-brand-500" />
                <span className="max-w-[120px] truncate">{user.email}</span>
              </span>
              <button
                onClick={onSignOut}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-ink-3
                           hover:text-accent-red hover:bg-red-50 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            onShowAuth && (
              <button
                onClick={onShowAuth}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white
                           bg-brand-700 hover:bg-brand-800 rounded-lg transition-colors shadow-sm"
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
