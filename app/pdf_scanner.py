from pypdf import PdfReader

from app.base_scanner import (
    clean_cell_value,
    extract_key_values_from_lines,
    extract_key_values_from_table,
    finalize_scan_result,
    make_empty_scan_result,
)


def scan_pdf(file_path):
    result = make_empty_scan_result("pdf")
    text_parts = []

    reader = PdfReader(str(file_path))
    result["pages_count"] = len(reader.pages)

    for page_index, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        page_text = page_text.strip()
        if page_text:
            text_parts.append(page_text)

    if not "\n".join(text_parts).strip():
        text_parts = _extract_with_pdfplumber(file_path, result)

    result["plain_text"] = "\n".join(text_parts).strip()

    if not result["plain_text"]:
        raise ValueError("PDF не содержит извлекаемого текстового слоя. Вероятно, это скан.")

    lines = [
        clean_cell_value(line)
        for line in result["plain_text"].splitlines()
        if clean_cell_value(line)
    ]
    result["paragraphs"] = lines
    result["key_values"].update(extract_key_values_from_lines(lines))

    return finalize_scan_result(result)


def _extract_with_pdfplumber(file_path, result):
    try:
        import pdfplumber
    except ImportError:
        result["warnings"].append("pdfplumber не установлен, выполнено только базовое чтение через pypdf.")
        return []

    text_parts = []

    with pdfplumber.open(str(file_path)) as pdf:
        result["pages_count"] = len(pdf.pages)

        for page_index, page in enumerate(pdf.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                text_parts.append(page_text.strip())

            for table in page.extract_tables() or []:
                table_rows = []
                for row in table:
                    cells = [clean_cell_value(cell) for cell in row]
                    if any(cells):
                        table_rows.append(cells)

                if table_rows:
                    result["tables"].append(table_rows)
                    result["key_values"].update(
                        extract_key_values_from_table(table_rows, len(result["tables"]) - 1)
                    )

    return text_parts
