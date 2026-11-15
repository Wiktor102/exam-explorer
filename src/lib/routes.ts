import type { ExamType } from "../types/catalog";
export const catalogPath = (type: ExamType) => `/${type}/`;
export const examPath = (type: ExamType, id: string) =>
  `${catalogPath(type)}arkusze/${encodeURIComponent(id)}/`;
export const taskPath = (type: ExamType, id: string) =>
  `${catalogPath(type)}zadania/${encodeURIComponent(id)}/`;
export function parseCatalogPath(path: string) {
  const match = /^\/(inf03|inf04)(?:\/(arkusze|zadania)\/([^/]+))?\/?$/.exec(
    path,
  );
  if (!match) return null;
  return {
    examType: match[1] as ExamType,
    examId: match[2] === "arkusze" ? decodeURIComponent(match[3]) : null,
    taskId: match[2] === "zadania" ? decodeURIComponent(match[3]) : null,
  };
}
export function legacyDestination(url: URL): string | null {
  if (url.pathname !== "/") return null;
  const params = new URLSearchParams(url.search);
  if (
    ![
      "type",
      "task",
      "exam",
      "mode",
      "q",
      "year",
      "season",
      "taskType",
      "sort",
    ].some((key) => params.has(key))
  )
    return null;
  const task = params.get("task");
  const exam = params.get("exam");
  const type: ExamType =
    params.get("type") === "inf03" ||
    (!params.has("type") && (task ?? exam)?.startsWith("inf03"))
      ? "inf03"
      : "inf04";
  const path = task
    ? taskPath(type, task)
    : exam
      ? examPath(type, exam)
      : catalogPath(type);
  ["type", "task", "exam"].forEach((key) => params.delete(key));
  return path + (params.size ? `?${params}` : "") + url.hash;
}
