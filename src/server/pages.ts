import inf03 from "../../public/data/inf03/catalog.json";
import inf04 from "../../public/data/inf04/catalog.json";
import type { Catalog, Exam, ExamType, Task } from "../types/catalog";
import { catalogPath, examPath, taskPath } from "../lib/routes";
import { formatExamLabel } from "../utils/catalog";
export type CatalogPage = {
  path: string;
  type: ExamType;
  catalog: Catalog;
  exam?: Exam;
  task?: Task;
  title: string;
  description: string;
};
export function catalogPages(): CatalogPage[] {
  return (
    [
      ["inf03", inf03],
      ["inf04", inf04],
    ] as [ExamType, Catalog][]
  ).flatMap(([type, catalog]) => {
    const label = type === "inf03" ? "INF.03" : "INF.04";
    return [
      {
        path: catalogPath(type),
        type,
        catalog,
        title: `${label} – arkusze i zadania egzaminacyjne`,
        description: `Przeglądaj ${catalog.exams.length} arkuszy i ${catalog.tasks.length} zadań ${label}. Treści zadań, pliki PDF i zasady oceniania z archiwalnych sesji egzaminu zawodowego.`,
      },
      ...catalog.exams.map((exam) => ({
        path: examPath(type, exam.id),
        type,
        catalog,
        exam,
        title: `${label} ${formatExamLabel(exam)} – arkusz ${exam.code}`,
        description: `Arkusz egzaminacyjny ${exam.code}, ${formatExamLabel(exam)}. Zadania, pełny PDF${exam.scoringPdf ? ", zasady oceniania" : ""} i materiały źródłowe.`,
      })),
      ...catalog.tasks.map((task) => {
        const exam = catalog.exams.find((exam) => exam.id === task.examId)!;
        return {
          path: taskPath(type, task.id),
          type,
          catalog,
          exam,
          task,
          title: `${task.heading || task.title} – ${exam.code}, część ${task.part}`,
          description:
            `${label}, ${formatExamLabel(exam)}, część ${task.part}: ${task.summary || task.title}`
              .replace(/\s+/g, " ")
              .slice(0, 220),
        };
      }),
    ];
  });
}
