#!/usr/bin/env python3
"""Export the 3DR Excel workbooks to JSON for the static GitHub Pages site."""

import json
import posixpath
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "data" / "3dr"
OUTPUT_FILE = SOURCE_DIR / "results.json"
NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "relationships": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "package": "http://schemas.openxmlformats.org/package/2006/relationships",
}
METRICS = {
    "chamfer": "chamfer distance",
    "cvpr1": "completeness valid ratio @ 1mm",
    "cvpr05": "completeness valid ratio @ 0.5mm",
}


def column_number(cell_reference):
    letters = re.match(r"[A-Z]+", cell_reference).group()
    result = 0
    for letter in letters:
        result = result * 26 + ord(letter) - ord("A") + 1
    return result


def read_cell_value(cell, shared_strings):
    cell_type = cell.get("t")
    if cell_type == "inlineStr":
        return "".join(text.text or "" for text in cell.findall(".//main:t", NS))
    value = cell.find("main:v", NS)
    if value is None or value.text is None:
        return None
    if cell_type == "s":
        return shared_strings[int(value.text)]
    if cell_type == "b":
        return value.text == "1"
    try:
        return float(value.text)
    except ValueError:
        return value.text


def read_workbook(path):
    with zipfile.ZipFile(path) as workbook:
        workbook_xml = ElementTree.fromstring(workbook.read("xl/workbook.xml"))
        relationships_xml = ElementTree.fromstring(
            workbook.read("xl/_rels/workbook.xml.rels")
        )
        relationships = {
            relationship.get("Id"): relationship.get("Target")
            for relationship in relationships_xml.findall("package:Relationship", NS)
        }
        shared_strings = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            strings_xml = ElementTree.fromstring(workbook.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(text.text or "" for text in item.findall(".//main:t", NS))
                for item in strings_xml.findall("main:si", NS)
            ]

        sheet = workbook_xml.find("main:sheets/main:sheet", NS)
        sheet_path = relationships[sheet.get(f"{{{NS['relationships']}}}id")]
        if sheet_path.startswith("/"):
            sheet_path = sheet_path.lstrip("/")
        elif not sheet_path.startswith("xl/"):
            sheet_path = posixpath.normpath(posixpath.join("xl", sheet_path))
        worksheet = ElementTree.fromstring(workbook.read(sheet_path))
        rows = []
        for row in worksheet.findall(".//main:sheetData/main:row", NS):
            values = {}
            for cell in row.findall("main:c", NS):
                values[column_number(cell.get("r"))] = read_cell_value(
                    cell, shared_strings
                )
            rows.append(values)
        return rows


def metric_columns(headers, algorithm_headers, label):
    for column, heading in headers.items():
        if isinstance(heading, str) and label in heading.casefold():
            columns = {}
            for offset in (0, 1):
                algorithm = algorithm_headers.get(column + offset)
                if isinstance(algorithm, str):
                    normalized = algorithm.strip().casefold()
                    if normalized in ("da3", "vggt"):
                        columns[normalized] = column + offset
            if columns:
                return columns
    return {}


def export_arrangement(path):
    rows = read_workbook(path)
    if len(rows) < 3:
        raise ValueError(f"{path.name} does not contain the expected header and data rows")
    headers, algorithm_headers = rows[0], rows[1]
    columns = {
        key: metric_columns(headers, algorithm_headers, label)
        for key, label in METRICS.items()
    }
    missing = [key for key, algorithms in columns.items() if not algorithms]
    if missing:
        raise ValueError(f"{path.name} is missing metric columns: {', '.join(missing)}")

    arrangement = path.stem.removesuffix("_results")
    samples = []
    for row in rows[2:]:
        sample_name = row.get(1)
        if not sample_name:
            continue
        sample = {
            "sample": str(sample_name),
            "surface": row.get(2),
            "size": row.get(3),
            "shape": row.get(4),
            "complexity": row.get(5),
            "metrics": {"da3": {}, "vggt": {}},
        }
        if arrangement == "single":
            sample["orientation"] = row.get(6)
        for metric, algorithm_columns in columns.items():
            for algorithm, column in algorithm_columns.items():
                value = row.get(column)
                sample["metrics"][algorithm][metric] = (
                    value if isinstance(value, (int, float)) else None
                )
        samples.append(sample)
    return arrangement, samples


def available_screenshots(arrangement):
    screenshot_dir = ROOT / "imgs" / "3dr_display" / arrangement
    return sorted(
        image.name
        for image in screenshot_dir.glob("*.png")
        if not image.stem.startswith("placeholder_")
    )


def main():
    workbooks = sorted(SOURCE_DIR.glob("*_results.xlsx"))
    if not workbooks:
        raise FileNotFoundError(f"No *_results.xlsx workbooks found in {SOURCE_DIR}")
    results = dict(export_arrangement(path) for path in workbooks)
    missing_arrangements = {"single", "multiple", "stacked"} - results.keys()
    if missing_arrangements:
        raise ValueError(
            "Missing arrangement workbooks: " + ", ".join(sorted(missing_arrangements))
        )
    results["screenshots"] = {
        arrangement: available_screenshots(arrangement)
        for arrangement in sorted(results)
    }
    OUTPUT_FILE.write_text(
        json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    sample_count = sum(
        len(results[arrangement]) for arrangement in ("single", "multiple", "stacked")
    )
    print(f"Exported {sample_count} samples to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
