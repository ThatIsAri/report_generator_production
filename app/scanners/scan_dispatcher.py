from app.scanners.csv_block_scanner import scan_csv_to_blocks
from app.scanners.docx_block_scanner import scan_docx_to_blocks
from app.scanners.pdf_block_scanner import scan_pdf_to_blocks
from app.scanners.xlsx_block_scanner import scan_xlsx_to_blocks


def scan_file_to_blocks(file_path, extension):
    normalized_extension = (extension or "").lower().lstrip(".")

    if normalized_extension == "docx":
        return scan_docx_to_blocks(file_path)

    if normalized_extension == "pdf":
        return scan_pdf_to_blocks(file_path)

    if normalized_extension in ("xlsx", "xlsm"):
        return scan_xlsx_to_blocks(file_path)

    if normalized_extension == "csv":
        return scan_csv_to_blocks(file_path)

    raise ValueError("Поддерживаются только файлы DOCX, XLSX, XLSM, CSV и PDF.")

