import {
  ArrowDownAZ,
  CalendarDays,
  ChevronDown,
  Columns3,
  Download,
  ExternalLink,
  FileText,
  Layers3,
  Link2,
  ListFilter,
  Moon,
  Monitor,
  RotateCcw,
  Search,
  Snowflake,
  Sun,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'

type TaskType =
  | 'console'
  | 'desktop'
  | 'documentation'
  | 'mobile'
  | 'testing'
  | 'unit-testing'
  | 'web'
  | 'application'

type Exam = {
  id: string
  code: string
  year: number
  month: string
  session: string
  number: string
  variant: string
  pdf: string
  sourcePath: string
  solutionFolder: string | null
  pageCount: number
  tasks: string[]
  assetFiles: string[]
}

type Task = {
  id: string
  examId: string
  part: number
  partLabel: string
  title: string
  heading: string
  type: TaskType
  typeLabel: string
  tags: string[]
  pageStart: number
  pageEnd: number
  pdf: string
  text: string
  summary: string
  duplicateGroup: string
  duplicates: string[]
}

type Catalog = {
  generatedAt: string
  sourceRepository: string
  examCount: number
  taskCount: number
  years: number[]
  taskTypes: TaskType[]
  exams: Exam[]
  tasks: Task[]
}

type PreviewMode = 'task' | 'exam'
type RegistryMode = 'tasks' | 'exams'
type SortMode = 'newest' | 'oldest' | 'type' | 'duplicates'
type SeasonFilter = 'all' | 'winter' | 'summer'

const typeLabels: Record<string, string> = {
  console: 'Konsola',
  desktop: 'Desktop',
  documentation: 'Dokumentacja',
  mobile: 'Mobilna',
  testing: 'Testowanie',
  'unit-testing': 'Testy jednostkowe',
  web: 'Web',
  application: 'Aplikacja',
}

const typeAccent: Record<string, string> = {
  console: 'ink',
  desktop: 'blue',
  documentation: 'olive',
  mobile: 'teal',
  testing: 'amber',
  'unit-testing': 'red',
  web: 'violet',
  application: 'ink',
}

const sessionLabels: Record<string, string> = {
  '01': 'ZIMA',
  '06': 'LATO',
}

function formatExamLabel(exam: Exam) {
  const session = sessionLabels[exam.month] ?? exam.session
  const sheetNumber = String(Number(exam.number))
  return `${session} ${exam.year} arkusz ${sheetNumber} ${exam.variant.toLowerCase()}`
}

function examFileName(exam: Exam) {
  return exam.sourcePath.split('/').at(-1) ?? exam.sourcePath
}

function examSessionKey(exam: Exam) {
  return `${exam.session}-${exam.number}`
}

function solutionUrl(repository: string, folder: string | null) {
  if (!folder) {
    return repository
  }

  return `${repository}/tree/main/${folder.split('/').map(encodeURIComponent).join('/')}`
}

function repositoryFileUrl(repository: string, path: string) {
  return `${repository}/raw/main/${path.split('/').map(encodeURIComponent).join('/')}`
}

function resourceUrl(repository: string, exam: Exam, assetFile: string) {
  const sourceDirectory = exam.sourcePath.split('/').slice(0, -1).join('/')
  return repositoryFileUrl(repository, `${sourceDirectory}/${assetFile}`)
}

function SeasonExamLabel({ exam, tone = 'default' }: { exam: Exam; tone?: 'default' | 'heading' | 'compact' }) {
  const isSummer = exam.month === '06'
  const SeasonIcon = isSummer ? Sun : Snowflake

  return (
    <span className={clsx('exam-code', tone, isSummer ? 'summer' : 'winter')} title={examFileName(exam)}>
      <SeasonIcon className="season-icon" aria-hidden="true" />
      <span>{formatExamLabel(exam)}</span>
    </span>
  )
}

type SelectControlProps = {
  icon: ReactNode
  label: string
  children: ReactNode
  value: string
  onChange: (value: string) => void
}

function SelectControl({ icon, label, children, value, onChange }: SelectControlProps) {
  const selectRef = useRef<HTMLSelectElement>(null)

  function openSelect() {
    const select = selectRef.current

    if (!select) {
      return
    }

    select.focus()
    select.showPicker?.()
  }

  return (
    <label className="select-control" onMouseDown={(event) => {
      if (event.target === selectRef.current) {
        return
      }

      event.preventDefault()
      openSelect()
    }}>
      {icon}
      <span>{label}</span>
      <select ref={selectRef} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}

function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [season, setSeason] = useState<SeasonFilter>('all')
  const [taskType, setTaskType] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [registryMode, setRegistryMode] = useState<RegistryMode>('tasks')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('task')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [isSheetInfoOpen, setIsSheetInfoOpen] = useState(false)
  const [isDuplicateInfoOpen, setIsDuplicateInfoOpen] = useState(false)

  useEffect(() => {
    fetch('/data/catalog.json')
      .then((response) => response.json())
      .then((data: Catalog) => {
        setCatalog(data)
        setSelectedTaskId(data.tasks[0]?.id ?? null)
        setSelectedExamId(data.exams[0]?.id ?? null)
      })
  }, [])

  const examById = useMemo(() => {
    return new Map(catalog?.exams.map((exam) => [exam.id, exam]) ?? [])
  }, [catalog])

  const taskById = useMemo(() => {
    return new Map(catalog?.tasks.map((task) => [task.id, task]) ?? [])
  }, [catalog])

  const filteredTasks = useMemo(() => {
    if (!catalog) return []
    const needle = query.trim().toLowerCase()

    const result = catalog.tasks.filter((task) => {
      const exam = examById.get(task.examId)
      if (!exam) return false
      const matchesYear = year === 'all' || String(exam.year) === year
      const matchesSeason =
        season === 'all' || (season === 'winter' && exam.month === '01') || (season === 'summer' && exam.month === '06')
      const matchesType = taskType === 'all' || task.type === taskType
      const haystack =
        `${exam.code} ${formatExamLabel(exam)} ${examFileName(exam)} ${exam.session} ${task.typeLabel} ${task.heading} ${task.summary} ${task.tags.join(' ')} ${task.text}`.toLowerCase()
      const matchesQuery = !needle || haystack.includes(needle)
      return matchesYear && matchesSeason && matchesType && matchesQuery
    })

    return result.sort((left, right) => {
      const leftExam = examById.get(left.examId)
      const rightExam = examById.get(right.examId)
      if (!leftExam || !rightExam) return 0
      if (sortMode === 'oldest') {
        return `${leftExam.session}-${leftExam.number}-${left.part}`.localeCompare(`${rightExam.session}-${rightExam.number}-${right.part}`)
      }
      if (sortMode === 'type') {
        return `${left.type}-${leftExam.session}-${left.part}`.localeCompare(`${right.type}-${rightExam.session}-${right.part}`)
      }
      if (sortMode === 'duplicates') {
        return right.duplicates.length - left.duplicates.length
      }
      return `${rightExam.session}-${rightExam.number}-${right.part}`.localeCompare(`${leftExam.session}-${leftExam.number}-${left.part}`)
    })
  }, [catalog, examById, query, season, sortMode, taskType, year])

  const filteredExams = useMemo(() => {
    if (!catalog) return []
    const visibleExamIds = new Set(filteredTasks.map((task) => task.examId))
    return catalog.exams.filter((exam) => visibleExamIds.has(exam.id))
  }, [catalog, filteredTasks])

  const selectedTaskCandidate = selectedTaskId ? taskById.get(selectedTaskId) ?? null : null
  const selectedTask =
    selectedTaskCandidate && filteredTasks.some((task) => task.id === selectedTaskCandidate.id)
      ? selectedTaskCandidate
      : filteredTasks[0] ?? null
  const selectedExamCandidate = selectedExamId ? examById.get(selectedExamId) ?? null : null
  const selectedExam =
    selectedExamCandidate && filteredExams.some((exam) => exam.id === selectedExamCandidate.id)
      ? selectedExamCandidate
      : selectedTask
        ? examById.get(selectedTask.examId) ?? null
        : filteredExams[0] ?? null

  const sameExamTasks = selectedExam?.tasks.map((id) => taskById.get(id)).filter(Boolean) as Task[] | undefined
  const selectedSummary =
    registryMode === 'exams'
      ? sameExamTasks?.map((task) => task.summary).filter(Boolean).join(' ')
      : selectedTask?.summary
  const duplicateTasks = selectedTask?.duplicates.map((id) => taskById.get(id)).filter(Boolean) as Task[] | undefined
  const duplicateTaskRows = useMemo(() => {
    if (!selectedTask || !selectedExam || !duplicateTasks) {
      return []
    }

    const seenSessions = new Set([examSessionKey(selectedExam)])

    return duplicateTasks.map((task, index) => {
      const exam = examById.get(task.examId)
      const sessionKey = exam ? examSessionKey(exam) : task.examId
      const isSameSessionRepeat = seenSessions.has(sessionKey)
      seenSessions.add(sessionKey)

      return {
        task,
        exam,
        isSameSessionRepeat,
        index,
      }
    }).sort((left, right) => {
      if (left.isSameSessionRepeat !== right.isSameSessionRepeat) {
        return left.isSameSessionRepeat ? 1 : -1
      }

      return left.index - right.index
    })
  }, [duplicateTasks, examById, selectedExam, selectedTask])
  const previewPdf = previewMode === 'exam' ? selectedExam?.pdf : selectedTask?.pdf
  const resetFilters = () => {
    setQuery('')
    setYear('all')
    setSeason('all')
    setTaskType('all')
    setSortMode('newest')
  }

  const sortLabels: Record<SortMode, string> = {
    newest: 'Od najnowszych',
    oldest: 'Od najstarszych',
    type: 'Typ zadania',
    duplicates: 'Najczęściej powtarzane',
  }

  if (!catalog) {
    return (
      <main className="loading-shell">
        <div className="loading-mark" />
        <p>Wczytywanie archiwum INF.04...</p>
      </main>
    )
  }

  return (
    <main className={clsx('app-shell', theme === 'dark' && 'dark')}>
      <header className="topbar">
        <div className="identity">
          <span className="identity-mark">04</span>
          <div>
            <p className="eyebrow">Archiwum egzaminów zawodowych</p>
            <h1>Eksplorator zadań INF.04</h1>
          </div>
        </div>
        <div className="source-strip">
          <span>{catalog.examCount} arkuszy</span>
          <span>{catalog.taskCount} zadań</span>
          <a href={catalog.sourceRepository} target="_blank" rel="noreferrer">
            Repozytorium
          </a>
        </div>
      </header>

      <section className="control-band" aria-label="Filtry">
        <SelectControl icon={<CalendarDays size={16} />} label="Rok" value={year} onChange={setYear}>
            <option value="all">Wszystkie</option>
            {catalog.years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
        </SelectControl>

        <SelectControl
          icon={season === 'summer' ? <Sun size={16} /> : <Snowflake size={16} />}
          label="Sesja"
          value={season}
          onChange={(value) => setSeason(value as SeasonFilter)}
        >
            <option value="all">Wszystkie</option>
            <option value="winter">Zima</option>
            <option value="summer">Lato</option>
        </SelectControl>

        <SelectControl icon={<ListFilter size={16} />} label="Typ" value={taskType} onChange={setTaskType}>
            <option value="all">Wszystkie</option>
            {catalog.taskTypes.map((item) => (
              <option key={item} value={item}>
                {typeLabels[item] ?? item}
              </option>
            ))}
        </SelectControl>

        <SelectControl
          icon={<ArrowDownAZ size={16} />}
          label="Sortuj"
          value={sortMode}
          onChange={(value) => setSortMode(value as SortMode)}
        >
            <option value="newest">{sortLabels.newest}</option>
            <option value="oldest">{sortLabels.oldest}</option>
            <option value="type">{sortLabels.type}</option>
            <option value="duplicates">{sortLabels.duplicates}</option>
        </SelectControl>

        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj treści zadania, kodu arkusza, technologii, testów..."
          />
        </label>

        <div className="segmented-control" aria-label="Tryb katalogu">
          <button className={clsx(registryMode === 'tasks' && 'active')} onClick={() => setRegistryMode('tasks')}>
            <Columns3 size={16} />
            Zadania
          </button>
          <button className={clsx(registryMode === 'exams' && 'active')} onClick={() => setRegistryMode('exams')}>
            <FileText size={16} />
            Arkusze
          </button>
        </div>

        <button
          className="icon-command"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button className="icon-command" onClick={resetFilters} title="Resetuj filtry">
          <RotateCcw size={17} />
        </button>
      </section>

      <section className="workspace">
        <div className="registry-pane">
          <div className="pane-heading">
            <div>
              <p className="eyebrow">Katalog</p>
              <h2>{registryMode === 'tasks' ? `${filteredTasks.length} pasujących zadań` : `${filteredExams.length} pasujących arkuszy`}</h2>
            </div>
          </div>

          {registryMode === 'tasks' ? (
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
                    onClick={() => {
                      setSelectedTaskId(task.id)
                      setSelectedExamId(task.examId)
                      setPreviewMode('task')
                    }}
                    role="row"
                    title={examFileName(exam)}
                  >
                    <SeasonExamLabel exam={exam} />
                    <span>{task.partLabel.replace('Część ', '')}</span>
                    <span className={clsx('type-pill', typeAccent[task.type])}>{typeLabels[task.type] ?? task.type}</span>
                    <span className="row-summary">{task.summary}</span>
                    <span>{task.duplicates.length ? `${task.duplicates.length + 1} ark.` : 'unikat'}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="exam-list">
              {filteredExams.map((exam) => {
                const examTasks = exam.tasks.map((id) => taskById.get(id)).filter(Boolean) as Task[]
                return (
                  <button
                    key={exam.id}
                    className={clsx('exam-line', selectedExamId === exam.id && 'selected')}
                    onClick={() => {
                      setSelectedExamId(exam.id)
                      setSelectedTaskId(exam.tasks[0] ?? null)
                      setPreviewMode('exam')
                    }}
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
          )}
        </div>

        <aside className="detail-pane" aria-label="Szczegóły wybranego zadania">
          <div className="pane-heading">
            <div>
              <p className="eyebrow">Wybrane</p>
              <h2 title={selectedExam ? examFileName(selectedExam) : undefined}>
                {selectedExam ? <SeasonExamLabel exam={selectedExam} tone="heading" /> : 'Nie wybrano arkusza'}
              </h2>
            </div>
          </div>

          {selectedTask && selectedExam && (
            <>
              {registryMode === 'tasks' && (
                <div className="task-switch-line">
                  <div className="part-links">
                    {sameExamTasks?.map((task) => (
                      <button
                        key={task.id}
                        className={clsx(selectedTask.id === task.id && 'active')}
                        onClick={() => {
                          setSelectedTaskId(task.id)
                          setPreviewMode('task')
                        }}
                      >
                        {task.part}. {typeLabels[task.type]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="task-summary">{selectedSummary}</p>

              <div className="metadata-grid metadata-grid-primary">
                <span>Zasoby</span>
                <strong className={clsx(selectedExam.assetFiles.length > 0 && 'resource-links')}>
                  {selectedExam.assetFiles.length > 0
                    ? selectedExam.assetFiles.map((assetFile) => (
                        <a
                          key={assetFile}
                          href={resourceUrl(catalog.sourceRepository, selectedExam, assetFile)}
                          target="_blank"
                          rel="noreferrer"
                          download
                        >
                          <Download size={13} aria-hidden="true" />
                          {assetFile}
                        </a>
                      ))
                    : 'brak w katalogu'}
                </strong>
                <span>Rozwiązania</span>
                <strong>
                  <a href={solutionUrl(catalog.sourceRepository, selectedExam.solutionFolder)} target="_blank" rel="noreferrer">
                    {selectedExam.solutionFolder ?? 'repozytorium źródłowe'}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </strong>
              </div>

              <section className="collapsible-block">
                <button
                  className="collapsible-trigger"
                  type="button"
                  aria-expanded={isSheetInfoOpen}
                  aria-controls="sheet-info"
                  onClick={() => setIsSheetInfoOpen((isOpen) => !isOpen)}
                >
                  <span>
                    <FileText size={16} aria-hidden="true" />
                    Informacje o arkuszu
                  </span>
                  <ChevronDown className={clsx('collapsible-icon', isSheetInfoOpen && 'open')} size={17} aria-hidden="true" />
                </button>

                {isSheetInfoOpen && (
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

              {duplicateTasks && duplicateTasks.length > 0 && (
                <section className="collapsible-block duplicate-block">
                  <button
                    className="collapsible-trigger duplicate-trigger"
                    type="button"
                    aria-expanded={isDuplicateInfoOpen}
                    aria-controls="duplicate-info"
                    onClick={() => setIsDuplicateInfoOpen((isOpen) => !isOpen)}
                  >
                    <span>
                      <Layers3 size={16} aria-hidden="true" />
                      To samo zadanie występuje w {duplicateTasks.length + 1} arkuszach
                    </span>
                    <ChevronDown className={clsx('collapsible-icon', isDuplicateInfoOpen && 'open')} size={17} aria-hidden="true" />
                  </button>

                  {isDuplicateInfoOpen && (
                    <div className="duplicate-strip" id="duplicate-info">
                      {duplicateTaskRows.slice(0, 5).map(({ task, exam, isSameSessionRepeat }) => {
                        return (
                          <button
                            key={task.id}
                            className={clsx(isSameSessionRepeat && 'same-session-repeat')}
                            onClick={() => {
                              setSelectedTaskId(task.id)
                              setSelectedExamId(task.examId)
                              setPreviewMode('task')
                            }}
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
              )}
            </>
          )}
        </aside>

        <div className="preview-pane">
          <div className="preview-toolbar">
            <div>
              <p className="eyebrow">Podgląd PDF</p>
              <h2>
                {selectedExam ? (
                  <span className="preview-title">
                    <SeasonExamLabel exam={selectedExam} tone="heading" />
                    {previewMode === 'task' && selectedTask ? <span>/ {selectedTask.partLabel}</span> : null}
                  </span>
                ) : (
                  selectedTask?.partLabel
                )}
              </h2>
            </div>
            <div className="segmented-control compact" aria-label="Tryb podglądu">
              <button className={clsx(previewMode === 'task' && 'active')} onClick={() => setPreviewMode('task')}>
                <Monitor size={16} />
                Zadanie
              </button>
              <button className={clsx(previewMode === 'exam' && 'active')} onClick={() => setPreviewMode('exam')}>
                <FileText size={16} />
                Arkusz
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
          ) : (
            <div className="empty-preview">Nie wybrano pliku PDF</div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
