import { ChevronDown, FileText } from 'lucide-react'
import clsx from 'clsx'
import type { Exam, Task } from '../../types/catalog'
import { examFileName } from '../../utils/catalog'

type SheetInfoBlockProps = {
  isOpen: boolean
  selectedExam: Exam
  selectedTask: Task
  onToggle: () => void
}

export function SheetInfoBlock({ isOpen, selectedExam, selectedTask, onToggle }: SheetInfoBlockProps) {
  return (
    <section className="collapsible-block">
      <button
        className="collapsible-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-controls="sheet-info"
        onClick={onToggle}
      >
        <span>
          <FileText size={16} aria-hidden="true" />
          Informacje o arkuszu
        </span>
        <ChevronDown className={clsx('collapsible-icon', isOpen && 'open')} size={17} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="metadata-grid" id="sheet-info">
          <span>Sesja</span>
          <strong>{selectedExam.session}</strong>
          <span>Wersja</span>
          <strong>{selectedExam.variant}</strong>
          <span>Plik arkusza</span>
          <strong>{examFileName(selectedExam)}</strong>
          <span>Strony</span>
          <strong>{`s. ${selectedTask.pageStart}-${selectedTask.pageEnd}`}</strong>
        </div>
      )}
    </section>
  )
}
