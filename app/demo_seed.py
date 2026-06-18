import json
import os
import secrets
from datetime import date, datetime
from html import escape

from flask import current_app
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.html_sanitizer import sanitize_editor_html
from app.models import (
    AdminTaxonomyOption,
    Folder,
    GroupReportAccess,
    GroupTemplateAccess,
    ImportedDataBlock,
    ImportedSourceFile,
    Organization,
    Report,
    ReportDraft,
    ReportEditorState,
    ReportShare,
    ReportVersion,
    Template,
    User,
    UserGroup,
    UserGroupMember,
)
from app.organization_service import (
    DEFAULT_ORGANIZATION_DESCRIPTION,
    DEFAULT_ORGANIZATION_NAME,
    DEFAULT_ORGANIZATION_TARIFF,
    LEGACY_DEFAULT_ORGANIZATION_NAME,
    ensure_default_organization,
    ensure_organization_data,
    find_organization_by_name,
    migrate_organization_references,
)
from app.report_share_service import ensure_report_share_schema
from app.template_taxonomy_service import ensure_template_taxonomy_schema
from app.user_group_service import ensure_user_group_schema


DEMO_START = datetime(2026, 6, 1, 9, 0, 0)
DEMO_END = datetime(2026, 6, 16, 18, 0, 0)

DEMO_USERS = [
    {
        "key": "owner",
        "full_name": "Геннадий Кудрявцев",
        "first_name": "Геннадий",
        "last_name": "Кудрявцев",
        "fallback_username": "g.kudryavtsev",
        "email": "g.kudryavtsev@ftnet.local",
        "role": "admin",
        "position": "Руководитель проектов",
    },
    {
        "key": "gordienko",
        "full_name": "Евгений Гордиенко",
        "first_name": "Евгений",
        "last_name": "Гордиенко",
        "username": "e.gordienko",
        "email": "e.gordienko@ftnet.local",
        "role": "admin",
        "position": "Технический директор",
    },
    {
        "key": "bespalova",
        "full_name": "Анжела Беспалова",
        "first_name": "Анжела",
        "last_name": "Беспалова",
        "username": "a.bespalova",
        "email": "a.bespalova@ftnet.local",
        "role": "user",
        "position": "HRD",
    },
    {
        "key": "agafonova",
        "full_name": "Дарья Агафонова",
        "first_name": "Дарья",
        "last_name": "Агафонова",
        "username": "d.agafonova",
        "email": "d.agafonova@ftnet.local",
        "role": "user",
        "position": "Архитектор",
    },
    {
        "key": "leonidov",
        "full_name": "Сергей Леонидов",
        "first_name": "Сергей",
        "last_name": "Леонидов",
        "username": "s.leonidov",
        "email": "s.leonidov@ftnet.local",
        "role": "user",
        "position": "CEO",
    },
]

