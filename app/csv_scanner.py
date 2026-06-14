import csv

from app.base_scanner import (
    clean_cell_value,
    extract_key_values_from_table,
    finalize_scan_result,
    make_empty_scan_result,
)


def scan_csv(file_path):
    result = make_empty_scan_result("csv")

    content = _read_csv_content(file_path)
    sample = content[:2048]

    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,|\t,")
    except csv.Error:
        dialect = csv.excel

    rows = []
    text_parts = []

    for row in csv.reader(content.splitlines(), dialect):
        values = [clean_cell_value(value) for value in row]

        while values and not values[-1]:
            values.pop()

        if not any(values):
            continue

        rows.append(values)
        text_parts.append(" | ".join(value for value in values if value))

    if rows:
        result["tables"].append(
            {
                "sheet_name": "CSV",
                "rows": rows,
            }
        )
        result["key_values"].update(extract_key_values_from_table(rows, 0))

    result["plain_text"] = "\n".join(text_parts).strip()

    if not result["plain_text"]:
        raise ValueError("CSV не содержит данных для импорта.")

    return finalize_scan_result(result)


def _read_csv_content(file_path):
    for encoding in ("utf-8-sig", "utf-8", "cp1251"):
        try:
            with open(file_path, "r", encoding=encoding, newline="") as file:
                return file.read()
        except UnicodeDecodeError:
            continue

    with open(file_path, "r", encoding="utf-8", errors="ignore", newline="") as file:
        return file.read()
