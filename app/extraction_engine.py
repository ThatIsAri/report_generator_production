from collections import defaultdict

from app.data_normalizer import normalize_field_value
from app.document_classifier import classify_document
from app.extraction_profiles import DOCUMENT_PROFILES, GENERIC_REPORT_PROFILE_KEY
from app.field_matcher import find_field_value, normalize_label


def extract_report_data(scan_result):
    classification = classify_document(scan_result)
    profile_key = classification["profile_key"] or GENERIC_REPORT_PROFILE_KEY
    profile = DOCUMENT_PROFILES.get(profile_key, DOCUMENT_PROFILES[GENERIC_REPORT_PROFILE_KEY])

    parsed_data = {}
    field_matches = {}
    calculated_data = _calculate_profile_fields(scan_result, profile)

    for field_key, field_config in profile["fields"].items():
        if field_key in calculated_data:
            match = calculated_data[field_key]
        else:
            match = find_field_value(scan_result, field_config, profile)

        parsed_data[field_key] = match["value"]
        field_matches[field_key] = match

    if profile_key == GENERIC_REPORT_PROFILE_KEY and not parsed_data.get("main_content"):
        parsed_data["main_content"] = _build_generic_main_content(scan_result, parsed_data)
        field_matches["main_content"] = {
            "value": parsed_data["main_content"],
            "confidence": 0.65 if parsed_data["main_content"] else 0.0,
            "source_type": "plain_text",
            "source_location": "document_text",
        }

    extracted_fields = []
    normalization_changes = []
    normalized_data = {}

    for field_key, field_config in profile["fields"].items():
        original_value = parsed_data.get(field_key, "")
        normalized_value, descriptions = normalize_field_value(
            field_key,
            field_config,
            original_value,
        )
        match = field_matches[field_key]
        is_required = field_config.get("required", False)
        normalized_data[field_key] = normalized_value

        change = None
        if normalized_value != (original_value or ""):
            change = {
                "field_name": field_key,
                "original_value": original_value or "",
                "normalized_value": normalized_value,
                "change_description": " ".join(descriptions) or "Значение нормализовано.",
            }
            normalization_changes.append(change)

        extracted_fields.append(
            {
                "field_key": field_key,
                "field_label": field_config["label"],
                "original_value": original_value,
                "normalized_value": normalized_value,
                "final_value": normalized_value,
                "confidence": match["confidence"],
                "is_required": is_required,
                "is_missing": is_required and not normalized_value.strip(),
                "source_type": match["source_type"],
                "source_location": match["source_location"],
                "normalization_change": change,
                "field_type": field_config.get("type", "text"),
                "multiline": field_config.get("multiline", False),
            }
        )

    return {
        "classification": classification,
        "profile": profile,
        "parsed_data": parsed_data,
        "normalized_data": normalized_data,
        "normalization_changes": normalization_changes,
        "extracted_fields": extracted_fields,
    }


def _calculate_profile_fields(scan_result, profile):
    if profile["key"] != "timesheet_report":
        return {}

    entries = _extract_timesheet_entries(scan_result)

    if not entries:
        return {}

    total_hours = sum(entry["hours"] for entry in entries)
    employees = defaultdict(float)

    for entry in entries:
        if entry["employee"]:
            employees[entry["employee"]] += entry["hours"]

    employees_summary = "\n".join(
        f"{employee}: {_format_number(hours)} ч."
        for employee, hours in sorted(employees.items())
    )

    work_entries = "\n".join(
        _format_work_entry(entry)
        for entry in entries
    )

    period = _derive_period(entries)

    return {
        "total_hours": {
            "value": _format_number(total_hours),
            "confidence": 0.95,
            "source_type": "calculated",
            "source_location": "timesheet_table",
        },
        "employees_summary": {
            "value": employees_summary,
            "confidence": 0.9,
            "source_type": "calculated",
            "source_location": "timesheet_table",
        },
        "work_entries": {
            "value": work_entries,
            "confidence": 0.9,
            "source_type": "table",
            "source_location": "timesheet_table",
        },
        "period": {
            "value": period,
            "confidence": 0.75 if period else 0.0,
            "source_type": "calculated",
            "source_location": "timesheet_dates",
        },
    }


def _extract_timesheet_entries(scan_result):
    entries = []

    for table in scan_result.get("tables") or []:
        rows = table.get("rows") if isinstance(table, dict) else table

        if not rows:
            continue

        header_index = _find_timesheet_header_index(rows)
        if header_index is None:
            continue

        headers = [normalize_label(value) for value in rows[header_index]]
        mapping = _map_timesheet_columns(headers)

        for row in rows[header_index + 1:]:
            entry = _build_timesheet_entry(row, mapping)
            if entry:
                entries.append(entry)

    return entries


def _find_timesheet_header_index(rows):
    for index, row in enumerate(rows[:10]):
        labels = {normalize_label(value) for value in row}
        has_date = "дата" in labels or "date" in labels
        has_employee = "сотрудник" in labels or "исполнитель" in labels or "employee" in labels
        has_hours = "часы" in labels or "hours" in labels or "трудозатраты" in labels

        if has_date and has_employee and has_hours:
            return index

    return None


def _map_timesheet_columns(headers):
    mapping = {}

    for index, header in enumerate(headers):
        if header in {"дата", "date"}:
            mapping["date"] = index
        elif header in {"сотрудник", "исполнитель", "employee"}:
            mapping["employee"] = index
        elif header in {"работа", "вид работы", "описание", "task", "work"}:
            mapping["work"] = index
        elif header in {"часы", "трудозатраты", "hours"}:
            mapping["hours"] = index
        elif header in {"статус", "status"}:
            mapping["status"] = index

    return mapping


def _build_timesheet_entry(row, mapping):
    hours = _safe_float(_get_row_value(row, mapping.get("hours")))

    if hours is None:
        return None

    return {
        "date": _get_row_value(row, mapping.get("date")),
        "employee": _get_row_value(row, mapping.get("employee")),
        "work": _get_row_value(row, mapping.get("work")),
        "hours": hours,
        "status": _get_row_value(row, mapping.get("status")),
    }


def _get_row_value(row, index):
    if index is None or index >= len(row):
        return ""
    return str(row[index]).strip()


def _safe_float(value):
    if value is None:
        return None

    value = str(value).strip().replace(",", ".")

    try:
        return float(value)
    except ValueError:
        return None


def _format_work_entry(entry):
    parts = []

    if entry["date"]:
        parts.append(entry["date"])
    if entry["employee"]:
        parts.append(entry["employee"])
    if entry["work"]:
        parts.append(entry["work"])

    parts.append(f"{_format_number(entry['hours'])} ч.")

    if entry["status"]:
        parts.append(entry["status"])

    return " | ".join(parts)


def _derive_period(entries):
    dates = [entry["date"] for entry in entries if entry["date"]]

    if not dates:
        return ""

    return f"{min(dates)}–{max(dates)}"


def _format_number(value):
    if value == int(value):
        return str(int(value))
    return str(round(value, 2)).replace(".", ",")


def _build_generic_main_content(scan_result, parsed_data):
    text = scan_result.get("plain_text") or ""

    if not text.strip():
        return ""

    lines = []
    base_values = {
        parsed_data.get("report_title", "").strip(),
        parsed_data.get("report_author", "").strip(),
        parsed_data.get("report_date", "").strip(),
    }

    for line in text.splitlines():
        value = line.strip()
        if value and value not in base_values:
            lines.append(value)

    return "\n".join(lines).strip()