TEMPLATE_DEFINITIONS = [
    {
        "key": "weekly_status",
        "title": "Еженедельный статус проекта",
        "tag": "Проекты",
        "template_type": "Статус-отчет",
        "created_at": datetime(2026, 6, 1, 10, 0, 0),
        "sections": [
            ("Название проекта", "Модуль автоматического формирования отчётности: импорт данных, редактор, предпросмотр и экспорт."),
            ("Отчётный период", "01.06.2026–07.06.2026."),
            ("Руководитель проекта", "Геннадий Кудрявцев, руководитель проектов FT NET."),
            ("Общее состояние проекта", "Статус зелёный: ключевые сценарии работают, команда закрывает визуальные замечания по таблицам и экспорту."),
            ("Краткое резюме", "За период стабилизирован контур создания отчётов, добавлены демонстрационные данные и подтверждена готовность базовых пользовательских сценариев."),
            ("Выполненные работы", "Реализованы сохранение HTML-документа, предпросмотр отчёта, базовый экспорт и обновление демо-набора для презентации."),
            ("Ключевые показатели", "Готовность редактора составляет 88%, экспортных сценариев — 76%, критических маршрутов с проверкой прав — 100%."),
            ("Текущие риски", "Основной риск связан с переносом сложных таблиц между редактором, предпросмотром и печатной версией; меры реагирования уже внедряются."),
            ("План на следующий период", "Провести финальную визуальную проверку, подтвердить экспорт PDF/DOCX/XML и подготовить демонстрационный сценарий для комиссии."),
        ],
        "tables": [
            {
                "title": "Ключевые показатели",
                "headers": ["Показатель", "План", "Факт", "Статус", "Комментарий"],
                "rows": [
                    ["Готовность редактора", "85%", "88%", "Выполнено", "Автосохранение и повторное открытие работают"],
                    ["Экспорт DOCX/PDF/XML", "75%", "76%", "В работе", "Осталась финальная визуальная сверка таблиц"],
                    ["Проверка прав доступа", "100%", "100%", "Выполнено", "Серверные маршруты защищены"],
                    ["Демо-наполнение", "7 отчётов", "7 отчётов", "Выполнено", "Шаблоны и отчёты заполнены живыми данными"],
                ],
            },
            {
                "title": "Риски",
                "headers": ["Риск", "Вероятность", "Влияние", "Ответственный", "Меры реагирования"],
                "rows": [
                    ["Расхождение предпросмотра и открытого отчёта", "Средняя", "Высокое", "Геннадий Кудрявцев", "Использовать единый сохранённый HTML-источник"],
                    ["Некорректный перенос широких таблиц", "Средняя", "Высокое", "Евгений Гордиенко", "Закрепить сетку, перенос слов и печатные стили"],
                    ["Недостаточная детализация демо-данных", "Низкая", "Среднее", "Дарья Агафонова", "Подготовить шаблоны и отчёты с реальными примерами"],
                ],
            },
        ],
    },
    {
        "key": "work_done",
        "title": "Отчёт о выполненных работах",
        "tag": "Работы",
        "template_type": "Отчет о выполненных работах",
        "created_at": datetime(2026, 6, 1, 11, 0, 0),
        "sections": [
            ("Проект", "Единый контур отчётности FT NET."),
            ("Заказчик", "Проектный офис и руководство FT NET."),
            ("Отчётный период", "01.06.2026–07.06.2026."),
            ("Состав команды", "Геннадий Кудрявцев, Евгений Гордиенко, Дарья Агафонова, Анжела Беспалова."),
            ("Цели периода", "Подготовить рабочий сценарий создания отчёта: выбор шаблона, импорт файла, редактирование, предпросмотр и экспорт."),
            ("Достигнутые результаты", "Основные маршруты приложения подключены, редактор сохраняет документ, демо-пользователи и папки доступны для презентации."),
            ("План следующего периода", "Закрыть визуальные дефекты таблиц, проверить открытие сохранённых отчётов и выполнить прогон перед демонстрацией."),
            ("Согласование", "Результаты согласованы Геннадием Кудрявцевым и Евгением Гордиенко; замечания Дарьи Агафоновой внесены в план стабилизации."),
        ],
        "tables": [
            {
                "title": "Перечень выполненных работ",
                "headers": ["№", "Работа", "Исполнитель", "Результат", "Дата завершения", "Статус"],
                "rows": [
                    ["1", "Настройка структуры приложения", "Евгений Гордиенко", "Подключены маршруты, модели и база данных", "02.06.2026", "Завершено"],
                    ["2", "Редактор отчётов", "Геннадий Кудрявцев", "Сохранение документа и форматирования работает", "04.06.2026", "Завершено"],
                    ["3", "Демо-организация FT NET", "Анжела Беспалова", "Созданы пользователи, группы и связи доступа", "05.06.2026", "Завершено"],
                    ["4", "Экспорт и предпросмотр", "Дарья Агафонова", "Сценарии подготовлены, таблицы вынесены на финальную проверку", "07.06.2026", "В работе"],
                ],
            },
        ],
    },
    {
        "key": "timesheet",
        "title": "Сводный отчёт по трудозатратам",
        "tag": "Трудозатраты",
        "template_type": "Сводный отчет",
        "created_at": datetime(2026, 6, 1, 12, 0, 0),
        "sections": [
            ("Отчётный период", "01.06.2026–07.06.2026."),
            ("Подразделение или проект", "Проектный офис FT NET, направление автоматизации отчётности."),
            ("Ответственный", "Анжела Беспалова, HRD."),
            ("Распределение по направлениям", "43% времени занял редактор и предпросмотр, 31% — backend и безопасность, 16% — организация данных, 10% — согласование решений."),
            ("Отклонения от плана", "Факт выше плана на 2 часа из-за дополнительной проверки повторного открытия отчётов после предпросмотра."),
            ("Комментарий руководителя", "Трудозатраты соответствуют демонстрационному этапу; перераспределение часов не влияет на срок финального показа."),
        ],
        "tables": [
            {
                "title": "Сводная таблица трудозатрат",
                "headers": ["Сотрудник", "Должность", "Задача", "План, ч", "Факт, ч", "Отклонение", "Комментарий"],
                "rows": [
                    ["Геннадий Кудрявцев", "Руководитель проектов", "Редактор и предпросмотр", "40", "42", "+2", "Дополнительная стабилизация сохранения"],
                    ["Евгений Гордиенко", "Технический директор", "Backend и безопасность", "38", "40", "+2", "Проверены права доступа и экспорт"],
                    ["Дарья Агафонова", "Архитектор", "Структура модулей", "36", "35", "-1", "Архитектурные замечания закрыты"],
                    ["Анжела Беспалова", "HRD", "Пользователи и роли", "24", "23", "-1", "Подготовлены демо-аккаунты"],
                    ["Сергей Леонидов", "CEO", "Согласование решений", "26", "26", "0", "План соблюдён"],
                ],
            },
        ],
    },
    {
        "key": "incoming_documents",
        "title": "Реестр входящих документов",
        "tag": "Документы",
        "template_type": "Табличный отчет",
        "created_at": datetime(2026, 6, 1, 13, 0, 0),
        "sections": [
            ("Отчётный период", "01.06.2026–10.06.2026."),
            ("Подразделение", "Проектный офис FT NET."),
            ("Ответственный за ведение реестра", "Анжела Беспалова."),
            ("Документы, требующие ответа", "Открыто одно действие по документу ВХ-2026-079: требуется подтвердить финальную совместимость экспорта DOCX, PDF и XML."),
            ("Просроченные документы", "Просроченных входящих документов на дату отчёта нет."),
            ("Итоговое примечание", "Реестр используется для контроля материалов проекта и подготовки демонстрационного пакета."),
        ],
        "tables": [
            {
                "title": "Таблица документов",
                "headers": [
                    "№",
                    "Дата",
                    "Регистрационный номер",
                    "Отправитель",
                    "Наименование документа",
                    "Проект",
                    "Ответственный",
                    "Статус",
                ],
                "rows": [
                    ["1", "02.06.2026", "ВХ-2026-061", "Проектный офис", "Требования к структуре отчёта", "Модуль отчётности", "Геннадий Кудрявцев", "Обработан"],
                    ["2", "04.06.2026", "ВХ-2026-074", "HR-дирекция", "Состав участников демонстрационной организации", "FT NET", "Анжела Беспалова", "Обработан"],
                    ["3", "06.06.2026", "ВХ-2026-079", "Проектный офис", "Требования к экспорту DOCX, PDF и XML", "Модуль отчётности", "Евгений Гордиенко", "В работе"],
                    ["4", "09.06.2026", "ВХ-2026-088", "Архитектурный комитет", "Замечания к структуре программных компонентов", "Единый контур отчётности", "Дарья Агафонова", "Обработан"],
                ],
            },
        ],
    },
    {
        "key": "risk_report",
        "title": "Отчёт по рискам проекта",
        "tag": "Риски",
        "template_type": "Универсальный",
        "created_at": datetime(2026, 6, 1, 14, 0, 0),
        "sections": [
            ("Проект", "Модуль автоматического формирования отчётности."),
            ("Дата оценки", "12.06.2026."),
            ("Ответственный", "Евгений Гордиенко, технический директор."),
            ("Краткое резюме", "Критических блокеров нет. Основное внимание уделено соответствию предпросмотра сохранённому отчёту, защите маршрутов и стабильности экспорта."),
            ("Критические риски", "Высокий уровень сохраняют риск расхождения PDF с редактором и риск обхода прав доступа при прямом изменении идентификаторов."),
            ("Принятые меры", "Введён единый HTML-источник документа, добавлены серверные проверки владельца, группы и организации, ограничены типы загружаемых файлов."),
            ("Требуемые управленческие решения", "Подтвердить состав демонстрационных сценариев, закрепить финальную дату визуальной сверки и разрешить публикацию только после проверки экспорта."),
            ("Дата следующего пересмотра", "15.06.2026."),
        ],
        "tables": [
            {
                "title": "Реестр рисков",
                "headers": ["Код", "Риск", "Вероятность", "Влияние", "Уровень", "Владелец", "Меры реагирования", "Состояние"],
                "rows": [
                    ["R-01", "Несоответствие PDF содержимому редактора", "Средняя", "Высокое", "Высокий", "Геннадий Кудрявцев", "Единый HTML-источник и тесты многостраничного документа", "Снижается"],
                    ["R-02", "Обход прав доступа через изменение идентификатора", "Низкая", "Критическое", "Высокий", "Евгений Гордиенко", "Серверная проверка владельца, группы и организации", "Контролируется"],
                    ["R-03", "Загрузка файла недопустимого типа", "Средняя", "Высокое", "Высокий", "Евгений Гордиенко", "Белый список типов, MIME-проверка и ограничение размера", "Контролируется"],
                    ["R-04", "Потеря несохранённых изменений", "Низкая", "Высокое", "Средний", "Геннадий Кудрявцев", "Автосохранение и предупреждение при закрытии", "Снижается"],
                    ["R-05", "Ошибка обновления схемы существующей базы", "Низкая", "Среднее", "Средний", "Дарья Агафонова", "Идемпотентные миграции и резервное копирование", "Контролируется"],
                    ["R-06", "Недостаток времени до демонстрации", "Средняя", "Среднее", "Средний", "Геннадий Кудрявцев", "Приоритизация критических сценариев", "Контролируется"],
                ],
            },
        ],
    },
]

