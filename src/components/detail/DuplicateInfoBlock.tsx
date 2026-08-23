import { ChevronDown, Layers3, Link2 } from 'lucide-react'
import clsx from 'clsx'
import type { Task } from '../../types/catalog'
import { examFileName } from '../../utils/catalog'
import { SeasonExamLabel } from '../SeasonExamLabel'
import type { DuplicateTaskRow } from './types'

type DuplicateInfoBlockProps = {
  duplicateTaskRows: DuplicateTaskRow[]
  duplicateTasks: Task[]
  isOpen: boolean
  selectedTask: Task
  onTaskSelect: (task: Task) => void
  onToggle: () => void
}

export function DuplicateInfoBlock({
  duplicateTaskRows,
  duplicateTasks,
  isOpen,
  selectedTask,
  onTaskSelect,
  onToggle,
}: DuplicateInfoBlockProps) {
  return (
    <section className="collapsible-block duplicate-block">
      <button
        className="collapsible-trigger duplicate-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-controls="duplicate-info"
        onClick={onToggle}
      >
        <span>
          <Layers3 size={16} aria-hidden="true" />
          To samo zadanie występuje w {duplicateTasks.length + 1} arkuszach
        </span>
        <ChevronDown className={clsx('collapsible-icon', isOpen && 'open')} size={17} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="duplicate-strip" id="duplicate-info">
          {duplicateTaskRows.slice(0, 5).map(({ task, exam, isSameSessionRepeat }) => (
            <button
              key={task.id}
              className={clsx(isSameSessionRepeat && 'same-session-repeat', selectedTask.id === task.id && 'active')}
              onClick={() => onTaskSelect(task)}
              disabled={selectedTask.id === task.id}
              aria-current={selectedTask.id === task.id ? 'true' : undefined}
              title={exam ? examFileName(exam) : undefined}
            >
              <Link2 size={14} />
              {exam ? <SeasonExamLabel exam={exam} tone="compact" /> : task.examId}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
