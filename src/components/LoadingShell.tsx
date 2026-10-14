import clsx from "clsx";
import type { ExamType } from "../types/catalog";

type LoadingShellProps = {
  examType: ExamType;
  error?: string | null;
  theme: "light" | "dark";
  onRetry?: () => void;
};

export function LoadingShell({
  examType,
  error,
  theme,
  onRetry,
}: LoadingShellProps) {
  if (error) {
    return (
      <main className={clsx("loading-shell", theme === "dark" && "dark")}>
        <div className="loading-error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button className="loading-retry" type="button" onClick={onRetry}>
              Spróbuj ponownie
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className={clsx("loading-shell", theme === "dark" && "dark")}>
      <div className="loading-mark" aria-hidden="true" />
      <p>
        Wczytywanie archiwum {examType === "inf04" ? "INF.04" : "INF.03"}...
      </p>
    </main>
  );
}
