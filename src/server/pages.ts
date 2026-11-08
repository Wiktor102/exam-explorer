import { STATIC_PAGES } from "../lib/site";
import inf03 from "../../public/data/inf03/catalog.json";
import inf04 from "../../public/data/inf04/catalog.json";
import type { Catalog, Exam, ExamType, Task } from "../types/catalog";
import { catalogPath, examPath, taskPath } from "../lib/routes";
import { pageMetadata } from "../lib/pageMetadata";
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
    return [
      {
        path: catalogPath(type),
        type,
        catalog,
        ...pageMetadata(type, catalog),
      },
      ...catalog.exams.map((exam) => ({
        path: examPath(type, exam.id),
        type,
        catalog,
        exam,
        ...pageMetadata(type, catalog, exam),
      })),
      ...catalog.tasks.map((task) => {
        const exam = catalog.exams.find((exam) => exam.id === task.examId)!;
        return {
          path: taskPath(type, task.id),
          type,
          catalog,
          exam,
          task,
          ...pageMetadata(type, catalog, exam, task),
        };
      }),
    ];
  });
}

export function sitePages() {
  return [...Object.values(STATIC_PAGES), ...catalogPages()];
}
