BASE_REPORT_FIELDS = {
    "report_title": {
        "label": "Название отчета",
        "aliases": [
            "Название отчета",
            "Название",
            "Тема отчета",
            "Тема",
            "Заголовок",
            "Report title",
            "Title",
        ],
        "required": True,
        "type": "text",
        "multiline": False,
    },
    "report_author": {
        "label": "Автор",
        "aliases": [
            "Автор",
            "Подготовил",
            "Составил",
            "Исполнитель",
            "Ответственный",
            "Author",
            "Prepared by",
        ],
        "required": True,
        "type": "person",
        "multiline": False,
    },
    "report_date": {
        "label": "Дата отчета",
        "aliases": [
            "Дата отчета",
            "Дата",
            "Дата формирования",
            "Report date",
            "Date",
        ],
        "required": True,
        "type": "date",
        "multiline": False,
    },
}

GENERIC_REPORT_PROFILE = {
    "key": "generic_report",
    "title": "Универсальный отчет",
    "required_fields": ["report_title", "report_author", "report_date"],
    "recommended_templates": ["generic_report_default"],
    "fields": {
        **BASE_REPORT_FIELDS,
        "main_content": {
            "label": "Основное содержание",
            "aliases": [
                "Основное содержание",
                "Содержание",
                "Текст отчета",
                "Описание",
                "Main content",
                "Content",
            ],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
    },
}

STATUS_REPORT_PROFILE = {
    "key": "status_report",
    "title": "Статус-отчет",
    "required_fields": ["report_title", "report_author", "report_date"],
    "recommended_templates": ["status_report_default", "status_report_short"],
    "fields": {
        **BASE_REPORT_FIELDS,
        "project": {
            "label": "Проект",
            "aliases": [
                "Проект",
                "Название проекта",
                "Наименование проекта",
                "Project",
                "Project name",
            ],
            "required": False,
            "type": "text",
            "multiline": False,
        },
        "status": {
            "label": "Статус",
            "aliases": [
                "Статус",
                "Статус проекта",
                "Текущий статус",
                "Состояние проекта",
                "Status",
                "Project status",
            ],
            "required": False,
            "type": "status",
            "multiline": False,
        },
        "completed_work": {
            "label": "Выполненные работы",
            "aliases": [
                "Выполненные работы",
                "Проделанная работа",
                "Что сделано",
                "Результаты работ",
                "Completed work",
                "Done",
            ],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
        "risks": {
            "label": "Риски",
            "aliases": [
                "Риски",
                "Текущие риски",
                "Проблемы",
                "Ограничения",
                "Risks",
                "Current risks",
            ],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
        "next_steps": {
            "label": "Дальнейшие действия",
            "aliases": [
                "Дальнейшие действия",
                "План дальнейших действий",
                "План",
                "Следующие шаги",
                "Next steps",
                "Plan",
            ],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
    },
}

WORK_DONE_REPORT_PROFILE = {
    "key": "work_done_report",
    "title": "Отчет о выполненных работах",
    "required_fields": ["report_title", "report_author", "report_date"],
    "recommended_templates": ["work_done_default"],
    "fields": {
        **BASE_REPORT_FIELDS,
        "period": {
            "label": "Период",
            "aliases": ["Период", "Период отчета", "Отчетный период", "Period"],
            "required": False,
            "type": "period",
            "multiline": False,
        },
        "completed_work": {
            "label": "Выполненные работы",
            "aliases": [
                "Выполненные работы",
                "Проделанная работа",
                "Что сделано",
                "Completed work",
            ],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
        "result_description": {
            "label": "Результат",
            "aliases": ["Результат", "Итог", "Описание результата", "Result"],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
        "notes": {
            "label": "Примечания",
            "aliases": ["Примечания", "Комментарий", "Замечания", "Notes"],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
    },
}

TIMESHEET_REPORT_PROFILE = {
    "key": "timesheet_report",
    "title": "Сводный отчет по трудозатратам",
    "required_fields": ["report_title", "report_author", "report_date"],
    "recommended_templates": ["timesheet_summary"],
    "fields": {
        **BASE_REPORT_FIELDS,
        "period": {
            "label": "Период",
            "aliases": ["Период", "Период отчета", "Отчетный период", "Period"],
            "required": False,
            "type": "period",
            "multiline": False,
        },
        "total_hours": {
            "label": "Общий объем часов",
            "aliases": ["Общий объем часов", "Итого часов", "Всего часов", "Total hours"],
            "required": False,
            "type": "number",
            "multiline": False,
        },
        "employees_summary": {
            "label": "Сводка по сотрудникам",
            "aliases": ["Сводка по сотрудникам", "Сотрудники", "Employees summary"],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
        "work_entries": {
            "label": "Перечень работ",
            "aliases": ["Перечень работ", "Работы", "Трудозатраты", "Work entries"],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
    },
}

INCOMING_DOCUMENTS_PROFILE = {
    "key": "incoming_documents",
    "title": "Входящие документы",
    "required_fields": ["report_title", "report_author", "report_date"],
    "recommended_templates": [],
    "fields": {
        **BASE_REPORT_FIELDS,
        "documents_count": {
            "label": "Количество документов",
            "aliases": ["Количество документов", "Всего документов", "Documents count"],
            "required": False,
            "type": "number",
            "multiline": False,
        },
        "documents_list": {
            "label": "Список документов",
            "aliases": ["Список документов", "Документы", "Documents"],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
        "processing_status": {
            "label": "Статус обработки",
            "aliases": ["Статус обработки", "Статус", "Processing status"],
            "required": False,
            "type": "status",
            "multiline": False,
        },
        "notes": {
            "label": "Замечания",
            "aliases": ["Замечания", "Примечания", "Комментарий", "Notes"],
            "required": False,
            "type": "multiline_text",
            "multiline": True,
        },
    },
}

DOCUMENT_PROFILES = {
    GENERIC_REPORT_PROFILE["key"]: GENERIC_REPORT_PROFILE,
    STATUS_REPORT_PROFILE["key"]: STATUS_REPORT_PROFILE,
    WORK_DONE_REPORT_PROFILE["key"]: WORK_DONE_REPORT_PROFILE,
    TIMESHEET_REPORT_PROFILE["key"]: TIMESHEET_REPORT_PROFILE,
    INCOMING_DOCUMENTS_PROFILE["key"]: INCOMING_DOCUMENTS_PROFILE,
}

BASE_FIELD_KEYS = ["report_title", "report_author", "report_date"]
GENERIC_REPORT_PROFILE_KEY = GENERIC_REPORT_PROFILE["key"]
