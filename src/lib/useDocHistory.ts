"use client";

import { useEffect, useState, useCallback } from "react";
import type { DocConfig } from "@/app/page";

export interface DocSession {
  id: string;
  timestamp: number;
  config: DocConfig;
  inputSummary: string; // first 100 chars of source content
  generatedDoc: string;
}

const STORAGE_KEY = "doccraft_history";
const MAX_SESSIONS = 10;

function loadFromStorage(): DocSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DocSession[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(sessions: DocSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    // Storage unavailable or full
  }
}

export function useDocHistory() {
  const [history, setHistory] = useState<DocSession[]>([]);

  useEffect(() => {
    setHistory(loadFromStorage());
  }, []);

  const addSession = useCallback(
    (session: Omit<DocSession, "id" | "timestamp">) => {
      const entry: DocSession = {
        ...session,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      setHistory((prev) => {
        const updated = [entry, ...prev].slice(0, MAX_SESSIONS);
        writeToStorage(updated);
        return updated;
      });
      return entry;
    },
    []
  );

  const removeSession = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      writeToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setHistory([]);
    writeToStorage([]);
  }, []);

  return { history, addSession, removeSession, clearAll };
}
