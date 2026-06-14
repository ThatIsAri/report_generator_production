REPORT_TEMPLATES = {
    "generic_report_default": {
        "document_type": "generic_report",
        "title": "Универсальный отчет",
        "latex_template": "generic_report_default.tex.j2",
        "description": "Базовый отчет с названием, автором, датой и основным содержанием.",
    },
    "status_report_default": {
        "document_type": "status_report",
        "title": "Статус-отчет",
        "latex_template": "status_report_default.tex.j2",
        "description": "Отчет о текущем состоянии работ.",
    },
    "status_report_short": {
        "document_type": "status_report",
        "title": "Краткий статус-отчет",
        "latex_template": "status_report_short.tex.j2",
        "description": "Сокращенная версия отчета для быстрого просмотра состояния работ.",
    },
    "work_done_default": {
        "document_type": "work_done_report",
        "title": "Отчет о выполненных работах",
        "latex_template": "work_done_default.tex.j2",
        "description": "Отчет о выполненных работах за выбранный период.",
    },
    "timesheet_summary": {
        "document_type": "timesheet_report",
        "title": "Сводный отчет по трудозатратам",
        "latex_template": "timesheet_summary.tex.j2",
        "description": "Сводный отчет по трудозатратам сотрудников.",
    },
}
