import re


def clean_cell_value(value):
    if value is None:
        return ""

    value = str(value).replace("\xa0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    return value.strip()


def make_empty_scan_result(file_format):
    return {
        "detected_format": file_format,
        "plain_text": "",
        "paragraphs": [],
        "tables": [],
        "key_values": {},
        "sections": [],
        "warnings": [],
        "pages_count": 0,
        "sheets_count": 0,
        "paragraphs_count": 0,
        "tables_count": 0,
        "key_values_count": 0,
        "sections_count": 0,
    }


def extract_key_values_from_lines(lines):
    key_values = {}

    for index, line in enumerate(lines):
        value = clean_cell_value(line)

        if not value or ":" not in value:
            continue

        key, field_value = value.split(":", 1)
        key = clean_cell_value(key)
        field_value = clean_cell_value(field_value)

        if key and field_value:
            key_values[key] = {
                "value": field_value,
                "source_type": "text",
                "source_location": f"line_{index + 1}",
            }

    return key_values


def extract_key_values_from_table(table_rows, table_index):
    key_values = {}

    for row_index, row in enumerate(table_rows):
        cleaned_cells = [clean_cell_value(cell) for cell in row]
        non_empty_cells = [cell for cell in cleaned_cells if cell]

        if len(non_empty_cells) < 2:
            continue

        first_cell = non_empty_cells[0]
        second_cell = non_empty_cells[1]

        if row_index == 0 and _looks_like_header(first_cell, second_cell):
            continue

        if len(first_cell) <= 80 and second_cell:
            key_values[first_cell] = {
                "value": second_cell,
                "source_type": "table",
                "source_location": f"table_{table_index + 1}_row_{row_index + 1}",
            }

    return key_values


def extract_sections_from_text(text):
    lines = (text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    sections = []
    current_section = None

    for index, line in enumerate(lines):
        value = clean_cell_value(line)

        if not value:
            continue

        if _looks_like_section_title(value):
            if current_section:
                current_section["value"] = "\n".join(current_section["lines"]).strip()
                sections.append(current_section)

            current_section = {
                "title": value.rstrip(":"),
                "source_location": f"line_{index + 1}",
                "lines": [],
                "value": "",
            }
            continue

        if current_section:
            current_section["lines"].append(value)

    if current_section:
        current_section["value"] = "\n".join(current_section["lines"]).strip()
        sections.append(current_section)

    return sections


def finalize_scan_result(scan_result):
    plain_text = scan_result.get("plain_text") or ""
    scan_result["sections"] = extract_sections_from_text(plain_text)
    scan_result["paragraphs_count"] = len(scan_result.get("paragraphs") or [])
    scan_result["tables_count"] = len(scan_result.get("tables") or [])
    scan_result["key_values_count"] = len(scan_result.get("key_values") or {})
    scan_result["sections_count"] = len(scan_result.get("sections") or [])
    return scan_result


def _looks_like_header(first_cell, second_cell):
    first = first_cell.lower()
    second = second_cell.lower()
    return first in {"поле", "параметр", "реквизит", "field"} and second in {
        "значение",
        "value",
    }


def _looks_like_section_title(value):
    if len(value) > 80:
        return False

    if value.endswith(":"):
        return True

    lowered = value.lower()
    known_titles = {
        "выполненные работы",
        "текущие риски",
        "план дальнейших действий",
        "риски",
        "план",
    }
    return lowered in known_titles
