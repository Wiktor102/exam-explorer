import { isUnmodifiedLinkClick } from "../utils/navigation";
import { examPath, taskPath } from "../lib/routes";
import { ArrowDownAZ, LayoutGrid, List } from "lucide-react";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { sortLabels, typeAccent, typeLabels } from "../constants/catalog";
import type {
  Exam,
  ExamType,
  RegistryMode,
  SortMode,
  Task,
} from "../types/catalog";
import { examFileName } from "../utils/catalog";
import { findHighlightRanges } from "../utils/search";
import { SeasonExamLabel } from "./SeasonExamLabel";
import { SelectControl } from "./SelectControl";

type RegistryPaneProps = {
  linkSearch: string;
  examById: Map<string, Exam>;
  examType: ExamType;
  filteredExams: Exam[];
  filteredTasks: Task[];
  highlightTokens: string[];
  isSelectedTaskFilteredOut: boolean;
  registryMode: RegistryMode;
  selectedExamId: string | null;
  selectedTaskId: string | null;
  selectedTask: Task | null;
  sortMode: SortMode;
  taskById: Map<string, Task>;
  onExamSelect: (exam: Exam) => void;
  onResetFilters: () => void;
  onSortModeChange: (sortMode: SortMode) => void;
  onTaskSelect: (task: Task) => void;
};

