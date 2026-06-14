from app.extraction_profiles import BASE_FIELD_KEYS, DOCUMENT_PROFILES, GENERIC_REPORT_PROFILE_KEY
from app.field_matcher import normalize_label


MIN_SPECIFIC_CONFIDENCE = 0.25


def classify_document(scan_result):
    profile_scores = []
    base_score = _score_base_fields(scan_result)

    for profile in DOCUMENT_PROFILES.values():
        if profile["key"] == GENERIC_REPORT_PROFILE_KEY:
            continue

        profile_scores.append(_score_specific_profile(scan_result, profile, base_score))

    profile_scores.sort(key=lambda item: item["score"], reverse=True)
    best = profile_scores[0] if profile_scores else None

    if not best or best["specific_confidence"] < MIN_SPECIFIC_CONFIDENCE:
        generic = _score_generic_profile(scan_result, base_score)
        return {
            "profile_key": GENERIC_REPORT_PROFILE_KEY,
            "profile_title": DOCUMENT_PROFILES[GENERIC_REPORT_PROFILE_KEY]["title"],
            "confidence": generic["confidence"],
            "score": generic["score"],
            "profiles": [generic] + profile_scores,
        }

    generic = _score_generic_profile(scan_result, base_score)
    return {
        "profile_key": best["profile_key"],
        "profile_title": best["profile_title"],
        "confidence": best["confidence"],
        "score": best["score"],
        "profiles": profile_scores + [generic],
    }


def _score_specific_profile(scan_result, profile, base_score):
    searchable_labels = _build_searchable_labels(scan_result)
    searchable_text = normalize_label(scan_result.get("plain_text") or "")
    specific_score = 0.0
    max_specific_score = 0.0

    for field_key, field_config in profile.get("fields", {}).items():
        if field_key in BASE_FIELD_KEYS:
            continue

        field_weight = _get_field_weight(field_key, field_config)
        max_specific_score += field_weight

        aliases = [
            normalize_label(alias)
            for alias in field_config.get("aliases", [])
        ]

        if _has_alias_in_labels(aliases, searchable_labels):
            specific_score += field_weight
        elif _has_alias_in_text(aliases, searchable_text):
            specific_score += field_weight * 0.5

    specific_confidence = specific_score / max_specific_score if max_specific_score else 0.0

    if profile["key"] == "timesheet_report" and _has_timesheet_signature(scan_result):
        specific_score += 8.0
        max_specific_score += 8.0
        specific_confidence = specific_score / max_specific_score if max_specific_score else 0.0

    confidence = min((specific_confidence * 0.78) + (base_score["confidence"] * 0.22), 1.0)

    return {
        "profile_key": profile["key"],
        "profile_title": profile["title"],
        "score": round(specific_score + base_score["score"], 2),
        "confidence": round(confidence, 2),
        "specific_confidence": round(specific_confidence, 2),
    }


def _score_generic_profile(scan_result, base_score):
    has_text = bool((scan_result.get("plain_text") or "").strip())
    text_score = 2.0 if has_text else 0.0
    score = base_score["score"] + text_score
    confidence = min((base_score["confidence"] * 0.7) + (0.3 if has_text else 0), 1.0)

    return {
        "profile_key": GENERIC_REPORT_PROFILE_KEY,
        "profile_title": DOCUMENT_PROFILES[GENERIC_REPORT_PROFILE_KEY]["title"],
        "score": round(score, 2),
        "confidence": round(confidence, 2),
        "specific_confidence": round(confidence, 2),
    }


def _score_base_fields(scan_result):
    base_profile = DOCUMENT_PROFILES[GENERIC_REPORT_PROFILE_KEY]
    searchable_labels = _build_searchable_labels(scan_result)
    searchable_text = normalize_label(scan_result.get("plain_text") or "")
    score = 0.0
    max_score = 0.0

    for field_key in BASE_FIELD_KEYS:
        field_config = base_profile["fields"][field_key]
        max_score += 1.0
        aliases = [normalize_label(alias) for alias in field_config.get("aliases", [])]

        if _has_alias_in_labels(aliases, searchable_labels):
            score += 1.0
        elif _has_alias_in_text(aliases, searchable_text):
            score += 0.5

    return {
        "score": score,
        "confidence": score / max_score if max_score else 0.0,
    }


def _build_searchable_labels(scan_result):
    labels = []

    for key in (scan_result.get("key_values") or {}).keys():
        labels.append(normalize_label(key))

    for section in scan_result.get("sections") or []:
        labels.append(normalize_label(section.get("title")))

    for table in scan_result.get("tables") or []:
        rows = table.get("rows") if isinstance(table, dict) else table

        if not rows:
            continue

        for row in rows[:12]:
            for value in row:
                labels.append(normalize_label(value))

    return labels


def _has_timesheet_signature(scan_result):
    for table in scan_result.get("tables") or []:
        rows = table.get("rows") if isinstance(table, dict) else table

        if not rows:
            continue

        for row in rows[:12]:
            labels = {normalize_label(value) for value in row}
            has_date = "дата" in labels or "date" in labels
            has_employee = "сотрудник" in labels or "исполнитель" in labels or "employee" in labels
            has_hours = "часы" in labels or "hours" in labels or "трудозатраты" in labels

            if has_date and has_employee and has_hours:
                return True

    return False


def _get_field_weight(field_key, field_config):
    important_fields = {
        "total_hours",
        "employees_summary",
        "work_entries",
        "completed_work",
        "result_description",
        "status",
        "risks",
        "next_steps",
    }

    if field_key in important_fields:
        return 3.0

    return 2.0 if field_config.get("required") else 1.5


def _has_alias_in_labels(aliases, labels):
    for alias in aliases:
        for label in labels:
            if alias and label and (alias == label or alias in label or label in alias):
                return True
    return False


def _has_alias_in_text(aliases, text):
    for alias in aliases:
        if alias and alias in text:
            return True
    return False
