"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import UploadPanel from "@/components/UploadPanel";
import ConfigPanel from "@/components/ConfigPanel";
import ContextPanel from "@/components/ContextPanel";
import GapAnalysis from "@/components/GapAnalysis";
import DocumentEditor from "@/components/DocumentEditor";
import StatusBar from "@/components/StatusBar";
import HistoryPanel from "@/components/HistoryPanel";
import AuthModal from "@/components/AuthModal";
import TeamPanel from "@/components/TeamPanel";
import { useDocHistory, type DocSession } from "@/lib/useDocHistory";
import type { GlossaryData } from "@/lib/validateTerminology";
import { supabase } from "@/lib/supabase";
import { safeResJson } from "@/lib/safeResJson";
import { Sparkles, X, Cloud } from "lucide-react";

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
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSaved, setCloudSaved] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

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
    <div className="min-h-screen flex flex-col">
      <Header
        stage={stage}
        onStartOver={handleStartOver}
        user={user}
        onShowAuth={() => setShowAuth(true)}
        onSignOut={handleSignOut}
        onShowTeam={() => setShowTeam(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-accent-red text-sm animate-fade-in-up">
            {error}
          </div>
        )}

        {(stage === "upload" || stage === "analyzing") && (
          <>
            {/* Auth nudge — show once on upload stage when not signed in */}
            {!user && stage === "upload" && (
              <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200/60 rounded-xl animate-fade-in-up">
                <Cloud size={16} className="text-brand-500 shrink-0" />
                <p className="flex-1 text-xs text-ink-2">
                  <span className="font-semibold text-ink-0">No account needed</span> — analyze, generate, and export docs for free.{" "}
                  <button onClick={() => setShowAuth(true)} className="text-brand-700 font-semibold hover:underline">
                    Sign in
                  </button>{" "}
                  to unlock cloud save, team workspaces, and GitHub publishing.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
              <div className="lg:col-span-2">
                <UploadPanel
                  onContentChange={handleFilesUploaded}
                  uploadedContent={uploadedContent}
                  fileNames={fileNames}
                />
              </div>
              <div className="space-y-5">
                <ConfigPanel config={config} onChange={setConfig} />
                <ContextPanel
                  onContextChange={handleContextChange}
                  contextText={contextText}
                  glossaryData={glossaryData}
                />

                {/* Format recommendation callout */}
                {showRecommendation && (
                  <div className="flex items-start gap-3 px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl animate-fade-in-up">
                    <Sparkles size={15} className="text-brand-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-brand-700">
                        Suggested:{" "}
                        {DOC_TYPE_LABELS[recommendation.type] || recommendation.type}
                      </p>
                      <p className="text-[0.7rem] text-ink-2 mt-0.5 leading-relaxed">
                        {recommendation.reason}
                      </p>
                      <button
                        onClick={() => {
                          setConfig((c) => ({ ...c, docType: recommendation.type }));
                          setRecDismissed(true);
                        }}
                        className="mt-1.5 text-[0.7rem] font-semibold text-brand-700 hover:underline"
                      >
                        Use this →
                      </button>
                    </div>
                    <button
                      onClick={() => setRecDismissed(true)}
                      className="text-ink-4 hover:text-ink-2 transition-colors shrink-0"
                      aria-label="Dismiss recommendation"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={!uploadedContent.trim() || stage === "analyzing"}
                  className="w-full py-3 px-5 bg-brand-700 text-white font-semibold rounded-xl
                             hover:bg-brand-800 active:scale-[0.98] transition-all duration-150
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-700
                             shadow-md hover:shadow-lg text-[0.95rem] tracking-wide"
                >
                  {stage === "analyzing" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing Content…
                    </span>
                  ) : (
                    "Analyze & Identify Gaps"
                  )}
                </button>
              </div>
            </div>

            {/* History panel — below the main grid */}
            <HistoryPanel
              history={history}
              onRestore={handleRestoreSession}
              onRemove={removeSession}
              onClearAll={clearAll}
            />
          </>
        )}

        {stage === "questions" && (
          <GapAnalysis
            questions={questions}
            onSubmit={handleGenerate}
            onBack={() => setStage("upload")}
          />
        )}

        {stage === "generating" && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in-up">
            <div className="w-12 h-12 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-5" />
            <p className="text-ink-2 font-medium text-lg">Generating your documentation…</p>
            <p className="text-ink-3 text-sm mt-1">Streaming tokens live so you can see progress immediately.</p>
            <button
              onClick={handleCancelGeneration}
              className="mt-4 px-4 py-2 rounded-lg border border-surface-3 text-sm font-medium text-ink-2 hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>

            <div className="mt-8 w-full max-w-4xl rounded-2xl border border-surface-3 bg-white shadow-card overflow-hidden">
              <div className="px-4 py-2 border-b border-surface-2 text-[0.7rem] font-semibold uppercase tracking-wider text-ink-3 bg-surface-1">
                Live Draft
              </div>
              <pre className="max-h-[420px] overflow-auto px-5 py-4 text-sm leading-7 text-ink-1 whitespace-pre-wrap break-words font-mono">
                {streamedDoc || "Waiting for the first tokens..."}
              </pre>
            </div>
          </div>
        )}

        {stage === "editing" && (
          <DocumentEditor
            content={generatedDoc}
            onChange={setGeneratedDoc}
            onRefine={handleRefine}
            config={config}
            glossaryData={glossaryData}
            history={history}
            baselineContent={baselineDoc}
            onSaveToCloud={handleSaveToCloud}
            onSaveVersion={handleSaveVersion}
            cloudSaving={cloudSaving}
            cloudSaved={cloudSaved}
            isLoggedIn={!!user}
          />
        )}
      </main>

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
    </div>
  );
}
