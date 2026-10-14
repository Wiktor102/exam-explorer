import { useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  try {
    const saved = localStorage.getItem("exam-explorer-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Use the system preference when storage is unavailable.
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("exam-explorer-theme", theme);
    } catch {
      // Theme changes still work for this visit.
    }
  }, [theme]);
  return { theme, setTheme };
}
