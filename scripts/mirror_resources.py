from __future__ import annotations

import argparse
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen


CATALOG_NAMES = ("inf03", "inf04")
DOWNLOAD_WORKERS = 8


def resource_file_name(exam: dict[str, Any], asset_file: str, index: int) -> str:
    extension = Path(asset_file).suffix.lower()
    sequence = f"-{index + 1}" if len(exam["assetFiles"]) > 1 else ""
    return f"{exam['code']}{sequence}{extension}"


def repository_file_url(
    repository: str, branch: str, source_path: str | None, asset_file: str
) -> str:
    source_directory = Path(source_path).parent.as_posix() if source_path else ""
    path = f"{source_directory}/{asset_file}" if source_directory else asset_file
    encoded_path = "/".join(quote(part, safe="") for part in path.split("/"))
    return f"{repository}/raw/{quote(branch, safe='')}/{encoded_path}"


def source_url(
    catalog: dict[str, Any], exam: dict[str, Any], asset_file: str
) -> str:
    direct_url = exam.get("assetUrls", {}).get(asset_file)
    if direct_url:
        return direct_url

    return repository_file_url(
        catalog["sourceRepository"],
        catalog.get("sourceBranch", "main"),
        exam.get("sourcePath"),
        asset_file,
    )


def download_resource(url: str, destination: Path) -> None:
    request = Request(url, headers={"User-Agent": "exam-explorer-resource-mirror/1.0"})
    temporary = destination.with_name(f".{destination.name}.part")
    destination.parent.mkdir(parents=True, exist_ok=True)

    try:
        with urlopen(request, timeout=120) as response, temporary.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        if temporary.stat().st_size == 0:
            raise RuntimeError(f"Downloaded an empty resource from {url}")
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def mirror_catalog(public_root: Path, catalog_name: str) -> tuple[int, int]:
    catalog_path = public_root / "data" / catalog_name / "catalog.json"
    with catalog_path.open(encoding="utf-8") as input_file:
        catalog = json.load(input_file)

    downloads: list[tuple[str, Path]] = []
    destinations: list[Path] = []
    names: set[str] = set()
    total_bytes = 0

    for exam in catalog["exams"]:
        mirrored_urls: dict[str, str] = {}
        for index, asset_file in enumerate(exam["assetFiles"]):
            file_name = resource_file_name(exam, asset_file, index)
            if file_name in names:
                raise RuntimeError(f"Duplicate mirrored resource name: {file_name}")
            names.add(file_name)

            destination = public_root / "resources" / catalog_name / file_name
            url = source_url(catalog, exam, asset_file)
            if url.startswith("/"):
                if not destination.exists():
                    raise RuntimeError(f"Missing previously mirrored resource: {url}")
            else:
                downloads.append((url, destination))
            destinations.append(destination)
            mirrored_urls[asset_file] = f"/resources/{catalog_name}/{quote(file_name)}"
        if mirrored_urls:
            exam["assetUrls"] = mirrored_urls

    with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as executor:
        futures = [
            executor.submit(download_resource, url, destination)
            for url, destination in downloads
        ]
        for future in futures:
            future.result()

    for destination in destinations:
        total_bytes += destination.stat().st_size

    with catalog_path.open("w", encoding="utf-8") as output_file:
        json.dump(catalog, output_file, ensure_ascii=False, indent=2)
        output_file.write("\n")

    return len(destinations), total_bytes


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Mirror exam resources into a built static site"
    )
    parser.add_argument(
        "--public", default=Path("dist"), type=Path, help="Built public directory"
    )
    args = parser.parse_args()
    public_root = args.public.resolve()

    resource_count = 0
    total_bytes = 0
    for catalog_name in CATALOG_NAMES:
        count, size = mirror_catalog(public_root, catalog_name)
        resource_count += count
        total_bytes += size

    print(
        f"Mirrored {resource_count} resources "
        f"({total_bytes / 1024 / 1024:.1f} MiB) into {public_root / 'resources'}"
    )


if __name__ == "__main__":
    main()