REPORT_DEFINITIONS = [
    {
        "key": "status_01_05",
        "title": "Статус проекта «Модуль автоматического формирования отчётности» за 01–05 июня 2026 года",
        "date": date(2026, 6, 5),
        "author_key": "owner",
        "template_key": "weekly_status",
        "folder_path": "Проекты/Модуль отчётности",
        "tag": "Проекты",
        "created_at": datetime(2026, 6, 5, 17, 10, 0),
        "sections": [
            ("Проект", "Модуль автоматического формирования отчётности"),
            ("Отчётный период", "01.06.2026–05.06.2026"),
            ("Общее состояние", "Работы идут по плану. Завершена базовая структура Flask-приложения, подключены MySQL, шаблоны и редактор отчётов."),
            ("Выполненные работы", [
                "Настроена структура приложения и подключение к базе данных.",
                "Реализованы регистрация, авторизация и базовые роли пользователей.",
                "Добавлены разделы отчётов и шаблонов.",
                "Подготовлен редактор отчётов с сохранением состояния.",
                "Начата административная панель для управления пользователями.",
            ]),
            ("Проблемы и отклонения", "Критических отклонений не выявлено. Требуется дальнейшая стабилизация предпросмотра и экспорта."),
            ("План на следующий период", [
                "Доработать экспорт в DOCX, PDF и XML.",
                "Проверить безопасность маршрутов и обработку HTML редактора.",
                "Проверить демонстрационные данные для итоговой презентации.",
            ]),
        ],
        "tables": [
            {
                "title": "Ключевые показатели",
                "headers": ["Показатель", "План", "Факт", "Статус", "Комментарий"],
                "rows": [
                    ["Готовность каркаса приложения", "100%", "100%", "Выполнено", "Основные маршруты подключены"],
                    ["Готовность редактора", "60%", "65%", "Выполнено", "Сохранение состояния работает"],
                    ["Проверки безопасности", "30%", "25%", "В работе", "Требуется аудит маршрутов"],
                ],
            },
            {
                "title": "Текущие риски",
                "headers": ["Риск", "Вероятность", "Влияние", "Ответственный", "Меры реагирования"],
                "rows": [
                    ["Расхождение предпросмотра и сохранённого документа", "Средняя", "Высокое", "Геннадий Кудрявцев", "Использовать единый HTML-источник"],
                    ["Неполная детализация демонстрационных сценариев", "Низкая", "Среднее", "Евгений Гордиенко", "Расширить seed-набор и обновить готовые отчёты"],
                ],
            },
        ],
    },
    {
        "key": "work_done_01_07",
        "title": "Отчёт о выполненных работах по проекту «Единый контур отчётности» за 01–07 июня 2026 года",
        "date": date(2026, 6, 7),
        "author_key": "agafonova",
        "template_key": "work_done",
        "folder_path": "Проекты",
        "tag": "Работы",
        "created_at": datetime(2026, 6, 7, 16, 30, 0),
        "sections": [
            ("Проект", "Единый контур отчётности"),
            ("Заказчик", "FT NET"),
            ("Отчётный период", "01.06.2026–07.06.2026"),
            ("Руководитель", "Геннадий Кудрявцев"),
            ("Состав команды", "Геннадий Кудрявцев, Евгений Гордиенко, Дарья Агафонова"),
            ("Цели периода", "Сформировать устойчивый контур создания, сохранения и предпросмотра отчётов."),
            ("Достигнутые результаты", "Основные пользовательские сценарии создания отчёта подготовлены к демонстрации."),
            ("Замечания", "Необходимо провести итоговую проверку прав доступа и повторного открытия документов."),
        ],
        "tables": [
            {
                "title": "Перечень выполненных работ",
                "headers": ["№", "Работа", "Исполнитель", "Результат", "Дата завершения", "Статус"],
                "rows": [
                    ["1", "Настройка структуры Flask-приложения", "Евгений Гордиенко", "Маршруты и сервисы подключены", "02.06.2026", "Завершено"],
                    ["2", "Разработка редактора отчётов", "Геннадий Кудрявцев", "Добавлено сохранение HTML-содержимого", "04.06.2026", "Завершено"],
                    ["3", "Подготовка административной панели", "Дарья Агафонова", "Добавлены пользователи и группы", "06.06.2026", "В работе"],
                    ["4", "Проверка импорта документов", "Евгений Гордиенко", "Поддержаны DOCX, XLSX, CSV и PDF", "07.06.2026", "Завершено"],
                ],
            },
        ],
    },
    {
        "key": "timesheet_01_07",
        "title": "Сводный отчёт по трудозатратам команды за 01–07 июня 2026 года",
        "date": date(2026, 6, 8),
        "author_key": "bespalova",
        "template_key": "timesheet",
        "folder_path": "Трудозатраты",
        "tag": "Трудозатраты",
        "created_at": datetime(2026, 6, 8, 10, 20, 0),
        "sections": [
            ("Отчётный период", "01.06.2026–07.06.2026"),
            ("Подразделение", "Проектный офис FT NET"),
            ("Ответственный", "Анжела Беспалова"),
            ("Общее количество часов", "166 часов"),
            ("Распределение по направлениям", "Основная нагрузка пришлась на редактор отчётов, экспорт и административные сценарии."),
            ("Комментарий руководителя", "Фактические трудозатраты соответствуют плану демонстрационного этапа."),
        ],
        "tables": [
            {
                "title": "Сводная таблица трудозатрат",
                "headers": ["Сотрудник", "Должность", "Задача", "План, ч", "Факт, ч", "Отклонение", "Комментарий"],
                "rows": [
                    ["Геннадий Кудрявцев", "Руководитель проектов", "Редактор и предпросмотр", "40", "42", "+2", "Уточнение поведения сохранения"],
                    ["Евгений Гордиенко", "Технический директор", "Backend и безопасность", "38", "40", "+2", "Дополнительные проверки доступа"],
                    ["Дарья Агафонова", "Архитектор", "Структура модулей", "36", "35", "-1", "Работы выполнены в срок"],
                    ["Анжела Беспалова", "HRD", "Пользователи и роли", "24", "23", "-1", "Подготовлена матрица участников"],
                    ["Сергей Леонидов", "CEO", "Согласование решений", "26", "26", "0", "План соблюдён"],
                ],
            },
        ],
    },
    {
        "key": "incoming_documents_01_10",
        "title": "Реестр входящих документов за 01–10 июня 2026 года",
        "date": date(2026, 6, 10),
        "author_key": "bespalova",
        "template_key": "incoming_documents",
        "folder_path": "Документы",
        "tag": "Документы",
        "created_at": datetime(2026, 6, 10, 15, 0, 0),
        "sections": [
            ("Ответственный", "Анжела Беспалова"),
            ("Документы, требующие ответа", "ВХ-2026-079 — требуется итоговое подтверждение работоспособности экспорта."),
            ("Просроченные документы", "Отсутствуют."),
            ("Итоговое примечание", "Реестр используется для контроля входящих материалов проекта и подготовки итоговой демонстрации."),
        ],
        "tables": [
            {
                "title": "Таблица документов",
                "headers": ["№", "Дата", "Регистрационный номер", "Отправитель", "Наименование документа", "Проект", "Ответственный", "Статус"],
                "rows": [
                    ["1", "02.06.2026", "ВХ-2026-061", "Проектный офис", "Требования к структуре отчёта", "Модуль отчётности", "Геннадий Кудрявцев", "Обработан"],
                    ["2", "04.06.2026", "ВХ-2026-074", "HR-дирекция", "Состав участников демонстрационной организации", "FT NET", "Анжела Беспалова", "Обработан"],
                    ["3", "06.06.2026", "ВХ-2026-079", "Проектный офис", "Требования к экспорту DOCX, PDF и XML", "Модуль отчётности", "Геннадий Кудрявцев", "В работе"],
                    ["4", "09.06.2026", "ВХ-2026-088", "Архитектурный комитет", "Замечания к структуре программных компонентов", "Единый контур отчётности", "Дарья Агафонова", "Обработан"],
                ],
            },
        ],
    },
    {
        "key": "risk_report_12",
        "title": "Отчёт по рискам проекта «Модуль автоматического формирования отчётности» на 12 июня 2026 года",
        "date": date(2026, 6, 12),
        "author_key": "gordienko",
        "template_key": "risk_report",
        "folder_path": "Управление",
        "tag": "Риски",
        "created_at": datetime(2026, 6, 12, 12, 0, 0),
        "sections": [
            ("Критические решения", [
                "Не публиковать приложение с включённым debug.",
                "Не хранить секреты и пароли в репозитории.",
                "Проверять права доступа на каждом серверном маршруте.",
                "Выполнить финальное тестирование экспорта до 16.06.2026.",
            ]),
            ("Следующий пересмотр рисков", "15.06.2026"),
        ],
        "tables": [
            {
                "title": "Реестр рисков",
                "headers": ["Код", "Риск", "Вероятность", "Влияние", "Уровень", "Владелец", "Меры реагирования", "Состояние"],
                "rows": [
                    ["R-01", "Несоответствие PDF содержимому редактора", "Средняя", "Высокое", "Высокий", "Геннадий Кудрявцев", "Единый HTML-источник и тесты многостраничного документа", "Снижается"],
                    ["R-02", "Обход прав доступа через изменение идентификатора", "Низкая", "Критическое", "Высокий", "Евгений Гордиенко", "Серверная проверка владельца, группы и организации", "Контролируется"],
                    ["R-03", "Загрузка файла недопустимого типа", "Средняя", "Высокое", "Высокий", "Евгений Гордиенко", "Белый список типов, MIME-проверка и ограничение размера", "Контролируется"],
                    ["R-04", "Потеря несохранённых изменений", "Низкая", "Высокое", "Средний", "Геннадий Кудрявцев", "Автосохранение и предупреждение при закрытии", "Снижается"],
                    ["R-05", "Ошибка обновления схемы существующей базы", "Низкая", "Среднее", "Средний", "Дарья Агафонова", "Идемпотентные миграции и резервное копирование", "Контролируется"],
                    ["R-06", "Недостаток времени до демонстрации", "Средняя", "Среднее", "Средний", "Геннадий Кудрявцев", "Приоритизация критических сценариев", "Контролируется"],
                ],
            },
        ],
    },
    {
        "key": "status_08_12",
        "title": "Статус проекта «Модуль автоматического формирования отчётности» за 08–12 июня 2026 года",
        "date": date(2026, 6, 12),
        "author_key": "owner",
        "template_key": "weekly_status",
        "folder_path": "Проекты/Модуль отчётности",
        "tag": "Проекты",
        "created_at": datetime(2026, 6, 12, 17, 30, 0),
        "sections": [
            ("Общее состояние", "Основные функции реализованы, система готовится к итоговой демонстрации."),
            ("Выполненные работы", [
                "Реализован экспорт в DOCX.",
                "Реализован экспорт в PDF.",
                "Реализован экспорт в XML.",
                "Добавлены серверные проверки доступа при экспорте.",
                "Доработана административная панель пользователей.",
                "Реализованы рабочие группы.",
                "Выполнена проверка SQL-инъекций, XSS и CSRF.",
                "Добавлены автоматические тесты критических сценариев.",
            ]),
            ("Текущие риски", [
                "визуальные отличия сложных таблиц в разных форматах;",
                "необходимость финальной проверки на чистой базе;",
                "возможные различия шрифтов на другом компьютере.",
            ]),
            ("План", [
                "подготовить демонстрационное наполнение;",
                "выполнить полный пользовательский сценарий;",
                "проверить установку проекта по README;",
                "подготовить итоговое заключение.",
            ]),
        ],
        "tables": [
            {
                "title": "Ключевые показатели",
                "headers": ["Показатель", "План", "Факт", "Статус", "Комментарий"],
                "rows": [
                    ["Форматы экспорта", "3", "3", "Выполнено", "DOCX, PDF и XML"],
                    ["Критические маршруты с проверкой прав", "100%", "100%", "Выполнено", "Проверки выполняются на сервере"],
                    ["Запланированные демонстрационные сценарии", "12", "11", "В работе", "Осталась итоговая проверка"],
                    ["Готовность проекта", "90%", "92%", "Выполнено", "План превышен на 2%"],
                ],
            },
        ],
    },
    {
        "key": "final_readiness",
        "title": "Итоговый отчёт о готовности демонстрационной версии",
        "date": date(2026, 6, 16),
        "author_key": "gordienko",
        "template_key": "work_done",
        "folder_path": "Управление",
        "tag": "Итоги",
        "created_at": datetime(2026, 6, 16, 14, 0, 0),
        "sections": [
            ("Отчётный период", "01.06.2026–16.06.2026"),
            ("Общая готовность", "92%"),
            ("Результаты", [
                "Реализовано создание отчётов на основе шаблонов.",
                "Реализован импорт исходных документов.",
                "Реализован редактор отчётов.",
                "Реализовано автоматическое сохранение.",
                "Реализован предпросмотр.",
                "Реализован экспорт DOCX, PDF и XML.",
                "Реализованы пользователи, группы и права доступа.",
                "Реализован журнал действий.",
                "Проведён технический аудит.",
                "Подготовлены демонстрационные шаблоны и отчёты.",
            ]),
            ("Оставшиеся задачи", [
                "провести финальную визуальную проверку на компьютере демонстрации;",
                "создать резервную копию базы;",
                "проверить зависимости после чистой установки.",
            ]),
            ("Решение", "Демонстрационная версия готова к представлению. Критические препятствия отсутствуют."),
        ],
        "tables": [
            {
                "title": "Проверенные сценарии",
                "headers": ["№", "Сценарий", "Результат", "Комментарий"],
                "rows": [
                    ["1", "Авторизация пользователя", "Успешно", "Сессия создаётся корректно"],
                    ["2", "Создание отчёта", "Успешно", "Отчёт появляется в списке"],
                    ["3", "Редактирование", "Успешно", "Форматирование сохраняется"],
                    ["4", "Предпросмотр", "Успешно", "Отображается актуальная версия"],
                    ["5", "Экспорт DOCX", "Успешно", "Документ открывается в Word"],
                    ["6", "Экспорт PDF", "Успешно", "Кириллица отображается корректно"],
                    ["7", "Экспорт XML", "Успешно", "XML проходит синтаксическую проверку"],
                    ["8", "Управление пользователями", "Успешно", "Доступно администратору"],
                    ["9", "Проверка прав доступа", "Успешно", "Чужие документы недоступны"],
                    ["10", "Повторный запуск приложения", "Успешно", "Демонстрационные данные не дублируются"],
                ],
            },
        ],
    },
]


