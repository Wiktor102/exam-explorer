import { loadCatalog, seedCatalog } from "../lib/catalogCache";
import {
  readExplorerLocation,
  explorerUrl,
  type ExplorerLocation,
} from "../lib/explorerLocation";
import { pageMetadata, updatePageMetadata } from "../lib/pageMetadata";
import { SITE_URL } from "../lib/site";
import { parseCatalogPath } from "../lib/routes";
import { useTheme } from "./useTheme";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DuplicateTaskRow } from "../components/detail/types";
import type {
  Catalog,
  Exam,
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
import {
  isAnalyticsReady,
  trackExamOpen,
  trackTaskOpen,
} from "../lib/analytics";

export type ExplorerProps = { initialCatalog: Catalog; initialPath: string };
type ScrollPosition = { list: number; detail: number; page: number };
function scrollPosition(): ScrollPosition {
  return {
    list: document.querySelector(".task-table, .exam-list")?.scrollTop ?? 0,
    detail: document.querySelector(".detail-pane")?.scrollTop ?? 0,
    page: window.scrollY,
  };
}
function restoreScroll(position: ScrollPosition) {
  requestAnimationFrame(() => {
    const list = document.querySelector(".task-table, .exam-list");
    const detail = document.querySelector(".detail-pane");
    if (list) list.scrollTop = position.list;
    if (detail) detail.scrollTop = position.detail;
    window.scrollTo(0, position.page);
  });
}

export function useCatalogExplorer({
  initialCatalog,
  initialPath,
}: ExplorerProps) {
  const [view, setView] = useState(() => ({
    catalog: initialCatalog,
    location: readExplorerLocation(
      new URL(initialPath, SITE_URL),
      initialCatalog,
    ),
  }));
  const current = useRef(view);
  const requestVersion = useRef(0);
  const pendingUrl = useRef<URL | null>(null);
  const scrollSnapshots = useRef(new Map<string, ScrollPosition>());
  const historyKey = useRef("");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const { catalog, location } = view;
  const {
    examType,
    query,
    year,
    season,
    taskType,
    sortMode,
    previewMode,
    registryMode,
    taskId: selectedTaskId,
    examId: selectedExamId,
  } = location;
  const { theme, setTheme } = useTheme();
  const [isSheetInfoOpen, setIsSheetInfoOpen] = useState(false);
  const [isDuplicateInfoOpen, setIsDuplicateInfoOpen] = useState(false);

  const applyLocation = useCallback(
    (
      next: ExplorerLocation,
      data: Catalog,
      history: "push" | "replace" | "none",
      scroll?: ScrollPosition,
    ) => {
      const url = explorerUrl(next);
      const position = scrollPosition();
      if (
        history === "push" &&
        window.location.pathname + window.location.search !== url
      ) {
        window.history.replaceState(
          { ...window.history.state, explorerScroll: position },
          "",
        );
        window.history.pushState(
          {
            explorerKey: crypto.randomUUID(),
            explorerScroll: { ...position, detail: 0 },
          },
          "",
          url,
        );
      } else if (history === "replace") {
        window.history.replaceState(window.history.state, "", url);
      }
      historyKey.current =
        window.history.state?.explorerKey ?? historyKey.current;
      const nextView = { catalog: data, location: next };
      current.current = nextView;
      setView(nextView);
      setCatalogError(null);
      setIsNavigating(false);
      const exam = data.exams.find((item) => item.id === next.examId);
      const task =
        next.registryMode === "tasks"
          ? data.tasks.find((item) => item.id === next.taskId)
          : undefined;
      updatePageMetadata(
        new URL(url, SITE_URL).pathname,
        pageMetadata(next.examType, data, exam, task),
      );
      if (scroll) restoreScroll(scroll);
      else if (history === "push") restoreScroll({ ...position, detail: 0 });
    },
    [],
  );

  const openUrl = useCallback(
    async (url: URL, history: "push" | "none", scroll?: ScrollPosition) => {
      const route = parseCatalogPath(url.pathname);
      if (!route) return;
      const version = ++requestVersion.current;
      pendingUrl.current = url;
      setIsNavigating(true);
      setCatalogError(null);
      try {
        const data = await loadCatalog(route.examType);
        if (version !== requestVersion.current) return;
        applyLocation(readExplorerLocation(url, data), data, history, scroll);
        pendingUrl.current = null;
      } catch {
        if (version !== requestVersion.current) return;
        setIsNavigating(false);
        setCatalogError(
          "Nie udało się wczytać katalogu. Bieżący widok jest nadal dostępny.",
        );
      }
    },
    [applyLocation],
  );

  const cancelPending = useCallback(() => {
    requestVersion.current += 1;
  }, []);

  useEffect(() => {
    seedCatalog(
      readExplorerLocation(new URL(initialPath, SITE_URL), initialCatalog)
        .examType,
      initialCatalog,
    );
    // Query parameters are applied after hydration so the first client render
    // matches the prerendered document exactly.
    let active = true;
    void loadCatalog(
      readExplorerLocation(new URL(initialPath, SITE_URL), initialCatalog)
        .examType,
    ).then((data) => {
      if (active)
        applyLocation(
          readExplorerLocation(new URL(window.location.href), data),
          data,
          "none",
        );
    });
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    if (!window.history.state?.explorerKey) {
      window.history.replaceState(
        { ...window.history.state, explorerKey: crypto.randomUUID() },
        "",
      );
    }
    historyKey.current = window.history.state.explorerKey;
    const saveScroll = () => {
      scrollSnapshots.current.set(historyKey.current, scrollPosition());
    };
    document.addEventListener("scroll", saveScroll, true);
    const pop = () => {
      saveScroll();
      const saved =
        scrollSnapshots.current.get(window.history.state?.explorerKey) ??
        window.history.state?.explorerScroll;
      void openUrl(new URL(window.location.href), "none", saved);
    };
    window.addEventListener("popstate", pop);
    return () => {
      active = false;
      cancelPending();
      window.removeEventListener("popstate", pop);
      document.removeEventListener("scroll", saveScroll, true);
      window.history.scrollRestoration = previousRestoration;
    };
  }, [initialCatalog, initialPath, applyLocation, openUrl, cancelPending]);

  function change(
    patch: Partial<ExplorerLocation>,
    history: "push" | "replace" = "replace",
  ) {
    ++requestVersion.current;
    pendingUrl.current = null;
    const { location: previous, catalog: data } = current.current;
    applyLocation({ ...previous, ...patch }, data, history);
  }
  const setQuery = (query: string) => change({ query });
  const setYear = (year: string) => change({ year });
  const setSeason = (season: SeasonFilter) => change({ season });
  const setTaskType = (taskType: string) => change({ taskType });
  const setSortMode = (sortMode: SortMode) => change({ sortMode });
  const setPreviewMode = (previewMode: PreviewMode) => change({ previewMode });

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
    let tracked = false;
    const trackSelection = () => {
      if (tracked || !isAnalyticsReady()) return;
      tracked = true;
      if (selectedTask && selectedExam && registryMode === "tasks")
        trackTaskOpen(selectedTask, selectedExam);
      else if (selectedExam) trackExamOpen(selectedExam);
    };
    window.addEventListener("exam-analytics-ready", trackSelection);
    trackSelection();
    return () =>
      window.removeEventListener("exam-analytics-ready", trackSelection);
  }, [selectedExam, selectedTask, registryMode]);

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
    change({
      query: "",
      year: "all",
      season: "all",
      taskType: "all",
      sortMode: "newest",
    });
  }
  function clearSelection() {
    change({ taskId: null, examId: null }, "push");
  }
  function selectTask(task: Task) {
    if (selectedTaskId === task.id) {
      clearSelection();
      return;
    }
    change(
      {
        taskId: task.id,
        examId: task.examId,
        previewMode: registryMode === "tasks" ? "task" : "exam",
      },
      "push",
    );
  }
  function selectExam(exam: Exam) {
    if (selectedExamId === exam.id) {
      clearSelection();
      return;
    }
    change(
      { examId: exam.id, taskId: exam.tasks[0] ?? null, previewMode: "exam" },
      "push",
    );
  }
  function handleSetRegistryMode(mode: RegistryMode) {
    change(
      { registryMode: mode, previewMode: mode === "exams" ? "exam" : "task" },
      "push",
    );
  }
  function handleSetExamType(type: ExplorerLocation["examType"]) {
    if (type === examType && !isNavigating) return;
    const next = {
      ...current.current.location,
      examType: type,
      taskId: null,
      examId: null,
      registryMode: "exams" as const,
      previewMode: "exam" as const,
    };
    void openUrl(new URL(explorerUrl(next), SITE_URL), "push");
  }
  function retryCatalog() {
    if (pendingUrl.current) void openUrl(pendingUrl.current, "push");
  }

  return {
    catalog,
    catalogError,
    isNavigating,
    location,
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
      navigateUrl: (url: URL) => {
        void openUrl(url, "push");
      },
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
