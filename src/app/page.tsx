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
import { useDocHistory } from "@/lib/useDocHistory";
import type { GlossaryData } from "@/lib/validateTerminology";
import { Sparkles, X } from "lucide-react";

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
  const [error, setError] = useState("");

  // History
  const { history, addSession, removeSession, clearAll } = useDocHistory();

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
        const data = await res.json();
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
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          content: uploadedContent,
          config,
          contextText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Analysis failed");
      }

      const data = await res.json();
      setQuestions(data.questions);
      setStage("questions");
    } catch (err: any) {
      setError(err.message || "Something went wrong during analysis.");
      setStage("upload");
    }
  };

  const handleGenerate = async (answeredQuestions: GapQuestion[]) => {
    setStage("generating");
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          content: uploadedContent,
          config,
          answers: answeredQuestions,
          contextText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Generation failed");
      }

      const data = await res.json();
      setGeneratedDoc(data.document);
      setStage("editing");

      // Save to history
      addSession({
        config,
        inputSummary: uploadedContent.slice(0, 120).trim(),
        generatedDoc: data.document,
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong during generation.");
      setStage("questions");
    }
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
    const data = await res.json();
    return data.refined;
  };

  const handleStartOver = () => {
    setStage("upload");
    setUploadedContent("");
    setFileNames([]);
    setContextText("");
    setGlossaryData(null);
    setQuestions([]);
    setGeneratedDoc("");
    setError("");
    setRecommendation(null);
    setRecDismissed(false);
  };

  const handleRestoreSession = (session: import("@/lib/useDocHistory").DocSession) => {
    setConfig(session.config);
    setGeneratedDoc(session.generatedDoc);
    setStage("editing");
  };

  const showRecommendation =
    recommendation &&
    !recDismissed &&
    stage === "upload" &&
    uploadedContent.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header stage={stage} onStartOver={handleStartOver} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-accent-red text-sm animate-fade-in-up">
            {error}
          </div>
        )}

        {(stage === "upload" || stage === "analyzing") && (
          <>
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
            <p className="text-ink-3 text-sm mt-1">This may take 15–30 seconds</p>
          </div>
        )}

        {stage === "editing" && (
          <DocumentEditor
            content={generatedDoc}
            onChange={setGeneratedDoc}
            onRefine={handleRefine}
            config={config}
            glossaryData={glossaryData}
          />
        )}
      </main>

      <StatusBar stage={stage} fileCount={fileNames.length} />
    </div>
  );
}
