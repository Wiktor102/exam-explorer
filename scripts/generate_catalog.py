from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter


EXAM_RE = re.compile(
    r"inf_04_(?P<year>\d{4})_(?P<month>\d{2})_(?P<number>\d{2})_(?P<variant>[A-Z]{2})(?:_kolor)?\.pdf$",
    re.IGNORECASE,
)

HEADINGS = [
    ("part-1", "Część I", re.compile(r"Część\s+I\.?\s*", re.IGNORECASE)),
    ("part-2", "Część II", re.compile(r"Część\s+II\.?\s*", re.IGNORECASE)),
    ("part-3", "Część III", re.compile(r"Część\s+III\.?\s*", re.IGNORECASE)),
]


@dataclass
class HeadingHit:
    part_id: str
    label: str
    page: int
    page_start: int
    start: int
    end: int


def normalize_hash_text(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).lower()
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("ł", "l")
    text = re.sub(r"strona\s+\d+\s+z\s+\d+", " ", text)
    text = re.sub(r"inf\.?04[-_\s\d.a-z]+", " ", text)
    text = re.sub(r"\d{4}", " ", text)
    text = re.sub(r"[^0-9a-z]+", "", text)
    return text


def compact_text(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def first_sentenceish(text: str, limit: int = 260) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return f"{cut}..."


TOPIC_RULES = [
    (("szyfr cezara", "kodem cezara", "szyfrowanie"), "szyfrowanie tekstu szyfrem Cezara z kluczem liczbowym i zawijaniem alfabetu"),
    (("gry w kości", "rzut kością", "kości", "kosc"), "gra w kości z losowaniem wartości i punktacją"),
    (("samogłosek", "samoglosek", "powtórzenia znaków", "powtorzenia znakow", "typu łańcuchowego"), "narzędzia tekstowe do liczenia samogłosek i usuwania sąsiednich powtórzeń"),
    (("sprawdzający poprawność numeru pesel", "numeru pesel", "cyfra kontrolna"), "walidacja numeru PESEL z płcią i cyfrą kontrolną"),
    (("algorytm euklidesa", "nwd"), "algorytm Euklidesa do obliczania NWD dwóch liczb"),
    (("systemu forum", "klasa osoba", "zarejestrowanych osób"), "klasa Osoba z konstruktorami, licznikiem instancji i komunikatem powitalnym"),
    (("wizytę u weterynarza", "wizyta u weterynarza"), "formularz wizyty u weterynarza z gatunkiem, wiekiem zwierzęcia i godziną"),
    (("ustawieniami czcionki", "właściwości czcionki"), "ustawienia czcionki z rozmiarem, stylem i przełączaniem cytatów"),
    (("kategoryzacji zdjęć", "galerii", "category", "downloads"), "galeria zdjęć z filtrowaniem kategorii i licznikiem pobrań"),
    (("zapisy na kursy", "zapisz do kursu", "liczba kursów"), "formularz zapisów na kursy z listą kursów i walidacją numeru"),
    (("album", "muzycz"), "odczyt i prezentacja albumów muzycznych z liczbą pobrań"),
    (("palety rgb", "kolorów z palety rgb"), "wybór koloru z palety RGB za pomocą suwaków i podglądu zapisanej barwy"),
    (("loterii liczbowej", "sześciu liczb", "<1, 49>"), "loteria liczbowa z losowaniem sześciu wartości i liczeniem trafień"),
    (("urządzeń domowych", "pralkę", "odkurzacz"), "model urządzeń domowych z obsługą pralki i odkurzacza"),
    (("quizu", "pytaniezamkniete", "pytanie"), "quiz z pytaniami zamkniętymi i sprawdzaniem odpowiedzi"),
    (("gór", "quiz"), "quiz o górach"),
    (("wartownik",), "wyszukiwanie wartości w tablicy z wartownikiem"),
    (("tablica oraz operacje", "operacje na tablicach"), "klasa tablicy z wyświetlaniem, wyszukiwaniem i sortowaniem"),
    (("tablic", "sort"), "wypełnianie tablicy pseudolosowymi liczbami i sortowanie"),
    (("rejestruj konto", "e-mail", "hasło"), "formularz rejestracji konta z walidacją e-maila i hasła"),
    (("notat",), "klasa notatki z identyfikatorem, licznikiem i metodami wyświetlania"),
    (("książ", "ksiaz"), "katalog książek"),
    (("film",), "katalog filmów z danymi wczytywanymi z pliku"),
    (("samoch",), "obsługa danych samochodów"),
    (("pracownik",), "obsługa danych pracowników"),
    (("paszport", "kolor oczu", "odcisk"), "wprowadzanie danych paszportowych z kolorem oczu i odciskiem palca"),
    (("restaur", "kelner", "stolik"), "obsługa zamówień w restauracji"),
    (("pogod",), "prezentacja danych pogodowych"),
    (("walut",), "przeliczanie walut"),
    (("bmi",), "kalkulator BMI"),
]


TYPE_SUMMARY_PREFIXES = {
    "console": "Aplikacja konsolowa",
    "desktop": "Aplikacja desktopowa",
    "mobile": "Aplikacja mobilna",
    "web": "Aplikacja webowa",
    "application": "Aplikacja",
}


def documentation_description(text: str) -> str:
    target = "komentarz dokumentacyjny w kodzie"
    if "metody sortującej i szukającej" in text:
        target = "nagłówek metod sortującej i wyszukującej"
    elif "funkcji przeszukującej" in text:
        target = "nagłówek funkcji przeszukującej"
    elif "funkcji wyznaczającej nwd" in text:
        target = "nagłówek funkcji wyznaczającej NWD"
    elif "funkcji wypełniającej tablicę" in text:
        target = "nagłówek funkcji wypełniającej tablicę"
    elif "metody klasy bazowej" in text:
        target = "nagłówek metody klasy bazowej"
    elif "dowolnej metody" in text or "wybranej funkcji" in text:
        target = "nagłówek wybranej funkcji lub metody"
    elif "dowolnej funkcji" in text or "funkcji/metody" in text or "funkcji / metody" in text:
        target = "nagłówek dowolnej funkcji lub metody"
    elif "komentarz do klasy" in text or "nagłówek klasy" in text:
        target = "nagłówek klasy"

    requirements = ["zrzuty uruchomienia aplikacji"]
    if "egzamin" in text:
        requirements.append("plik egzamin z opisem narzędzi")
    if "git" in text:
        requirements.append("zrzuty poleceń Git")

    return f"Dokumentacja: {target}, {', '.join(requirements)}."


def testing_description(task_type: str, text: str, topic: str) -> str:
    if task_type == "unit-testing":
        if "szyfr cezara" in text:
            return "Testy jednostkowe: przypadki szyfru Cezara dla przesunięć, zawijania i znaków spoza alfabetu."
        if "rzut kością" in text or "rzut koscia" in text:
            return "Testy jednostkowe: zakres wyniku rzutu kością i brak zmiany wartości niedostępnej kości."
        return f"Testy jednostkowe: sprawdzenie kluczowych przypadków dla: {topic}."

    if "pytaniezamkniete" in text or "pytanie zamknięte" in text:
        return "Testowanie: klasy Pytanie i PytanieZamkniete, sprawdzenie odpowiedzi, zrzuty aplikacji mobilnej i Git."
    if "funkcji sortującej" in text:
        return "Testowanie: kod testu funkcji sortującej na liczbach pseudolosowych i zrzut uruchomienia."
    if "klasy poprzez" in text and "konstruktora" in text:
        return "Testowanie: konstruktory klasy Osoba, licznik instancji i metoda wypisująca imię, ze zrzutami i dokumentacją."
    return f"Testowanie: scenariusze działania aplikacji dla: {topic}, zrzuty ekranów i dokumentacja."


def topic_description(part: int, task_type: str, text: str) -> str:
    lower = re.sub(r"\s+", " ", text).lower()

    if task_type == "documentation":
        return documentation_description(lower)

    topic = ""
    for needles, label in TOPIC_RULES:
        if any(needle in lower for needle in needles):
            topic = label
            break

    if task_type in {"testing", "unit-testing"}:
        return testing_description(task_type, lower, topic or "zadanie z części I")
    if topic:
        prefix = TYPE_SUMMARY_PREFIXES.get(task_type)
        if prefix:
            return sentence_case(f"{prefix}: {topic}.")
        return sentence_case(f"{topic}.")
    return f"Główny moduł aplikacji z części {part}."


def sentence_case(text: str) -> str:
    return f"{text[:1].upper()}{text[1:]}" if text else text


def classify_part(part: int, heading_line: str, text: str) -> tuple[str, str, list[str]]:
    lower = f"{heading_line} {text[:1800]}".lower()
    if part == 1:
        return ("console", "Aplikacja konsolowa", ["console", "cli"])

    if part == 2:
        if "mobiln" in lower:
            return ("mobile", "Aplikacja mobilna", ["mobile"])
        if "desktop" in lower:
            return ("desktop", "Aplikacja desktopowa", ["desktop"])
        if "web" in lower or "internetow" in lower:
            tags = ["web"]
            if "front-end" in lower or "frontend" in lower or "react" in lower or "angular" in lower:
                tags.append("frontend")
            if "php" in lower or "baza danych" in lower or "backend" in lower or "serwer" in lower:
                tags.append("backend")
            return ("web", "Aplikacja webowa", tags)
        return ("application", "Aplikacja", ["application"])

    if "jednostkow" in lower:
        return ("unit-testing", "Testy jednostkowe", ["unit-tests", "testing"])
    if "test" in lower:
        return ("testing", "Testowanie", ["testing"])
    return ("documentation", "Dokumentacja", ["documentation"])


def heading_line(text: str) -> str:
    for line in text.splitlines():
        if line.strip():
            return line.strip()
    return ""


def find_headings(pages: list[str]) -> tuple[str, list[HeadingHit]]:
    joined_parts: list[str] = []
    page_offsets: list[tuple[int, int]] = []
    offset = 0
    for index, page_text in enumerate(pages, start=1):
        page_offsets.append((index, offset))
        joined_parts.append(page_text)
        offset += len(page_text) + 1
    full_text = "\n".join(joined_parts)

    hits: list[HeadingHit] = []
    for part_id, label, pattern in HEADINGS:
        match = pattern.search(full_text)
        if not match:
            continue
        page = 1
        page_start = 0
        for page_number, page_offset in page_offsets:
            if page_offset <= match.start():
                page = page_number
                page_start = page_offset
            else:
                break
        hits.append(HeadingHit(part_id, label, page, page_start, match.start(), match.end()))

    hits.sort(key=lambda item: item.start)
    return full_text, hits


def has_task_content_before_heading(page_prefix: str) -> bool:
    page_prefix = re.sub(r"\bStrona\s+\d+\s+z\s+\d+\b", " ", page_prefix, flags=re.IGNORECASE)
    page_prefix = re.sub(r"\bINF\.?04[-_\s\d.a-z]*\b", " ", page_prefix, flags=re.IGNORECASE)
    page_prefix = re.sub(r"\s+", " ", page_prefix).strip()
    return len(page_prefix) >= 40 and bool(
        re.search(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]", page_prefix)
    )


def task_end_page(
    hit: HeadingHit, next_hit: HeadingHit | None, page_count: int, full_text: str
) -> int:
    if not next_hit:
        return page_count

    end_page = next_hit.page
    if next_hit.page > hit.page:
        page_prefix = full_text[next_hit.page_start:next_hit.start]
        if not has_task_content_before_heading(page_prefix):
            end_page = next_hit.page - 1

    return max(hit.page, min(end_page, page_count))


def split_pdf(source_pdf: Path, destination_pdf: Path, start_page: int, end_page: int) -> None:
    reader = PdfReader(str(source_pdf))
    writer = PdfWriter()
    for page_number in range(start_page, end_page + 1):
        writer.add_page(reader.pages[page_number - 1])
    destination_pdf.parent.mkdir(parents=True, exist_ok=True)
    with destination_pdf.open("wb") as output:
        writer.write(output)


def match_solution_folder(repo_root: Path, year: int, month: str, number: str, variant: str) -> str | None:
    short_year = str(year)[2:]
    relative = Path(f"INF.04-{short_year}.{month}") / f"INF.04-{number}-{short_year}.{month}-{variant}"
    absolute = repo_root / relative
    if absolute.exists():
        return relative.as_posix()
    return None


def parse_exam(repo_root: Path, pdf_path: Path, public_root: Path) -> dict[str, Any] | None:
    match = EXAM_RE.match(pdf_path.name)
    if not match:
        return None

    year = int(match.group("year"))
    month = match.group("month")
    number = match.group("number")
    variant = match.group("variant").upper()
    session = f"{year}-{month}"
    exam_id = f"inf04-{year}-{month}-{number}-{variant.lower()}"
    code = f"INF.04-{number}-{str(year)[2:]}.{month}-{variant}"

    reader = PdfReader(str(pdf_path))
    pages = [page.extract_text() or "" for page in reader.pages]
    full_text, hits = find_headings(pages)
    page_count = len(reader.pages)

    if len(hits) < 3:
        print(f"Warning: expected 3 section headings in {pdf_path.name}, found {len(hits)}")

    exam_pdf_public = Path("pdfs") / "exams" / f"{exam_id}.pdf"
    target_exam_pdf = public_root / exam_pdf_public
    target_exam_pdf.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(pdf_path, target_exam_pdf)

    tasks: list[dict[str, Any]] = []
    for task_index, hit in enumerate(hits[:3], start=1):
        next_hit = hits[task_index] if task_index < len(hits) else None
        text_start = hit.start
        text_end = next_hit.start if next_hit else len(full_text)
        task_text = compact_text(full_text[text_start:text_end])
        title_line = heading_line(task_text)
        task_type, type_label, tags = classify_part(task_index, title_line, task_text)

        start_page = hit.page
        end_page = task_end_page(hit, next_hit, page_count, full_text)

        task_id = f"{exam_id}-task-{task_index}"
        task_pdf_public = Path("pdfs") / "tasks" / f"{task_id}.pdf"
        split_pdf(pdf_path, public_root / task_pdf_public, start_page, end_page)
        duplicate_hash = hashlib.sha1(normalize_hash_text(task_text).encode("utf-8")).hexdigest()[:12]

        tasks.append(
            {
                "id": task_id,
                "examId": exam_id,
                "part": task_index,
                "partLabel": hit.label,
                "title": type_label,
                "heading": title_line,
                "type": task_type,
                "typeLabel": type_label,
                "tags": tags,
                "pageStart": start_page,
                "pageEnd": end_page,
                "pdf": f"/{task_pdf_public.as_posix()}",
                "text": task_text,
                "summary": topic_description(task_index, task_type, task_text),
                "duplicateGroup": duplicate_hash,
            }
        )

    solution_folder = match_solution_folder(repo_root, year, month, number, variant)
    related_assets = sorted(
        item.name
        for item in (pdf_path.parent).iterdir()
        if item.is_file() and item.suffix.lower() in {".zip", ".7z"}
    )

    return {
        "id": exam_id,
        "code": code,
        "year": year,
        "month": month,
        "session": session,
        "number": number,
        "variant": variant,
        "pdf": f"/{exam_pdf_public.as_posix()}",
        "sourcePath": pdf_path.relative_to(repo_root).as_posix(),
        "solutionFolder": solution_folder,
        "pageCount": page_count,
        "tasks": [task["id"] for task in tasks],
        "taskRecords": tasks,
        "assetFiles": related_assets,
    }


def build_catalog(repo_root: Path, public_root: Path) -> dict[str, Any]:
    arkusze = repo_root / "_arkusze"
    pdfs = [
        pdf
        for pdf in arkusze.rglob("*.pdf")
        if "_zo" not in pdf.name.lower() and EXAM_RE.match(pdf.name)
    ]
    exams: list[dict[str, Any]] = []
    tasks: list[dict[str, Any]] = []

    for pdf in sorted(pdfs):
        exam = parse_exam(repo_root, pdf, public_root)
        if not exam:
            continue
        tasks.extend(exam.pop("taskRecords"))
        exams.append(exam)

    duplicates: dict[str, list[str]] = {}
    for task in tasks:
        duplicates.setdefault(task["duplicateGroup"], []).append(task["id"])
    for task in tasks:
        task["duplicates"] = [
            task_id for task_id in duplicates.get(task["duplicateGroup"], []) if task_id != task["id"]
        ]

    task_types = sorted({task["type"] for task in tasks})
    years = sorted({exam["year"] for exam in exams}, reverse=True)

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceRepository": "https://github.com/Technikum-TEB-Edukacja-we-Wroclawiu/INF.04-rozwiazania",
        "sourceFolder": "_arkusze",
        "examCount": len(exams),
        "taskCount": len(tasks),
        "years": years,
        "taskTypes": task_types,
        "exams": sorted(exams, key=lambda exam: (exam["year"], exam["month"], exam["number"], exam["variant"]), reverse=True),
        "tasks": sorted(tasks, key=lambda task: (task["examId"], task["part"]), reverse=True),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path, help="Path to INF.04-rozwiazania repo")
    parser.add_argument("--public", default=Path("public"), type=Path, help="Vite public directory")
    args = parser.parse_args()

    source = args.source.resolve()
    public = args.public.resolve()
    data_dir = public / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    catalog = build_catalog(source, public)
    with (data_dir / "catalog.json").open("w", encoding="utf-8") as output:
        json.dump(catalog, output, ensure_ascii=False, indent=2)
    print(f"Generated {catalog['examCount']} exams and {catalog['taskCount']} tasks")


if __name__ == "__main__":
    main()
