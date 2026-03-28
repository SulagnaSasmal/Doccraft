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
  Search, Scissors, Layers, ScanText,
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
  const [heroDragging, setHeroDragging] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [justGenerated, setJustGenerated] = useState(false);

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

  // ── OCR handoff: pre-load text extracted by /ocr page ──────────────────
  useEffect(() => {
    const ocrText = sessionStorage.getItem("doccraft_ocr_text");
    const ocrFiles = sessionStorage.getItem("doccraft_ocr_files");
    if (ocrText) {
      setUploadedContent(ocrText);
      try {
        const names: string[] = ocrFiles ? JSON.parse(ocrFiles) : [];
        setFileNames(names.length ? names : ["ocr-extracted.txt"]);
      } catch {
        setFileNames(["ocr-extracted.txt"]);
      }
      sessionStorage.removeItem("doccraft_ocr_text");
      sessionStorage.removeItem("doccraft_ocr_files");
    }
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

  const processFilesForHero = async (files: FileList) => {
    const contents: string[] = [];
    const names: string[] = [];
    for (const file of Array.from(files)) {
      names.push(file.name);
      if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
        contents.push(await file.text());
      } else if (file.type.startsWith("image/")) {
        contents.push(`[Image: ${file.name}]\n(Image uploaded — will be analyzed by AI vision)`);
      } else if (file.name.endsWith(".json")) {
        contents.push(`[JSON File: ${file.name}]\n${await file.text()}`);
      } else {
        try { contents.push(await file.text()); }
        catch { contents.push(`[File: ${file.name}] (Binary — text extraction unavailable in browser)`); }
      }
    }
    handleFilesUploaded(contents.join("\n\n---\n\n"), names);
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
      setJustGenerated(true);
      setTimeout(() => setJustGenerated(false), 6000);

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

  const wordCount = uploadedContent ? uploadedContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const estimatedPages = Math.ceil(wordCount / 250) || 0;

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-950 bg-grid-slate animate-in-faded"
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
        <div className="w-[248px] shrink-0 flex flex-col overflow-hidden">
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
        <main className="flex-1 flex flex-col overflow-hidden border-x border-slate-800 custom-scrollbar">

          {(stage === "upload" || stage === "analyzing") && (
            !uploadedContent ? (
              /* ── HERO: empty state — upload zone is the centrepiece ── */
              <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 animate-in-faded overflow-auto">
                <div className="w-full max-w-lg">

                  {/* Compliance badge */}
                  <div className="flex justify-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-600/10 border border-emerald-500/20">
                      <Shield size={11} className="text-emerald-400" />
                      <span className="text-[0.68rem] font-medium text-emerald-300 tracking-wide">
                        Local Browser Processing — No Data Leaves Your Machine
                      </span>
                    </div>
                  </div>

                  {/* Value proposition */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-100 leading-snug mb-3">
                      Drop your source material.<br />
                      <span className="text-blue-400">DocCraft does the rest.</span>
                    </h1>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Specs, notes, API logs, or scanned PDFs — DocCraft identifies gaps, suggests structure, and generates production-ready technical documentation.
                    </p>
                  </div>

                  {/* Hero drop zone */}
                  <div
                    onDragEnter={(e) => { e.preventDefault(); setHeroDragging(true); }}
                    onDragLeave={() => setHeroDragging(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); setHeroDragging(false); if (e.dataTransfer.files.length) processFilesForHero(e.dataTransfer.files); }}
                    onClick={() => heroFileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                      heroDragging
                        ? "border-blue-500 bg-blue-600/10 scale-[1.01]"
                        : "border-slate-700 hover:border-blue-500/40 hover:bg-slate-800/20"
                    }`}
                  >
                    <input
                      ref={heroFileRef}
                      type="file"
                      multiple
                      title="Upload source files"
                      accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.gif,.webp"
                      onChange={(e) => { if (e.target.files) processFilesForHero(e.target.files); }}
                      className="hidden"
                    />
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-all ${heroDragging ? "bg-blue-600/20 border-blue-500/40" : "bg-slate-800 border-slate-700"}`}>
                      <Upload size={22} className={heroDragging ? "text-blue-400" : "text-slate-500"} />
                    </div>
                    <p className="text-[0.95rem] font-semibold text-slate-200 mb-1">Drop files here to begin</p>
                    <p className="text-sm text-slate-500 mb-5">or click to browse your computer</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["TXT", "MD", "PDF", "DOCX", "JSON", "Images"].map((fmt) => (
                        <span key={fmt} className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[0.65rem] font-mono text-slate-500">
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick-access tool shortcuts */}
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-600 text-center mt-6 mb-3">
                    Or jump directly to a processing tool
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <a href="/split" className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all group">
                      <Scissors size={15} className="text-blue-400" />
                      <p className="text-[0.72rem] font-semibold text-slate-300 group-hover:text-slate-100 leading-tight">Content Atomicizer</p>
                      <p className="text-[0.62rem] text-slate-600 leading-tight">Split PDF into sections</p>
                    </a>
                    <a href="/merge" className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-purple-500/30 hover:bg-purple-600/5 transition-all group">
                      <Layers size={15} className="text-purple-400" />
                      <p className="text-[0.72rem] font-semibold text-slate-300 group-hover:text-slate-100 leading-tight">Document Assembler</p>
                      <p className="text-[0.62rem] text-slate-600 leading-tight">Merge multiple PDFs</p>
                    </a>
                    <a href="/ocr" className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-emerald-500/30 hover:bg-emerald-600/5 transition-all group">
                      <ScanText size={15} className="text-emerald-400" />
                      <p className="text-[0.72rem] font-semibold text-slate-300 group-hover:text-slate-100 leading-tight">OCR Ingestion</p>
                      <p className="text-[0.62rem] text-slate-600 leading-tight">Extract text from scans</p>
                    </a>
                  </div>

                </div>
              </div>
            ) : (
              /* ── SMART SUGGESTIONS: content loaded — show file intel + library ── */
              <div className="flex-1 overflow-auto">
                <div className="px-6 pt-6 pb-2">
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-600/5 p-4 animate-fade-in-up">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
                        <Sparkles size={14} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.8rem] font-semibold text-blue-300 mb-1">
                          DocCraft has read your source material
                        </p>
                        <p className="text-[0.72rem] text-slate-400 mb-3">
                          {fileNames.length} file{fileNames.length > 1 ? "s" : ""} loaded &middot;{" "}
                          ~{wordCount.toLocaleString()} words &middot;{" "}
                          ~{estimatedPages} page{estimatedPages !== 1 ? "s" : ""}
                        </p>
                        {recommendation && !recDismissed ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[0.72rem] text-slate-300">Suggested output:</span>
                            <button
                              type="button"
                              onClick={() => { setConfig((c) => ({ ...c, docType: recommendation.type })); setRecDismissed(true); }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-[0.72rem] font-semibold text-blue-300 hover:bg-blue-600/30 transition-colors"
                            >
                              {DOC_TYPE_LABELS[recommendation.type] || recommendation.type} →
                            </button>
                            <span className="text-[0.65rem] text-slate-600">
                              {Math.round(recommendation.confidence * 100)}% confidence
                            </span>
                          </div>
                        ) : (
                          <p className="text-[0.72rem] text-slate-500">
                            Configure output type in the left panel, then click <span className="text-slate-300 font-medium">Analyze &amp; Identify Gaps</span>.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <DocumentLibrary
                  history={history}
                  onRestore={handleRestoreSession}
                  onRemove={removeSession}
                  onClearAll={clearAll}
                  onNewDoc={handleStartOver}
                />
              </div>
            )
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
                type="button"
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
              {justGenerated && (
                <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-600/8 p-4 animate-fade-in-up flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
                    <Download size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.82rem] font-semibold text-emerald-300 mb-0.5">
                      Documentation generated
                    </p>
                    <p className="text-[0.72rem] text-slate-400 leading-relaxed">
                      Your <span className="text-slate-200 font-medium">{DOC_TYPE_LABELS[config.docType] || config.docType}</span> is ready
                      {" · "}~{generatedDoc.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                      {" · "}~{Math.ceil(generatedDoc.trim().split(/\s+/).filter(Boolean).length / 250)} pages estimated
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[0.65rem] text-slate-500">Use the toolbar below to refine, export, or save to cloud.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Dismiss"
                    onClick={() => setJustGenerated(false)}
                    className="text-slate-600 hover:text-slate-400 shrink-0 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
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
          className="w-[220px] shrink-0 flex flex-col overflow-hidden border-l border-slate-800/60 bg-slate-900/80"
        >
          <div className="px-4 py-3.5 border-b border-slate-800/60">
            <h2 className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">
              Document Insights
            </h2>
          </div>
          <div className="flex-1 overflow-auto px-3 py-3 space-y-3">

            {/* Auth nudge */}
            {!user && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                <Cloud size={13} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[0.68rem] text-slate-300 leading-relaxed">
                    <button type="button" onClick={() => setShowAuth(true)} className="text-blue-400 font-semibold hover:underline">
                      Sign in
                    </button>{" "}
                    to unlock cloud save, teams &amp; GitHub publishing.
                  </p>
                </div>
              </div>
            )}

            {/* Document Properties — shown when source material is loaded */}
            {fileNames.length > 0 && (
              <div className="px-3 py-2.5 bg-slate-800/30 border border-slate-700/40 rounded-xl">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Document Properties
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-slate-500">Sources</span>
                    <span className="text-[0.65rem] text-slate-300 font-medium">{fileNames.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-slate-500">Words</span>
                    <span className="text-[0.65rem] text-slate-300 font-medium">~{wordCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-slate-500">Est. Pages</span>
                    <span className="text-[0.65rem] text-slate-300 font-medium">~{estimatedPages}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-slate-500">Output Type</span>
                    <span className="text-[0.65rem] text-blue-400 font-medium truncate max-w-[90px] text-right">
                      {DOC_TYPE_LABELS[config.docType] || config.docType}
                    </span>
                  </div>
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

            {/* Help Center quick links */}
            <div className="px-3 py-2.5 bg-slate-800/30 border border-slate-700/40 rounded-xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Help Center
              </p>
              <div className="space-y-0.5">
                {[
                  { label: "Getting Started", file: "getting-started.html" },
                  { label: "Workflow Guides", file: "workflows.html" },
                  { label: "Generating Docs", file: "feature-generate.html" },
                  { label: "UI Reference", file: "ui-reference.html" },
                  { label: "FAQ", file: "faq.html" },
                  { label: "Troubleshooting", file: "troubleshooting.html" },
                  { label: "Release Notes", file: "release-notes.html" },
                ].map((item) => (
                  <a
                    key={item.file}
                    href={`/workspace?file=${item.file}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors group"
                  >
                    <span className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-blue-400 transition-colors shrink-0" />
                    <span className="text-[0.68rem] text-slate-400 group-hover:text-slate-200 transition-colors truncate">
                      {item.label}
                    </span>
                  </a>
                ))}
              </div>
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
