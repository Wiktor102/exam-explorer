import type { Catalog, Exam, ExamType, Task } from "../types/catalog";
import { formatExamLabel } from "../utils/catalog";
import { SITE_URL } from "./site";

export function pageMetadata(
  type: ExamType,
  catalog: Catalog,
  exam?: Exam,
  task?: Task,
) {
  const label = type === "inf03" ? "INF.03" : "INF.04";
  if (task && exam)
    return {
      title: `${task.heading || task.title} – ${exam.code}, część ${task.part}`,
      description:
        `${label}, ${formatExamLabel(exam)}, część ${task.part}: ${task.summary || task.title}`
          .replace(/\s+/g, " ")
          .slice(0, 220),
    };
  if (exam)
    return {
      title: `${label} ${formatExamLabel(exam)} – arkusz ${exam.code}`,
      description: `Arkusz egzaminacyjny ${exam.code}, ${formatExamLabel(exam)}. Zadania, pełny PDF${exam.scoringPdf ? ", zasady oceniania" : ""} i materiały źródłowe.`,
    };
  return {
    title: `${label} – arkusze i zadania egzaminacyjne`,
    description: `Przeglądaj ${catalog.exams.length} arkuszy i ${catalog.tasks.length} zadań ${label}. Treści zadań, pliki PDF i zasady oceniania z archiwalnych sesji egzaminu zawodowego.`,
  };
}

export function updatePageMetadata(
  path: string,
  metadata: ReturnType<typeof pageMetadata>,
) {
  document.title = metadata.title;
  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute("href", SITE_URL + path);
  for (const [selector, content] of [
    ['meta[name="description"]', metadata.description],
    ['meta[property="og:title"]', metadata.title],
    ['meta[property="og:description"]', metadata.description],
    ['meta[property="og:url"]', SITE_URL + path],
    ['meta[name="twitter:title"]', metadata.title],
    ['meta[name="twitter:description"]', metadata.description],
  ])
    document.querySelector(selector)?.setAttribute("content", content);
}