export function RegistryPane({
  linkSearch,
  examById,
  examType,
  filteredExams,
  filteredTasks,
  highlightTokens,
  isSelectedTaskFilteredOut,
  registryMode,
  selectedExamId,
  selectedTaskId,
  selectedTask,
  sortMode,
  taskById,
  onExamSelect,
  onResetFilters,
  onSortModeChange,
  onTaskSelect,
}: RegistryPaneProps) {
  const [examView, setExamView] = useState<"list" | "thumbnails">("list");
  const showExamViewToggle = examType === "inf03" && registryMode === "exams";

  return (
    <div className="registry-pane">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">Katalog</p>
          <h2>
            {registryMode === "tasks"
              ? `${filteredTasks.length} pasujących zadań`
              : `${filteredExams.length} pasujących arkuszy`}
          </h2>
        </div>

        <div className="pane-actions">
          {showExamViewToggle && (
            <div
              className="exam-view-toggle"
              role="group"
              aria-label="Widok arkuszy"
            >
              <button
                type="button"
                className={clsx(examView === "list" && "active")}
                aria-label="Widok listy"
                aria-pressed={examView === "list"}
                onClick={() => setExamView("list")}
              >
                <List size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={clsx(examView === "thumbnails" && "active")}
                aria-label="Widok miniatur"
                aria-pressed={examView === "thumbnails"}
                onClick={() => setExamView("thumbnails")}
              >
                <LayoutGrid size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          <SelectControl
            icon={<ArrowDownAZ size={16} />}
            label="Sortuj"
            value={sortMode}
            onChange={(value) => onSortModeChange(value as SortMode)}
          >
            <option value="newest">{sortLabels.newest}</option>
            <option value="oldest">{sortLabels.oldest}</option>
            <option value="type">{sortLabels.type}</option>
            <option value="part">{sortLabels.part}</option>
            <option value="duplicates">{sortLabels.duplicates}</option>
          </SelectControl>
        </div>
      </div>

      {registryMode === "tasks" ? (
        <TaskTable
          linkSearch={linkSearch}
          examType={examType}
          examById={examById}
          showPart={examType !== "inf03"}
          filteredTasks={filteredTasks}
          highlightTokens={highlightTokens}
          filteredOutSelectedTask={
            isSelectedTaskFilteredOut ? selectedTask : null
          }
          selectedTaskId={selectedTaskId}
          onResetFilters={onResetFilters}
          onTaskSelect={onTaskSelect}
        />
      ) : (
        <ExamList
          linkSearch={linkSearch}
          examType={examType}
          filteredExams={filteredExams}
          selectedExamId={selectedExamId}
          taskById={taskById}
          view={showExamViewToggle ? examView : "list"}
          onExamSelect={onExamSelect}
        />
      )}
    </div>
  );
}

type TaskTableProps = {
  examType: ExamType;
  linkSearch: string;
  examById: Map<string, Exam>;
  showPart: boolean;
  filteredTasks: Task[];
  highlightTokens: string[];
  filteredOutSelectedTask: Task | null;
  selectedTaskId: string | null;
  onResetFilters: () => void;
  onTaskSelect: (task: Task) => void;
};

function HighlightedSummary({
  summary,
  tokens,
}: {
  summary: string;
  tokens: string[];
}) {
  const segments = useMemo(() => {
    const ranges = findHighlightRanges(summary, tokens);
    if (ranges.length === 0) return null;
    const parts: { key: number; text: string; highlight: boolean }[] = [];
    let cursor = 0;
    ranges.forEach((range, index) => {
      if (range.start > cursor) {
        parts.push({
          key: index * 2,
          text: summary.slice(cursor, range.start),
          highlight: false,
        });
      }
      parts.push({
        key: index * 2 + 1,
        text: summary.slice(range.start, range.end),
        highlight: true,
      });
      cursor = range.end;
    });
    if (cursor < summary.length) {
      parts.push({
        key: ranges.length * 2,
        text: summary.slice(cursor),
        highlight: false,
      });
    }
    return parts;
  }, [summary, tokens]);

  if (!segments) return <>{summary}</>;
  return (
    <>
      {segments.map((part) =>
        part.highlight ? (
          <mark key={part.key}>{part.text}</mark>
        ) : (
          <span key={part.key}>{part.text}</span>
        ),
      )}
    </>
  );
}

function TaskTable({
  linkSearch,
  examType,
  examById,
  showPart,
  filteredTasks,
  highlightTokens,
  filteredOutSelectedTask,
  selectedTaskId,
  onResetFilters,
  onTaskSelect,
}: TaskTableProps) {
  if (filteredTasks.length === 0 && !filteredOutSelectedTask) {
    return (
      <div className="registry-empty" role="status">
        <p className="registry-empty-title">Brak pasujących zadań</p>
        <p className="registry-empty-hint">
          Nic tu nie ma. Spróbuj wyczyścić wyszukiwanie albo zresetować filtry.
        </p>
        <button
          type="button"
          className="registry-empty-reset"
          onClick={onResetFilters}
        >
          Resetuj filtry
        </button>
      </div>
    );
  }

  function renderTaskRow(task: Task, isFilteredOutSelection = false) {
    const exam = examById.get(task.examId);
    if (!exam) return null;

    return (
      <a
        href={taskPath(examType, task.id) + linkSearch}
        key={task.id}
        className={clsx(
          "task-row",
          selectedTaskId === task.id && "selected",
          isFilteredOutSelection && "filtered-out-selected",
        )}
        onClick={(event) => {
          if (!isUnmodifiedLinkClick(event)) return;
          event.preventDefault();
          onTaskSelect(task);
        }}
        role="row"
        title={
          isFilteredOutSelection
            ? `${examFileName(exam)} - wybrane poza filtrami`
            : examFileName(exam)
        }
      >
        <SeasonExamLabel exam={exam} showSeason={false} />
        {showPart && (
          <span className="task-part">
            {task.partLabel.replace("Część ", "")}
          </span>
        )}
        <span className={clsx("type-pill", typeAccent[task.type])}>
          {typeLabels[task.type] ?? task.type}
        </span>
        <span className="row-summary">
          <HighlightedSummary summary={task.summary} tokens={highlightTokens} />
        </span>
        <span className="task-repeat">
          {task.duplicates.length
            ? `${task.duplicates.length + 1} ark.`
            : "unikat"}
        </span>
      </a>
    );
  }

  return (
    <div
      className={clsx("task-table", !showPart && "without-part")}
      role="table"
      aria-label="Zadania"
    >
      <div className="table-head" role="row">
        <span>Arkusz</span>
        {showPart && <span>Cz.</span>}
        <span>Typ</span>
        <span>Opis</span>
        <span>Powtórki</span>
      </div>
      {filteredTasks.map((task) => renderTaskRow(task))}
      {filteredOutSelectedTask
        ? renderTaskRow(filteredOutSelectedTask, true)
        : null}
    </div>
  );
}

type ExamListProps = {
  linkSearch: string;
  examType: ExamType;
  filteredExams: Exam[];
  selectedExamId: string | null;
  taskById: Map<string, Task>;
  view: "list" | "thumbnails";
  onExamSelect: (exam: Exam) => void;
};

function ExamList({
  linkSearch,
  examType,
  filteredExams,
  selectedExamId,
  taskById,
  view,
  onExamSelect,
}: ExamListProps) {
  return (
    <div
      className={clsx(
        "exam-list",
        view === "thumbnails" && "thumbnail-view",
      )}
    >
      {filteredExams.map((exam) => {
        const examTasks = exam.tasks
          .map((id) => taskById.get(id))
          .filter(Boolean) as Task[];

        return (
          <a
            href={examPath(examType, exam.id) + linkSearch}
            key={exam.id}
            className={clsx(
              "exam-line",
              selectedExamId === exam.id && "selected",
            )}
            onClick={(event) => {
              if (!isUnmodifiedLinkClick(event)) return;
              event.preventDefault();
              onExamSelect(exam);
            }}
            title={examFileName(exam)}
          >
            {view === "thumbnails" && (
              <span className="exam-thumbnail" aria-hidden="true">
                <img
                  src={`/previews/inf03/${exam.id}.webp`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(event) =>
                    event.currentTarget.parentElement?.classList.add(
                      "missing-thumbnail",
                    )
                  }
                />
                <span className="exam-thumbnail-placeholder">
                  Podgląd niedostępny
                </span>
              </span>
            )}
            <SeasonExamLabel
              exam={exam}
              showSeason={false}
              showVariant={false}
            />
            <span className="exam-meta">
              <span className="exam-variant">{exam.variant}</span>
              <span className="exam-page-count">{exam.pageCount} str.</span>
            </span>
            <span className="exam-types">
              {examTasks.map((task) => typeLabels[task.type]).join(" / ")}
            </span>
          </a>
        );
      })}
    </div>
  );
}
