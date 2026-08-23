import clsx from 'clsx'
import { AppTopbar } from './components/AppTopbar'
import { CookieConsent } from './components/CookieConsent'
import { DetailPane } from './components/DetailPane'
import { FilterBar } from './components/FilterBar'
import { LoadingShell } from './components/LoadingShell'
import { PreviewPane } from './components/PreviewPane'
import { RegistryPane } from './components/RegistryPane'
import { useCatalogExplorer } from './hooks/useCatalogExplorer'

function App() {
  const { actions, catalog, catalogError, detailState, filters, previewState, registryState } = useCatalogExplorer()
  const hasSelection = Boolean(detailState.selectedExam || detailState.selectedTask)

  if (!catalog) {
    return <LoadingShell examType={filters.examType} error={catalogError} onRetry={actions.retryCatalog} />
  }

  return (
    <main className={clsx('app-shell', filters.theme === 'dark' && 'dark')}>
      <AppTopbar catalog={catalog} examType={filters.examType} onExamTypeChange={actions.setExamType} />

      <FilterBar
        catalog={catalog}
        examType={filters.examType}
        query={filters.query}
        registryMode={filters.registryMode}
        season={filters.season}
        taskType={filters.taskType}
        theme={filters.theme}
        year={filters.year}
        onQueryChange={actions.setQuery}
        onRegistryModeChange={actions.setRegistryMode}
        onResetFilters={actions.resetFilters}
        onSeasonChange={actions.setSeason}
        onTaskTypeChange={actions.setTaskType}
        onThemeChange={actions.setTheme}
        onYearChange={actions.setYear}
      />

      <section className={clsx('workspace', !hasSelection && 'list-only')}>
        <RegistryPane
          examById={registryState.examById}
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
            onDuplicateInfoToggle={() => actions.setIsDuplicateInfoOpen((isOpen) => !isOpen)}
            onSheetInfoToggle={() => actions.setIsSheetInfoOpen((isOpen) => !isOpen)}
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

      <CookieConsent />
    </main>
  )
}

export default App
