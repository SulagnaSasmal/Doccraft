"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "doccraft_theme";

function getIsDark() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function useTheme() {
  const [theme, setThemeRaw] = useState<Theme>("system");
  const [isDark, setIsDark] = useState(false);

  // Sync initial state from localStorage and DOM
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved) setThemeRaw(saved);
    setIsDark(getIsDark());
  }, []);

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    if (t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
      setIsDark(true);
    } else {
      root.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme, applyTheme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeRaw(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, isDark };
}
