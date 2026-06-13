import { ClipboardCheck, ExternalLink, FileText, Monitor } from 'lucide-react'
import clsx from 'clsx'
import type { Exam, PreviewMode, RegistryMode, Task } from '../types/catalog'
import { SeasonExamLabel } from './SeasonExamLabel'

type PreviewPaneProps = {
  previewMode: PreviewMode
  previewPdf: string | undefined
  registryMode: RegistryMode
  selectedExam: Exam | null
  selectedTask: Task | null
  onPreviewModeChange: (previewMode: PreviewMode) => void
}

export function PreviewPane({
  previewMode,
  previewPdf,
  registryMode,
  selectedExam,
  selectedTask,
  onPreviewModeChange,
}: PreviewPaneProps) {
  return (
    <div className="preview-pane">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">Podgląd PDF</p>
          <h2>
            {selectedExam ? (
              <span className="preview-title">
                <SeasonExamLabel exam={selectedExam} tone="heading" />
                {registryMode === 'tasks' && previewMode === 'task' && selectedTask ? (
                  <span>/ {selectedTask.partLabel}</span>
                ) : previewMode === 'scoring' ? (
                  <span>/ Ocenianie</span>
                ) : null}
              </span>
            ) : (
              selectedTask?.partLabel
            )}
          </h2>
        </div>
        <div className="segmented-control compact preview-mode-control" aria-label="Tryb podglądu">
          {registryMode === 'tasks' && (
            <button
              type="button"
              className={clsx(previewMode === 'task' && 'active')}
              onClick={() => onPreviewModeChange('task')}
            >
              <Monitor size={16} />
              Zadanie
            </button>
          )}
          <button
            type="button"
            className={clsx(previewMode === 'exam' && 'active')}
            onClick={() => onPreviewModeChange('exam')}
          >
            <FileText size={16} />
            Arkusz
          </button>
          <button
            type="button"
            className={clsx(previewMode === 'scoring' && 'active')}
            onClick={() => onPreviewModeChange('scoring')}
          >
            <ClipboardCheck size={16} />
            Ocenianie
          </button>
        </div>
      </div>
      {previewPdf ? (
        <div className="preview-frame">
          <iframe title="Podgląd PDF" src={`${previewPdf}#toolbar=1&navpanes=0`} />
          <a className="open-pdf-link" href={previewPdf} target="_blank" rel="noreferrer" title="Otwórz PDF w nowej karcie">
            <ExternalLink size={16} />
            Otwórz
          </a>
        </div>
      ) : previewMode === 'scoring' ? (
        <div className="empty-preview">Brak kryteriów oceniania w formacie PDF</div>
      ) : (
        <div className="empty-preview">Nie wybrano pliku PDF</div>
      )}
    </div>
  )
}
