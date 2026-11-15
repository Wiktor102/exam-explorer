from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from pypdf import PdfReader, PdfWriter

import generate_catalog as generator


ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
BUNDLED = ROOT / "archive-sources" / "inf04"
EXPECTED = {
    "01": {
        "examHash": "835ed22e967aa7116a0074ce6324b445ee0e673947e1ac554525a27e428a7125",
        "scoringHash": "25c0d70cbb058b079be424c75d3541f827778349396811d6710a6972aaccff97",
        "ranges": [(2, 2), (3, 5), (5, 6)],
        "types": ["console", "web", "documentation"],
    },
    "02": {
        "examHash": "c312ec725b04ec523c58e3dc554dda9c750098491f7b5f8a112f23c068ec8237",
        "scoringHash": "92b305dd0e98ee9313a6c02dd74a4759841dd752df7f4fe61d80e21a130d9233",
        "ranges": [(2, 3), (3, 5), (5, 7)],
        "types": ["console", "mobile", "documentation"],
    },
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class CatalogGenerationTests(unittest.TestCase):
    def test_bundled_sources_and_generated_records(self):
        catalog = json.loads((PUBLIC / "data/inf04/catalog.json").read_text())
        checked_exams = {exam["id"]: exam for exam in catalog["exams"]}
        checked_tasks = {task["id"]: task for task in catalog["tasks"]}
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            for number, expected in EXPECTED.items():
                with self.subTest(sheet=number):
                    source = BUNDLED / f"inf_04_2026_06_{number}_SG.pdf"
                    scoring = BUNDLED / f"inf_04_2026_06_{number}_SG_zo.pdf"
                    exam_id = f"inf04-2026-06-{number}-sg"
                    self.assertEqual(digest(source), expected["examHash"])
                    self.assertEqual(digest(scoring), expected["scoringHash"])
                    exam = generator.parse_exam(temporary, source, temporary, {exam_id: scoring})
                    for key, value in exam.items():
                        if key != "taskRecords":
                            self.assertEqual(checked_exams[exam_id][key], value)
                    self.assertEqual(exam["pageCount"], 8)
                    self.assertEqual(exam["code"], f"INF.04-{number}-26.06-SG")
                    self.assertIsNone(exam["sourcePath"])
                    self.assertTrue(exam["sourceUrl"].startswith("https://"))
                    self.assertTrue(exam["scoringSourceUrl"].startswith("https://"))
                    tasks = exam["taskRecords"]
                    for task in tasks:
                        for key, value in task.items():
                            self.assertEqual(checked_tasks[task["id"]][key], value)
                    self.assertEqual([(t["pageStart"], t["pageEnd"]) for t in tasks], expected["ranges"])
                    self.assertEqual([t["type"] for t in tasks], expected["types"])
                    self.assertNotIn("Wypełnia zdający w przypadku", tasks[2]["text"])
                    if number == "02":
                        self.assertIn("priorytetem i datą", tasks[0]["summary"])
                        self.assertIn("formularzem dodawania", tasks[1]["summary"])
                        self.assertNotIn("licznikiem", tasks[0]["summary"])
                        self.assertIn("notifyDataSetChanged", tasks[2]["text"])

    def test_bundled_source_wins_when_upstream_adds_the_same_sheet(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            upstream = temporary / "source" / "_arkusze"
            upstream.mkdir(parents=True)
            # Use the other sheet's content to prove which copy wins, including
            # case and _kolor filename differences in the upstream copy.
            shutil.copy2(BUNDLED / "inf_04_2026_06_02_SG.pdf", upstream / "INF_04_2026_06_01_sg_kolor.pdf")
            catalog = generator.build_catalog(upstream.parent, temporary / "public")
            self.assertEqual(catalog["examCount"], 2)
            self.assertEqual(catalog["taskCount"], 6)
            self.assertEqual(digest(temporary / "public/pdfs/exams/inf04-2026-06-01-sg.pdf"), EXPECTED["01"]["examHash"])

    def test_preserves_records_when_source_checkout_is_incomplete(self):
        existing = json.loads((PUBLIC / "data/inf04/catalog.json").read_text())
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "catalog.json"
            path.write_text(json.dumps(existing))
            partial = copy.deepcopy(existing)
            partial["exams"] = []
            partial["tasks"] = []
            preserved = generator.preserve_existing_records(partial, path)
            self.assertEqual(preserved["exams"], existing["exams"])
            self.assertEqual(preserved["tasks"], existing["tasks"])
            self.assertEqual(preserved["examCount"], len(existing["exams"]))

    def test_stale_task_crop_is_repaired_without_replacing_full_exam(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            source = BUNDLED / "inf_04_2026_06_01_SG.pdf"
            exam = generator.parse_exam(temporary, source, temporary)
            full_pdf = temporary / exam["pdf"].lstrip("/")
            before = (digest(full_pdf), full_pdf.stat().st_mtime_ns)
            task_pdf = temporary / exam["taskRecords"][2]["pdf"].lstrip("/")
            writer = PdfWriter()
            for page in PdfReader(str(source)).pages[4:8]:
                writer.add_page(page)
            writer.write(str(task_pdf))
            generator.parse_exam(temporary, source, temporary)
            self.assertEqual(len(PdfReader(str(task_pdf)).pages), 2)
            self.assertEqual((digest(full_pdf), full_pdf.stat().st_mtime_ns), before)

    def test_can_regenerate_when_scoring_source_is_already_the_destination(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            source = BUNDLED / "inf_04_2026_06_02_SG.pdf"
            scoring = temporary / "pdfs/scoring/inf04-2026-06-02-sg-zo.pdf"
            scoring.parent.mkdir(parents=True)
            shutil.copy2(BUNDLED / "inf_04_2026_06_02_SG_zo.pdf", scoring)
            generator.parse_exam(temporary, source, temporary, {"inf04-2026-06-02-sg": scoring}, replace_existing_assets=True)
            self.assertEqual(digest(scoring), EXPECTED["02"]["scoringHash"])

    def test_checked_in_inf04_catalog_and_pdf_content(self):
        catalog = json.loads((PUBLIC / "data/inf04/catalog.json").read_text())
        exams = {e["id"]: e for e in catalog["exams"]}
        tasks = {t["id"]: t for t in catalog["tasks"]}
        self.assertEqual(len(exams), catalog["examCount"])
        self.assertEqual(len(tasks), catalog["taskCount"])
        self.assertEqual(len(exams), len(catalog["exams"]))
        self.assertEqual(len(tasks), len(catalog["tasks"]))
        readers = {}
        for exam_id, exam in exams.items():
            reader = PdfReader(str(PUBLIC / exam["pdf"].lstrip("/")))
            readers[exam_id] = reader
            self.assertEqual(len(reader.pages), exam["pageCount"])
            self.assertEqual(exam["tasks"], [t["id"] for t in sorted(tasks.values(), key=lambda t: t["part"]) if t["examId"] == exam_id])
            if exam["scoringPdf"]:
                self.assertGreater(len(PdfReader(str(PUBLIC / exam["scoringPdf"].lstrip("/"))).pages), 0)
        for task in tasks.values():
            with self.subTest(task=task["id"]):
                exam = readers[task["examId"]]
                self.assertTrue(1 <= task["pageStart"] <= task["pageEnd"] <= len(exam.pages))
                split = PdfReader(str(PUBLIC / task["pdf"].lstrip("/")))
                self.assertEqual(len(split.pages), task["pageEnd"] - task["pageStart"] + 1)
                for index, page in enumerate(split.pages, task["pageStart"] - 1):
                    self.assertEqual(page.extract_text(), exam.pages[index].extract_text())
                    split_content = page.get_contents()
                    full_content = exam.pages[index].get_contents()
                    self.assertEqual(
                        split_content.get_data() if split_content is not None else b"",
                        full_content.get_data() if full_content is not None else b"",
                    )
                duplicates = [t["id"] for t in catalog["tasks"] if t["duplicateGroup"] == task["duplicateGroup"] and t["id"] != task["id"]]
                self.assertEqual(task["duplicates"], duplicates)
        for number, expected in EXPECTED.items():
            exam = exams[f"inf04-2026-06-{number}-sg"]
            self.assertEqual(digest(PUBLIC / exam["pdf"].lstrip("/")), expected["examHash"])
            scoring = PUBLIC / exam["scoringPdf"].lstrip("/")
            self.assertEqual(digest(scoring), expected["scoringHash"])
            scoring_reader = PdfReader(str(scoring))
            self.assertEqual(len(scoring_reader.pages), 3)
            self.assertIn(exam["code"], scoring_reader.pages[0].extract_text())
            records = [tasks[task_id] for task_id in exam["tasks"]]
            self.assertEqual([(t["pageStart"], t["pageEnd"]) for t in records], expected["ranges"])
            self.assertEqual([t["type"] for t in records], expected["types"])


if __name__ == "__main__":
    unittest.main()
