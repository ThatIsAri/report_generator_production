from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ImportedBlock:
    block_type: str
    content_text: str = ""
    content_json: Dict[str, Any] = field(default_factory=dict)
    order_index: int = 0
    source_file: Optional[str] = None
    rows: Optional[List[List[str]]] = None

    def to_dict(self):
        data = {
            "type": self.block_type,
            "content": self.content_text,
            "raw_text": self.content_text,
            "content_json": self.content_json,
            "order_index": self.order_index,
            "source_file": self.source_file,
            "rows": self.rows,
        }
        return data


def clean_text(value):
    if value is None:
        return ""

    return " ".join(str(value).replace("\xa0", " ").split()).strip()


def rows_to_text(rows):
    lines = []

    for row in rows:
        values = [clean_text(cell) for cell in row]
        values = [value for value in values if value]
        if values:
            lines.append(" | ".join(values))

    return "\n".join(lines).strip()

