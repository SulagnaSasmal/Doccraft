"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import GapAnalysis from "@/components/GapAnalysis";
import DocumentEditor from "@/components/DocumentEditor";
import StatusBar from "@/components/StatusBar";
import AuthModal from "@/components/AuthModal";
import TeamPanel from "@/components/TeamPanel";
import AutomationPanel from "@/components/AutomationPanel";
import CommandPalette, { type CommandAction } from "@/components/CommandPalette";
import BrandKitPanel from "@/components/BrandKitPanel";
import { useTheme } from "@/lib/useTheme";
import { useDocHistory, type DocSession } from "@/lib/useDocHistory";
import type { GlossaryData } from "@/lib/validateTerminology";
import { supabase } from "@/lib/supabase";
import { safeResJson } from "@/lib/safeResJson";
import {
  Sparkles, X, Cloud, Zap, Shield, Clock,
  FileText, Upload, Sun, Moon, RotateCcw,
  Download, Copy, Users, Webhook, Palette,
  Search,
} from "lucide-react";
import UtilityToolbox from "@/components/doccraft/UtilityToolbox";
import DocumentLibrary from "@/components/doccraft/DocumentLibrary";

export type AppStage = "upload" | "analyzing" | "questions" | "generating" | "editing";

export interface DocConfig {
  docType: string;
  audience: string;
  tone: string;
  customInstructions: string;
}

export interface GapQuestion {
  id: string;
  question: string;
  answer: string;
  skipped: boolean;
  category: "missing" | "ambiguous" | "assumption";
  priority?: "critical" | "optional";
}

interface Recommendation {
  type: string;
  reason: string;
  confidence: number;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  "user-guide": "User Guide",
  "quick-start": "Quick Start",
  "api-reference": "API Reference",
  "troubleshooting": "Troubleshooting Guide",
  "release-notes": "Release Notes",
};

