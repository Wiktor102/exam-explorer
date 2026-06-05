import clsx from "clsx";
import { BarChart3, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { denyAnalyticsConsent, loadAnalytics } from "../lib/analytics";

const STORAGE_KEY = "examExplorer.analyticsConsent";

type AnalyticsConsent = "accepted" | "rejected";

function readStoredConsent(): AnalyticsConsent | null {
	const storedConsent = window.localStorage.getItem(STORAGE_KEY);
	return storedConsent === "accepted" || storedConsent === "rejected" ? storedConsent : null;
}

export function CookieConsent() {
	const [consent, setConsent] = useState<AnalyticsConsent | null>(() => readStoredConsent());
	const [isPanelOpen, setIsPanelOpen] = useState(() => readStoredConsent() === null);

	useEffect(() => {
		if (consent === "accepted") {
			loadAnalytics();
		}

		if (consent === "rejected") {
			denyAnalyticsConsent();
		}
	}, [consent]);

	const saveConsent = (nextConsent: AnalyticsConsent) => {
		window.localStorage.setItem(STORAGE_KEY, nextConsent);
		setConsent(nextConsent);
		setIsPanelOpen(false);
	};

	if (!isPanelOpen) {
		return (
			<button
				className="privacy-settings-button"
				type="button"
				aria-label="Otwórz ustawienia prywatności"
				title="Ustawienia prywatności"
				onClick={() => setIsPanelOpen(true)}
			>
				<ShieldCheck size={18} aria-hidden="true" />
			</button>
		);
	}

	return (
		<section className={clsx("cookie-consent", consent !== null && "with-close")} aria-label="Ustawienia prywatności">
			<div className="cookie-consent__mark" aria-hidden="true">
				<BarChart3 size={22} />
			</div>

			<div className="cookie-consent__copy">
				<p className="eyebrow">Prywatność</p>
				<h2>Analityczne pliki cookie</h2>
				<p>
					Aplikacja korzysta z Google Analytics, aby sprawdzać, które arkusze i filtry są przydatne. Analityka jest
					wyłączona, dopóki jej nie zaakceptujesz, a funkcje reklamowe pozostają wyłączone.
				</p>
			</div>

			<div className="cookie-consent__status" aria-live="polite">
				{consent === "accepted" && "Analityka jest włączona"}
				{consent === "rejected" && "Analityka jest wyłączona"}
				{consent === null && "Nie zapisano wyboru"}
			</div>

			<div className="cookie-consent__actions">
				<button className="cookie-consent__button secondary" type="button" onClick={() => saveConsent("rejected")}>
					Odrzuć
				</button>
				<button className="cookie-consent__button primary" type="button" onClick={() => saveConsent("accepted")}>
					Zezwól na analitykę
				</button>
			</div>

			{consent !== null && (
				<button
					className="cookie-consent__close"
					type="button"
					aria-label="Zamknij ustawienia prywatności"
					title="Zamknij"
					onClick={() => setIsPanelOpen(false)}
				>
					<X size={17} aria-hidden="true" />
				</button>
			)}
		</section>
	);
}
