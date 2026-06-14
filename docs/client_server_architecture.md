# Client-Server Architecture

Проект должен работать как клиент-серверное приложение: сервер выполняет тяжелую обработку и хранение, браузер выполняет интерактивный UI и локальное состояние.

## Backend

Backend выполняет:

- хранение отчетов и черновиков;
- хранение загруженных файлов;
- сканирование DOCX/PDF/XLSX/XLSM/CSV;
- разбиение импортированных данных на блоки;
- хранение порядка блоков и удаленных блоков;
- хранение состояния editor;
- сохранение версий отчета;
- подготовку данных для будущей генерации PDF/LaTeX.

HTML routes:

- `GET /`
- `GET /reports/<draft_id>/compose-preview`
- `GET /reports/<draft_id>/editor`

JSON API:

- `POST /api/reports/import/scan`
- `POST /api/reports/create`
- `GET /api/reports/<draft_id>/blocks`
- `PATCH /api/reports/<draft_id>/blocks/order`
- `PATCH /api/reports/blocks/<block_id>`
- `POST/PATCH/DELETE /api/reports/blocks/<block_id>/delete`
- `GET /api/reports/<draft_id>/editor-state`
- `PATCH /api/reports/<draft_id>/editor-state`
- `POST/PATCH /api/reports/<draft_id>/autosave`
- `POST /api/reports/<draft_id>/save-version`

Старые URL сохранены для совместимости текущих шаблонов и форм.

## Frontend

Frontend выполняет:

- показ dashboard;
- открытие/закрытие модальных окон;
- локальное состояние create modal;
- очередь импорта файлов;
- preview pagination;
- drag and drop блоков;
- локальный undo/redo;
- editor toolbar;
- editor ruler;
- table picker и resize таблиц;
- локальную историю editor;
- autosave с debounce.

## Frontend state

В `app/static/js/app.js` введены логические state-объекты:

- `appState` — текущая страница, активная модалка, общий UI.
- `importState` — очередь файлов, статус обработки, завершенные и ошибочные файлы.
- `previewState` — блоки, активный блок, undo/redo, dirty, debounce-сохранение порядка.
- `editorState` — активный лист, активный editable, dirty, typing/paginating/autosaving flags, undo/redo, current typing style.

Дальнейший этап — физически разнести эти состояния и функции по файлам `core`, `dashboard`, `create_report`, `preview`, `editor`.

## Import queue

Импорт работает последовательно:

1. Пользователь выбирает файлы.
2. Файлы добавляются в `importState.queue`.
3. Клиент отправляет один файл на `/api/reports/import/scan`.
4. Сервер сохраняет файл, сканирует его и возвращает `file_token` и blocks.
5. Клиент показывает loader/галочку.
6. Следующий файл отправляется только после завершения предыдущего.

Это защищает Flask-приложение от лишней параллельной нагрузки и сохраняет порядок файлов.

## Preview state

Preview рендерит блоки локально и выполняет операции delete/reorder без пересборки всего приложения. Undo/redo работает локальным стеком. Порядок блоков отправляется на сервер через debounce, чтобы не делать лишние запросы при каждой микроперестановке.

## Editor state

Editor — самая чувствительная часть. Правило:

`input` пользователя не равен `paginate + innerHTML rewrite`.

При вводе:

- браузер локально меняет contenteditable DOM;
- `editorState.dirty = true`;
- история сохраняется через debounce;
- autosave планируется через 2.5 секунды;
- pagination планируется только для крупных изменений и после паузы.

## Autosave

Autosave отправляет состояние editor на `/api/reports/<draft_id>/autosave`.

Payload:

```json
{
  "document_html": "...",
  "document_json": {
    "pages": []
  }
}
```

Autosave не запускается на каждый символ. Он срабатывает через debounce, на blur и перед уходом со страницы.

## Pagination debounce

Pagination может делать полную раскладку по A4-страницам, но не должна работать синхронно на каждый input. Она запускается через debounce и сохраняет caret marker перед пересборкой DOM. Если пользователь продолжает печатать, pagination откладывается.

Приоритет: стабильный ввод важнее идеальной live-pagination.

## Undo/Redo

Editor хранит snapshots страниц. Snapshot не сохраняется на каждый символ мгновенно; он сохраняется через debounce и после крупных действий: formatting, table insert/resize, ruler changes, orientation changes.

Preview хранит локальные действия delete/reorder. Undo/redo сначала меняет DOM локально, затем синхронизирует состояние с сервером.

## Почему нельзя пересчитывать документ после каждого input

Contenteditable зависит от текущего DOM node и selection range. Если после каждого символа выполнить `editorPages.innerHTML = ""`, браузер теряет text node, caret и focus. Это приводит к симптомам: один символ вводится, после него набор останавливается, пробел скроллит страницу, undo становится непредсказуемым.

## Ограничения текущего этапа

- JS еще физически не разделен на отдельные файлы, но в нем введены state-границы и API-границы.
- Editor state сохраняется как HTML/JSON snapshot, а не как полноценная document model.
- Live-pagination является MVP и должна уступать стабильности ввода.
- Alembic не подключен; новые таблицы создаются через `db.create_all()` при необходимости в development-режиме.
