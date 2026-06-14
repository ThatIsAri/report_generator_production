import re

from pypdf import PdfReader

from app.scanners.document_blocks import ImportedBlock, clean_text, rows_to_text


def scan_pdf_to_blocks(file_path):
    blocks = []
    text_parts = []

    reader = PdfReader(str(file_path))

    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
            text_parts.append(page_text.strip())

    table_blocks = _extract_tables_with_pdfplumber(file_path)

    for part in text_parts:
        paragraphs = _split_pdf_text(part)
        for paragraph in paragraphs:
            blocks.append(
                ImportedBlock(
                    block_type="paragraph",
                    content_text=paragraph,
                    content_json={"text": paragraph},
                    order_index=len(blocks),
                )
            )

    for table_block in table_blocks:
        table_block.order_index = len(blocks)
        blocks.append(table_block)

    if not blocks:
        raise ValueError("PDF не содержит извлекаемого текстового слоя")

    return blocks


def _split_pdf_text(text):
    chunks = re.split(r"\n\s*\n+", text)
    paragraphs = []

    for chunk in chunks:
        lines = [clean_text(line) for line in chunk.splitlines()]
        lines = [line for line in lines if line]

        if not lines:
            continue

        if len(lines) == 1:
            paragraphs.append(lines[0])
        else:
            paragraphs.append(" ".join(lines))

    if paragraphs:
        return paragraphs

    return [clean_text(line) for line in text.splitlines() if clean_text(line)]


def _extract_tables_with_pdfplumber(file_path):
    try:
        import pdfplumber
    except ImportError:
        return []

    blocks = []

    with pdfplumber.open(str(file_path)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                rows = []

                for row in table:
                    values = [clean_text(cell) for cell in row]
                    while values and not values[-1]:
                        values.pop()
                    if any(values):
                        rows.append(values)

                if rows:
                    blocks.append(
                        ImportedBlock(
                            block_type="table",
                            content_text=rows_to_text(rows),
                            content_json={"rows": rows},
                            rows=rows,
                        )
                    )

    return blocks

