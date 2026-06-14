import csv

from app.scanners.document_blocks import ImportedBlock, clean_text, rows_to_text


def scan_csv_to_blocks(file_path):
    content = _read_csv_content(file_path)
    sample = content[:2048]

    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,\t|")
    except csv.Error:
        dialect = csv.excel

    rows = []

    for row in csv.reader(content.splitlines(), dialect):
        values = [clean_text(value) for value in row]

        while values and not values[-1]:
            values.pop()

        if any(values):
            rows.append(values)

    if not rows:
        raise ValueError("CSV не содержит данных для импорта.")

    return [
        ImportedBlock(
            block_type="spreadsheet_table",
            content_text=rows_to_text(rows),
            content_json={
                "sheet_name": "CSV",
                "rows": rows,
            },
            order_index=0,
            rows=rows,
        )
    ]


def _read_csv_content(file_path):
    for encoding in ("utf-8-sig", "utf-8", "cp1251"):
        try:
            with open(file_path, "r", encoding=encoding, newline="") as file:
                return file.read()
        except UnicodeDecodeError:
            continue

    with open(file_path, "r", encoding="utf-8", errors="ignore", newline="") as file:
        return file.read()

