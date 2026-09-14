import clsx from "clsx";
import { AppTopbar } from "./components/AppTopbar";
import { CookieConsent } from "./components/CookieConsent";
import { DetailPane } from "./components/DetailPane";
import { FilterBar } from "./components/FilterBar";
import { LoadingShell } from "./components/LoadingShell";
import { LandingPage } from "./components/LandingPage";
import { PreviewPane } from "./components/PreviewPane";
import { RegistryPane } from "./components/RegistryPane";
import { useCatalogExplorer } from "./hooks/useCatalogExplorer";

function CatalogApp() {
  const {
    actions,
    catalog,
    catalogError,
    detailState,
    filters,
    previewState,
    registryState,
  } = useCatalogExplorer();
  const hasSelection = Boolean(
    detailState.selectedExam || detailState.selectedTask,
  );

  if (!catalog) {
    return (
      <LoadingShell
        examType={filters.examType}
        error={catalogError}
        theme={filters.theme}
        onRetry={actions.retryCatalog}
      />
    );
  }

  return (
    <main className={clsx("app-shell", filters.theme === "dark" && "dark")}>
      <AppTopbar
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
          examById={registryState.examById}
          examType={filters.examType}
          filteredExams={registryState.filteredExams}
          filteredTasks={registryState.filteredTasks}
          isSelectedTaskFilteredOut={registryState.isSelectedTaskFilteredOut}
          registryMode={filters.registryMode}
          selectedExamId={registryState.selectedExamId}
          selectedTaskId={registryState.selectedTaskId}
          selectedTask={registryState.selectedTask}
          sortMode={registryState.sortMode}
          taskById={registryState.taskById}
          onExamSelect={actions.selectExam}
          onSortModeChange={actions.setSortMode}
          onTaskSelect={actions.selectTask}
        />

        {hasSelection && (
          <DetailPane
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

function App() {
  const params = new URLSearchParams(window.location.search);
  const hasCatalogLocation = ["type", "task", "exam", "mode"].some((param) =>
    params.has(param),
  );

  return (
    <>
      {hasCatalogLocation ? <CatalogApp /> : <LandingPage />}
      <CookieConsent />
    </>
  );
}

export default App;
