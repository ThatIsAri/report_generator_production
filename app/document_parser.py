import re


FIELD_MARKERS = [
    ("project_name", "Название проекта:"),
    ("report_period", "Период отчета:"),
    ("manager_name", "Ответственный:"),
    ("project_status", "Статус проекта:"),
    ("completed_work", "Выполненные работы:"),
    ("current_risks", "Текущие риски:"),
    ("next_steps", "План дальнейших действий:"),
]


def parse_status_report_text(text):
    normalized_text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    parsed_data = {}
    marker_positions = []

    for field_name, marker in FIELD_MARKERS:
        match = re.search(re.escape(marker), normalized_text, flags=re.IGNORECASE)
        parsed_data[field_name] = ""
        if match:
            marker_positions.append(
                {
                    "field_name": field_name,
                    "start": match.start(),
                    "end": match.end(),
                }
            )

    marker_positions.sort(key=lambda item: item["start"])

    for index, marker_data in enumerate(marker_positions):
        field_name = marker_data["field_name"]
        value_start = marker_data["end"]

        if index + 1 < len(marker_positions):
            value_end = marker_positions[index + 1]["start"]
        else:
            value_end = len(normalized_text)

        parsed_data[field_name] = normalized_text[value_start:value_end].strip()

    return parsed_data
