import { useEffect, useMemo, useState } from 'react'
import type { DuplicateTaskRow } from '../components/detail/types'
import type { Catalog, Exam, ExamType, PreviewMode, RegistryMode, SeasonFilter, SortMode, Task } from '../types/catalog'
import { examFileName, examSessionKey, formatExamLabel } from '../utils/catalog'

function getUrlParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name)
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
  const urlExamType = getUrlParam('type') as ExamType | null
  const [examType, setExamType] = useState<ExamType>(urlExamType ?? 'inf04')
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [season, setSeason] = useState<SeasonFilter>('all')
  const [taskType, setTaskType] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('task')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(getUrlParam('task'))
  const [selectedExamId, setSelectedExamId] = useState<string | null>(getUrlParam('exam'))
  const urlMode = getUrlParam('mode') as RegistryMode | null
  const [registryMode, setRegistryMode] = useState<RegistryMode>(
    urlExamType === 'inf03' ? 'exams' : (urlMode ?? (getUrlParam('task') ? 'tasks' : 'exams')),
  )
  const [isSheetInfoOpen, setIsSheetInfoOpen] = useState(false)
  const [isDuplicateInfoOpen, setIsDuplicateInfoOpen] = useState(false)

  useEffect(() => {
    fetch(`/data/${examType}/catalog.json`)
      .then((response) => response.json())
      .then((data: Catalog) => {
        setCatalog(data)
      })
  }, [examType])

  useEffect(() => {
    syncUrl(selectedTaskId, selectedExamId, registryMode, examType)
  }, [selectedTaskId, selectedExamId, registryMode, examType])

  useEffect(() => {
    if (!catalog) return

    const taskId = getUrlParam('task')
    const examId = getUrlParam('exam')

    if (!taskId && !examId) return

    if (taskId && examId) {
      const task = taskById.get(taskId)
      const exam = examById.get(examId)
      if (task && exam && task.examId === exam.id) {
        setSelectedTaskId(task.id)
        setSelectedExamId(exam.id)
        setPreviewMode('task')
      } else {
        setSelectedTaskId(null)
        setSelectedExamId(null)
      }
    } else if (taskId) {
      const task = taskById.get(taskId)
      if (task) {
        setSelectedTaskId(task.id)
        setSelectedExamId(task.examId)
        setPreviewMode('task')
      } else {
        setSelectedTaskId(null)
        setSelectedExamId(null)
      }
    } else {
      const exam = examById.get(examId!)
      if (exam) {
        setSelectedExamId(exam.id)
        setSelectedTaskId(exam.tasks[0] ?? null)
        setPreviewMode('exam')
      } else {
        setSelectedExamId(null)
      }
    }
  }, [catalog])

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
    if (!catalog) return []
    const visibleExamIds = new Set(filteredTasks.map((task) => task.examId))
    return catalog.exams.filter((exam) => visibleExamIds.has(exam.id))
  }, [catalog, filteredTasks])

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
    setPreviewMode('task')
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
    if (type === 'inf03') {
      setRegistryMode('exams')
    }
    setExamType(type)
  }

  return {
    catalog,
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
