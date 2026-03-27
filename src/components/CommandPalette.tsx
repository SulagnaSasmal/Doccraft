"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  FileText,
  Upload,
  Settings,
  Sun,
  Moon,
  RotateCcw,
  Shield,
  Sparkles,
  Download,
  Copy,
  Users,
  Cloud,
  Webhook,
  HelpCircle,
  GitGraph,
  ImageIcon,
  Globe,
} from "lucide-react";

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: typeof Search;
  group: string;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q)
    );
  }, [query, actions]);

  // Group the results
  const grouped = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    for (const a of filtered) {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group)!.push(a);
    }
    return map;
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] cmd-backdrop" onClick={onClose}>
      <div
        className="mx-auto mt-[15vh] w-full max-w-lg animate-slide-up-fade"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-strong rounded-2xl shadow-glass overflow-hidden border border-surface-3">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-3">
            <Search size={16} className="text-ink-3 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search…"
              className="flex-1 bg-transparent text-sm text-ink-0 placeholder:text-ink-4 focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[0.6rem] font-mono font-semibold text-ink-4 bg-surface-2 rounded border border-surface-3">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[360px] overflow-auto py-2">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-ink-3">
                No commands found for &ldquo;{query}&rdquo;
              </p>
            )}

            {Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[0.6rem] font-semibold text-ink-4 uppercase tracking-wider">
                    {group}
                  </span>
                </div>
                {items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        selectedIndex === idx
                          ? "bg-brand-50 dark:bg-brand-900/30"
                          : "hover:bg-surface-1"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={
                          selectedIndex === idx ? "text-brand-600" : "text-ink-3"
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            selectedIndex === idx ? "text-brand-700 dark:text-brand-300" : "text-ink-0"
                          }`}
                        >
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-[0.7rem] text-ink-3 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[0.6rem] font-mono text-ink-4 bg-surface-2 rounded border border-surface-3">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-surface-3 bg-surface-1/50">
            <span className="text-[0.6rem] text-ink-4">
              {filtered.length} command{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2 text-[0.6rem] text-ink-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Standard action sets that can be used from page.tsx */
export { Search, FileText, Upload, Settings, Sun, Moon, RotateCcw, Shield, Sparkles, Download, Copy, Users, Cloud, Webhook, HelpCircle, GitGraph, ImageIcon, Globe };
