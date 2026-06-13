from __future__ import annotations

import json
import os
from pathlib import Path

from fpdf import FPDF
from openpyxl import load_workbook
from openpyxl.styles import Border, Side
from openpyxl.utils import get_column_letter


FONT_PATH = r"C:\Windows\Fonts\arial.ttf"
FONT_BOLD_PATH = r"C:\Windows\Fonts\arialbd.ttf"
FONT_ITALIC_PATH = r"C:\Windows\Fonts\ariali.ttf"
FONT_BI_PATH = r"C:\Windows\Fonts\arialbi.ttf"

# Standard indexed color palette (Excel 2010+)
INDEXED_COLORS = [
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

# Theme colors (Office) - approximate palette
THEME_COLORS = {
    0: (255, 255, 255),  # white/bg1
    1: (0, 0, 0),        # black/text1
    2: (227, 227, 227),  # bg2
    3: (89, 89, 89),     # text2
    4: (68, 114, 196),   # accent1
    5: (237, 125, 49),   # accent2
    6: (165, 165, 165),  # accent3
    7: (255, 192, 0),    # accent4
    8: (68, 114, 196),   # accent5
    9: (255, 255, 255),  # accent6
}


def resolve_cell_fill_rgb(cell) -> tuple[int, int, int] | None:
    """Get the resolved RGB background color of a cell."""
    if not cell.fill or not cell.fill.fgColor:
        return None
    fc = cell.fill.fgColor
    # PatternType check
    if cell.fill.patternType is None or cell.fill.patternType == "none":
        return None
    try:
        if fc.type == "rgb":
            val = str(fc.rgb)
            if val and len(val) >= 6:
                if val.upper().startswith("FF"):
                    val = val[2:]
                if len(val) >= 6:
                    return (int(val[0:2], 16), int(val[2:4], 16), int(val[4:6], 16))
        elif fc.type == "theme" and fc.theme is not None:
            tint = fc.tint if fc.tint else 0
            base = THEME_COLORS.get(int(fc.theme))
            if base:
                r, g, b = base
                if tint:
                    r = int(r + (255 - r) * tint) if tint > 0 else int(r + r * tint)
                    g = int(g + (255 - g) * tint) if tint > 0 else int(g + g * tint)
                    b = int(b + (255 - b) * tint) if tint > 0 else int(b + b * tint)
                return (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
        elif fc.type == "indexed" and fc.indexed is not None:
            idx = int(fc.indexed)
            if 0 <= idx < len(INDEXED_COLORS):
                return INDEXED_COLORS[idx]
        elif fc.type == "auto":
            return None
    except (ValueError, TypeError, AttributeError):
        pass
    return None


def resolve_cell_font_rgb(cell) -> tuple[int, int, int] | None:
    """Get the resolved RGB font color of a cell."""
    if not cell.font or not cell.font.color:
        return None
    fc = cell.font.color
    try:
        if fc.type == "rgb":
            val = str(fc.rgb)
            if val and len(val) >= 6:
                if val.upper().startswith("FF"):
                    val = val[2:]
                if len(val) >= 6:
                    return (int(val[0:2], 16), int(val[2:4], 16), int(val[4:6], 16))
        elif fc.type == "theme" and fc.theme is not None:
            base = THEME_COLORS.get(int(fc.theme))
            if base:
                tint = fc.tint if fc.tint else 0
                r, g, b = base
                if tint:
                    r = int(r + (255 - r) * tint) if tint > 0 else int(r + r * tint)
                    g = int(g + (255 - g) * tint) if tint > 0 else int(g + g * tint)
                    b = int(b + (255 - b) * tint) if tint > 0 else int(b + b * tint)
                return (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
        elif fc.type == "indexed" and fc.indexed is not None:
            idx = int(fc.indexed)
            if 0 <= idx < len(INDEXED_COLORS):
                return INDEXED_COLORS[idx]
        elif fc.type == "auto":
            return None
    except (ValueError, TypeError, AttributeError):
        pass
    return None


def luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def xlsx_to_pdf(xlsx_path: Path, pdf_path: Path) -> None:
    wb = load_workbook(xlsx_path, data_only=True)
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_font("ArialUni", "", FONT_PATH, uni=True)
    pdf.add_font("ArialUni", "B", FONT_BOLD_PATH, uni=True)
    pdf.add_font("ArialUni", "I", FONT_ITALIC_PATH, uni=True)
    pdf.add_font("ArialUni", "BI", FONT_BI_PATH, uni=True)

    # Map openpyxl horizontal alignment to fpdf align
    ALIGN_MAP = {
        "left": "L",
        "center": "C",
        "right": "R",
        "justify": "L",
    }

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=False))
        if not rows:
            continue

        # Build table with style info
        TableRow = list[dict]  # {value, bold, italic, fill_rgb, font_rgb, align, font_size}
        table: list[TableRow] = []

        # Detect merged cell ranges
        merged_ranges: dict[tuple[int, int], tuple[int, int, int, int]] = {}
        for mr in ws.merged_cells.ranges:
            for row_idx in range(mr.min_row, mr.max_row + 1):
                for col_idx in range(mr.min_col, mr.max_col + 1):
                    merged_ranges[(row_idx, col_idx)] = (mr.min_row, mr.min_col, mr.max_row, mr.max_col)

        for row_idx, row in enumerate(rows, start=1):
            row_data: TableRow = []
            for col_idx, cell in enumerate(row, start=1):
                val = cell.value
                if val is None:
                    cell_info = {"value": "", "bold": False, "italic": False, "fill_rgb": None, "font_rgb": None, "align": "L", "font_size": 7}
                else:
                    text = str(val).strip()

                    # Font style
                    bold = cell.font and cell.font.bold
                    italic = cell.font and cell.font.italic
                    font_size = cell.font.size if cell.font and cell.font.size else 10

                    # Fill color
                    fill_rgb = resolve_cell_fill_rgb(cell)

                    # Font color
                    font_rgb = resolve_cell_font_rgb(cell)

                    # Alignment
                    align = "L"
                    if cell.alignment and cell.alignment.horizontal:
                        align = ALIGN_MAP.get(cell.alignment.horizontal, "L")

                    # Check for merged cell - skip if not the top-left of merge
                    key = (row_idx, col_idx)
                    if key in merged_ranges:
                        min_row, min_col, max_row, max_col = merged_ranges[key]
                        if row_idx != min_row or col_idx != min_col:
                            cell_info = {"value": "", "bold": False, "italic": False, "fill_rgb": None, "font_rgb": None, "align": "L", "font_size": 7, "skip": True}
                            row_data.append(cell_info)
                            continue

                    cell_info = {
                        "value": text,
                        "bold": bool(bold),
                        "italic": bool(italic),
                        "fill_rgb": fill_rgb,
                        "font_rgb": font_rgb,
                        "align": align,
                        "font_size": font_size if font_size else 7,
                    }
                row_data.append(cell_info)
            table.append(row_data)

        # Determine actual max columns (skip empty trailing)
        meaningful_cols: set[int] = set()
        for row_data in table:
            for ci, c in enumerate(row_data):
                if c.get("skip"):
                    continue
                if c["value"] and c["value"].strip() and c["value"] != "#REF!":
                    meaningful_cols.add(ci)
        if not meaningful_cols:
            continue
        max_cols = max(meaningful_cols) + 1
        table = [row[:max_cols] for row in table]

        # Column widths
        page_width = 277
        col_widths: list[float] = []
        for ci in range(max_cols):
            max_len = 1
            for row_data in table:
                if ci < len(row_data):
                    max_len = max(max_len, len(row_data[ci]["value"]))
            w = max(14, min(75, max_len * 3.0 + 4))
            col_widths.append(w)
        total_w = sum(col_widths)
        if total_w > page_width - 10:
            scale = (page_width - 10) / total_w
            col_widths = [w * scale for w in col_widths]

        def style_to_font_style(bold: bool, italic: bool) -> str:
            if bold and italic:
                return "BI"
            if bold:
                return "B"
            if italic:
                return "I"
            return ""

        def draw_row(y_pos: float, row_data: TableRow, row_h: float, header: bool = False) -> None:
            x0 = pdf.l_margin
            for ci, cell_info in enumerate(row_data):
                if cell_info.get("skip"):
                    continue
                w = col_widths[ci]
                x = x0 + sum(col_widths[:ci])

                # Background fill
                fill = cell_info["fill_rgb"]
                if fill:
                    pdf.set_fill_color(*fill)
                    pdf.rect(x, y_pos, w, row_h, style="F")

                # Border
                pdf.set_draw_color(180, 180, 180)
                pdf.rect(x, y_pos, w, row_h, style="D")

                # Text
                text = cell_info["value"]
                if text:
                    bold = cell_info["bold"]
                    italic = cell_info["italic"]
                    fs = max(5.5, min(9, cell_info["font_size"] * 0.35))
                    font_st = style_to_font_style(bold, italic) or ""
                    pdf.set_font("ArialUni", font_st, fs)

                    # Font color
                    font_rgb = cell_info["font_rgb"]
                    if font_rgb:
                        pdf.set_text_color(*font_rgb)
                    else:
                        # Auto: black on light bg, white on dark bg
                        if fill:
                            lum = luminance(*fill)
                            pdf.set_text_color(0, 0, 0) if lum > 128 else pdf.set_text_color(255, 255, 255)
                        else:
                            pdf.set_text_color(0, 0, 0)

                    align = cell_info["align"]
                    pdf.set_xy(x + 0.5, y_pos + 0.3)
                    pdf.multi_cell(w - 1, 3.8, text, align=align)
                    pdf.set_text_color(0, 0, 0)

        # Page header
        pdf.add_page()
        pdf.set_font("ArialUni", "B", 13)
        title = f"Zasady oceniania - {sheet_name}" if len(wb.sheetnames) > 1 else "Zasady oceniania"
        pdf.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(2)

        # Detect header rows (first 1-2 rows tend to be bold + colored bg)
        header_count = 0
        for row_data in table:
            bold_count = sum(1 for c in row_data if c["value"] and c.get("bold"))
            if bold_count > max_cols // 2:
                header_count += 1
            else:
                break
        header_count = max(1, min(header_count, 2))

        # Render rows
        for ri, row_data in enumerate(table):
            # Calculate row height
            max_lines = 1
            for ci, cell_info in enumerate(row_data):
                if cell_info.get("skip") or not cell_info["value"]:
                    continue
                w = col_widths[ci] - 1
                if w > 0:
                    fs = max(5.5, min(9, cell_info["font_size"] * 0.35))
                    bold = cell_info["bold"]
                    italic = cell_info["italic"]
                    font_st = style_to_font_style(bold, italic) or ""
                    pdf.set_font("ArialUni", font_st, fs)
                    lines = pdf.multi_cell(w, 3.8, cell_info["value"], dry_run=True, output="LINES")
                    max_lines = max(max_lines, len(lines))
            row_h = max(5.5, max_lines * 3.5 + 2)

            if pdf.get_y() + row_h > pdf.h - 18:
                pdf.add_page()

            y = pdf.get_y()
            draw_row(y, row_data, row_h, header=ri < header_count)
            pdf.set_xy(pdf.l_margin, y + row_h)

    pdf.output(str(pdf_path))
    print(f"  OK -> {pdf_path.name}")


def main() -> None:
    temp_dir = Path(os.environ.get("TEMP", "/tmp")) / "opencode" / "zo_xlsx"
    scoring_dir = Path(r"C:\Users\wikto\Documents\dev\exam-explorer\public\pdfs\scoring")
    catalog_path = Path(r"C:\Users\wikto\Documents\dev\exam-explorer\public\data\catalog.json")

    xlsx_files = sorted(temp_dir.glob("*.xlsx"))
    if not xlsx_files:
        print(f"No XLSX files found in {temp_dir}")
        return

    ag_to_sg = {
        "inf04-2023-01-01-ag": "inf04-2023-01-01-sg",
        "inf04-2023-01-02-ag": "inf04-2023-01-02-sg",
    }

    for xlsx_path in xlsx_files:
        exam_id = xlsx_path.stem
        pdf_name = f"{exam_id}-zo.pdf"
        pdf_path = scoring_dir / pdf_name
        print(f"Converting {exam_id}...")
        try:
            xlsx_to_pdf(xlsx_path, pdf_path)
        except Exception as e:
            print(f"  ERROR: {e}")

    for ag_id, sg_id in ag_to_sg.items():
        sg_pdf = scoring_dir / f"{sg_id}-zo.pdf"
        if sg_pdf.exists():
            ag_pdf = scoring_dir / f"{ag_id}-zo.pdf"
            if not ag_pdf.exists():
                import shutil
                shutil.copy2(sg_pdf, ag_pdf)
                print(f"  Copied {sg_id}-zo.pdf -> {ag_id}-zo.pdf")

    with open(catalog_path, encoding="utf-8") as f:
        catalog = json.load(f)

    for exam in catalog["exams"]:
        eid = exam["id"]
        mapped_id = ag_to_sg.get(eid, eid)
        pdf_path = scoring_dir / f"{mapped_id}-zo.pdf"
        if pdf_path.exists():
            exam["scoringPdf"] = f"/pdfs/scoring/{mapped_id}-zo.pdf"

    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print("Updated catalog.json")


if __name__ == "__main__":
    main()
