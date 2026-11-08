import type {
  Catalog,
  ExamType,
  PreviewMode,
  RegistryMode,
  SeasonFilter,
  SortMode,
} from "../types/catalog";
import { catalogPath, examPath, taskPath, parseCatalogPath } from "./routes";
export type ExplorerLocation = {
  examType: ExamType;
  taskId: string | null;
  examId: string | null;
  registryMode: RegistryMode;
  previewMode: PreviewMode;
  query: string;
  year: string;
  season: SeasonFilter;
  taskType: string;
  sortMode: SortMode;
};
export function readExplorerLocation(
  url: URL,
  catalog: Catalog,
): ExplorerLocation {
  const route = parseCatalogPath(url.pathname);
  const params = url.searchParams;
  const task = catalog.tasks.find((item) => item.id === route?.taskId);
  const exam = catalog.exams.find(
    (item) => item.id === (task?.examId ?? route?.examId),
  );
  const year = params.get("year") ?? "";
  const season = params.get("season");
  const sort = params.get("sort");
  return {
    examType: route?.examType ?? "inf04",
    examId: exam?.id ?? null,
    taskId: task?.id ?? exam?.tasks[0] ?? null,
    registryMode: task
      ? "tasks"
      : exam
        ? "exams"
        : params.get("mode") === "tasks"
          ? "tasks"
          : "exams",
    previewMode: task ? "task" : "exam",
    query: params.get("q") ?? "",
    year: /^\d{4}$/.test(year) ? year : "all",
    season: season === "winter" || season === "summer" ? season : "all",
    taskType: params.get("taskType") || "all",
    sortMode: ["oldest", "type", "part", "duplicates"].includes(sort ?? "")
      ? (sort as SortMode)
      : "newest",
  };
}
export function explorerUrl(state: ExplorerLocation): string {
  const path =
    state.registryMode === "tasks" && state.taskId
      ? taskPath(state.examType, state.taskId)
      : state.examId
        ? examPath(state.examType, state.examId)
        : catalogPath(state.examType);
  const params = new URLSearchParams();
  if (!state.examId && state.registryMode === "tasks")
    params.set("mode", "tasks");
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.year !== "all") params.set("year", state.year);
  if (state.season !== "all") params.set("season", state.season);
  if (state.taskType !== "all") params.set("taskType", state.taskType);
  if (state.sortMode !== "newest") params.set("sort", state.sortMode);
  return path + (params.size ? `?${params}` : "");
}
