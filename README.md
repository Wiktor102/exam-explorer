# Eksplorator zadań INF.03 i INF.04

Statyczna witryna Astro z przeglądarką React do przeglądania archiwalnych arkuszy praktycznych egzaminów zawodowych INF.03 i INF.04. Ułatwia znalezienie konkretnego typu zadania bez przewijania całego arkusza.

Materiały egzaminacyjne zebrano z publicznie dostępnych zbiorów. Większość
materiałów INF.04 pobrano z repozytorium
[INF.04-rozwiazania](https://github.com/Technikum-TEB-Edukacja-we-Wroclawiu/INF.04-rozwiazania).
Odnośniki do zewnętrznych zbiorów i rozwiązań nie stanowią ewidencji pochodzenia
każdego pliku. Zobacz [informacje o materiałach zewnętrznych](THIRD_PARTY_NOTICES.md).

## Zawartość danych

| Kwalifikacja | Arkusze | Zadania | Lata |
| --- | ---: | ---: | --- |
| INF.03 | 95 | 265 | 2021-2026 |
| INF.04 | 31 | 93 | 2021-2026 |
| Łącznie | 118 | 334 | 2021-2026 |

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
- Python 3 z `pip`, do odtwarzania katalogów i uruchamiania ich testów

## Uruchomienie lokalne

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:4321`.

## Sprawdzenie i build

```bash
pnpm lint
pnpm build
pnpm test:seo
python3 -m unittest discover -s scripts -p 'test_generate_catalog.py'
pnpm preview
```

Testy katalogu wymagają zależności z `scripts/requirements-catalog.txt`
(`python3 -m pip install -r scripts/requirements-catalog.txt`). Workflow
`Catalog tests` uruchamia je automatycznie dla każdego pull requesta i po pushu
do `main`; można go też uruchomić ręcznie w GitHub Actions.

## Strony i SEO

Build generuje pełny HTML strony głównej i polityki prywatności oraz katalogów
`/inf03/` i `/inf04/`. Każdy arkusz ma adres `/<kwalifikacja>/arkusze/<id>/`,
a zadanie `/<kwalifikacja>/zadania/<id>/`. Treści zadań, linki do PDF oraz
nawigacja są dostępne bez JavaScript. React zastępuje statyczną zawartość
katalogu przeglądarką z filtrami i podglądem PDF. Strona główna i polityka
ładują tylko mały komponent zgody, bez kodu przeglądarki.

Wspólne funkcje w `src/lib/routes.ts` określają adresy stron. Generowanie stron
i `sitemap.xml` korzysta z tych samych danych w `src/server/pages.ts`.
Metadane i adres produkcyjny są wspólne dla wszystkich stron. Sitemap nie
podaje `lastmod`, ponieważ czas wygenerowania katalogu nie oznacza zmiany treści.

Stare odnośniki `/?type=...&exam=...&task=...` przekierowuje skrypt strony
głównej przez `location.replace`, z zachowaniem filtrów i fragmentu URL.
Są to przekierowania w przeglądarce, bez kodu HTTP 301. Wybór arkusza lub
zadania otwiera wygenerowaną stronę, aby metadane odpowiadały adresowi.
Filtry pozostają w query string. Hosting musi serwować pliki `index.html`
z katalogów i zwracać 404 dla nieznanych ścieżek, zgodnie z `public/.htaccess`.
Nie należy przywracać przekierowania wszystkich ścieżek do strony głównej.

`pnpm test:seo` wymaga wcześniejszego buildu. Sprawdza zgodność sitemap ze
wszystkimi wpisami katalogów, pełne treści zadań w HTML, metadane, linki
wewnętrzne i konwersję starych adresów.

## Układ projektu

```text
src/pages/                      strony generowane przez Astro
src/components/                 komponenty statyczne i przeglądarka React
public/data/inf03/catalog.json  katalog INF.03
public/data/inf04/catalog.json  katalog INF.04
public/pdfs/                    arkusze, zadania i kryteria oceniania
public/previews/                miniatury arkuszy INF.03
scripts/                        generatory katalogów
```

## Odświeżanie katalogów

Generatory wymagają `pypdf` w wersji zgodnej z tekstem zapisanym w katalogu:

```bash
python3 -m pip install -r scripts/requirements-catalog.txt
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
pnpm generate:catalog --source ../INF.04-rozwiazania --public public
```

Polecenie nadpisuje `public/data/inf04/catalog.json`, kopiuje pełne pliki PDF do `public/pdfs/exams` i tworzy pliki PDF z zakresami stron dla zadań w `public/pdfs/tasks`. Domyślnie zachowuje istniejące rekordy i pliki, co chroni katalog przed różnicami wynikającymi z wersji narzędzi do obsługi PDF. Aby odtworzyć całość, użyj flagi `--regenerate-existing`. Zweryfikowane arkusze spoza repozytorium źródłowego są przechowywane w `archive-sources/inf04`, więc generator zachowuje je przy kolejnych uruchomieniach.

Oba arkusze INF.04 z czerwca 2026 i ich zasady oceniania mają lokalne kopie źródłowe. [Spis źródeł](archive-sources/inf04/README.md) podaje adresy, sumy SHA-256 i zakresy stron zadań. Pełne PDF-y zachowują formularze dołączone do arkuszy; osobne zadania pomijają puste strony i końcowe formularze podpisu. Poprawiony zakres stron powoduje odtworzenie pliku zadania, jeśli jego liczba stron jest nieaktualna. Archiwum `Web1.7z`, wymienione w arkuszu 01, nie zostało odnalezione w zweryfikowanych źródłach publicznych.
