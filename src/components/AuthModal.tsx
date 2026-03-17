"use client";

import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { X, Loader2, Mail, Lock, User, AlertTriangle } from "lucide-react";

type AuthMode = "signin" | "signup" | "magic";

export default function AuthModal({ onClose, onAuth }: {
  onClose: () => void;
  onAuth: (user: { id: string; email: string }) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setMagicSent(true);
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.user) onAuth({ id: data.user.id, email: data.user.email! });
        onClose();
        return;
      }

      // signin
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) onAuth({ id: data.user.id, email: data.user.email! });
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-surface-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="text-base font-display font-bold text-ink-0">
              {mode === "signup" ? "Create account" : mode === "magic" ? "Magic link" : "Sign in"}
            </h2>
            <p className="text-xs text-ink-3 mt-0.5">Save and sync your documents to the cloud</p>
          </div>
          <button onClick={onClose} className="text-ink-4 hover:text-ink-2 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {!isSupabaseConfigured ? (
            <div className="text-center py-6">
              <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
              <p className="font-semibold text-ink-0">Authentication not configured</p>
              <p className="text-sm text-ink-3 mt-1">
                Supabase credentials are missing. Add <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment variables.
              </p>
              <button
                onClick={onClose}
                className="mt-4 text-sm text-brand-600 hover:underline"
              >
                Close
              </button>
            </div>
          ) : magicSent ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✉️</div>
              <p className="font-semibold text-ink-0">Check your inbox</p>
              <p className="text-sm text-ink-3 mt-1">
                We sent a sign-in link to <strong>{email}</strong>.
              </p>
              <button
                onClick={() => { setMagicSent(false); setMode("signin"); }}
                className="mt-4 text-sm text-brand-600 hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input
                    type="text" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-surface-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  type="email" placeholder="Email address" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-surface-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
                />
              </div>

              {mode !== "magic" && (
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input
                    type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} minLength={6}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-surface-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-accent-red bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 bg-brand-700 text-white text-sm font-semibold rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {mode === "signup" ? "Create account" : mode === "magic" ? "Send magic link" : "Sign in"}
              </button>
            </form>
          )}

          {/* Mode switchers */}
          {isSupabaseConfigured && !magicSent && (
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-ink-3">
              {mode !== "signin" && (
                <button onClick={() => setMode("signin")} className="hover:text-brand-600 transition-colors">
                  Sign in with password
                </button>
              )}
              {mode !== "signup" && (
                <button onClick={() => setMode("signup")} className="hover:text-brand-600 transition-colors">
                  Create account
                </button>
              )}
              {mode !== "magic" && (
                <button onClick={() => setMode("magic")} className="hover:text-brand-600 transition-colors">
                  Magic link
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
