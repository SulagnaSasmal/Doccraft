"use client";

import type { AppStage } from "@/app/page";

const TIPS: Record<AppStage, string> = {
  upload: "Upload raw content — meeting notes, specs, screenshots, or paste text directly",
  analyzing: "AI is reading your content and identifying information gaps…",
  questions: "Answer what you can, skip what you don't know — the AI will make reasonable assumptions",
  generating: "Generating structured documentation based on your inputs and answers…",
  editing: "Edit the document directly • Select text + click an AI action to refine specific sections",
};

export default function StatusBar({
  stage,
  fileCount,
}: {
  stage: AppStage;
  fileCount: number;
}) {
  return (
    <footer className="border-t border-surface-2 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
        <p className="text-[0.7rem] text-ink-3">
          {TIPS[stage]}
        </p>
        <div className="flex items-center gap-3 text-[0.7rem] text-ink-4">
          {fileCount > 0 && (
            <span>
              {fileCount} source{fileCount > 1 ? "s" : ""}
            </span>
          )}
          <span>Powered by OpenAI</span>
        </div>
      </div>
    </footer>
  );
}