def seed_ftnet_demo_data(allow_production=False, simulate_failure=False):
    if _is_production_environment() and not allow_production:
        raise RuntimeError(
            "Seed FT NET предназначен для локального демонстрационного окружения. "
            "Для production задайте ALLOW_DEMO_SEED=true."
        )

    _ensure_demo_schema()
    db.session.rollback()

    summary = {
        "organization": DEFAULT_ORGANIZATION_NAME,
        "users_created": 0,
        "users_updated": 0,
        "groups_created": 0,
        "groups_updated": 0,
        "folders_created": 0,
        "templates_created": 0,
        "templates_updated": 0,
        "reports_created": 0,
        "reports_updated": 0,
        "temporary_password": None,
        "created_usernames": [],
        "legacy_users_deactivated": 0,
        "legacy_reports_removed": 0,
        "legacy_templates_removed": 0,
    }

    try:
        organization = _ensure_ftnet_organization()
        temporary_password = _get_demo_password()
        users = _ensure_demo_users(organization, temporary_password, summary)

        if simulate_failure:
            raise RuntimeError("Simulated seed failure")

        folders = _ensure_demo_folders(summary)
        templates = _ensure_demo_templates(summary)
        groups = _ensure_demo_groups(organization, users, summary)
        reports = _ensure_demo_reports(users, folders, templates, summary)
        _ensure_demo_taxonomy_options(organization)
        _ensure_demo_shared_access(users, groups, reports)
        _cleanup_legacy_demo_records(organization, users, summary)

        db.session.commit()
        return summary
    except Exception:
        db.session.rollback()
        raise


