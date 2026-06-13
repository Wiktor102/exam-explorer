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

try:
    from openpyxl import load_workbook
    from fpdf import FPDF

    XLSX_SUPPORT = True
except ImportError:
    XLSX_SUPPORT = False


EXAM_RE = re.compile(
    r"inf_04_(?P<year>\d{4})_(?P<month>\d{2})_(?P<number>\d{2})_(?P<variant>[A-Z]{2})(?:_kolor)?\.pdf$",
    re.IGNORECASE,
)

ZO_RE = re.compile(
    r"inf_04_(?P<year>\d{4})_(?P<month>\d{2})_(?P<number>\d{2})_(?P<variant>[A-Z]{2})_zo\.pdf$",
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


def xlsx_to_pdf(xlsx_path: Path, pdf_path: Path) -> None:
    if not XLSX_SUPPORT:
        print(f"  Warning: install openpyxl and fpdf2 to convert {xlsx_path.name}")
        return

    # Import style helpers
    # indexed color palette
    _INDEXED_COLORS = [
        (0, 0, 0), (255, 255, 255), (255, 0, 0), (0, 255, 0), (0, 0, 255),
        (255, 255, 0), (255, 0, 255), (0, 255, 255), (128, 0, 0), (0, 128, 0),
        (0, 0, 128), (128, 128, 0), (128, 0, 128), (0, 128, 128), (192, 192, 192),
        (128, 128, 128), (153, 153, 255), (153, 51, 102), (255, 255, 204), (204, 255, 255),
        (102, 0, 102), (255, 128, 128), (0, 102, 204), (204, 204, 255), (0, 0, 128),
        (255, 0, 255), (255, 255, 0), (0, 255, 255), (128, 0, 128), (128, 0, 0),
        (0, 128, 128), (0, 0, 255), (0, 204, 255), (204, 255, 255), (204, 255, 204),
        (255, 255, 153), (153, 204, 255), (255, 153, 204), (204, 153, 255), (255, 204, 153),
        (51, 51, 153), (153, 51, 51), (51, 153, 51), (51, 51, 51), (0, 0, 0),
    ]
    _THEME_COLORS = {
        0: (255, 255, 255), 1: (0, 0, 0), 2: (227, 227, 227), 3: (89, 89, 89),
        4: (68, 114, 196), 5: (237, 125, 49), 6: (165, 165, 165), 7: (255, 192, 0),
        8: (68, 114, 196), 9: (255, 255, 255),
    }

    def _resolve_fill(cell):
        if not cell.fill or not cell.fill.fgColor:
            return None
        fc = cell.fill.fgColor
        if cell.fill.patternType is None or cell.fill.patternType == "none":
            return None
        try:
            if fc.type == "rgb":
                v = str(fc.rgb)
                if v and len(v) >= 6:
                    if v.upper().startswith("FF"): v = v[2:]
                    if len(v) >= 6: return (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16))
            elif fc.type == "theme" and fc.theme is not None:
                base = _THEME_COLORS.get(int(fc.theme))
                if base:
                    t = fc.tint or 0
                    r, g, b = base
                    if t:
                        r = int(r + (255 - r) * t) if t > 0 else int(r + r * t)
                        g = int(g + (255 - g) * t) if t > 0 else int(g + g * t)
                        b = int(b + (255 - b) * t) if t > 0 else int(b + b * t)
                    return (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
            elif fc.type == "indexed" and fc.indexed is not None:
                i = int(fc.indexed)
                if 0 <= i < len(_INDEXED_COLORS): return _INDEXED_COLORS[i]
        except (ValueError, TypeError, AttributeError):
            pass
        return None

    def _resolve_font_color(cell):
        if not cell.font or not cell.font.color:
            return None
        fc = cell.font.color
        try:
            if fc.type == "rgb":
                v = str(fc.rgb)
                if v and len(v) >= 6:
                    if v.upper().startswith("FF"): v = v[2:]
                    if len(v) >= 6: return (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16))
            elif fc.type == "theme" and fc.theme is not None:
                base = _THEME_COLORS.get(int(fc.theme))
                if base:
                    t = fc.tint or 0
                    r, g, b = base
                    if t:
                        r = int(r + (255 - r) * t) if t > 0 else int(r + r * t)
                        g = int(g + (255 - g) * t) if t > 0 else int(g + g * t)
                        b = int(b + (255 - b) * t) if t > 0 else int(b + b * t)
                    return (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
            elif fc.type == "indexed" and fc.indexed is not None:
                i = int(fc.indexed)
                if 0 <= i < len(_INDEXED_COLORS): return _INDEXED_COLORS[i]
        except (ValueError, TypeError, AttributeError):
            pass
        return None

    def _col_letter(index: int) -> str:
        letter = ""
        while index >= 0:
            letter = chr(index % 26 + 65) + letter
            index = index // 26 - 1
        return letter

    def _style_key(bold, italic):
        if bold and italic: return "BI"
        if bold: return "B"
        if italic: return "I"
        return ""

    wb = load_workbook(xlsx_path, data_only=True)
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_font("ArialUni", "", r"C:\Windows\Fonts\arial.ttf", uni=True)
    pdf.add_font("ArialUni", "B", r"C:\Windows\Fonts\arialbd.ttf", uni=True)
    pdf.add_font("ArialUni", "I", r"C:\Windows\Fonts\ariali.ttf", uni=True)
    pdf.add_font("ArialUni", "BI", r"C:\Windows\Fonts\arialbi.ttf", uni=True)

    ALIGN_MAP = {"left": "L", "center": "C", "right": "R", "justify": "L"}

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows_data = list(ws.iter_rows(values_only=False))
        if not rows_data:
            continue

        # Build styled table
        TableRow = list[dict]
        table: list[TableRow] = []

        # Detect merged ranges
        merged_ranges: dict[tuple[int, int], tuple[int, int, int, int]] = {}
        for mr in ws.merged_cells.ranges:
            for ri in range(mr.min_row, mr.max_row + 1):
                for ci in range(mr.min_col, mr.max_col + 1):
                    merged_ranges[(ri, ci)] = (mr.min_row, mr.min_col, mr.max_row, mr.max_col)

        for ri, row in enumerate(rows_data, start=1):
            row_data: TableRow = []
            for ci, cell in enumerate(row, start=1):
                key = (ri, ci)
                skip = key in merged_ranges and (ri != merged_ranges[key][0] or ci != merged_ranges[key][1])
                val = cell.value
                if val is None:
                    row_data.append({"v": "", "b": False, "i": False, "bg": None, "fg": None, "al": "L", "sz": 7, "skip": skip})
                else:
                    text = str(val).strip()
                    row_data.append({
                        "v": text,
                        "b": bool(cell.font and cell.font.bold),
                        "i": bool(cell.font and cell.font.italic),
                        "bg": _resolve_fill(cell),
                        "fg": _resolve_font_color(cell),
                        "al": ALIGN_MAP.get(cell.alignment.horizontal if cell.alignment else None, "L"),
                        "sz": cell.font.size if cell.font and cell.font.size else 10,
                        "skip": skip,
                    })
            table.append(row_data)

        # Detect meaningful columns
        meaningful: set[int] = set()
        for row_data in table:
            for ci, c in enumerate(row_data):
                if c.get("skip"): continue
                if c["v"] and c["v"].strip() and c["v"] != "#REF!":
                    meaningful.add(ci)
        if not meaningful:
            continue
        max_cols = max(meaningful) + 1
        table = [row[:max_cols] for row in table]

        # Column widths
        page_width = 277
        col_widths = [
            max(14, min(75, max(len(row[ci]["v"]) for row in table) * 3.0 + 4))
            for ci in range(max_cols)
        ]
        total_w = sum(col_widths)
        if total_w > page_width - 10:
            scale = (page_width - 10) / total_w
            col_widths = [w * scale for w in col_widths]

        def draw_row(y, row_data, row_h):
            x0 = pdf.l_margin
            for ci, c in enumerate(row_data):
                if c.get("skip"): continue
                w = col_widths[ci]
                x = x0 + sum(col_widths[:ci])
                if c["bg"]:
                    pdf.set_fill_color(*c["bg"])
                    pdf.rect(x, y, w, row_h, style="F")
                pdf.set_draw_color(180, 180, 180)
                pdf.rect(x, y, w, row_h, style="D")
                if c["v"]:
                    fs = max(5.5, min(9, c["sz"] * 0.35))
                    sk = _style_key(c["b"], c["i"])
                    pdf.set_font("ArialUni", sk, fs)
                    if c["fg"]:
                        pdf.set_text_color(*c["fg"])
                    else:
                        pdf.set_text_color(0, 0, 0) if not c["bg"] or sum(c["bg"]) > 384 else pdf.set_text_color(255, 255, 255)
                    pdf.set_xy(x + 0.5, y + 0.3)
                    pdf.multi_cell(w - 1, 3.8, c["v"], align=c["al"])
                    pdf.set_text_color(0, 0, 0)

        pdf.add_page()
        pdf.set_font("ArialUni", "B", 13)
        title = f"Zasady oceniania - {sheet_name}" if len(wb.sheetnames) > 1 else "Zasady oceniania"
        pdf.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(2)

        for row_data in table:
            max_lines = 1
            for c in row_data:
                if c.get("skip") or not c["v"]: continue
                w = col_widths[ci_for := row_data.index(c)] - 1 if False else col_widths[min(len(col_widths) - 1, row_data.index(c))]
                # Find column index
                ci = next(i for i, cc in enumerate(row_data) if cc is c)
                w = col_widths[ci] - 1
                if w > 0:
                    fs = max(5.5, min(9, c["sz"] * 0.35))
                    sk = _style_key(c["b"], c["i"])
                    pdf.set_font("ArialUni", sk, fs)
                    lines = pdf.multi_cell(w, 3.8, c["v"], dry_run=True, output="LINES")
                    max_lines = max(max_lines, len(lines))
            row_h = max(5.5, max_lines * 3.5 + 2)

            if pdf.get_y() + row_h > pdf.h - 18:
                pdf.add_page()

            y = pdf.get_y()
            draw_row(y, row_data, row_h)
            pdf.set_xy(pdf.l_margin, y + row_h)

    pdf.output(str(pdf_path))


def zo_exam_id(pdf_path: Path) -> str | None:
    match = ZO_RE.match(pdf_path.name)
    if not match:
        return None
    year = match.group("year")
    month = match.group("month")
    number = match.group("number")
    variant = match.group("variant").lower()
    return f"inf04-{year}-{month}-{number}-{variant}"


def parse_exam(repo_root: Path, pdf_path: Path, public_root: Path, zo_map: dict[str, Path] | None = None) -> dict[str, Any] | None:
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
    scoring_pdf_path = None
    if zo_map:
        zo_source = zo_map.get(exam_id)
        if zo_source:
            scoring_pdf_public = Path("pdfs") / "scoring" / f"{exam_id}-zo.pdf"
            target_scoring_pdf = public_root / scoring_pdf_public
            target_scoring_pdf.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(zo_source, target_scoring_pdf)
            scoring_pdf_path = f"/{scoring_pdf_public.as_posix()}"

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
        "scoringPdf": scoring_pdf_path,
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
    zo_pdfs = [
        pdf
        for pdf in arkusze.rglob("*_zo.pdf")
        if ZO_RE.match(pdf.name)
    ]
    zo_map: dict[str, Path] = {}
    for zo_pdf in zo_pdfs:
        eid = zo_exam_id(zo_pdf)
        if eid:
            zo_map[eid] = zo_pdf

    # Handle XLSX ZO files: convert to PDF and add to zo_map
    ag_sg_map = {
        "inf04-2023-01-01-ag": "inf04-2023-01-01-sg",
        "inf04-2023-01-02-ag": "inf04-2023-01-02-sg",
    }
    for xlsx_path in sorted(arkusze.rglob("*_zo.xlsx")):
        source_name = xlsx_path.name
        # Try to match exam ID from filename (strip _zo suffix)
        zo_name = re.sub(r"_zo(?:_punktacja)?\b", "_zo", source_name, flags=re.IGNORECASE)
        zo_path = xlsx_path.parent / zo_name
        match = ZO_RE.match(zo_name)
        if not match:
            # Try building exam id from the source name pattern
            base = re.sub(r"(?:_zo)?(?:_punktacja)?\.xlsx$", "", source_name, flags=re.IGNORECASE)
            continue
        eid = zo_exam_id(zo_name if ZO_RE.match(zo_name) else Path(source_name))
        if not eid:
            # Fallback: try matching against known exam IDs
            for exam_id in zo_map:
                if exam_id.replace("inf04-", "").replace("-", "").upper() in source_name.upper():
                    eid = exam_id
                    break
        if eid:
            target_pdf = public_root / "pdfs" / "scoring" / f"{eid}-zo.pdf"
            target_pdf.parent.mkdir(parents=True, exist_ok=True)
            if not target_pdf.exists() or xlsx_path.stat().st_mtime > target_pdf.stat().st_mtime:
                try:
                    xlsx_to_pdf(xlsx_path, target_pdf)
                except Exception as exc:
                    print(f"  Failed to convert {xlsx_path.name}: {exc}")
            zo_map[eid] = target_pdf

    # Link AG exams that share SG scoring
    for ag_id, sg_id in ag_sg_map.items():
        if ag_id not in zo_map and sg_id in zo_map:
            zo_map[ag_id] = zo_map[sg_id]
            # Copy SG PDF to AG path so both have their own file
            ag_target = public_root / "pdfs" / "scoring" / f"{ag_id}-zo.pdf"
            if not ag_target.exists():
                shutil.copy2(zo_map[sg_id], ag_target)
            zo_map[ag_id] = ag_target

    exams: list[dict[str, Any]] = []
    tasks: list[dict[str, Any]] = []

    for pdf in sorted(pdfs):
        exam = parse_exam(repo_root, pdf, public_root, zo_map)
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
