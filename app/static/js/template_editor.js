document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    var root = document.querySelector("[data-template-editor-root]");
    var editPagesContainer = document.querySelector("[data-template-edit-pages]");
    var previewPagesContainer = document.querySelector("[data-template-preview-pages]");
    var legacyEditablePage = document.querySelector("[data-template-editable-page]");
    var editablePage = editPagesContainer || legacyEditablePage;
    var inlinePreview = previewPagesContainer || document.querySelector("[data-template-inline-preview]");
    var contentJsonSource = document.querySelector("[data-template-content-json]");
    var toolbar = document.querySelector("[data-template-toolbar]");
    var ruler = document.querySelector("[data-template-ruler]");
    var saveButton = document.querySelector("[data-template-save-button]");
    var saveStatus = document.querySelector("[data-template-save-status]");
    var titleInput = document.querySelector("[data-template-title]");
    var tagInput = document.querySelector("[data-template-tag]");
    var typeSelect = document.querySelector("[data-template-type]");
    var lockToggle = document.querySelector("[data-template-lock-toggle]");
    var handToggle = document.querySelector("[data-template-hand-toggle]");
    var fieldSearch = document.querySelector("[data-template-field-search]");
    var previewButton = document.querySelector("[data-template-preview]");
    var previewModal = document.querySelector("[data-template-preview-modal]");
    var previewDocument = document.querySelector("[data-template-preview-document]");
    var chipAddButton = document.querySelector("[data-template-add-chip]");
    var chipModal = document.querySelector("[data-template-chip-modal]");
    var chipNameInput = document.querySelector("[data-template-chip-name]");
    var chipBaseSelect = document.querySelector("[data-template-chip-base-select]");
    var chipBaseToggle = document.querySelector("[data-template-chip-base-toggle]");
    var chipBaseValue = document.querySelector("[data-template-chip-base-value]");
    var chipBaseDropdown = document.querySelector("[data-template-chip-base-dropdown]");
    var chipBaseSearch = document.querySelector("[data-template-chip-base-search]");
    var chipBaseOptions = document.querySelector("[data-template-chip-base-options]");
    var chipFavoritesList = document.querySelector("[data-template-favorites-list]");
    var chipCategoryPicker = document.querySelector("[data-template-chip-category-picker]");
    var chipCategoryToggle = document.querySelector("[data-template-chip-category-toggle]");
    var chipCategoryLabel = document.querySelector("[data-template-chip-category-label]");
    var chipCategorySearch = document.querySelector("[data-template-chip-category-search]");
    var chipCategoryMenu = document.querySelector("[data-template-chip-category-menu]");
    var chipSaveButton = document.querySelector("[data-template-chip-save]");
    var chipLatexInput = document.querySelector("[data-template-chip-latex]");
    var AUTOSAVE_DELAY = 60000;
    var PREVIEW_DELAY = 280;
    var TEMPLATE_PAGINATION_DELAY = 760;
    var TEMPLATE_FAST_PAGINATION_DELAY = 40;
    var ENABLE_DOCUMENT_PLACEHOLDER_MOVE = true;
    var ENABLE_TEMPLATE_PAGE_ARROW_NAVIGATION = false;
    var PARAMETER_MIME = "application/x-template-parameter";
    var PARAMETER_TEXT_PREFIX = "__template_parameter__:";
    var TEMP_DRAG_SELECTOR = ".template-drop-caret, .template-drag-ghost, .template-drop-marker, .template-lock-selection-rect, .template-hand-selection-rect, .template-hand-drag-ghost, .template-caret-probe, .drag-placeholder, .drag-helper";
    var SELECTION_MARKER_SELECTOR = "[data-template-selection-marker]";
    var LOCK_ZONE_SELECTOR = ".template-lock-zone";
    var LOCK_ZONE_OVERLAP_THRESHOLD = 0.35;
    var HAND_SELECTABLE_SELECTOR = [
        ".template-placeholder",
        ".template-word-object",
        ".template-page-break",
        "table",
        ".template-table",
        ".report-table",
        "img",
        "figure",
        ".template-image",
        ".template-graphic",
        ".template-module",
        ".template-object",
        ".template-widget",
        "[data-template-object=\"true\"]",
        "[data-object-id]"
    ].join(", ");
    var autosaveTimer = null;
    var previewTimer = null;
    var isDirty = false;
    var isSaving = false;
    var dirtyRevision = 0;
    var dropTargetDepth = 0;
    var activeDragButton = null;
    var activeDropPage = null;
    var draggingDocumentPlaceholder = null;
    var documentPlaceholderMoved = false;
    var dropCaret = null;
    var paginationTimer = null;
    var pendingPaginationContent = null;
    var pendingPaginationForce = false;
    var isPaginating = false;
    var isTemplateTyping = false;
    var templateTypingTimer = null;
    var isTemplateLockMode = false;
    var lockSelectionState = null;
    var lockSelectionRect = null;
    var isTemplateHandMode = false;
    var handSelectionState = null;
    var handSelectionRect = null;
    var handDragState = null;
    var handDragGhost = null;
    var selectedHandObjects = [];
    var activeChipMenu = null;
    var chipSettingsState = null;
    var customChipIdSeed = 0;
    var chipPanelControlsBound = false;
    var lockZoneIdSeed = 0;
    var templateLockZones = readInitialTemplateLockZones();
    var placeholderIdSeed = 0;
    var parameterGroupState = {};
    var editor = null;

    var TEMPLATE_PARAMETER_REGISTRY = {
        report_title: { label: "Название отчета", group: "basic", kind: "text", preview: "Тестовый отчет" },
        author: { label: "Автор", group: "basic", kind: "text", preview: "Пользователь" },
        report_date: { label: "Дата отчета", group: "basic", kind: "text", preview: "22.05.2026" },
        tag: { label: "Тег", group: "basic", kind: "text", preview: "Учебный" },
        report_type: { label: "Тип отчета", group: "basic", kind: "text", preview: "Универсальный отчет" },
        imported_paragraphs: { label: "Абзацы из файла", group: "imported", kind: "text", preview: "Тестовый абзац импортированных данных." },
        imported_tables: { label: "Таблицы из файла", group: "imported", kind: "table" },
        imported_headings: { label: "Заголовки из файла", group: "imported", kind: "text", preview: "Тестовый заголовок" },
        imported_lists: { label: "Списки из файла", group: "imported", kind: "list" },
        generated_at: { label: "Дата формирования", group: "system", kind: "text" },
        page_number: { label: "Номер страницы", group: "system", kind: "text", preview: "1" },
        template_title: { label: "Название шаблона", group: "system", kind: "text" },
        image: { label: "Изображение", group: "graphics", kind: "asset" },
        scheme: { label: "Схема", group: "graphics", kind: "asset" },
        chart: { label: "График", group: "graphics", kind: "asset" },
        diagram: { label: "Диаграмма", group: "graphics", kind: "asset" },
        data_table: { label: "Таблица", group: "data", kind: "table" },
        formula: { label: "Формула", group: "data", kind: "text", preview: "E = mc²" },
        summary_block: { label: "Сводный блок", group: "data", kind: "text", preview: "Сводный блок с тестовыми показателями." },
        value_list: { label: "Список значений", group: "data", kind: "list" },
        indent: { label: "Отступ", group: "utils", kind: "text", preview: "Отступ" },
        page_break: { label: "Разрыв страницы", group: "utils", kind: "page_break" },
        section_number: { label: "Номер раздела", group: "utils", kind: "text", preview: "1.1" },
        custom_placeholder: { label: "Пользовательский плейсхолдер", group: "utils", kind: "text", preview: "Пользовательское значение" }
    };
    var DEFAULT_TEMPLATE_CHIP_LATEX = {
        report_title: "{{ report_title|latex }}",
        author: "{{ author|latex }}",
        report_date: "{{ report_date|latex }}",
        tag: "{{ tag|latex }}",
        report_type: "{{ report_type|latex }}",
        imported_paragraphs: "{% for paragraph in imported_paragraphs %}\n{{ paragraph|latex }}\n\n{% endfor %}",
        imported_tables: "{% for table in imported_tables %}\n\\begin{tabular}{|{% for column in table.columns %}l|{% endfor %}}\n\\hline\n{% for row in table.rows %}{% for cell in row %}{{ cell|latex }}{% if not loop.last %} & {% endif %}{% endfor %} \\\\\n\\hline\n{% endfor %}\\end{tabular}\n{% endfor %}",
        imported_headings: "{% for heading in imported_headings %}\n\\section*{ {{ heading|latex }} }\n{% endfor %}",
        imported_lists: "\\begin{itemize}\n{% for item in imported_lists %}\\item {{ item|latex }}\n{% endfor %}\\end{itemize}",
        generated_at: "{{ generated_at|latex }}",
        page_number: "\\thepage",
        template_title: "{{ template_title|latex }}",
        image: "\\includegraphics[width=\\linewidth]{ {{ image_path }} }",
        scheme: "\\includegraphics[width=\\linewidth]{ {{ scheme_path }} }",
        chart: "\\includegraphics[width=\\linewidth]{ {{ chart_path }} }",
        diagram: "\\includegraphics[width=\\linewidth]{ {{ diagram_path }} }",
        data_table: "\\begin{tabular}{|{% for column in data_table.columns %}l|{% endfor %}}\n\\hline\n{% for row in data_table.rows %}{% for cell in row %}{{ cell|latex }}{% if not loop.last %} & {% endif %}{% endfor %} \\\\\n\\hline\n{% endfor %}\\end{tabular}",
        formula: "\\[ {{ formula }} \\]",
        summary_block: "\\begin{quote}\n{{ summary_block|latex }}\n\\end{quote}",
        value_list: "\\begin{itemize}\n{% for item in value_list %}\\item {{ item|latex }}\n{% endfor %}\\end{itemize}",
        indent: "\\hspace{1cm}",
        page_break: "\\newpage",
        section_number: "{{ section_number|latex }}",
        custom_placeholder: "{{ custom_placeholder|latex }}"
    };

    Object.keys(DEFAULT_TEMPLATE_CHIP_LATEX).forEach(function (field) {
        if (TEMPLATE_PARAMETER_REGISTRY[field]) {
            TEMPLATE_PARAMETER_REGISTRY[field].latex = DEFAULT_TEMPLATE_CHIP_LATEX[field];
        }
    });
    var templateChipConfigs = readInitialTemplateChipConfigs();
    var customTemplateChips = readInitialTemplateChips();
    var adminTemplateChips = [];
    var adminTemplateChipCategories = [];
    applyInitialTemplateChipState();
    var placeholderLabels = buildPlaceholderLabels();
    var placeholderFieldsByLabel = buildPlaceholderFieldsByLabel();

    if (!root || !editablePage || !window.DocumentEditorCore) {
        return;
    }

    document.body.classList.add("template-editor-mode");
    initializeTemplatePages();
    root.classList.toggle("is-document-placeholder-drag-disabled", !ENABLE_DOCUMENT_PLACEHOLDER_MOVE);
    cleanupTemplateDragArtifacts();
    hydrateLegacyPlaceholders();
    normalizeTemplatePlaceholders();
    stripTemplateElementLocks();
    renderTemplateLockZones();
    renderCustomTemplateChips();
    renderFavoriteTemplateChips();
    applyTemplateChipConfigurationsToPanel();
    initializeParameterGroups();
    loadTemplateChipSettings();

    editor = window.DocumentEditorCore.createEditor({
        root: root,
        editable: editablePage,
        toolbar: toolbar,
        ruler: ruler,
        historyLimit: 100,
        onChange: function (reason) {
            markTemplateDirty(reason);
        }
    });

    bindTemplateEditor();
    paginateTemplateEditor();
    updateTemplateSaveUI();
    updateTemplatePreview();

    window.markTemplateDirty = markTemplateDirty;
    window.saveTemplateDraft = saveTemplateDraft;
    window.scheduleTemplateAutosave = scheduleTemplateAutosave;
    window.updateTemplateSaveUI = updateTemplateSaveUI;
    window.updateTemplatePreview = updateTemplatePreview;
    window.scheduleTemplatePreviewUpdate = scheduleTemplatePreviewUpdate;
    window.renderPreviewFromTemplateHtml = renderPreviewFromTemplateHtml;
    window.paginateTemplateEditor = paginateTemplateEditor;

    function buildPlaceholderLabels() {
        var labels = {};

        Object.keys(TEMPLATE_PARAMETER_REGISTRY).forEach(function (field) {
            labels[field] = TEMPLATE_PARAMETER_REGISTRY[field].label;
        });

        return labels;
    }

    function buildPlaceholderFieldsByLabel() {
        var fields = {};

        Object.keys(TEMPLATE_PARAMETER_REGISTRY).forEach(function (field) {
            fields[normalizePlaceholderText(TEMPLATE_PARAMETER_REGISTRY[field].label)] = field;
        });

        return fields;
    }

    function getParameterDefinition(field) {
        return TEMPLATE_PARAMETER_REGISTRY[field] || null;
    }

    function getFieldByPlaceholderLabel(label) {
        return placeholderFieldsByLabel[normalizePlaceholderText(label)] || "";
    }

    function normalizePlaceholderText(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function readTemplateContentJson() {
        if (!contentJsonSource || !contentJsonSource.value || !contentJsonSource.value.trim()) {
            return {};
        }

        try {
            return JSON.parse(contentJsonSource.value) || {};
        } catch (error) {
            return {};
        }
    }

    function readInitialTemplateChips() {
        var parsed = readTemplateContentJson();
        var chips = [];

        if (Array.isArray(parsed.customChips)) {
            chips = parsed.customChips;
        } else if (parsed.chipsConfig && Array.isArray(parsed.chipsConfig.customChips)) {
            chips = parsed.chipsConfig.customChips;
        }

        return chips.map(function (chip) {
            return normalizeTemplateChip(chip, { isCustom: true });
        }).filter(Boolean);
    }

    function readInitialTemplateChipConfigs() {
        var parsed = readTemplateContentJson();
        var rawConfig = parsed.chipsConfig || {};
        var fields = rawConfig.fields || rawConfig.fieldConfigs || {};
        var configs = {};

        Object.keys(fields).forEach(function (field) {
            var config = normalizeTemplateChip(fields[field], {
                field: field,
                allowMissingLabel: true
            });

            if (config) {
                configs[field] = config;
            }
        });

        return configs;
    }

    function normalizeTemplateChip(chip, options) {
        var field;
        var label;
        var definition;

        options = options || {};

        if (!chip) {
            return null;
        }

        field = chip.field || options.field || chip.id || "";
        label = chip.label || chip.title || "";

        if (!field && label) {
            field = createCustomChipField(label);
        }

        if (!field || (!label && !options.allowMissingLabel)) {
            return null;
        }

        definition = TEMPLATE_PARAMETER_REGISTRY[field] || {};

        return {
            id: chip.id || field,
            field: field,
            label: label || definition.label || field,
            group: chip.group === "favorite" ? "custom" : (chip.group || definition.group || "custom"),
            kind: chip.kind || definition.kind || "text",
            basedOn: chip.basedOn || chip.based_on || "",
            latex: chip.latex || chip.latex_markup || definition.latex || "",
            isFavorite: Boolean(chip.isFavorite || chip.is_favorite),
            isCustom: Boolean(options.isCustom || chip.isCustom || chip.is_custom || !definition.label)
        };
    }

    function applyInitialTemplateChipState() {
        Object.keys(templateChipConfigs).forEach(function (field) {
            var config = templateChipConfigs[field];
            var definition = TEMPLATE_PARAMETER_REGISTRY[field];

            if (!definition || !config) {
                return;
            }

            if (config.label) {
                definition.label = config.label;
            }

            definition.group = config.group || definition.group;
            definition.kind = config.kind || definition.kind;
            definition.basedOn = config.basedOn || "";
            definition.latex = config.latex || definition.latex || "";
            definition.isFavorite = Boolean(config.isFavorite);
        });

        registerCustomTemplateChips(customTemplateChips);
    }

    function registerCustomTemplateChips(chips) {
        chips.forEach(function (chip) {
            if (!chip || !chip.field) {
                return;
            }

            TEMPLATE_PARAMETER_REGISTRY[chip.field] = {
                label: chip.label,
                group: chip.group || "custom",
                kind: chip.kind || "text",
                preview: chip.label,
                basedOn: chip.basedOn || "",
                latex: chip.latex || "",
                isFavorite: Boolean(chip.isFavorite),
                isCustom: true
            };
        });
    }

    function loadTemplateChipSettings() {
        fetch("/api/template-chip-settings", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Не удалось загрузить настройки чипов.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyTemplateChipSettingsFromServer(data.settings || {});
            })
            .catch(function () {
                adminTemplateChips = [];
                adminTemplateChipCategories = [];
            });
    }

    function applyTemplateChipSettingsFromServer(settings) {
        adminTemplateChipCategories = (settings.categories || []).map(function (category) {
            return {
                key: category.key || "",
                label: category.name || category.key || "",
                description: category.description || "",
                sortOrder: Number(category.sort_order || 0)
            };
        }).filter(function (category) {
            return Boolean(category.key && category.label);
        });

        adminTemplateChips = (settings.chips || []).map(function (chip) {
            return normalizeTemplateChip({
                id: chip.field,
                field: chip.field,
                label: chip.label,
                group: chip.group || chip.category_key || "custom",
                kind: chip.kind || "text",
                basedOn: chip.basedOn || chip.based_on || "",
                latex: chip.latex || chip.latex_markup || "",
                isFavorite: Boolean(chip.isFavorite || chip.is_favorite),
                isCustom: true
            }, { isCustom: true });
        }).filter(Boolean);

        registerCustomTemplateChips(adminTemplateChips);
        refreshTemplatePlaceholderMaps();
        renderCustomTemplateChips();
        renderFavoriteTemplateChips();
        applyTemplateChipConfigurationsToPanel();
        bindTemplateParameterButtons();
        enhanceTemplateChipPanel();
        filterParameterButtons();
    }

    function refreshTemplatePlaceholderMaps() {
        placeholderLabels = buildPlaceholderLabels();
        placeholderFieldsByLabel = buildPlaceholderFieldsByLabel();
    }

    function initializeTemplatePages() {
        var initialPages;

        if (!editPagesContainer) {
            return;
        }

        initialPages = readInitialTemplatePages();
        editPagesContainer.innerHTML = "";

        if (!initialPages.length) {
            initialPages.push({ html: "" });
        }

        initialPages.forEach(function (page, index) {
            editPagesContainer.appendChild(createTemplateEditPage(page.html, index));
        });

        updateTemplatePageNumbers();
        renderTemplateLockZones();
    }

    function readInitialTemplatePages() {
        var jsonPages = parseTemplatePagesJson(contentJsonSource ? contentJsonSource.value : "");
        var htmlPages;
        var currentHtml = legacyEditablePage ? legacyEditablePage.innerHTML : "";

        if (jsonPages.length) {
            return jsonPages;
        }

        htmlPages = splitTemplateHtmlIntoPages(currentHtml);

        return htmlPages.map(function (html) {
            return { html: html };
        });
    }

    function parseTemplatePagesJson(raw) {
        var parsed;

        if (!raw || !raw.trim()) {
            return [];
        }

        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return [];
        }

        if (!parsed || !Array.isArray(parsed.pages)) {
            return [];
        }

        return parsed.pages.map(function (page) {
            return { html: normalizeInitialPageHtml(page && page.html ? page.html : "") };
        }).filter(function (page) {
            return page.html || parsed.pages.length === 1;
        });
    }

    function readInitialTemplateLockZones() {
        var parsed;

        if (!contentJsonSource || !contentJsonSource.value || !contentJsonSource.value.trim()) {
            return [];
        }

        try {
            parsed = JSON.parse(contentJsonSource.value);
        } catch (error) {
            return [];
        }

        if (!parsed || !Array.isArray(parsed.lockZones)) {
            return [];
        }

        return parsed.lockZones.map(normalizeTemplateLockZone).filter(Boolean);
    }

    function normalizeTemplateLockZone(zone) {
        var pageIndex;
        var x;
        var y;
        var width;
        var height;

        if (!zone) {
            return null;
        }

        pageIndex = parseInt(zone.pageIndex, 10);
        x = parseFloat(zone.x);
        y = parseFloat(zone.y);
        width = parseFloat(zone.width);
        height = parseFloat(zone.height);

        if (!isFinite(pageIndex) || pageIndex < 0 || !isFinite(x) || !isFinite(y) || !isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
            return null;
        }

        return {
            id: zone.id || createTemplateLockZoneId(),
            pageIndex: pageIndex,
            x: Math.max(0, x),
            y: Math.max(0, y),
            width: Math.max(1, width),
            height: Math.max(1, height)
        };
    }

    function splitTemplateHtmlIntoPages(html) {
        var holder;
        var pageNodes;
        var contentNodes;

        if (!html) {
            return [""];
        }

        holder = document.createElement("div");
        holder.innerHTML = html;
        cleanupTemplateDragArtifactsFrom(holder);

        pageNodes = holder.querySelectorAll("[data-template-page]");

        if (pageNodes.length) {
            return Array.prototype.map.call(pageNodes, function (node) {
                var content = node.querySelector("[data-template-page-content]");
                return normalizeInitialPageHtml(content ? content.innerHTML : node.innerHTML);
            });
        }

        contentNodes = holder.querySelectorAll("[data-template-page-content]");

        if (contentNodes.length) {
            return Array.prototype.map.call(contentNodes, function (node) {
                return normalizeInitialPageHtml(node.innerHTML);
            });
        }

        return [normalizeInitialPageHtml(html)];
    }

    function normalizeInitialPageHtml(html) {
        var holder = document.createElement("div");

        holder.innerHTML = html || "";
        cleanupTemplateDragArtifactsFrom(holder);
        cleanupTemplateHandArtifactsFrom(holder);
        unwrapNestedEditorSheets(holder);
        stripTemplateElementLocks(holder);
        return holder.innerHTML;
    }

    function bindTemplateEditor() {
        if (saveButton) {
            saveButton.addEventListener("click", function () {
                saveTemplateDraft("manual");
            });
        }

        [titleInput, tagInput, typeSelect].forEach(function (control) {
            if (!control) {
                return;
            }

            control.addEventListener("input", function () {
                markTemplateDirty("metadata");
            });
            control.addEventListener("change", function () {
                markTemplateDirty("metadata");
            });
        });

        bindTemplateParameterButtons();
        initializeChipPanelControls();

        bindTemplateContentInputTracking();
        bindTemplateLockMode();
        bindTemplateHandMode();
        bindTemplateLockedEditingGuard();
        bindTemplateDropZone();
        bindDocumentPlaceholderDragGuard();
        bindTemplateArrowNavigation();

        if (ENABLE_TEMPLATE_PAGE_ARROW_NAVIGATION) {
            bindTemplatePageKeyboardNavigation();
        }

        if (fieldSearch) {
            fieldSearch.addEventListener("input", filterParameterButtons);
        }

        if (inlinePreview) {
            inlinePreview.addEventListener("mousedown", function (event) {
                event.stopPropagation();
            });
        }

        if (previewButton) {
            previewButton.addEventListener("click", openTemplatePreview);
        }

        document.querySelectorAll("[data-template-preview-close]").forEach(function (button) {
            button.addEventListener("click", closeTemplatePreview);
        });

        if (previewModal) {
            previewModal.addEventListener("click", function (event) {
                if (event.target === previewModal) {
                    closeTemplatePreview();
                }
            });
        }

        document.addEventListener("keydown", function (event) {
            var key = String(event.key || "").toLowerCase();

            if ((event.ctrlKey || event.metaKey) && key === "s") {
                event.preventDefault();
                saveTemplateDraft("manual");
            }

            if (event.key === "Escape" && previewModal && previewModal.classList.contains("is-open")) {
                closeTemplatePreview();
            }

            if (event.key === "Escape") {
                if (isTemplateLockMode) {
                    setTemplateLockMode(false);
                }
                if (isTemplateHandMode) {
                    clearTemplateHandSelection();
                    clearTemplateHandSelectionRect();
                    clearTemplateHandDragState();
                }
                clearTemplateDragState();
                clearTemplateLockSelection();
            }
        });

        window.addEventListener("beforeunload", function () {
            if (isDirty && !isSaving) {
                saveTemplateDraft("exit", { silent: true, keepalive: true });
            }
        });
    }

    function bindTemplateContentInputTracking() {
        if (!editablePage) {
            return;
        }

        editablePage.addEventListener("input", function (event) {
            var content = event.target && event.target.closest ? event.target.closest("[data-template-page-content]") : null;
            var inputType = event.inputType || "";

            if (!content || !editablePage.contains(content)) {
                return;
            }

            isTemplateTyping = true;
            window.clearTimeout(templateTypingTimer);
            templateTypingTimer = window.setTimeout(function () {
                isTemplateTyping = false;
            }, 650);

            if (shouldPaginateForTemplateInput(inputType)) {
                scheduleTemplatePagination(content, { force: true, fast: true });
            }
        });
    }

    function bindTemplateLockMode() {
        if (lockToggle) {
            lockToggle.addEventListener("click", function () {
                setTemplateLockMode(!isTemplateLockMode);
            });
        }

        editablePage.addEventListener("mousedown", function (event) {
            var content;
            var zone;

            if (!isTemplateLockMode || event.button !== 0) {
                return;
            }

            zone = event.target && event.target.closest ? event.target.closest(LOCK_ZONE_SELECTOR) : null;

            if (zone && editablePage.contains(zone)) {
                event.preventDefault();
                event.stopPropagation();
                removeTemplateLockZone(zone.dataset.lockZoneId || "");
                return;
            }

            content = event.target && event.target.closest ? event.target.closest("[data-template-page-content]") : null;

            if (!content || !editablePage.contains(content)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            startTemplateLockSelection(event, content);
        });

        document.addEventListener("mousemove", updateTemplateLockSelection);
        document.addEventListener("mouseup", finishTemplateLockSelection);
    }

    function bindTemplateHandMode() {
        if (handToggle) {
            handToggle.addEventListener("click", function () {
                setTemplateHandMode(!isTemplateHandMode);
            });
        }

        editablePage.addEventListener("mousedown", function (event) {
            var selectedObject;
            var content;

            if (!isTemplateHandMode || event.button !== 0) {
                return;
            }

            selectedObject = event.target && event.target.closest ? event.target.closest(".template-object-selected") : null;

            if (selectedObject && editablePage.contains(selectedObject)) {
                event.preventDefault();
                event.stopPropagation();
                startTemplateHandDrag(event);
                return;
            }

            content = event.target && event.target.closest ? event.target.closest("[data-template-page-content]") : null;

            if (!content || !editablePage.contains(content)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            startTemplateHandSelection(event, content);
        });

        document.addEventListener("mousemove", function (event) {
            updateTemplateHandSelection(event);
            updateTemplateHandDrag(event);
        });
        document.addEventListener("mouseup", function (event) {
            finishTemplateHandSelection(event);
            finishTemplateHandDrag(event);
        });
    }

    function setTemplateHandMode(isActive) {
        isTemplateHandMode = Boolean(isActive);

        if (isTemplateHandMode && isTemplateLockMode) {
            setTemplateLockMode(false);
        }

        root.classList.toggle("is-template-hand-mode", isTemplateHandMode);

        if (handToggle) {
            handToggle.classList.toggle("is-active", isTemplateHandMode);
            handToggle.setAttribute("aria-pressed", isTemplateHandMode ? "true" : "false");
        }

        if (isTemplateHandMode) {
            wrapTemplateWordsForHandMode();
        } else {
            clearTemplateHandSelection();
            clearTemplateHandSelectionRect();
            clearTemplateHandDragState();
            unwrapTemplateWordObjects(editablePage);
        }
    }

    function wrapTemplateWordsForHandMode(scope) {
        var target = scope || editablePage;
        var textNodes = [];

        if (!target || !target.querySelectorAll || !document.createTreeWalker) {
            return;
        }

        getTemplatePageContentsFromScope(target).forEach(function (content) {
            var walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
            var node;

            while ((node = walker.nextNode())) {
                if (shouldWrapTemplateTextNode(node)) {
                    textNodes.push(node);
                }
            }
        });

        textNodes.forEach(wrapTemplateTextNodeAsWords);
    }

    function getTemplatePageContentsFromScope(scope) {
        if (!scope) {
            return [];
        }

        if (scope.matches && scope.matches("[data-template-page-content]")) {
            return [scope];
        }

        if (scope === editablePage) {
            return getTemplatePageContents();
        }

        return Array.prototype.slice.call(scope.querySelectorAll("[data-template-page-content], .template-page-content"));
    }

    function shouldWrapTemplateTextNode(textNode) {
        var parent = textNode ? textNode.parentNode : null;

        if (!textNode || !textNode.nodeValue || !/\S/.test(textNode.nodeValue) || !parent || parent.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        return !parent.closest(".template-word-object, .template-placeholder, .template-placeholder-handle, .template-placeholder-label, .template-page-break, .template-lock-layer, .template-lock-zone, .template-hand-selection-rect, .template-lock-selection-rect, .template-drop-caret, .template-drag-ghost, .template-drop-marker, .template-hand-drag-ghost, [contenteditable=\"false\"]");
    }

    function wrapTemplateTextNodeAsWords(textNode) {
        var parts = (textNode.nodeValue || "").match(/\s+|\S+/g);
        var fragment;

        if (!parts || !textNode.parentNode) {
            return;
        }

        fragment = document.createDocumentFragment();
        parts.forEach(function (part) {
            var word;

            if (/^\s+$/.test(part)) {
                fragment.appendChild(document.createTextNode(part));
                return;
            }

            word = document.createElement("span");
            word.className = "template-word-object";
            word.dataset.templateWordObject = "";
            word.contentEditable = "false";
            word.textContent = part;
            fragment.appendChild(word);
        });

        textNode.parentNode.replaceChild(fragment, textNode);
    }

    function unwrapTemplateWordObjects(scope) {
        var target = scope || editablePage;
        var parents = [];

        if (!target || !target.querySelectorAll) {
            return;
        }

        Array.prototype.slice.call(target.querySelectorAll(".template-word-object")).forEach(function (word) {
            var parent = word.parentNode;
            var textNode;

            if (!parent) {
                return;
            }

            textNode = document.createTextNode(word.textContent || "");
            parent.replaceChild(textNode, word);

            if (parents.indexOf(parent) === -1) {
                parents.push(parent);
            }
        });

        parents.forEach(function (parent) {
            if (parent && parent.normalize) {
                parent.normalize();
            }
        });
    }

    function startTemplateHandSelection(event, content) {
        var page = content.closest("[data-template-edit-page]");

        if (!page) {
            return;
        }

        handSelectionState = {
            startX: event.clientX,
            startY: event.clientY,
            currentX: event.clientX,
            currentY: event.clientY,
            content: content,
            page: page
        };

        clearTemplateHandSelection();
        ensureTemplateHandSelectionRect();
        updateTemplateHandSelectionRect();
    }

    function updateTemplateHandSelection(event) {
        if (!handSelectionState) {
            return;
        }

        handSelectionState.currentX = event.clientX;
        handSelectionState.currentY = event.clientY;
        updateTemplateHandSelectionRect();
    }

    function finishTemplateHandSelection(event) {
        var rect;
        var objects;

        if (!handSelectionState) {
            return;
        }

        handSelectionState.currentX = event.clientX;
        handSelectionState.currentY = event.clientY;
        rect = getTemplateHandSelectionRect();
        objects = getTemplateHandObjectsInRect(rect);
        clearTemplateHandSelectionRect();

        if (objects.length) {
            setTemplateHandSelectedObjects(objects);
        } else {
            clearTemplateHandSelection();
        }
    }

    function ensureTemplateHandSelectionRect() {
        if (handSelectionRect) {
            return handSelectionRect;
        }

        handSelectionRect = document.createElement("div");
        handSelectionRect.className = "template-hand-selection-rect";
        document.body.appendChild(handSelectionRect);
        return handSelectionRect;
    }

    function updateTemplateHandSelectionRect() {
        var rect = getTemplateHandSelectionRect();

        ensureTemplateHandSelectionRect();
        handSelectionRect.style.left = Math.round(rect.left) + "px";
        handSelectionRect.style.top = Math.round(rect.top) + "px";
        handSelectionRect.style.width = Math.round(rect.width) + "px";
        handSelectionRect.style.height = Math.round(rect.height) + "px";
        handSelectionRect.classList.add("is-visible");
    }

    function getTemplateHandSelectionRect() {
        var left = Math.min(handSelectionState.startX, handSelectionState.currentX);
        var right = Math.max(handSelectionState.startX, handSelectionState.currentX);
        var top = Math.min(handSelectionState.startY, handSelectionState.currentY);
        var bottom = Math.max(handSelectionState.startY, handSelectionState.currentY);

        return {
            left: left,
            right: right,
            top: top,
            bottom: bottom,
            width: Math.max(1, right - left),
            height: Math.max(1, bottom - top)
        };
    }

    function clearTemplateHandSelectionRect() {
        handSelectionState = null;

        if (handSelectionRect) {
            handSelectionRect.classList.remove("is-visible");
            removeNode(handSelectionRect);
            handSelectionRect = null;
        }
    }

    function getTemplateHandObjectsInRect(selectionRect) {
        return getTemplateHandSelectableObjects().filter(function (node) {
            return doesViewportRectIntersect(selectionRect, node.getBoundingClientRect()) && !doesTemplateObjectIntersectLockZone(node);
        });
    }

    function getTemplateHandSelectableObjects() {
        var nodes = [];
        var seen = [];

        getTemplatePageContents().forEach(function (content) {
            Array.prototype.forEach.call(content.querySelectorAll(HAND_SELECTABLE_SELECTOR), function (node) {
                if (seen.indexOf(node) !== -1 || !isTopLevelTemplateHandObject(node, content)) {
                    return;
                }

                seen.push(node);
                nodes.push(node);
            });
        });

        return nodes;
    }

    function isTopLevelTemplateHandObject(node, content) {
        var parent = node.parentElement;

        while (parent && parent !== content) {
            if (parent.matches && parent.matches(HAND_SELECTABLE_SELECTOR)) {
                return false;
            }

            parent = parent.parentElement;
        }

        return true;
    }

    function setTemplateHandSelectedObjects(objects) {
        clearTemplateHandSelection();
        selectedHandObjects = objects.filter(function (node) {
            return node && editablePage.contains(node);
        });
        selectedHandObjects.forEach(function (node) {
            node.classList.add("template-object-selected");
        });
    }

    function clearTemplateHandSelection() {
        selectedHandObjects.forEach(function (node) {
            if (node && node.classList) {
                node.classList.remove("template-object-selected", "template-object-dragging");
            }
        });
        selectedHandObjects = [];
    }

    function startTemplateHandDrag(event) {
        var lockedObject = selectedHandObjects.filter(doesTemplateObjectIntersectLockZone)[0];

        if (!selectedHandObjects.length) {
            return;
        }

        if (lockedObject) {
            flashTemplateLockZoneForObject(lockedObject);
            return;
        }

        handDragState = {
            startX: event.clientX,
            startY: event.clientY,
            currentX: event.clientX,
            currentY: event.clientY,
            nodes: selectedHandObjects.slice()
        };

        selectedHandObjects.forEach(function (node) {
            node.classList.add("template-object-dragging");
        });
        updateTemplateHandDragGhost(event);
    }

    function updateTemplateHandDrag(event) {
        if (!handDragState) {
            return;
        }

        handDragState.currentX = event.clientX;
        handDragState.currentY = event.clientY;
        updateTemplateHandDragGhost(event);
    }

    function finishTemplateHandDrag(event) {
        var moved;

        if (!handDragState) {
            return;
        }

        moved = moveTemplateHandSelectionAtDrop(event.clientX, event.clientY);
        clearTemplateHandDragState();

        if (moved) {
            clearTemplateHandSelection();
        }
    }

    function updateTemplateHandDragGhost(event) {
        if (!handDragGhost) {
            handDragGhost = document.createElement("div");
            handDragGhost.className = "template-hand-drag-ghost";
            document.body.appendChild(handDragGhost);
        }

        handDragGhost.textContent = selectedHandObjects.length + " объект(ов)";
        handDragGhost.style.left = Math.round(event.clientX + 14) + "px";
        handDragGhost.style.top = Math.round(event.clientY + 14) + "px";
        handDragGhost.classList.add("is-visible");
    }

    function clearTemplateHandDragState() {
        selectedHandObjects.forEach(function (node) {
            if (node && node.classList) {
                node.classList.remove("template-object-dragging");
            }
        });

        handDragState = null;

        if (handDragGhost) {
            removeNode(handDragGhost);
            handDragGhost = null;
        }
    }

    function moveTemplateHandSelectionAtDrop(clientX, clientY) {
        var content = getTemplatePageContentFromPoint(clientX, clientY);
        var range;
        var marker;
        var movedNodes;
        var lastInserted = null;

        if (!content || !handDragState || !handDragState.nodes.length) {
            return false;
        }

        range = getDropRange(clientX, clientY) || createEndRange(content);

        if (!range || isRangeInsideAnyNode(range, handDragState.nodes)) {
            return false;
        }

        if (editor && typeof editor.markCheckpoint === "function") {
            editor.markCheckpoint();
        }

        marker = document.createElement("span");
        marker.className = "template-drop-marker";
        marker.dataset.templateDropMarker = "";
        marker.contentEditable = "false";

        try {
            range = range.cloneRange();
            range.collapse(true);
            range.insertNode(marker);

            if (!marker.parentNode) {
                return false;
            }

            movedNodes = handDragState.nodes.filter(function (node) {
                return node && editablePage.contains(node) && !node.contains(marker);
            });

            movedNodes.forEach(function (node) {
                removeTemplateTrailingSpacer(node);
                node.classList.remove("template-object-selected", "template-object-dragging");
                marker.parentNode.insertBefore(node, marker);
                lastInserted = node;

                if (node.classList.contains("template-placeholder")) {
                    marker.parentNode.insertBefore(document.createTextNode("\u00a0"), marker);
                } else if (node.classList.contains("template-word-object")) {
                    marker.parentNode.insertBefore(document.createTextNode(" "), marker);
                }
            });

            if (!movedNodes.length) {
                return false;
            }

            setCaretAfterNode(lastInserted);
            normalizeTemplatePlaceholders();
            paginateTemplateEditor(getTemplatePageContentForNode(lastInserted) || content);
            markTemplateDirty("hand-move");

            if (editor && typeof editor.markCheckpoint === "function") {
                editor.markCheckpoint();
            }

            return true;
        } catch (error) {
            return false;
        } finally {
            removeNode(marker);
        }
    }

    function isRangeInsideAnyNode(range, nodes) {
        return nodes.some(function (node) {
            return isRangeInsideNode(range, node);
        });
    }

    function doesViewportRectIntersect(a, b) {
        return Boolean(a && b && b.width > 0 && b.height > 0 &&
            a.left <= b.right &&
            a.right >= b.left &&
            a.top <= b.bottom &&
            a.bottom >= b.top);
    }

    function doesTemplateObjectIntersectLockZone(node) {
        var page = getTemplateEditPageForNode(node);
        var pageIndex = getTemplateEditPages().indexOf(page);

        return Boolean(node && node.getBoundingClientRect && doesViewportRectIntersectTemplateLockZones(node.getBoundingClientRect(), pageIndex, page));
    }

    function flashTemplateLockZoneForObject(node) {
        var page = getTemplateEditPageForNode(node);
        var pageIndex = getTemplateEditPages().indexOf(page);
        var hit = node && node.getBoundingClientRect ? getFirstTemplateLockZoneHit([node.getBoundingClientRect()], pageIndex, page) : null;
        var zoneNode = hit ? editablePage.querySelector("[data-lock-zone-id=\"" + hit.id + "\"]") : null;

        if (!zoneNode) {
            return;
        }

        zoneNode.classList.add("is-flashing");
        window.setTimeout(function () {
            zoneNode.classList.remove("is-flashing");
        }, 420);
    }

    function bindTemplateLockedEditingGuard() {
        editablePage.addEventListener("beforeinput", function (event) {
            if (isTemplateLockMode || isTemplateEditBlocked(event)) {
                event.preventDefault();
                flashTemplateLockZoneFromSelectionOrEvent(event);
            }
        }, true);

        editablePage.addEventListener("paste", function (event) {
            if (isTemplateLockMode || isTemplateEditBlocked(event)) {
                event.preventDefault();
                flashTemplateLockZoneFromSelectionOrEvent(event);
            }
        }, true);

        editablePage.addEventListener("keydown", function (event) {
            if (isTemplateLockMode && isPotentialTemplateEditingKey(event)) {
                event.preventDefault();
                return;
            }

            if (isTemplateEditBlocked(event)) {
                event.preventDefault();
                flashTemplateLockZoneFromSelectionOrEvent(event);
            }
        }, true);

        if (toolbar) {
            ["click", "change", "input"].forEach(function (eventName) {
                toolbar.addEventListener(eventName, function (event) {
                    if (event.target && event.target.closest && event.target.closest("[data-template-title], [data-template-tag], [data-template-type]")) {
                        return;
                    }

                    if (!isSelectionTouchingTemplateLockZone()) {
                        return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    flashTemplateLockZoneFromSelectionOrEvent(event);
                }, true);
            });
        }
    }

    function setTemplateLockMode(isActive) {
        isTemplateLockMode = Boolean(isActive);

        if (isTemplateLockMode && isTemplateHandMode) {
            setTemplateHandMode(false);
        }

        root.classList.toggle("is-template-lock-mode", isTemplateLockMode);

        if (lockToggle) {
            lockToggle.classList.toggle("is-active", isTemplateLockMode);
            lockToggle.setAttribute("aria-pressed", isTemplateLockMode ? "true" : "false");
        }

        if (!isTemplateLockMode) {
            clearTemplateLockSelection();
        }
    }

    function startTemplateLockSelection(event, content) {
        var page = content.closest("[data-template-edit-page]");

        if (!page) {
            return;
        }

        lockSelectionState = {
            startX: event.clientX,
            startY: event.clientY,
            currentX: event.clientX,
            currentY: event.clientY,
            content: content,
            page: page
        };

        ensureTemplateLockSelectionRect();
        updateTemplateLockSelectionRect();
    }

    function updateTemplateLockSelection(event) {
        if (!lockSelectionState) {
            return;
        }

        lockSelectionState.currentX = event.clientX;
        lockSelectionState.currentY = event.clientY;
        updateTemplateLockSelectionRect();
    }

    function finishTemplateLockSelection(event) {
        var rect;
        var changed;

        if (!lockSelectionState) {
            return;
        }

        lockSelectionState.currentX = event.clientX;
        lockSelectionState.currentY = event.clientY;
        rect = getTemplateLockSelectionRect();

        if (editor && typeof editor.markCheckpoint === "function") {
            editor.markCheckpoint();
        }

        changed = toggleTemplateLockZone(rect);
        clearTemplateLockSelection();

        if (changed) {
            markTemplateDirty("lock");

            if (editor && typeof editor.markCheckpoint === "function") {
                editor.markCheckpoint();
            }
        }
    }

    function ensureTemplateLockSelectionRect() {
        if (lockSelectionRect) {
            return lockSelectionRect;
        }

        lockSelectionRect = document.createElement("div");
        lockSelectionRect.className = "template-lock-selection-rect";
        document.body.appendChild(lockSelectionRect);
        return lockSelectionRect;
    }

    function updateTemplateLockSelectionRect() {
        var rect = getTemplateLockSelectionRect();

        ensureTemplateLockSelectionRect();
        lockSelectionRect.style.left = Math.round(rect.left) + "px";
        lockSelectionRect.style.top = Math.round(rect.top) + "px";
        lockSelectionRect.style.width = Math.round(rect.width) + "px";
        lockSelectionRect.style.height = Math.round(rect.height) + "px";
        lockSelectionRect.classList.add("is-visible");
    }

    function getTemplateLockSelectionRect() {
        var left = Math.min(lockSelectionState.startX, lockSelectionState.currentX);
        var right = Math.max(lockSelectionState.startX, lockSelectionState.currentX);
        var top = Math.min(lockSelectionState.startY, lockSelectionState.currentY);
        var bottom = Math.max(lockSelectionState.startY, lockSelectionState.currentY);

        return {
            left: left,
            right: right,
            top: top,
            bottom: bottom,
            width: Math.max(1, right - left),
            height: Math.max(1, bottom - top)
        };
    }

    function clearTemplateLockSelection() {
        lockSelectionState = null;

        if (lockSelectionRect) {
            lockSelectionRect.classList.remove("is-visible");
            removeNode(lockSelectionRect);
            lockSelectionRect = null;
        }
    }

    function toggleTemplateLockZone(selectionRect) {
        var zone = createTemplateLockZoneFromViewportRect(selectionRect);
        var removed;

        if (!zone || zone.width < 4 || zone.height < 4) {
            return false;
        }

        removed = removeIntersectingTemplateLockZones(zone);

        if (removed) {
            renderTemplateLockZones();
            return true;
        }

        templateLockZones.push(zone);
        renderTemplateLockZones();
        return true;
    }

    function createTemplateLockZoneFromViewportRect(selectionRect) {
        var pages = getTemplateEditPages();
        var page = lockSelectionState ? lockSelectionState.page : null;
        var pageIndex = pages.indexOf(page);
        var pageRect;
        var left;
        var top;
        var right;
        var bottom;

        if (!page || pageIndex === -1) {
            return null;
        }

        pageRect = page.getBoundingClientRect();
        left = Math.max(selectionRect.left, pageRect.left);
        top = Math.max(selectionRect.top, pageRect.top);
        right = Math.min(selectionRect.right, pageRect.right);
        bottom = Math.min(selectionRect.bottom, pageRect.bottom);

        if (right <= left || bottom <= top) {
            return null;
        }

        return {
            id: createTemplateLockZoneId(),
            pageIndex: pageIndex,
            x: left - pageRect.left,
            y: top - pageRect.top,
            width: right - left,
            height: bottom - top
        };
    }

    function removeIntersectingTemplateLockZones(zone) {
        var beforeLength = templateLockZones.length;

        templateLockZones = templateLockZones.filter(function (existingZone) {
            if (existingZone.pageIndex !== zone.pageIndex) {
                return true;
            }

            return getTemplateLockZoneOverlapRatio(existingZone, zone) < LOCK_ZONE_OVERLAP_THRESHOLD;
        });

        return beforeLength !== templateLockZones.length;
    }

    function removeTemplateLockZone(zoneId) {
        var beforeLength;

        if (!zoneId) {
            return false;
        }

        beforeLength = templateLockZones.length;
        templateLockZones = templateLockZones.filter(function (zone) {
            return zone.id !== zoneId;
        });

        if (beforeLength === templateLockZones.length) {
            return false;
        }

        renderTemplateLockZones();
        markTemplateDirty("lock");
        return true;
    }

    function getTemplateLockZoneOverlapRatio(a, b) {
        var intersection = getTemplateLockZoneIntersectionArea(a, b);
        var minArea = Math.min(a.width * a.height, b.width * b.height);

        return minArea > 0 ? intersection / minArea : 0;
    }

    function getTemplateLockZoneIntersectionArea(a, b) {
        var left = Math.max(a.x, b.x);
        var right = Math.min(a.x + a.width, b.x + b.width);
        var top = Math.max(a.y, b.y);
        var bottom = Math.min(a.y + a.height, b.y + b.height);

        if (right <= left || bottom <= top) {
            return 0;
        }

        return (right - left) * (bottom - top);
    }

    function createTemplateLockZoneId() {
        lockZoneIdSeed += 1;
        return "lock_" + Date.now().toString(36) + "_" + lockZoneIdSeed.toString(36);
    }

    function isTemplateEditBlocked(event) {
        if (!event || !editablePage.contains(event.target)) {
            return false;
        }

        if (isSelectionTouchingTemplateLockZone()) {
            return true;
        }

        return isCollapsedSelectionAdjacentToLockZone(event.key || "");
    }

    function isSelectionTouchingTemplateLockZone() {
        var selection = window.getSelection();
        var range;
        var pageContent;
        var page;
        var pageIndex;
        var rects;

        if (!selection || selection.rangeCount === 0) {
            return false;
        }

        range = selection.getRangeAt(0);
        pageContent = getTemplatePageContentForNode(range.commonAncestorContainer);

        if (!pageContent || !editablePage.contains(pageContent)) {
            return false;
        }

        page = pageContent.closest("[data-template-edit-page]");
        pageIndex = getTemplateEditPages().indexOf(page);
        rects = getTemplateSelectionRects(range, page);

        return rects.some(function (rect) {
            return doesViewportRectIntersectTemplateLockZones(rect, pageIndex, page);
        });
    }

    function isCollapsedSelectionAdjacentToLockZone(key) {
        var selection = window.getSelection();
        var range;
        var adjacent;
        var page;
        var pageIndex;

        if ((key !== "Backspace" && key !== "Delete") || !selection || selection.rangeCount === 0 || !selection.isCollapsed) {
            return false;
        }

        range = selection.getRangeAt(0);

        if (!editablePage.contains(range.commonAncestorContainer)) {
            return false;
        }

        adjacent = key === "Backspace" ? getAdjacentNodeForRange(range, "previous") : getAdjacentNodeForRange(range, "next");
        page = getTemplateEditPageForNode(adjacent);
        pageIndex = getTemplateEditPages().indexOf(page);

        if (!adjacent || pageIndex === -1 || !adjacent.getBoundingClientRect) {
            return false;
        }

        return doesViewportRectIntersectTemplateLockZones(adjacent.getBoundingClientRect(), pageIndex, page);
    }

    function getAdjacentNodeForRange(range, direction) {
        var container = range.startContainer;
        var offset = range.startOffset;
        var node;

        if (container.nodeType === Node.TEXT_NODE) {
            if ((direction === "previous" && offset > 0) || (direction === "next" && offset < container.nodeValue.length)) {
                return null;
            }

            node = container;
        } else {
            node = direction === "previous" ? container.childNodes[offset - 1] : container.childNodes[offset];

            if (node) {
                return direction === "previous" ? getDeepestLastNode(node) : getDeepestFirstNode(node);
            }
        }

        while (node && node !== editablePage) {
            if (direction === "previous" && node.previousSibling) {
                return getDeepestLastNode(node.previousSibling);
            }

            if (direction === "next" && node.nextSibling) {
                return getDeepestFirstNode(node.nextSibling);
            }

            node = node.parentNode;
        }

        return null;
    }

    function getDeepestFirstNode(node) {
        while (node && node.firstChild) {
            node = node.firstChild;
        }

        return node;
    }

    function getDeepestLastNode(node) {
        while (node && node.lastChild) {
            node = node.lastChild;
        }

        return node;
    }

    function isPotentialTemplateEditingKey(event) {
        if (!event || event.ctrlKey || event.metaKey || event.altKey) {
            return false;
        }

        return event.key === "Backspace" ||
            event.key === "Delete" ||
            event.key === "Enter" ||
            event.key === "Tab" ||
            String(event.key || "").length === 1;
    }

    function getTemplateSelectionRects(range, page) {
        var rects = Array.prototype.slice.call(range.getClientRects ? range.getClientRects() : []);
        var caretRect;
        var fallback;

        rects = rects.filter(function (rect) {
            return rect.width > 0 || rect.height > 0;
        });

        if (rects.length) {
            return rects;
        }

        if (range.collapsed) {
            caretRect = getTemplateMeasuredCaretRect(range);

            if (caretRect) {
                return [caretRect];
            }
        }

        fallback = range.getBoundingClientRect ? range.getBoundingClientRect() : null;

        if (fallback && (fallback.width > 0 || fallback.height > 0)) {
            return [fallback];
        }

        return [getTemplateCaretFallbackRect(range, page)].filter(Boolean);
    }

    function getTemplateMeasuredCaretRect(range) {
        var probe = document.createElement("span");
        var probeRange = range.cloneRange();
        var rect;

        probe.className = "template-caret-probe";
        probe.textContent = "\u200b";
        probe.style.display = "inline-block";
        probe.style.width = "1px";
        probe.style.height = "1em";
        probe.style.lineHeight = "1";
        probe.style.pointerEvents = "none";

        try {
            probeRange.insertNode(probe);
            rect = probe.getBoundingClientRect();
        } catch (error) {
            rect = null;
        } finally {
            removeNode(probe);
        }

        if (!rect || (!rect.width && !rect.height)) {
            return null;
        }

        return rect;
    }

    function getTemplateCaretFallbackRect(range, page) {
        var container = range ? range.startContainer : null;
        var element = container && container.nodeType === Node.ELEMENT_NODE ? container : (container ? container.parentNode : null);
        var rect;
        var pageRect;

        if (!element || !element.getBoundingClientRect) {
            return null;
        }

        rect = element.getBoundingClientRect();
        pageRect = page ? page.getBoundingClientRect() : rect;

        return {
            left: Math.max(pageRect.left, rect.left),
            right: Math.max(pageRect.left + 1, rect.left + 1),
            top: rect.top,
            bottom: rect.bottom || rect.top + 18,
            width: 1,
            height: Math.max(18, rect.height || 18)
        };
    }

    function doesViewportRectIntersectTemplateLockZones(viewportRect, pageIndex, page) {
        var pageRect;
        var rect;

        if (!viewportRect || pageIndex < 0 || !page) {
            return false;
        }

        pageRect = page.getBoundingClientRect();
        rect = {
            x: viewportRect.left - pageRect.left,
            y: viewportRect.top - pageRect.top,
            width: Math.max(1, viewportRect.width || (viewportRect.right - viewportRect.left) || 1),
            height: Math.max(1, viewportRect.height || (viewportRect.bottom - viewportRect.top) || 1)
        };

        return templateLockZones.some(function (zone) {
            return zone.pageIndex === pageIndex && getTemplateLockZoneIntersectionArea(zone, rect) > 0;
        });
    }

    function flashTemplateLockZoneFromSelectionOrEvent(event) {
        var zoneId = getFirstIntersectingTemplateLockZoneId(event);
        var zoneNode;

        if (!zoneId) {
            return;
        }

        zoneNode = editablePage.querySelector("[data-lock-zone-id=\"" + zoneId + "\"]");

        if (!zoneNode) {
            return;
        }

        zoneNode.classList.add("is-flashing");
        window.setTimeout(function () {
            zoneNode.classList.remove("is-flashing");
        }, 420);
    }

    function getFirstIntersectingTemplateLockZoneId(event) {
        var selection = window.getSelection();
        var range;
        var pageContent;
        var page;
        var pageIndex;
        var rects;
        var hit;

        if (selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            pageContent = getTemplatePageContentForNode(range.commonAncestorContainer);

            if (pageContent) {
                page = pageContent.closest("[data-template-edit-page]");
                pageIndex = getTemplateEditPages().indexOf(page);
                rects = getTemplateSelectionRects(range, page);
                hit = getFirstTemplateLockZoneHit(rects, pageIndex, page);

                if (hit) {
                    return hit.id;
                }
            }
        }

        if (event && event.target && event.target.getBoundingClientRect) {
            page = getTemplateEditPageForNode(event.target);
            pageIndex = getTemplateEditPages().indexOf(page);
            hit = getFirstTemplateLockZoneHit([event.target.getBoundingClientRect()], pageIndex, page);
            return hit ? hit.id : "";
        }

        return "";
    }

    function getFirstTemplateLockZoneHit(viewportRects, pageIndex, page) {
        var pageRect;
        var rects;

        if (!page || pageIndex < 0) {
            return null;
        }

        pageRect = page.getBoundingClientRect();
        rects = viewportRects.map(function (viewportRect) {
            return {
                x: viewportRect.left - pageRect.left,
                y: viewportRect.top - pageRect.top,
                width: Math.max(1, viewportRect.width || (viewportRect.right - viewportRect.left) || 1),
                height: Math.max(1, viewportRect.height || (viewportRect.bottom - viewportRect.top) || 1)
            };
        });

        return templateLockZones.filter(function (zone) {
            return zone.pageIndex === pageIndex;
        }).filter(function (zone) {
            return rects.some(function (rect) {
                return getTemplateLockZoneIntersectionArea(zone, rect) > 0;
            });
        })[0] || null;
    }

    function bindTemplateParameterButton(button) {
        if (button.dataset.templateChipBound === "true") {
            return;
        }

        button.dataset.templateChipBound = "true";
        button.draggable = true;
        button.setAttribute("draggable", "true");

        button.addEventListener("click", function () {
            var parameter = getParameterDataFromButton(button);
            insertTemplatePlaceholder(parameter.field, parameter.label, {
                source: "click",
                group: parameter.group,
                kind: parameter.kind
            });
        });

        button.addEventListener("dragstart", function (event) {
            var parameter = getParameterDataFromButton(button);
            var serialized = JSON.stringify(parameter);

            activeDragButton = button;
            button.classList.add("is-dragging");

            if (editor) {
                editor.saveSelection();
            }

            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData(PARAMETER_MIME, serialized);
                event.dataTransfer.setData("text/plain", PARAMETER_TEXT_PREFIX + serialized);
            }
        });

        button.addEventListener("dragend", function () {
            clearTemplateDragState();
        });
    }

    function bindDocumentPlaceholderDragGuard() {
        editablePage.addEventListener("dragstart", function (event) {
            var handle = event.target.closest(".template-placeholder-handle");
            var placeholder = handle ? handle.closest(".template-placeholder") : event.target.closest(".template-placeholder, .template-page-break");
            var parameter;
            var serialized;

            if (!placeholder || !editablePage.contains(placeholder)) {
                return;
            }

            if (!ENABLE_DOCUMENT_PLACEHOLDER_MOVE) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (!handle || !placeholder.classList.contains("template-placeholder")) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            parameter = getParameterDataFromDocumentPlaceholder(placeholder);
            serialized = JSON.stringify(parameter);
            draggingDocumentPlaceholder = placeholder;
            documentPlaceholderMoved = false;
            placeholder.classList.add("is-dragging");

            if (editor) {
                editor.saveSelection();
            }

            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(PARAMETER_MIME, serialized);
                event.dataTransfer.setData("text/plain", PARAMETER_TEXT_PREFIX + serialized);
            }

            event.stopPropagation();
        });

        editablePage.addEventListener("dragend", function () {
            clearTemplateDragState();
        });
    }

    function bindTemplateDropZone() {
        editablePage.addEventListener("dragenter", function (event) {
            var page = getTemplateEditPageFromEvent(event);

            if (!isTemplateParameterDrag(event) || !page) {
                return;
            }

            event.preventDefault();
            dropTargetDepth += 1;
            setActiveDropPage(page);
        });

        editablePage.addEventListener("dragover", function (event) {
            var page;
            var range;

            if (!isTemplateParameterDrag(event)) {
                return;
            }

            page = getTemplateEditPageFromPoint(event.clientX, event.clientY) || getTemplateEditPageFromEvent(event);

            if (!page) {
                return;
            }

            event.preventDefault();

            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = draggingDocumentPlaceholder ? "move" : "copy";
            }

            setActiveDropPage(page);
            range = getRangeFromPoint(event.clientX, event.clientY);
            updateTemplateDropCaret(range, event);
        });

        editablePage.addEventListener("dragleave", function (event) {
            if (!isTemplateParameterDrag(event)) {
                return;
            }

            if (event.relatedTarget && editablePage.contains(event.relatedTarget)) {
                return;
            }

            dropTargetDepth = Math.max(0, dropTargetDepth - 1);

            if (dropTargetDepth === 0) {
                clearActiveDropPage();
                hideTemplateDropCaret();
            }
        });

        editablePage.addEventListener("drop", function (event) {
            var parameter = getParameterDataFromTransfer(event.dataTransfer);

            if (!parameter || !parameter.field) {
                clearTemplateDragState();
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (parameter.source === "document") {
                if (ENABLE_DOCUMENT_PLACEHOLDER_MOVE) {
                    moveTemplateParameterAtDrop(event, parameter);
                }
            } else {
                insertTemplateParameterAtDrop(event, parameter);
            }

            clearTemplateDragState();
        });

        if (inlinePreview) {
            ["dragenter", "dragover", "drop"].forEach(function (eventName) {
                inlinePreview.addEventListener(eventName, function (event) {
                    if (!isTemplateParameterDrag(event)) {
                        return;
                    }

                    event.preventDefault();
                    event.stopPropagation();

                    if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = "none";
                    }
                });
            });
        }
    }

    function bindTemplateArrowNavigation() {
        editablePage.addEventListener("keydown", handleTemplateArrowNavigation);
    }

    function handleTemplateArrowNavigation(event) {
        var selection;
        var currentPage;
        var before;

        if (event.defaultPrevented || !isTemplateArrowNavigationKey(event.key)) {
            return;
        }

        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
            return;
        }

        selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
            return;
        }

        currentPage = getActiveTemplatePage();

        if (!currentPage) {
            return;
        }

        before = captureTemplateSelectionSnapshot(selection);

        window.requestAnimationFrame(function () {
            var afterSelection = window.getSelection();
            var afterPage;
            var after;

            if (!afterSelection || afterSelection.rangeCount === 0 || !afterSelection.isCollapsed) {
                return;
            }

            afterPage = getActiveTemplatePage();

            if (afterPage !== currentPage) {
                return;
            }

            after = captureTemplateSelectionSnapshot(afterSelection);

            if (!isSameTemplateSelectionSnapshot(before, after)) {
                return;
            }

            if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                moveCaretToNextTemplatePage(currentPage);
            } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                moveCaretToPreviousTemplatePage(currentPage);
            }
        });
    }

    function isTemplateArrowNavigationKey(key) {
        return key === "ArrowDown" ||
            key === "ArrowUp" ||
            key === "ArrowLeft" ||
            key === "ArrowRight";
    }

    function bindTemplatePageKeyboardNavigation() {
        if (!ENABLE_TEMPLATE_PAGE_ARROW_NAVIGATION) {
            return;
        }

        editablePage.addEventListener("keydown", function (event) {
            var key = event.key;
            var selection;
            var range;
            var content;

            if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
                return;
            }

            if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "ArrowRight" && key !== "ArrowLeft") {
                return;
            }

            selection = window.getSelection();

            if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
                return;
            }

            range = selection.getRangeAt(0);
            content = getTemplatePageContentForNode(range.commonAncestorContainer);

            if (!content) {
                return;
            }

            if ((key === "ArrowDown" || key === "ArrowRight") && isRangeAtTemplatePageEdge(content, range, "end")) {
                if (moveCaretToNextTemplatePage()) {
                    event.preventDefault();
                }
                return;
            }

            if ((key === "ArrowUp" || key === "ArrowLeft") && isRangeAtTemplatePageEdge(content, range, "start")) {
                if (moveCaretToPreviousTemplatePage()) {
                    event.preventDefault();
                }
            }
        });
    }

    function initializeParameterGroups() {
        document.querySelectorAll("[data-placeholder-group]").forEach(function (group) {
            var key = group.dataset.parameterGroup || "";
            var isOpen = group.dataset.defaultOpen === "true";
            var toggle = group.querySelector("[data-parameter-group-toggle]");

            parameterGroupState[key] = isOpen;
            setParameterGroupOpen(group, isOpen);

            if (toggle) {
                toggle.addEventListener("click", function () {
                    parameterGroupState[key] = !parameterGroupState[key];
                    setParameterGroupOpen(group, parameterGroupState[key]);
                });
            }
        });
    }

    function bindTemplateParameterButtons() {
        document.querySelectorAll("[data-placeholder-field]").forEach(bindTemplateParameterButton);
    }

    function initializeChipPanelControls() {
        enhanceTemplateChipPanel();

        if (!chipPanelControlsBound) {
            chipPanelControlsBound = true;

            if (chipAddButton) {
                chipAddButton.addEventListener("click", function () {
                    openTemplateChipSettings(null);
                });
            }

            if (chipModal) {
                chipModal.addEventListener("click", function (event) {
                    if (event.target === chipModal) {
                        closeTemplateChipSettings();
                    }
                });
            }

            document.querySelectorAll("[data-template-chip-cancel]").forEach(function (button) {
                button.addEventListener("click", closeTemplateChipSettings);
            });

            if (chipSaveButton) {
                chipSaveButton.addEventListener("click", saveTemplateChipSettings);
            }

            if (chipBaseToggle) {
                chipBaseToggle.addEventListener("click", function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleTemplateChipBaseDropdown();
                });
            }

            if (chipBaseSearch) {
                chipBaseSearch.addEventListener("input", function () {
                    renderTemplateChipBaseOptions(chipBaseSearch.value);
                });
            }

            if (chipCategoryToggle) {
                chipCategoryToggle.addEventListener("click", function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    openTemplateChipCategorySearch();
                });
            }

            if (chipCategorySearch) {
                chipCategorySearch.addEventListener("click", function (event) {
                    event.stopPropagation();
                });
                chipCategorySearch.addEventListener("input", function () {
                    renderTemplateChipCategoryMenu(chipCategorySearch.value);
                });
            }

            document.addEventListener("click", function (event) {
                if (activeChipMenu && (!activeChipMenu.contains(event.target))) {
                    closeTemplateChipMenu();
                }

                if (chipBaseDropdown && !chipBaseDropdown.hidden && chipBaseSelect && !chipBaseSelect.contains(event.target)) {
                    closeTemplateChipBaseDropdown();
                }

                if (chipCategoryPicker && chipCategoryPicker.classList.contains("is-searching") && !chipCategoryPicker.contains(event.target)) {
                    closeTemplateChipCategorySearch();
                }
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape") {
                    closeTemplateChipMenu();
                    closeTemplateChipBaseDropdown();
                    if (chipCategoryPicker && chipCategoryPicker.classList.contains("is-searching")) {
                        closeTemplateChipCategorySearch();
                        return;
                    }
                    if (chipModal && chipModal.classList.contains("is-open")) {
                        closeTemplateChipSettings();
                    }
                }
            });
        }
    }

    function enhanceTemplateChipPanel() {
        document.querySelectorAll(".template-placeholder-buttons > button[data-placeholder-field]").forEach(function (button) {
            var wrapper;

            if (button.parentNode && button.parentNode.classList && button.parentNode.classList.contains("template-chip-item")) {
                updateTemplateChipButtonFromRegistry(button);
                return;
            }

            wrapper = document.createElement("span");
            wrapper.className = "template-chip-item";
            button.parentNode.insertBefore(wrapper, button);
            wrapper.appendChild(button);
            button.classList.add("template-chip-main-button");
            wrapper.appendChild(createTemplateChipActionButton(button));
            updateTemplateChipButtonFromRegistry(button);
        });
    }

    function createTemplateChipActionButton(chipButton) {
        var button = document.createElement("button");

        button.className = "template-chip-action-button";
        button.type = "button";
        button.draggable = false;
        button.setAttribute("aria-label", "Действия чипа");
        button.setAttribute("title", "Действия чипа");
        button.textContent = "⋯";

        button.addEventListener("mousedown", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });

        button.addEventListener("dragstart", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });

        button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            openTemplateChipMenu(button, chipButton);
        });

        return button;
    }

    function updateTemplateChipButtonFromRegistry(button) {
        var field = button.dataset.placeholderField || "";
        var definition = getParameterDefinition(field) || {};
        var config = templateChipConfigs[field] || {};
        var label = config.label || definition.label || button.dataset.placeholderLabel || button.textContent.trim();
        var wrapper = button.closest ? button.closest(".template-chip-item") : null;
        var isFavorite = Boolean(config.isFavorite || definition.isFavorite);

        button.dataset.placeholderLabel = label;
        button.dataset.placeholderKind = config.kind || definition.kind || button.dataset.placeholderKind || "text";
        button.textContent = label;
        button.title = label;

        if (wrapper) {
            wrapper.classList.toggle("is-favorite", isFavorite);
            wrapper.dataset.chipField = field;
        }
    }

    function openTemplateChipMenu(anchor, chipButton) {
        var menu;
        var rect;
        var parameter = getParameterDataFromButton(chipButton);
        var isFavorite = isTemplateChipFavorite(parameter.field);

        closeTemplateChipMenu();

        menu = document.createElement("div");
        menu.className = "template-chip-menu";
        menu.innerHTML = [
            '<button type="button" data-chip-menu-favorite>',
            '<span class="template-chip-menu-star" aria-hidden="true">' + (isFavorite ? "★" : "☆") + '</span>',
            '<span>' + (isFavorite ? "Убрать из избранного" : "Избранное") + '</span>',
            '</button>',
            '<button type="button" data-chip-menu-configure><span>Настроить</span></button>'
        ].join("");

        document.body.appendChild(menu);
        rect = anchor.getBoundingClientRect();
        menu.style.left = Math.round(rect.right - menu.offsetWidth) + "px";
        menu.style.top = Math.round(rect.bottom + 6) + "px";

        menu.querySelector("[data-chip-menu-favorite]").addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            toggleTemplateChipFavorite(parameter.field);
            closeTemplateChipMenu();
        });

        menu.querySelector("[data-chip-menu-configure]").addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            closeTemplateChipMenu();
            openTemplateChipSettings(parameter);
        });

        activeChipMenu = menu;
    }

    function closeTemplateChipMenu() {
        if (activeChipMenu && activeChipMenu.parentNode) {
            activeChipMenu.parentNode.removeChild(activeChipMenu);
        }

        activeChipMenu = null;
    }

    function isTemplateChipFavorite(field) {
        var definition = getParameterDefinition(field) || {};
        var config = templateChipConfigs[field] || {};

        return Boolean(config.isFavorite || definition.isFavorite);
    }

    function toggleTemplateChipFavorite(field) {
        var definition = getParameterDefinition(field) || {};
        var config = templateChipConfigs[field] || {
            field: field,
            label: definition.label || field,
            group: definition.group || "custom",
            kind: definition.kind || "text",
            isCustom: Boolean(getCustomTemplateChip(field))
        };

        config.isFavorite = !Boolean(config.isFavorite || definition.isFavorite);
        config.isCustom = Boolean(config.isCustom || getCustomTemplateChip(field));
        templateChipConfigs[field] = normalizeTemplateChip(config, {
            field: field,
            allowMissingLabel: true
        });

        if (definition) {
            definition.isFavorite = config.isFavorite;
        }

        syncCustomChipFromConfig(field);
        renderFavoriteTemplateChips();
        bindTemplateParameterButtons();
        enhanceTemplateChipPanel();
        applyTemplateChipConfigurationsToPanel();
        markTemplateDirty("chip-config");
    }

    function openTemplateChipSettings(parameter) {
        var config;

        if (!chipModal || !chipNameInput) {
            return;
        }

        parameter = parameter || null;
        config = parameter ? getTemplateChipSettings(parameter.field) : null;
        chipSettingsState = {
            mode: parameter ? "edit" : "create",
            field: parameter ? parameter.field : "",
            group: config ? config.group : "custom",
            targetCategory: config ? config.group : "custom",
            basedOn: config ? config.basedOn : "",
            latex: config ? config.latex || "" : "",
            isFavorite: config ? Boolean(config.isFavorite) : true,
            kind: config ? config.kind : "text"
        };

        chipNameInput.value = config ? config.label : "";
        if (chipLatexInput) {
            chipLatexInput.value = config ? config.latex || "" : "";
        }
        updateTemplateChipBaseValue();
        updateTemplateChipCategoryLabel();
        renderTemplateChipBaseOptions("");
        renderTemplateChipCategoryMenu("");
        closeTemplateChipBaseDropdown();
        closeTemplateChipCategorySearch();

        chipModal.classList.add("is-open");
        chipModal.setAttribute("aria-hidden", "false");
        window.setTimeout(function () {
            chipNameInput.focus();
        }, 0);
    }

    function closeTemplateChipSettings() {
        chipSettingsState = null;
        closeTemplateChipBaseDropdown();
        closeTemplateChipCategorySearch();

        if (chipModal) {
            chipModal.classList.remove("is-open");
            chipModal.setAttribute("aria-hidden", "true");
        }
    }

    function getTemplateChipSettings(field) {
        var definition = getParameterDefinition(field) || {};
        var config = templateChipConfigs[field] || {};

        return {
            field: field,
            label: config.label || definition.label || field,
            group: config.group || definition.group || "custom",
            kind: config.kind || definition.kind || "text",
            basedOn: config.basedOn || definition.basedOn || "",
            latex: config.latex || definition.latex || "",
            isFavorite: Boolean(config.isFavorite || definition.isFavorite),
            isCustom: Boolean(definition.isCustom || getCustomTemplateChip(field))
        };
    }

    function saveTemplateChipSettings() {
        var label = chipNameInput ? chipNameInput.value.trim() : "";
        var field;
        var chip;

        if (!chipSettingsState) {
            return;
        }

        if (!label) {
            showToast("Введите название чипа", "warning");
            if (chipNameInput) {
                chipNameInput.focus();
            }
            return;
        }

        field = chipSettingsState.mode === "edit" && chipSettingsState.field ?
            chipSettingsState.field :
            createUniqueCustomChipField(label);

        chip = normalizeTemplateChip({
            id: field,
            field: field,
            label: label,
            group: getTemplateChipSaveGroup(),
            kind: chipSettingsState.kind || "text",
            basedOn: chipSettingsState.basedOn || "",
            latex: chipLatexInput ? chipLatexInput.value : "",
            isFavorite: Boolean(chipSettingsState.isFavorite || chipSettingsState.targetCategory === "favorite")
        }, { isCustom: chipSettingsState.mode !== "edit" || Boolean(getCustomTemplateChip(field)) });

        if (!chip) {
            return;
        }

        if (chip.isCustom) {
            upsertCustomTemplateChip(chip);
        }

        templateChipConfigs[field] = {
            field: field,
            label: chip.label,
            group: chip.group,
            kind: chip.kind,
            basedOn: chip.basedOn,
            latex: chip.latex || "",
            isFavorite: chip.isFavorite,
            isCustom: chip.isCustom
        };

        TEMPLATE_PARAMETER_REGISTRY[field] = TEMPLATE_PARAMETER_REGISTRY[field] || {};
        TEMPLATE_PARAMETER_REGISTRY[field].label = chip.label;
        TEMPLATE_PARAMETER_REGISTRY[field].group = chip.group;
        TEMPLATE_PARAMETER_REGISTRY[field].kind = chip.kind;
        TEMPLATE_PARAMETER_REGISTRY[field].preview = TEMPLATE_PARAMETER_REGISTRY[field].preview || chip.label;
        TEMPLATE_PARAMETER_REGISTRY[field].basedOn = chip.basedOn;
        TEMPLATE_PARAMETER_REGISTRY[field].latex = chip.latex || "";
        TEMPLATE_PARAMETER_REGISTRY[field].isFavorite = chip.isFavorite;
        TEMPLATE_PARAMETER_REGISTRY[field].isCustom = chip.isCustom || TEMPLATE_PARAMETER_REGISTRY[field].isCustom;

        refreshTemplatePlaceholderMaps();
        renderCustomTemplateChips();
        renderFavoriteTemplateChips();
        applyTemplateChipConfigurationsToPanel();
        bindTemplateParameterButtons();
        enhanceTemplateChipPanel();
        filterParameterButtons();
        markTemplateDirty("chip-config");
        closeTemplateChipSettings();
        showToast("Чип сохранен", "success");
    }

    function toggleTemplateChipBaseDropdown() {
        if (!chipBaseDropdown) {
            return;
        }

        chipBaseDropdown.hidden = !chipBaseDropdown.hidden;

        if (!chipBaseDropdown.hidden && chipBaseSearch) {
            chipBaseSearch.value = "";
            renderTemplateChipBaseOptions("");
            chipBaseSearch.focus();
        }
    }

    function closeTemplateChipBaseDropdown() {
        if (chipBaseDropdown) {
            chipBaseDropdown.hidden = true;
        }
    }

    function renderTemplateChipBaseOptions(query) {
        var normalizedQuery = String(query || "").toLowerCase();

        if (!chipBaseOptions) {
            return;
        }

        chipBaseOptions.innerHTML = "";

        getTemplateChipOptions().filter(function (chip) {
            return !chipSettingsState || chip.field !== chipSettingsState.field;
        }).filter(function (chip) {
            return !normalizedQuery ||
                chip.label.toLowerCase().indexOf(normalizedQuery) !== -1 ||
                chip.field.toLowerCase().indexOf(normalizedQuery) !== -1;
        }).forEach(function (chip) {
            var option = document.createElement("button");

            option.type = "button";
            option.textContent = chip.label;
            option.dataset.chipBaseField = chip.field;
            option.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (chipSettingsState) {
                    chipSettingsState.basedOn = chip.field;
                }
                updateTemplateChipBaseValue();
                closeTemplateChipBaseDropdown();
            });
            chipBaseOptions.appendChild(option);
        });

        if (!chipBaseOptions.childNodes.length) {
            chipBaseOptions.appendChild(createEmptyChipOption());
        }
    }

    function createEmptyChipOption() {
        var empty = document.createElement("div");

        empty.className = "template-chip-empty-option";
        empty.textContent = "Чипы не найдены";
        return empty;
    }

    function updateTemplateChipBaseValue() {
        var selected = chipSettingsState ? getTemplateChipSettings(chipSettingsState.basedOn) : null;

        if (chipBaseValue) {
            chipBaseValue.textContent = selected && selected.field ? selected.label : "Выберите чип";
        }
    }

    function openTemplateChipCategorySearch() {
        if (!chipCategoryPicker || !chipCategoryMenu) {
            return;
        }

        chipCategoryPicker.classList.add("is-searching");
        chipCategoryMenu.hidden = false;

        if (chipCategorySearch) {
            chipCategorySearch.value = "";
            renderTemplateChipCategoryMenu("");
            window.setTimeout(function () {
                chipCategorySearch.focus();
            }, 0);
        } else {
            renderTemplateChipCategoryMenu("");
        }
    }

    function closeTemplateChipCategorySearch() {
        if (chipCategoryPicker) {
            chipCategoryPicker.classList.remove("is-searching");
        }

        if (chipCategoryMenu) {
            chipCategoryMenu.hidden = true;
        }

        if (chipCategorySearch) {
            chipCategorySearch.value = "";
        }
    }

    function renderTemplateChipCategoryMenu(query) {
        var normalizedQuery = String(query || "").toLowerCase();

        if (!chipCategoryMenu) {
            return;
        }

        chipCategoryMenu.innerHTML = "";
        getTemplateChipGroupOptions().filter(function (group) {
            return !normalizedQuery ||
                group.label.toLowerCase().indexOf(normalizedQuery) !== -1 ||
                group.key.toLowerCase().indexOf(normalizedQuery) !== -1;
        }).forEach(function (group) {
            var option = document.createElement("button");

            option.type = "button";
            option.textContent = group.label;
            option.classList.toggle("is-selected", Boolean(chipSettingsState && getTemplateChipTargetCategory() === group.key));
            option.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (chipSettingsState) {
                    chipSettingsState.targetCategory = group.key;

                    if (group.key !== "favorite") {
                        chipSettingsState.group = group.key;
                    } else {
                        chipSettingsState.isFavorite = true;
                    }
                }
                updateTemplateChipCategoryLabel();
                closeTemplateChipCategorySearch();
            });
            chipCategoryMenu.appendChild(option);
        });

        if (!chipCategoryMenu.childNodes.length) {
            chipCategoryMenu.appendChild(createEmptyCategoryOption());
        }
    }

    function createEmptyCategoryOption() {
        var empty = document.createElement("div");

        empty.className = "template-chip-empty-option";
        empty.textContent = "Категории не найдены";
        return empty;
    }

    function getTemplateChipTargetCategory() {
        if (!chipSettingsState) {
            return "";
        }

        return chipSettingsState.targetCategory || chipSettingsState.group || "custom";
    }

    function getTemplateChipSaveGroup() {
        var targetCategory = getTemplateChipTargetCategory();

        if (targetCategory && targetCategory !== "favorite") {
            return targetCategory;
        }

        return chipSettingsState && chipSettingsState.group && chipSettingsState.group !== "favorite" ?
            chipSettingsState.group :
            "custom";
    }

    function updateTemplateChipCategoryLabel() {
        var targetCategory = getTemplateChipTargetCategory();
        var selected = getTemplateChipGroupOptions().filter(function (group) {
            return group.key === targetCategory;
        })[0];

        if (chipCategoryLabel) {
            chipCategoryLabel.textContent = selected ? "Категория: " + selected.label : "Сохранить в категорию";
        }
    }

    function getTemplateChipOptions() {
        return Object.keys(TEMPLATE_PARAMETER_REGISTRY).map(function (field) {
            return getTemplateChipSettings(field);
        }).filter(function (chip) {
            return Boolean(chip && chip.field && chip.label);
        });
    }

    function getTemplateChipGroupOptions() {
        var groups = [{ key: "favorite", label: "Избранное" }];
        var seen = { favorite: true };

        document.querySelectorAll("[data-placeholder-group]").forEach(function (group) {
            var key = group.dataset.parameterGroup || "";
            var labelNode = group.querySelector("[data-parameter-group-toggle] span");
            var label = labelNode ? labelNode.textContent.trim() : key;

            if (key && !seen[key]) {
                seen[key] = true;
                groups.push({ key: key, label: label });
            }
        });

        adminTemplateChipCategories.forEach(function (category) {
            if (category.key && !seen[category.key]) {
                seen[category.key] = true;
                groups.push({ key: category.key, label: category.label });
            }
        });

        if (!seen.custom) {
            groups.push({ key: "custom", label: "Пользовательские" });
        }

        return groups;
    }

    function renderFavoriteTemplateChips() {
        var favorites;

        if (!chipFavoritesList) {
            return;
        }

        chipFavoritesList.innerHTML = "";
        favorites = getTemplateChipOptions().filter(function (chip) {
            return Boolean(chip.isFavorite);
        });

        if (!favorites.length) {
            chipFavoritesList.appendChild(createTemplateFavoritesEmpty());
            return;
        }

        favorites.forEach(function (chip) {
            var button = document.createElement("button");

            button.type = "button";
            button.draggable = true;
            button.setAttribute("draggable", "true");
            button.dataset.placeholderField = chip.field;
            button.dataset.placeholderLabel = chip.label;
            button.dataset.placeholderKind = chip.kind || "text";
            button.dataset.favoriteChipButton = "true";
            button.textContent = chip.label;
            chipFavoritesList.appendChild(button);
        });
    }

    function createTemplateFavoritesEmpty() {
        var empty = document.createElement("div");

        empty.className = "template-favorites-empty";
        empty.textContent = "Пока нет избранных чипов";
        return empty;
    }

    function renderCustomTemplateChips() {
        document.querySelectorAll("[data-custom-chip-button], [data-admin-template-chip-button]").forEach(function (button) {
            var wrapper = button.closest(".template-chip-item");

            if (wrapper && wrapper.parentNode) {
                wrapper.parentNode.removeChild(wrapper);
            } else if (button.parentNode) {
                button.parentNode.removeChild(button);
            }
        });

        getRenderableTemplateChips().forEach(function (chip) {
            var group = ensureTemplateChipGroup(chip.group || "custom");
            var container = group ? group.querySelector(".template-placeholder-buttons") : null;
            var button;

            if (!container) {
                return;
            }

            button = document.createElement("button");
            button.type = "button";
            button.draggable = true;
            button.setAttribute("draggable", "true");
            button.dataset.placeholderField = chip.field;
            button.dataset.placeholderLabel = chip.label;
            button.dataset.placeholderKind = chip.kind || "text";
            if (chip.source === "admin") {
                button.dataset.adminTemplateChipButton = "true";
            } else {
                button.dataset.customChipButton = "true";
            }
            button.textContent = chip.label;
            container.appendChild(button);
        });
    }

    function getRenderableTemplateChips() {
        var byField = {};

        adminTemplateChips.forEach(function (chip) {
            if (chip && chip.field) {
                byField[chip.field] = Object.assign({}, chip, { source: "admin" });
            }
        });

        customTemplateChips.forEach(function (chip) {
            if (chip && chip.field) {
                byField[chip.field] = Object.assign({}, chip, { source: "custom" });
            }
        });

        return Object.keys(byField).map(function (field) {
            return byField[field];
        });
    }

    function ensureTemplateChipGroup(groupKey) {
        var group = document.querySelector("[data-placeholder-group][data-parameter-group=\"" + groupKey + "\"]");
        var panel = document.querySelector("[data-template-fields-panel]");
        var toggle;
        var body;
        var buttons;

        if (group) {
            return group;
        }

        if (!panel) {
            return null;
        }

        group = document.createElement("div");
        group.className = "template-placeholder-group is-open";
        group.dataset.placeholderGroup = "";
        group.dataset.parameterGroup = groupKey;
        group.dataset.defaultOpen = "true";

        toggle = document.createElement("button");
        toggle.className = "template-parameter-group-toggle";
        toggle.type = "button";
        toggle.dataset.parameterGroupToggle = "";
        toggle.setAttribute("aria-expanded", "true");
        toggle.innerHTML = '<span>' + getTemplateChipGroupLabel(groupKey) + '</span><span class="template-parameter-chevron" aria-hidden="true">⌄</span>';

        body = document.createElement("div");
        body.className = "template-parameter-group-body";
        body.dataset.parameterGroupBody = "";

        buttons = document.createElement("div");
        buttons.className = "template-placeholder-buttons";
        body.appendChild(buttons);
        group.appendChild(toggle);
        group.appendChild(body);
        panel.appendChild(group);

        parameterGroupState[groupKey] = true;
        toggle.addEventListener("click", function () {
            parameterGroupState[groupKey] = !parameterGroupState[groupKey];
            setParameterGroupOpen(group, parameterGroupState[groupKey]);
        });

        return group;
    }

    function getTemplateChipGroupLabel(groupKey) {
        var adminCategory = adminTemplateChipCategories.filter(function (category) {
            return category.key === groupKey;
        })[0];
        var labels = {
            basic: "Основные",
            imported: "Импортированные",
            system: "Системные",
            graphics: "Графика",
            data: "Данные",
            utils: "Утилиты",
            custom: "Пользовательские"
        };

        if (adminCategory) {
            return adminCategory.label;
        }

        return labels[groupKey] || "Пользовательские";
    }

    function applyTemplateChipConfigurationsToPanel() {
        document.querySelectorAll("[data-placeholder-field]").forEach(updateTemplateChipButtonFromRegistry);
    }

    function getCustomTemplateChip(field) {
        return customTemplateChips.filter(function (chip) {
            return chip.field === field;
        })[0] || null;
    }

    function upsertCustomTemplateChip(chip) {
        var existing = false;

        customTemplateChips = customTemplateChips.map(function (item) {
            if (item.field === chip.field) {
                existing = true;
                return chip;
            }

            return item;
        });

        if (!existing) {
            customTemplateChips.push(chip);
        }
    }

    function syncCustomChipFromConfig(field) {
        var chip = getCustomTemplateChip(field);
        var config = templateChipConfigs[field];

        if (!chip || !config) {
            return;
        }

        chip.label = config.label || chip.label;
        chip.group = config.group || chip.group;
        chip.kind = config.kind || chip.kind;
        chip.basedOn = config.basedOn || "";
        chip.latex = config.latex || "";
        chip.isFavorite = Boolean(config.isFavorite);
        registerCustomTemplateChips([chip]);
    }

    function createCustomChipField(label) {
        return "custom_chip_" + String(label || "chip")
            .toLowerCase()
            .replace(/[^a-z0-9а-яё]+/gi, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 36);
    }

    function createUniqueCustomChipField(label) {
        var base = createCustomChipField(label) || "custom_chip";
        var field = base;

        while (TEMPLATE_PARAMETER_REGISTRY[field]) {
            customChipIdSeed += 1;
            field = base + "_" + Date.now().toString(36) + "_" + customChipIdSeed.toString(36);
        }

        return field;
    }

    function setParameterGroupOpen(group, isOpen) {
        var toggle = group.querySelector("[data-parameter-group-toggle]");

        group.classList.toggle("is-open", Boolean(isOpen));

        if (toggle) {
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        }
    }

    function filterParameterButtons() {
        var query = fieldSearch ? fieldSearch.value.trim().toLowerCase() : "";

        document.querySelectorAll("[data-placeholder-group]").forEach(function (group) {
            var key = group.dataset.parameterGroup || "";
            var visibleCount = 0;

            group.querySelectorAll("[data-placeholder-field]").forEach(function (button) {
                var text = (button.textContent || "").toLowerCase();
                var field = (button.dataset.placeholderField || "").toLowerCase();
                var visible = !query || text.indexOf(query) !== -1 || field.indexOf(query) !== -1;
                var wrapper = button.closest ? button.closest(".template-chip-item") : null;

                button.hidden = !visible;
                if (wrapper) {
                    wrapper.hidden = !visible;
                }

                if (visible) {
                    visibleCount += 1;
                }
            });

            group.hidden = Boolean(query && visibleCount === 0);

            if (query && visibleCount > 0) {
                setParameterGroupOpen(group, true);
            } else if (!query) {
                setParameterGroupOpen(group, Boolean(parameterGroupState[key]));
            }
        });
    }

    function markTemplateDirty(reason) {
        dirtyRevision += 1;
        isDirty = true;
        updateTemplateSaveUI();
        if (shouldPaginateAfterTemplateChange(reason)) {
            scheduleTemplatePagination(getActiveTemplatePageContent(), { fast: true });
        }
        scheduleTemplateAutosave();
        scheduleTemplatePreviewUpdate();
    }

    function shouldPaginateForTemplateInput(inputType) {
        return inputType === "insertParagraph" ||
            inputType === "insertLineBreak" ||
            inputType === "insertFromPaste" ||
            inputType.indexOf("delete") === 0;
    }

    function shouldPaginateAfterTemplateChange(reason) {
        return reason === "placeholder" ||
            reason === "page-break" ||
            reason === "hand-move" ||
            reason === "table" ||
            reason === "table-resize" ||
            reason === "ruler";
    }

    function scheduleTemplateAutosave() {
        window.clearTimeout(autosaveTimer);

        if (!isDirty || isSaving) {
            return;
        }

        autosaveTimer = window.setTimeout(function () {
            saveTemplateDraft("autosave");
        }, AUTOSAVE_DELAY);
    }

    function saveTemplateDraft(reason, options) {
        var payload;
        var saveUrl = root.dataset.templateSaveUrl || "";
        var saveRevision = dirtyRevision;

        options = options || {};

        if (!saveUrl || isSaving) {
            return Promise.resolve();
        }

        if (!isDirty && reason !== "manual") {
            return Promise.resolve();
        }

        if (!validateTemplateMetadata()) {
            return Promise.resolve();
        }

        payload = collectTemplatePayload();
        isSaving = true;
        window.clearTimeout(autosaveTimer);
        updateTemplateSaveUI();

        return fetch(saveUrl, {
            method: "PATCH",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify(payload),
            keepalive: Boolean(options.keepalive)
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Ошибка сохранения шаблона");
                    }

                    return data;
                });
            })
            .then(function () {
                isSaving = false;
                isDirty = saveRevision !== dirtyRevision;
                updateTemplateSaveUI();

                if (isDirty) {
                    scheduleTemplateAutosave();
                }

                if (!options.silent && reason === "manual") {
                    showToast("Шаблон сохранен", "success");
                }
            })
            .catch(function (error) {
                isDirty = true;
                isSaving = false;
                updateTemplateSaveUI();

                if (!options.silent) {
                    showToast(error.message || "Ошибка сохранения шаблона", "error");
                }
            });
    }

    function updateTemplateSaveUI() {
        var pending = isDirty || isSaving;
        var statusText = isSaving ? "Сохранение" : (isDirty ? "Ожидает сохранения" : "Сохранено");

        if (saveButton) {
            saveButton.disabled = !isDirty || isSaving;
            saveButton.classList.toggle("is-pending", isDirty && !isSaving);
            saveButton.classList.toggle("is-saving", isSaving);
            saveButton.classList.toggle("is-saved", !pending);
            saveButton.title = statusText;
            saveButton.setAttribute("aria-label", statusText);
        }

        if (saveStatus) {
            saveStatus.textContent = statusText;
            saveStatus.classList.toggle("is-pending", isDirty || isSaving);
            saveStatus.classList.toggle("is-saving", isSaving);
            saveStatus.classList.toggle("is-saved", !pending);
        }
    }

    function validateTemplateMetadata() {
        if (!titleInput || titleInput.value.trim()) {
            return true;
        }

        showToast("Введите название шаблона", "warning");
        titleInput.focus();
        return false;
    }

    function saveTemplateSelectionMarker() {
        var selection = window.getSelection();
        var range;
        var marker;
        var container;

        if (!selection || selection.rangeCount === 0 || !isSelectionInsideTemplateEditor()) {
            return null;
        }

        range = selection.getRangeAt(0).cloneRange();
        container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;

        if (container && container.closest && container.closest(".template-placeholder, .template-page-break")) {
            return null;
        }

        marker = document.createElement("span");
        marker.className = "template-selection-marker";
        marker.dataset.templateSelectionMarker = "";
        marker.contentEditable = "false";

        try {
            range.collapse(false);
            range.insertNode(marker);
            return marker;
        } catch (error) {
            return null;
        }
    }

    function restoreTemplateSelectionMarker(marker) {
        var selection = window.getSelection();
        var range;
        var content;

        if (!marker || !marker.parentNode || !selection) {
            return;
        }

        content = getTemplatePageContentForNode(marker);
        range = document.createRange();
        range.setStartAfter(marker);
        range.collapse(true);
        marker.parentNode.removeChild(marker);

        selection.removeAllRanges();
        selection.addRange(range);

        if (content) {
            content.focus();
        }

        if (editor) {
            editor.saveSelection();
        }
    }

    function isSelectionInsideTemplateEditor() {
        var selection = window.getSelection();
        var range;

        if (!selection || selection.rangeCount === 0) {
            return false;
        }

        range = selection.getRangeAt(0);
        return Boolean(editablePage.contains(range.commonAncestorContainer) && getTemplatePageContentForNode(range.commonAncestorContainer));
    }

    function scheduleTemplatePagination(content, options) {
        var delay;

        options = options || {};
        pendingPaginationContent = content || pendingPaginationContent || getActiveTemplatePageContent();
        pendingPaginationForce = pendingPaginationForce || Boolean(options.force);
        delay = options.fast ? TEMPLATE_FAST_PAGINATION_DELAY : TEMPLATE_PAGINATION_DELAY;

        window.clearTimeout(paginationTimer);
        paginationTimer = window.setTimeout(function () {
            var targetContent = pendingPaginationContent;
            var force = pendingPaginationForce;

            pendingPaginationContent = null;
            pendingPaginationForce = false;

            if (isTemplateTyping && !force) {
                scheduleTemplatePagination(targetContent, { force: false });
                return;
            }

            if (paginateTemplateEditor(targetContent)) {
                scheduleTemplatePreviewUpdate();
            }
        }, delay);
    }

    function paginateTemplateEditor(startContent) {
        var pages;
        var pageIndex;
        var startIndex;
        var moved = false;
        var guard = 0;
        var selectionMarker;

        if (!editPagesContainer || isPaginating) {
            return false;
        }

        isPaginating = true;
        cleanupTemplateDragArtifacts();
        selectionMarker = saveTemplateSelectionMarker();

        try {
            ensureTemplatePage(0);
            pages = getTemplateEditPages();
            startIndex = getTemplatePageIndexForContent(startContent);

            for (pageIndex = startIndex; pageIndex < pages.length; pageIndex += 1) {
                moved = paginateTemplatePageAt(pageIndex) || moved;
                pages = getTemplateEditPages();

                guard += 1;
                if (guard > 200) {
                    break;
                }
            }

            updateTemplatePageNumbers();
            renderTemplateLockZones();
        } finally {
            restoreTemplateSelectionMarker(selectionMarker);
            isPaginating = false;
        }

        if (moved && editor && typeof editor.markCheckpoint === "function") {
            editor.markCheckpoint();
        }

        return moved;
    }

    function getTemplatePageIndexForContent(content) {
        var pages;
        var page;

        if (!content) {
            return 0;
        }

        page = content.closest ? content.closest("[data-template-edit-page]") : null;

        if (!page) {
            return 0;
        }

        pages = getTemplateEditPages();
        return Math.max(0, pages.indexOf(page));
    }

    function paginateTemplatePageAt(pageIndex) {
        var page = getTemplateEditPages()[pageIndex];
        var content = page ? getTemplatePageContent(page) : null;
        var moved = false;
        var guard = 0;
        var nextContent;
        var nodeToMove;

        if (!content) {
            return false;
        }

        while (isTemplatePageOverflowing(content)) {
            nodeToMove = findLastMovableNode(content);

            if (!nodeToMove || isOnlyOversizedNode(content, nodeToMove)) {
                break;
            }

            nextContent = getTemplatePageContent(ensureTemplatePage(pageIndex + 1));
            nextContent.insertBefore(nodeToMove, nextContent.firstChild);
            moved = true;
            guard += 1;

            if (guard > 80) {
                break;
            }
        }

        return moved;
    }

    function isTemplatePageOverflowing(content) {
        return content && content.scrollHeight > content.clientHeight + 2;
    }

    function findLastMovableNode(content) {
        var node = content ? content.lastChild : null;

        while (node && isTemporaryDragNode(node)) {
            node = node.previousSibling;
        }

        return node;
    }

    function isOnlyOversizedNode(content, node) {
        var meaningful = 0;

        Array.prototype.forEach.call(content.childNodes, function (child) {
            if (!isTemporaryDragNode(child)) {
                meaningful += 1;
            }
        });

        return meaningful <= 1 && node && node.nodeType === Node.ELEMENT_NODE && node.scrollHeight > content.clientHeight + 2;
    }

    function isTemporaryDragNode(node) {
        return node && node.nodeType === Node.ELEMENT_NODE && node.matches(TEMP_DRAG_SELECTOR);
    }

    function ensureTemplatePage(index) {
        var pages = getTemplateEditPages();
        var page;

        while (pages.length <= index) {
            page = createTemplateEditPage("", pages.length);
            editPagesContainer.appendChild(page);
            pages.push(page);
        }

        return pages[index];
    }

    function createTemplateEditPage(html, index) {
        var page = document.createElement("article");
        var content = document.createElement("div");
        var lockLayer = document.createElement("div");
        var pageNumber = document.createElement("div");

        page.className = "editable-page template-page-sheet template-edit-page";
        page.dataset.templateEditPage = "";
        page.dataset.templatePage = String(index + 1);

        content.className = "template-page-content template-editable-page";
        content.contentEditable = "true";
        content.spellcheck = true;
        content.dataset.templatePageContent = "";
        content.innerHTML = html || "";

        lockLayer.className = "template-lock-layer";
        lockLayer.dataset.templateLockLayer = "";
        lockLayer.setAttribute("aria-hidden", "true");

        pageNumber.className = "template-page-number";
        pageNumber.setAttribute("aria-hidden", "true");
        pageNumber.textContent = String(index + 1);

        page.appendChild(content);
        page.appendChild(lockLayer);
        page.appendChild(pageNumber);
        return page;
    }

    function createTemplatePreviewPage(html, index) {
        var page = document.createElement("article");
        var content = document.createElement("div");
        var pageNumber = document.createElement("div");

        page.className = "editable-page template-page-sheet template-preview-page";
        page.dataset.templatePreviewPage = "";
        page.dataset.templatePage = String(index + 1);

        content.className = "template-page-content template-inline-preview-page";
        content.innerHTML = html || "";

        pageNumber.className = "template-page-number";
        pageNumber.setAttribute("aria-hidden", "true");
        pageNumber.textContent = String(index + 1);

        page.appendChild(content);
        page.appendChild(pageNumber);
        return page;
    }

    function getTemplateEditPages() {
        if (!editPagesContainer) {
            return legacyEditablePage ? [legacyEditablePage] : [];
        }

        return Array.prototype.slice.call(editPagesContainer.querySelectorAll("[data-template-edit-page]"));
    }

    function getTemplatePageContents() {
        if (!editPagesContainer) {
            return legacyEditablePage ? [legacyEditablePage] : [];
        }

        return Array.prototype.slice.call(editPagesContainer.querySelectorAll("[data-template-page-content]"));
    }

    function getTemplatePageContent(page) {
        if (!page) {
            return null;
        }

        return page.matches && page.matches("[data-template-page-content]") ? page : page.querySelector("[data-template-page-content]");
    }

    function getTemplatePageContentForNode(node) {
        var element = node && node.nodeType === Node.ELEMENT_NODE ? node : (node ? node.parentNode : null);

        return element && element.closest ? element.closest("[data-template-page-content]") : null;
    }

    function getLastTemplatePageContent() {
        var contents = getTemplatePageContents();

        return contents.length ? contents[contents.length - 1] : null;
    }

    function getActiveTemplatePageContent() {
        var selection = window.getSelection();
        var active = document.activeElement;
        var content;

        if (selection && selection.rangeCount > 0) {
            content = getTemplatePageContentForNode(selection.getRangeAt(0).commonAncestorContainer);

            if (content && editablePage.contains(content)) {
                return content;
            }
        }

        content = active && active.closest ? active.closest("[data-template-page-content]") : null;

        if (content && editablePage.contains(content)) {
            return content;
        }

        return getLastTemplatePageContent();
    }

    function updateTemplatePageNumbers() {
        getTemplateEditPages().forEach(function (page, index) {
            var number = page.querySelector(".template-page-number");

            page.dataset.templatePage = String(index + 1);

            if (number) {
                number.textContent = String(index + 1);
            }
        });
    }

    function renderTemplateLockZones() {
        getTemplateEditPages().forEach(function (page, pageIndex) {
            var layer = ensureTemplateLockLayer(page);

            layer.innerHTML = "";

            templateLockZones.filter(function (zone) {
                return zone.pageIndex === pageIndex;
            }).forEach(function (zone) {
                layer.appendChild(createTemplateLockZoneNode(zone));
            });
        });
    }

    function ensureTemplateLockLayer(page) {
        var layer = page ? page.querySelector("[data-template-lock-layer]") : null;

        if (layer || !page) {
            return layer;
        }

        layer = document.createElement("div");
        layer.className = "template-lock-layer";
        layer.dataset.templateLockLayer = "";
        layer.setAttribute("aria-hidden", "true");
        page.appendChild(layer);
        return layer;
    }

    function createTemplateLockZoneNode(zone) {
        var node = document.createElement("div");

        node.className = "template-lock-zone";
        node.dataset.lockZoneId = zone.id;
        node.style.left = Math.round(zone.x) + "px";
        node.style.top = Math.round(zone.y) + "px";
        node.style.width = Math.round(zone.width) + "px";
        node.style.height = Math.round(zone.height) + "px";
        return node;
    }

    function getSerializableTemplateLockZones() {
        return templateLockZones.map(function (zone) {
            return {
                id: zone.id,
                pageIndex: zone.pageIndex,
                x: Math.round(zone.x * 100) / 100,
                y: Math.round(zone.y * 100) / 100,
                width: Math.round(zone.width * 100) / 100,
                height: Math.round(zone.height * 100) / 100
            };
        });
    }

    function stripTemplateElementLocks(scope) {
        if (!scope || !scope.querySelectorAll) {
            return;
        }

        scope.querySelectorAll("[data-template-locked], .is-template-locked, .is-template-locked-flash, .template-lock-layer, .template-lock-zone").forEach(function (node) {
            if (node.classList && (node.classList.contains("template-lock-layer") || node.classList.contains("template-lock-zone"))) {
                removeNode(node);
                return;
            }

            if (node.dataset) {
                delete node.dataset.templateLocked;
            }

            if (node.classList) {
                node.classList.remove("is-template-locked", "is-template-locked-flash");
            }

            if (!node.hasAttribute("data-template-page-content") && (!node.classList || (!node.classList.contains("template-placeholder") && !node.classList.contains("template-page-break")))) {
                node.removeAttribute("contenteditable");
            }
        });
    }

    function getTemplatePagesData() {
        return getTemplatePageContents().map(function (content, index) {
            var clone = content.cloneNode(true);

            cleanupTemplateDragArtifactsFrom(clone);
            cleanupTemplateHandArtifactsFrom(clone);
            normalizeTemplatePlaceholders(clone);
            stripTemplateElementLocks(clone);
            clone.querySelectorAll(".table-resize-handle, [data-editor-caret-marker]").forEach(function (node) {
                node.remove();
            });

            return {
                id: "page-" + (index + 1),
                html: clone.innerHTML,
                orientation: "portrait"
            };
        });
    }

    function serializeTemplatePagesHtml(pages) {
        return pages.map(function (page, index) {
            return '<div data-template-page="' + String(index + 1) + '">' + (page.html || "") + "</div>";
        }).join("");
    }

    function collectTemplatePayload() {
        var pages;

        cleanupTemplateDragArtifacts();
        pages = getTemplatePagesData();

        return {
            title: titleInput ? titleInput.value.trim() : "",
            tag: tagInput ? tagInput.value.trim() : "",
            template_type: typeSelect ? typeSelect.value : "Универсальный",
            content_html: serializeTemplatePagesHtml(pages),
            content_json: {
                pages: pages,
                lockZones: getSerializableTemplateLockZones(),
                customChips: getSerializableTemplateCustomChips(),
                chipsConfig: getSerializableTemplateChipsConfig()
            }
        };
    }

    function getSerializableTemplateCustomChips() {
        return customTemplateChips.map(function (chip) {
            return {
                id: chip.id || chip.field,
                field: chip.field,
                label: chip.label,
                group: chip.group || "custom",
                kind: chip.kind || "text",
                basedOn: chip.basedOn || "",
                latex: chip.latex || "",
                isFavorite: Boolean(chip.isFavorite)
            };
        });
    }

    function getSerializableTemplateChipsConfig() {
        var fields = {};

        Object.keys(templateChipConfigs).forEach(function (field) {
            var config = templateChipConfigs[field];

            if (!config) {
                return;
            }

            fields[field] = {
                field: field,
                label: config.label || "",
                group: config.group || "",
                kind: config.kind || "text",
                basedOn: config.basedOn || "",
                latex: config.latex || "",
                isFavorite: Boolean(config.isFavorite),
                isCustom: Boolean(config.isCustom)
            };
        });

        return {
            customChips: getSerializableTemplateCustomChips(),
            fields: fields
        };
    }

    function insertTemplatePlaceholder(field, label, options) {
        var range;
        var parameter;

        options = options || {};

        if (!field) {
            return;
        }

        parameter = normalizeTemplateParameter({
            field: field,
            label: label,
            group: options.group,
            kind: options.kind
        });

        range = normalizeTemplateDropRange(options.range) || getRestoredEditorRange() || createEndRange();

        if (insertTemplatePlaceholderAtRange(parameter, range)) {
            paginateTemplateEditor(getActiveTemplatePageContent());
            markTemplateDirty("placeholder");
        }
    }

    function insertTemplateParameterAtDrop(event, parameterData) {
        var range = getDropRange(event.clientX, event.clientY);

        insertTemplatePlaceholder(parameterData.field, parameterData.label, {
            range: range,
            source: "drag",
            group: parameterData.group,
            kind: parameterData.kind
        });
    }

    function insertTemplatePlaceholderAtRange(parameter, range) {
        var node;
        var spacer;
        var paragraph;

        if (!parameter || !parameter.field || !range) {
            return false;
        }

        if (editor && typeof editor.markCheckpoint === "function") {
            editor.markCheckpoint();
        }

        try {
            range = range.cloneRange();
            range.collapse(true);
            range.deleteContents();

            if (parameter.field === "page_break") {
                node = createTemplatePageBreakElement(parameter);
                paragraph = document.createElement("p");
                paragraph.appendChild(document.createElement("br"));
                range.insertNode(paragraph);
                range.insertNode(node);
                setCaretInsideNode(paragraph);
            } else {
                node = createTemplatePlaceholderElement(parameter);
                spacer = document.createTextNode("\u00a0");
                range.insertNode(node);
                node.parentNode.insertBefore(spacer, node.nextSibling);
                setCaretAfterNode(spacer);
            }

            if (editor && typeof editor.markCheckpoint === "function") {
                editor.markCheckpoint();
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    function moveTemplateParameterAtDrop(event, parameterData) {
        var targetToken = event.target && event.target.closest ? event.target.closest(".template-placeholder, .template-placeholder-handle, .template-placeholder-label") : null;
        var range = getDropRange(event.clientX, event.clientY);
        var marker;
        var spacer;

        if (!draggingDocumentPlaceholder || !editablePage.contains(draggingDocumentPlaceholder) || !range) {
            return;
        }

        if (targetToken && (targetToken === draggingDocumentPlaceholder || draggingDocumentPlaceholder.contains(targetToken))) {
            return;
        }

        if (isRangeInsideNode(range, draggingDocumentPlaceholder)) {
            return;
        }

        if (parameterData.placeholderId && draggingDocumentPlaceholder.dataset.placeholderId !== parameterData.placeholderId) {
            return;
        }

        if (editor && typeof editor.markCheckpoint === "function") {
            editor.markCheckpoint();
        }

        try {
            marker = document.createElement("span");
            marker.className = "template-drop-marker";
            marker.dataset.templateDropMarker = "";
            marker.contentEditable = "false";

            range = range.cloneRange();
            range.collapse(true);
            range.insertNode(marker);

            if (!marker.parentNode || marker.previousSibling === draggingDocumentPlaceholder || marker.nextSibling === draggingDocumentPlaceholder) {
                removeNode(marker);
                return;
            }

            removeTemplateTrailingSpacer(draggingDocumentPlaceholder);
            draggingDocumentPlaceholder.classList.remove("is-dragging");
            marker.parentNode.insertBefore(draggingDocumentPlaceholder, marker);
            normalizeTemplatePlaceholderNode(draggingDocumentPlaceholder);

            if (draggingDocumentPlaceholder.classList.contains("template-placeholder")) {
                spacer = document.createTextNode("\u00a0");
                draggingDocumentPlaceholder.parentNode.insertBefore(spacer, draggingDocumentPlaceholder.nextSibling);
            }

            setCaretAfterNode(spacer || draggingDocumentPlaceholder);
            documentPlaceholderMoved = true;
            normalizeTemplatePlaceholders();
            paginateTemplateEditor(getTemplatePageContentForNode(draggingDocumentPlaceholder));

            if (editor && typeof editor.markCheckpoint === "function") {
                editor.markCheckpoint();
            }

            markTemplateDirty("placeholder-move");
        } catch (error) {
            documentPlaceholderMoved = false;
        } finally {
            removeNode(marker);
        }
    }

    function getDropRange(clientX, clientY) {
        var content = getTemplatePageContentFromPoint(clientX, clientY);
        var range = getRangeFromPoint(clientX, clientY);

        range = normalizeTemplateDropRange(range);

        if (range && content && content.contains(range.commonAncestorContainer)) {
            return range;
        }

        if (editor && editor.restoreSelection()) {
            range = getCurrentEditorRange();
            range = normalizeTemplateDropRange(range);

            if (range) {
                return range;
            }
        }

        return createEndRange(content);
    }

    function getRangeFromPoint(clientX, clientY) {
        var caretPosition;
        var range = null;
        var node;
        var offset;
        var content = getTemplatePageContentFromPoint(clientX, clientY);

        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(clientX, clientY);
        } else if (document.caretPositionFromPoint) {
            caretPosition = document.caretPositionFromPoint(clientX, clientY);

            if (caretPosition) {
                range = document.createRange();
                node = caretPosition.offsetNode;
                offset = caretPosition.offset;
                range.setStart(node, offset);
                range.collapse(true);
            }
        }

        if (range && content && !content.contains(range.commonAncestorContainer)) {
            return createEndRange(content);
        }

        return normalizeTemplateDropRange(range);
    }

    function normalizeTemplateDropRange(range) {
        var container;
        var targetNode;
        var token;
        var content;
        var adjustedRange;

        if (!range || !editablePage.contains(range.commonAncestorContainer)) {
            return null;
        }

        container = range.commonAncestorContainer;
        targetNode = container.nodeType === Node.ELEMENT_NODE ? container : container.parentNode;
        content = targetNode && targetNode.closest ? targetNode.closest("[data-template-page-content]") : null;

        if (!content || !editablePage.contains(content)) {
            return null;
        }

        token = targetNode && targetNode.closest ? targetNode.closest(".template-placeholder, .template-page-break") : null;

        if (!token || !editablePage.contains(token)) {
            return range;
        }

        adjustedRange = document.createRange();
        adjustedRange.setStartAfter(token);
        adjustedRange.collapse(true);
        return adjustedRange;
    }

    function getTemplateEditPageFromEvent(event) {
        var content = event.target && event.target.closest ? event.target.closest("[data-template-page-content]") : null;

        return content ? content.closest("[data-template-edit-page]") : null;
    }

    function getTemplateEditPageFromPoint(clientX, clientY) {
        var content = getTemplatePageContentFromPoint(clientX, clientY);

        return content ? content.closest("[data-template-edit-page]") : null;
    }

    function getTemplatePageContentFromPoint(clientX, clientY) {
        var element = document.elementFromPoint(clientX, clientY);
        var content = element && element.closest ? element.closest("[data-template-page-content]") : null;
        var page;

        if (content && editablePage.contains(content)) {
            return content;
        }

        page = element && element.closest ? element.closest("[data-template-edit-page]") : null;

        if (page && editablePage.contains(page)) {
            return getTemplatePageContent(page);
        }

        return null;
    }

    function isRangeAtTemplatePageEdge(content, range, edge) {
        var probe;

        if (!content || !range || !content.contains(range.commonAncestorContainer)) {
            return false;
        }

        probe = document.createRange();
        probe.selectNodeContents(content);

        try {
            if (edge === "start") {
                probe.setEnd(range.startContainer, range.startOffset);
            } else {
                probe.setStart(range.endContainer, range.endOffset);
            }
        } catch (error) {
            return false;
        }

        return isTemplateRangeVisuallyEmpty(probe);
    }

    function isTemplateRangeVisuallyEmpty(range) {
        var fragment = range.cloneContents();
        var text = (fragment.textContent || "").replace(/[\s\u00a0\u200b]+/g, "");

        if (text) {
            return false;
        }

        return !fragment.querySelector("img, table, .template-placeholder, .template-page-break");
    }

    function captureTemplateSelectionSnapshot(selection) {
        var range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        var page = range ? getTemplateEditPageForNode(range.commonAncestorContainer) : null;
        var pages = getTemplateEditPages();

        if (!selection || !range || !page) {
            return null;
        }

        return {
            anchorNode: selection.anchorNode,
            anchorOffset: selection.anchorOffset,
            focusNode: selection.focusNode,
            focusOffset: selection.focusOffset,
            pageIndex: pages.indexOf(page)
        };
    }

    function isSameTemplateSelectionSnapshot(before, after) {
        if (!before || !after) {
            return false;
        }

        return before.anchorNode === after.anchorNode &&
            before.anchorOffset === after.anchorOffset &&
            before.focusNode === after.focusNode &&
            before.focusOffset === after.focusOffset &&
            before.pageIndex === after.pageIndex;
    }

    function getActiveTemplatePage() {
        var content = getCurrentTemplatePageContent();

        return content && content.closest ? content.closest("[data-template-edit-page]") : null;
    }

    function getTemplateEditPageForNode(node) {
        var content = getTemplatePageContentForNode(node);

        return content && content.closest ? content.closest("[data-template-edit-page]") : null;
    }

    function getCurrentTemplateEditPage() {
        var content = getCurrentTemplatePageContent();

        return content && content.closest ? content.closest("[data-template-edit-page]") : null;
    }

    function getCurrentTemplatePageContent() {
        var selection = window.getSelection();
        var active = document.activeElement;
        var content;

        if (selection && selection.rangeCount > 0) {
            content = getTemplatePageContentForNode(selection.getRangeAt(0).commonAncestorContainer);

            if (content && editablePage.contains(content)) {
                return content;
            }
        }

        content = active && active.closest ? active.closest("[data-template-page-content]") : null;
        return content && editablePage.contains(content) ? content : null;
    }

    function getNextTemplateEditPage(page) {
        var pages = getTemplateEditPages();
        var index = pages.indexOf(page);

        return index === -1 ? null : pages[index + 1] || null;
    }

    function getPreviousTemplateEditPage(page) {
        var pages = getTemplateEditPages();
        var index = pages.indexOf(page);

        return index <= 0 ? null : pages[index - 1] || null;
    }

    function ensureEditableParagraph(pageContent, atEnd) {
        var blockSelector = "p, div, h1, h2, h3, h4, h5, h6, li, table, blockquote";
        var block;
        var paragraph;

        if (!pageContent) {
            return null;
        }

        block = atEnd ?
            Array.prototype.slice.call(pageContent.querySelectorAll(blockSelector)).filter(isEditableCaretBlock).pop() :
            Array.prototype.slice.call(pageContent.querySelectorAll(blockSelector)).filter(isEditableCaretBlock)[0];

        if (block) {
            return block;
        }

        paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));

        if (atEnd) {
            pageContent.appendChild(paragraph);
        } else {
            pageContent.insertBefore(paragraph, pageContent.firstChild);
        }

        return paragraph;
    }

    function isEditableCaretBlock(node) {
        return Boolean(node && node.nodeType === Node.ELEMENT_NODE && !node.closest(".template-placeholder, .template-page-break"));
    }

    function setCaretToStartOfPage(pageContent) {
        var target = ensureEditableParagraph(pageContent, false);
        var selection = window.getSelection();
        var range;

        if (!target || !selection) {
            return false;
        }

        pageContent.focus();
        range = document.createRange();
        setRangeToStartOfEditableBlock(range, target);
        selection.removeAllRanges();
        selection.addRange(range);

        if (editor) {
            editor.saveSelection();
        }

        return true;
    }

    function setCaretToEndOfPage(pageContent) {
        var target = ensureEditableParagraph(pageContent, true);
        var selection = window.getSelection();
        var range;

        if (!target || !selection) {
            return false;
        }

        pageContent.focus();
        range = document.createRange();
        setRangeToEndOfEditableBlock(range, target);
        selection.removeAllRanges();
        selection.addRange(range);

        if (editor) {
            editor.saveSelection();
        }

        return true;
    }

    function setRangeToStartOfEditableBlock(range, block) {
        var target = getFirstEditableCaretTarget(block);

        if (target && target.nodeType === Node.TEXT_NODE) {
            range.setStart(target, 0);
        } else if (target) {
            range.setStart(target, 0);
        } else {
            range.setStart(block, 0);
        }

        range.collapse(true);
    }

    function setRangeToEndOfEditableBlock(range, block) {
        var target = getLastEditableCaretTarget(block);

        if (target && target.nodeType === Node.TEXT_NODE) {
            range.setStart(target, target.nodeValue.length);
        } else if (target) {
            range.selectNodeContents(target);
            range.collapse(false);
            return;
        } else {
            range.selectNodeContents(block);
            range.collapse(false);
            return;
        }

        range.collapse(true);
    }

    function getFirstEditableCaretTarget(block) {
        var tableCell = block.matches && block.matches("table") ? block.querySelector("td, th") : null;
        var walker;
        var textNode;

        if (tableCell) {
            return getFirstEditableCaretTarget(tableCell);
        }

        if (!block.childNodes.length) {
            block.appendChild(document.createElement("br"));
            return block;
        }

        walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                return node.parentElement && node.parentElement.closest(".template-placeholder, .template-page-break") ?
                    NodeFilter.FILTER_REJECT :
                    NodeFilter.FILTER_ACCEPT;
            }
        }, false);
        textNode = walker.nextNode();

        return textNode || block;
    }

    function getLastEditableCaretTarget(block) {
        var tableCells = block.matches && block.matches("table") ? block.querySelectorAll("td, th") : null;
        var walker;
        var textNode = null;
        var current;

        if (tableCells && tableCells.length) {
            return getLastEditableCaretTarget(tableCells[tableCells.length - 1]);
        }

        walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                return node.parentElement && node.parentElement.closest(".template-placeholder, .template-page-break") ?
                    NodeFilter.FILTER_REJECT :
                    NodeFilter.FILTER_ACCEPT;
            }
        }, false);

        while ((current = walker.nextNode())) {
            textNode = current;
        }

        return textNode || block;
    }

    function moveCaretToNextTemplatePage(currentPage) {
        currentPage = currentPage || getCurrentTemplateEditPage();

        var pages = getTemplateEditPages();
        var currentIndex = pages.indexOf(currentPage);
        var nextPage = currentIndex === -1 ? null : getNextTemplateEditPage(currentPage) || ensureTemplatePage(currentIndex + 1);
        var nextContent = nextPage ? getTemplatePageContent(nextPage) : null;

        updateTemplatePageNumbers();
        return setCaretToStartOfPage(nextContent);
    }

    function moveCaretToPreviousTemplatePage(currentPage) {
        currentPage = currentPage || getCurrentTemplateEditPage();

        var previousPage = getPreviousTemplateEditPage(currentPage);
        var previousContent = previousPage ? getTemplatePageContent(previousPage) : null;

        return setCaretToEndOfPage(previousContent);
    }

    function setActiveDropPage(page) {
        if (activeDropPage && activeDropPage !== page) {
            activeDropPage.classList.remove("is-drop-target");
        }

        activeDropPage = page;

        if (activeDropPage) {
            activeDropPage.classList.add("is-drop-target");
        }
    }

    function clearActiveDropPage() {
        if (activeDropPage) {
            activeDropPage.classList.remove("is-drop-target");
            activeDropPage = null;
        }
    }

    function isRangeInsideNode(range, node) {
        return Boolean(range && node && node.contains(range.commonAncestorContainer));
    }

    function removeTemplateTrailingSpacer(node) {
        var next = node ? node.nextSibling : null;

        if (!node || !node.parentNode) {
            return;
        }

        if (next && next.nodeType === Node.TEXT_NODE && /^[\s\u00a0]+$/.test(next.nodeValue || "")) {
            next.parentNode.removeChild(next);
        }
    }

    function removeTemplateTokenWithSpacer(node) {
        if (!node || !node.parentNode) {
            return;
        }

        removeTemplateTrailingSpacer(node);
        node.parentNode.removeChild(node);
    }

    function removeNode(node) {
        if (node && node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    function setCaretAfterNode(node) {
        var selection = window.getSelection();
        var range;

        if (!node || !selection) {
            return;
        }

        range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        if (editor) {
            editor.saveSelection();
        }
    }

    function setCaretInsideNode(node) {
        var selection = window.getSelection();
        var range;

        if (!node || !selection) {
            return;
        }

        range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        if (editor) {
            editor.saveSelection();
        }
    }

    function getCurrentEditorRange() {
        var selection = window.getSelection();
        var range;

        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        range = selection.getRangeAt(0);
        return editablePage.contains(range.commonAncestorContainer) && getTemplatePageContentForNode(range.commonAncestorContainer) ? range.cloneRange() : null;
    }

    function getRestoredEditorRange() {
        if (editor && editor.restoreSelection()) {
            return getCurrentEditorRange();
        }

        return getCurrentEditorRange();
    }

    function createEndRange(content) {
        var range = document.createRange();
        var target = content || getLastTemplatePageContent();

        range.selectNodeContents(target || editablePage);
        range.collapse(false);
        return range;
    }

    function updateTemplateDropCaret(range, event) {
        var rect = null;
        var rangeRects;
        var pageContent = getTemplatePageContentFromPoint(event.clientX, event.clientY) || getTemplatePageContentForNode(range ? range.commonAncestorContainer : null);
        var pageRect = (pageContent || editablePage).getBoundingClientRect();

        if (range) {
            rangeRects = range.getClientRects();
            rect = rangeRects.length ? rangeRects[0] : range.getBoundingClientRect();
        }

        if (!rect || (!rect.width && !rect.height)) {
            rect = {
                left: Math.max(pageRect.left + 16, Math.min(event.clientX, pageRect.right - 16)),
                top: Math.max(pageRect.top + 16, Math.min(event.clientY, pageRect.bottom - 24)),
                height: 24
            };
        }

        if (!dropCaret) {
            dropCaret = document.createElement("div");
            dropCaret.className = "template-drop-caret";
            document.body.appendChild(dropCaret);
        }

        dropCaret.style.left = Math.round(rect.left) + "px";
        dropCaret.style.top = Math.round(rect.top) + "px";
        dropCaret.style.height = Math.max(22, Math.round(rect.height || 24)) + "px";
        dropCaret.classList.add("is-visible");
    }

    function hideTemplateDropCaret() {
        if (dropCaret) {
            dropCaret.classList.remove("is-visible");
        }
    }

    function getParameterDataFromButton(button) {
        var group = button.closest("[data-placeholder-group]");

        return {
            field: button.dataset.placeholderField || "",
            label: button.dataset.placeholderLabel || button.textContent.trim(),
            group: group ? group.dataset.parameterGroup || "" : "",
            kind: button.dataset.placeholderKind || (getParameterDefinition(button.dataset.placeholderField || "") || {}).kind || "text",
            type: button.dataset.placeholderType || "placeholder",
            source: "panel"
        };
    }

    function getParameterDataFromDocumentPlaceholder(placeholder) {
        return {
            field: placeholder.dataset.field || "",
            label: placeholder.dataset.label || getTemplatePlaceholderLabel(placeholder),
            group: placeholder.dataset.group || "",
            kind: placeholder.dataset.kind || (getParameterDefinition(placeholder.dataset.field || "") || {}).kind || "text",
            type: "placeholder",
            placeholderId: ensureTemplatePlaceholderId(placeholder),
            source: "document"
        };
    }

    function isTemplateParameterDrag(event) {
        var types = event.dataTransfer ? event.dataTransfer.types : null;

        if (!types) {
            return false;
        }

        return Array.prototype.indexOf.call(types, PARAMETER_MIME) !== -1;
    }

    function getParameterDataFromTransfer(dataTransfer) {
        var raw;

        if (!dataTransfer) {
            return null;
        }

        raw = dataTransfer.getData(PARAMETER_MIME) || dataTransfer.getData("text/plain") || "";

        if (raw.indexOf(PARAMETER_TEXT_PREFIX) === 0) {
            raw = raw.slice(PARAMETER_TEXT_PREFIX.length);
        }

        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    }

    function clearTemplateDragState() {
        dropTargetDepth = 0;
        clearActiveDropPage();
        hideTemplateDropCaret();
        cleanupTemplateDragArtifacts();

        if (activeDragButton) {
            activeDragButton.classList.remove("is-dragging");
            activeDragButton = null;
        }

        if (draggingDocumentPlaceholder) {
            draggingDocumentPlaceholder.classList.remove("is-dragging");
            draggingDocumentPlaceholder = null;
        }

        documentPlaceholderMoved = false;
    }

    function scheduleTemplatePreviewUpdate() {
        window.clearTimeout(previewTimer);
        previewTimer = window.setTimeout(updateTemplatePreview, PREVIEW_DELAY);
    }

    function updateTemplatePreview() {
        if (!inlinePreview) {
            return;
        }

        renderTemplatePreviewPages();
    }

    function renderTemplatePreviewPages(target) {
        var pages = getTemplatePagesData();
        var previewTarget = target || previewPagesContainer || inlinePreview;

        if (!previewTarget) {
            return;
        }

        previewTarget.innerHTML = "";

        pages.forEach(function (page, index) {
            previewTarget.appendChild(createTemplatePreviewPage(renderPreviewFromTemplateHtml(page.html), index));
        });
    }

    function renderPreviewFromTemplateHtml(html, target) {
        var source = document.createElement("div");

        source.innerHTML = html || "";
        cleanupTemplateDragArtifactsFrom(source);
        cleanupTemplateHandArtifactsFrom(source);
        unwrapNestedEditorSheets(source);
        normalizeTemplatePlaceholders(source);
        stripTemplateElementLocks(source);

        Array.prototype.slice.call(source.querySelectorAll(".template-placeholder")).forEach(function (placeholder) {
            var field = placeholder.dataset.field || "";
            var replacement = createPreviewReplacement(field, placeholder.dataset.label || getTemplatePlaceholderLabel(placeholder) || placeholderLabels[field] || field);
            placeholder.parentNode.replaceChild(replacement, placeholder);
        });

        Array.prototype.slice.call(source.querySelectorAll(".template-page-break")).forEach(function (breakNode) {
            breakNode.parentNode.replaceChild(createPreviewPageBreak(), breakNode);
        });

        if (target) {
            target.innerHTML = source.innerHTML;
        }

        return source.innerHTML;
    }

    function cleanupTemplateDragArtifacts() {
        cleanupTemplateDragArtifactsFrom(editablePage);
    }

    function cleanupTemplateDragArtifactsFrom(scope) {
        if (!scope || !scope.querySelectorAll) {
            return;
        }

        scope.querySelectorAll(TEMP_DRAG_SELECTOR + ", " + SELECTION_MARKER_SELECTOR).forEach(function (node) {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
    }

    function cleanupTemplateHandArtifactsFrom(scope) {
        if (!scope || !scope.querySelectorAll) {
            return;
        }

        scope.querySelectorAll(".template-object-selected, .template-object-dragging").forEach(function (node) {
            node.classList.remove("template-object-selected", "template-object-dragging");
        });

        unwrapTemplateWordObjects(scope);
    }

    function normalizeTemplateParameter(parameter) {
        var definition = getParameterDefinition(parameter.field) || {};
        var label = parameter.label || definition.label || parameter.field;
        var group = parameter.group || definition.group || "";
        var kind = parameter.kind || definition.kind || "text";

        return {
            field: parameter.field,
            label: label,
            group: group,
            kind: kind
        };
    }

    function createTemplatePlaceholderElement(parameter) {
        var normalized = normalizeTemplateParameter(parameter || {});
        var span = document.createElement("span");
        var handle;
        var label;

        span.className = "template-placeholder";
        span.contentEditable = "false";
        span.draggable = false;
        span.removeAttribute("draggable");
        span.removeAttribute("tabindex");
        span.dataset.field = normalized.field;
        span.dataset.label = normalized.label;
        span.dataset.group = normalized.group;
        span.dataset.kind = normalized.kind;
        span.dataset.placeholderId = createTemplatePlaceholderId();

        handle = createTemplatePlaceholderHandle();
        label = createTemplatePlaceholderLabel(normalized.label);
        span.appendChild(handle);
        span.appendChild(label);
        return span;
    }

    function createTemplatePlaceholderHandle() {
        var handle = document.createElement("span");
        var index;
        var dot;

        handle.className = "template-placeholder-handle";
        handle.contentEditable = "false";
        handle.draggable = ENABLE_DOCUMENT_PLACEHOLDER_MOVE;
        handle.setAttribute("draggable", ENABLE_DOCUMENT_PLACEHOLDER_MOVE ? "true" : "false");
        handle.setAttribute("title", ENABLE_DOCUMENT_PLACEHOLDER_MOVE ? "Переместить чип" : "Перемещение временно отключено");
        handle.setAttribute("aria-label", ENABLE_DOCUMENT_PLACEHOLDER_MOVE ? "Переместить чип" : "Перемещение временно отключено");

        for (index = 0; index < 6; index += 1) {
            dot = document.createElement("span");
            dot.setAttribute("aria-hidden", "true");
            handle.appendChild(dot);
        }

        return handle;
    }

    function createTemplatePlaceholderLabel(labelText) {
        var label = document.createElement("span");

        label.className = "template-placeholder-label";
        label.contentEditable = "false";
        label.textContent = labelText || "";
        return label;
    }

    function createTemplatePageBreakElement(parameter) {
        var normalized = normalizeTemplateParameter(parameter || { field: "page_break" });
        var block = document.createElement("div");

        block.className = "template-page-break";
        block.contentEditable = "false";
        block.draggable = ENABLE_DOCUMENT_PLACEHOLDER_MOVE;
        block.setAttribute("draggable", ENABLE_DOCUMENT_PLACEHOLDER_MOVE ? "true" : "false");
        block.removeAttribute("tabindex");
        block.dataset.field = "page_break";
        block.dataset.label = normalized.label;
        block.dataset.group = normalized.group || "utils";
        block.dataset.kind = "page_break";
        block.textContent = normalized.label;
        return block;
    }

    function createTemplatePlaceholderId() {
        placeholderIdSeed += 1;
        return "tpl-ph-" + Date.now().toString(36) + "-" + placeholderIdSeed.toString(36);
    }

    function ensureTemplatePlaceholderId(placeholder) {
        if (!placeholder.dataset.placeholderId) {
            placeholder.dataset.placeholderId = createTemplatePlaceholderId();
        }

        return placeholder.dataset.placeholderId;
    }

    function normalizeTemplatePlaceholders(scope) {
        var target = scope || editablePage;

        if (!target || !target.querySelectorAll) {
            return;
        }

        repairBrokenPlaceholderElements(target);
        repairBrokenPlaceholderTextNodes(target);

        target.querySelectorAll(".template-placeholder").forEach(function (placeholder) {
            normalizeTemplatePlaceholderNode(placeholder);
        });

        target.querySelectorAll("[data-field]:not(.template-placeholder):not(.template-page-break)").forEach(function (node) {
            normalizeDataFieldNode(node);
        });

        target.querySelectorAll(".template-page-break").forEach(function (breakNode) {
            normalizeTemplatePageBreakNode(breakNode);
        });
    }

    function normalizeTemplatePlaceholderNode(placeholder) {
        var field = placeholder.dataset.field || getFieldByPlaceholderLabel(getTemplatePlaceholderLabel(placeholder));
        var normalized;
        var replacement;

        if (!field || !getParameterDefinition(field)) {
            return;
        }

        normalized = normalizeTemplateParameter({
            field: field,
            label: placeholder.dataset.label || getTemplatePlaceholderLabel(placeholder),
            group: placeholder.dataset.group,
            kind: placeholder.dataset.kind
        });

        if (placeholder.tagName !== "SPAN") {
            replacement = createTemplatePlaceholderElement(normalized);
            placeholder.parentNode.replaceChild(replacement, placeholder);
            return;
        }

        placeholder.classList.add("template-placeholder");
        placeholder.contentEditable = "false";
        placeholder.draggable = false;
        placeholder.removeAttribute("draggable");
        placeholder.removeAttribute("tabindex");
        placeholder.dataset.field = normalized.field;
        placeholder.dataset.label = normalized.label;
        placeholder.dataset.group = normalized.group;
        placeholder.dataset.kind = normalized.kind;
        ensureTemplatePlaceholderId(placeholder);
        ensureTemplatePlaceholderContents(placeholder, normalized.label);
    }

    function ensureTemplatePlaceholderContents(placeholder, labelText) {
        var handle = placeholder.querySelector(".template-placeholder-handle");
        var label = placeholder.querySelector(".template-placeholder-label");

        if (!handle || !label || getTemplatePlaceholderLabel(placeholder) !== labelText) {
            rebuildTemplatePlaceholderContents(placeholder, labelText);
            return;
        }

        handle.contentEditable = "false";
        handle.draggable = ENABLE_DOCUMENT_PLACEHOLDER_MOVE;
        handle.setAttribute("draggable", ENABLE_DOCUMENT_PLACEHOLDER_MOVE ? "true" : "false");
        handle.setAttribute("title", ENABLE_DOCUMENT_PLACEHOLDER_MOVE ? "Переместить чип" : "Перемещение временно отключено");
        handle.setAttribute("aria-label", ENABLE_DOCUMENT_PLACEHOLDER_MOVE ? "Переместить чип" : "Перемещение временно отключено");
        label.contentEditable = "false";
        label.textContent = labelText || "";
    }

    function rebuildTemplatePlaceholderContents(placeholder, labelText) {
        while (placeholder.firstChild) {
            placeholder.removeChild(placeholder.firstChild);
        }

        placeholder.appendChild(createTemplatePlaceholderHandle());
        placeholder.appendChild(createTemplatePlaceholderLabel(labelText));
    }

    function getTemplatePlaceholderLabel(placeholder) {
        var labelNode;
        var clone;

        if (!placeholder) {
            return "";
        }

        labelNode = placeholder.querySelector ? placeholder.querySelector(".template-placeholder-label") : null;

        if (labelNode && labelNode.textContent.trim()) {
            return labelNode.textContent.trim();
        }

        clone = placeholder.cloneNode(true);
        Array.prototype.slice.call(clone.querySelectorAll(".template-placeholder-handle")).forEach(function (handle) {
            handle.parentNode.removeChild(handle);
        });

        return clone.textContent.trim();
    }

    function normalizeTemplatePageBreakNode(breakNode) {
        var normalized = normalizeTemplateParameter({
            field: "page_break",
            label: breakNode.dataset.label || breakNode.textContent.trim() || placeholderLabels.page_break,
            group: breakNode.dataset.group || "utils",
            kind: "page_break"
        });

        breakNode.contentEditable = "false";
        breakNode.draggable = ENABLE_DOCUMENT_PLACEHOLDER_MOVE;
        breakNode.setAttribute("draggable", ENABLE_DOCUMENT_PLACEHOLDER_MOVE ? "true" : "false");
        breakNode.removeAttribute("tabindex");
        breakNode.dataset.field = "page_break";
        breakNode.dataset.label = normalized.label;
        breakNode.dataset.group = normalized.group;
        breakNode.dataset.kind = "page_break";
        breakNode.textContent = normalized.label;
    }

    function normalizeDataFieldNode(node) {
        var field = node.dataset.field || "";
        var replacement;

        if (!field || !getParameterDefinition(field)) {
            return;
        }

        if (field === "page_break") {
            replacement = createTemplatePageBreakElement({
                field: field,
                label: node.dataset.label || node.textContent.trim(),
                group: node.dataset.group,
                kind: "page_break"
            });
        } else {
            replacement = createTemplatePlaceholderElement({
                field: field,
                label: node.dataset.label || node.textContent.trim(),
                group: node.dataset.group,
                kind: node.dataset.kind
            });
        }

        node.parentNode.replaceChild(replacement, node);
    }

    function repairBrokenPlaceholderElements(scope) {
        scope.querySelectorAll("span, b, strong, font, a").forEach(function (node) {
            var field;
            var replacement;

            if (node.closest(".template-placeholder, .template-page-break, .template-word-object")) {
                return;
            }

            field = getFieldByPlaceholderLabel(node.textContent);

            if (!field || !isTemplateLikeBrokenPlaceholder(node)) {
                return;
            }

            replacement = createTemplatePlaceholderElement({
                field: field,
                label: placeholderLabels[field]
            });
            node.parentNode.replaceChild(replacement, node);
        });
    }

    function isTemplateLikeBrokenPlaceholder(node) {
        var className = String(node.className || "").toLowerCase();
        var style = String(node.getAttribute("style") || "").toLowerCase();
        var color = node.style ? String(node.style.color || "").toLowerCase() : "";

        return className.indexOf("template") !== -1 ||
            className.indexOf("placeholder") !== -1 ||
            style.indexOf("1d4ed8") !== -1 ||
            style.indexOf("rgb(29") !== -1 ||
            style.indexOf("blue") !== -1 ||
            color.indexOf("1d4ed8") !== -1 ||
            color.indexOf("rgb(29") !== -1 ||
            node.tagName === "FONT" ||
            node.tagName === "A";
    }

    function repairBrokenPlaceholderTextNodes(scope) {
        var walker;
        var textNodes = [];
        var node;

        if (!document.createTreeWalker) {
            return;
        }

        walker = document.createTreeWalker(scope, 4, null, false);

        while ((node = walker.nextNode())) {
            if (shouldRepairPlaceholderTextNode(node)) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(function (textNode) {
            var field = getFieldByPlaceholderLabel(textNode.nodeValue);
            var replacement;

            if (!field || !textNode.parentNode) {
                return;
            }

            replacement = createTemplatePlaceholderElement({
                field: field,
                label: placeholderLabels[field]
            });
            textNode.parentNode.replaceChild(replacement, textNode);
        });
    }

    function shouldRepairPlaceholderTextNode(textNode) {
        var parent = textNode ? textNode.parentNode : null;
        var field = getFieldByPlaceholderLabel(textNode ? textNode.nodeValue : "");

        if (!field || !parent || parent.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        if (parent.closest(".template-placeholder, .template-page-break, .template-word-object")) {
            return false;
        }

        return isTemplateLikeBrokenPlaceholder(parent);
    }

    function unwrapNestedEditorSheets(scope) {
        if (!scope || !scope.querySelectorAll) {
            return;
        }

        scope.querySelectorAll(".editable-page, .template-editable-page, .template-inline-preview-page").forEach(function (node) {
            if (!node.parentNode) {
                return;
            }

            while (node.firstChild) {
                node.parentNode.insertBefore(node.firstChild, node);
            }

            node.parentNode.removeChild(node);
        });
    }

    function createPreviewReplacement(field, fallbackLabel) {
        var definition = getParameterDefinition(field);
        var kind = definition ? definition.kind : "";

        if (!definition) {
            return createPreviewUnknown(field, fallbackLabel);
        }

        if (kind === "table") {
            return createPreviewTable();
        }

        if (kind === "list") {
            return createPreviewList();
        }

        if (kind === "asset") {
            return createPreviewAsset(fallbackLabel);
        }

        if (kind === "page_break") {
            return createPreviewPageBreak();
        }

        return document.createTextNode(getPreviewTextValue(field, fallbackLabel));
    }

    function getPreviewTextValue(field, fallbackLabel) {
        var definition = getParameterDefinition(field);
        var values = {
            report_title: "Тестовый отчет",
            author: "Пользователь",
            report_date: "22.05.2026",
            tag: "Учебный",
            report_type: "Универсальный отчет",
            imported_paragraphs: "Тестовый абзац импортированных данных.",
            imported_headings: "Тестовый заголовок",
            generated_at: getTodayDisplay(),
            page_number: "1",
            template_title: titleInput && titleInput.value.trim() ? titleInput.value.trim() : "Название шаблона",
            formula: "E = mc²",
            summary_block: "Сводный блок с тестовыми показателями.",
            indent: "Отступ",
            section_number: "1.1",
            custom_placeholder: "Пользовательское значение"
        };

        if (definition && definition.preview) {
            return definition.preview;
        }

        return values[field] || "[" + (fallbackLabel || field) + "]";
    }

    function createPreviewUnknown(field, fallbackLabel) {
        var span = document.createElement("span");

        span.className = "template-preview-unknown";
        span.textContent = "[Неизвестный чип: " + (field || fallbackLabel || "без поля") + "]";
        return span;
    }

    function createPreviewTable() {
        var table = document.createElement("table");
        var rows = [
            ["Показатель", "Значение"],
            ["План", "100"],
            ["Факт", "96"]
        ];

        table.className = "template-preview-generated-table";
        rows.forEach(function (row, rowIndex) {
            var tr = document.createElement("tr");

            row.forEach(function (cell) {
                var cellNode = document.createElement(rowIndex === 0 ? "th" : "td");
                cellNode.textContent = cell;
                tr.appendChild(cellNode);
            });

            table.appendChild(tr);
        });

        return table;
    }

    function createPreviewList() {
        var list = document.createElement("ul");

        list.className = "template-preview-generated-list";
        ["Первое значение", "Второе значение", "Третье значение"].forEach(function (item) {
            var li = document.createElement("li");
            li.textContent = item;
            list.appendChild(li);
        });

        return list;
    }

    function createPreviewAsset(label) {
        var box = document.createElement("div");

        box.className = "template-preview-asset";
        box.textContent = label || "Графический блок";
        return box;
    }

    function createPreviewPageBreak() {
        var breakNode = document.createElement("div");

        breakNode.className = "template-preview-page-break";
        breakNode.textContent = "Разрыв страницы";
        return breakNode;
    }

    function openTemplatePreview() {
        if (!previewModal || !previewDocument || !editor) {
            return;
        }

        renderTemplatePreviewPages(previewDocument);
        previewModal.classList.add("is-open");
        previewModal.setAttribute("aria-hidden", "false");
        document.documentElement.classList.add("modal-open");
        document.body.classList.add("modal-open");
    }

    function closeTemplatePreview() {
        if (!previewModal) {
            return;
        }

        previewModal.classList.remove("is-open");
        previewModal.setAttribute("aria-hidden", "true");
        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
    }

    function normalizeTemplateTokens() {
        normalizeTemplatePlaceholders();
    }

    function hydrateLegacyPlaceholders() {
        var pattern = /\{\{\s*([a-z_]+)\s*\}\}/g;
        var walker = document.createTreeWalker(editablePage, NodeFilter.SHOW_TEXT, null, false);
        var textNodes = [];
        var node;

        while ((node = walker.nextNode())) {
            if (pattern.test(node.nodeValue)) {
                textNodes.push(node);
            }
            pattern.lastIndex = 0;
        }

        textNodes.forEach(function (textNode) {
            var fragment = document.createDocumentFragment();
            var text = textNode.nodeValue;
            var lastIndex = 0;
            var match;

            pattern.lastIndex = 0;
            while ((match = pattern.exec(text))) {
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                }

                fragment.appendChild(createTemplatePlaceholderElement({
                    field: match[1],
                    label: placeholderLabels[match[1]] || match[1]
                }));
                lastIndex = pattern.lastIndex;
            }

            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        });
    }

    function getTodayDisplay() {
        var today = new Date();
        var day = String(today.getDate()).padStart(2, "0");
        var month = String(today.getMonth() + 1).padStart(2, "0");

        return day + "." + month + "." + today.getFullYear();
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function showToast(message, category) {
        var stack = document.querySelector(".toast-stack");
        var toast;
        var icon;
        var text;

        if (!stack) {
            stack = document.createElement("div");
            stack.className = "toast-stack";
            document.body.appendChild(stack);
        }

        toast = document.createElement("div");
        toast.className = "toast toast-" + (category || "success");
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");

        icon = document.createElement("span");
        icon.className = "toast-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = category === "error" ? "×" : category === "warning" ? "!" : "✓";

        text = document.createElement("span");
        text.className = "toast-message";
        text.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(text);
        stack.appendChild(toast);

        window.setTimeout(function () {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-8px) scale(0.98)";
            window.setTimeout(function () {
                toast.remove();
            }, 220);
        }, 3500);
    }
});
