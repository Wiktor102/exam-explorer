import { Undo2 } from 'lucide-react'
import type { Catalog, Exam, RegistryMode, Task } from '../types/catalog'
import { examFileName } from '../utils/catalog'
import { DuplicateInfoBlock } from './detail/DuplicateInfoBlock'
import { ResourceMetadata } from './detail/ResourceMetadata'
import { SheetInfoBlock } from './detail/SheetInfoBlock'
import { TaskPartSwitcher } from './detail/TaskPartSwitcher'
import type { DuplicateTaskRow } from './detail/types'
import { SeasonExamLabel } from './SeasonExamLabel'

export type { DuplicateTaskRow } from './detail/types'

type DetailPaneProps = {
  catalog: Catalog
  duplicateTaskRows: DuplicateTaskRow[]
  duplicateTasks: Task[] | undefined
  isDuplicateInfoOpen: boolean
  isSheetInfoOpen: boolean
  registryMode: RegistryMode
  sameExamTasks: Task[] | undefined
  selectedExam: Exam | null
  selectedSummary: string | undefined
  selectedTask: Task | null
  onClearSelection: () => void
  onDuplicateInfoToggle: () => void
  onSheetInfoToggle: () => void
  onTaskSelect: (task: Task) => void
}

export function DetailPane({
  catalog,
  duplicateTaskRows,
  duplicateTasks,
  isDuplicateInfoOpen,
  isSheetInfoOpen,
  registryMode,
  sameExamTasks,
  selectedExam,
  selectedSummary,
  selectedTask,
  onClearSelection,
  onDuplicateInfoToggle,
  onSheetInfoToggle,
  onTaskSelect,
}: DetailPaneProps) {
  return (
    <aside className="detail-pane" aria-label="Szczegóły wybranego zadania">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">Wybrane</p>
          <h2 title={selectedExam ? examFileName(selectedExam) : undefined}>
            {selectedExam ? <SeasonExamLabel exam={selectedExam} tone="heading" /> : 'Nie wybrano arkusza'}
          </h2>
        </div>
        <button className="detail-close" type="button" aria-label="Wyczyść wybór" onClick={onClearSelection}>
          <Undo2 size={18} aria-hidden="true" />
        </button>
      </div>

      {selectedTask && selectedExam && (
        <>
          {registryMode === 'tasks' && (
            <TaskPartSwitcher sameExamTasks={sameExamTasks} selectedTask={selectedTask} onTaskSelect={onTaskSelect} />
          )}

          <p className="task-summary">{selectedSummary}</p>

          <ResourceMetadata catalog={catalog} selectedExam={selectedExam} />

          <SheetInfoBlock
            isOpen={isSheetInfoOpen}
            selectedExam={selectedExam}
            selectedTask={selectedTask}
            onToggle={onSheetInfoToggle}
          />

          {duplicateTasks && duplicateTasks.length > 0 && (
            <DuplicateInfoBlock
              duplicateTaskRows={duplicateTaskRows}
              duplicateTasks={duplicateTasks}
              isOpen={isDuplicateInfoOpen}
              selectedExam={selectedExam}
              onTaskSelect={onTaskSelect}
              onToggle={onDuplicateInfoToggle}
            />
          )}
        </>
      )}
    </aside>
  )
}
