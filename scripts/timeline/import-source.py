"""Import only curricular content from the supplied DOCX, without executing its prose.

Usage: python scripts/timeline/import-source.py path/to/source.docx
The JSON is committed so neither Word nor Python is needed at runtime.
"""
import json
import re
import sys
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def text(element):
    return "".join(t.text or "" for t in element.findall(".//w:t", NS))


def normalize(value):
    return re.sub(r"[\s\u200c\u200e\u200fَُِّْٰٔ]+", "", value).replace("ي", "ی").replace("ك", "ک")


ALIASES = {
    "ناصرخسرو قبادیانی": "ناصرخسرو",
    "فریدالدین عطار نیشابوری": "عطار",
    "مولانا جلال‌الدین بلخی (مولوی)": "مولوی",
    "عبدالوهاب نشاط / نشاط اصفهانی": "نشاط اصفهانی",
    "محمدتقی بهار (ملک‌الشعرا)": "ملک‌الشعرا بهار",
}

ERA_RANGES = [
    ("roots", 21, 40), ("khorasani", 40, 81), ("transition", 81, 104),
    ("iraqi", 104, 142), ("voqu", 142, 148), ("hindi", 148, 207),
    ("bazgasht", 207, 218), ("bidari", 218, 271), ("modern", 271, 319),
    ("revolution", 319, 356),
]

PERSON_TABLES = {78: "khorasani", 103: "transition", 139: "iraqi", 146: "voqu",
                 204: "hindi", 216: "bazgasht", 268: "bidari", 270: "bidari",
                 316: "modern", 318: "modern", 353: "revolution", 355: "revolution"}


def main():
    path = Path(sys.argv[1])
    with ZipFile(path) as document:
        body = ET.fromstring(document.read("word/document.xml")).find("w:body", NS)
    blocks = []
    for element in body:
        if element.tag.endswith("}p") and text(element):
            blocks.append({"type": "paragraph", "text": text(element)})
        elif element.tag.endswith("}tbl"):
            blocks.append({"type": "table", "rows": [
                [text(cell) for cell in row.findall("w:tc", NS)]
                for row in element.findall("w:tr", NS)
            ]})
    # Fail visibly if a revised source no longer matches the reviewed mapping.
    assert len(blocks) == 367, "Source structure changed; review the block mappings."
    assert blocks[358]["rows"][0][0] == "اثر"
    eras = []
    for era_id, start, end in ERA_RANGES:
        details = []
        for block in blocks[start + 1:end]:
            if block["type"] == "paragraph":
                value = block["text"]
                if value.startswith("منبع در فایل‌های ارسالی:"):
                    details.append({"kind": "source", "text": value.replace("منبع در فایل‌های ارسالی: ", "")})
                elif re.match(r"^[۰-۹]+\.[۰-۹]+\.", value):
                    details.append({"kind": "heading", "text": re.sub(r"^[۰-۹.]+\s*", "", value)})
                else:
                    details.append({"kind": "paragraph", "text": re.sub(r"^[۰-۹]+\.\s+", "", value)})
            else:
                rows = block["rows"]
                if len(rows) == 1 and len(rows[0]) == 1:
                    for value in rows[0][0].split("✦")[1:]:
                        details.append({"kind": "highlight", "text": value.strip()})
                else:
                    details.append({"kind": "table", "rows": rows})
        eras.append({"id": era_id, "details": details})

    people = []
    lookup = {}
    for block_id, era_id in PERSON_TABLES.items():
        for row in blocks[block_id]["rows"][1:]:
            original, *values = row
            name = ALIASES.get(original, original)
            key = normalize(name)
            if key not in lookup:
                lookup[key] = len(people)
                people.append({"id": f"person-{len(people) + 1}", "name": name, "aliases": [], "entries": []})
            person = people[lookup[key]]
            if original not in person["aliases"]:
                person["aliases"].append(original)
            # The source lists three Hindi poets in the transitional chapter.
            # Keep their actual style on the timeline; retain their lesson provenance.
            destination = "hindi" if name in ["کلیم کاشانی", "صائب تبریزی", "بیدل دهلوی"] else era_id
            person["entries"].append({"era": destination, "sourceEra": era_id,
                                      "note": values[0] if len(values) == 2 else "",
                                      "works": values[-1]})
    result = {"sourceFile": path.name, "sources": blocks[14]["rows"][1:],
              "prosePeriods": blocks[19]["rows"], "comparison": blocks[124]["rows"],
              "eras": eras, "people": people, "works": blocks[358]["rows"][1:]}
    output = ROOT / "lib/literary-timeline/source.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(eras)} eras, {len(people)} people, {len(result['works'])} works.")


if __name__ == "__main__":
    main()
