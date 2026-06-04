import { ExternalLink } from "lucide-react";

import type { Catalog } from "../types/catalog";

type AppTopbarProps = {
	catalog: Catalog;
};

export function AppTopbar({ catalog }: AppTopbarProps) {
	return (
		<header className="topbar">
			<div className="identity">
				<img className="identity-mark" src="/favicon.svg" alt="" aria-hidden="true" />
				<div>
					<h1>Eksplorator zadań INF.04</h1>
				</div>
			</div>
			<div className="source-strip">
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