def _is_production_environment():
    if current_app and current_app.config.get("TESTING"):
        return False

    env_values = {
        os.getenv("FLASK_ENV", ""),
        os.getenv("APP_ENV", ""),
        os.getenv("ENV", ""),
    }
    return any(value.strip().lower() == "production" for value in env_values)


def _get_demo_password():
    return os.getenv("DEMO_USER_PASSWORD") or secrets.token_urlsafe(12)


def _ensure_demo_schema():
    ensure_organization_data()
    ensure_user_group_schema()
    ensure_report_share_schema()
    ensure_template_taxonomy_schema()
    db.create_all()


def _ensure_ftnet_organization():
    organization = ensure_default_organization()
    ftnet = find_organization_by_name(DEFAULT_ORGANIZATION_NAME)
    legacy = find_organization_by_name(LEGACY_DEFAULT_ORGANIZATION_NAME)

    if ftnet and legacy and ftnet.id != legacy.id:
        migrate_organization_references(legacy.id, ftnet.id)
        db.session.delete(legacy)
        organization = ftnet
    elif legacy and not ftnet:
        legacy.name = DEFAULT_ORGANIZATION_NAME
        organization = legacy

    organization.name = DEFAULT_ORGANIZATION_NAME
    organization.description = DEFAULT_ORGANIZATION_DESCRIPTION
    organization.tariff = DEFAULT_ORGANIZATION_TARIFF
    organization.avatar = None
    organization.updated_at = DEMO_START

    return organization


