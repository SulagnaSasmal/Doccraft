"use client";

import { useState } from "react";
import { MessageSquarePlus, X, Send, Loader2, CheckCircle2 } from "lucide-react";

const MOODS = [
  { emoji: "😞", label: "Frustrated", value: "frustrated" },
  { emoji: "😐", label: "Neutral",    value: "neutral" },
  { emoji: "😊", label: "Satisfied",  value: "satisfied" },
  { emoji: "🤩", label: "Love it!",   value: "love" },
];

export default function FeedbackWidget() {
  const [open, setOpen]       = useState(false);
  const [mood, setMood]       = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const reset = () => { setMood(null); setMessage(""); setDone(false); };

  const handleOpen = () => {
    setOpen((v) => {
      if (!v) reset();
      return !v;
    });
  };

  const submit = async () => {
    if (!mood || loading) return;
    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, message: message.trim() }),
      });
      setDone(true);
      setTimeout(() => { setOpen(false); reset(); }, 2500);
    } catch {
      // silently fail — don't block the user
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger — bottom-left so it doesn't clash with HelpAgent */}
      <button
        type="button"
        onClick={handleOpen}
        className="fixed z-[300] flex items-center gap-2 px-3 h-10
                   bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white
                   rounded-full shadow-lg border border-slate-700/60
                   transition-all duration-200 text-xs font-medium"
        style={{ bottom: "1.5rem", left: "1.5rem" }}
        aria-label="Give feedback"
      >
        <MessageSquarePlus size={15} />
        Feedback
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed z-[299] w-72 flex flex-col rounded-2xl shadow-2xl
                     border border-slate-700/60 bg-slate-900 overflow-hidden
                     animate-fade-in-up"
          style={{ bottom: "5rem", left: "1.5rem" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
            <p className="text-[0.78rem] font-semibold text-slate-100">Share your feedback</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="px-4 py-4">
            {done ? (
              /* Thank-you state */
              <div className="flex flex-col items-center gap-2 py-4 text-center animate-fade-in-up">
                <CheckCircle2 size={28} className="text-green-400" />
                <p className="text-sm font-medium text-slate-200">Thank you!</p>
                <p className="text-xs text-slate-400">Your feedback helps improve DocCraft.</p>
              </div>
            ) : (
              <>
                <p className="text-[0.72rem] text-slate-400 mb-3">
                  How is your experience with DocCraft?
                </p>

                {/* Mood picker */}
                <div className="flex justify-between mb-4">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(m.value)}
                      title={m.label}
                      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all text-[1.4rem]
                                  ${mood === m.value
                                    ? "bg-blue-600/20 ring-1 ring-blue-500/50 scale-110"
                                    : "hover:bg-slate-800"
                                  }`}
                    >
                      {m.emoji}
                      <span className="text-[0.55rem] text-slate-500">{m.label}</span>
                    </button>
                  ))}
                </div>

                {/* Optional message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.metaKey && submit()}
                  placeholder="Tell us more (optional)…"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-3 py-2
                             text-[0.72rem] text-slate-200 placeholder:text-slate-600
                             resize-none outline-none focus:ring-1 focus:ring-blue-500/40 mb-3"
                />

                <button
                  type="button"
                  onClick={submit}
                  disabled={!mood || loading}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                             bg-blue-600 hover:bg-blue-700 disabled:opacity-30
                             text-white text-xs font-medium transition-colors"
                >
                  {loading
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Send size={13} />
                  }
                  {loading ? "Sending…" : "Submit feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
