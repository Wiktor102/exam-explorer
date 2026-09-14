import { Snowflake, Sun } from "lucide-react";
import clsx from "clsx";
import type { Exam } from "../types/catalog";
import { examFileName, formatExamLabel } from "../utils/catalog";

type SeasonExamLabelProps = {
  exam: Exam;
  showSeason?: boolean;
  tone?: "default" | "heading" | "compact";
};

export function SeasonExamLabel({
  exam,
  showSeason = true,
  tone = "default",
}: SeasonExamLabelProps) {
  const isSummer = exam.month === "06";
  const SeasonIcon = isSummer ? Sun : Snowflake;

  return (
    <span
      className={clsx("exam-code", tone, isSummer ? "summer" : "winter")}
      title={examFileName(exam)}
      aria-label={showSeason ? undefined : formatExamLabel(exam)}
    >
      <SeasonIcon className="season-icon" aria-hidden="true" />
      <span>{formatExamLabel(exam, showSeason)}</span>
    </span>
  );
}
