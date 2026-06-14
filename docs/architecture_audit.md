# Architecture Audit

Проект является Flask-приложением для автоматического формирования отчетности. На момент аудита приложение уже разделяет часть обязанностей правильно: backend принимает файлы, сохраняет временные import payloads, сканирует DOCX/PDF/XLSX/XLSM/CSV и сохраняет черновики, источники и блоки в БД. Основная нестабильность находилась на frontend-стороне editor, где интерактивное редактирование, пагинация, toolbar, ruler, таблицы, preview, import queue, модальные окна и dashboard были собраны в одном `app/static/js/app.js`.

## Что сейчас делает backend

- `run.py` запускает Flask-приложение.
- `config.py` хранит настройки Flask, MySQL/PyMySQL, лимит загрузки и LaTeX compiler.
- `app/__init__.py` создает Flask app, подключает SQLAlchemy и blueprints.
- `app/models.py` хранит модели отчетов, импортированных документов, черновиков, исходных файлов и блоков.
- `app/report_routes.py` рендерит HTML-страницы dashboard, compose preview и editor, принимает импорт файлов, создает отчеты, удаляет/восстанавливает/переставляет блоки.
- `app/scanners/*` выполняют серверное считывание DOCX/PDF/XLSX/CSV в структурированные блоки.

## Что сейчас делает frontend

- Dashboard: поиск карточек, режим выделения, меню карточек, меню пользователя.
- Create modal: выбор шаблона, очередь файлов, последовательная отправка файлов на сервер.
- Preview: пагинация блоков по A4, drag and drop блоков, delete/restore, navigation panel, локальный undo/redo.
- Editor: contenteditable-листы, toolbar, ruler, table picker, table resize, ориентация страниц, история undo/redo.

## Главные архитектурные проблемы

1. `app/static/js/app.js` стал монолитом. В одном файле смешаны UI dashboard, import queue, preview blocks, editor, ruler, tables, modals, toast и API calls.
2. `app/report_routes.py` смешивал HTML routes и JSON operations. Старые URL возвращали JSON, но не было явного `/api/*` слоя.
3. Editor выполнял тяжелую операцию `paginateEditorContent()` после части input-событий. Эта функция делает `editorPages.innerHTML = ""`, заново создает страницы и переносит DOM nodes.
4. Полная пересборка editor DOM уничтожает активные text nodes и selection. Это приводило к потере caret/focus после ввода.
5. Preview pagination тоже делает `previewPages.innerHTML = ""`, но preview не является continuous typing surface, поэтому риск там ниже.
6. Preview reorder сохранялся сразу после операции. Для reorder это допустимо редко, но лучше использовать debounce/batch save.
7. Editor history snapshots сохранялись часто и локально, без серверного autosave.
8. Не было выделенной модели `ReportEditorState`, поэтому итоговое состояние browser editor не имело нормального server-side места хранения.

## Наиболее опасные участки

- `app/static/js/app.js`: `paginateEditorContent()` — полная пересборка editor страниц через `innerHTML`.
- `app/static/js/app.js`: editor `input` handlers — должны только помечать `dirty` и планировать отложенные операции.
- `app/static/js/app.js`: toolbar/ruler/table handlers — должны менять только локальный DOM и запускать autosave/pagination через debounce.
- `app/static/js/app.js`: `savePreviewOrder()` — должен отправлять порядок блоков пакетно/debounce.
- `app/report_routes.py`: HTML routes и JSON API должны быть явно разведены хотя бы на уровне URL.

## Что исправлено в этом этапе

- Добавлена документация аудита и целевой клиент-серверной архитектуры.
- Добавлена модель `ReportEditorState` для server-side autosave editor HTML/JSON.
- Добавлена модель `ReportVersion` для будущих версий отчета.
- Добавлены `/api/*` endpoints без удаления старых URL:
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
- В frontend введены `appState`, `importState`, `previewState`, `editorState`.
- Editor input больше не запускает полную пересборку DOM после каждого символа.
- Обычный ввод помечает editor как `dirty`, сохраняет локальную историю через debounce и запускает autosave через 2.5 секунды.
- Pagination editor запускается только отложенно и с сохранением caret marker.
- Preview reorder сохраняется через debounce.

## Целевая архитектура

Backend отвечает за данные, хранение, импорт, сканирование, нормализацию, блоки, черновики, editor-state и версии. Frontend отвечает за интерактивное состояние, локальный undo/redo, drag and drop, форматирование выделения, визуальный preview/editor и отложенное сохранение.

Ключевой принцип: ввод пользователя не должен быть триггером полной пересборки документа. Input должен быть легкой операцией: локально изменить DOM, поставить `dirty=true`, запланировать autosave и тяжелые пересчеты через debounce.

## Оставшиеся технические долги

- Физически разделить `app/static/js/app.js` на файлы `core`, `dashboard`, `create_report`, `preview`, `editor`.
- Вынести editor pagination, ruler, toolbar и tables в отдельные модули.
- Перевести create modal полностью на JSON payload `/api/reports/create`.
- Доработать миграции БД через Alembic или отдельный upgrade script.
- Улучшить document model editor, чтобы хранить не только HTML snapshot, но и блоковую JSON-структуру.
