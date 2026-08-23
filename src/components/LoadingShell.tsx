import type { ExamType } from '../types/catalog'

type LoadingShellProps = {
  examType: ExamType
  error?: string | null
  onRetry?: () => void
}

export function LoadingShell({ examType, error, onRetry }: LoadingShellProps) {
  if (error) {
    return (
      <main className="loading-shell">
        <div className="loading-error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button className="loading-retry" type="button" onClick={onRetry}>
              Spróbuj ponownie
            </button>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="loading-shell">
      <div className="loading-mark" />
      <p>Wczytywanie archiwum {examType === 'inf04' ? 'INF.04' : 'INF.03'}...</p>
    </main>
  )
}
