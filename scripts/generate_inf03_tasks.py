from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter


EXAM_RE = re.compile(r"^inf03-(\d{4})-(\d{2})-(\d{2})-([a-z]{2})\.pdf$", re.IGNORECASE)

SECTION_PATTERNS = [
    ("database", re.compile(r"^(Operacje na bazie danych|Baza danych):?$")),
    ("graphics", re.compile(r"^Grafika:?$")),
    ("animation", re.compile(r"^Animacja:?$")),
    ("website", re.compile(r"^Witryna [Ii]nternetowa:?$")),
    ("css", re.compile(r"^Styl CSS witryny internetowej:?$")),
    ("script", re.compile(r"^Skrypty?( połączenia z bazą( danych)?)?:?$")),
]

GRAPHICS_BLOCK_RE = re.compile(r"^(Przygotowanie grafiki:?|Cechy grafiki\b[^:\n]*:)", re.MULTILINE)
WEBSITE_CONTENT_RE = re.compile(r"^(Cechy wspólne dla stron:|Cechy witryny:|Wymagania dotyczące witryny:)", re.MULTILINE)
TRAILING_RE = re.compile(r"^(UWAGA: po zakończeniu pracy|UWAGA: katalog z rezultatami|Czas przeznaczony na wykonanie zadania)", re.MULTILINE)

VECTOR_KEYWORDS = ["wektorow", "inkscape"]
RASTER_KEYWORDS = [
    "rastrow",
    "gimp",
    "przeskalow",
    "pikselizacj",
    "odcieniami szarosci",
    "odcieniach szarosci",
    "animacj",
    "przezroczyst",
    "rozmyci",
    "sepia",
]
JS_KEYWORDS = ["javascript", "po stronie klienta", "po stronie przegladarki"]
PHP_KEYWORDS = ["mysqli_", "jezyku php", "polaczenia z baza", "serwerem bazodanowym"]


@dataclass
class Section:
    kind: str
    heading: str
    start: int
    end: int


@dataclass
class GraphicsBlock:
    start: int
    end: int


def normalize_for_search(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).lower().replace("ł", "l")
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def normalize_hash_text(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).lower()
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("ł", "l")
    text = re.sub(r"strona\s+\d+\s+z\s+\d+", " ", text)
    text = re.sub(r"inf\.?03[-_\s\d.a-z]+", " ", text)
    text = re.sub(r"\d{4}", " ", text)
    text = re.sub(r"\b\d{1,3}\s*(px|%)\b", " ", text)
    text = re.sub(r"#[0-9a-f]{3,6}\b", " ", text)
    text = re.sub(r"[^0-9a-z]+", "", text)
    return text


