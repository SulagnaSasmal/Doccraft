"use client";

import { useState } from "react";
import Header from "@/components/Header";
import UploadPanel from "@/components/UploadPanel";
import ConfigPanel from "@/components/ConfigPanel";
import ContextPanel from "@/components/ContextPanel";
import GapAnalysis from "@/components/GapAnalysis";
import DocumentEditor from "@/components/DocumentEditor";
import StatusBar from "@/components/StatusBar";
import type { GlossaryData } from "@/lib/validateTerminology";

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
          />
        )}
      </main>

      <StatusBar stage={stage} fileCount={fileNames.length} />
    </div>
  );
}
