from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen


SOURCE_PAGE = "https://zspwyrzysk.pl/ckziu/ti/sheets/inf.03/2"
API_URL = (
    "https://zspwyrzysk.pl/ti/api/v1/ckziu/ti/sheets/inf.03/2"
    "?page=1&limit=500"
)

# The source labels these downloads incorrectly. The files behind the URLs are
# distinct and match the archive names printed in their exam sheets.
NAME_OVERRIDES = {
    "inf.03-04-26.01-sg": "pliki3-2.7z",
    "inf.03-05-26.01-sg": "pliki7.7z",
    "inf.03-08-26.01-sg": "pliki13.7z",
}

# CKZiU currently serves the attachment for sheet 1 under sheet 2 as well.
# This mirror has the pliki2 archive required by the sheet 2 exam PDF.
RESOURCE_OVERRIDES = {
    "inf.03-02-26.06-sg": (
        "pliki2.7z",
        "https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/"
        "kursinf_main/exam_sheets/inf03/1788191876508_5h5d8m_files.7z",
    )
}


def fetch_source() -> dict:
    request = Request(API_URL, headers={"Accept": "application/json"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Synchronise public INF.03 attachment links"
    )
    parser.add_argument(
        "--public", default=Path("public"), type=Path, help="Vite public directory"
    )
    args = parser.parse_args()

    catalog_path = args.public.resolve() / "data" / "inf03" / "catalog.json"
    with catalog_path.open(encoding="utf-8") as input_file:
        catalog = json.load(input_file)

    source = fetch_source()
    resources: dict[str, tuple[str, str]] = {}
    for row in source.get("sheets", []):
        sheet = row.get("obj", {})
        code = sheet.get("sheet_name")
        name = sheet.get("attachment_name")
        path = sheet.get("attachment_url")
        if code and name and path:
            key = code.casefold()
            resources[key] = (
                NAME_OVERRIDES.get(key, name),
                urljoin(SOURCE_PAGE, path),
            )

    resources.update(RESOURCE_OVERRIDES)

    matched = 0
    catalog_codes = {exam["code"].casefold() for exam in catalog["exams"]}
    for exam in catalog["exams"]:
        resource = resources.get(exam["code"].casefold())
        if not resource:
            continue
        name, url = resource
        exam["assetFiles"] = [name]
        exam["assetUrls"] = {name: url}
        matched += 1

    unknown_codes = sorted(set(resources) - catalog_codes)
    if unknown_codes:
        print(
            "Skipped source exams absent from the catalog: " + ", ".join(unknown_codes)
        )

    catalog["sourceBranch"] = "master"
    with catalog_path.open("w", encoding="utf-8") as output_file:
        json.dump(catalog, output_file, ensure_ascii=False, indent=2)
        output_file.write("\n")

    print(
        f"Added public attachment links to {matched} exams from {SOURCE_PAGE}"
    )


if __name__ == "__main__":
    main()
