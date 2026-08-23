import { ChevronDown, Layers3, Link2 } from 'lucide-react'
import clsx from 'clsx'
import type { Exam, Task } from '../../types/catalog'
import { examFileName } from '../../utils/catalog'
import { SeasonExamLabel } from '../SeasonExamLabel'
import type { DuplicateTaskRow } from './types'

type DuplicateInfoBlockProps = {
  duplicateTaskRows: DuplicateTaskRow[]
  duplicateTasks: Task[]
  isOpen: boolean
  selectedExam: Exam
  onTaskSelect: (task: Task) => void
  onToggle: () => void
}

export function DuplicateInfoBlock({
  duplicateTaskRows,
  duplicateTasks,
  isOpen,
  selectedExam,
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
          {duplicateTaskRows.slice(0, 5).map(({ task, exam, isSameSessionRepeat }) => {
            const isSelectedSheet = task.examId === selectedExam.id

            return (
              <button
                key={task.id}
                className={clsx(isSameSessionRepeat && 'same-session-repeat', isSelectedSheet && 'active')}
                onClick={() => onTaskSelect(task)}
                disabled={isSelectedSheet}
                aria-current={isSelectedSheet ? 'true' : undefined}
                title={exam ? examFileName(exam) : undefined}
              >
                <Link2 size={14} />
                {exam ? <SeasonExamLabel exam={exam} tone="compact" /> : task.examId}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
