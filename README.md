# INF.04 Task Explorer

A local React/Vite explorer for previous Polish INF.04 practical technical exams.

The app catalogs exam sheets from:
https://github.com/Technikum-TEB-Edukacja-we-Wroclawiu/INF.04-rozwiazania

It includes:

- 29 whole exam PDFs from `_arkusze`
- 87 separately catalogued task records
- generated task-only PDF previews for parts I, II, and III
- search, year filter, task-type filter, sorting, task/exam views
- duplicate-task grouping for mixed-and-matched sheets
- links between the three parts of the currently selected exam

## Run

```bash
npm install
npm run dev
```

The local dev URL is usually:

```text
http://localhost:5173
```

## Build

```bash
npm run build
```

## Regenerate The Catalog

Install Python dependency if needed:

```bash
python -m pip install pypdf
```

Then run:

```bash
npm run generate:catalog -- --source "path/to/INF.04-rozwiazania" --public public
```

This rewrites `public/data/catalog.json`, copies whole PDFs into `public/pdfs/exams`, and creates page-range task PDFs in `public/pdfs/tasks`.
