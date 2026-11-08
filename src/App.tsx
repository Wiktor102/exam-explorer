import { isUnmodifiedLinkClick } from "./utils/navigation";
import clsx from "clsx";
import { parseCatalogPath } from "./lib/routes";
import { explorerUrl } from "./lib/explorerLocation";
import { AppTopbar } from "./components/AppTopbar";
import { DetailPane } from "./components/DetailPane";
import { FilterBar } from "./components/FilterBar";
import { PreviewPane } from "./components/PreviewPane";
import { RegistryPane } from "./components/RegistryPane";
import {
  type ExplorerProps,
  useCatalogExplorer,
} from "./hooks/useCatalogExplorer";

function App(props: ExplorerProps) {
  const {
    actions,
    catalog,
    catalogError,
    isNavigating,
    location,
    detailState,
    filters,
    previewState,
    registryState,
  } = useCatalogExplorer(props);
  const hasSelection = Boolean(
    detailState.selectedExam || detailState.selectedTask,
  );

  return (
    <main
      className={clsx("app-shell", filters.theme === "dark" && "dark")}
      aria-busy={isNavigating}
      onClick={(event) => {
        if (!isUnmodifiedLinkClick(event)) return;
        const link = (event.target as Element).closest("a");
        if (!link || link.target || link.hasAttribute("download")) return;
        const url = new URL(link.href);
        if (
          url.origin !== window.location.origin ||
          !parseCatalogPath(url.pathname)
        )
          return;
        event.preventDefault();
        actions.navigateUrl(url);
      }}
    >
      <div className="navigation-status" role="status" aria-live="polite">
        {isNavigating
          ? "Wczytywanie katalogu…"
          : catalogError
            ? ""
            : `Wybrano ${detailState.selectedTask && location.registryMode === "tasks" ? detailState.selectedTask.title : (detailState.selectedExam?.code ?? filters.examType.toUpperCase())}`}
      </div>
      {catalogError && (
        <div className="navigation-error" role="alert">
          {catalogError}{" "}
          <button onClick={actions.retryCatalog}>Spróbuj ponownie</button>
        </div>
      )}
      <AppTopbar
        isNavigating={isNavigating}
        catalog={catalog}
        examType={filters.examType}
        theme={filters.theme}
        onExamTypeChange={actions.setExamType}
        onThemeChange={actions.setTheme}
      />

      <FilterBar
        catalog={catalog}
        query={filters.query}
        registryMode={filters.registryMode}
        season={filters.season}
        taskType={filters.taskType}
        year={filters.year}
        onQueryChange={actions.setQuery}
        onRegistryModeChange={actions.setRegistryMode}
        onResetFilters={actions.resetFilters}
        onSeasonChange={actions.setSeason}
        onTaskTypeChange={actions.setTaskType}
        onYearChange={actions.setYear}
      />

      <section className={clsx("workspace", !hasSelection && "list-only")}>
        <RegistryPane
          linkSearch={
            new URL(explorerUrl(location), "https://local.invalid").search
          }
          examById={registryState.examById}
          examType={filters.examType}
          filteredExams={registryState.filteredExams}
          filteredTasks={registryState.filteredTasks}
          highlightTokens={registryState.highlightTokens}
          isSelectedTaskFilteredOut={registryState.isSelectedTaskFilteredOut}
          registryMode={filters.registryMode}
          selectedExamId={registryState.selectedExamId}
          selectedTaskId={registryState.selectedTaskId}
          selectedTask={registryState.selectedTask}
          sortMode={registryState.sortMode}
          taskById={registryState.taskById}
          onExamSelect={actions.selectExam}
          onResetFilters={actions.resetFilters}
          onSortModeChange={actions.setSortMode}
          onTaskSelect={actions.selectTask}
        />

        {hasSelection && (
          <DetailPane
            examType={filters.examType}
            catalog={catalog}
            duplicateTaskRows={detailState.duplicateTaskRows}
            duplicateTasks={detailState.duplicateTasks}
            isDuplicateInfoOpen={detailState.isDuplicateInfoOpen}
            isSheetInfoOpen={detailState.isSheetInfoOpen}
            registryMode={filters.registryMode}
            sameExamTasks={detailState.sameExamTasks}
            selectedExam={detailState.selectedExam}
            selectedSummary={detailState.selectedSummary}
            selectedTask={detailState.selectedTask}
            onClearSelection={actions.clearSelection}
            onDuplicateInfoToggle={() =>
              actions.setIsDuplicateInfoOpen((isOpen) => !isOpen)
            }
            onSheetInfoToggle={() =>
              actions.setIsSheetInfoOpen((isOpen) => !isOpen)
            }
            onTaskSelect={actions.selectTask}
          />
        )}

        {hasSelection && (
          <PreviewPane
            previewMode={previewState.previewMode}
            previewPdf={previewState.previewPdf}
            registryMode={filters.registryMode}
            selectedExam={previewState.selectedExam}
            selectedTask={previewState.selectedTask}
            onPreviewModeChange={actions.setPreviewMode}
          />
        )}
      </section>
    </main>
  );
}

export default App;
