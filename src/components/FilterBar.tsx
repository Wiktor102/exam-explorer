import { useState } from "react";
import {
  AppWindow,
  Braces,
  CalendarDays,
  Code2,
  Columns3,
  Database,
  FileText,
  FlaskConical,
  Globe2,
  Image as ImageIcon,
  ListFilter,
  Monitor,
  PenTool,
  RotateCcw,
  Search,
  Shapes,
  SlidersHorizontal,
  Smartphone,
  Snowflake,
  Sun,
  Terminal,
  TestTubeDiagonal,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { typeAccent, typeLabels } from "../constants/catalog";
import type { Catalog, RegistryMode, SeasonFilter } from "../types/catalog";
import { SelectControl } from "./SelectControl";

const taskTypeIcons: Record<string, LucideIcon> = {
  application: AppWindow,
  console: Terminal,
  database: Database,
  desktop: Monitor,
  documentation: FileText,
  "graphics-raster": ImageIcon,
  "graphics-vector": PenTool,
  js: Braces,
  mobile: Smartphone,
  php: Code2,
  testing: FlaskConical,
  "unit-testing": TestTubeDiagonal,
  web: Globe2,
};

type FilterBarProps = {
  catalog: Catalog;
  query: string;
  registryMode: RegistryMode;
  season: SeasonFilter;
  taskType: string;
  year: string;
  onQueryChange: (query: string) => void;
  onRegistryModeChange: (mode: RegistryMode) => void;
  onResetFilters: () => void;
  onSeasonChange: (season: SeasonFilter) => void;
  onTaskTypeChange: (taskType: string) => void;
  onYearChange: (year: string) => void;
};

export function FilterBar({
  catalog,
  query,
  registryMode,
  season,
  taskType,
  year,
  onQueryChange,
  onRegistryModeChange,
  onResetFilters,
  onSeasonChange,
  onTaskTypeChange,
  onYearChange,
}: FilterBarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  return (
    <section
      className={clsx("control-band", filtersExpanded && "filters-expanded")}
      aria-label="Filtry"
    >
      <div className="segmented-control" aria-label="Tryb katalogu">
        <button
          className={clsx(registryMode === "exams" && "active")}
          onClick={() => onRegistryModeChange("exams")}
        >
          <FileText size={16} />
          <span>Arkusze</span>
        </button>
        <button
          className={clsx(registryMode === "tasks" && "active")}
          onClick={() => onRegistryModeChange("tasks")}
        >
          <Columns3 size={16} />
          <span>Zadania</span>
        </button>
      </div>

      <button
        type="button"
        className="icon-command mobile-filter-toggle"
        onClick={() => setFiltersExpanded((current) => !current)}
        aria-expanded={filtersExpanded}
        aria-controls="filter-bar-options"
        aria-label={filtersExpanded ? "Ukryj filtry" : "Pokaż filtry"}
        title={filtersExpanded ? "Ukryj filtry" : "Pokaż filtry"}
      >
        <SlidersHorizontal size={17} />
      </button>

      <div id="filter-bar-options" className="filter-options">
        <SelectControl
          className="year-filter collapsible-filter"
          icon={<CalendarDays size={16} />}
          label="Rok"
          value={year}
          onChange={onYearChange}
        >
          <option value="all">Wszystkie</option>
          {catalog.years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </SelectControl>

        <SelectControl
          className="season-filter collapsible-filter"
          icon={
            season === "summer" ? (
              <Sun size={16} />
            ) : season === "winter" ? (
              <Snowflake size={16} />
            ) : (
              <CalendarDays size={16} />
            )
          }
          label="Sesja"
          value={season}
          onChange={(value) => onSeasonChange(value as SeasonFilter)}
        >
          <option value="all">
            <CalendarDays size={15} aria-hidden="true" />
            Wszystkie
          </option>
          <option value="winter">
            <Snowflake size={15} aria-hidden="true" />
            Zima
          </option>
          <option value="summer">
            <Sun size={15} aria-hidden="true" />
            Lato
          </option>
        </SelectControl>

        <SelectControl
          className="type-filter collapsible-filter"
          icon={<ListFilter size={16} />}
          label="Typ"
          value={taskType}
          onChange={onTaskTypeChange}
        >
          <option className="type-option ink" value="all">
            <ListFilter size={15} aria-hidden="true" />
            Wszystkie
          </option>
          {catalog.taskTypes.map((item) => {
            const TypeIcon = taskTypeIcons[item] ?? Shapes;

            return (
              <option
                className={clsx("type-option", typeAccent[item] ?? "ink")}
                key={item}
                value={item}
              >
                <TypeIcon size={15} aria-hidden="true" />
                {typeLabels[item] ?? item}
              </option>
            );
          })}
        </SelectControl>

        <label className="search-box collapsible-filter">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-label="Szukaj"
            placeholder="Szukaj zadania, arkusza, technologii..."
          />
        </label>

        <button
          type="button"
          className="icon-command reset-filters collapsible-filter"
          onClick={onResetFilters}
          aria-label="Resetuj filtry"
          title="Resetuj filtry"
        >
          <RotateCcw size={17} />
        </button>
      </div>
    </section>
  );
}
