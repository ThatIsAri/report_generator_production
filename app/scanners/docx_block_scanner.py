from docx import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

from app.scanners.document_blocks import ImportedBlock, clean_text, rows_to_text


def scan_docx_to_blocks(file_path):
    document = Document(str(file_path))
    blocks = []
    list_items = []

    def add_block(block):
        block.order_index = len(blocks)
        blocks.append(block)

    def flush_list():
        if not list_items:
            return

        content_text = "\n".join(list_items)
        add_block(
            ImportedBlock(
                block_type="list",
                content_text=content_text,
                content_json={"items": list(list_items)},
            )
        )
        del list_items[:]

    for item in _iter_document_blocks(document):
        if isinstance(item, Paragraph):
            paragraph_text = clean_text(item.text)
            if not paragraph_text:
                continue

            if _is_list_paragraph(item):
                list_items.append(paragraph_text)
                continue

            flush_list()
            add_block(
                ImportedBlock(
                    block_type="paragraph",
                    content_text=paragraph_text,
                    content_json={"text": paragraph_text},
                )
            )
            continue

        if isinstance(item, Table):
            flush_list()
            rows = _extract_table_rows(item)
            if rows:
                add_block(
                    ImportedBlock(
                        block_type="table",
                        content_text=rows_to_text(rows),
                        content_json={"rows": rows},
                        rows=rows,
                    )
                )

    flush_list()

    if not blocks:
        raise ValueError("DOCX не содержит текста для импорта.")

    return blocks


def _iter_document_blocks(document):
    body = document.element.body

    for child in body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def _is_list_paragraph(paragraph):
    style_name = ""

    if paragraph.style is not None and paragraph.style.name:
        style_name = paragraph.style.name.lower()

    return (
        "list" in style_name
        or "bullet" in style_name
        or "number" in style_name
        or "спис" in style_name
    )


def _extract_table_rows(table):
    rows = []

    for row in table.rows:
        values = [clean_text(cell.text) for cell in row.cells]

        while values and not values[-1]:
            values.pop()

        if any(values):
            rows.append(values)

    return rows

