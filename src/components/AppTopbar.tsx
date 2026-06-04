import type { Catalog } from '../types/catalog'

type AppTopbarProps = {
  catalog: Catalog
}

export function AppTopbar({ catalog }: AppTopbarProps) {
  return (
    <header className="topbar">
      <div className="identity">
        <span className="identity-mark">04</span>
        <div>
          <p className="eyebrow">Archiwum egzaminów zawodowych</p>
          <h1>Eksplorator zadań INF.04</h1>
        </div>
      </div>
      <div className="source-strip">
        <span>{catalog.examCount} arkuszy</span>
        <span>{catalog.taskCount} zadań</span>
        <a href={catalog.sourceRepository} target="_blank" rel="noreferrer">
          Repozytorium
        </a>
      </div>
    </header>
  )
}