def _ensure_demo_users(organization, temporary_password, summary):
    users = {}
    owner = _find_owner_user(organization)

    if owner:
        owner_was_blank = False
    else:
        owner_was_blank = True
        owner = User(
            username=DEMO_USERS[0]["fallback_username"],
            email=DEMO_USERS[0]["email"],
            password_hash=generate_password_hash(temporary_password),
            created_at=DEMO_START,
        )
        db.session.add(owner)
        db.session.flush()
        summary["users_created"] += 1
        summary["created_usernames"].append(owner.username)

    _apply_user_profile(owner, DEMO_USERS[0], organization)

    if _should_replace_owner_email(owner.email):
        if not _email_used_by_other_user(DEMO_USERS[0]["email"], owner.id):
            owner.email = DEMO_USERS[0]["email"]

    owner.updated_at = datetime(2026, 6, 2, 10, 0, 0)
    users["owner"] = owner

    if not owner_was_blank:
        summary["users_updated"] += 1

    for index, definition in enumerate(DEMO_USERS[1:], start=1):
        user, created = _get_or_create_demo_user(definition, organization, temporary_password)
        _apply_user_profile(user, definition, organization)
        user.created_at = user.created_at or DEMO_START
        user.updated_at = datetime(2026, 6, 2, 10 + index, 0, 0)
        users[definition["key"]] = user

        if created:
            summary["users_created"] += 1
            summary["created_usernames"].append(user.username)
        else:
            summary["users_updated"] += 1

    if summary["created_usernames"]:
        summary["temporary_password"] = temporary_password

    return users


def _find_owner_user(organization):
    admin = (
        User.query
        .filter(User.organization_id == organization.id)
        .filter(User.role == "admin")
        .order_by(User.id.asc())
        .first()
    )

    if admin:
        return admin

    any_admin = User.query.filter(User.role == "admin").order_by(User.id.asc()).first()
    if any_admin:
        return any_admin

    return User.query.order_by(User.id.asc()).first()


def _get_or_create_demo_user(definition, organization, temporary_password):
    user = User.query.filter(User.username == definition["username"]).first()
    if not user:
        user = User.query.filter(User.email == definition["email"]).first()

    if user:
        return user, False

    user = User(
        username=definition["username"],
        email=definition["email"],
        password_hash=generate_password_hash(temporary_password),
        organization_id=organization.id,
        is_active=True,
        created_at=DEMO_START,
        updated_at=DEMO_START,
    )
    db.session.add(user)
    db.session.flush()
    return user, True


def _apply_user_profile(user, definition, organization):
    user.name = definition["full_name"]
    user.first_name = definition["first_name"]
    user.last_name = definition["last_name"]
    user.role = definition["role"]
    user.position = definition["position"]
    user.organization_id = organization.id
    user.is_active = True

    if "username" in definition and not user.username:
        user.username = definition["username"]

    if "email" in definition and not user.email:
        user.email = definition["email"]


def _should_replace_owner_email(email):
    normalized = (email or "").strip().lower()
    return (
        not normalized
        or normalized.endswith("@example.com")
        or normalized in {"admin@localhost", "admin@example.local", "test@test.local"}
    )


def _email_used_by_other_user(email, user_id):
    return bool(
        User.query
        .filter(User.email == email)
        .filter(User.id != user_id)
        .first()
    )


def _ensure_demo_folders(summary):
    folders = {}
    for path in [
        "Проекты",
        "Проекты/Модуль отчётности",
        "Управление",
        "Документы",
        "Трудозатраты",
    ]:
        folder, created = _get_or_create_folder_path(path)
        folders[path] = folder
        if created:
            summary["folders_created"] += 1

    return folders


def _get_or_create_folder_path(path):
    parent = None
    created_any = False

    for part in [segment.strip() for segment in path.split("/") if segment.strip()]:
        folder = Folder.query.filter(
            Folder.name == part,
            Folder.parent_id == (parent.id if parent else None),
        ).first()

        if not folder:
            folder = Folder(
                name=part,
                parent_id=parent.id if parent else None,
                created_at=DEMO_START,
                updated_at=DEMO_START,
            )
            db.session.add(folder)
            db.session.flush()
            created_any = True
        else:
            folder.updated_at = folder.updated_at or DEMO_START

        parent = folder

    return parent, created_any


def _ensure_demo_templates(summary):
    templates = {}

    for definition in TEMPLATE_DEFINITIONS:
        html = _build_template_html(definition)
        template = Template.query.filter(Template.title == definition["title"]).first()
        created = False

        if not template:
            template = Template(title=definition["title"])
            db.session.add(template)
            db.session.flush()
            created = True

        template.tag = definition["tag"]
        template.template_type = definition["template_type"]
        template.content_html = html
        template.content_json = _build_document_json(html)
        template.latex_template = _build_latex_template(definition["title"])
        template.created_at = template.created_at or definition["created_at"]
        template.updated_at = definition["created_at"].replace(hour=16)
        templates[definition["key"]] = template

        if created:
            summary["templates_created"] += 1
        else:
            summary["templates_updated"] += 1

    return templates


def _ensure_demo_groups(organization, users, summary):
    groups = {}
    group_specs = [
        {
            "key": "project_office",
            "name": "Проектный офис",
            "description": "Разработка архитектуры, реализация и сопровождение проектов автоматизации корпоративной отчётности.",
            "created_by": "owner",
            "members": ["owner", "gordienko", "agafonova"],
        },
        {
            "key": "leadership_hr",
            "name": "Руководство и HR",
            "description": "Согласование управленческой отчётности, кадровых вопросов и решений по развитию проектов.",
            "created_by": "leonidov",
            "members": ["leonidov", "gordienko", "bespalova"],
        },
    ]

    for spec in group_specs:
        group = UserGroup.query.filter(
            UserGroup.organization_id == organization.id,
            UserGroup.name == spec["name"],
        ).first()
        created = False

        if not group:
            group = UserGroup(
                organization_id=organization.id,
                name=spec["name"],
                created_at=datetime(2026, 6, 3, 10, 0, 0),
            )
            db.session.add(group)
            db.session.flush()
            created = True

        group.description = spec["description"]
        group.created_by = users[spec["created_by"]].id
        group.is_active = True
        group.updated_at = datetime(2026, 6, 3, 12, 0, 0)
        _replace_group_members(group, [users[key] for key in spec["members"]])
        groups[spec["key"]] = group

        if created:
            summary["groups_created"] += 1
        else:
            summary["groups_updated"] += 1

    return groups


