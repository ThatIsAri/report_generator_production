(function (window, document) {
    "use strict";

    function createEditor(options) {
        var root = options.root;
        var page = options.editable;
        var toolbar = options.toolbar;
        var ruler = options.ruler;
        var onChange = typeof options.onChange === "function" ? options.onChange : function () {};
        var historyLimit = options.historyLimit || 100;
        var history = [];
        var historyIndex = -1;
        var historyTimer = null;
        var savedRange = null;
        var restoring = false;
        var tableResizeState = null;
        var currentTypingStyle = {
            fontSize: null,
            fontFamily: null,
            color: null,
            backgroundColor: null
        };

        if (!page) {
            return null;
        }

        enhanceTables(page);
        bindEditorEvents();
        bindToolbar();
        bindTablePicker();
        bindRuler();
        pushHistory("init");
        updateToolbarState();
        updateHistoryButtons();

        return {
            getHtml: getHtml,
            getSnapshot: getSnapshot,
            insertHtml: insertHtml,
            insertHtmlAtRange: insertHtmlAtRange,
            undo: undo,
            redo: redo,
            saveSelection: saveSelectionRange,
            restoreSelection: restoreSelection,
            markCheckpoint: function () {
                pushHistory("checkpoint");
            },
            focusEnd: placeCursorAtEnd,
            updateToolbarState: updateToolbarState
        };

        function bindEditorEvents() {
            page.addEventListener("input", function () {
                scheduleHistorySave("input");
                markChanged("input");
                updateToolbarState();
            });

            page.addEventListener("beforeinput", handleStyledInput);
            page.addEventListener("mouseup", function () {
                saveSelectionRange();
                updateToolbarState();
            });
            page.addEventListener("keyup", function () {
                saveSelectionRange();
                updateToolbarState();
            });
            page.addEventListener("focus", saveSelectionRange);
            page.addEventListener("mousedown", startTableResize);

            page.addEventListener("keydown", function (event) {
                var key = String(event.key || "").toLowerCase();

                if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
                    event.preventDefault();
                    undo();
                    return;
                }

                if ((event.ctrlKey || event.metaKey) && (key === "y" || (key === "z" && event.shiftKey))) {
                    event.preventDefault();
                    redo();
                    return;
                }

                if (event.key === "Tab") {
                    event.preventDefault();
                    document.execCommand("insertText", false, "    ");
                    scheduleHistorySave("tab");
                    markChanged("tab");
                }
            });

            document.addEventListener("selectionchange", function () {
                if (isSelectionInsidePage()) {
                    saveSelectionRange();
                    updateToolbarState();
                    updateRulerFromSelection();
                }
            });

            document.addEventListener("mousemove", resizeTable);
            document.addEventListener("mouseup", stopTableResize);
        }

        function bindToolbar() {
            if (!toolbar) {
                return;
            }

            toolbar.addEventListener("mousedown", function (event) {
                var control = event.target.closest("button, select, input");

                if (!control || !toolbar.contains(control)) {
                    return;
                }

                saveSelectionRange();

                if (control.tagName === "BUTTON") {
                    event.preventDefault();
                }
            }, true);

            toolbar.querySelectorAll("[data-editor-undo]").forEach(function (button) {
                button.addEventListener("click", undo);
            });

            toolbar.querySelectorAll("[data-editor-redo]").forEach(function (button) {
                button.addEventListener("click", redo);
            });

            toolbar.querySelectorAll("[data-editor-command]").forEach(function (button) {
                button.addEventListener("click", function () {
                    applyCommand(button.dataset.editorCommand);
                });
            });

            toolbar.querySelectorAll("[data-editor-align]").forEach(function (button) {
                button.addEventListener("click", function () {
                    applyCommand(button.dataset.editorAlign);
                });
            });

            toolbar.querySelectorAll("[data-editor-clear-styles]").forEach(function (button) {
                button.addEventListener("click", clearStyles);
            });

            var fontSize = toolbar.querySelector("[data-editor-font-size]");
            var fontName = toolbar.querySelector("[data-editor-font-name]");
            var foreColor = toolbar.querySelector("[data-editor-fore-color]");
            var backColor = toolbar.querySelector("[data-editor-back-color]");
            var backApply = toolbar.querySelector("[data-editor-back-apply]");
            var backSwatch = toolbar.querySelector("[data-editor-back-swatch]");
            var transparentBack = toolbar.querySelector("[data-editor-back-transparent]");

            if (fontSize) {
                fontSize.addEventListener("change", function () {
                    applyInlineStyle({ fontSize: fontSize.value + "pt" });
                });
            }

            if (fontName) {
                fontName.addEventListener("change", function () {
                    applyInlineStyle({ fontFamily: fontName.value });
                });
            }

            if (foreColor) {
                foreColor.addEventListener("change", function () {
                    applyInlineStyle({ color: foreColor.value });
                });
            }

            if (backColor && backSwatch) {
                backSwatch.style.backgroundColor = backColor.value;
                backColor.addEventListener("input", function () {
                    backSwatch.style.backgroundColor = backColor.value;
                });
                backColor.addEventListener("change", function () {
                    applyInlineStyle({ backgroundColor: backColor.value });
                });
            }

            if (backApply && backColor) {
                backApply.addEventListener("click", function () {
                    applyInlineStyle({ backgroundColor: backColor.value || "#fff3bf" });
                });
            }

            if (transparentBack) {
                transparentBack.addEventListener("click", function () {
                    currentTypingStyle.backgroundColor = null;
                    applyInlineStyle({ backgroundColor: "transparent" });
                });
            }
        }

        function bindTablePicker() {
            if (!toolbar) {
                return;
            }

            var toggle = toolbar.querySelector("[data-editor-table-toggle]");
            var popover = toolbar.querySelector("[data-table-size-popover]");
            var grid = toolbar.querySelector("[data-table-size-grid]");
            var label = toolbar.querySelector("[data-table-size-label]");

            if (!toggle || !popover || !grid) {
                return;
            }

            toggle.addEventListener("click", function (event) {
                event.stopPropagation();
                popover.hidden = !popover.hidden;
            });

            grid.addEventListener("mouseover", function (event) {
                var cell = event.target.closest("[data-table-cell]");
                var rows;
                var cols;

                if (!cell) {
                    return;
                }

                rows = Number(cell.dataset.rows);
                cols = Number(cell.dataset.cols);
                highlightTablePicker(rows, cols);

                if (label) {
                    label.textContent = rows + " x " + cols;
                }
            });

            grid.addEventListener("click", function (event) {
                var cell = event.target.closest("[data-table-cell]");

                if (!cell) {
                    return;
                }

                insertTable(Number(cell.dataset.rows), Number(cell.dataset.cols));
                popover.hidden = true;
            });

            document.addEventListener("click", function (event) {
                if (!event.target.closest(".table-picker-wrap")) {
                    popover.hidden = true;
                }
            });
        }

        function bindRuler() {
            var activeHandle = null;
            var bubble = ruler ? ruler.querySelector("[data-ruler-bubble]") : null;

            if (!ruler) {
                return;
            }

            ruler.querySelectorAll("[data-ruler-handle]").forEach(function (handle) {
                handle.addEventListener("mousedown", function (event) {
                    event.preventDefault();
                    activeHandle = handle;
                    showRulerBubble(bubble, handle, getHandleCm(handle));
                });
            });

            document.addEventListener("mousemove", function (event) {
                var cm;

                if (!activeHandle) {
                    return;
                }

                cm = Math.max(0, Math.min(16, Math.round(getRulerCmFromClientX(event.clientX) * 4) / 4));
                setHandleCm(activeHandle, cm);
                applyRulerValue(activeHandle.dataset.rulerHandle, cm);
                showRulerBubble(bubble, activeHandle, cm);
            });

            document.addEventListener("mouseup", function () {
                if (!activeHandle) {
                    return;
                }

                if (bubble) {
                    bubble.classList.remove("is-visible");
                }

                activeHandle = null;
                pushHistory("ruler");
                markChanged("ruler");
            });

            updateRulerFromSelection();
        }

        function applyCommand(command) {
            if (!command) {
                return;
            }

            flushHistorySave();
            ensureSelection();
            document.execCommand(command, false, null);
            saveSelectionRange();
            pushHistory(command);
            markChanged(command);
            updateToolbarState();
        }

        function clearStyles() {
            flushHistorySave();
            ensureSelection();
            document.execCommand("removeFormat", false, null);
            currentTypingStyle = {
                fontSize: null,
                fontFamily: null,
                color: null,
                backgroundColor: null
            };
            saveSelectionRange();
            pushHistory("clear");
            markChanged("clear");
            updateToolbarState();
        }

        function applyInlineStyle(styles) {
            var selection;
            var range;
            var span;

            ensureSelection();
            selection = window.getSelection();

            if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !isSelectionInsidePage()) {
                Object.keys(styles).forEach(function (key) {
                    currentTypingStyle[key] = styles[key];
                });
                focusEditableTarget();
                updateToolbarState();
                return;
            }

            flushHistorySave();
            range = selection.getRangeAt(0);
            span = document.createElement("span");
            applyStyles(span, styles);

            try {
                span.appendChild(range.extractContents());
                range.insertNode(span);
                selection.removeAllRanges();
                range = document.createRange();
                range.selectNodeContents(span);
                selection.addRange(range);
                saveSelectionRange();
                pushHistory("style");
                markChanged("style");
                updateToolbarState();
            } catch (error) {
                Object.keys(styles).forEach(function (key) {
                    currentTypingStyle[key] = styles[key];
                });
                updateToolbarState();
            }
        }

        function handleStyledInput(event) {
            var activeStyles = {};
            var selection;
            var range;
            var span;

            if (event.inputType !== "insertText" || !event.data) {
                return;
            }

            Object.keys(currentTypingStyle).forEach(function (key) {
                if (currentTypingStyle[key]) {
                    activeStyles[key] = currentTypingStyle[key];
                }
            });

            if (!Object.keys(activeStyles).length) {
                return;
            }

            selection = window.getSelection();

            if (!selection || selection.rangeCount === 0 || !selection.isCollapsed || !isSelectionInsidePage()) {
                return;
            }

            event.preventDefault();
            range = selection.getRangeAt(0);
            span = document.createElement("span");
            applyStyles(span, activeStyles);
            span.textContent = event.data;
            range.deleteContents();
            range.insertNode(span);
            range.setStartAfter(span);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            saveSelectionRange();
            scheduleHistorySave("styled-input");
            markChanged("styled-input");
        }

        function applyStyles(element, styles) {
            Object.keys(styles).forEach(function (key) {
                element.style[key] = styles[key];
            });
        }

        function insertTable(rows, cols) {
            var html = '<table class="editor-table">';
            var row;
            var col;

            rows = Math.max(1, Math.min(20, rows || 1));
            cols = Math.max(1, Math.min(20, cols || 1));

            for (row = 0; row < rows; row += 1) {
                html += "<tr>";
                for (col = 0; col < cols; col += 1) {
                    html += "<td><br></td>";
                }
                html += "</tr>";
            }

            html += "</table>";
            insertHtml(html, "table");
        }

        function insertHtml(html, reason) {
            flushHistorySave();
            ensureSelection();
            document.execCommand("insertHTML", false, html);
            enhanceTables(page);
            saveSelectionRange();
            pushHistory(reason || "insert");
            markChanged(reason || "insert");
            updateToolbarState();
        }

        function insertHtmlAtRange(html, range, reason) {
            var selection = window.getSelection();

            if (!range || !page.contains(range.commonAncestorContainer)) {
                insertHtml(html, reason);
                return;
            }

            flushHistorySave();
            focusEditableTarget(range.commonAncestorContainer);

            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range.cloneRange());
            }

            document.execCommand("insertHTML", false, html);
            enhanceTables(page);
            saveSelectionRange();
            pushHistory(reason || "insert");
            markChanged(reason || "insert");
            updateToolbarState();
        }

        function saveSelectionRange() {
            var selection = window.getSelection();
            var range;

            if (!selection || selection.rangeCount === 0) {
                return;
            }

            range = selection.getRangeAt(0);

            if (page.contains(range.commonAncestorContainer)) {
                savedRange = range.cloneRange();
            }
        }

        function restoreSelection() {
            var selection = window.getSelection();

            if (!selection || !savedRange) {
                return false;
            }

            try {
                if (!page.contains(savedRange.commonAncestorContainer)) {
                    return false;
                }

                selection.removeAllRanges();
                selection.addRange(savedRange.cloneRange());
                focusEditableTarget(savedRange.commonAncestorContainer);
                return true;
            } catch (error) {
                return false;
            }
        }

        function ensureSelection() {
            if (restoreSelection() && isSelectionInsidePage()) {
                return;
            }

            placeCursorAtEnd();
        }

        function placeCursorAtEnd() {
            var range = document.createRange();
            var selection = window.getSelection();
            var target = getLastEditableTarget();

            target.focus();
            range.selectNodeContents(target);
            range.collapse(false);

            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }

            savedRange = range.cloneRange();
        }

        function focusEditableTarget(node) {
            var element = node && node.nodeType === Node.ELEMENT_NODE ? node : (node ? node.parentNode : null);
            var target = element && element.closest ? element.closest('[contenteditable="true"]') : null;

            (target || getLastEditableTarget()).focus();
        }

        function getLastEditableTarget() {
            var targets = page.matches && page.matches('[contenteditable="true"]') ? [page] : page.querySelectorAll('[contenteditable="true"]');

            return targets.length ? targets[targets.length - 1] : page;
        }

        function isSelectionInsidePage() {
            var selection = window.getSelection();
            var range;

            if (!selection || selection.rangeCount === 0) {
                return false;
            }

            range = selection.getRangeAt(0);
            return page.contains(range.commonAncestorContainer);
        }

        function scheduleHistorySave(reason) {
            if (restoring) {
                return;
            }

            window.clearTimeout(historyTimer);
            historyTimer = window.setTimeout(function () {
                pushHistory(reason);
            }, 420);
        }

        function flushHistorySave() {
            window.clearTimeout(historyTimer);
            pushHistory("flush");
        }

        function pushHistory(reason) {
            var html;
            var current;

            if (restoring) {
                return;
            }

            html = getHtml();
            current = history[historyIndex];

            if (current && current.html === html) {
                updateHistoryButtons();
                return;
            }

            history = history.slice(0, historyIndex + 1);
            history.push({ html: html, reason: reason || "" });

            if (history.length > historyLimit) {
                history.shift();
            }

            historyIndex = history.length - 1;
            updateHistoryButtons();
        }

        function undo() {
            flushHistorySave();

            if (historyIndex <= 0) {
                return;
            }

            historyIndex -= 1;
            restoreHistoryItem(history[historyIndex]);
            markChanged("undo");
        }

        function redo() {
            flushHistorySave();

            if (historyIndex >= history.length - 1) {
                return;
            }

            historyIndex += 1;
            restoreHistoryItem(history[historyIndex]);
            markChanged("redo");
        }

        function restoreHistoryItem(item) {
            restoring = true;
            page.innerHTML = item ? item.html : "";
            enhanceTables(page);
            placeCursorAtEnd();
            restoring = false;
            updateHistoryButtons();
            updateToolbarState();
        }

        function updateHistoryButtons() {
            if (!toolbar) {
                return;
            }

            toolbar.querySelectorAll("[data-editor-undo]").forEach(function (button) {
                button.disabled = historyIndex <= 0;
            });

            toolbar.querySelectorAll("[data-editor-redo]").forEach(function (button) {
                button.disabled = historyIndex >= history.length - 1;
            });
        }

        function getSnapshot() {
            return {
                pages: [
                    {
                        html: getHtml(),
                        orientation: "portrait"
                    }
                ]
            };
        }

        function getHtml() {
            var clone = page.cloneNode(true);

            clone.querySelectorAll(".table-resize-handle, [data-editor-caret-marker]").forEach(function (node) {
                node.remove();
            });

            return clone.innerHTML;
        }

        function markChanged(reason) {
            onChange(reason || "change");
        }

        function updateToolbarState() {
            var alignMap = {
                justifyLeft: "justifyLeft",
                justifyCenter: "justifyCenter",
                justifyRight: "justifyRight",
                justifyFull: "justifyFull"
            };
            var activeAlign = "justifyLeft";

            if (!toolbar) {
                return;
            }

            toolbar.querySelectorAll("[data-editor-command]").forEach(function (button) {
                var command = button.dataset.editorCommand;
                var active = false;

                try {
                    active = document.queryCommandState(command);
                } catch (error) {
                    active = false;
                }

                button.classList.toggle("is-active", active);
            });

            try {
                activeAlign = document.queryCommandState("justifyCenter") ? "justifyCenter" :
                    document.queryCommandState("justifyRight") ? "justifyRight" :
                    document.queryCommandState("justifyFull") ? "justifyFull" : "justifyLeft";
            } catch (error) {
                activeAlign = "justifyLeft";
            }

            toolbar.querySelectorAll("[data-editor-align]").forEach(function (button) {
                button.classList.toggle("is-active", alignMap[button.dataset.editorAlign] === activeAlign);
            });
        }

        function highlightTablePicker(rows, cols) {
            if (!toolbar) {
                return;
            }

            toolbar.querySelectorAll("[data-table-cell]").forEach(function (cell) {
                var cellRows = Number(cell.dataset.rows);
                var cellCols = Number(cell.dataset.cols);
                cell.classList.toggle("is-active", cellRows <= rows && cellCols <= cols);
            });
        }

        function enhanceTables(scope) {
            scope.querySelectorAll("table").forEach(function (table) {
                table.classList.add("editor-table");

                table.querySelectorAll("td, th").forEach(function (cell) {
                    if (!cell.querySelector(":scope > [data-resize-col]")) {
                        var colHandle = document.createElement("span");
                        colHandle.className = "table-resize-handle col-resize";
                        colHandle.dataset.resizeCol = "";
                        colHandle.contentEditable = "false";
                        cell.appendChild(colHandle);
                    }

                    if (!cell.querySelector(":scope > [data-resize-row]")) {
                        var rowHandle = document.createElement("span");
                        rowHandle.className = "table-resize-handle row-resize";
                        rowHandle.dataset.resizeRow = "";
                        rowHandle.contentEditable = "false";
                        cell.appendChild(rowHandle);
                    }
                });
            });
        }

        function startTableResize(event) {
            var colHandle = event.target.closest("[data-resize-col]");
            var rowHandle = event.target.closest("[data-resize-row]");
            var cell;
            var row;
            var table;
            var cellIndex;
            var firstRowCells;
            var columnWidths;

            if (!colHandle && !rowHandle) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            cell = event.target.closest("td, th");
            row = cell ? cell.parentElement : null;
            table = cell ? cell.closest("table") : null;

            if (!cell || !row || !table) {
                return;
            }

            cellIndex = Array.prototype.indexOf.call(row.children, cell);
            firstRowCells = table.rows.length ? Array.prototype.slice.call(table.rows[0].cells) : [];
            columnWidths = firstRowCells.map(function (firstRowCell) {
                return firstRowCell.getBoundingClientRect().width;
            });

            columnWidths.forEach(function (width, index) {
                setTableColumnWidth(table, index, width);
            });

            table.classList.add("is-resizing");

            tableResizeState = {
                type: colHandle ? "col" : "row",
                table: table,
                row: row,
                cellIndex: cellIndex,
                startX: event.clientX,
                startY: event.clientY,
                startWidth: cell.getBoundingClientRect().width,
                startHeight: cell.getBoundingClientRect().height,
                columnWidths: columnWidths
            };
        }

        function resizeTable(event) {
            if (!tableResizeState) {
                return;
            }

            if (tableResizeState.type === "col") {
                resizeTableColumn(event);
            } else {
                resizeTableRow(event);
            }
        }

        function resizeTableColumn(event) {
            var table = tableResizeState.table;
            var delta = event.clientX - tableResizeState.startX;
            var nextWidth = Math.max(34, tableResizeState.startWidth + delta);

            setTableColumnWidth(table, tableResizeState.cellIndex, nextWidth);
        }

        function setTableColumnWidth(table, columnIndex, width) {
            Array.prototype.forEach.call(table.rows, function (row) {
                var cell = row.cells[columnIndex];

                if (cell) {
                    cell.style.width = Math.round(width) + "px";
                }
            });
        }

        function resizeTableRow(event) {
            var nextHeight = Math.max(24, tableResizeState.startHeight + event.clientY - tableResizeState.startY);

            Array.prototype.forEach.call(tableResizeState.row.cells, function (cell) {
                cell.style.height = Math.round(nextHeight) + "px";
            });
        }

        function stopTableResize() {
            if (!tableResizeState) {
                return;
            }

            tableResizeState.table.classList.remove("is-resizing");
            tableResizeState = null;
            pushHistory("table-resize");
            markChanged("table-resize");
        }

        function getRulerScaleRect() {
            var scale = ruler ? ruler.querySelector(".ruler-scale") : null;
            return (scale || ruler).getBoundingClientRect();
        }

        function getRulerCmFromClientX(clientX) {
            var rect = getRulerScaleRect();
            return ((clientX - rect.left) / rect.width) * 16;
        }

        function getHandleCm(handle) {
            var rect = getRulerScaleRect();
            var handleRect = handle.getBoundingClientRect();
            var center = handleRect.left + handleRect.width / 2;
            return Math.round(((center - rect.left) / rect.width * 16) * 4) / 4;
        }

        function setHandleCm(handle, cm) {
            var rulerRect;
            var scaleRect;
            var x;

            if (!handle || !ruler) {
                return;
            }

            rulerRect = ruler.getBoundingClientRect();
            scaleRect = getRulerScaleRect();
            x = scaleRect.left - rulerRect.left + (cm / 16) * scaleRect.width;
            handle.style.left = x / rulerRect.width * 100 + "%";
            handle.dataset.cm = String(cm);
        }

        function applyRulerValue(type, cm) {
            var px = cm * 37.8;

            if (type === "page-left") {
                page.style.paddingLeft = 48 + px + "px";
            } else if (type === "page-right") {
                page.style.paddingRight = 48 + Math.max(0, 16 * 37.8 - px) + "px";
            } else if (type === "paragraph") {
                getCurrentParagraph().style.marginLeft = px + "px";
            } else if (type === "line") {
                getCurrentParagraph().style.textIndent = px + "px";
            }
        }

        function updateRulerFromSelection() {
            var styles;
            var paragraph;
            var paragraphStyles;
            var leftPaddingCm;
            var rightPaddingCm;

            if (!ruler) {
                return;
            }

            styles = window.getComputedStyle(page);
            paragraph = getCurrentParagraph();
            paragraphStyles = paragraph ? window.getComputedStyle(paragraph) : null;
            leftPaddingCm = Math.max(0, ((parseFloat(styles.paddingLeft) || 48) - 48) / 37.8);
            rightPaddingCm = Math.max(0, ((parseFloat(styles.paddingRight) || 48) - 48) / 37.8);

            setHandleCm(ruler.querySelector('[data-ruler-handle="page-left"]'), Math.min(16, leftPaddingCm));
            setHandleCm(ruler.querySelector('[data-ruler-handle="page-right"]'), Math.max(0, 16 - rightPaddingCm));
            setHandleCm(ruler.querySelector('[data-ruler-handle="paragraph"]'), paragraphStyles ? Math.max(0, (parseFloat(paragraphStyles.marginLeft) || 0) / 37.8) : 0);
            setHandleCm(ruler.querySelector('[data-ruler-handle="line"]'), paragraphStyles ? Math.max(0, (parseFloat(paragraphStyles.textIndent) || 0) / 37.8) : 0);
        }

        function getCurrentParagraph() {
            var selection = window.getSelection();
            var node = selection && selection.anchorNode;
            var element = node && (node.nodeType === 1 ? node : node.parentElement);
            var paragraph = element ? element.closest("p, li, div, h1, h2, h3, td, th") : null;

            if (paragraph && page.contains(paragraph)) {
                return paragraph;
            }

            return page;
        }

        function showRulerBubble(bubble, handle, cm) {
            var normalized;

            if (!bubble) {
                return;
            }

            normalized = Math.round(cm * 10) / 10;
            bubble.textContent = String(normalized).replace(".", ",") + " см";
            bubble.style.left = handle.style.left || "0%";
            bubble.classList.add("is-visible");
        }
    }

    window.DocumentEditorCore = {
        createEditor: createEditor
    };
})(window, document);
