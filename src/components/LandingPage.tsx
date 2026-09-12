import {
  ArrowRight,
  Blocks,
  Bug,
  CodeXml,
  ExternalLink,
  FileSearch,
  Github,
  Scale,
} from "lucide-react";

const catalogs = [
  {
    code: "INF.03",
    href: "/?type=inf03",
    title:
      "Tworzenie i administrowanie stronami i aplikacjami internetowymi oraz bazami danych",
    accent: "red",
  },
  {
    code: "INF.04",
    href: "/?type=inf04",
    title: "Projektowanie, programowanie i testowanie aplikacji",
    accent: "teal",
  },
] as const;

const sourceRepositories = [
  {
    code: "INF.03",
    count: "86 arkuszy / 239 zadań",
    href: "https://github.com/Technikum-TEB-Edukacja-we-Wroclawiu/INF.03-rozwiazania",
  },
  {
    code: "INF.04",
    count: "29 arkuszy / 87 zadań",
    href: "https://github.com/Technikum-TEB-Edukacja-we-Wroclawiu/INF.04-rozwiazania",
  },
] as const;

export function LandingPage() {
  return (
    <main className="landing-page">
      <div className="landing-frame" aria-hidden="true" />
      <div
        className="landing-scroll-mask landing-scroll-mask--top"
        aria-hidden="true"
      />
      <div
        className="landing-scroll-mask landing-scroll-mask--bottom"
        aria-hidden="true"
      />

      <header className="landing-nav">
        <a
          className="landing-brand"
          href="/"
          aria-label="Eksplorator zadań, strona główna"
        >
          <img src="/favicon.svg" alt="" aria-hidden="true" />
          <span>Eksplorator zadań INF.03 i INF.04</span>
        </a>
        <a
          className="landing-source"
          href="https://github.com/Wiktor102/exam-explorer"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={17} aria-hidden="true" />
          Kod źródłowy
        </a>
      </header>

      <div className="landing-content">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-intro">
            <h1 id="landing-title">Wszystkie arkusze w jednym miejscu.</h1>
            <p className="landing-lead">
              Przeglądaj archiwalne arkusze z egzaminów zawodowych INF.03 i
              INF.04, filtruj zadania po temacie i od razu otwieraj właściwe
              strony arkuszy.
            </p>
          </div>

          <div
            className="catalog-picker"
            aria-labelledby="catalog-picker-title"
          >
            <div className="catalog-picker__heading">
              <div>
                <h2 id="catalog-picker-title">Który egzamin zdajesz?</h2>
              </div>
            </div>

            <div className="catalog-options">
              {catalogs.map((catalog) => (
                <a
                  className={`catalog-option catalog-option--${catalog.accent}`}
                  href={catalog.href}
                  key={catalog.code}
                >
                  <span className="catalog-option__code">{catalog.code}</span>
                  <span className="catalog-option__title">{catalog.title}</span>
                  <span className="catalog-option__action">
                    Otwórz katalog
                    <ArrowRight
                      size={19}
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  </span>
                </a>
              ))}
            </div>

            <p className="catalog-picker__note">
              Bezpłatnie, bez logowania. Materiały otwierają się w przeglądarce.
            </p>
          </div>
        </section>

        <section
          className="landing-section landing-about"
          id="o-projekcie"
          aria-labelledby="about-title"
        >
          <div className="landing-section__heading">
            <h2 id="about-title">Zadania bez szukania</h2>
            <p>
              Arkusz dobrze nadaje się do próbnego egzaminu. Do ćwiczenia
              konkretnej technologii jest niewygodny. Dlatego ten katalog
              rozbija każdy arkusz na osobne zadania.
            </p>
          </div>

          <div className="landing-difference-grid">
            <article>
              <span className="landing-card-icon">
                <Blocks size={22} aria-hidden="true" />
              </span>
              <p className="landing-card-kicker">Podział per zadanie</p>
              <h3>Jedna część, jeden rekord</h3>
              <p>
                Otwierasz od razu strony zadania, bez przewijania całego arkusza
                i szukania początku części.
              </p>
            </article>
            <article>
              <span className="landing-card-icon">
                <CodeXml size={22} aria-hidden="true" />
              </span>
              <p className="landing-card-kicker">Kategorie technologii</p>
              <h3>Ćwicz to, czego potrzebujesz</h3>
              <p>
                Wyszukuj i filtruj zadania według używanych technologii, typu
                zadania, sesji oraz roku.
              </p>
            </article>
            <article>
              <span className="landing-card-icon">
                <FileSearch size={22} aria-hidden="true" />
              </span>
              <p className="landing-card-kicker">Arkusz nadal pod ręką</p>
              <h3>Treść i zasady oceniania</h3>
              <p>
                Porównaj zadanie z pełnym arkuszem, plikami źródłowymi i
                zasadami oceniania, jeśli są dostępne.
              </p>
            </article>
          </div>
        </section>

        <section
          className="landing-section landing-data"
          id="dane"
          aria-labelledby="data-title"
        >
          <div className="landing-data__copy">
            <h2 id="data-title">Skąd pochodzą materiały?</h2>
            <p>
              Katalog korzysta z różnych publicznych repozytoriów arkuszy INF.03
              i INF.04. Zachowuje odnośniki do PDF-ów, plików dołączonych do
              egzaminu i rozwiązań. Opisy zadań służące do wyszukiwania i
              filtrowania są autorskie.
            </p>
          </div>

          <div
            className="landing-source-list"
            aria-label="Repozytoria z arkuszami"
          >
            {sourceRepositories.map((repository) => (
              <a
                href={repository.href}
                target="_blank"
                rel="noreferrer"
                key={repository.code}
              >
                <span>
                  <strong>{repository.code}</strong>
                  <small>{repository.count}</small>
                </span>
                <ExternalLink size={19} aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        <section
          className="landing-section landing-open-source"
          id="github"
          aria-labelledby="github-title"
        >
          <div>
            <h2 id="github-title">
              Brakuje arkusza? Coś nie działa? Zgłoś to.
            </h2>
            <p>
              Kod aplikacji jest dostępny do wglądu. Możesz sprawdzić, jak powstaje
              katalog, zaproponować zmianę albo opisać błąd w GitHub Issues.
            </p>
            <p>
              Licencja pozwala na użytek osobisty i modyfikacje. Publiczne
              udostępnianie własnej kopii aplikacji wymaga osobnej zgody.
              Arkusze i pozostałe materiały egzaminacyjne nie są objęte tą licencją.
            </p>
          </div>
          <div className="landing-project-links">
            <a
              href="https://github.com/Wiktor102/exam-explorer"
              target="_blank"
              rel="noreferrer"
            >
              <Github size={19} aria-hidden="true" />
              Zobacz kod
            </a>
            <a
              href="https://github.com/Wiktor102/exam-explorer/issues"
              target="_blank"
              rel="noreferrer"
            >
              <Bug size={19} aria-hidden="true" />
              Zgłoś problem
            </a>
            <a
              className="landing-license-link"
              href="https://github.com/Wiktor102/exam-explorer/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
            >
              <Scale size={19} aria-hidden="true" />
              Zobacz licencję
            </a>
          </div>
        </section>
      </div>

      <footer className="landing-footer">
        <span>&copy; Wiktor Golicz 2026.</span>
        <span>
          Ostatnia aktualizacja arkuszy:{" "}
          <time dateTime="2026-09-10T05:34:51.055641+00:00">
            10 września 2026, 05:34 UTC
          </time>
        </span>
      </footer>
    </main>
  );
}
