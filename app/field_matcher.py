import re


def normalize_label(value):
    value = (value or "").lower()
    value = value.replace("ё", "е")
    value = re.sub(r"[^a-zа-я0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def find_field_value(scan_result, field_config, profile):
    key_value_match = _find_in_key_values(scan_result, field_config)
    if key_value_match:
        return key_value_match

    section_match = _find_in_sections(scan_result, field_config)
    if section_match:
        return section_match

    text_match = _find_in_text(scan_result, field_config, profile)
    if text_match:
        return text_match

    return {
        "value": "",
        "confidence": 0.0,
        "source_type": "missing",
        "source_location": "",
    }


def _find_in_key_values(scan_result, field_config):
    aliases = [normalize_label(alias) for alias in field_config.get("aliases", [])]

    for key, item in (scan_result.get("key_values") or {}).items():
        normalized_key = normalize_label(key)

        if _matches_any_alias(normalized_key, aliases):
            if isinstance(item, dict):
                value = item.get("value") or ""
                source_type = item.get("source_type") or "key_value"
                source_location = item.get("source_location") or ""
            else:
                value = item
                source_type = "key_value"
                source_location = ""

            return {
                "value": value,
                "confidence": 0.95,
                "source_type": source_type,
                "source_location": source_location,
            }

    return None


def _find_in_sections(scan_result, field_config):
    aliases = [normalize_label(alias) for alias in field_config.get("aliases", [])]

    for section in scan_result.get("sections") or []:
        normalized_title = normalize_label(section.get("title"))

        if _matches_any_alias(normalized_title, aliases):
            return {
                "value": section.get("value") or "",
                "confidence": 0.88,
                "source_type": "section",
                "source_location": section.get("source_location") or "",
            }

    return None


def _find_in_text(scan_result, field_config, profile):
    text = (scan_result.get("plain_text") or "").replace("\r\n", "\n").replace("\r", "\n")

    if not text.strip():
        return None

    marker_positions = []

    for field_key, current_field in profile.get("fields", {}).items():
        for alias in current_field.get("aliases", []):
            pattern = r"(?im)^\s*" + re.escape(alias) + r"\s*(?::\s*(.*)|$)"

            for match in re.finditer(pattern, text):
                marker_positions.append(
                    {
                        "field_key": field_key,
                        "alias": alias,
                        "start": match.start(),
                        "line_end": match.end(),
                        "inline_value": (match.group(1) or "").strip(),
                    }
                )

    marker_positions = _deduplicate_markers(marker_positions)
    marker_positions.sort(key=lambda item: item["start"])

    target_aliases = {
        normalize_label(alias)
        for alias in field_config.get("aliases", [])
    }

    for index, marker in enumerate(marker_positions):
        if normalize_label(marker["alias"]) not in target_aliases:
            continue

        value_start = marker["line_end"]
        if marker["inline_value"]:
            value_parts = [marker["inline_value"]]
        else:
            value_parts = []

        if index + 1 < len(marker_positions):
            value_end = marker_positions[index + 1]["start"]
        else:
            value_end = len(text)

        block_value = text[value_start:value_end].strip()
        if block_value:
            value_parts.append(block_value)

        return {
            "value": "\n".join(value_parts).strip(),
            "confidence": 0.76,
            "source_type": "text_marker",
            "source_location": f"offset_{marker['start']}",
        }

    return None


def _deduplicate_markers(marker_positions):
    markers_by_start = {}

    for marker in marker_positions:
        start = marker["start"]
        existing_marker = markers_by_start.get(start)

        if not existing_marker or len(marker["alias"]) > len(existing_marker["alias"]):
            markers_by_start[start] = marker

    return list(markers_by_start.values())


def _matches_any_alias(value, aliases):
    if not value:
        return False

    for alias in aliases:
        if not alias:
            continue

        if value == alias:
            return True

        if alias in value or value in alias:
            return True

    return False
