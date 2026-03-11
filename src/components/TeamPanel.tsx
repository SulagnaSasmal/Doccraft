"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Copy, Check, LogOut, Crown, Loader2, X } from "lucide-react";

interface TeamMember { id: string; user_id: string; role: string; joined_at: string; email?: string; }
interface Team { id: string; name: string; invite_code: string; owner_id: string; }

export default function TeamPanel({
  user,
  accessToken,
  onClose,
}: {
  user: { id: string; email: string };
  accessToken: string;
  onClose: () => void;
}) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState<"view" | "create" | "join">("view");
  const [actionLoading, setActionLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams", { headers });
      const data = await res.json();
      setTeam(data.team || null);
      setMembers(data.members || []);
      setRole(data.role || "");
    } catch {
      setError("Could not load team data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeam(); }, []);

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    setActionLoading(true); setError("");
    try {
      const res = await fetch("/api/teams", { method: "POST", headers, body: JSON.stringify({ action: "create", name: newTeamName }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTeam(data.team); setRole(data.role); setMode("view");
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const joinTeam = async () => {
    if (!inviteCode.trim()) return;
    setActionLoading(true); setError("");
    try {
      const res = await fetch("/api/teams", { method: "POST", headers, body: JSON.stringify({ action: "join", inviteCode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTeam(data.team); setRole(data.role); setMode("view"); await loadTeam();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const leaveTeam = async () => {
    if (!team) return;
    setActionLoading(true); setError("");
    try {
      const res = await fetch(`/api/teams?teamId=${team.id}`, { method: "DELETE", headers });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setTeam(null); setMembers([]); setRole("");
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const copyInviteCode = () => {
    if (!team?.invite_code) return;
    navigator.clipboard.writeText(team.invite_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-surface-3 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-brand-600" />
            <h2 className="text-base font-display font-bold text-ink-0">Team Workspace</h2>
          </div>
          <button onClick={onClose} className="text-ink-4 hover:text-ink-2 transition-colors"><X size={18} /></button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-ink-4">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : team ? (
            <>
              {/* Team info */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-ink-0">{team.name}</p>
                  <p className="text-xs text-ink-3 mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""} · Your role: <span className="font-medium text-brand-600">{role}</span></p>
                </div>
                {role === "owner" && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
                    <Crown size={11} className="text-amber-600" />
                    <span className="text-[0.65rem] font-bold text-amber-700">Owner</span>
                  </div>
                )}
              </div>

              {/* Invite code */}
              <div className="bg-surface-1 border border-surface-2 rounded-xl p-3 mb-4">
                <p className="text-[0.65rem] font-semibold text-ink-4 uppercase tracking-wide mb-1">Invite code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono font-bold text-ink-0">{team.invite_code}</code>
                  <button onClick={copyInviteCode} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 rounded-lg transition-colors">
                    {codeCopied ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
                    {codeCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Members */}
              <div className="space-y-1.5 mb-5">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-surface-1 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                      {m.email ? m.email[0].toUpperCase() : "?"}
                    </div>
                    <span className="text-sm text-ink-1 flex-1 truncate">{m.email || m.user_id.slice(0, 12) + "…"}</span>
                    <span className="text-[0.65rem] text-ink-4 capitalize">{m.role}</span>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-accent-red bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

              <button onClick={leaveTeam} disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2 border border-red-200 text-accent-red text-xs font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                {role === "owner" ? "Delete team" : "Leave team"}
              </button>
            </>
          ) : mode === "view" ? (
            <>
              <p className="text-sm text-ink-2 mb-5">You&apos;re not part of a team yet. Create a new team or join an existing one with an invite code.</p>
              <div className="space-y-2">
                <button onClick={() => setMode("create")} className="w-full flex items-center gap-2 py-2.5 bg-brand-700 text-white text-sm font-semibold rounded-xl hover:bg-brand-800 transition-colors">
                  <Plus size={14} />Create a team
                </button>
                <button onClick={() => setMode("join")} className="w-full py-2.5 border border-surface-3 text-ink-2 text-sm font-medium rounded-xl hover:bg-surface-2 transition-colors">
                  Join with invite code
                </button>
              </div>
            </>
          ) : mode === "create" ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink-0">Create a new team</p>
              <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Team name (e.g. Docs Team)" className="w-full px-3 py-2.5 text-sm border border-surface-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200" />
              {error && <p className="text-xs text-accent-red">{error}</p>}
              <div className="flex gap-2">
                <button onClick={createTeam} disabled={actionLoading || !newTeamName.trim()} className="flex-1 py-2.5 bg-brand-700 text-white text-sm font-semibold rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {actionLoading && <Loader2 size={13} className="animate-spin" />}Create
                </button>
                <button onClick={() => setMode("view")} className="px-4 py-2.5 border border-surface-3 text-sm text-ink-2 rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink-0">Join with invite code</p>
              <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Enter 10-character code" className="w-full px-3 py-2.5 text-sm border border-surface-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 font-mono" />
              {error && <p className="text-xs text-accent-red">{error}</p>}
              <div className="flex gap-2">
                <button onClick={joinTeam} disabled={actionLoading || !inviteCode.trim()} className="flex-1 py-2.5 bg-brand-700 text-white text-sm font-semibold rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {actionLoading && <Loader2 size={13} className="animate-spin" />}Join team
                </button>
                <button onClick={() => setMode("view")} className="px-4 py-2.5 border border-surface-3 text-sm text-ink-2 rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
