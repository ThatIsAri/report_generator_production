import re
from datetime import datetime


STATUS_MAP = {
    "in progress": "В работе",
    "done": "Выполнено",
    "completed": "Выполнено",
    "finished": "Выполнено",
    "paused": "Приостановлено",
    "risk": "Требует внимания",
    "в работе": "В работе",
    "выполнено": "Выполнено",
    "завершен": "Выполнено",
    "завершён": "Выполнено",
    "приостановлен": "Приостановлено",
    "приостановлено": "Приостановлено",
    "требует внимания": "Требует внимания",
}


def normalize_field_value(field_key, field_config, original_value):
    field_type = field_config.get("type", "text")
    original_value = "" if original_value is None else str(original_value)
    descriptions = []

    if field_config.get("multiline") or field_type in {"multiline", "multiline_text"}:
        normalized_value = _normalize_multiline(original_value)
        if normalized_value != original_value:
            descriptions.append("Убраны лишние пробелы и пустые строки.")
    else:
        normalized_value = _normalize_single_line(original_value)
        if normalized_value != original_value:
            descriptions.append("Убраны лишние пробелы.")

    if field_type == "person":
        previous_value = normalized_value
        normalized_value = _normalize_person_name(normalized_value)
        if normalized_value != previous_value:
            descriptions.append("ФИО приведено к единому формату.")

    if field_type == "date":
        previous_value = normalized_value
        normalized_value = _normalize_date(normalized_value)
        if normalized_value != previous_value:
            descriptions.append("Дата приведена к формату дд.мм.гггг.")

    if field_type == "period":
        previous_value = normalized_value
        normalized_value = _normalize_period(normalized_value)
        if normalized_value != previous_value:
            descriptions.append("Период приведен к единому формату.")

    if field_type == "status":
        previous_value = normalized_value
        mapped_status = STATUS_MAP.get(normalized_value.lower())
        if mapped_status:
            normalized_value = mapped_status
        if normalized_value != previous_value:
            descriptions.append("Статус приведен к русскому справочному значению.")

    if field_type == "number":
        previous_value = normalized_value
        normalized_value = normalized_value.replace(",", ".")
        if normalized_value != previous_value:
            descriptions.append("Числовое значение приведено к единому формату.")

    return normalized_value, _deduplicate_descriptions(descriptions)


def normalize_imported_data(parsed_data):
    """
    Совместимость со старым тестовым парсером.
    Новый импорт использует normalize_field_value и ExtractedField.
    """
    legacy_config = {
        "project_name": {"type": "text", "multiline": False},
        "report_period": {"type": "period", "multiline": False},
        "manager_name": {"type": "person", "multiline": False},
        "project_status": {"type": "status", "multiline": False},
        "completed_work": {"type": "multiline_text", "multiline": True},
        "current_risks": {"type": "multiline_text", "multiline": True},
        "next_steps": {"type": "multiline_text", "multiline": True},
    }
    normalized_data = {}
    changes = []

    for field_name, original_value in parsed_data.items():
        normalized_value, descriptions = normalize_field_value(
            field_name,
            legacy_config.get(field_name, {"type": "text"}),
            original_value,
        )
        normalized_data[field_name] = normalized_value

        if normalized_value != (original_value or ""):
            changes.append(
                {
                    "field_name": field_name,
                    "original_value": original_value or "",
                    "normalized_value": normalized_value,
                    "change_description": " ".join(descriptions) or "Значение нормализовано.",
                }
            )

    return normalized_data, changes


def _deduplicate_descriptions(descriptions):
    result = []
    for description in descriptions:
        if description not in result:
            result.append(description)
    return result


def _normalize_single_line(value):
    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def _normalize_multiline(value):
    value = value.replace("\r\n", "\n").replace("\r", "\n").replace("\xa0", " ")

    lines = []
    for line in value.split("\n"):
        normalized_line = re.sub(r"[ \t]+", " ", line).strip()
        if normalized_line:
            lines.append(normalized_line)

    return "\n".join(lines)


def _normalize_person_name(value):
    match = re.match(
        r"^([A-Za-zА-Яа-яЁё-]+)\s+([A-Za-zА-Яа-яЁё])\.?\s*([A-Za-zА-Яа-яЁё])\.?$",
        value,
    )

    if not match:
        return value

    surname = _capitalize_name_part(match.group(1))
    first_initial = match.group(2).upper()
    second_initial = match.group(3).upper()

    return f"{surname} {first_initial}.{second_initial}."


def _capitalize_name_part(value):
    parts = value.split("-")
    normalized_parts = []

    for part in parts:
        if not part:
            continue
        normalized_parts.append(part[0].upper() + part[1:].lower())

    return "-".join(normalized_parts)


def _normalize_date(value):
    if not value:
        return value

    candidates = [
        "%Y-%m-%d",
        "%d.%m.%Y",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y.%m.%d",
    ]

    cleaned_value = value.strip()

    for date_format in candidates:
        try:
            parsed_date = datetime.strptime(cleaned_value[:10], date_format)
            return parsed_date.strftime("%d.%m.%Y")
        except ValueError:
            continue

    return value


def _normalize_period(value):
    value = re.sub(r"\s*[-–—]\s*", "–", value)

    parts = value.split("–")
    if len(parts) == 2:
        left = _normalize_date(parts[0].strip())
        right = _normalize_date(parts[1].strip())
        return f"{left}–{right}"

    return value
