import type { ExamType } from '../types/catalog'

type LoadingShellProps = {
  examType: ExamType
}

export function LoadingShell({ examType }: LoadingShellProps) {
  return (
    <main className="loading-shell">
      <div className="loading-mark" />
      <p>Wczytywanie archiwum {examType === 'inf04' ? 'INF.04' : 'INF.03'}...</p>
    </main>
  )
}
