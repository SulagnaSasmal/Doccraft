"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import Header from "@/components/Header";
import UploadPanel from "@/components/UploadPanel";
import ConfigPanel from "@/components/ConfigPanel";
import GapAnalysis from "@/components/GapAnalysis";
import DocumentEditor from "@/components/DocumentEditor";
import StatusBar from "@/components/StatusBar";

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
  priority: "critical" | "optional";
}

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
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [error, setError] = useState("");

  const handleFilesUploaded = (content: string, names: string[]) => {
    setUploadedContent(content);
    setFileNames(names);
    setError("");
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
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Generation failed");
      }

      const data = await res.json();
      setGeneratedDoc(data.document);
      setStage("editing");
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
    setQuestions([]);
    setGeneratedDoc("");
    setError("");
  };

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
          <div className="animate-fade-in-up">
            {/* Hero Section */}
            <div className="text-center mb-10 pt-4">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ink-0 tracking-tight leading-tight">
                Turn raw content into publication-ready documentation
              </h2>
              <p className="mt-3 text-ink-2 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Upload notes, specs, or drafts. DocCraft AI structures, fills gaps, and generates docs your audience can actually use.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-50 border border-brand-100 rounded-full text-sm text-brand-700 font-medium">
                <Sparkles size={15} />
                Powered by GPT-4o
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <UploadPanel
                  onContentChange={handleFilesUploaded}
                  uploadedContent={uploadedContent}
                  fileNames={fileNames}
                />
              </div>
              <div className="space-y-5">
                <ConfigPanel config={config} onChange={setConfig} />
                <button
                  onClick={handleAnalyze}
                  disabled={!uploadedContent.trim() || stage === "analyzing"}
                  className="w-full py-3.5 px-5 bg-brand-700 text-white font-bold rounded-xl
                             hover:bg-brand-800 active:scale-[0.98] transition-all duration-150
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-700
                             shadow-lg hover:shadow-xl text-base tracking-wide"
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

            {/* Value Banner */}
            <div className="mt-8 text-center py-4 px-6 bg-surface-1 border border-surface-3 rounded-xl">
              <p className="text-sm text-ink-1 font-medium">
                Free to use. No account required.
                <span className="text-ink-3 font-normal ml-1">
                  Sign in to save sessions and publish to GitHub.
                </span>
              </p>
            </div>
          </div>
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
            docType={config.docType}
          />
        )}
      </main>

      <StatusBar stage={stage} fileCount={fileNames.length} />
    </div>
  );
}
