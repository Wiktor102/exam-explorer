import {
  catalogPath,
  examPath,
  taskPath,
  parseCatalogPath,
} from "../lib/routes";
import { useTheme } from "./useTheme";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DuplicateTaskRow } from "../components/detail/types";
import type {
  Catalog,
  Exam,
  ExamType,
  PreviewMode,
  RegistryMode,
  SeasonFilter,
  SortMode,
  Task,
} from "../types/catalog";
import {
  examFileName,
  examSessionKey,
  formatExamLabel,
} from "../utils/catalog";
import {
  foldDiacritics,
  matchesFoldedHaystack,
  parseSearchQuery,
  scoreSearchFields,
  type SearchableFields,
} from "../utils/search";
import { trackExamOpen, trackTaskOpen } from "../lib/analytics";

function getUrlParam(name: string): string | null {
  const route = parseCatalogPath(window.location.pathname);
  if (name === "type" && route) return route.examType;
  if (name === "task" && route?.taskId) return route.taskId;
  if (name === "exam" && route?.examId) return route.examId;
  return new URLSearchParams(window.location.search).get(name);
}

function isExamType(value: string | null): value is ExamType {
  return value === "inf03" || value === "inf04";
}

function isRegistryMode(value: string | null): value is RegistryMode {
  return value === "exams" || value === "tasks";
}

type UrlSelection = {
  taskId: string | null;
  examId: string | null;
  previewMode?: PreviewMode;
};

type UrlFilters = {
  query: string;
  year: string;
  season: SeasonFilter;
  taskType: string;
  sortMode: SortMode;
};

function isSortMode(value: string | null): value is SortMode {
  return (
    value === "newest" ||
    value === "oldest" ||
    value === "type" ||
    value === "part" ||
    value === "duplicates"
  );
}

function isSeasonFilter(value: string | null): value is SeasonFilter {
  return value === "winter" || value === "summer";
}

function resolveUrlFilters(): UrlFilters {
  const query = getUrlParam("q") ?? "";
  const yearParam = getUrlParam("year");
  const year =
    yearParam && yearParam !== "all" && /^\d{4}$/.test(yearParam)
      ? yearParam
      : "all";
  const seasonParam = getUrlParam("season");
  const season: SeasonFilter = isSeasonFilter(seasonParam)
    ? seasonParam
    : "all";
  const taskType = getUrlParam("taskType")?.trim() || "all";
  const sortParam = getUrlParam("sort");
  const sortMode: SortMode = isSortMode(sortParam) ? sortParam : "newest";
  return { query, year, season, taskType, sortMode };
}

function resolveUrlSelection(catalog: Catalog): UrlSelection | null {
  const taskId = getUrlParam("task");
  const examId = getUrlParam("exam");

  if (!taskId && !examId) return null;

  const taskById = new Map(catalog.tasks.map((task) => [task.id, task]));
  const examById = new Map(catalog.exams.map((exam) => [exam.id, exam]));

  if (taskId && examId) {
    const task = taskById.get(taskId);
    const exam = examById.get(examId);
    return task && exam && task.examId === exam.id
      ? { taskId: task.id, examId: exam.id, previewMode: "task" }
      : { taskId: null, examId: null };
  }

  if (taskId) {
    const task = taskById.get(taskId);
    return task
      ? { taskId: task.id, examId: task.examId, previewMode: "task" }
      : { taskId: null, examId: null };
  }

  const exam = examById.get(examId!);
  return exam
    ? { taskId: exam.tasks[0] ?? null, examId: exam.id, previewMode: "exam" }
    : { taskId: null, examId: null };
}

function syncUrl(
  taskId: string | null,
  examId: string | null,
  registryMode: RegistryMode,
  examType: ExamType,
  filters: UrlFilters,
) {
  const params = new URLSearchParams();
  params.set("mode", registryMode);
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.year !== "all") params.set("year", filters.year);
  if (filters.season !== "all") params.set("season", filters.season);
  if (filters.taskType !== "all") params.set("taskType", filters.taskType);
  if (filters.sortMode !== "newest") params.set("sort", filters.sortMode);
  const search = params.toString();
  const path =
    registryMode === "tasks" && taskId
      ? taskPath(examType, taskId)
      : examId
        ? examPath(examType, examId)
        : catalogPath(examType);
  const newUrl = path + (search ? `?${search}` : "");
  if (window.location.pathname !== path) {
    window.location.assign(newUrl);
    return;
  }
  window.history.replaceState(null, "", newUrl);
}

