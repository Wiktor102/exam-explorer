import { useEffect, useMemo, useState } from 'react'
import type { DuplicateTaskRow } from '../components/detail/types'
import type { Catalog, Exam, PreviewMode, RegistryMode, SeasonFilter, SortMode, Task } from '../types/catalog'
import { examFileName, examSessionKey, formatExamLabel } from '../utils/catalog'

export function useCatalogExplorer() {
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

    return result.sort((left, right) => sortTasks(left, right, examById, sortMode))
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
  const previewPdf = previewMode === 'exam' ? selectedExam?.pdf : selectedTask?.pdf

  function resetFilters() {
    setQuery('')
    setYear('all')
    setSeason('all')
    setTaskType('all')
    setSortMode('newest')
  }

  function selectTask(task: Task) {
    setSelectedTaskId(task.id)
    setSelectedExamId(task.examId)
    setPreviewMode('task')
  }

  function selectExam(exam: Exam) {
    setSelectedExamId(exam.id)
    setSelectedTaskId(exam.tasks[0] ?? null)
    setPreviewMode('exam')
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
      selectedExamId,
      selectedTaskId,
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
      resetFilters,
      selectExam,
      selectTask,
      setIsDuplicateInfoOpen,
      setIsSheetInfoOpen,
      setPreviewMode,
      setQuery,
      setRegistryMode,
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
