"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, RotateCcw, ChevronRight, FileText,
  Zap, Shield, Clock, CheckCircle2, ExternalLink,
  Upload, Search, Sparkles, Edit3, Download, Volume2, VolumeX,
} from "lucide-react";

// ── Demo script ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: "intro",
    title: "DocCraft AI",
    subtitle: "Intelligent Documentation Generator",
    narration: "DocCraft transforms raw, messy source material into polished, structured technical documentation — with a gap analysis check before a single word is written. Every other AI documentation tool skips that check. DocCraft does not.",
    duration: 6000,
  },
  {
    id: "upload",
    title: "Step 1 — Upload",
    subtitle: "Any format. Any source.",
    narration: "Documentation work doesn't start with clean Markdown files. It starts with a PDF spec, a Word document with tracked changes, a screenshot of a whiteboard, or a Slack thread someone copy-pasted into notes. DocCraft accepts all of it — PDF, DOCX, PNG, JSON, CSV, and more. Everything is extracted and normalised before analysis begins.",
    duration: 7000,
  },
  {
    id: "gap",
    title: "Step 2 — Gap Analysis",
    subtitle: "What's missing before you write?",
    narration: "This is the step that changes everything. Before generating a single word, DocCraft reads your source material and identifies what is missing — not what is poorly written, but what is absent. Missing information. Ambiguities that could mean two things. Assumptions the audience doesn't share. It then asks specific, content-aware questions tied directly to what it found.",
    duration: 8000,
  },
  {
    id: "generate",
    title: "Step 3 — Generate",
    subtitle: "Audience-aware. Structure-first.",
    narration: "Choose your document type — User Guide, API Reference, Quick Start, Troubleshooting. Set the audience level and tone. The model writes from your gap analysis answers, not just the raw source. The 90 seconds of structured input gathering before generation is what changes the output quality — not the model size, not the prompt engineering.",
    duration: 7000,
  },
  {
    id: "compliance",
    title: "Step 4 — Compliance Check",
    subtitle: "Microsoft Style Guide. Automatic.",
    narration: "The compliance checker runs the moment the document is generated — not after you have already read it and accepted the problems. Passive voice. Title Case headings that should be Sentence case. Procedure steps missing imperative verbs. Forbidden terms like simply and just. Every issue is categorised by severity with a one-click fix.",
    duration: 7500,
  },
  {
    id: "edit",
    title: "Step 5 — Edit & Export",
    subtitle: "Diagrams, infographics, cloud save.",
    narration: "Edit inline in the structured editor. Generate Mermaid diagrams — flowcharts, sequence diagrams, state diagrams — directly from the document content. Create visual infographics. Save to your cloud document library or export as Markdown, HTML, or PDF. Sign in to unlock team workspaces and GitHub publishing.",
    duration: 7000,
  },
  {
    id: "outro",
    title: "Try DocCraft",
    subtitle: "Free. No install. Runs in your browser.",
    narration: "The gap analysis is the differentiator. No other tool I have tested asks what is missing before it writes. That step changes the output quality in a way that better prompting or a larger model does not. DocCraft is free, runs entirely in your browser, and requires no installation. Open it now and try it with your own source material.",
    duration: 7000,
  },
];

const FEATURES = [
  { icon: Upload,   color: "text-blue-400",   label: "10+ file formats",       sub: "PDF, DOCX, PNG, JSON…" },
  { icon: Search,   color: "text-yellow-400", label: "AI Gap Analysis",        sub: "Finds what's missing first" },
  { icon: Sparkles, color: "text-violet-400", label: "GPT-4o-mini generation", sub: "Structured, audience-aware" },
  { icon: Shield,   color: "text-emerald-400",label: "MSTP Compliance",        sub: "Auto-runs on every draft" },
  { icon: Edit3,    color: "text-orange-400", label: "Live editor",            sub: "Diagrams, inline AI edits" },
  { icon: Download, color: "text-slate-400",  label: "Export anywhere",        sub: "MD, HTML, PDF, cloud save" },
];

