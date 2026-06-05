import { ArrowDownAZ } from 'lucide-react'
import clsx from 'clsx'
import { sortLabels, typeAccent, typeLabels } from '../constants/catalog'
import type { Exam, RegistryMode, SortMode, Task } from '../types/catalog'
import { examFileName } from '../utils/catalog'
import { SeasonExamLabel } from './SeasonExamLabel'
import { SelectControl } from './SelectControl'

type RegistryPaneProps = {
  examById: Map<string, Exam>
  filteredExams: Exam[]
  filteredTasks: Task[]
  registryMode: RegistryMode
  selectedExamId: string | null
  selectedTaskId: string | null
  sortMode: SortMode
  taskById: Map<string, Task>
  onExamSelect: (exam: Exam) => void
  onSortModeChange: (sortMode: SortMode) => void
  onTaskSelect: (task: Task) => void
}

export function RegistryPane({
  examById,
  filteredExams,
  filteredTasks,
  registryMode,
  selectedExamId,
  selectedTaskId,
  sortMode,
  taskById,
  onExamSelect,
  onSortModeChange,
  onTaskSelect,
}: RegistryPaneProps) {
  return (
    <div className="registry-pane">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">Katalog</p>
          <h2>
            {registryMode === 'tasks'
              ? `${filteredTasks.length} pasujących zadań`
              : `${filteredExams.length} pasujących arkuszy`}
          </h2>
        </div>

        <div className="pane-actions">
          <SelectControl
            icon={<ArrowDownAZ size={16} />}
            label="Sortuj"
            value={sortMode}
            onChange={(value) => onSortModeChange(value as SortMode)}
          >
            <option value="newest">{sortLabels.newest}</option>
            <option value="oldest">{sortLabels.oldest}</option>
            <option value="type">{sortLabels.type}</option>
            <option value="part">{sortLabels.part}</option>
            <option value="duplicates">{sortLabels.duplicates}</option>
          </SelectControl>
        </div>
      </div>

      {registryMode === 'tasks' ? (
        <TaskTable
          examById={examById}
          filteredTasks={filteredTasks}
          selectedTaskId={selectedTaskId}
          onTaskSelect={onTaskSelect}
        />
      ) : (
        <ExamList
          filteredExams={filteredExams}
          selectedExamId={selectedExamId}
          taskById={taskById}
          onExamSelect={onExamSelect}
        />
      )}
    </div>
  )
}

type TaskTableProps = {
  examById: Map<string, Exam>
  filteredTasks: Task[]
  selectedTaskId: string | null
  onTaskSelect: (task: Task) => void
}

function TaskTable({ examById, filteredTasks, selectedTaskId, onTaskSelect }: TaskTableProps) {
  return (
    <div className="task-table" role="table" aria-label="Zadania">
      <div className="table-head" role="row">
        <span>Arkusz</span>
        <span>Cz.</span>
        <span>Typ</span>
        <span>Opis</span>
        <span>Powtórki</span>
      </div>
      {filteredTasks.map((task) => {
        const exam = examById.get(task.examId)
        if (!exam) return null

        return (
          <button
            key={task.id}
            className={clsx('task-row', selectedTaskId === task.id && 'selected')}
            onClick={() => onTaskSelect(task)}
            role="row"
            title={examFileName(exam)}
          >
            <SeasonExamLabel exam={exam} />
            <span className="task-part">{task.partLabel.replace('Część ', '')}</span>
            <span className={clsx('type-pill', typeAccent[task.type])}>{typeLabels[task.type] ?? task.type}</span>
            <span className="row-summary">{task.summary}</span>
            <span className="task-repeat">{task.duplicates.length ? `${task.duplicates.length + 1} ark.` : 'unikat'}</span>
          </button>
        )
      })}
    </div>
  )
}

type ExamListProps = {
  filteredExams: Exam[]
  selectedExamId: string | null
  taskById: Map<string, Task>
  onExamSelect: (exam: Exam) => void
}

function ExamList({ filteredExams, selectedExamId, taskById, onExamSelect }: ExamListProps) {
  return (
    <div className="exam-list">
      {filteredExams.map((exam) => {
        const examTasks = exam.tasks.map((id) => taskById.get(id)).filter(Boolean) as Task[]

        return (
          <button
            key={exam.id}
            className={clsx('exam-line', selectedExamId === exam.id && 'selected')}
            onClick={() => onExamSelect(exam)}
            title={examFileName(exam)}
          >
            <SeasonExamLabel exam={exam} />
            <span>{exam.pageCount} str.</span>
            <span>{exam.variant}</span>
            <span>{examTasks.map((task) => typeLabels[task.type]).join(' / ')}</span>
          </button>
        )
      })}
    </div>
  )
}