export default function Home() {
  const [stage, setStage] = useState<AppStage>("upload");
  const [uploadedContent, setUploadedContent] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [config, setConfig] = useState<DocConfig>({
    docType: "user-guide",
    audience: "non-technical",
    tone: "conversational",
    customInstructions: "",
  });
  const [contextText, setContextText] = useState("");
  const [glossaryData, setGlossaryData] = useState<GlossaryData | null>(null);
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [baselineDoc, setBaselineDoc] = useState("");
  const [streamedDoc, setStreamedDoc] = useState("");
  const [error, setError] = useState("");
  const generationAbortRef = useRef<AbortController | null>(null);

  // History
  const { history, addSession, removeSession, clearAll } = useDocHistory();

  // ── Phase 3: Auth + Cloud + Team ────────────────────────────────────────
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string>("");
  const [showAuth, setShowAuth] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSaved, setCloudSaved] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBrandKit, setShowBrandKit] = useState(false);
  const { theme, toggle: toggleTheme, isDark } = useTheme();

  // CMD+K keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email! });
        setAccessToken(session.access_token);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email! });
        setAccessToken(session.access_token);
      } else {
        setUser(null);
        setAccessToken("");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken("");
  };

  const handleSaveToCloud = async () => {
    if (!user) { setShowAuth(true); return; }
    setCloudSaving(true);
    try {
      const title = config.docType ? `${DOC_TYPE_LABELS[config.docType] || config.docType} — ${new Date().toLocaleDateString()}` : "Untitled Document";
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id: currentDocId || undefined, title, config, content: generatedDoc }),
      });
      const data = await safeResJson(res);
      if (!res.ok) throw new Error(data.error || "Cloud save failed");
      setCurrentDocId(data.document.id);
      setCloudSaved(true);
      setTimeout(() => setCloudSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Cloud save failed");
    } finally {
      setCloudSaving(false);
    }
  };

  // Format recommendation
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recDismissed, setRecDismissed] = useState(false);
  const recTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch recommendation when content changes (debounced 1.5s)
  useEffect(() => {
    if (recTimerRef.current) clearTimeout(recTimerRef.current);
    setRecommendation(null);
    setRecDismissed(false);

    if (uploadedContent.length < 200) return;

    recTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: uploadedContent }),
        });
        if (!res.ok) return;
        const data = await safeResJson(res);
        // Only show if confidence is reasonable and differs from current selection
        if (data.confidence >= 0.65 && data.type !== config.docType) {
          setRecommendation(data);
        }
      } catch {
        // Silently ignore — recommendation is enhancement only
      }
    }, 1500);

    return () => {
      if (recTimerRef.current) clearTimeout(recTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedContent]);

  const handleFilesUploaded = (content: string, names: string[]) => {
    setUploadedContent(content);
    setFileNames(names);
    setError("");
  };

  const handleContextChange = (text: string, glossary: GlossaryData | null) => {
    setContextText(text);
    setGlossaryData(glossary);
  };

  const handleAnalyze = async () => {
    if (!uploadedContent.trim()) {
      setError("Please upload or paste some content first.");
      return;
    }
    setError("");
    setStage("analyzing");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          content: uploadedContent,
          config,
          contextText,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await safeResJson(res);
        throw new Error(errData.error || `Server returned ${res.status}. Please try again.`);
      }

      const data = await safeResJson(res);
      setQuestions(data.questions || []);
      setStage("questions");
    } catch (err: any) {
      const msg = err.name === "AbortError"
        ? "Request timed out — the server took too long. Please try again with shorter content."
        : err.message || "Something went wrong during analysis.";
      setError(msg);
      setStage("upload");
    }
  };

  const handleGenerate = async (answeredQuestions: GapQuestion[]) => {
    setStage("generating");
    setError("");
    setStreamedDoc("");
    setGeneratedDoc("");
    let partialDocument = "";

    try {
      const controller = new AbortController();
      generationAbortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 55000);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          content: uploadedContent,
          config,
          answers: answeredQuestions,
          contextText,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        clearTimeout(timeout);
        const errData = await safeResJson(res);
        throw new Error(errData.error || `Server returned ${res.status}. Please try again.`);
      }

      if (!res.body) {
        clearTimeout(timeout);
        throw new Error("The server did not return a stream.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      const flushEvent = (rawEvent: string) => {
        const lines = rawEvent.split("\n");
        const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
        const dataLine = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!dataLine) return;

        const payload = JSON.parse(dataLine);

        if (eventName === "chunk" && payload.delta) {
          assembled += payload.delta;
          partialDocument = assembled;
          setStreamedDoc(assembled);
        }

        if (eventName === "error") {
          throw new Error(payload.error || "Streaming failed");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventChunk of events) {
          flushEvent(eventChunk);
        }
      }

      if (buffer.trim()) {
        flushEvent(buffer);
      }

      clearTimeout(timeout);

      if (!assembled.trim()) {
        throw new Error("No document returned. Please try again.");
      }

      setGeneratedDoc(assembled);
      setBaselineDoc(assembled);
      setStreamedDoc("");
      setStage("editing");

      addSession({
        config,
        inputSummary: uploadedContent.slice(0, 120).trim(),
        generatedDoc: assembled,
        kind: "generated",
        label: "Initial draft",
      });
    } catch (err: any) {
      const msg = err.name === "AbortError"
        ? partialDocument.trim()
          ? "Generation stopped early. Review the partial draft and continue refining."
          : "Request timed out — the server took too long. Please try again with shorter content."
        : err.message || "Something went wrong during generation.";

      if (partialDocument.trim()) {
        setGeneratedDoc(partialDocument);
        setBaselineDoc(partialDocument);
        setStreamedDoc("");
        setStage("editing");
      } else {
        setStage("questions");
      }

      setError(msg);
    } finally {
      generationAbortRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    generationAbortRef.current?.abort();
  };

  const handleRefine = async (
    selectedText: string,
    action: string
  ): Promise<string> => {
    const res = await fetch("/api/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: selectedText,
        action,
        fullDocument: generatedDoc,
        config,
      }),
    });

    if (!res.ok) throw new Error("Refinement failed");
    const data = await safeResJson(res);
    return data.refined ?? "";
  };

  const handleStartOver = () => {
    generationAbortRef.current?.abort();
    setStage("upload");
    setUploadedContent("");
    setFileNames([]);
    setContextText("");
    setGlossaryData(null);
    setQuestions([]);
    setGeneratedDoc("");
    setBaselineDoc("");
    setStreamedDoc("");
    setError("");
    setRecommendation(null);
    setRecDismissed(false);
  };

  const handleRestoreSession = (session: DocSession) => {
    setConfig(session.config);
    setGeneratedDoc(session.generatedDoc);
    setBaselineDoc(session.generatedDoc);
    setStage("editing");
  };

  const handleDirectLoadMarkdown = (content: string, fileName: string) => {
    setGeneratedDoc(content);
    setBaselineDoc(content);
    setFileNames([fileName]);
    setStage("editing");
    setError("");
  };

  const handleSaveVersion = () => {
    if (!generatedDoc.trim()) return;

    addSession({
      config,
      inputSummary: generatedDoc.slice(0, 120).trim(),
      generatedDoc,
      kind: "snapshot",
      label: `Snapshot ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    });
  };

  const showRecommendation =
    recommendation &&
    !recDismissed &&
    stage === "upload" &&
    uploadedContent.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-950"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.12) 0%, transparent 70%), #020817",
      }}
    >
      <Header
        stage={stage}
        onStartOver={handleStartOver}
        user={user}
        onShowAuth={() => setShowAuth(true)}
        onSignOut={handleSignOut}
        onShowTeam={() => setShowTeam(true)}
        onShowAutomation={() => setShowAutomation(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
      />

      {/* Global error bar */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-sm flex items-center gap-2">
          <X size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Business Hub — three-column layout ──────────────────────── */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>

        {/* Left: Utility Toolbox (always visible) */}
        <div className="w-[272px] shrink-0 flex flex-col overflow-hidden">
          <UtilityToolbox
            uploadedContent={uploadedContent}
            fileNames={fileNames}
            onContentChange={handleFilesUploaded}
            config={config}
            onConfigChange={setConfig}
            contextText={contextText}
            glossaryData={glossaryData}
            onContextChange={handleContextChange}
            onAnalyze={handleAnalyze}
            isAnalyzing={stage === "analyzing"}
            recommendation={recommendation}
            recDismissed={recDismissed}
            onApplyRecommendation={(type) => {
              setConfig((c) => ({ ...c, docType: type }));
              setRecDismissed(true);
            }}
            onDismissRecommendation={() => setRecDismissed(true)}
            onDirectLoadMarkdown={handleDirectLoadMarkdown}
          />
        </div>

        {/* Center: Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden border-x border-slate-800/60">

          {(stage === "upload" || stage === "analyzing") && (
            <DocumentLibrary
              history={history}
              onRestore={handleRestoreSession}
              onRemove={removeSession}
              onClearAll={clearAll}
              onNewDoc={handleStartOver}
            />
          )}

          {stage === "questions" && (
            <div className="flex-1 overflow-auto p-6">
              <GapAnalysis
                questions={questions}
                onSubmit={handleGenerate}
                onBack={() => setStage("upload")}
              />
            </div>
          )}

          {stage === "generating" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in-up">
              <div className="w-full max-w-md mb-8">
                <div className="bg-slate-900/80 rounded-2xl border border-slate-800/60 p-6 skeleton-scanner" style={{ minHeight: "180px" }}>
                  <div className="h-5 w-3/5 skeleton-shimmer rounded mb-4" />
                  <div className="h-3 w-full skeleton-shimmer rounded mb-2.5" />
                  <div className="h-3 w-11/12 skeleton-shimmer rounded mb-2.5" />
                  <div className="h-3 w-4/5 skeleton-shimmer rounded mb-4" />
                  <div className="h-4 w-2/5 skeleton-shimmer rounded mb-3" />
                  <div className="h-3 w-full skeleton-shimmer rounded mb-2.5" />
                  <div className="h-3 w-10/12 skeleton-shimmer rounded mb-2.5" />
                  <div className="h-3 w-3/4 skeleton-shimmer rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-slate-200 font-semibold text-lg">Generating your documentation…</p>
              </div>
              <p className="text-slate-500 text-sm">Streaming tokens live so you can see progress immediately.</p>
              <button
                onClick={handleCancelGeneration}
                className="mt-4 px-4 py-2 rounded-lg border border-slate-700 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <div className="mt-8 w-full max-w-3xl rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-800/60 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
                  Live Draft
                </div>
                <pre className="max-h-[380px] overflow-auto px-5 py-4 text-sm leading-7 text-slate-300 whitespace-pre-wrap break-words font-mono">
                  {streamedDoc || "Waiting for the first tokens..."}
                </pre>
              </div>
            </div>
          )}

          {stage === "editing" && (
            <div className="flex-1 overflow-auto p-4">
              <DocumentEditor
                content={generatedDoc}
                onChange={setGeneratedDoc}
                onRefine={handleRefine}
                config={config}
                docType={config.docType}
                glossaryData={glossaryData}
                history={history}
                baselineContent={baselineDoc}
                onSaveToCloud={handleSaveToCloud}
                onSaveVersion={handleSaveVersion}
                cloudSaving={cloudSaving}
                cloudSaved={cloudSaved}
                isLoggedIn={!!user}
              />
            </div>
          )}
        </main>

        {/* Right: Insights panel */}
        <aside
          className="w-[240px] shrink-0 flex flex-col overflow-hidden border-l border-slate-800/60"
          style={{
            background: "rgba(15,23,41,0.60)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="px-4 py-3.5 border-b border-slate-800/60">
            <h2 className="text-[0.78rem] font-semibold uppercase tracking-widest text-slate-400">
              Insights
            </h2>
          </div>
          <div className="flex-1 overflow-auto px-3 py-3 space-y-3">

            {/* Auth nudge */}
            {!user && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                <Cloud size={13} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[0.68rem] text-slate-300 leading-relaxed">
                    <button onClick={() => setShowAuth(true)} className="text-blue-400 font-semibold hover:underline">
                      Sign in
                    </button>{" "}
                    to unlock cloud save, teams &amp; GitHub publishing.
                  </p>
                </div>
              </div>
            )}

            {/* Capability cards */}
            {[
              { icon: Zap, title: "AI Gap Analysis", desc: "Catches missing info before generation", color: "text-yellow-400", bg: "bg-yellow-900/20" },
              { icon: Shield, title: "MSTP Compliance", desc: "Style & terminology checks built in", color: "text-emerald-400", bg: "bg-emerald-900/20" },
              { icon: Clock, title: "10× Faster", desc: "From raw notes to polished docs", color: "text-blue-400", bg: "bg-blue-900/20" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-2.5 px-3 py-2.5 bg-slate-800/30 border border-slate-700/40 rounded-xl">
                <div className={`w-6 h-6 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon size={12} className={item.color} />
                </div>
                <div>
                  <p className="text-[0.72rem] font-semibold text-slate-200">{item.title}</p>
                  <p className="text-[0.62rem] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}

            {/* Stage-aware status */}
            <div className="px-3 py-2.5 bg-slate-800/30 border border-slate-700/40 rounded-xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${stage === "analyzing" || stage === "generating" ? "bg-blue-400 animate-pulse" : "bg-slate-600"}`} />
                <span className="text-[0.72rem] text-slate-300 capitalize">{stage}</span>
              </div>
              {fileNames.length > 0 && (
                <p className="text-[0.65rem] text-slate-500 mt-1">
                  {fileNames.length} source{fileNames.length > 1 ? "s" : ""} loaded
                </p>
              )}
            </div>
          </div>
        </aside>

      </div>

      <StatusBar stage={stage} fileCount={fileNames.length} />

      {/* Phase 3 modals */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={(u) => { setUser(u); setShowAuth(false); }}
        />
      )}
      {showTeam && user && (
        <TeamPanel
          user={user}
          accessToken={accessToken}
          onClose={() => setShowTeam(false)}
        />
      )}
      {showAutomation && (
        <AutomationPanel onClose={() => setShowAutomation(false)} />
      )}

      {/* Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        actions={[
          { id: "nav-upload", label: "Go to Upload", description: "Upload files or paste content", icon: Upload, group: "Navigation", action: () => { setStage("upload"); } },
          { id: "nav-editing", label: "Go to Editor", description: "Jump to document editor", icon: FileText, group: "Navigation", action: () => { if (generatedDoc) setStage("editing"); } },
          { id: "theme-toggle", label: isDark ? "Switch to Light Mode" : "Switch to Dark Mode", icon: isDark ? Sun : Moon, group: "Appearance", shortcut: "⌘K T", action: toggleTheme },
          { id: "brand-kit", label: "Open Brand Kit", description: "Logo, colors & company details", icon: Palette, group: "Tools", action: () => setShowBrandKit(true) },
          { id: "start-over", label: "Start Over", description: "Reset everything and begin fresh", icon: RotateCcw, group: "Actions", action: handleStartOver },
          { id: "analyze", label: "Analyze Content", description: "Run AI gap analysis", icon: Search, group: "Actions", action: () => { if (uploadedContent.trim()) handleAnalyze(); } },
          { id: "cloud-save", label: "Save to Cloud", description: "Save your document to the cloud", icon: Cloud, group: "Actions", action: handleSaveToCloud },
          { id: "show-team", label: "Team Workspace", description: "Collaborate with your team", icon: Users, group: "Tools", action: () => setShowTeam(true) },
          { id: "automation", label: "CI/CD Automation", description: "Set up webhook pipelines", icon: Webhook, group: "Tools", action: () => setShowAutomation(true) },
        ] as CommandAction[]}
      />

      {/* Brand Kit Panel */}
      {showBrandKit && (
        <div className="fixed inset-0 z-[90] cmd-backdrop flex items-start justify-center pt-[10vh]" onClick={() => setShowBrandKit(false)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <BrandKitPanel onClose={() => setShowBrandKit(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
