from pathlib import Path

from app.csv_scanner import scan_csv
from app.docx_scanner import scan_docx
from app.pdf_scanner import scan_pdf
from app.xlsx_scanner import scan_xlsx


SUPPORTED_EXTENSIONS = {
    ".docx": scan_docx,
    ".xlsx": scan_xlsx,
    ".xlsm": scan_xlsx,
    ".xltx": scan_xlsx,
    ".xltm": scan_xlsx,
    ".csv": scan_csv,
    ".pdf": scan_pdf,
}


def scan_document(file_path):
    path = Path(file_path)
    extension = path.suffix.lower()
    scanner = SUPPORTED_EXTENSIONS.get(extension)

    if not scanner:
        raise ValueError("Поддерживаются только DOCX, XLSX, CSV и текстовые PDF.")

    return scanner(path)
