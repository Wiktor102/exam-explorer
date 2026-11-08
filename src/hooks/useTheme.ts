import { useSyncExternalStore } from "react";
type Theme = "light" | "dark";
const subscribe = (notify: () => void) => {
  window.addEventListener("exam-theme", notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener("exam-theme", notify);
    window.removeEventListener("storage", notify);
  };
};
const getTheme = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";
const getServerTheme = (): Theme => "light";
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  function setTheme(next: Theme) {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("exam-explorer-theme", next);
    } catch {
      /* Keep the choice for this visit. */
    }
    window.dispatchEvent(new Event("exam-theme"));
  }
  return { theme, setTheme };
}