export function useCatalogExplorer() {
  const urlExamType = getUrlParam("type");
  const initialExamType: ExamType = isExamType(urlExamType)
    ? urlExamType
    : "inf04";
  const urlMode = getUrlParam("mode");
  const [initialFilters] = useState<UrlFilters>(() => resolveUrlFilters());
  const [examType, setExamType] = useState<ExamType>(initialExamType);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogRequest, setCatalogRequest] = useState(0);
  const [query, setQuery] = useState(initialFilters.query);
  const [year, setYear] = useState(initialFilters.year);
  const [season, setSeason] = useState<SeasonFilter>(initialFilters.season);
  const [taskType, setTaskType] = useState(initialFilters.taskType);
  const [sortMode, setSortMode] = useState<SortMode>(initialFilters.sortMode);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("task");
  const { theme, setTheme } = useTheme();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    getUrlParam("task"),
  );
  const [selectedExamId, setSelectedExamId] = useState<string | null>(
    getUrlParam("exam"),
  );
  const [registryMode, setRegistryMode] = useState<RegistryMode>(
    getUrlParam("task") ? "tasks" : isRegistryMode(urlMode) ? urlMode : "exams",
  );
  const [isSheetInfoOpen, setIsSheetInfoOpen] = useState(false);
  const [isDuplicateInfoOpen, setIsDuplicateInfoOpen] = useState(false);
  const hasTrackedInitialSelection = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    fetch(`/data/${examType}/catalog.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Catalog request failed with status ${response.status}`,
          );
        }

        return response.json() as Promise<Catalog>;
      })
      .then((data) => {
        if (isCancelled) return;

        setCatalog(data);
        setCatalogError(null);

        const selection = resolveUrlSelection(data);
        if (selection) {
          setSelectedTaskId(selection.taskId);
          setSelectedExamId(selection.examId);
          if (selection.previewMode) {
            setPreviewMode(selection.previewMode);
          }
        }
      })
      .catch(() => {
        if (isCancelled) return;

        setCatalog(null);
        setCatalogError(
          "Nie udało się wczytać archiwum. Sprawdź połączenie i spróbuj ponownie.",
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [catalogRequest, examType]);

  useEffect(() => {
    if (!catalog) return;
    syncUrl(selectedTaskId, selectedExamId, registryMode, examType, {
      query,
      year,
      season,
      taskType,
      sortMode,
    });
  }, [
    catalog,
    selectedTaskId,
    selectedExamId,
    registryMode,
    examType,
    query,
    year,
    season,
    taskType,
    sortMode,
  ]);

  const examById = useMemo(() => {
    return new Map(catalog?.exams.map((exam) => [exam.id, exam]) ?? []);
  }, [catalog]);

  const taskById = useMemo(() => {
    return new Map(catalog?.tasks.map((task) => [task.id, task]) ?? []);
  }, [catalog]);

  const parsedQuery = useMemo(() => parseSearchQuery(query), [query]);

  const filteredTasks = useMemo(() => {
    if (!catalog) return [];
    const hasQuery = parsedQuery.include.length > 0;

    const scored = catalog.tasks.flatMap((task) => {
      const exam = examById.get(task.examId);
      if (!exam) return [];
      const matchesYear = year === "all" || String(exam.year) === year;
      const matchesSeason =
        season === "all" ||
        (season === "winter" && exam.month === "01") ||
        (season === "summer" && exam.month === "06");
      const matchesType = taskType === "all" || task.type === taskType;
      if (!matchesYear || !matchesSeason || !matchesType) return [];

      const fields: SearchableFields = {
        heading: foldDiacritics(task.heading),
        tags: foldDiacritics(task.tags.join(" ")),
        typeLabel: foldDiacritics(task.typeLabel),
        summary: foldDiacritics(task.summary),
        meta: foldDiacritics(
          `${exam.code} ${formatExamLabel(exam)} ${examFileName(exam)} ${exam.session}`,
        ),
        text: foldDiacritics(task.text),
      };
      const haystack = `${fields.meta} ${fields.typeLabel} ${fields.heading} ${fields.summary} ${fields.tags} ${fields.text}`;
      if (hasQuery && !matchesFoldedHaystack(haystack, parsedQuery)) {
        return [];
      }
      const score = hasQuery ? scoreSearchFields(fields, parsedQuery) : 0;
      return [{ task, score }];
    });

    return scored
      .sort(
        (left, right) =>
          right.score - left.score ||
          sortTasks(left.task, right.task, examById, sortMode),
      )
      .map((entry) => entry.task);
  }, [catalog, examById, parsedQuery, season, sortMode, taskType, year]);

  const filteredExams = useMemo(() => {
    const visibleExamIds = new Set(filteredTasks.map((task) => task.examId));
    return [...visibleExamIds]
      .map((examId) => examById.get(examId))
      .filter((exam): exam is Exam => Boolean(exam));
  }, [examById, filteredTasks]);

  const selectedTask = selectedTaskId
    ? (taskById.get(selectedTaskId) ?? null)
    : null;
  const isSelectedTaskFilteredOut = Boolean(
    selectedTask && !filteredTasks.some((task) => task.id === selectedTask.id),
  );
  const selectedExamCandidate = selectedExamId
    ? (examById.get(selectedExamId) ?? null)
    : null;
  const selectedExam = selectedExamCandidate
    ? selectedExamCandidate
    : selectedTask
      ? (examById.get(selectedTask.examId) ?? null)
      : null;

  useEffect(() => {
    if (!catalog || hasTrackedInitialSelection.current) return;

    hasTrackedInitialSelection.current = true;
    if (getUrlParam("task") && selectedTask && selectedExam) {
      trackTaskOpen(selectedTask, selectedExam);
      return;
    }

    if (getUrlParam("exam") && selectedExam) {
      trackExamOpen(selectedExam);
    }
  }, [catalog, selectedExam, selectedTask]);

  const sameExamTasks = selectedExam?.tasks
    .map((id) => taskById.get(id))
    .filter(Boolean) as Task[] | undefined;
  const selectedSummary =
    registryMode === "exams"
      ? sameExamTasks
          ?.map((task) => task.summary)
          .filter(Boolean)
          .join(" ")
      : selectedTask?.summary;
  const duplicateTasks = selectedTask?.duplicates
    .map((id) => taskById.get(id))
    .filter(Boolean) as Task[] | undefined;
  const duplicateTaskRows = useMemo<DuplicateTaskRow[]>(() => {
    if (!selectedTask || !selectedExam || !duplicateTasks) {
      return [];
    }

    const seenSessions = new Set<string>();

    return [selectedTask, ...duplicateTasks]
      .sort((left, right) => {
        const leftExam = examById.get(left.examId);
        const rightExam = examById.get(right.examId);

        if (leftExam && rightExam) {
          return (
            compareExamTime(rightExam, leftExam) ||
            left.part - right.part ||
            left.id.localeCompare(right.id)
          );
        }

        return left.id.localeCompare(right.id);
      })
      .map((task) => {
        const exam = examById.get(task.examId);
        const sessionKey = exam ? examSessionKey(exam) : task.examId;
        const isSameSessionRepeat = seenSessions.has(sessionKey);
        seenSessions.add(sessionKey);

        return {
          task,
          exam,
          isSameSessionRepeat,
        };
      });
  }, [duplicateTasks, examById, selectedExam, selectedTask]);
  const previewPdf =
    previewMode === "exam"
      ? selectedExam?.pdf
      : previewMode === "task"
        ? selectedTask?.pdf
        : previewMode === "scoring"
          ? (selectedExam?.scoringPdf ?? undefined)
          : undefined;

  function resetFilters() {
    setQuery("");
    setYear("all");
    setSeason("all");
    setTaskType("all");
    setSortMode("newest");
  }

  function clearSelection() {
    setSelectedTaskId(null);
    setSelectedExamId(null);
  }

  function selectTask(task: Task) {
    if (selectedTaskId === task.id) {
      clearSelection();
      return;
    }

    // Switching parts within an exam stays on its page; other selections
    // are tracked after the destination page loads.
    if (registryMode === "exams" && selectedExamId === task.examId) {
      const exam = examById.get(task.examId);
      if (exam) trackTaskOpen(task, exam);
    }
    setSelectedTaskId(task.id);
    setSelectedExamId(task.examId);
    setPreviewMode(registryMode === "tasks" ? "task" : "exam");
  }

  function selectExam(exam: Exam) {
    if (selectedExamId === exam.id) {
      clearSelection();
      return;
    }

    setSelectedExamId(exam.id);
    setSelectedTaskId(exam.tasks[0] ?? null);
    setPreviewMode("exam");
  }

  function handleSetRegistryMode(mode: RegistryMode) {
    setRegistryMode(mode);
    if (mode === "exams" && previewMode === "task") {
      setPreviewMode("exam");
    }
  }

  function handleSetExamType(type: ExamType) {
    if (type === examType) return;
    setSelectedTaskId(null);
    setSelectedExamId(null);
    setPreviewMode("exam");
    setCatalog(null);
    setCatalogError(null);
    if (type === "inf03") {
      setRegistryMode("exams");
    }
    setExamType(type);
  }

  function retryCatalog() {
    setCatalog(null);
    setCatalogError(null);
    setCatalogRequest((request) => request + 1);
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
      highlightTokens: parsedQuery.include,
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
  };
}

function sortTasks(
  left: Task,
  right: Task,
  examById: Map<string, Exam>,
  sortMode: SortMode,
) {
  const leftExam = examById.get(left.examId);
  const rightExam = examById.get(right.examId);
  if (!leftExam || !rightExam) return 0;

  const partOrder = left.part - right.part;
  const newestOrder = compareExamTime(rightExam, leftExam);
  const oldestOrder = compareExamTime(leftExam, rightExam);

  if (sortMode === "part") {
    return partOrder || newestOrder;
  }

  if (sortMode === "oldest") {
    return oldestOrder || partOrder;
  }

  if (sortMode === "type") {
    return left.type.localeCompare(right.type) || partOrder || newestOrder;
  }

  if (sortMode === "duplicates") {
    return (
      right.duplicates.length - left.duplicates.length ||
      partOrder ||
      newestOrder
    );
  }

  return newestOrder || partOrder;
}

function compareExamTime(left: Exam, right: Exam) {
  return `${left.session}-${left.number}`.localeCompare(
    `${right.session}-${right.number}`,
  );
}