def compact_text(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def contains_keyword(text: str, keywords: list[str]) -> bool:
    lowered = normalize_for_search(text)
    return any(keyword in lowered for keyword in keywords)


def find_sections(pages: list[str]) -> list[Section]:
    base_offset = 0
    sections: list[Section] = []

    for page_text in pages:
        line_offset = 0
        for line in page_text.splitlines():
            stripped = line.strip()
            for kind, pattern in SECTION_PATTERNS:
                if pattern.match(stripped):
                    start = base_offset + line_offset + (len(line) - len(line.lstrip()))
                    sections.append(Section(kind, stripped.rstrip(":").rstrip(), start, start + len(stripped)))
                    break
            line_offset += len(line) + 1
        base_offset += len(page_text) + 1

    sections.sort(key=lambda item: item.start)

    # Merge adjacent graphics + animation sections into a single graphics section.
    normalized: list[Section] = []
    for section in sections:
        if (
            normalized
            and section.kind == "animation"
            and normalized[-1].kind == "graphics"
            and not any(item.kind not in {"graphics", "animation"} for item in sections if section.end > item.start > normalized[-1].end)
        ):
            normalized[-1] = Section("graphics", normalized[-1].heading, normalized[-1].start, section.end)
            continue
        normalized.append(section)

    return normalized


def find_graphics_block(pages: list[str], website_section: Section | None) -> GraphicsBlock | None:
    """Locate a 'Przygotowanie grafiki:' block embedded inside the website section."""
    full_text = "\n".join(pages)
    search_from = website_section.end if website_section else 0
    match = GRAPHICS_BLOCK_RE.search(full_text, search_from)
    if not match:
        return None

    end_match = WEBSITE_CONTENT_RE.search(full_text, match.end())
    end = end_match.start() if end_match else min(match.end() + 1200, len(full_text))
    return GraphicsBlock(match.start(), end)


def page_offset_map(pages: list[str]) -> list[tuple[int, int]]:
    offsets: list[tuple[int, int]] = []
    offset = 0
    for index, page_text in enumerate(pages, start=1):
        offsets.append((index, offset))
        offset += len(page_text) + 1
    return offsets


def page_for_offset(offsets: list[tuple[int, int]], position: int) -> int:
    page = 1
    for index, start in offsets:
        if start <= position:
            page = index
        else:
            break
    return page


def has_task_content_before(page_prefix: str) -> bool:
    prefix = re.sub(r"\bStrona\s+\d+\s+z\s+\d+\b", " ", page_prefix, flags=re.IGNORECASE)
    prefix = re.sub(r"\s+", " ", prefix).strip()
    return len(prefix) >= 40 and bool(re.search(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]", prefix))


def split_pdf(source_pdf: Path, destination_pdf: Path, start_page: int, end_page: int) -> None:
    reader = PdfReader(str(source_pdf))
    writer = PdfWriter()
    for page_number in range(max(1, start_page), min(end_page, len(reader.pages)) + 1):
        writer.add_page(reader.pages[page_number - 1])
    destination_pdf.parent.mkdir(parents=True, exist_ok=True)
    with destination_pdf.open("wb") as output:
        writer.write(output)


def classify_database(text: str) -> tuple[str, str, list[str], str]:
    match = re.search(r"baz[ęe] danych o nazwie\s+([a-z0-9_]+)", text, flags=re.IGNORECASE)
    name = match.group(1) if match else ""
    suffix = f" {name}" if name else ""
    summary = f"Operacje na bazie danych{suffix}: utworzenie bazy, import tabel i kwerendy SQL."
    return ("database", "Baza danych", ["sql", "mysql", "phpmyadmin"], summary)


def classify_graphics(text: str) -> tuple[str, str, list[str], str]:
    is_vector = contains_keyword(text, VECTOR_KEYWORDS)
    task_type = "graphics-vector" if is_vector else "graphics-raster"
    label = "Grafika wektorowa" if is_vector else "Grafika rastrowa"
    tags = ["inkscape", "grafika-wektorowa"] if is_vector else ["gimp", "grafika-rastrowa"]

    features = []
    if contains_keyword(text, ["logo"]):
        features.append("logo witryny")
    if contains_keyword(text, ["baner"]):
        features.append("banery")
    if contains_keyword(text, ["animacj"]):
        features.append("animacja GIF")
    if contains_keyword(text, ["przeskalow"]):
        features.append("przeskalowanie obrazów")
    if contains_keyword(text, ["filtr", "pikselizacj", "rozmyci", "sepia", "odcieni"]):
        features.append("filtry i efekty")
    if not features:
        features.append("obrazy witryny internetowej")
    summary = f"{label}: {', '.join(features)}."
    return (task_type, label, tags, summary)


def classify_script(text: str, heading: str) -> tuple[str, str, list[str], str]:
    lowered = normalize_for_search(text)
    js_pos = min((lowered.find(keyword) for keyword in JS_KEYWORDS if keyword in lowered), default=-1)
    php_pos = min((lowered.find(keyword) for keyword in PHP_KEYWORDS if keyword in lowered), default=-1)
    heading_php = "polaczenia z baza" in normalize_for_search(heading)

    if php_pos >= 0 and (js_pos < 0 or php_pos < js_pos or heading_php):
        db_match = re.search(r"baz[ęe] danych o nazwie\s+([a-z0-9_]+)", text, flags=re.IGNORECASE)
        name = db_match.group(1) if db_match else ""
        suffix = f" z bazą{name}" if name else " z bazą danych"
        return ("php", "PHP", ["php", "backend", "mysql"], f"Skrypt PHP połączenia{suffix} i wyświetlanie danych na stronie.")

    features = []
    if contains_keyword(text, ["formularz", "pole edycyjne", "pola edycyjnych"]):
        features.append("obsługa formularza")
    if contains_keyword(text, ["walidacj", "poprawne dane", "komunikat"]):
        features.append("walidacja danych")
    if contains_keyword(text, ["oblicz", "kalkulator", "powierzchni", "koszt"]):
        features.append("obliczenia")
    if contains_keyword(text, ["filtr", "transformacje", "sepia"]):
        features.append("filtry obrazów")
    if contains_keyword(text, ["losow"]):
        features.append("losowanie wartości")
    if not features:
        features.append("działanie po stronie przeglądarki")
    return ("js", "JavaScript", ["javascript", "frontend"], f"Skrypt JavaScript po stronie klienta: {', '.join(features)}.")


def build_tasks_for_exam(exam_id: str, source_pdf: Path, public_root: Path) -> tuple[list[dict[str, Any]], int]:
    reader = PdfReader(str(source_pdf))
    pages = [page.extract_text() or "" for page in reader.pages]
    page_count = len(reader.pages)
    full_text = "\n".join(pages)
    offsets = page_offset_map(pages)

    def page_at(position: int) -> int:
        return page_for_offset(offsets, position)

    sections = find_sections(pages)
    website_section = next((section for section in sections if section.kind == "website"), None)
    script_section = next((section for section in sections if section.kind == "script"), None)
    content_sections = [
        section
        for section in sections
        if section.kind in {"database", "graphics", "animation"}
    ]

    trailing_match = TRAILING_RE.search(full_text, script_section.start if script_section else 0)
    document_end = trailing_match.start() if trailing_match else len(full_text)

    tasks: list[dict[str, Any]] = []

    def add_task(
        start: int,
        end: int,
        raw_text: str,
        classification: tuple[str, str, list[str], str],
        part_label_override: str | None = None,
    ) -> None:
        part_number = len(tasks) + 1
        task_type, type_label, tags, summary = classification
        task_id = f"{exam_id}-task-{part_number}"
        heading_line = next((line.strip() for line in raw_text.splitlines() if line.strip()), "")
        duplicate_hash = hashlib.sha1(normalize_hash_text(raw_text).encode("utf-8")).hexdigest()[:12]

        task_pdf_public = Path("pdfs") / "tasks" / f"{task_id}.pdf"
        start_page = page_at(start)
        raw_end_page = page_at(max(start, end - 1))
        if raw_end_page > start_page:
            page_start_offset = dict(offsets)[raw_end_page]
            if not has_task_content_before(full_text[page_start_offset:end]):
                raw_end_page -= 1
        split_pdf(source_pdf, public_root / task_pdf_public, start_page, raw_end_page)

        tasks.append(
            {
                "id": task_id,
                "examId": exam_id,
                "part": part_number,
                "partLabel": part_label_override or type_label,
                "title": type_label,
                "heading": heading_line,
                "type": task_type,
                "typeLabel": type_label,
                "tags": tags,
                "pageStart": start_page,
                "pageEnd": max(start_page, raw_end_page),
                "pdf": f"/{task_pdf_public.as_posix()}",
                "text": compact_text(raw_text),
                "summary": summary,
                "duplicateGroup": duplicate_hash,
            }
        )

    for index, section in enumerate(content_sections):
        later_starts = [item.start for item in sections if item.start > section.end]
        boundary = min(later_starts) if later_starts else max(section.start + 1, document_end)

        text = full_text[section.start:boundary]
        if section.kind == "database":
            add_task(section.start, boundary, text, classify_database(text))
        else:
            add_task(section.start, boundary, text, classify_graphics(text))

    # 'Przygotowanie grafiki:' block embedded inside the website section.
    if website_section and not any(section.kind == "graphics" for section in sections):
        block = find_graphics_block(pages, website_section)
        if block:
            text = full_text[block.start:block.end]
            add_task(block.start, block.end, text, classify_graphics(text))

    if script_section:
        later_sections = [section.start for section in sections if section.start > script_section.end]
        script_end = min(later_sections) if later_sections else document_end
        script_end = min(script_end, document_end)

        merge_sources = [section for section in sections if section.kind in {"website", "css"} and section.start < script_section.start]
        merged_start = min((section.start for section in merge_sources), default=script_section.start)
        merged_text = full_text[merged_start:script_end]

        task_type, type_label, tags, summary = classify_script(
            full_text[script_section.start:script_end], script_section.heading
        )
        if merge_sources:
            summary = f"{summary} Zawiera również wymagania witryny internetowej i stylu CSS."
        add_task(merged_start, script_end, merged_text, (task_type, type_label, tags, summary))
    elif website_section:
        print(f"  Warning: {exam_id} has no script section")

    return tasks, page_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Categorise INF.03 exam sections into catalog tasks")
    parser.add_argument("--public", default=Path("public"), type=Path, help="Vite public directory")
    args = parser.parse_args()

    public_root = args.public.resolve()
    exams_dir = public_root / "pdfs" / "exams"
    catalog_path = public_root / "data" / "inf03" / "catalog.json"

    with catalog_path.open(encoding="utf-8") as input_file:
        catalog = json.load(input_file)

    all_tasks: list[dict[str, Any]] = []
    for exam in sorted(catalog["exams"], key=lambda item: item["id"]):
        source_name = Path(exam["pdf"]).name
        if not EXAM_RE.match(source_name):
            print(f"Skipping {exam['id']}: unrecognised pdf name {source_name}")
            continue

        source_pdf = exams_dir / source_name
        if not source_pdf.exists():
            print(f"Skipping {exam['id']}: missing pdf {source_name}")
            continue

        tasks, page_count = build_tasks_for_exam(exam["id"], source_pdf, public_root)
        exam["tasks"] = [task["id"] for task in tasks]
        exam["pageCount"] = page_count
        all_tasks.extend(tasks)
        kinds = ", ".join(task["type"] for task in tasks)
        print(f"{exam['id']}: {len(tasks)} tasks [{kinds}]")

    duplicates: dict[str, list[str]] = {}
    for task in all_tasks:
        duplicates.setdefault(task["duplicateGroup"], []).append(task["id"])
    for task in all_tasks:
        task["duplicates"] = [task_id for task_id in duplicates.get(task["duplicateGroup"], []) if task_id != task["id"]]

    catalog["generatedAt"] = datetime.now(timezone.utc).isoformat()
    catalog["taskCount"] = len(all_tasks)
    catalog["taskTypes"] = sorted({task["type"] for task in all_tasks})
    catalog["tasks"] = sorted(all_tasks, key=lambda task: (task["examId"], task["part"]), reverse=True)

    with catalog_path.open("w", encoding="utf-8") as output_file:
        json.dump(catalog, output_file, ensure_ascii=False, indent=2)

    print(f"\nGenerated {catalog['taskCount']} tasks across {len(catalog['exams'])} exams")
    print(f"Task types: {catalog['taskTypes']}")


if __name__ == "__main__":
    main()