def _replace_group_members(group, members):
    UserGroupMember.query.filter(UserGroupMember.group_id == group.id).delete(synchronize_session=False)

    for user in members:
        db.session.add(
            UserGroupMember(
                group_id=group.id,
                user_id=user.id,
                role="member",
                created_at=datetime(2026, 6, 3, 12, 30, 0),
            )
        )


def _ensure_demo_reports(users, folders, templates, summary):
    reports = {}

    for definition in REPORT_DEFINITIONS:
        template = templates[definition["template_key"]]
        folder = folders[definition["folder_path"]]
        author = users[definition["author_key"]]
        html = _build_report_html(definition, author, template)
        report = Report.query.filter(
            Report.report_title == definition["title"],
            Report.report_date == definition["date"],
        ).first()
        created = False

        if not report:
            report = Report(
                report_title=definition["title"],
                report_author=author.name or author.username,
                report_date=definition["date"],
                tag=definition["tag"],
                template_key=f"template:{template.id}",
                folder_id=folder.id,
                source_type="manual",
                source_filename="FT NET",
                created_at=definition["created_at"],
                updated_at=min(DEMO_END, definition["created_at"].replace(hour=18, minute=0)),
            )
            db.session.add(report)
            db.session.flush()
            created = True

        report.report_title = definition["title"]
        report.report_author = author.name or author.username
        report.report_date = definition["date"]
        report.tag = definition["tag"]
        report.template_key = f"template:{template.id}"
        report.folder_id = folder.id
        report.source_type = "manual"
        report.source_filename = "FT NET"
        report.created_at = report.created_at or definition["created_at"]
        report.updated_at = min(DEMO_END, definition["created_at"].replace(hour=18, minute=0))
        _ensure_report_draft(report, definition, template, folder, html)
        reports[definition["key"]] = report

        if created:
            summary["reports_created"] += 1
        else:
            summary["reports_updated"] += 1

    return reports


def _ensure_report_draft(report, definition, template, folder, html):
    draft = (
        ReportDraft.query
        .filter(ReportDraft.linked_report_id == report.id)
        .order_by(ReportDraft.id.asc())
        .first()
    )
    template_key = f"template:{template.id}"

    if not draft:
        draft = ReportDraft(
            report_title=report.report_title,
            report_date=report.report_date,
            tag=report.tag,
            template_key=template_key,
            template_title=template.title,
            folder_name=folder.name,
            access_placeholder="configured",
            linked_report_id=report.id,
            status="editing",
            created_at=report.created_at,
            updated_at=report.updated_at,
        )
        db.session.add(draft)
        db.session.flush()

    draft.report_title = report.report_title
    draft.report_date = report.report_date
    draft.tag = report.tag
    draft.template_key = template_key
    draft.template_title = template.title
    draft.folder_name = folder.name
    draft.access_placeholder = "configured"
    draft.status = "editing"
    draft.created_at = draft.created_at or report.created_at
    draft.updated_at = report.updated_at

    document_json = _build_document_json(html)
    state = ReportEditorState.query.filter(ReportEditorState.draft_id == draft.id).first()

    if not state:
        state = ReportEditorState(
            draft_id=draft.id,
            created_at=report.created_at,
        )
        db.session.add(state)

    state.document_html = html
    state.document_json = document_json
    state.updated_at = report.updated_at

    version = ReportVersion.query.filter(
        ReportVersion.draft_id == draft.id,
        ReportVersion.version_number == 1,
    ).first()
    snapshot = {
        "document_html": html,
        "document_json": json.loads(document_json),
        "report_title": report.report_title,
        "report_date": report.report_date.isoformat(),
    }

    if not version:
        version = ReportVersion(
            draft_id=draft.id,
            version_number=1,
            created_at=report.created_at,
        )
        db.session.add(version)

    version.snapshot_json = json.dumps(snapshot, ensure_ascii=False)


def _ensure_demo_taxonomy_options(organization):
    options = []

    for scope in ["template", "report"]:
        for index, name in enumerate(["Проекты", "Работы", "Трудозатраты", "Документы", "Риски", "Итоги"]):
            options.append((scope, "tag", name, index + 1))

    for index, name in enumerate([
        "Универсальный",
        "Статус-отчет",
        "Отчет о выполненных работах",
        "Сводный отчет",
        "Табличный отчет",
    ]):
        options.append(("template", "type", name, index + 1))

    for index, name in enumerate([
        "Универсальный отчет",
        "Статус-отчет",
        "Отчет о выполненных работах",
        "Сводный отчет",
        "Табличный отчет",
    ]):
        options.append(("report", "type", name, index + 1))

    for scope, option_type, name, sort_order in options:
        option = AdminTaxonomyOption.query.filter(
            AdminTaxonomyOption.organization_id == organization.id,
            AdminTaxonomyOption.scope == scope,
            AdminTaxonomyOption.option_type == option_type,
            AdminTaxonomyOption.name == name,
        ).first()

        if not option:
            option = AdminTaxonomyOption(
                organization_id=organization.id,
                scope=scope,
                option_type=option_type,
                name=name,
                created_at=DEMO_START,
            )
            db.session.add(option)

        option.sort_order = sort_order
        option.is_active = True
        option.updated_at = DEMO_START


def _ensure_demo_shared_access(users, groups, reports):
    project_report_keys = ["status_01_05", "work_done_01_07", "status_08_12"]
    management_report_keys = ["timesheet_01_07", "incoming_documents_01_10", "risk_report_12", "final_readiness"]

    for report_key in project_report_keys:
        _upsert_group_report_access(groups["project_office"], reports[report_key], "view")

    for report_key in management_report_keys:
        _upsert_group_report_access(groups["leadership_hr"], reports[report_key], "view")

    _upsert_report_share(reports["incoming_documents_01_10"], users["bespalova"], users["gordienko"], "view")
    _upsert_report_share(reports["final_readiness"], users["leonidov"], users["gordienko"], "view")


def _cleanup_legacy_demo_records(organization, users, summary):
    protected_user_ids = {user.id for user in users.values()}
    legacy_usernames = {"321", "4321", "admin", "test", "demo"}

    for user in (
        User.query
        .filter(User.organization_id == organization.id)
        .filter(User.is_active == 1)
        .filter(User.username.in_(legacy_usernames))
        .all()
    ):
        if user.id in protected_user_ids:
            continue

        if not _looks_like_legacy_demo_user(user):
            continue

        user.is_active = False
        user.updated_at = DEMO_END
        summary["legacy_users_deactivated"] += 1

    legacy_reports = Report.query.filter(Report.report_title.in_(["123", "тестовый отчёт", "тестовый отчет"])).all()
    for report in legacy_reports:
        _delete_report_tree(report)
        summary["legacy_reports_removed"] += 1

    legacy_templates = Template.query.filter(Template.title.in_(["123", "тестовый шаблон", "тестовый шаблон отчёта"])).all()
    for template in legacy_templates:
        _delete_template_tree(template)
        summary["legacy_templates_removed"] += 1


