import type { Exam, ExamType, Task } from "../types/catalog";
import { examPath, taskPath } from "../lib/routes";
export function TaskContent({
  type,
  exam,
  tasks,
}: {
  type: ExamType;
  exam: Exam | null;
  tasks: Task[];
}) {
  if (!exam) return null;
  return (
    <details className="task-content">
      <summary>Treść zadań i pliki PDF</summary>
      <p>
        <a href={examPath(type, exam.id)}>{exam.code}</a> ·{" "}
        <a href={exam.pdf}>Pełny arkusz PDF</a>
        {exam.scoringPdf && (
          <>
            {" "}
            · <a href={exam.scoringPdf}>Zasady oceniania PDF</a>
          </>
        )}
      </p>
      {tasks.map((task) => (
        <article key={task.id}>
          <h2>
            <a href={taskPath(type, task.id)}>
              {task.heading || task.title}, część {task.part}
            </a>
          </h2>
          <p>{task.summary}</p>
          <a href={task.pdf}>Zadanie PDF</a>
          <div className="task-transcript">{task.text}</div>
        </article>
      ))}
    </details>
  );
}
