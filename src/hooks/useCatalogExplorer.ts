import { useEffect, useMemo, useState } from 'react'
import type { DuplicateTaskRow } from '../components/detail/types'
import type { Catalog, Exam, ExamType, PreviewMode, RegistryMode, SeasonFilter, SortMode, Task } from '../types/catalog'
import { examFileName, examSessionKey, formatExamLabel } from '../utils/catalog'

function getUrlParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name)
}

function isExamType(value: string | null): value is ExamType {
  return value === 'inf03' || value === 'inf04'
}

function isRegistryMode(value: string | null): value is RegistryMode {
  return value === 'exams' || value === 'tasks'
}

function getPreferredTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

type UrlSelection = {
  taskId: string | null
  examId: string | null
  previewMode?: PreviewMode
}

function resolveUrlSelection(catalog: Catalog): UrlSelection | null {
  const taskId = getUrlParam('task')
  const examId = getUrlParam('exam')

  if (!taskId && !examId) return null

  const taskById = new Map(catalog.tasks.map((task) => [task.id, task]))
  const examById = new Map(catalog.exams.map((exam) => [exam.id, exam]))

  if (taskId && examId) {
    const task = taskById.get(taskId)
    const exam = examById.get(examId)
    return task && exam && task.examId === exam.id
      ? { taskId: task.id, examId: exam.id, previewMode: 'task' }
      : { taskId: null, examId: null }
  }

  if (taskId) {
    const task = taskById.get(taskId)
    return task
      ? { taskId: task.id, examId: task.examId, previewMode: 'task' }
      : { taskId: null, examId: null }
  }

  const exam = examById.get(examId!)
  return exam
    ? { taskId: exam.tasks[0] ?? null, examId: exam.id, previewMode: 'exam' }
    : { taskId: null, examId: null }
}

function syncUrl(taskId: string | null, examId: string | null, registryMode: RegistryMode, examType: ExamType) {
  const params = new URLSearchParams()
  params.set('type', examType)
  params.set('mode', registryMode)
  if (examId) params.set('exam', examId)
  if (registryMode === 'tasks' && taskId) params.set('task', taskId)
  const search = params.toString()
  const newUrl = `${window.location.pathname}?${search}`
  window.history.replaceState(null, '', newUrl)
}