def _looks_like_legacy_demo_user(user):
    username = (user.username or "").strip().lower()
    email = (user.email or "").strip().lower()
    name = (user.name or "").strip().lower()

    if username in {"321", "4321"} and name in {username, "", "пользователь"}:
        return True

    if username in {"admin", "test", "demo"} and (
        email.endswith("@example.com")
        or email.endswith("@test.local")
        or name in {username, "", "администратор"}
    ):
        return True

    return False


def _delete_report_tree(report):
    if not report:
        return

    drafts = ReportDraft.query.filter(ReportDraft.linked_report_id == report.id).all()

    for draft in drafts:
        ReportEditorState.query.filter(ReportEditorState.draft_id == draft.id).delete(synchronize_session=False)
        ReportVersion.query.filter(ReportVersion.draft_id == draft.id).delete(synchronize_session=False)
        ImportedDataBlock.query.filter(ImportedDataBlock.draft_id == draft.id).delete(synchronize_session=False)
        ImportedSourceFile.query.filter(ImportedSourceFile.draft_id == draft.id).delete(synchronize_session=False)
        db.session.delete(draft)

    ReportShare.query.filter(ReportShare.report_id == report.id).delete(synchronize_session=False)
    GroupReportAccess.query.filter(GroupReportAccess.report_id == report.id).delete(synchronize_session=False)
    db.session.delete(report)


def _delete_template_tree(template):
    if not template:
        return

    template_key = f"template:{template.id}"
    has_report_references = Report.query.filter(Report.template_key == template_key).first()
    has_draft_references = ReportDraft.query.filter(ReportDraft.template_key == template_key).first()

    if has_report_references or has_draft_references:
        return

    Template.query.filter(Template.source_template_id == template.id).update({"source_template_id": None})
    GroupTemplateAccess.query.filter(GroupTemplateAccess.template_id == template.id).delete(synchronize_session=False)
    db.session.delete(template)


def _upsert_group_report_access(group, report, access_level):
    access = GroupReportAccess.query.filter(
        GroupReportAccess.group_id == group.id,
        GroupReportAccess.report_id == report.id,
    ).first()

    if not access:
        access = GroupReportAccess(
            group_id=group.id,
            report_id=report.id,
            created_at=DEMO_START,
        )
        db.session.add(access)

    access.access_level = access_level


def _upsert_report_share(report, user, creator, access_level):
    share = ReportShare.query.filter(
        ReportShare.report_id == report.id,
        ReportShare.user_id == user.id,
    ).first()

    if not share:
        share = ReportShare(
            report_id=report.id,
            user_id=user.id,
            created_at=DEMO_START,
        )
        db.session.add(share)

    share.created_by = creator.id
    share.access_level = access_level


def _build_template_html(definition):
    parts = [
        '<section class="editable-page" data-page="1">',
        f"<h1>{escape(definition['title'])}</h1>",
        '<p><strong>Дата отчёта:</strong> <span class="template-placeholder" contenteditable="false" data-field="report_date">Дата отчёта</span></p>',
        '<p><strong>Автор:</strong> <span class="template-placeholder" contenteditable="false" data-field="author">Автор</span></p>',
        '<p><strong>Тег:</strong> <span class="template-placeholder" contenteditable="false" data-field="tag">Тег</span></p>',
    ]

    for title, text in definition["sections"]:
        parts.append(f"<h2>{escape(title)}</h2>")
        parts.append(f"<p>{escape(text)}</p>")

    for table in definition["tables"]:
        parts.append(f"<h2>{escape(table['title'])}</h2>")
        parts.append(_build_table_html(table["headers"], table["rows"]))

    parts.append("</section>")
    return sanitize_editor_html("".join(parts))


def _build_report_html(definition, author, template):
    parts = [
        '<section class="editable-page" data-page="1">',
        f"<h1>{escape(definition['title'])}</h1>",
        "<table>",
        "<tbody>",
        _build_key_value_row("Дата отчёта", definition["date"].strftime("%d.%m.%Y")),
        _build_key_value_row("Тег", definition["tag"]),
        _build_key_value_row("Шаблон", template.title),
        _build_key_value_row("Автор", author.name or author.username),
        _build_key_value_row("Источник", "manual"),
        "</tbody>",
        "</table>",
    ]

    for title, content in definition["sections"]:
        parts.append(f"<h2>{escape(title)}</h2>")
        if isinstance(content, list):
            parts.append("<ul>")
            for item in content:
                parts.append(f"<li>{escape(item)}</li>")
            parts.append("</ul>")
        else:
            parts.append(f"<p>{escape(content)}</p>")

    for table in definition["tables"]:
        parts.append(f"<h2>{escape(table['title'])}</h2>")
        parts.append(_build_table_html(table["headers"], table["rows"]))

    parts.append("</section>")
    return sanitize_editor_html("".join(parts))


def _build_key_value_row(key, value):
    return "<tr><th>{0}</th><td>{1}</td></tr>".format(escape(key), escape(value or "—"))


def _build_table_html(headers, rows):
    html = ["<table><thead><tr>"]
    for header in headers:
        html.append(f"<th>{escape(str(header))}</th>")
    html.append("</tr></thead><tbody>")

    for row in rows:
        html.append("<tr>")
        for value in row:
            html.append(f"<td>{escape(str(value))}</td>")
        html.append("</tr>")

    html.append("</tbody></table>")
    return "".join(html)


def _build_document_json(html):
    return json.dumps(
        {
            "pages": [
                {
                    "page": 1,
                    "html": html,
                }
            ]
        },
        ensure_ascii=False,
    )


def _build_latex_template(title):
    safe_title = title.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
    return (
        "\\section*{{{0}}}\n"
        "\\textbf{{Дата отчёта:}} {{ report.report_date }}\\\\\n"
        "\\textbf{{Автор:}} {{ report.author }}\\\\\n"
        "\\textbf{{Тег:}} {{ report.tag }}\\\\\n"
        "{{ report.content }}\n"
    ).format(safe_title)
