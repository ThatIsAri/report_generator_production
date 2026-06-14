from pathlib import Path

from werkzeug.utils import secure_filename


def validate_uploaded_file(
    file_storage,
    allowed_extensions,
    allowed_mime_types=None,
    max_bytes=None,
    empty_allowed=False,
):
    original_filename = file_storage.filename or ""
    safe_name = secure_filename(original_filename)

    if not safe_name:
        raise ValueError("Некорректное имя файла.")

    extension = Path(safe_name).suffix.lower()

    if extension not in allowed_extensions:
        raise ValueError("Тип файла не поддерживается.")

    mime_type = (file_storage.mimetype or "").strip().lower()
    allowed_for_extension = None

    if isinstance(allowed_mime_types, dict):
        allowed_for_extension = allowed_mime_types.get(extension)
    else:
        allowed_for_extension = allowed_mime_types

    if allowed_for_extension and mime_type and mime_type not in allowed_for_extension:
        raise ValueError("Содержимое файла не соответствует допустимому типу.")

    size = get_file_size(file_storage)

    if not empty_allowed and size == 0:
        raise ValueError("Файл пустой.")

    if max_bytes and size > max_bytes:
        raise ValueError("Размер файла превышает допустимый лимит.")

    _validate_known_signature(file_storage, extension)

    return safe_name, extension, size, mime_type


def get_file_size(file_storage):
    try:
        current_position = file_storage.stream.tell()
        file_storage.stream.seek(0, 2)
        size = file_storage.stream.tell()
        file_storage.stream.seek(current_position)
        return size
    except (AttributeError, OSError):
        return file_storage.content_length or 0


def _validate_known_signature(file_storage, extension):
    signatures = {
        ".pdf": [b"%PDF-"],
        ".png": [b"\x89PNG\r\n\x1a\n"],
        ".jpg": [b"\xff\xd8\xff"],
        ".jpeg": [b"\xff\xd8\xff"],
        ".gif": [b"GIF87a", b"GIF89a"],
        ".docx": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
        ".xlsx": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
        ".xlsm": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
        ".xltx": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
        ".xltm": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
    }

    if extension == ".webp":
        header = _read_header(file_storage, 12)
        if not (header.startswith(b"RIFF") and header[8:12] == b"WEBP"):
            raise ValueError("Содержимое файла не соответствует допустимому типу.")
        return

    expected_signatures = signatures.get(extension)

    if not expected_signatures:
        return

    header = _read_header(file_storage, max(len(signature) for signature in expected_signatures))

    if not any(header.startswith(signature) for signature in expected_signatures):
        raise ValueError("Содержимое файла не соответствует допустимому типу.")


def _read_header(file_storage, length):
    try:
        current_position = file_storage.stream.tell()
        file_storage.stream.seek(0)
        header = file_storage.stream.read(length)
        file_storage.stream.seek(current_position)
        return header or b""
    except (AttributeError, OSError):
        return b""
