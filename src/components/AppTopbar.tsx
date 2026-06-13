import { ExternalLink } from "lucide-react";
import clsx from "clsx";

import type { Catalog, ExamType } from "../types/catalog";

type AppTopbarProps = {
	catalog: Catalog;
	examType: ExamType;
	onExamTypeChange: (type: ExamType) => void;
};

export function AppTopbar({ catalog, examType, onExamTypeChange }: AppTopbarProps) {
	return (
		<header className="topbar">
			<div className="identity">
				<img className="identity-mark" src="/favicon.svg" alt="" aria-hidden="true" />
				<div>
					<h1>Eksplorator zadań {examType === "inf04" ? "INF.04" : "INF.03"}</h1>
				</div>
			</div>
			<div className="source-strip">
				<div className="exam-toggle" role="group" aria-label="Typ egzaminu">
					<button
						type="button"
						className={clsx(examType === "inf04" && "active")}
						onClick={() => onExamTypeChange("inf04")}
					>
						INF.04
					</button>
					<button
						type="button"
						className={clsx(examType === "inf03" && "active")}
						onClick={() => onExamTypeChange("inf03")}
					>
						INF.03
					</button>
				</div>
				<span>{catalog.examCount} arkuszy</span>
				<span>{catalog.taskCount} zadań</span>
				<a href={catalog.sourceRepository} target="_blank" rel="noreferrer">
					Źródło
					<ExternalLink size={15} strokeWidth={2.5} aria-hidden="true" />
				</a>
				<a href="https://github.com/Wiktor102/exam-explorer" target="_blank" rel="noreferrer">
					Github
					<ExternalLink size={15} strokeWidth={2.5} aria-hidden="true" />
				</a>
			</div>
		</header>
	);
}
