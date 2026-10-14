# Eksplorator zadań INF.03 i INF.04

Aplikacja React i Vite do przeglądania archiwalnych arkuszy praktycznych egzaminów zawodowych INF.03 i INF.04. Ułatwia znalezienie konkretnego typu zadania bez przewijania całego arkusza.

Materiały egzaminacyjne zebrano z publicznie dostępnych zbiorów. Większość
materiałów INF.04 pobrano z repozytorium
[INF.04-rozwiazania](https://github.com/Technikum-TEB-Edukacja-we-Wroclawiu/INF.04-rozwiazania).
Odnośniki do zewnętrznych zbiorów i rozwiązań nie stanowią ewidencji pochodzenia
każdego pliku. Zobacz [informacje o materiałach zewnętrznych](THIRD_PARTY_NOTICES.md).

## Zawartość danych

| Kwalifikacja | Arkusze | Zadania | Lata |
| --- | ---: | ---: | --- |
| INF.03 | 86 | 239 | 2021-2026 |
| INF.04 | 29 | 87 | 2021-2026 |
| Łącznie | 115 | 326 | 2021-2026 |

Każdy katalog zawiera pełne arkusze PDF, osobne PDF-y dla zadań oraz, gdy są dostępne, kryteria oceniania. Interfejs pozwala:

- przełączać katalog INF.03 i INF.04;
- wyszukiwać i filtrować zadania według roku, sesji i typu;
- przeglądać arkusze lub pojedyncze zadania w PDF;
- otwierać kryteria oceniania, pliki dołączone do arkusza i folder rozwiązania;
- znajdować powtarzające się zadania;
- udostępniać wybrany arkusz lub zadanie przez adres URL.

Analityka Google Analytics jest ładowana dopiero po wyrażeniu zgody w ustawieniach prywatności.

## Licencja

Kod aplikacji, skrypty, dokumentacja i autorskie opisy katalogu są udostępniane
na warunkach [Exam Explorer Personal Use and Source Sharing License 1.0](LICENSE).
Licencja pozwala na użytek osobisty, dowolne prywatne modyfikacje oraz
udostępnianie kodu i forków z zachowaniem licencji. Własną instancję można
uruchamiać lokalnie lub na serwerze dla siebie albo zamkniętej grupy, np.
znajomych lub kolegów z klasy, do użytku osobistego lub nauki.

Arkusze, zadania, kryteria oceniania, załączniki, rozwiązania oraz ich fragmenty
i miniatury nie są objęte licencją aplikacji, również gdy znajdują się w danych
katalogu. Prawa do nich pozostają przy odpowiednich właścicielach. Licencja
aplikacji nie nadaje praw do tych materiałów ani nie nakłada na nie dodatkowych
ograniczeń. Źródła i zakres wyłączeń opisuje [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
Zależności zewnętrzne zachowują własne licencje.

## Wymagania

- Node.js 24
- pnpm 11.6.0
- Python 3 z `pip`, tylko do odtwarzania katalogów

## Uruchomienie lokalne

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:5173`.

## Sprawdzenie i build

```bash
pnpm lint
pnpm build
pnpm preview
```

## Układ projektu

```text
src/                            aplikacja React
public/data/inf03/catalog.json  katalog INF.03
public/data/inf04/catalog.json  katalog INF.04
public/pdfs/                    arkusze, zadania i kryteria oceniania
public/previews/                miniatury arkuszy INF.03
scripts/                        generatory katalogów
```

## Odświeżanie katalogów

Generatory wymagają `pypdf`:

```bash
python3 -m pip install pypdf
```

### INF.03

Skrypt dzieli obecne arkusze z `public/pdfs/exams` na zadania i aktualizuje `public/data/inf03/catalog.json`.

```bash
python3 scripts/generate_inf03_tasks.py --public public
```

Publiczne załączniki INF.03 można zsynchronizować z katalogu CKZiU w Wyrzysku:

```bash
python3 scripts/sync_inf03_resources.py --public public
```

Wdrożenie kopiuje zasoby obu kwalifikacji do katalogu wynikowego pod nazwami
arkuszy. Ten sam krok można uruchomić lokalnie po zbudowaniu aplikacji:

```bash
python3 scripts/mirror_resources.py --public dist
```

### INF.04

Generator oczekuje lokalnego klonu repozytorium źródłowego. Kopiuje arkusze, zadania i dostępne kryteria oceniania do `public/pdfs`.

```bash
pnpm generate:catalog -- --source ../INF.04-rozwiazania --public public
cp public/data/catalog.json public/data/inf04/catalog.json
```

Skrypt INF.04 nadal zapisuje katalog do `public/data/catalog.json`, ale aplikacja odczytuje `public/data/inf04/catalog.json`. Druga komenda umieszcza wygenerowane dane we właściwym miejscu.
