import { House, Moon, Sun } from "lucide-react";
import clsx from "clsx";

import type { Catalog, ExamType } from "../types/catalog";

type AppTopbarProps = {
	catalog: Catalog;
	examType: ExamType;
	theme: "light" | "dark";
	onExamTypeChange: (type: ExamType) => void;
	onThemeChange: (theme: "light" | "dark") => void;
};

export function AppTopbar({ catalog, examType, theme, onExamTypeChange, onThemeChange }: AppTopbarProps) {
	return (
		<header className="topbar">
			<a className="identity" href="/" aria-label="Wróć do strony głównej">
				<img className="identity-mark" src="/favicon.svg" alt="" aria-hidden="true" />
				<div>
					<p className="eyebrow">Eksplorator zadań</p>
					<h1>{examType === "inf04" ? "INF.04" : "INF.03"}</h1>
				</div>
			</a>
			<div className="source-strip">
				<a className="home-link" href="/" aria-label="Wróć do strony głównej">
					<House size={16} strokeWidth={2.5} aria-hidden="true" />
					Start
				</a>
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
				<span className="catalog-count">
					<strong>{catalog.examCount}</strong>
					<small>ark.</small>
				</span>
				<span className="catalog-count">
					<strong>{catalog.taskCount}</strong>
					<small>zad.</small>
				</span>
				<button
					type="button"
					className="topbar-theme"
					onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
					aria-label={theme === "dark" ? "Włącz tryb jasny" : "Włącz tryb ciemny"}
					title={theme === "dark" ? "Tryb jasny" : "Tryb ciemny"}
				>
					{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
				</button>
			</div>
		</header>
	);
}
