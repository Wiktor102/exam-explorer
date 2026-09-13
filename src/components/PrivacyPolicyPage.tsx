import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { useEffect } from "react";

const GOOGLE_PRIVACY_URL = "https://policies.google.com/privacy?hl=pl";
const GOOGLE_ANALYTICS_DATA_URL =
  "https://support.google.com/analytics/answer/6004245?hl=pl";
const UODO_URL = "https://uodo.gov.pl/pl/p/skargi";

export function PrivacyPolicyPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title =
      "Polityka prywatności | Eksplorator zadań INF.03 i INF.04";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="landing-page privacy-page">
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

      <div className="privacy-layout">
        <nav className="privacy-index" aria-label="Spis treści">
          <a className="privacy-index__back" href="/">
            <ArrowLeft size={18} aria-hidden="true" />
            Wróć do strony głównej
          </a>
          <a href="#administrator">Administrator</a>
          <a href="#jakie-dane">Jakie dane</a>
          <a href="#analityka">Analityka</a>
          <a href="#cookies">Cookies</a>
          <a href="#prawa">Twoje prawa</a>
        </nav>

        <article className="privacy-article">
          <header className="privacy-hero">
            <p className="privacy-kicker">Informacje prawne</p>
            <h1>Polityka prywatności</h1>
            <p>
              Poniżej opisuję, jakie dane mogą powstać podczas korzystania z
              Eksploratora zadań i jak możesz decydować o pomiarze odwiedzin.
              Do przeglądania arkuszy nie trzeba zakładać konta ani podawać
              danych kontaktowych.
            </p>
          </header>

          <section id="administrator">
            <h2>1. Administrator danych</h2>
            <p>
              Administratorem danych jest Wiktor Golicz. W sprawach dotyczących
              prywatności napisz na adres{" "}
              <a href="mailto:admin@wiktorgolicz.pl">
                admin@wiktorgolicz.pl
              </a>
              .
            </p>
          </section>

          <section id="jakie-dane">
            <h2>2. Jak działa aplikacja i hosting</h2>
            <p>
              Aplikacja nie ma kont użytkowników, formularzy ani bazy danych z
              informacjami o odwiedzających. Nie zapisuje odpowiedzi na zadania
              i nie śledzi postępów w nauce.
            </p>
            <p>
              Serwer może automatycznie zapisywać logi techniczne, w tym adres
              IP, datę i godzinę żądania, odwiedzony adres, kod odpowiedzi oraz
              informacje o przeglądarce. Logi służą do zapewnienia
              bezpieczeństwa i diagnozowania awarii. Podstawą przetwarzania jest
              prawnie uzasadniony interes administratora, zgodnie z art. 6 ust.
              1 lit. f RODO. Dostawcą hostingu jest MyDevil.net, a logi są
              przechowywane do 90 dni.
            </p>
          </section>

          <section id="analityka">
            <h2>3. Google Analytics 4</h2>
            <p>
              Google Analytics 4 uruchamia się dopiero po wybraniu przycisku
              "Zezwól". Pomaga sprawdzić liczbę odwiedzin oraz to, które arkusze
              i zadania są otwierane najczęściej. Analityka nie jest potrzebna
              do działania aplikacji.
            </p>
            <ul>
              <li>
                <strong>Dostawca:</strong> Google Ireland Limited.
              </li>
              <li>
                <strong>Identyfikator pomiaru:</strong> G-MT0CRL07ZJ.
              </li>
              <li>
                <strong>Podstawa prawna:</strong> Twoja zgoda, zgodnie z art. 6
                ust. 1 lit. a RODO oraz art. 399 Prawa komunikacji
                elektronicznej w zakresie zapisu i odczytu cookies.
              </li>
              <li>
                <strong>Dane standardowe:</strong> odwiedzony adres, źródło
                wizyty, przybliżona lokalizacja, informacje o urządzeniu i
                przeglądarce oraz identyfikator zapisany w cookie. Google używa
                adresu IP do ustalenia przybliżonej lokalizacji, ale nie zapisuje
                go w Google Analytics.
              </li>
              <li>
                <strong>Zdarzenie exam_open:</strong> identyfikator, kod, rok,
                sesja i wariant wybranego arkusza.
              </li>
              <li>
                <strong>Zdarzenie task_open:</strong> identyfikator i typ
                zadania, numer części oraz identyfikator i kod arkusza.
              </li>
            </ul>
            <p>
              Do Google Analytics nie wysyłamy treści wyszukiwania, odpowiedzi
              na zadania, imienia, adresu e-mail ani innych danych podawanych
              przez użytkownika. Funkcje reklamowe i personalizacja reklam są
              wyłączone w kodzie aplikacji.
            </p>
            <p>
              Dane użytkownika i zdarzeń na poziomie użytkownika są
              przechowywane zgodnie z ustawieniem retencji usługi, nie dłużej niż
              14 miesięcy. Zbiorcze statystyki mogą pozostać dostępne dłużej.
              Google może przetwarzać dane poza Europejskim Obszarem
              Gospodarczym na zasadach opisanych w swojej polityce prywatności.
            </p>
            <p className="privacy-links">
              <a href={GOOGLE_PRIVACY_URL} target="_blank" rel="noreferrer">
                Polityka prywatności Google
                <ExternalLink size={15} aria-hidden="true" />
              </a>
              <a
                href={GOOGLE_ANALYTICS_DATA_URL}
                target="_blank"
                rel="noreferrer"
              >
                Jak Google chroni dane Analytics
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            </p>
          </section>

          <section id="cookies">
            <h2>4. Cookies i zapis ustawień</h2>
            <div className="privacy-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nazwa</th>
                    <th>Cel</th>
                    <th>Okres</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>examExplorer.analyticsConsent</td>
                    <td>
                      Zapis decyzji o analityce w pamięci localStorage
                      przeglądarki.
                    </td>
                    <td>Do usunięcia przez użytkownika.</td>
                  </tr>
                  <tr>
                    <td>_ga</td>
                    <td>Rozróżnianie użytkowników w Google Analytics.</td>
                    <td>Domyślnie do 2 lat.</td>
                  </tr>
                  <tr>
                    <td>_ga_MT0CRL07ZJ</td>
                    <td>Utrzymanie stanu sesji Google Analytics.</td>
                    <td>Domyślnie do 2 lat.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Lokalny zapis decyzji nie służy do analityki. Dzięki niemu
              aplikacja nie pyta o zgodę przy każdej wizycie. Po zgodzie możesz
              ją zmienić przyciskiem z ikoną tarczy w lewym dolnym rogu. Po
              wycofaniu zgody aplikacja blokuje Analytics i próbuje usunąć jego
              cookies z bieżącej domeny. Możesz też usunąć dane witryny w
              ustawieniach przeglądarki.
            </p>
            <p>
              Jeśli nie masz 16 lat, decyzję o zgodzie na analitykę powinien
              podjąć rodzic lub opiekun prawny.
            </p>
          </section>

          <section id="prawa">
            <h2>5. Twoje prawa</h2>
            <p>
              W zakresie przewidzianym przez RODO możesz poprosić o dostęp do
              danych, ich sprostowanie, usunięcie, ograniczenie przetwarzania
              lub przeniesienie. Możesz też wnieść sprzeciw wobec przetwarzania
              opartego na prawnie uzasadnionym interesie. Zgodę na analitykę
              możesz wycofać w dowolnym momencie. Nie wpływa to na zgodność z
              prawem wcześniejszego przetwarzania.
            </p>
            <p>
              Aplikacja nie podejmuje zautomatyzowanych decyzji i nie profiluje
              użytkowników. W sprawie swoich praw napisz na{" "}
              <a href="mailto:admin@wiktorgolicz.pl">
                admin@wiktorgolicz.pl
              </a>
              . Możesz również złożyć skargę do Prezesa Urzędu Ochrony Danych
              Osobowych.
            </p>
            <p className="privacy-links">
              <a href={UODO_URL} target="_blank" rel="noreferrer">
                Informacje o składaniu skarg do UODO
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            </p>
          </section>

          <section>
            <h2>6. Aktualizacje</h2>
            <p>
              Polityka obowiązuje od 13 września 2026 r. Ostatnia aktualizacja:
              13 września 2026 r.
            </p>
          </section>
        </article>
      </div>

      <footer className="landing-footer privacy-footer">
        <span>&copy; Wiktor Golicz 2026.</span>
        <a href="/">Eksplorator zadań</a>
      </footer>
    </main>
  );
}
