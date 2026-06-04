# Przeglądarka zadań INF.04

Lokalna aplikacja React/Vite do przeglądania archiwalnych polskich egzaminów praktycznych INF.04.

Aplikacja kataloguje arkusze egzaminacyjne z repozytorium:
https://github.com/Technikum-TEB-Edukacja-we-Wroclawiu/INF.04-rozwiazania

Zawiera:

- 29 pełnych plików PDF z egzaminami z katalogu `_arkusze`
- 87 osobno skatalogowanych rekordów zadań
- wygenerowane podglądy PDF zawierające tylko zadania dla części I, II i III
- wyszukiwanie, filtrowanie po roku, filtrowanie po typie zadania, sortowanie oraz widoki zadań i egzaminów
- grupowanie powtarzających się zadań w arkuszach składanych z różnych części
- linki między trzema częściami aktualnie wybranego egzaminu

## Uruchomienie

```bash
npm install
npm run dev
```

Lokalny adres środowiska deweloperskiego to zwykle:

```text
http://localhost:5173
```

## Budowanie

```bash
npm run build
```

## Regenerowanie katalogu

W razie potrzeby zainstaluj zależność Pythona:

```bash
python -m pip install pypdf
```

Następnie uruchom:

```bash
npm run generate:catalog -- --source "path/to/INF.04-rozwiazania" --public public
```

Polecenie nadpisuje `public/data/catalog.json`, kopiuje pełne pliki PDF do `public/pdfs/exams` i tworzy pliki PDF z zakresami stron dla zadań w `public/pdfs/tasks`.
