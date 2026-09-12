import { ArrowRight, FileSearch, Github, Search, SlidersHorizontal } from 'lucide-react'

const catalogs = [
  {
    code: 'INF.03',
    href: '/?type=inf03',
    title: 'Tworzenie i administrowanie stronami i aplikacjami internetowymi oraz bazami danych',
    accent: 'red',
  },
  {
    code: 'INF.04',
    href: '/?type=inf04',
    title: 'Projektowanie, programowanie i testowanie aplikacji',
    accent: 'teal',
  },
] as const

export function LandingPage() {
  return (
    <main className="landing-page">
      <div className="landing-frame" aria-hidden="true" />

      <header className="landing-nav">
        <a className="landing-brand" href="/" aria-label="Eksplorator zadań, strona główna">
          <img src="/favicon.svg" alt="" aria-hidden="true" />
          <span>Eksplorator zadań</span>
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

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-intro">
          <p className="landing-kicker">Egzamin zawodowy • arkusze praktyczne</p>
          <h1 id="landing-title">
            Znajdź zadanie,
            <span>nie przekopuj PDF-ów.</span>
          </h1>
          <p className="landing-lead">
            Przeglądaj archiwalne arkusze INF.03 i INF.04, filtruj zadania po temacie i od razu otwieraj właściwe
            strony dokumentu.
          </p>

          <ul className="landing-features" aria-label="Możliwości eksploratora">
            <li>
              <Search size={18} aria-hidden="true" />
              Wyszukiwanie w treści zadań
            </li>
            <li>
              <SlidersHorizontal size={18} aria-hidden="true" />
              Filtrowanie po roku, sesji i typie
            </li>
            <li>
              <FileSearch size={18} aria-hidden="true" />
              Podgląd arkusza i zasad oceniania
            </li>
          </ul>
        </div>

        <div className="catalog-picker" aria-labelledby="catalog-picker-title">
          <div className="catalog-picker__heading">
            <span>01</span>
            <div>
              <p className="eyebrow">Wybierz kwalifikację</p>
              <h2 id="catalog-picker-title">Którego katalogu szukasz?</h2>
            </div>
          </div>

          <div className="catalog-options">
            {catalogs.map((catalog) => (
              <a className={`catalog-option catalog-option--${catalog.accent}`} href={catalog.href} key={catalog.code}>
                <span className="catalog-option__code">{catalog.code}</span>
                <span className="catalog-option__title">{catalog.title}</span>
                <span className="catalog-option__action">
                  Otwórz katalog
                  <ArrowRight size={19} strokeWidth={2.5} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>

          <p className="catalog-picker__note">Bezpłatnie, bez logowania. Materiały otwierają się w przeglądarce.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Arkusze • zadania • podgląd PDF</span>
        <span>INF.03 / INF.04</span>
      </footer>
    </main>
  )
}