export function useCatalogExplorer() {
  const urlExamType = getUrlParam('type')
  const initialExamType: ExamType = isExamType(urlExamType) ? urlExamType : 'inf04'
  const urlMode = getUrlParam('mode')
  const [examType, setExamType] = useState<ExamType>(initialExamType)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogRequest, setCatalogRequest] = useState(0)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [season, setSeason] = useState<SeasonFilter>('all')
  const [taskType, setTaskType] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('task')
  const [theme, setTheme] = useState<'light' | 'dark'>(getPreferredTheme)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(getUrlParam('task'))
  const [selectedExamId, setSelectedExamId] = useState<string | null>(getUrlParam('exam'))
  const [registryMode, setRegistryMode] = useState<RegistryMode>(
    initialExamType === 'inf03'
      ? 'exams'
      : (isRegistryMode(urlMode) ? urlMode : (getUrlParam('task') ? 'tasks' : 'exams')),
  )
  const [isSheetInfoOpen, setIsSheetInfoOpen] = useState(false)
  const [isDuplicateInfoOpen, setIsDuplicateInfoOpen] = useState(false)

  useEffect(() => {
    document.documentElement.style.colorScheme = theme

    return () => {
      document.documentElement.style.colorScheme = ''
    }
  }, [theme])

  useEffect(() => {
    let isCancelled = false

    fetch(`/data/${examType}/catalog.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Catalog request failed with status ${response.status}`)
        }

        return response.json() as Promise<Catalog>
      })
      .then((data) => {
        if (isCancelled) return

        setCatalog(data)
        setCatalogError(null)

        const selection = resolveUrlSelection(data)
        if (selection) {
          setSelectedTaskId(selection.taskId)
          setSelectedExamId(selection.examId)
          if (selection.previewMode) {
            setPreviewMode(selection.previewMode)
          }
        }
      })
      .catch(() => {
        if (isCancelled) return

        setCatalog(null)
        setCatalogError('Nie udało się wczytać archiwum. Sprawdź połączenie i spróbuj ponownie.')
      })

    return () => {
      isCancelled = true
    }
  }, [catalogRequest, examType])

  useEffect(() => {
    syncUrl(selectedTaskId, selectedExamId, registryMode, examType)
  }, [selectedTaskId, selectedExamId, registryMode, examType])

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

    return result.sort((left, right) => sortTasks(left, right, examById, sortMode))
  }, [catalog, examById, query, season, sortMode, taskType, year])

  const filteredExams = useMemo(() => {
    const visibleExamIds = new Set(filteredTasks.map((task) => task.examId))
    return [...visibleExamIds]
      .map((examId) => examById.get(examId))
      .filter((exam): exam is Exam => Boolean(exam))
  }, [examById, filteredTasks])

  const selectedTask = selectedTaskId ? taskById.get(selectedTaskId) ?? null : null
  const isSelectedTaskFilteredOut = Boolean(
    selectedTask && !filteredTasks.some((task) => task.id === selectedTask.id),
  )
  const selectedExamCandidate = selectedExamId ? examById.get(selectedExamId) ?? null : null
  const selectedExam =
    selectedExamCandidate
      ? selectedExamCandidate
      : selectedTask
        ? examById.get(selectedTask.examId) ?? null
        : null

  const sameExamTasks = selectedExam?.tasks.map((id) => taskById.get(id)).filter(Boolean) as Task[] | undefined
  const selectedSummary =
    registryMode === 'exams'
      ? sameExamTasks?.map((task) => task.summary).filter(Boolean).join(' ')
      : selectedTask?.summary
  const duplicateTasks = selectedTask?.duplicates.map((id) => taskById.get(id)).filter(Boolean) as Task[] | undefined
  const duplicateTaskRows = useMemo<DuplicateTaskRow[]>(() => {
    if (!selectedTask || !selectedExam || !duplicateTasks) {
      return []
    }

    const seenSessions = new Set([examSessionKey(selectedExam)])

    return duplicateTasks
      .map((task, index) => {
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
      })
      .sort((left, right) => {
        if (left.isSameSessionRepeat !== right.isSameSessionRepeat) {
          return left.isSameSessionRepeat ? 1 : -1
        }

        return left.index - right.index
      })
  }, [duplicateTasks, examById, selectedExam, selectedTask])
  const previewPdf = previewMode === 'exam' ? selectedExam?.pdf : previewMode === 'task' ? selectedTask?.pdf : previewMode === 'scoring' ? selectedExam?.scoringPdf ?? undefined : undefined

  function resetFilters() {
    setQuery('')
    setYear('all')
    setSeason('all')
    setTaskType('all')
    setSortMode('newest')
  }

  function clearSelection() {
    setSelectedTaskId(null)
    setSelectedExamId(null)
  }

  function selectTask(task: Task) {
    if (selectedTaskId === task.id) {
      clearSelection()
      return
    }

    setSelectedTaskId(task.id)
    setSelectedExamId(task.examId)
    setPreviewMode(registryMode === 'tasks' ? 'task' : 'exam')
  }

  function selectExam(exam: Exam) {
    if (selectedExamId === exam.id) {
      clearSelection()
      return
    }

    setSelectedExamId(exam.id)
    setSelectedTaskId(exam.tasks[0] ?? null)
    setPreviewMode('exam')
  }

  function handleSetRegistryMode(mode: RegistryMode) {
    setRegistryMode(mode)
    if (mode === 'exams' && previewMode === 'task') {
      setPreviewMode('exam')
    }
  }

  function handleSetExamType(type: ExamType) {
    if (type === examType) return
    setSelectedTaskId(null)
    setSelectedExamId(null)
    setPreviewMode('exam')
    setCatalog(null)
    setCatalogError(null)
    if (type === 'inf03') {
      setRegistryMode('exams')
    }
    setExamType(type)
  }

  function retryCatalog() {
    setCatalog(null)
    setCatalogError(null)
    setCatalogRequest((request) => request + 1)
  }

  return {
    catalog,
    catalogError,
    detailState: {
      duplicateTaskRows,
      duplicateTasks,
      isDuplicateInfoOpen,
      isSheetInfoOpen,
      sameExamTasks,
      selectedExam,
      selectedSummary,
      selectedTask,
    },
    filters: {
      examType,
      query,
      registryMode,
      season,
      taskType,
      theme,
      year,
    },
    registryState: {
      examById,
      filteredExams,
      filteredTasks,
      isSelectedTaskFilteredOut,
      selectedExamId,
      selectedTaskId,
      selectedTask,
      sortMode,
      taskById,
    },
    previewState: {
      previewMode,
      previewPdf,
      selectedExam,
      selectedTask,
    },
    actions: {
      clearSelection,
      resetFilters,
      retryCatalog,
      selectExam,
      selectTask,
      setIsDuplicateInfoOpen,
      setIsSheetInfoOpen,
      setExamType: handleSetExamType,
      setPreviewMode,
      setQuery,
      setRegistryMode: handleSetRegistryMode,
      setSeason,
      setSortMode,
      setTaskType,
      setTheme,
      setYear,
    },
  }
}

function sortTasks(left: Task, right: Task, examById: Map<string, Exam>, sortMode: SortMode) {
  const leftExam = examById.get(left.examId)
  const rightExam = examById.get(right.examId)
  if (!leftExam || !rightExam) return 0

  const partOrder = left.part - right.part
  const newestOrder = compareExamTime(rightExam, leftExam)
  const oldestOrder = compareExamTime(leftExam, rightExam)

  if (sortMode === 'part') {
    return partOrder || newestOrder
  }

  if (sortMode === 'oldest') {
    return oldestOrder || partOrder
  }

  if (sortMode === 'type') {
    return left.type.localeCompare(right.type) || partOrder || newestOrder
  }

  if (sortMode === 'duplicates') {
    return right.duplicates.length - left.duplicates.length || partOrder || newestOrder
  }

  return newestOrder || partOrder
}

function compareExamTime(left: Exam, right: Exam) {
  return `${left.session}-${left.number}`.localeCompare(`${right.session}-${right.number}`)
}
