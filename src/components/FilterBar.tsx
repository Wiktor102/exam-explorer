import { CalendarDays, Columns3, FileText, ListFilter, Moon, RotateCcw, Search, Snowflake, Sun } from 'lucide-react'
import clsx from 'clsx'
import { typeLabels } from '../constants/catalog'
import type { Catalog, RegistryMode, SeasonFilter } from '../types/catalog'
import { SelectControl } from './SelectControl'

type FilterBarProps = {
  catalog: Catalog
  query: string
  registryMode: RegistryMode
  season: SeasonFilter
  taskType: string
  theme: 'light' | 'dark'
  year: string
  onQueryChange: (query: string) => void
  onRegistryModeChange: (mode: RegistryMode) => void
  onResetFilters: () => void
  onSeasonChange: (season: SeasonFilter) => void
  onTaskTypeChange: (taskType: string) => void
  onThemeChange: (theme: 'light' | 'dark') => void
  onYearChange: (year: string) => void
}

export function FilterBar({
  catalog,
  query,
  registryMode,
  season,
  taskType,
  theme,
  year,
  onQueryChange,
  onRegistryModeChange,
  onResetFilters,
  onSeasonChange,
  onTaskTypeChange,
  onThemeChange,
  onYearChange,
}: FilterBarProps) {
  return (
    <section className="control-band" aria-label="Filtry">
      <div className="segmented-control" aria-label="Tryb katalogu">
        <button className={clsx(registryMode === 'tasks' && 'active')} onClick={() => onRegistryModeChange('tasks')}>
          <Columns3 size={16} />
          Zadania
        </button>
        <button className={clsx(registryMode === 'exams' && 'active')} onClick={() => onRegistryModeChange('exams')}>
          <FileText size={16} />
          Arkusze
        </button>
      </div>

      <SelectControl icon={<CalendarDays size={16} />} label="Rok" value={year} onChange={onYearChange}>
        <option value="all">Wszystkie</option>
        {catalog.years.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </SelectControl>

      <SelectControl
        icon={season === 'summer' ? <Sun size={16} /> : <Snowflake size={16} />}
        label="Sesja"
        value={season}
        onChange={(value) => onSeasonChange(value as SeasonFilter)}
      >
        <option value="all">Wszystkie</option>
        <option value="winter">Zima</option>
        <option value="summer">Lato</option>
      </SelectControl>

      <SelectControl icon={<ListFilter size={16} />} label="Typ" value={taskType} onChange={onTaskTypeChange}>
        <option value="all">Wszystkie</option>
        {catalog.taskTypes.map((item) => (
          <option key={item} value={item}>
            {typeLabels[item] ?? item}
          </option>
        ))}
      </SelectControl>

      <label className="search-box">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Szukaj treści zadania, kodu arkusza, technologii, testów..."
        />
      </label>

      <button
        className="icon-command"
        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <button className="icon-command" onClick={onResetFilters} title="Resetuj filtry">
        <RotateCcw size={17} />
      </button>
    </section>
  )
}