const SAMPLE_CONTENT = `# VaultPay Payments API — Internal Spec v2.1

## /v2/payments/initiate  POST

Initiates a payment transaction. Requires merchant authentication.

Parameters:
- amount (integer, required) — amount in minor units (pence/cents)
- currency (string, required) — ISO 4217 code e.g. GBP, USD
- reference (string, optional) — merchant reference, max 64 chars
- callback_url (string, optional) — webhook for async status updates

Returns: { transaction_id, status, created_at }

Status values: PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED

Note: 3DS2 challenge may be triggered for high-value transactions.
Retry logic: exponential backoff, max 3 attempts.`;

const COMPLIANCE_FLAGS = [
  { severity: "error",   text: "Heading uses passive structure — rewrite as imperative",  fix: "Auto-fix" },
  { severity: "warning", text: '"optional" — avoid; state the default behaviour instead', fix: "Auto-fix" },
  { severity: "warning", text: "Missing introductory sentence before parameter list",      fix: "Auto-fix" },
  { severity: "info",    text: "Consider adding a code example for the response object",  fix: "Suggest" },
];

export default function DemoPage() {
  const [step, setStep]           = useState(0);
  const [playing, setPlaying]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [narrate, setNarrate]     = useState(true);
  const [captionWord, setCaptionWord] = useState(0);  // how many words of narration are visible
  const [typedContent, setTyped]  = useState("");
  const [complianceDone, setCD]   = useState(false);

  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const captionRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef  = useRef<SpeechSynthesisUtterance | null>(null);

  const current = STEPS[step];
  const narrationWords = current.narration.split(" ");

  // ── speech synthesis ──────────────────────────────────────────────────────
  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, []);

  const speak = useCallback((text: string) => {
    if (!narrate || typeof window === "undefined" || !window.speechSynthesis) return;
    stopSpeech();
    const u = new SpeechSynthesisUtterance(text);
    u.rate  = 0.92;
    u.pitch = 1.0;
    u.lang  = "en-GB";
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  }, [narrate, stopSpeech]);

  // ── caption word ticker ───────────────────────────────────────────────────
  const clearCaption = () => {
    if (captionRef.current) clearInterval(captionRef.current);
  };

  const startCaption = useCallback((dur: number, words: string[]) => {
    clearCaption();
    setCaptionWord(0);
    if (words.length === 0) return;
    const msPerWord = Math.max(60, (dur / words.length));
    let i = 0;
    captionRef.current = setInterval(() => {
      i++;
      setCaptionWord(i);
      if (i >= words.length) clearCaption();
    }, msPerWord);
  }, []);

  // ── timer helpers ─────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    clearCaption();
  }, []);

  const advanceTo = useCallback((nextStep: number) => {
    stopSpeech();
    clearTimers();
    setProgress(0);
    setCaptionWord(0);
    setCD(false);
    if (nextStep >= STEPS.length) { setPlaying(false); setStep(0); return; }
    setStep(nextStep);
  }, [stopSpeech, clearTimers]);

  // ── typewriter on upload step ─────────────────────────────────────────────
  useEffect(() => {
    if (STEPS[step].id !== "upload") { setTyped(""); return; }
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(SAMPLE_CONTENT.slice(0, i * 4));
      if (i * 4 >= SAMPLE_CONTENT.length) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [step]);

  // ── compliance scan animation ─────────────────────────────────────────────
  useEffect(() => {
    if (STEPS[step].id !== "compliance") return;
    const t = setTimeout(() => setCD(true), 800);
    return () => clearTimeout(t);
  }, [step]);

  // ── auto-advance + captions + speech ─────────────────────────────────────
  useEffect(() => {
    if (!playing) {
      clearTimers();
      stopSpeech();
      return;
    }
    const dur = current.duration;
    const words = current.narration.split(" ");

    // speak
    speak(current.narration);

    // caption word ticker
    startCaption(dur, words);

    // progress bar
    let elapsed = 0;
    const tick  = 50;
    progressRef.current = setInterval(() => {
      elapsed += tick;
      setProgress(Math.min(100, (elapsed / dur) * 100));
    }, tick);

    // advance
    timerRef.current = setTimeout(() => advanceTo(step + 1), dur);

    return () => { clearTimers(); stopSpeech(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, step]);

  // stop speech when narrate toggled off
  useEffect(() => {
    if (!narrate) stopSpeech();
  }, [narrate, stopSpeech]);

  const handlePlay    = () => setPlaying((v) => !v);
  const handleRestart = () => { setPlaying(false); stopSpeech(); setStep(0); setProgress(0); setCaptionWord(0); };

  // visible caption text (words revealed so far)
  const captionText = narrationWords.slice(0, captionWord).join(" ");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md px-5 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
            <FileText size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-none">DocCraft <span className="text-blue-400">AI</span></h1>
            <p className="text-[0.6rem] text-slate-500 uppercase tracking-wide mt-0.5">Product Demo</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Narrate toggle */}
          <button
            type="button"
            onClick={() => setNarrate((v) => !v)}
            title={narrate ? "Turn off narration" : "Turn on narration"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${narrate
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"}`}
          >
            {narrate ? <Volume2 size={13} /> : <VolumeX size={13} />}
            {narrate ? "Narration on" : "Narration off"}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw size={12} /> Restart
          </button>

          <button
            type="button"
            onClick={handlePlay}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm shadow-blue-900/40"
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            {playing ? "Pause" : step === 0 ? "Play Demo" : "Resume"}
          </button>

          <a
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-blue-500/40 text-blue-400 hover:bg-blue-600/10 transition-colors"
          >
            Try It <ExternalLink size={11} />
          </a>
        </div>
      </header>

      {/* ── Progress bar ─────────────────────────────────────────────────────── */}
      <div className="w-full h-0.5 bg-slate-800">
        <div className="h-full bg-blue-500 transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Step nav pills ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 py-3 border-b border-slate-800/60 px-4 flex-wrap">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setPlaying(false); advanceTo(i); }}
            className={`px-3 py-1 rounded-full text-[0.62rem] font-medium transition-all
              ${i === step
                ? "bg-blue-600 text-white shadow-sm shadow-blue-900/40"
                : i < step
                ? "bg-emerald-900/40 text-emerald-400 border border-emerald-700/40"
                : "bg-slate-800/60 text-slate-500 border border-slate-700/40 hover:text-slate-300"
              }`}
          >
            {i < step && <CheckCircle2 size={9} className="inline mr-1" />}
            {s.title.replace(/^Step \d+ — /, "")}
          </button>
        ))}
      </div>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* Left: script panel */}
        <div className="lg:w-[340px] shrink-0 border-r border-slate-800/60 flex flex-col justify-center px-8 py-10 space-y-5">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-blue-400 mb-2">
              {step + 1} / {STEPS.length}
            </p>
            <h2 className="text-2xl font-bold text-slate-100 leading-tight">{current.title}</h2>
            <p className="text-base font-medium text-blue-300 mt-1">{current.subtitle}</p>
          </div>

          {/* Full narration script — shown in left panel always */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-500 mb-2">Script</p>
            <p className="text-[0.72rem] text-slate-300 leading-relaxed">{current.narration}</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setPlaying(false); advanceTo(Math.max(0, step - 1)); }}
              disabled={step === 0}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); advanceTo(step + 1); }}
              disabled={step === STEPS.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-30 rounded-lg hover:bg-blue-600/10 transition-colors"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Right: visual + caption */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Visual area */}
          <div className="flex-1 flex items-center justify-center p-8 bg-slate-900/40 overflow-auto">

            {/* intro / outro */}
            {(current.id === "intro" || current.id === "outro") && (
              <div className="max-w-lg w-full space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {FEATURES.map((f) => (
                    <div key={f.label} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
                      <f.icon size={14} className={`${f.color} shrink-0 mt-0.5`} />
                      <div>
                        <p className="text-[0.72rem] font-semibold text-slate-200">{f.label}</p>
                        <p className="text-[0.62rem] text-slate-500 mt-0.5">{f.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {current.id === "outro" && (
                  <div className="flex flex-col items-center gap-4 pt-2">
                    <a
                      href="/"
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-900/40"
                    >
                      <Sparkles size={14} /> Open DocCraft — it&apos;s free
                    </a>
                    <a
                      href="https://sulagnasasmal.github.io/blog/posts/doccraft-ai-documentation-tool-build-log/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Read the build log →
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* upload */}
            {current.id === "upload" && (
              <div className="w-full max-w-2xl space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-[0.7rem] text-slate-400">
                  <Upload size={11} className="text-blue-400" />
                  VaultPay-Spec-v2.1.pdf — extracted 847 words
                </div>
                <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 font-mono text-[0.68rem] text-slate-300 leading-relaxed min-h-[260px] whitespace-pre-wrap">
                  {typedContent}<span className="animate-pulse">▌</span>
                </div>
                <p className="text-[0.62rem] text-slate-600 text-center">
                  Also accepts: DOCX · MD · TXT · CSV · JSON · PNG · JPG · WEBP · GIF · TIFF
                </p>
              </div>
            )}

            {/* gap analysis */}
            {current.id === "gap" && (
              <div className="w-full max-w-lg space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-yellow-400" />
                  <p className="text-sm font-semibold text-slate-200">Gap Analysis — 4 issues found</p>
                </div>
                {[
                  { cat: "Missing",   q: "What authentication method does /v2/payments/initiate use? Bearer token, API key, or OAuth 2.0?", priority: "critical" },
                  { cat: "Missing",   q: "What HTTP status codes does the endpoint return on failure — 400, 401, 422, 500?",                 priority: "critical" },
                  { cat: "Ambiguous", q: "The spec says '3DS2 may be triggered' — what is the threshold amount and which currencies apply?", priority: "optional" },
                  { cat: "Assumption",q: "The audience is assumed to know minor currency units (pence/cents). Should this be explained?",    priority: "optional" },
                ].map((item, i) => (
                  <div key={i} className={`px-4 py-3 rounded-xl border text-[0.72rem] leading-relaxed
                    ${item.priority === "critical"
                      ? "bg-red-900/15 border-red-700/30 text-red-300"
                      : "bg-amber-900/15 border-amber-700/30 text-amber-300"}`}>
                    <span className={`text-[0.6rem] font-bold uppercase tracking-wider mr-2
                      ${item.priority === "critical" ? "text-red-500" : "text-amber-500"}`}>
                      {item.cat}
                    </span>
                    {item.q}
                  </div>
                ))}
                <p className="text-[0.62rem] text-slate-600 text-center pt-1">
                  Answer, skip, or let DocCraft infer — then generate.
                </p>
              </div>
            )}

            {/* generate */}
            {current.id === "generate" && (
              <div className="w-full max-w-sm space-y-4">
                {[
                  { label: "Document Type", value: "API Reference",                     accent: "text-blue-400"   },
                  { label: "Audience",      value: "Technical — Developers & engineers", accent: "text-violet-400" },
                  { label: "Tone",          value: "Formal — Professional & enterprise", accent: "text-slate-300"  },
                ].map((item) => (
                  <div key={item.label} className="px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
                    <p className="text-[0.62rem] text-slate-500 mb-0.5">{item.label}</p>
                    <p className={`text-[0.78rem] font-semibold ${item.accent}`}>{item.value}</p>
                  </div>
                ))}
                <div className="flex items-center justify-center pt-2">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[0.72rem] font-medium animate-pulse">
                    <Sparkles size={12} className="animate-spin" /> Generating…
                  </div>
                </div>
              </div>
            )}

            {/* compliance */}
            {current.id === "compliance" && (
              <div className="w-full max-w-lg space-y-2.5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={14} className="text-emerald-400" />
                  <p className="text-sm font-semibold text-slate-200">
                    MSTP Compliance — {complianceDone ? "4 issues" : "scanning…"}
                  </p>
                </div>
                {complianceDone
                  ? COMPLIANCE_FLAGS.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-[0.72rem] animate-fade-in-up
                        ${f.severity === "error"   ? "bg-red-900/15 border-red-700/30"
                        : f.severity === "warning" ? "bg-amber-900/15 border-amber-700/30"
                        :                            "bg-slate-800/40 border-slate-700/40"}`}
                      style={{ animationDelay: `${i * 120}ms` }}
                    >
                      <span className={`text-[0.6rem] font-bold uppercase tracking-wider shrink-0 mt-0.5
                        ${f.severity === "error" ? "text-red-400" : f.severity === "warning" ? "text-amber-400" : "text-slate-500"}`}>
                        {f.severity}
                      </span>
                      <span className="text-slate-300 flex-1">{f.text}</span>
                      <button type="button" className="text-[0.6rem] font-medium px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0">
                        {f.fix}
                      </button>
                    </div>
                  ))
                  : (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                  )
                }
              </div>
            )}

            {/* edit */}
            {current.id === "edit" && (
              <div className="w-full max-w-2xl space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40 flex-wrap gap-y-1">
                  {["Bold", "Italic", "Heading", "Link", "List", "Table", "Diagram", "Infographic", "AI Edit", "Export"].map((btn) => (
                    <button key={btn} type="button"
                      className={`px-2.5 py-1 rounded-md text-[0.6rem] font-medium transition-colors
                        ${["Diagram", "Infographic", "AI Edit"].includes(btn)
                          ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                          : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
                      {btn}
                    </button>
                  ))}
                </div>
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-5 font-serif text-[0.8rem] text-slate-200 leading-relaxed space-y-2 min-h-[220px]">
                  <h1 className="text-base font-bold text-white font-sans">VaultPay Payments API — v2.1</h1>
                  <p className="text-slate-400 text-[0.72rem]">
                    Use the <code className="bg-slate-700/60 px-1 rounded text-blue-300">/v2/payments/initiate</code> endpoint to create a payment transaction.
                    Authentication requires a Bearer token in the <code className="bg-slate-700/60 px-1 rounded text-blue-300">Authorization</code> header.
                  </p>
                  <p className="font-semibold text-slate-300 text-[0.75rem] mt-2">Request parameters</p>
                  <table className="w-full text-[0.68rem] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/60">
                        {["Parameter", "Type", "Required", "Description"].map((h) => (
                          <th key={h} className="text-left py-1 pr-3 text-slate-500 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-slate-400">
                      <tr><td className="py-1 pr-3 text-blue-300 font-mono">amount</td><td className="pr-3">integer</td><td className="pr-3 text-emerald-400">Yes</td><td>Amount in minor units</td></tr>
                      <tr><td className="py-1 pr-3 text-blue-300 font-mono">currency</td><td className="pr-3">string</td><td className="pr-3 text-emerald-400">Yes</td><td>ISO 4217 code, e.g. GBP or USD</td></tr>
                      <tr><td className="py-1 pr-3 text-blue-300 font-mono">reference</td><td className="pr-3">string</td><td className="pr-3 text-slate-600">No</td><td>Merchant reference, max 64 chars</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  {["Export MD", "Export HTML", "Save to Cloud"].map((btn) => (
                    <button key={btn} type="button"
                      className="px-3 py-1.5 rounded-lg text-[0.65rem] font-medium bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                      <Download size={10} className="inline mr-1" />{btn}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Caption bar ── always visible at bottom of visual area ─────── */}
          <div className="border-t border-slate-800/60 bg-slate-900/80 px-6 py-3 min-h-[56px] flex items-center">
            <p className="text-[0.78rem] text-slate-300 leading-relaxed max-w-3xl mx-auto text-center">
              {playing && captionText
                ? captionText
                : <span className="text-slate-600 italic">
                    {playing ? "…" : "Press Play to begin narrated demo"}
                  </span>
              }
            </p>
          </div>

        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 px-6 py-3 flex items-center justify-between text-[0.62rem] text-slate-600">
        <span>© 2026 Sulagna Sasmal · DocCraft AI</span>
        <div className="flex items-center gap-4">
          <a href="https://sulagnasasmal.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Portfolio</a>
          <a href="https://github.com/SulagnaSasmal" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">GitHub</a>
          <a href="https://sulagnasasmal.github.io/doccraft-help-center/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Help Center</a>
        </div>
      </footer>
    </div>
  );
}
