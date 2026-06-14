 (function () {
    "use strict";

    var MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

    function getCsrfToken() {
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute("content") || "" : "";
    }

    function isSameOrigin(url) {
        var parsedUrl;

        try {
            parsedUrl = new URL(url, window.location.href);
        } catch (error) {
            return false;
        }

        return parsedUrl.origin === window.location.origin;
    }

    function isMutatingMethod(method) {
        return MUTATING_METHODS.indexOf(String(method || "GET").toUpperCase()) !== -1;
    }

    window.getCsrfToken = getCsrfToken;

    if (window.fetch) {
        var nativeFetch = window.fetch.bind(window);

        window.fetch = function (input, init) {
            var requestInit = init || {};
            var method = requestInit.method || (input && input.method) || "GET";
            var url = input && input.url ? input.url : input;
            var token = getCsrfToken();

            if (token && isMutatingMethod(method) && isSameOrigin(url)) {
                var headers = new Headers(requestInit.headers || (input && input.headers) || {});
                headers.set("X-CSRFToken", token);
                requestInit = Object.assign({}, requestInit, { headers: headers });
            }

            return nativeFetch(input, requestInit);
        };
    }

    document.addEventListener("submit", function (event) {
        var form = event.target;
        var token = getCsrfToken();

        if (!token || !form || form.tagName !== "FORM") {
            return;
        }

        if (!isMutatingMethod(form.method || "GET") || !isSameOrigin(form.action || window.location.href)) {
            return;
        }

        if (!form.querySelector('input[name="_csrf_token"]')) {
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = "_csrf_token";
            input.value = token;
            form.appendChild(input);
        }
    }, true);
}());

document.addEventListener("DOMContentLoaded", function () {
    var userMenu = document.querySelector("[data-user-menu]");
    var userMenuButton = document.querySelector("[data-user-menu-button]");
    var organizationMenu = document.querySelector("[data-organization-menu]");
    var organizationMenuButton = document.querySelector("[data-organization-menu-button]");
    var createModal = document.querySelector('[data-modal="createReportModal"]');
    var previewModal = document.querySelector('[data-modal="previewReportModal"]');
    var allReportsModal = document.querySelector('[data-modal="allReportsModal"]');
    var pinFolderModal = document.querySelector('[data-modal="pinFolderModal"]');
    var folderPickerModal = document.querySelector('[data-modal="folderPickerModal"]');
    var reportLinkPickerModal = document.querySelector('[data-modal="reportLinkPickerModal"]');
    var reportSharePickerModal = document.querySelector('[data-modal="reportSharePickerModal"]');
    var createTemplateModal = document.querySelector('[data-modal="createTemplateModal"]');
    var organizationMembersPopover = document.querySelector("[data-organization-members-popover]");
    var organizationMessagesPopover = document.querySelector("[data-organization-messages-popover]");
    var organizationSharedReportsPopover = document.querySelector("[data-organization-shared-reports-popover]");
    var organizationSharedReportsSearch = document.querySelector("[data-organization-shared-reports-search]");
    var organizationSharedReportsList = document.querySelector("[data-organization-shared-reports-list]");
    var organizationSharedReportsLoading = document.querySelector("[data-organization-shared-reports-loading]");
    var organizationSharedReportsError = document.querySelector("[data-organization-shared-reports-error]");
    var organizationSharedReportsEmpty = document.querySelector("[data-organization-shared-reports-empty]");
    var organizationMessagesCloseButton = document.querySelector("[data-organization-messages-close]");
    var organizationMessagesUsers = document.querySelector("[data-organization-messages-users]");
    var organizationMessagesLoading = document.querySelector("[data-organization-messages-loading]");
    var organizationMessagesError = document.querySelector("[data-organization-messages-error]");
    var organizationMessagesEmpty = document.querySelector("[data-organization-messages-empty]");
    var organizationMessagesDialogName = document.querySelector("[data-organization-messages-dialog-name]");
    var organizationMessagesDialogMeta = document.querySelector("[data-organization-messages-dialog-meta]");
    var organizationMessagesHistory = document.querySelector("[data-organization-messages-history]");
    var organizationMessagesForm = document.querySelector("[data-organization-messages-form]");
    var organizationMessagesInput = document.querySelector("[data-organization-messages-input]");
    var organizationMessagesSend = document.querySelector("[data-organization-messages-send]");
    var organizationMembersBody = document.querySelector("[data-organization-members-body]");
    var organizationMembersTableWrap = document.querySelector("[data-organization-members-table-wrap]");
    var organizationMembersLoading = document.querySelector("[data-organization-members-loading]");
    var organizationMembersEmpty = document.querySelector("[data-organization-members-empty]");
    var organizationMembersError = document.querySelector("[data-organization-members-error]");
    var organizationMembersSearch = document.querySelector("[data-organization-members-search]");
    var organizationMemberMenu = document.querySelector("[data-organization-member-menu]");
    var dashboardPreviewStage = document.querySelector("[data-dashboard-preview-stage]");
    var dashboardPreviewDocument = document.querySelector("[data-dashboard-preview-document]");
    var dashboardPreviewEdit = document.querySelector("[data-dashboard-preview-edit]");
    var dashboardPreviewFolderButton = document.querySelector("[data-dashboard-preview-folder-button]");
    var dashboardPreviewFolderText = document.querySelector("[data-dashboard-preview-folder-text]");
    var dashboardPreviewLinkButton = document.querySelector("[data-dashboard-preview-link-button]");
    var dashboardPreviewLinkText = document.querySelector("[data-dashboard-preview-link-text]");
    var dashboardPreviewShareButton = document.querySelector("[data-dashboard-preview-share-button]");
    var dashboardPreviewShareText = document.querySelector("[data-dashboard-preview-share-text]");
    var dashboardPreviewSharesDropdown = document.querySelector("[data-dashboard-preview-shares-dropdown]");
    var renameModal = document.querySelector('[data-modal="renameReportModal"]');
    var renameForm = document.querySelector("[data-rename-form]");
    var renameTitle = document.querySelector("[data-rename-title]");
    var renameTag = document.querySelector("[data-rename-tag]");
    var searchWidget = document.querySelector("[data-search-widget]");
    var searchToggle = document.querySelector("[data-search-toggle]");
    var searchInput = document.querySelector("[data-report-search-input]");
    var filterButton = document.querySelector("[data-filter-placeholder]");
    var selectToggle = document.querySelector("[data-select-toggle]");
    var reportCards = document.querySelectorAll("[data-report-card]");
    var mainModeButtons = document.querySelectorAll("[data-main-mode-toggle]");
    var mainModePanels = document.querySelectorAll("[data-main-mode-panel]");
    var dashboardPage = document.querySelector(".dashboard-page");
    var dashboardTitle = document.querySelector("[data-dashboard-title]");
    var dashboardTitleCurrent = document.querySelector("[data-dashboard-title-current]");
    var dashboardTitleNext = document.querySelector("[data-dashboard-title-next]");
    var dashboardBoard = document.querySelector("[data-dashboard-board]");
    var dashboardTemplateGrid = document.querySelector("[data-dashboard-template-grid]");
    var templateTagsStrip = document.querySelector("[data-template-tags-strip]");
    var templateTagReset = document.querySelector("[data-template-tag-reset]");
    var dashboardTemplateEmpty = document.querySelector("[data-dashboard-template-empty]");
    var dashboardTemplateData = document.querySelector("[data-dashboard-template-data]");
    var dashboardTemplateTaxonomyData = document.querySelector("[data-template-taxonomy-data]");
    var folderResetButton = document.querySelector("[data-folder-reset]");
    var pinnedFolderStrip = document.querySelector("[data-pinned-folder-strip]");
    var pinnedFolderScrollButtons = document.querySelectorAll("[data-pinned-scroll]");
    var folderSearchInput = document.querySelector("[data-folder-search]");
    var folderSearchModeButton = document.querySelector("[data-folder-search-mode-button]");
    var folderSearchModeMenu = document.querySelector("[data-folder-search-mode-menu]");
    var folderSearchModeIcon = document.querySelector("[data-folder-search-mode-icon]");
    var folderSearchModeOptions = document.querySelectorAll("[data-folder-search-mode-option]");
    var folderPickerSearch = document.querySelector("[data-folder-picker-search]");
    var folderPickerTree = document.querySelector("[data-folder-picker-tree]");
    var folderPickerConfirm = document.querySelector("[data-folder-picker-confirm]");
    var reportLinkTree = document.querySelector("[data-report-link-tree]");
    var reportLinkSearch = document.querySelector("[data-report-link-search]");
    var reportLinkConfirm = document.querySelector("[data-report-link-confirm]");
    var reportShareSearch = document.querySelector("[data-report-share-search]");
    var reportShareList = document.querySelector("[data-report-share-list]");
    var reportShareLoading = document.querySelector("[data-report-share-loading]");
    var reportShareError = document.querySelector("[data-report-share-error]");
    var reportShareEmpty = document.querySelector("[data-report-share-empty]");
    var reportShareNoResults = document.querySelector("[data-report-share-no-results]");
    var reportShareConfirm = document.querySelector("[data-report-share-confirm]");
    var reportShareSubjectTypeButtons = document.querySelectorAll("[data-report-share-subject-type]");
    var folderReportRows = document.querySelectorAll("[data-folder-report-row]");
    var folderReportCaption = document.querySelector("[data-folder-report-caption]");
    var folderReportEmpty = document.querySelector("[data-folder-report-empty]");
    var PINNED_FOLDER_LIMIT = 20;
    var selectionMode = false;
    var activeFolderFilter = "";
    var currentSearchQuery = "";
    var selectedAllReportsFolderId = "";
    var selectedPinFolderId = "";
    var folderSearchMode = "folders";
    var currentFolderSearchQuery = "";
    var currentFolderReportQuery = "";
    var DASHBOARD_MAIN_MODE_STORAGE_KEY = "dashboardMainMode";
    var activeMainMode = getStoredDashboardMainMode();
    var activeTemplateTag = "";
    var dashboardModeTitles = {
        reports: "Модуль отчетов",
        templates: "Модуль шаблонов"
    };
    var dashboardModeOrder = {
        reports: 0,
        templates: 1
    };
    var DASHBOARD_TITLE_EXIT_DURATION = 800;
    var DASHBOARD_TITLE_ENTER_DURATION = 620;
    var DASHBOARD_TITLE_ENTER_DELAY = 150;
    var dashboardTitleAnimationTimers = [];
    var activeDashboardPreviewCard = null;
    var dashboardPreviewReportId = "";
    var dashboardPreviewFolderUpdateUrl = "";
    var dashboardPreviewLinkUpdateUrl = "";
    var dashboardPreviewShares = [];
    var dashboardPreviewExportUrl = "";
    var reportExportState = {
        isExporting: false
    };
    var organizationMembersState = {
        isLoading: false,
        members: [],
        query: "",
        hasLoaded: false
    };
    var organizationGroupsState = {
        isLoading: false,
        groups: [],
        hasLoaded: false
    };
    var organizationMessagesState = {
        selectedMemberId: "",
        messagesByMemberId: {}
    };
    var organizationSharedReportsState = {
        isLoading: false,
        reports: [],
        query: "",
        hasLoaded: false
    };
    var adminUsersState = {
        isLoading: false,
        hasLoaded: false,
        hasError: false,
        users: [],
        query: "",
        pendingDeleteUserId: null
    };
    var adminGroupsState = {
        isLoading: false,
        hasLoaded: false,
        hasError: false,
        groups: [],
        query: "",
        createSelectedMemberIds: new Set(),
        editSelectedMemberIds: new Set(),
        createMemberQuery: "",
        editMemberQuery: "",
        editingGroupId: null,
        pendingDeleteGroupId: null
    };
    var adminAccessState = {
        isLoadingOptions: false,
        hasLoadedOptions: false,
        hasOptionsError: false,
        isLoadingPermissions: false,
        isSaving: false,
        subjectType: "user",
        selectedSubjectId: "",
        query: "",
        users: [],
        groups: [],
        permissionGroups: [],
        selectedPermissions: new Set()
    };
    var adminActionsState = {
        isLoading: false,
        hasLoaded: false,
        hasError: false,
        logs: [],
        users: [],
        actions: [],
        query: "",
        userId: "",
        actionKey: ""
    };
    var adminReportsState = {
        isLoading: false,
        hasLoaded: false,
        hasError: false,
        reports: [],
        stats: {},
        query: "",
        accessQuery: "",
        structureQuery: "",
        activeSection: "registry"
    };
    var adminReportSettingsState = {
        isLoading: false,
        hasLoaded: false,
        hasError: false,
        isSaving: false,
        settingGroups: [],
        values: {}
    };
    var adminTemplatesState = {
        isLoading: false,
        hasLoaded: false,
        hasError: false,
        templates: [],
        stats: {},
        typeSummary: [],
        tagSummary: [],
        query: "",
        accessQuery: "",
        activeSection: "registry"
    };
    var adminTemplateSettingsState = {
        isLoading: false,
        hasLoaded: false,
        hasError: false,
        isSaving: false,
        settingGroups: [],
        values: {}
    };
    var adminTemplateChipsState = {
        isLoading: false,
        hasLoaded: false,
        hasError: false,
        chips: [],
        categories: [],
        editingChipId: null,
        editingCategoryId: null
    };
    var adminSystemState = {
        activeSection: "general",
        isLoadingSettings: false,
        hasLoadedSettings: false,
        hasSettingsError: false,
        isSaving: false,
        settingGroups: [],
        values: {},
        isLoadingDiagnostics: false,
        hasLoadedDiagnostics: false,
        hasDiagnosticsError: false,
        diagnostics: null
    };
    var adminTaxonomyState = {
        isLoading: false,
        hasLoaded: false,
        hasError: false,
        isSaving: false,
        options: {
            report: {
                type: [],
                tag: []
            },
            template: {
                type: [],
                tag: []
            }
        },
        editingOptionId: null,
        editingScope: "",
        editingType: ""
    };
    var foldersById = {};
    var pinnedFolderIds = [];
    var folderState = {
        folders: [],
        expandedFolderIds: new Set(),
        selectedFolderId: null,
        activeFilterFolderId: null,
        pinnedFolderIds: []
    };
    var createSelectedFolderId = "";
    var createSelectedLinkedReportId = "";
    var folderPickerState = {
        selectedFolderId: "",
        onConfirm: null
    };
    var reportLinkPickerState = {
        currentReportId: null,
        selectedReportId: "",
        onConfirm: null,
        folders: [],
        reports: [],
        expandedFolderIds: new Set(),
        loaded: false
    };
    var templateTagPalette = ["#8b5cf6", "#38bdf8", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6"];
    var templateTaxonomy = parseDashboardTemplateTaxonomyData();
    var templateTags = buildInitialTemplateTags(templateTaxonomy);
    var dashboardTemplateMocks = parseDashboardTemplateData().map(normalizeDashboardTemplateFromApi);
    var templateCreateState = {
        sourceTemplateId: null,
        sourceTemplateKey: "empty",
        sourceTemplateTitle: "Пустой шаблон",
        title: "",
        tag: "",
        type: "Универсальный",
        createdAt: ""
    };

    var appState = {
        currentPage: document.body.dataset.page || "",
        reports: [],
        activeModal: null,
        activeMainMode: activeMainMode
    };

    var createReportForm = document.querySelector("[data-create-report-form]");
    var createReportTitle = document.querySelector("[data-create-report-title]");
    var createFolderIdInput = document.querySelector("[data-create-folder-id]");
    var createFolderPickerButton = document.querySelector("[data-create-folder-picker]");
    var createFolderLabel = document.querySelector("[data-create-folder-label]");
    var createLinkedReportIdInput = document.querySelector("[data-create-linked-report-id]");
    var createLinkPickerButton = document.querySelector("[data-create-link-picker]");
    var createLinkEmpty = document.querySelector("[data-create-link-empty]");
    var createLinkSelected = document.querySelector("[data-create-link-selected]");
    var createLinkLabel = document.querySelector("[data-create-link-label]");
    var createShareUserIdsInput = document.querySelector("[data-create-share-user-ids]");
    var createShareGroupIdsInput = document.querySelector("[data-create-share-group-ids]");
    var createSharePickerButton = document.querySelector("[data-create-share-picker]");
    var createShareEditButton = document.querySelector("[data-create-share-edit]");
    var createShareEmpty = document.querySelector("[data-create-share-empty]");
    var createShareSelected = document.querySelector("[data-create-share-selected]");
    var createShareSummary = document.querySelector("[data-create-share-summary]");
    var adminUsersSearch = document.querySelector("[data-admin-users-search]");
    var adminUsersLoading = document.querySelector("[data-admin-users-loading]");
    var adminUsersError = document.querySelector("[data-admin-users-error]");
    var adminUsersEmpty = document.querySelector("[data-admin-users-empty]");
    var adminUsersNoResults = document.querySelector("[data-admin-users-no-results]");
    var adminUsersTableWrap = document.querySelector("[data-admin-users-table-wrap]");
    var adminUsersBody = document.querySelector("[data-admin-users-body]");
    var adminUserActionsMenu = document.querySelector("[data-admin-user-actions-menu]");
    var adminUserCardModal = document.querySelector('[data-modal="adminUserCardModal"]');
    var adminUserDeleteModal = document.querySelector('[data-modal="adminUserDeleteModal"]');
    var adminUserDeleteName = document.querySelector("[data-admin-delete-user-name]");
    var adminUserDeleteConfirm = document.querySelector("[data-admin-user-delete-confirm]");
    var adminGroupsSearch = document.querySelector("[data-admin-groups-search]");
    var adminGroupsLoading = document.querySelector("[data-admin-groups-loading]");
    var adminGroupsError = document.querySelector("[data-admin-groups-error]");
    var adminGroupsEmpty = document.querySelector("[data-admin-groups-empty]");
    var adminGroupsNoResults = document.querySelector("[data-admin-groups-no-results]");
    var adminGroupsTableWrap = document.querySelector("[data-admin-groups-table-wrap]");
    var adminGroupsBody = document.querySelector("[data-admin-groups-body]");
    var adminGroupActionsMenu = document.querySelector("[data-admin-group-actions-menu]");
    var adminGroupCreateModal = document.querySelector('[data-modal="adminGroupCreateModal"]');
    var adminGroupCreateForm = document.querySelector("[data-admin-group-create-form]");
    var adminGroupCreateOpen = document.querySelector("[data-admin-group-create-open]");
    var adminGroupCreateName = document.querySelector("[data-admin-group-create-name]");
    var adminGroupCreateDescription = document.querySelector("[data-admin-group-create-description]");
    var adminGroupCreateMemberSearch = document.querySelector("[data-admin-group-create-member-search]");
    var adminGroupCreateMembersList = document.querySelector("[data-admin-group-create-members-list]");
    var adminGroupCreateMembersLoading = document.querySelector("[data-admin-group-create-members-loading]");
    var adminGroupCreateMembersEmpty = document.querySelector("[data-admin-group-create-members-empty]");
    var adminGroupCreateMembersNoResults = document.querySelector("[data-admin-group-create-members-no-results]");
    var adminGroupCreateSelectedCount = document.querySelector("[data-admin-group-create-selected-count]");
    var adminGroupCreateSubmit = document.querySelector("[data-admin-group-create-submit]");
    var adminGroupCardModal = document.querySelector('[data-modal="adminGroupCardModal"]');
    var adminGroupMembersModal = document.querySelector('[data-modal="adminGroupMembersModal"]');
    var adminGroupMembersSubtitle = document.querySelector("[data-admin-group-members-subtitle]");
    var adminGroupEditMemberSearch = document.querySelector("[data-admin-group-edit-member-search]");
    var adminGroupEditMembersList = document.querySelector("[data-admin-group-edit-members-list]");
    var adminGroupEditMembersLoading = document.querySelector("[data-admin-group-edit-members-loading]");
    var adminGroupEditMembersEmpty = document.querySelector("[data-admin-group-edit-members-empty]");
    var adminGroupEditMembersNoResults = document.querySelector("[data-admin-group-edit-members-no-results]");
    var adminGroupEditSelectedCount = document.querySelector("[data-admin-group-edit-selected-count]");
    var adminGroupMembersSave = document.querySelector("[data-admin-group-members-save]");
    var adminGroupDeleteModal = document.querySelector('[data-modal="adminGroupDeleteModal"]');
    var adminGroupDeleteName = document.querySelector("[data-admin-delete-group-name]");
    var adminGroupDeleteConfirm = document.querySelector("[data-admin-group-delete-confirm]");
    var adminAccessSearch = document.querySelector("[data-admin-access-search]");
    var adminAccessSubjectTypeButtons = document.querySelectorAll("[data-admin-access-subject-type]");
    var adminAccessSubjectsLoading = document.querySelector("[data-admin-access-subjects-loading]");
    var adminAccessSubjectsEmpty = document.querySelector("[data-admin-access-subjects-empty]");
    var adminAccessSubjectsNoResults = document.querySelector("[data-admin-access-subjects-no-results]");
    var adminAccessSubjectsList = document.querySelector("[data-admin-access-subjects-list]");
    var adminAccessPlaceholder = document.querySelector("[data-admin-access-placeholder]");
    var adminAccessPermissionsLoading = document.querySelector("[data-admin-access-permissions-loading]");
    var adminAccessPermissionsError = document.querySelector("[data-admin-access-permissions-error]");
    var adminAccessEditorBody = document.querySelector("[data-admin-access-editor-body]");
    var adminAccessSelectedAvatar = document.querySelector("[data-admin-access-selected-avatar]");
    var adminAccessSelectedName = document.querySelector("[data-admin-access-selected-name]");
    var adminAccessSelectedMeta = document.querySelector("[data-admin-access-selected-meta]");
    var adminAccessPermissionsGrid = document.querySelector("[data-admin-access-permissions-grid]");
    var adminAccessSave = document.querySelector("[data-admin-access-save]");
    var adminAccessSaveStatus = document.querySelector("[data-admin-access-save-status]");
    var adminActionsSearch = document.querySelector("[data-admin-actions-search]");
    var adminActionsUserFilter = document.querySelector("[data-admin-actions-user-filter]");
    var adminActionsTypeFilter = document.querySelector("[data-admin-actions-type-filter]");
    var adminActionsLoading = document.querySelector("[data-admin-actions-loading]");
    var adminActionsError = document.querySelector("[data-admin-actions-error]");
    var adminActionsEmpty = document.querySelector("[data-admin-actions-empty]");
    var adminActionsNoResults = document.querySelector("[data-admin-actions-no-results]");
    var adminActionsTableWrap = document.querySelector("[data-admin-actions-table-wrap]");
    var adminActionsBody = document.querySelector("[data-admin-actions-body]");
    var adminReportsSearch = document.querySelector("[data-admin-reports-search]");
    var adminReportsLoading = document.querySelector("[data-admin-reports-loading]");
    var adminReportsError = document.querySelector("[data-admin-reports-error]");
    var adminReportsEmpty = document.querySelector("[data-admin-reports-empty]");
    var adminReportsNoResults = document.querySelector("[data-admin-reports-no-results]");
    var adminReportsTableWrap = document.querySelector("[data-admin-reports-table-wrap]");
    var adminReportsBody = document.querySelector("[data-admin-reports-body]");
    var adminReportStats = document.querySelector("[data-admin-report-stats]");
    var adminReportAccessSearch = document.querySelector("[data-admin-report-access-search]");
    var adminReportAccessLoading = document.querySelector("[data-admin-report-access-loading]");
    var adminReportAccessError = document.querySelector("[data-admin-report-access-error]");
    var adminReportAccessEmpty = document.querySelector("[data-admin-report-access-empty]");
    var adminReportAccessNoResults = document.querySelector("[data-admin-report-access-no-results]");
    var adminReportAccessTableWrap = document.querySelector("[data-admin-report-access-table-wrap]");
    var adminReportAccessBody = document.querySelector("[data-admin-report-access-body]");
    var adminReportStructureSearch = document.querySelector("[data-admin-report-structure-search]");
    var adminReportStructureLoading = document.querySelector("[data-admin-report-structure-loading]");
    var adminReportStructureError = document.querySelector("[data-admin-report-structure-error]");
    var adminReportStructureEmpty = document.querySelector("[data-admin-report-structure-empty]");
    var adminReportStructureNoResults = document.querySelector("[data-admin-report-structure-no-results]");
    var adminReportStructureTableWrap = document.querySelector("[data-admin-report-structure-table-wrap]");
    var adminReportStructureBody = document.querySelector("[data-admin-report-structure-body]");
    var adminReportSettingsLoading = document.querySelector("[data-admin-report-settings-loading]");
    var adminReportSettingsError = document.querySelector("[data-admin-report-settings-error]");
    var adminReportSettingsGrid = document.querySelector("[data-admin-report-settings-grid]");
    var adminReportSettingsSave = document.querySelector("[data-admin-report-settings-save]");
    var adminReportSettingsStatus = document.querySelector("[data-admin-report-settings-status]");
    var adminReportTaxonomyLoading = document.querySelector("[data-admin-report-taxonomy-loading]");
    var adminReportTaxonomyError = document.querySelector("[data-admin-report-taxonomy-error]");
    var adminReportTaxonomyEmpty = document.querySelector("[data-admin-report-taxonomy-empty]");
    var adminReportTypeOptions = document.querySelector("[data-admin-report-type-options]");
    var adminReportTagOptions = document.querySelector("[data-admin-report-tag-options]");
    var adminTemplatesSearch = document.querySelector("[data-admin-templates-search]");
    var adminTemplatesLoading = document.querySelector("[data-admin-templates-loading]");
    var adminTemplatesError = document.querySelector("[data-admin-templates-error]");
    var adminTemplatesEmpty = document.querySelector("[data-admin-templates-empty]");
    var adminTemplatesNoResults = document.querySelector("[data-admin-templates-no-results]");
    var adminTemplatesTableWrap = document.querySelector("[data-admin-templates-table-wrap]");
    var adminTemplatesBody = document.querySelector("[data-admin-templates-body]");
    var adminTemplateStats = document.querySelector("[data-admin-template-stats]");
    var adminTemplateTypeOptions = document.querySelector("[data-admin-template-type-options]");
    var adminTemplateTagOptions = document.querySelector("[data-admin-template-tag-options]");
    var adminTemplateTaxonomyLoading = document.querySelector("[data-admin-template-taxonomy-loading]");
    var adminTemplateTaxonomyError = document.querySelector("[data-admin-template-taxonomy-error]");
    var adminTemplateTaxonomyEmpty = document.querySelector("[data-admin-template-taxonomy-empty]");
    var adminTemplateAccessSearch = document.querySelector("[data-admin-template-access-search]");
    var adminTemplateAccessLoading = document.querySelector("[data-admin-template-access-loading]");
    var adminTemplateAccessError = document.querySelector("[data-admin-template-access-error]");
    var adminTemplateAccessEmpty = document.querySelector("[data-admin-template-access-empty]");
    var adminTemplateAccessNoResults = document.querySelector("[data-admin-template-access-no-results]");
    var adminTemplateAccessTableWrap = document.querySelector("[data-admin-template-access-table-wrap]");
    var adminTemplateAccessBody = document.querySelector("[data-admin-template-access-body]");
    var adminTemplateSettingsLoading = document.querySelector("[data-admin-template-settings-loading]");
    var adminTemplateSettingsError = document.querySelector("[data-admin-template-settings-error]");
    var adminTemplateSettingsGrid = document.querySelector("[data-admin-template-settings-grid]");
    var adminTemplateSettingsSave = document.querySelector("[data-admin-template-settings-save]");
    var adminTemplateSettingsStatus = document.querySelector("[data-admin-template-settings-status]");
    var adminTemplateChipsLoading = document.querySelector("[data-admin-template-chips-loading]");
    var adminTemplateChipsError = document.querySelector("[data-admin-template-chips-error]");
    var adminTemplateChipsEmpty = document.querySelector("[data-admin-template-chips-empty]");
    var adminTemplateChipList = document.querySelector("[data-admin-template-chip-list]");
    var adminTemplateChipCategoryList = document.querySelector("[data-admin-template-chip-category-list]");
    var adminTemplateChipModal = document.querySelector('[data-modal="adminTemplateChipModal"]');
    var adminTemplateChipForm = document.querySelector("[data-admin-template-chip-form]");
    var adminTemplateChipModalTitle = document.querySelector("[data-admin-template-chip-modal-title]");
    var adminTemplateChipLabel = document.querySelector("[data-admin-template-chip-label]");
    var adminTemplateChipField = document.querySelector("[data-admin-template-chip-field]");
    var adminTemplateChipCategory = document.querySelector("[data-admin-template-chip-category]");
    var adminTemplateChipBasedOn = document.querySelector("[data-admin-template-chip-based-on]");
    var adminTemplateChipKind = document.querySelector("[data-admin-template-chip-kind]");
    var adminTemplateChipFavorite = document.querySelector("[data-admin-template-chip-favorite]");
    var adminTemplateChipLatex = document.querySelector("[data-admin-template-chip-latex]");
    var adminTemplateChipSubmit = document.querySelector("[data-admin-template-chip-submit]");
    var adminTemplateChipCategoryModal = document.querySelector('[data-modal="adminTemplateChipCategoryModal"]');
    var adminTemplateChipCategoryForm = document.querySelector("[data-admin-template-chip-category-form]");
    var adminTemplateChipCategoryModalTitle = document.querySelector("[data-admin-template-chip-category-modal-title]");
    var adminTemplateChipCategoryName = document.querySelector("[data-admin-template-chip-category-name]");
    var adminTemplateChipCategoryKey = document.querySelector("[data-admin-template-chip-category-key]");
    var adminTemplateChipCategoryDescription = document.querySelector("[data-admin-template-chip-category-description]");
    var adminTemplateChipCategorySubmit = document.querySelector("[data-admin-template-chip-category-submit]");
    var adminSystemSettingsLoading = document.querySelectorAll("[data-admin-system-settings-loading]");
    var adminSystemSettingsError = document.querySelectorAll("[data-admin-system-settings-error]");
    var adminSystemSettingsGrids = document.querySelectorAll("[data-admin-system-settings-grid]");
    var adminSystemSettingsSaveButtons = document.querySelectorAll("[data-admin-system-settings-save]");
    var adminSystemSettingsStatuses = document.querySelectorAll("[data-admin-system-settings-status]");
    var adminSystemDiagnosticsRefresh = document.querySelector("[data-admin-system-diagnostics-refresh]");
    var adminSystemDiagnosticsLoading = document.querySelector("[data-admin-system-diagnostics-loading]");
    var adminSystemDiagnosticsError = document.querySelector("[data-admin-system-diagnostics-error]");
    var adminSystemDiagnosticsRoot = document.querySelector("[data-admin-system-diagnostics]");
    var adminSystemSummary = document.querySelector("[data-admin-system-summary]");
    var adminSystemDiagnosticGrid = document.querySelector("[data-admin-system-diagnostic-grid]");
    var adminTaxonomyOptionModal = document.querySelector('[data-modal="adminTaxonomyOptionModal"]');
    var adminTaxonomyForm = document.querySelector("[data-admin-taxonomy-form]");
    var adminTaxonomyModalTitle = document.querySelector("[data-admin-taxonomy-modal-title]");
    var adminTaxonomyModalSubtitle = document.querySelector("[data-admin-taxonomy-modal-subtitle]");
    var adminTaxonomyName = document.querySelector("[data-admin-taxonomy-name]");
    var adminTaxonomyColor = document.querySelector("[data-admin-taxonomy-color]");
    var adminTaxonomySubmit = document.querySelector("[data-admin-taxonomy-submit]");
    var createTemplateForm = document.querySelector("[data-create-template-form]");
    var createTemplateBaseGrid = document.querySelector("[data-template-create-base-grid]");
    var createTemplateSearch = document.querySelector("[data-template-create-search]");
    var createTemplateEmpty = document.querySelector("[data-template-create-empty]");
    var createTemplateTitle = document.querySelector("[data-template-create-title]");
    var createTemplateTag = document.querySelector("[data-template-create-tag]");
    var createTemplateType = document.querySelector("[data-template-create-type]");
    var createTemplateDate = document.querySelector("[data-template-create-date]");
    var createTemplateSourceLabel = document.querySelector("[data-template-create-source-label]");
    var templateSearch = document.querySelector("[data-template-search]");
    var templateTypeFilter = document.querySelector("[data-template-type-filter]");
    var templatePicker = document.querySelector("[data-template-picker]");
    var templatePreview = document.querySelector("[data-template-preview]");
    var templateBack = document.querySelector("[data-template-back]");
    var selectedTemplateKey = document.querySelector("[data-selected-template-key]");
    var selectedTemplateTitle = document.querySelector("[data-selected-template-title]");
    var templatePreviewTitle = document.querySelector("[data-template-preview-title]");
    var templatePreviewType = document.querySelector("[data-template-preview-type]");
    var templatePreviewDescription = document.querySelector("[data-template-preview-description]");
    var importDropzone = document.querySelector("[data-import-dropzone]");
    var importFileInput = document.querySelector("[data-import-file-input]");
    var importFileList = document.querySelector("[data-import-file-list]");
    var fileTokenList = document.querySelector("[data-file-token-list]");
    var createSubmit = document.querySelector("[data-create-submit]");
    var importItems = [];
    var isScanningFiles = false;
    var committedTemplate = null;
    var importState = {
        queue: importItems,
        isProcessing: false,
        completedFiles: [],
        failedFiles: []
    };
    var createSelectedShareUserIds = [];
    var createSelectedShareGroupIds = [];
    var reportSharePickerState = {
        mode: "",
        reportId: "",
        subjectType: "user",
        selectedUserIds: new Set(),
        selectedGroupIds: new Set(),
        members: [],
        groups: [],
        query: ""
    };

    var previewPagesRoot = document.querySelector("[data-preview-pages-root]");
    var previewPages = document.querySelector("[data-preview-pages]");
    var previewBlockSource = document.querySelector("[data-preview-block-source]");
    var blockNavigation = document.querySelector("[data-block-navigation]");
    var draftSaveRoot = document.querySelector("[data-draft-save-root]");
    var draftSaveButtons = document.querySelectorAll("[data-draft-save-button]");
    var draftSaveStatuses = document.querySelectorAll("[data-draft-save-status]");
    var undoStack = [];
    var redoStack = [];
    var previewDraggedBlock = null;
    var previewState = {
        reportId: previewPages ? previewPages.dataset.reportId || null : null,
        blocks: [],
        selectedBlockId: null,
        undoStack: undoStack,
        redoStack: redoStack,
        dirty: false,
        saveTimer: null,
        pendingOrderIds: null
    };
    var DRAFT_AUTOSAVE_DELAY = 60000;
    var draftSaveState = {
        isDirty: false,
        isSaving: false,
        isStale: false,
        lastSavedAt: Date.now(),
        autosaveTimer: null,
        staleTimer: null,
        sourceMode: draftSaveRoot ? draftSaveRoot.dataset.draftSaveMode || "" : "",
        saveUrl: draftSaveRoot ? draftSaveRoot.dataset.draftSaveUrl || "" : ""
    };

    var editorRoot = document.querySelector("[data-editor-root]");
    var editorPages = document.querySelector("[data-editor-pages]");
    var editorSourceContent = document.querySelector("[data-editor-source-content]");
    var editorToolbar = document.querySelector(".editor-toolbar");
    var currentEditablePage = null;
    var editorState = {
        reportId: editorRoot ? editorRoot.dataset.reportId || null : null,
        activePageId: null,
        activeEditable: null,
        selectedBlockId: null,
        dirty: false,
        isTyping: false,
        isPaginating: false,
        isAutosaving: false,
        autosaveUrl: editorRoot ? editorRoot.dataset.editorAutosaveUrl || "" : "",
        autosaveTimer: null,
        typingTimer: null,
        undoStack: [],
        redoStack: [],
        currentTypingStyle: {
            fontSize: null,
            fontFamily: null,
            color: null,
            backgroundColor: null,
            bold: false,
            italic: false,
            underline: false
        }
    };
    var currentTypingStyle = editorState.currentTypingStyle;
    var editorHistory = [];
    var editorHistoryIndex = -1;
    var restoringEditorHistory = false;
    var editorPaginationTimer = null;
    var editorHistorySaveTimer = null;
    var editorSavedRange = null;
    var tableResizeState = null;

    document.querySelectorAll(".toast").forEach(function (toast) {
        autoHideToast(toast);
    });

    if (userMenu && userMenuButton) {
        userMenuButton.addEventListener("click", function (event) {
            event.stopPropagation();
            closeCardMenus();
            closeOrganizationMenu();
            userMenu.classList.toggle("open");
        });
    }

    if (organizationMenu && organizationMenuButton) {
        organizationMenuButton.addEventListener("click", function (event) {
            event.stopPropagation();
            closeCardMenus();
            if (userMenu) {
                userMenu.classList.remove("open");
            }
            toggleOrganizationMenu();
        });

        organizationMenu.querySelectorAll("[data-organization-action]").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.stopPropagation();
                handleOrganizationAction(button);
            });
        });
    }

    if (organizationMembersSearch) {
        organizationMembersSearch.addEventListener("input", function () {
            organizationMembersState.query = organizationMembersSearch.value || "";

            if (!organizationMembersState.isLoading) {
                renderOrganizationMembers(organizationMembersState.members);
            }
        });
    }

    if (organizationSharedReportsSearch) {
        organizationSharedReportsSearch.addEventListener("input", function () {
            organizationSharedReportsState.query = organizationSharedReportsSearch.value || "";

            if (!organizationSharedReportsState.isLoading) {
                renderOrganizationSharedReports(organizationSharedReportsState.reports);
            }
        });
    }

    if (organizationMessagesCloseButton) {
        organizationMessagesCloseButton.addEventListener("click", function (event) {
            event.stopPropagation();
            closeOrganizationMessagesPopover();
        });
    }

    if (organizationMessagesUsers) {
        organizationMessagesUsers.addEventListener("click", function (event) {
            var userButton = event.target.closest("[data-organization-message-user]");

            if (!userButton) {
                return;
            }

            event.stopPropagation();
            selectOrganizationMessageMember(userButton.dataset.memberId || "");
        });
    }

    if (organizationMessagesForm) {
        organizationMessagesForm.addEventListener("submit", function (event) {
            event.preventDefault();
            sendOrganizationMessage();
        });
    }

    if (organizationMessagesInput) {
        organizationMessagesInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendOrganizationMessage();
            }
        });
    }

    if (organizationMembersBody) {
        organizationMembersBody.addEventListener("click", function (event) {
            var actionButton = event.target.closest("[data-organization-member-action-button]");

            if (!actionButton) {
                return;
            }

            event.stopPropagation();
            toggleOrganizationMemberMenu(actionButton);
        });
    }

    if (organizationMemberMenu) {
        organizationMemberMenu.addEventListener("click", function (event) {
            var actionButton = event.target.closest("[data-organization-member-menu-action]");

            if (!actionButton) {
                return;
            }

            event.stopPropagation();
            handleOrganizationMemberMenuAction(actionButton.dataset.organizationMemberMenuAction || "");
        });
    }

    if (reportShareSearch) {
        reportShareSearch.addEventListener("input", function () {
            reportSharePickerState.query = reportShareSearch.value || "";
            renderReportSharePickerMembers();
        });
    }

    if (reportShareSubjectTypeButtons.length) {
        reportShareSubjectTypeButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                var subjectType = button.dataset.reportShareSubjectType || "user";

                if (subjectType === reportSharePickerState.subjectType) {
                    return;
                }

                reportSharePickerState.subjectType = subjectType === "group" ? "group" : "user";
                reportSharePickerState.query = "";

                if (reportShareSearch) {
                    reportShareSearch.value = "";
                }

                updateReportShareSubjectTypeButtons();
                renderReportSharePickerMembers();
            });
        });
    }

    if (reportShareList) {
        reportShareList.addEventListener("click", function (event) {
            var item = event.target.closest("[data-report-share-subject], [data-report-share-member]");

            if (!item) {
                return;
            }

            toggleReportShareSubjectSelection(
                item.dataset.subjectType || "user",
                item.dataset.subjectId || item.dataset.userId || ""
            );
        });
    }

    if (reportShareConfirm) {
        reportShareConfirm.addEventListener("click", confirmReportSharePicker);
    }

    initializeFoldersDashboard();
    initializeDashboardMainModes();
    initializeCreateTemplateWorkflow();

    if (searchToggle && searchWidget && searchInput) {
        searchToggle.addEventListener("click", function () {
            searchWidget.classList.toggle("is-open");

            if (searchWidget.classList.contains("is-open")) {
                window.setTimeout(function () {
                    searchInput.focus();
                }, 160);
            } else {
                searchInput.value = "";
                currentSearchQuery = "";
                filterDashboardCards("");
            }
        });

        searchInput.addEventListener("input", function () {
            currentSearchQuery = searchInput.value;
            filterDashboardCards(currentSearchQuery);
        });
    }

    if (filterButton) {
        filterButton.addEventListener("click", function () {
            window.alert("Фильтрация будет добавлена позже");
        });
    }

    if (selectToggle) {
        selectToggle.addEventListener("click", function () {
            setSelectionMode(!selectionMode);
        });
    }

    reportCards.forEach(function (card) {
        card.addEventListener("click", function (event) {
            if (!selectionMode) {
                if (event.target.closest("[data-report-menu-button]") || event.target.closest(".card-menu-dropdown")) {
                    return;
                }

                if (event.target.closest("a, button, input, select, textarea, label")) {
                    return;
                }

                openDashboardPreviewFromCard(card);
                return;
            }

            if (event.target.closest("[data-report-menu-button]") || event.target.closest(".card-menu-dropdown")) {
                return;
            }

            if (event.target.closest("a, button, input, select, textarea, label")) {
                return;
            }

            event.preventDefault();
            card.classList.toggle("is-selected");
        });
    });

    document.addEventListener("click", function (event) {
        var logoutButton = event.target.closest("[data-logout-placeholder]");

        if (logoutButton) {
            window.alert("Авторизация будет добавлена позже");
        }

        var adminHomeLink = event.target.closest("[data-admin-home-link]");

        if (adminHomeLink) {
            event.preventDefault();
            renderAdminHome();
            return;
        }

        var adminUsersTab = event.target.closest("[data-admin-users-tab]");

        if (adminUsersTab) {
            event.preventDefault();
            setAdminUsersSubsection(adminUsersTab.dataset.adminUsersTab || "users");
            return;
        }

        var adminReportsTab = event.target.closest("[data-admin-reports-tab]");

        if (adminReportsTab) {
            event.preventDefault();
            setAdminReportsSubsection(adminReportsTab.dataset.adminReportsTab || "registry");
            return;
        }

        var adminTemplatesTab = event.target.closest("[data-admin-templates-tab]");

        if (adminTemplatesTab) {
            event.preventDefault();
            setAdminTemplatesSubsection(adminTemplatesTab.dataset.adminTemplatesTab || "registry");
            return;
        }

        var adminSystemTab = event.target.closest("[data-admin-system-tab]");

        if (adminSystemTab) {
            event.preventDefault();
            setAdminSystemSubsection(adminSystemTab.dataset.adminSystemTab || "general");
            return;
        }

        var adminReportOpen = event.target.closest("[data-admin-report-open]");

        if (adminReportOpen) {
            event.preventDefault();
            window.location.href = adminReportOpen.dataset.adminReportOpen || "#";
            return;
        }

        var adminTemplateOpen = event.target.closest("[data-admin-template-open]");

        if (adminTemplateOpen) {
            event.preventDefault();
            window.location.href = adminTemplateOpen.dataset.adminTemplateOpen || "#";
            return;
        }

        var adminReportSettingToggle = event.target.closest("[data-admin-report-setting]");

        if (adminReportSettingToggle) {
            event.preventDefault();
            toggleAdminReportSetting(adminReportSettingToggle.dataset.adminReportSetting || "");
            return;
        }

        var adminTemplateSettingToggle = event.target.closest("[data-admin-template-setting]");

        if (adminTemplateSettingToggle) {
            event.preventDefault();
            toggleAdminTemplateSetting(adminTemplateSettingToggle.dataset.adminTemplateSetting || "");
            return;
        }

        var adminSystemSettingToggle = event.target.closest("[data-admin-system-setting-toggle]");

        if (adminSystemSettingToggle) {
            event.preventDefault();
            toggleAdminSystemSetting(adminSystemSettingToggle.dataset.adminSystemSettingToggle || "");
            return;
        }

        var adminTemplateChipAdd = event.target.closest("[data-admin-template-chip-add]");

        if (adminTemplateChipAdd) {
            event.preventDefault();
            openAdminTemplateChipModal();
            return;
        }

        var adminTemplateChipEdit = event.target.closest("[data-admin-template-chip-edit]");

        if (adminTemplateChipEdit) {
            event.preventDefault();
            openAdminTemplateChipModal(adminTemplateChipEdit.dataset.adminTemplateChipEdit || "");
            return;
        }

        var adminTemplateChipDeactivate = event.target.closest("[data-admin-template-chip-deactivate]");

        if (adminTemplateChipDeactivate) {
            event.preventDefault();
            deactivateAdminTemplateChip(adminTemplateChipDeactivate.dataset.adminTemplateChipDeactivate || "");
            return;
        }

        var adminTemplateChipCategoryAdd = event.target.closest("[data-admin-template-chip-category-add]");

        if (adminTemplateChipCategoryAdd) {
            event.preventDefault();
            openAdminTemplateChipCategoryModal();
            return;
        }

        var adminTemplateChipCategoryEdit = event.target.closest("[data-admin-template-chip-category-edit]");

        if (adminTemplateChipCategoryEdit) {
            event.preventDefault();
            openAdminTemplateChipCategoryModal(adminTemplateChipCategoryEdit.dataset.adminTemplateChipCategoryEdit || "");
            return;
        }

        var adminTemplateChipCategoryDeactivate = event.target.closest("[data-admin-template-chip-category-deactivate]");

        if (adminTemplateChipCategoryDeactivate) {
            event.preventDefault();
            deactivateAdminTemplateChipCategory(adminTemplateChipCategoryDeactivate.dataset.adminTemplateChipCategoryDeactivate || "");
            return;
        }

        var adminTaxonomyAdd = event.target.closest("[data-admin-taxonomy-add]");

        if (adminTaxonomyAdd) {
            event.preventDefault();
            openAdminTaxonomyModal(
                adminTaxonomyAdd.dataset.adminTaxonomyScope || "",
                adminTaxonomyAdd.dataset.adminTaxonomyType || ""
            );
            return;
        }

        var adminTaxonomyEdit = event.target.closest("[data-admin-taxonomy-edit]");

        if (adminTaxonomyEdit) {
            event.preventDefault();
            openAdminTaxonomyModal(
                adminTaxonomyEdit.dataset.adminTaxonomyScope || "",
                adminTaxonomyEdit.dataset.adminTaxonomyType || "",
                adminTaxonomyEdit.dataset.adminTaxonomyEdit || ""
            );
            return;
        }

        var adminTaxonomyDeactivate = event.target.closest("[data-admin-taxonomy-deactivate]");

        if (adminTaxonomyDeactivate) {
            event.preventDefault();
            deactivateAdminTaxonomyOption(adminTaxonomyDeactivate.dataset.adminTaxonomyDeactivate || "");
            return;
        }

        var adminUserActionButton = event.target.closest("[data-admin-user-action-button]");

        if (adminUserActionButton) {
            event.preventDefault();
            event.stopPropagation();
            toggleAdminUserActionsMenu(adminUserActionButton);
            return;
        }

        var adminUserAction = event.target.closest("[data-admin-user-action]");

        if (adminUserAction) {
            event.preventDefault();
            event.stopPropagation();
            handleAdminUserAction(adminUserAction.dataset.adminUserAction || "");
            return;
        }

        var adminGroupActionButton = event.target.closest("[data-admin-group-action-button]");

        if (adminGroupActionButton) {
            event.preventDefault();
            event.stopPropagation();
            toggleAdminGroupActionsMenu(adminGroupActionButton);
            return;
        }

        var adminGroupAction = event.target.closest("[data-admin-group-action]");

        if (adminGroupAction) {
            event.preventDefault();
            event.stopPropagation();
            handleAdminGroupAction(adminGroupAction.dataset.adminGroupAction || "");
            return;
        }

        var adminSectionButton = event.target.closest("[data-admin-section]");

        if (adminSectionButton) {
            if ((adminSectionButton.dataset.adminSection || "") === "users") {
                renderAdminUsersModule();
                return;
            }

            if ((adminSectionButton.dataset.adminSection || "") === "reports") {
                renderAdminReportsModule();
                return;
            }

            if ((adminSectionButton.dataset.adminSection || "") === "templates") {
                renderAdminTemplatesModule();
                return;
            }

            if ((adminSectionButton.dataset.adminSection || "") === "system") {
                renderAdminSystemModule();
                return;
            }

            showToast("Раздел будет добавлен позже.", "warning");
        }
    });

    document.querySelectorAll("[data-open-create-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            resetCreateShareSelection();
            openModal(createModal);
        });
    });

    document.querySelectorAll("[data-open-all-reports-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            selectedAllReportsFolderId = activeFolderFilter || "";
            markFolderTreeSelection("[data-folder-select]", selectedAllReportsFolderId);
            updateFolderReportList(selectedAllReportsFolderId);
            openModal(allReportsModal);
        });
    });

    document.querySelectorAll("[data-open-pin-folder-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            selectedPinFolderId = "";
            document.querySelectorAll("[data-pin-folder-option].is-selected").forEach(function (item) {
                item.classList.remove("is-selected");
            });
            openModal(pinFolderModal);
        });
    });

    document.querySelectorAll("[data-close-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            closeModal(button.closest(".modal-backdrop"));
        });
    });

    document.querySelectorAll(".modal-backdrop").forEach(function (backdrop) {
        backdrop.addEventListener("click", function (event) {
            if (event.target === backdrop) {
                closeModal(backdrop);
            }
        });
    });

    document.querySelectorAll("[data-report-menu-button]").forEach(function (button) {
        button.addEventListener("click", function (event) {
            event.stopPropagation();
            if (userMenu) {
                userMenu.classList.remove("open");
            }
            closeOrganizationMenu();

            var card = button.closest(".report-card");

            if (!card) {
                return;
            }

            var wasOpen = card.classList.contains("menu-open");
            closeCardMenus(card);

            if (wasOpen) {
                card.classList.remove("menu-open");
                button.setAttribute("aria-expanded", "false");
            } else {
                card.classList.add("menu-open");
                button.setAttribute("aria-expanded", "true");
            }
        });
    });

    document.querySelectorAll("[data-open-preview-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            closeCardMenus();
            loadPreview(button.dataset.previewUrl, button.closest("[data-report-card]"));
        });
    });

    document.querySelectorAll("[data-open-rename-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            closeCardMenus();
            renameForm.action = button.dataset.renameUrl;
            renameTitle.value = button.dataset.reportTitle || "";
            renameTag.value = button.dataset.reportTag || "";
            openModal(renameModal);
        });
    });

    document.querySelectorAll("[data-delete-form]").forEach(function (form) {
        form.addEventListener("submit", function (event) {
            var confirmed = window.confirm("Удалить отчет? Это действие нельзя отменить.");

            if (!confirmed) {
                event.preventDefault();
            }
        });
    });

    if (adminUsersSearch) {
        adminUsersSearch.addEventListener("input", function () {
            adminUsersState.query = adminUsersSearch.value || "";
            renderAdminUsersTable();
        });
    }

    if (adminUserDeleteConfirm) {
        adminUserDeleteConfirm.addEventListener("click", deactivateSelectedAdminUser);
    }

    if (adminGroupsSearch) {
        adminGroupsSearch.addEventListener("input", function () {
            adminGroupsState.query = adminGroupsSearch.value || "";
            renderAdminGroupsTable();
        });
    }

    if (adminGroupCreateOpen) {
        adminGroupCreateOpen.addEventListener("click", openAdminGroupCreateModal);
    }

    if (adminGroupCreateForm) {
        adminGroupCreateForm.addEventListener("submit", createAdminUserGroup);
    }

    if (adminGroupCreateMemberSearch) {
        adminGroupCreateMemberSearch.addEventListener("input", function () {
            adminGroupsState.createMemberQuery = adminGroupCreateMemberSearch.value || "";
            renderAdminGroupMemberPicker("create");
        });
    }

    if (adminGroupEditMemberSearch) {
        adminGroupEditMemberSearch.addEventListener("input", function () {
            adminGroupsState.editMemberQuery = adminGroupEditMemberSearch.value || "";
            renderAdminGroupMemberPicker("edit");
        });
    }

    if (adminGroupCreateMembersList) {
        adminGroupCreateMembersList.addEventListener("click", function (event) {
            var option = event.target.closest("[data-admin-group-member-option]");

            if (option) {
                toggleAdminGroupMemberSelection("create", option.dataset.userId || "");
            }
        });
    }

    if (adminGroupEditMembersList) {
        adminGroupEditMembersList.addEventListener("click", function (event) {
            var option = event.target.closest("[data-admin-group-member-option]");

            if (option) {
                toggleAdminGroupMemberSelection("edit", option.dataset.userId || "");
            }
        });
    }

    if (adminGroupMembersSave) {
        adminGroupMembersSave.addEventListener("click", saveAdminGroupMembers);
    }

    if (adminGroupDeleteConfirm) {
        adminGroupDeleteConfirm.addEventListener("click", deactivateSelectedAdminGroup);
    }

    adminAccessSubjectTypeButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            setAdminAccessSubjectType(button.dataset.adminAccessSubjectType || "user");
        });
    });

    if (adminAccessSearch) {
        adminAccessSearch.addEventListener("input", function () {
            adminAccessState.query = adminAccessSearch.value || "";
            renderAdminAccessSubjects();
        });
    }

    if (adminAccessSubjectsList) {
        adminAccessSubjectsList.addEventListener("click", function (event) {
            var subjectButton = event.target.closest("[data-admin-access-subject]");

            if (!subjectButton) {
                return;
            }

            selectAdminAccessSubject(
                subjectButton.dataset.subjectType || adminAccessState.subjectType,
                subjectButton.dataset.subjectId || ""
            );
        });
    }

    if (adminAccessPermissionsGrid) {
        adminAccessPermissionsGrid.addEventListener("click", function (event) {
            var toggle = event.target.closest("[data-admin-access-permission]");

            if (!toggle) {
                return;
            }

            event.preventDefault();
            toggleAdminAccessPermission(toggle.dataset.adminAccessPermission || "");
        });
    }

    if (adminAccessSave) {
        adminAccessSave.addEventListener("click", saveAdminAccessPermissions);
    }

    if (adminActionsSearch) {
        adminActionsSearch.addEventListener("input", function () {
            adminActionsState.query = adminActionsSearch.value || "";
            renderAdminActionsTable();
        });
    }

    if (adminActionsUserFilter) {
        adminActionsUserFilter.addEventListener("change", function () {
            adminActionsState.userId = adminActionsUserFilter.value || "";
            loadAdminActions(true);
        });
    }

    if (adminActionsTypeFilter) {
        adminActionsTypeFilter.addEventListener("change", function () {
            adminActionsState.actionKey = adminActionsTypeFilter.value || "";
            loadAdminActions(true);
        });
    }

    if (adminReportsSearch) {
        adminReportsSearch.addEventListener("input", function () {
            adminReportsState.query = adminReportsSearch.value || "";
            renderAdminReportsRegistry();
        });
    }

    if (adminReportAccessSearch) {
        adminReportAccessSearch.addEventListener("input", function () {
            adminReportsState.accessQuery = adminReportAccessSearch.value || "";
            renderAdminReportAccessTable();
        });
    }

    if (adminReportStructureSearch) {
        adminReportStructureSearch.addEventListener("input", function () {
            adminReportsState.structureQuery = adminReportStructureSearch.value || "";
            renderAdminReportStructureTable();
        });
    }

    if (adminReportSettingsSave) {
        adminReportSettingsSave.addEventListener("click", saveAdminReportSettings);
    }

    if (adminTemplatesSearch) {
        adminTemplatesSearch.addEventListener("input", function () {
            adminTemplatesState.query = adminTemplatesSearch.value || "";
            renderAdminTemplatesRegistry();
        });
    }

    if (adminTemplateAccessSearch) {
        adminTemplateAccessSearch.addEventListener("input", function () {
            adminTemplatesState.accessQuery = adminTemplateAccessSearch.value || "";
            renderAdminTemplateAccessTable();
        });
    }

    if (adminTemplateSettingsSave) {
        adminTemplateSettingsSave.addEventListener("click", saveAdminTemplateSettings);
    }

    adminSystemSettingsSaveButtons.forEach(function (button) {
        button.addEventListener("click", saveAdminSystemSettings);
    });

    if (adminSystemDiagnosticsRefresh) {
        adminSystemDiagnosticsRefresh.addEventListener("click", function () {
            loadAdminSystemDiagnostics(true);
        });
    }

    if (adminTemplateChipForm) {
        adminTemplateChipForm.addEventListener("submit", saveAdminTemplateChip);
    }

    if (adminTemplateChipCategoryForm) {
        adminTemplateChipCategoryForm.addEventListener("submit", saveAdminTemplateChipCategory);
    }

    if (adminTaxonomyForm) {
        adminTaxonomyForm.addEventListener("submit", saveAdminTaxonomyOption);
    }

    initializeCreateWorkflow();
    initializePreviewBlocks();
    initializeEditor();
    initializeDraftSaveControls();

    document.addEventListener("click", function (event) {
        var exportToggle = event.target.closest("[data-report-export-toggle]");
        var exportOption = event.target.closest("[data-report-export-format]");

        if (exportToggle) {
            event.preventDefault();
            toggleReportExportMenu(exportToggle.closest("[data-report-export-root]"));
            return;
        }

        if (exportOption) {
            event.preventDefault();
            startReportExport(
                exportOption.closest("[data-report-export-root]"),
                exportOption.dataset.reportExportFormat || ""
            );
            return;
        }

        if (!event.target.closest("[data-report-export-root]")) {
            closeReportExportMenus();
        }

        if (!event.target.closest(".card-menu-dropdown")) {
            closeCardMenus();
        }

        if (userMenu && !userMenu.contains(event.target)) {
            userMenu.classList.remove("open");
        }

        if (organizationMenu && !organizationMenu.contains(event.target)) {
            closeOrganizationMenu();
        }

        if (
            organizationMemberMenu &&
            !event.target.closest("[data-organization-member-menu]") &&
            !event.target.closest("[data-organization-member-action-button]")
        ) {
            closeOrganizationMemberMenu();
        }

        if (
            adminUserActionsMenu &&
            !event.target.closest("[data-admin-user-actions-menu]") &&
            !event.target.closest("[data-admin-user-action-button]")
        ) {
            closeAdminUserActionsMenu();
        }

        if (
            adminGroupActionsMenu &&
            !event.target.closest("[data-admin-group-actions-menu]") &&
            !event.target.closest("[data-admin-group-action-button]")
        ) {
            closeAdminGroupActionsMenu();
        }

        if (
            dashboardPreviewSharesDropdown &&
            !event.target.closest("[data-dashboard-preview-share-text]") &&
            !event.target.closest("[data-dashboard-preview-shares-dropdown]")
        ) {
            closeDashboardPreviewSharesDropdown();
        }

        if (!event.target.closest(".table-picker-wrap")) {
            closeTablePicker();
        }

        if (folderSearchModeMenu && !event.target.closest("[data-folder-search-widget]")) {
            folderSearchModeMenu.hidden = true;
        }
    });

    document.addEventListener("keydown", handleEditorHistoryShortcut, true);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            document.querySelectorAll(".modal-backdrop.is-open").forEach(closeModal);
            closeCardMenus();
            closeTablePicker();
            closeOrganizationMemberMenu();
            closeAdminUserActionsMenu();
            closeAdminGroupActionsMenu();
            closeReportExportMenus();

            if (userMenu) {
                userMenu.classList.remove("open");
            }

            closeOrganizationMenu();
        }

        if (
            editorPages &&
            event.key === " " &&
            !event.defaultPrevented &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            isEditorSelectionActive()
        ) {
            event.preventDefault();
            getCurrentEditablePage().focus();
            document.execCommand("insertText", false, " ");
            scheduleEditorHistorySave();
            return;
        }

        if (editorPages && !event.defaultPrevented && event.ctrlKey && event.key.toLowerCase() === "z" && !event.shiftKey) {
            event.preventDefault();
            undoEditor();
            return;
        }

        if (editorPages && !event.defaultPrevented && ((event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "z") || (event.ctrlKey && event.key.toLowerCase() === "y"))) {
            event.preventDefault();
            redoEditor();
            return;
        }

        if (event.ctrlKey && event.key.toLowerCase() === "z" && !event.shiftKey) {
            if (previewPages) {
                event.preventDefault();
                undoPreviewAction();
            }
        }

        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "z") {
            if (previewPages) {
                event.preventDefault();
                redoPreviewAction();
            }
        }
    });

    function toggleOrganizationMenu() {
        if (!organizationMenu) {
            return;
        }

        if (organizationMenu.classList.contains("is-open")) {
            closeOrganizationMenu();
        } else {
            openOrganizationMenu();
        }
    }

    function openOrganizationMenu() {
        if (!organizationMenu) {
            return;
        }

        organizationMenu.classList.add("is-open");

        if (organizationMenuButton) {
            organizationMenuButton.classList.add("is-active");
            organizationMenuButton.classList.add("is-hidden");
            organizationMenuButton.setAttribute("aria-expanded", "true");
        }

        var dropdown = organizationMenu.querySelector("[data-organization-dropdown]");

        if (dropdown) {
            dropdown.classList.add("is-open");
            dropdown.setAttribute("aria-hidden", "false");
        }
    }

    function closeOrganizationMenu() {
        if (!organizationMenu) {
            return;
        }

        closeOrganizationMembersPopover();
        closeOrganizationMessagesPopover();
        closeOrganizationSharedReportsPopover();
        organizationMenu.classList.remove("is-open");

        if (organizationMenuButton) {
            organizationMenuButton.classList.remove("is-active");
            organizationMenuButton.classList.remove("is-hidden");
            organizationMenuButton.setAttribute("aria-expanded", "false");
        }

        var dropdown = organizationMenu.querySelector("[data-organization-dropdown]");

        if (dropdown) {
            dropdown.classList.remove("is-open");
            dropdown.setAttribute("aria-hidden", "true");
        }
    }

    function handleOrganizationAction(button) {
        var action = button ? button.dataset.organizationAction || "" : "";

        if (action === "messages") {
            toggleOrganizationMessagesPopover(button);
            return;
        }

        if (action === "members") {
            toggleOrganizationMembersPopover(button);
            return;
        }

        if (action === "shared-reports") {
            toggleOrganizationSharedReportsPopover(button);
            return;
        }

        closeOrganizationMembersPopover();
        closeOrganizationMessagesPopover();
        closeOrganizationSharedReportsPopover();
        showToast("Раздел организации будет добавлен позже", "warning");
    }

    function toggleOrganizationMembersPopover(button) {
        if (!organizationMembersPopover) {
            showToast("Окно участников организации недоступно", "error");
            return;
        }

        if (organizationMembersPopover.classList.contains("is-open")) {
            closeOrganizationMembersPopover();
            return;
        }

        openOrganizationMembersPopover(button);
    }

    function openOrganizationMembersPopover(button) {
        if (!organizationMembersPopover) {
            showToast("Окно участников организации недоступно", "error");
            return;
        }

        if (!organizationMenu || !organizationMenu.classList.contains("is-open")) {
            openOrganizationMenu();
        }

        closeOrganizationMessagesPopover();
        closeOrganizationSharedReportsPopover();
        closeOrganizationMemberMenu();
        setActiveOrganizationAction(button);
        resetOrganizationMembersSearch();
        organizationMembersPopover.classList.add("is-open");
        organizationMembersPopover.setAttribute("aria-hidden", "false");
        loadOrganizationMembers();
    }

    function closeOrganizationMembersPopover() {
        if (!organizationMembersPopover) {
            return;
        }

        organizationMembersPopover.classList.remove("is-open");
        organizationMembersPopover.setAttribute("aria-hidden", "true");
        closeOrganizationMemberMenu();
        setActiveOrganizationAction(null);
    }

    function toggleOrganizationMessagesPopover(button) {
        if (!organizationMessagesPopover) {
            showToast("Окно сообщений недоступно", "error");
            return;
        }

        if (organizationMessagesPopover.classList.contains("is-open")) {
            closeOrganizationMessagesPopover();
            return;
        }

        openOrganizationMessagesPopover(button);
    }

    function openOrganizationMessagesPopover(button) {
        if (!organizationMessagesPopover) {
            showToast("Окно сообщений недоступно", "error");
            return;
        }

        if (!organizationMenu || !organizationMenu.classList.contains("is-open")) {
            openOrganizationMenu();
        }

        closeOrganizationMembersPopover();
        closeOrganizationSharedReportsPopover();
        closeOrganizationMemberMenu();
        setActiveOrganizationAction(button);
        organizationMessagesPopover.classList.add("is-open");
        organizationMessagesPopover.setAttribute("aria-hidden", "false");
        loadOrganizationMessageMembers();
    }

    function closeOrganizationMessagesPopover() {
        if (!organizationMessagesPopover) {
            return;
        }

        organizationMessagesPopover.classList.remove("is-open");
        organizationMessagesPopover.setAttribute("aria-hidden", "true");
        setActiveOrganizationAction(null);
    }

    function toggleOrganizationSharedReportsPopover(button) {
        if (!organizationSharedReportsPopover) {
            showToast("Окно совместных отчетов недоступно", "error");
            return;
        }

        if (organizationSharedReportsPopover.classList.contains("is-open")) {
            closeOrganizationSharedReportsPopover();
            return;
        }

        openOrganizationSharedReportsPopover(button);
    }

    function openOrganizationSharedReportsPopover(button) {
        if (!organizationSharedReportsPopover) {
            showToast("Окно совместных отчетов недоступно", "error");
            return;
        }

        if (!organizationMenu || !organizationMenu.classList.contains("is-open")) {
            openOrganizationMenu();
        }

        closeOrganizationMembersPopover();
        closeOrganizationMessagesPopover();
        closeOrganizationMemberMenu();
        setActiveOrganizationAction(button);
        resetOrganizationSharedReportsSearch();
        organizationSharedReportsPopover.classList.add("is-open");
        organizationSharedReportsPopover.setAttribute("aria-hidden", "false");
        loadOrganizationSharedReports();
    }

    function closeOrganizationSharedReportsPopover() {
        if (!organizationSharedReportsPopover) {
            return;
        }

        organizationSharedReportsPopover.classList.remove("is-open");
        organizationSharedReportsPopover.setAttribute("aria-hidden", "true");
        setActiveOrganizationAction(null);
    }

    function resetOrganizationMembersSearch() {
        organizationMembersState.query = "";

        if (organizationMembersSearch) {
            organizationMembersSearch.value = "";
        }
    }

    function resetOrganizationSharedReportsSearch() {
        organizationSharedReportsState.query = "";

        if (organizationSharedReportsSearch) {
            organizationSharedReportsSearch.value = "";
        }
    }

    function setActiveOrganizationAction(activeButton) {
        if (!organizationMenu) {
            return;
        }

        organizationMenu.querySelectorAll("[data-organization-action]").forEach(function (button) {
            button.classList.toggle("is-active", Boolean(activeButton && button === activeButton));
        });
    }

    function loadOrganizationSharedReports() {
        if (!organizationSharedReportsList) {
            return;
        }

        if (organizationSharedReportsState.hasLoaded && !organizationSharedReportsState.isLoading) {
            renderOrganizationSharedReports(organizationSharedReportsState.reports);
            return;
        }

        setOrganizationSharedReportsLoadingState();

        fetch("/api/organization/shared-reports", {
            headers: {
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.error || "Не удалось загрузить совместные отчеты.");
                    }

                    return data.reports || [];
                });
            })
            .then(function (reports) {
                organizationSharedReportsState.isLoading = false;
                organizationSharedReportsState.reports = reports;
                organizationSharedReportsState.hasLoaded = true;
                renderOrganizationSharedReports(reports);
            })
            .catch(function () {
                organizationSharedReportsState.isLoading = false;
                renderOrganizationSharedReportsError();
            });
    }

    function setOrganizationSharedReportsLoadingState() {
        organizationSharedReportsState.isLoading = true;

        if (organizationSharedReportsLoading) {
            organizationSharedReportsLoading.hidden = false;
        }

        if (organizationSharedReportsError) {
            organizationSharedReportsError.hidden = true;
        }

        if (organizationSharedReportsEmpty) {
            organizationSharedReportsEmpty.hidden = true;
        }

        if (organizationSharedReportsList) {
            organizationSharedReportsList.innerHTML = "";
        }
    }

    function renderOrganizationSharedReportsError() {
        if (organizationSharedReportsLoading) {
            organizationSharedReportsLoading.hidden = true;
        }

        if (organizationSharedReportsError) {
            organizationSharedReportsError.hidden = false;
        }

        if (organizationSharedReportsEmpty) {
            organizationSharedReportsEmpty.hidden = true;
        }

        if (organizationSharedReportsList) {
            organizationSharedReportsList.innerHTML = "";
        }
    }

    function renderOrganizationSharedReports(reports) {
        if (!organizationSharedReportsList) {
            return;
        }

        var filteredReports = filterOrganizationSharedReports(reports);
        var hasQuery = Boolean((organizationSharedReportsState.query || "").trim());

        if (organizationSharedReportsLoading) {
            organizationSharedReportsLoading.hidden = true;
        }

        if (organizationSharedReportsError) {
            organizationSharedReportsError.hidden = true;
        }

        organizationSharedReportsList.innerHTML = "";

        if (!filteredReports.length) {
            if (organizationSharedReportsEmpty) {
                organizationSharedReportsEmpty.hidden = false;
                organizationSharedReportsEmpty.textContent = hasQuery
                    ? "Отчеты не найдены"
                    : "Список совместных отчетов будет добавлен позже.";
            }
            return;
        }

        if (organizationSharedReportsEmpty) {
            organizationSharedReportsEmpty.hidden = true;
        }

        filteredReports.forEach(function (report) {
            organizationSharedReportsList.appendChild(createOrganizationSharedReportItem(report));
        });
    }

    function filterOrganizationSharedReports(reports) {
        var query = (organizationSharedReportsState.query || "").trim().toLowerCase();
        var sourceReports = Array.isArray(reports) ? reports : [];

        if (!query) {
            return sourceReports;
        }

        return sourceReports.filter(function (report) {
            return [
                report.title,
                report.template,
                report.date,
                report.owner_name
            ].some(function (value) {
                return String(value || "").toLowerCase().indexOf(query) !== -1;
            });
        });
    }

    function createOrganizationSharedReportItem(report) {
        var item = document.createElement("div");
        var title = document.createElement("strong");
        var meta = document.createElement("span");

        item.className = "organization-shared-report-item";
        title.textContent = report.title || "Без названия";
        meta.textContent = [
            report.template || "Не выбран",
            report.date || "",
            report.owner_name ? "Владелец: " + report.owner_name : ""
        ].filter(Boolean).join(" · ");

        item.appendChild(title);
        item.appendChild(meta);
        return item;
    }

    function loadOrganizationMessageMembers() {
        if (!organizationMessagesUsers) {
            return;
        }

        if (organizationMembersState.hasLoaded && !organizationMembersState.isLoading) {
            renderOrganizationMessageUsers(organizationMembersState.members);
            return;
        }

        setOrganizationMessagesLoadingState();

        fetchOrganizationMembersData()
            .then(function (members) {
                organizationMembersState.members = members;
                organizationMembersState.hasLoaded = true;
                renderOrganizationMessageUsers(members);
            })
            .catch(function () {
                renderOrganizationMessagesError();
                showToast("Не удалось загрузить участников.", "error");
            });
    }

    function setOrganizationMessagesLoadingState() {
        if (organizationMessagesLoading) {
            organizationMessagesLoading.hidden = false;
        }

        if (organizationMessagesError) {
            organizationMessagesError.hidden = true;
        }

        if (organizationMessagesEmpty) {
            organizationMessagesEmpty.hidden = true;
        }

        organizationMessagesUsers.innerHTML = "";
    }

    function renderOrganizationMessagesError() {
        if (organizationMessagesLoading) {
            organizationMessagesLoading.hidden = true;
        }

        if (organizationMessagesError) {
            organizationMessagesError.hidden = false;
        }

        if (organizationMessagesEmpty) {
            organizationMessagesEmpty.hidden = true;
        }

        organizationMessagesUsers.innerHTML = "";
    }

    function renderOrganizationMessageUsers(members) {
        var sourceMembers = Array.isArray(members) ? members : [];

        if (organizationMessagesLoading) {
            organizationMessagesLoading.hidden = true;
        }

        if (organizationMessagesError) {
            organizationMessagesError.hidden = true;
        }

        organizationMessagesUsers.innerHTML = "";

        if (!sourceMembers.length) {
            if (organizationMessagesEmpty) {
                organizationMessagesEmpty.hidden = false;
            }
            organizationMessagesState.selectedMemberId = "";
            renderOrganizationMessagesDialog();
            return;
        }

        if (organizationMessagesEmpty) {
            organizationMessagesEmpty.hidden = true;
        }

        if (
            organizationMessagesState.selectedMemberId &&
            !getOrganizationMessageMemberById(organizationMessagesState.selectedMemberId)
        ) {
            organizationMessagesState.selectedMemberId = "";
        }

        sourceMembers.forEach(function (member) {
            organizationMessagesUsers.appendChild(createOrganizationMessageUserButton(member));
        });
        renderOrganizationMessagesDialog();
    }

    function createOrganizationMessageUserButton(member) {
        var button = document.createElement("button");
        var avatar = document.createElement("span");
        var content = document.createElement("span");
        var name = document.createElement("span");
        var meta = document.createElement("span");
        var memberId = member.id ? String(member.id) : "";
        var displayName = getOrganizationMemberDisplayName(member);

        button.className = "organization-messages-user";
        button.type = "button";
        button.dataset.organizationMessageUser = "true";
        button.dataset.memberId = memberId;

        if (memberId && organizationMessagesState.selectedMemberId === memberId) {
            button.classList.add("is-active");
        }

        avatar.className = "organization-messages-user-avatar";

        if (member.avatar) {
            var avatarImage = document.createElement("img");
            avatarImage.src = member.avatar;
            avatarImage.alt = "";
            avatar.appendChild(avatarImage);
        } else {
            avatar.textContent = getOrganizationMemberInitial(member, displayName);
        }

        content.className = "organization-messages-user-content";
        name.className = "organization-messages-user-name";
        name.textContent = displayName;
        meta.className = "organization-messages-user-meta";
        meta.textContent = member.position || member.role_label || "Участник";

        content.appendChild(name);
        content.appendChild(meta);
        button.appendChild(avatar);
        button.appendChild(content);

        return button;
    }

    function selectOrganizationMessageMember(memberId) {
        if (!memberId) {
            return;
        }

        organizationMessagesState.selectedMemberId = memberId;
        renderOrganizationMessageUsers(organizationMembersState.members);
    }

    function renderOrganizationMessagesDialog() {
        var member = getOrganizationMessageMemberById(organizationMessagesState.selectedMemberId);
        var messages;

        if (!member) {
            if (organizationMessagesDialogName) {
                organizationMessagesDialogName.textContent = "Выберите участника";
            }

            if (organizationMessagesDialogMeta) {
                organizationMessagesDialogMeta.textContent = "Чтобы начать диалог, выберите участника слева.";
            }

            if (organizationMessagesHistory) {
                organizationMessagesHistory.innerHTML = "";
                organizationMessagesHistory.appendChild(createOrganizationMessagesEmpty("Выберите участника, чтобы начать диалог."));
            }

            setOrganizationMessagesFormEnabled(false);
            return;
        }

        if (organizationMessagesDialogName) {
            organizationMessagesDialogName.textContent = getOrganizationMemberDisplayName(member);
        }

        if (organizationMessagesDialogMeta) {
            organizationMessagesDialogMeta.textContent = member.position || member.role_label || "Участник";
        }

        messages = organizationMessagesState.messagesByMemberId[String(member.id)] || [];

        if (organizationMessagesHistory) {
            organizationMessagesHistory.innerHTML = "";

            if (!messages.length) {
                organizationMessagesHistory.appendChild(createOrganizationMessagesEmpty("Сообщений пока нет."));
            } else {
                messages.forEach(function (message) {
                    organizationMessagesHistory.appendChild(createOrganizationMessageBubble(message));
                });
                organizationMessagesHistory.scrollTop = organizationMessagesHistory.scrollHeight;
            }
        }

        setOrganizationMessagesFormEnabled(true);
    }

    function createOrganizationMessagesEmpty(text) {
        var element = document.createElement("div");
        element.className = "organization-messages-dialog-empty";
        element.textContent = text;
        return element;
    }

    function createOrganizationMessageBubble(message) {
        var bubble = document.createElement("div");
        bubble.className = "organization-message-bubble";

        if (message.direction === "out") {
            bubble.classList.add("is-out");
        }

        bubble.textContent = message.text || "";
        return bubble;
    }

    function sendOrganizationMessage() {
        var memberId = organizationMessagesState.selectedMemberId;
        var text = organizationMessagesInput ? organizationMessagesInput.value.trim() : "";

        if (!memberId || !text) {
            return;
        }

        if (!organizationMessagesState.messagesByMemberId[memberId]) {
            organizationMessagesState.messagesByMemberId[memberId] = [];
        }

        organizationMessagesState.messagesByMemberId[memberId].push({
            text: text,
            direction: "out"
        });

        organizationMessagesInput.value = "";
        renderOrganizationMessagesDialog();
        organizationMessagesInput.focus();
    }

    function setOrganizationMessagesFormEnabled(isEnabled) {
        if (organizationMessagesInput) {
            organizationMessagesInput.disabled = !isEnabled;
        }

        if (organizationMessagesSend) {
            organizationMessagesSend.disabled = !isEnabled;
        }
    }

    function getOrganizationMessageMemberById(memberId) {
        var id = String(memberId || "");

        if (!id) {
            return null;
        }

        return organizationMembersState.members.find(function (member) {
            return String(member.id || "") === id;
        }) || null;
    }

    function loadOrganizationMembers() {
        if (!organizationMembersBody) {
            return;
        }

        organizationMembersState.isLoading = true;
        organizationMembersState.members = [];
        setOrganizationMembersLoadingState();

        fetchOrganizationMembersData()
            .then(function (members) {
                organizationMembersState.isLoading = false;
                organizationMembersState.members = members;
                organizationMembersState.hasLoaded = true;
                renderOrganizationMembers(organizationMembersState.members);
            })
            .catch(function () {
                organizationMembersState.isLoading = false;
                renderOrganizationMembersError();
                showToast("Не удалось загрузить участников организации.", "error");
            });
    }

    function fetchOrganizationMembersData() {
        return fetch("/api/organization/members", {
            headers: {
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Не удалось загрузить участников организации.");
                }

                return response.json();
            })
            .then(function (data) {
                return data.members || [];
            });
    }

    function fetchOrganizationGroupsData() {
        return fetch("/api/organization/groups", {
            headers: {
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Не удалось загрузить группы организации.");
                }

                return response.json();
            })
            .then(function (data) {
                return data.groups || [];
            });
    }

    function setOrganizationMembersLoadingState() {
        if (organizationMembersLoading) {
            organizationMembersLoading.hidden = false;
        }

        if (organizationMembersEmpty) {
            organizationMembersEmpty.hidden = true;
        }

        if (organizationMembersError) {
            organizationMembersError.hidden = true;
        }

        if (organizationMembersTableWrap) {
            organizationMembersTableWrap.hidden = true;
        }

        organizationMembersBody.innerHTML = "";
    }

    function renderOrganizationMembers(members) {
        var sourceMembers = Array.isArray(members) ? members : [];
        var filteredMembers = filterOrganizationMembers(sourceMembers);
        var hasSearchQuery = Boolean((organizationMembersState.query || "").trim());

        organizationMembersBody.innerHTML = "";
        closeOrganizationMemberMenu();

        if (organizationMembersLoading) {
            organizationMembersLoading.hidden = true;
        }

        if (organizationMembersError) {
            organizationMembersError.hidden = true;
        }

        if (!sourceMembers.length || !filteredMembers.length) {
            if (organizationMembersEmpty) {
                organizationMembersEmpty.hidden = false;
                organizationMembersEmpty.textContent = hasSearchQuery
                    ? "Участники не найдены"
                    : "В организации пока нет участников.";
            }

            if (organizationMembersTableWrap) {
                organizationMembersTableWrap.hidden = true;
            }

            return;
        }

        if (organizationMembersEmpty) {
            organizationMembersEmpty.hidden = true;
        }

        if (organizationMembersTableWrap) {
            organizationMembersTableWrap.hidden = false;
        }

        filteredMembers.forEach(function (member) {
            organizationMembersBody.appendChild(createOrganizationMemberRow(member));
        });
    }

    function filterOrganizationMembers(members) {
        var query = (organizationMembersState.query || "").trim().toLowerCase();

        if (!query) {
            return members;
        }

        return members.filter(function (member) {
            return getOrganizationMemberSearchText(member).indexOf(query) !== -1;
        });
    }

    function getOrganizationMemberSearchText(member) {
        return [
            member.display_name,
            member.name,
            member.username,
            member.role_label,
            member.role,
            member.position,
            member.email
        ].map(function (value) {
            return String(value || "").toLowerCase();
        }).join(" ");
    }

    function renderOrganizationMembersError() {
        organizationMembersBody.innerHTML = "";
        closeOrganizationMemberMenu();

        if (organizationMembersLoading) {
            organizationMembersLoading.hidden = true;
        }

        if (organizationMembersEmpty) {
            organizationMembersEmpty.hidden = true;
        }

        if (organizationMembersError) {
            organizationMembersError.hidden = false;
        }

        if (organizationMembersTableWrap) {
            organizationMembersTableWrap.hidden = true;
        }
    }

    function createOrganizationMemberRow(member) {
        var row = document.createElement("tr");
        var avatarCell = document.createElement("td");
        var nameCell = document.createElement("td");
        var roleCell = document.createElement("td");
        var positionCell = document.createElement("td");
        var emailCell = document.createElement("td");
        var actionsCell = document.createElement("td");
        var avatar = document.createElement("span");
        var name = document.createElement("div");
        var roleBadge = document.createElement("span");
        var email = document.createElement("span");
        var actionButton = document.createElement("button");
        var displayName = getOrganizationMemberDisplayName(member);
        var memberEmail = member.email || "—";

        avatar.className = "organization-member-avatar";
        if (member.avatar) {
            var avatarImage = document.createElement("img");
            avatarImage.src = member.avatar;
            avatarImage.alt = "";
            avatar.appendChild(avatarImage);
        } else {
            avatar.textContent = getOrganizationMemberInitial(member, displayName);
        }

        name.className = "organization-member-name";
        name.textContent = displayName;

        roleBadge.className = "organization-member-role-badge";
        if (member.role === "admin") {
            roleBadge.classList.add("is-admin");
        }
        roleBadge.textContent = member.role_label || "Участник";

        email.className = "organization-member-email";
        email.textContent = memberEmail;
        email.title = memberEmail !== "—" ? memberEmail : "";

        actionButton.className = "organization-member-actions-button";
        actionButton.type = "button";
        actionButton.textContent = "⋯";
        actionButton.setAttribute("aria-label", "Действия участника");
        actionButton.dataset.organizationMemberActionButton = "true";
        actionButton.dataset.memberId = member.id ? String(member.id) : "";
        actionButton.dataset.memberName = displayName;

        avatarCell.appendChild(avatar);
        nameCell.appendChild(name);
        roleCell.appendChild(roleBadge);
        positionCell.textContent = member.position || "—";
        emailCell.appendChild(email);
        actionsCell.appendChild(actionButton);

        row.appendChild(avatarCell);
        row.appendChild(nameCell);
        row.appendChild(roleCell);
        row.appendChild(positionCell);
        row.appendChild(emailCell);
        row.appendChild(actionsCell);

        return row;
    }

    function getOrganizationMemberDisplayName(member) {
        return member.display_name || member.name || member.username || member.email || "Пользователь";
    }

    function getOrganizationMemberInitial(member, displayName) {
        var value = member.first_name || member.last_name || displayName || member.email || "П";

        return value.trim().slice(0, 1).toUpperCase();
    }

    function openDashboardPreviewSharePicker() {
        if (!dashboardPreviewReportId) {
            showToast("Сначала откройте отчет", "warning");
            return;
        }

        openReportSharePicker({
            mode: "preview",
            reportId: dashboardPreviewReportId,
            selectedUserIds: dashboardPreviewShares
                .filter(function (share) {
                    return (share.subject_type || "user") === "user";
                })
                .map(function (share) {
                    return share.user_id;
                }),
            selectedGroupIds: dashboardPreviewShares
                .filter(function (share) {
                    return share.subject_type === "group";
                })
                .map(function (share) {
                    return share.group_id;
                })
        });
    }

    function openCreateReportSharePicker() {
        openReportSharePicker({
            mode: "create",
            reportId: "",
            selectedUserIds: createSelectedShareUserIds,
            selectedGroupIds: createSelectedShareGroupIds
        });
    }

    function openReportSharePicker(options) {
        if (!reportSharePickerModal || !reportShareList) {
            showToast("Окно совместного доступа недоступно", "error");
            return;
        }

        reportSharePickerState.mode = options && options.mode ? options.mode : "create";
        reportSharePickerState.reportId = options && options.reportId ? String(options.reportId) : "";
        reportSharePickerState.selectedUserIds = new Set(
            (options && options.selectedUserIds ? options.selectedUserIds : []).map(function (userId) {
                return String(userId);
            })
        );
        reportSharePickerState.selectedGroupIds = new Set(
            (options && options.selectedGroupIds ? options.selectedGroupIds : []).map(function (groupId) {
                return String(groupId);
            })
        );
        reportSharePickerState.subjectType = "user";
        reportSharePickerState.query = "";

        if (reportShareSearch) {
            reportShareSearch.value = "";
            reportShareSearch.placeholder = "Поиск участника";
        }

        updateReportShareSubjectTypeButtons();
        openModal(reportSharePickerModal);
        loadReportSharePickerMembers();
    }

    function loadReportSharePickerMembers() {
        if (
            organizationMembersState.hasLoaded &&
            organizationGroupsState.hasLoaded &&
            !organizationMembersState.isLoading &&
            !organizationGroupsState.isLoading
        ) {
            reportSharePickerState.members = organizationMembersState.members;
            reportSharePickerState.groups = organizationGroupsState.groups;
            renderReportSharePickerMembers();
            return;
        }

        setReportSharePickerLoadingState();

        organizationMembersState.isLoading = true;
        organizationGroupsState.isLoading = true;

        Promise.all([
            organizationMembersState.hasLoaded
                ? Promise.resolve(organizationMembersState.members)
                : fetchOrganizationMembersData(),
            organizationGroupsState.hasLoaded
                ? Promise.resolve(organizationGroupsState.groups)
                : fetchOrganizationGroupsData()
        ])
            .then(function (results) {
                var members = results[0] || [];
                var groups = results[1] || [];

                organizationMembersState.isLoading = false;
                organizationGroupsState.isLoading = false;
                organizationMembersState.members = members;
                organizationGroupsState.groups = groups;
                organizationMembersState.hasLoaded = true;
                organizationGroupsState.hasLoaded = true;
                reportSharePickerState.members = members;
                reportSharePickerState.groups = groups;
                renderReportSharePickerMembers();
            })
            .catch(function () {
                organizationMembersState.isLoading = false;
                organizationGroupsState.isLoading = false;
                renderReportSharePickerError();
            });
    }

    function setReportSharePickerLoadingState() {
        if (reportShareLoading) {
            reportShareLoading.hidden = false;
        }

        if (reportShareError) {
            reportShareError.hidden = true;
        }

        if (reportShareEmpty) {
            reportShareEmpty.hidden = true;
        }

        if (reportShareNoResults) {
            reportShareNoResults.hidden = true;
        }

        if (reportShareList) {
            reportShareList.innerHTML = "";
        }
    }

    function renderReportSharePickerError() {
        if (reportShareLoading) {
            reportShareLoading.hidden = true;
        }

        if (reportShareError) {
            reportShareError.hidden = false;
        }

        if (reportShareEmpty) {
            reportShareEmpty.hidden = true;
        }

        if (reportShareNoResults) {
            reportShareNoResults.hidden = true;
        }

        if (reportShareList) {
            reportShareList.innerHTML = "";
        }
    }

    function renderReportSharePickerMembers() {
        if (!reportShareList) {
            return;
        }

        var isGroupMode = reportSharePickerState.subjectType === "group";
        var sourceSubjects = Array.isArray(isGroupMode ? reportSharePickerState.groups : reportSharePickerState.members)
            ? (isGroupMode ? reportSharePickerState.groups : reportSharePickerState.members)
            : [];
        var filteredSubjects = filterReportShareSubjects(sourceSubjects);
        var hasQuery = Boolean((reportSharePickerState.query || "").trim());

        if (reportShareLoading) {
            reportShareLoading.hidden = true;
        }

        if (reportShareError) {
            reportShareError.hidden = true;
        }

        reportShareList.innerHTML = "";

        if (reportShareSearch) {
            reportShareSearch.placeholder = isGroupMode ? "Поиск группы" : "Поиск участника";
        }

        if (!sourceSubjects.length) {
            if (reportShareEmpty) {
                reportShareEmpty.hidden = false;
                reportShareEmpty.textContent = isGroupMode
                    ? "В организации пока нет групп."
                    : "В организации пока нет участников.";
            }
            if (reportShareNoResults) {
                reportShareNoResults.hidden = true;
            }
            return;
        }

        if (!filteredSubjects.length) {
            if (reportShareEmpty) {
                reportShareEmpty.hidden = true;
            }
            if (reportShareNoResults) {
                reportShareNoResults.hidden = false;
                reportShareNoResults.textContent = isGroupMode ? "Группы не найдены" : "Участники не найдены";
            }
            return;
        }

        if (reportShareEmpty) {
            reportShareEmpty.hidden = true;
        }

        if (reportShareNoResults) {
            reportShareNoResults.hidden = true;
        }

        filteredSubjects.forEach(function (subject) {
            reportShareList.appendChild(createReportShareSubjectItem(subject, isGroupMode ? "group" : "user"));
        });

        if (!hasQuery && reportShareSearch) {
            reportShareSearch.placeholder = isGroupMode ? "Поиск группы" : "Поиск участника";
        }
    }

    function filterReportShareSubjects(subjects) {
        var query = (reportSharePickerState.query || "").trim().toLowerCase();

        if (!query) {
            return subjects;
        }

        return subjects.filter(function (subject) {
            return getReportShareSubjectSearchText(subject).indexOf(query) !== -1;
        });
    }

    function createReportShareSubjectItem(subject, subjectType) {
        var button = document.createElement("button");
        var avatar = document.createElement("span");
        var content = document.createElement("span");
        var name = document.createElement("strong");
        var meta = document.createElement("span");
        var check = document.createElement("span");
        var displayName = getReportShareSubjectDisplayName(subject, subjectType);
        var subjectId = String(subject.id || "");
        var isSelected = subjectType === "group"
            ? reportSharePickerState.selectedGroupIds.has(subjectId)
            : reportSharePickerState.selectedUserIds.has(subjectId);

        button.type = "button";
        button.className = "report-share-member";
        button.dataset.reportShareSubject = "true";
        button.dataset.subjectType = subjectType;
        button.dataset.subjectId = subjectId;

        if (subjectType === "user") {
            button.dataset.reportShareMember = "true";
            button.dataset.userId = subjectId;
        }

        if (isSelected) {
            button.classList.add("is-selected");
        }

        avatar.className = "report-share-member-avatar";
        if (subjectType === "group") {
            avatar.classList.add("report-share-group-avatar");
        }

        if (subject.avatar) {
            var avatarImage = document.createElement("img");
            avatarImage.src = subject.avatar;
            avatarImage.alt = "";
            avatar.appendChild(avatarImage);
        } else {
            avatar.textContent = getReportShareSubjectInitial(subject, displayName, subjectType);
        }

        content.className = "report-share-member-content";
        name.textContent = displayName;
        meta.textContent = getReportShareSubjectMeta(subject, subjectType);
        content.appendChild(name);
        content.appendChild(meta);

        check.className = "report-share-member-check";
        check.textContent = "✓";

        button.appendChild(avatar);
        button.appendChild(content);
        button.appendChild(check);
        return button;
    }

    function toggleReportShareSubjectSelection(subjectType, subjectId) {
        var normalizedSubjectId = String(subjectId || "");
        var selectedSet = subjectType === "group"
            ? reportSharePickerState.selectedGroupIds
            : reportSharePickerState.selectedUserIds;

        if (!normalizedSubjectId) {
            return;
        }

        if (selectedSet.has(normalizedSubjectId)) {
            selectedSet.delete(normalizedSubjectId);
        } else {
            selectedSet.add(normalizedSubjectId);
        }

        renderReportSharePickerMembers();
    }

    function confirmReportSharePicker() {
        var selectedUserIds = Array.from(reportSharePickerState.selectedUserIds);
        var selectedGroupIds = Array.from(reportSharePickerState.selectedGroupIds);

        if (reportSharePickerState.mode === "preview") {
            saveDashboardPreviewShares(selectedUserIds, selectedGroupIds);
            return;
        }

        updateCreateShareSelection(selectedUserIds, selectedGroupIds);
        closeModal(reportSharePickerModal);
    }

    function saveDashboardPreviewShares(selectedUserIds, selectedGroupIds) {
        if (!dashboardPreviewReportId) {
            showToast("Отчет не найден", "error");
            return;
        }

        fetch("/api/reports/" + encodeURIComponent(dashboardPreviewReportId) + "/shares", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({
                user_ids: selectedUserIds,
                group_ids: selectedGroupIds
            })
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Не удалось сохранить совместный доступ");
                    }

                    return data;
                });
            })
            .then(function (data) {
                updateDashboardPreviewShares(data.shares || []);
                closeModal(reportSharePickerModal);
                showToast("Совместный доступ обновлен", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось сохранить совместный доступ", "error");
            });
    }

    function updateCreateShareSelection(userIds, groupIds) {
        createSelectedShareUserIds = (userIds || []).map(function (userId) {
            return String(userId);
        });
        createSelectedShareGroupIds = (groupIds || []).map(function (groupId) {
            return String(groupId);
        });

        if (createShareUserIdsInput) {
            createShareUserIdsInput.value = JSON.stringify(createSelectedShareUserIds);
        }

        if (createShareGroupIdsInput) {
            createShareGroupIdsInput.value = JSON.stringify(createSelectedShareGroupIds);
        }

        updateCreateShareButton();
    }

    function resetCreateShareSelection() {
        updateCreateShareSelection([], []);
    }

    function updateCreateShareButton() {
        var hasSelection = createSelectedShareUserIds.length > 0 || createSelectedShareGroupIds.length > 0;

        if (createShareEmpty) {
            createShareEmpty.hidden = hasSelection;
        }

        if (createShareSelected) {
            createShareSelected.hidden = !hasSelection;
        }

        if (createShareEditButton) {
            createShareEditButton.hidden = !hasSelection;
        }

        if (createShareSummary) {
            createShareSummary.textContent = hasSelection
                ? getShareSelectionSummary(createSelectedShareUserIds, createSelectedShareGroupIds)
                : "";
        }
    }

    function getShareSelectionSummary(userIds, groupIds) {
        var members = organizationMembersState.members || reportSharePickerState.members || [];
        var groups = organizationGroupsState.groups || reportSharePickerState.groups || [];
        var normalizedUserIds = userIds || [];
        var normalizedGroupIds = groupIds || [];
        var totalCount = normalizedUserIds.length + normalizedGroupIds.length;
        var firstSubject = null;
        var firstName = "";

        if (!totalCount) {
            return "";
        }

        if (normalizedUserIds.length) {
            firstSubject = getSubjectById(members, normalizedUserIds[0]);
            firstName = firstSubject ? getOrganizationMemberDisplayName(firstSubject) : "";
        } else if (normalizedGroupIds.length) {
            firstSubject = getSubjectById(groups, normalizedGroupIds[0]);
            firstName = firstSubject ? getReportShareSubjectDisplayName(firstSubject, "group") : "";
        }

        if (!firstName) {
            return "Выбрано: " + totalCount;
        }

        if (totalCount === 1) {
            return firstName;
        }

        return firstName + " +" + String(totalCount - 1);
    }

    function getSubjectById(subjects, subjectId) {
        var normalizedSubjectId = String(subjectId || "");

        return (subjects || []).filter(function (subject) {
            return String(subject.id || "") === normalizedSubjectId;
        })[0] || null;
    }

    function updateReportShareSubjectTypeButtons() {
        reportShareSubjectTypeButtons.forEach(function (button) {
            var subjectType = button.dataset.reportShareSubjectType || "user";
            button.classList.toggle("is-active", subjectType === reportSharePickerState.subjectType);
        });
    }

    function getReportShareSubjectDisplayName(subject, subjectType) {
        if (subjectType === "group") {
            return subject.name || subject.display_name || "Группа";
        }

        return getOrganizationMemberDisplayName(subject);
    }

    function getReportShareSubjectMeta(subject, subjectType) {
        if (subjectType === "group") {
            var membersCount = Number(subject.members_count || 0);

            if (membersCount === 1) {
                return "1 участник";
            }

            if (membersCount > 1 && membersCount < 5) {
                return membersCount + " участника";
            }

            return membersCount + " участников";
        }

        return subject.position || subject.email || subject.role_label || "Участник";
    }

    function getReportShareSubjectInitial(subject, displayName, subjectType) {
        if (subjectType === "group") {
            return (displayName || "Г").trim().slice(0, 1).toUpperCase();
        }

        return getOrganizationMemberInitial(subject, displayName);
    }

    function getReportShareSubjectSearchText(subject) {
        return [
            subject.display_name,
            subject.name,
            subject.username,
            subject.role_label,
            subject.role,
            subject.position,
            subject.email,
            subject.description,
            subject.members_count
        ].map(function (value) {
            return String(value || "").toLowerCase();
        }).join(" ");
    }

    function updateDashboardPreviewShares(shares) {
        dashboardPreviewShares = Array.isArray(shares) ? shares : [];

        if (!dashboardPreviewShareText) {
            return;
        }

        dashboardPreviewShareText.innerHTML = "";
        dashboardPreviewShareText.classList.toggle("is-empty", !dashboardPreviewShares.length);

        if (!dashboardPreviewShares.length) {
            dashboardPreviewShareText.textContent = "—";
            renderDashboardPreviewSharesDropdown();
            return;
        }

        dashboardPreviewShareText.textContent = getDashboardPreviewSharesSummary(dashboardPreviewShares);
        renderDashboardPreviewSharesDropdown();
    }

    function getDashboardPreviewSharesSummary(shares) {
        var firstShare = shares[0] || {};
        var firstName = firstShare.display_name || firstShare.name || firstShare.email || "Участник";

        if (shares.length === 1) {
            return firstName;
        }

        return firstName + " +" + String(shares.length - 1);
    }

    function toggleDashboardPreviewSharesDropdown() {
        if (!dashboardPreviewSharesDropdown) {
            return;
        }

        renderDashboardPreviewSharesDropdown();
        dashboardPreviewSharesDropdown.hidden = !dashboardPreviewSharesDropdown.hidden;
        dashboardPreviewSharesDropdown.classList.toggle("is-open", !dashboardPreviewSharesDropdown.hidden);
    }

    function closeDashboardPreviewSharesDropdown() {
        if (!dashboardPreviewSharesDropdown) {
            return;
        }

        dashboardPreviewSharesDropdown.classList.remove("is-open");
        dashboardPreviewSharesDropdown.hidden = true;
    }

    function renderDashboardPreviewSharesDropdown() {
        if (!dashboardPreviewSharesDropdown) {
            return;
        }

        dashboardPreviewSharesDropdown.innerHTML = "";

        if (!dashboardPreviewShares.length) {
            var empty = document.createElement("div");
            empty.className = "dashboard-preview-shares-empty";
            empty.textContent = "Доступ пока не открыт";
            dashboardPreviewSharesDropdown.appendChild(empty);
            return;
        }

        dashboardPreviewShares.forEach(function (share) {
            dashboardPreviewSharesDropdown.appendChild(createDashboardPreviewShareRow(share));
        });
    }

    function createDashboardPreviewShareRow(share) {
        var row = document.createElement("div");
        var avatar = document.createElement("span");
        var content = document.createElement("span");
        var name = document.createElement("strong");
        var meta = document.createElement("span");
        var displayName = share.display_name || share.name || share.email || "Участник";

        row.className = "dashboard-preview-share-row";
        avatar.className = "dashboard-preview-share-avatar";

        if (share.avatar) {
            var image = document.createElement("img");
            image.src = share.avatar;
            image.alt = "";
            avatar.appendChild(image);
        } else {
            avatar.textContent = getOrganizationMemberInitial(share, displayName);
        }

        content.className = "dashboard-preview-share-content";
        name.textContent = displayName;
        meta.textContent = share.position || share.email || share.role_label || "Участник";
        content.appendChild(name);
        content.appendChild(meta);

        row.appendChild(avatar);
        row.appendChild(content);
        return row;
    }

    function toggleOrganizationMemberMenu(button) {
        if (!organizationMemberMenu) {
            return;
        }

        if (
            organizationMemberMenu.classList.contains("is-open") &&
            organizationMemberMenu.dataset.memberId === (button.dataset.memberId || "")
        ) {
            closeOrganizationMemberMenu();
            return;
        }

        openOrganizationMemberMenu(button);
    }

    function openOrganizationMemberMenu(button) {
        var rect;
        var menuWidth;
        var left;
        var top;

        if (!organizationMemberMenu || !button) {
            return;
        }

        closeOrganizationMemberMenu();
        rect = button.getBoundingClientRect();
        organizationMemberMenu.hidden = false;
        organizationMemberMenu.dataset.memberId = button.dataset.memberId || "";
        organizationMemberMenu.dataset.memberName = button.dataset.memberName || "";
        menuWidth = organizationMemberMenu.offsetWidth || 210;
        left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12);
        top = Math.min(rect.bottom + 6, window.innerHeight - organizationMemberMenu.offsetHeight - 12);

        organizationMemberMenu.style.left = Math.max(12, left) + "px";
        organizationMemberMenu.style.top = Math.max(12, top) + "px";
        organizationMemberMenu.classList.add("is-open");
        button.classList.add("is-open");
    }

    function closeOrganizationMemberMenu() {
        if (!organizationMemberMenu) {
            return;
        }

        organizationMemberMenu.classList.remove("is-open");
        organizationMemberMenu.hidden = true;
        organizationMemberMenu.dataset.memberId = "";
        organizationMemberMenu.dataset.memberName = "";
        document.querySelectorAll("[data-organization-member-action-button].is-open").forEach(function (button) {
            button.classList.remove("is-open");
        });
    }

    function handleOrganizationMemberMenuAction(action) {
        closeOrganizationMemberMenu();

        if (action === "message") {
            showToast("Функция сообщений будет добавлена позже.", "warning");
            return;
        }

        if (action === "invite") {
            showToast("Функция приглашений будет добавлена позже.", "warning");
            return;
        }

        showToast("Действие будет добавлено позже.", "warning");
    }

    function initializeDashboardMainModes() {
        if (!mainModeButtons.length || !mainModePanels.length) {
            return;
        }

        renderTemplateTags();
        renderDashboardTemplates();

        mainModeButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                setDashboardMainMode(button.dataset.mainModeToggle || "reports");
            });
        });

        setDashboardMainMode(activeMainMode);
    }

    function getTemplateTag(tagId) {
        return templateTags.find(function (tag) {
            return tag.id === tagId;
        }) || null;
    }

    function parseDashboardTemplateData() {
        if (!dashboardTemplateData) {
            return [];
        }

        try {
            return JSON.parse(dashboardTemplateData.textContent || "[]") || [];
        } catch (error) {
            return [];
        }
    }

    function parseDashboardTemplateTaxonomyData() {
        if (!dashboardTemplateTaxonomyData) {
            return {
                types: [],
                tags: [],
                filters: []
            };
        }

        try {
            var parsedData = JSON.parse(dashboardTemplateTaxonomyData.textContent || "{}") || {};

            return {
                types: Array.isArray(parsedData.types) ? parsedData.types : [],
                tags: Array.isArray(parsedData.tags) ? parsedData.tags : [],
                filters: Array.isArray(parsedData.filters) ? parsedData.filters : []
            };
        } catch (error) {
            return {
                types: [],
                tags: [],
                filters: []
            };
        }
    }

    function buildInitialTemplateTags(taxonomy) {
        var tags = [];
        var seen = {};
        var filters = taxonomy && Array.isArray(taxonomy.filters) ? taxonomy.filters : [];

        filters.forEach(function (option) {
            appendInitialTemplateTag(tags, seen, option);
        });

        if (!tags.length) {
            [
                { name: "Базовый", color: "#8b5cf6" },
                { name: "Учебный", color: "#38bdf8" },
                { name: "Практика", color: "#22c55e" },
                { name: "Аналитика", color: "#f59e0b" }
            ].forEach(function (option) {
                appendInitialTemplateTag(tags, seen, option);
            });
        }

        return tags;
    }

    function appendInitialTemplateTag(tags, seen, option) {
        var title = normalizeTagTitle(option && (option.name || option.title), "");
        var loweredTitle = title.toLowerCase();

        if (!title || seen[loweredTitle]) {
            return;
        }

        seen[loweredTitle] = true;
        tags.push({
            id: "tag-" + slugifyTemplateTag(title),
            title: title,
            color: option && option.color ? option.color : templateTagPalette[tags.length % templateTagPalette.length]
        });
    }

    function normalizeTagTitle(value, fallback) {
        return (value || fallback || "Шаблон").trim();
    }

    function slugifyTemplateTag(value) {
        return String(value || "template")
            .trim()
            .toLowerCase()
            .replace(/[^a-zа-яё0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "") || "template";
    }

    function ensureTemplateTag(tagTitle) {
        var title = normalizeTagTitle(tagTitle, "");

        if (!title) {
            return "";
        }

        var existingTag = templateTags.find(function (tag) {
            return tag.title.toLowerCase() === title.toLowerCase();
        });

        if (existingTag) {
            return existingTag.id;
        }

        var baseId = "tag-" + slugifyTemplateTag(title);
        var tagId = baseId;
        var index = 2;

        while (getTemplateTag(tagId)) {
            tagId = baseId + "-" + index;
            index += 1;
        }

        templateTags.push({
            id: tagId,
            title: title,
            color: templateTagPalette[(templateTags.length - 1) % templateTagPalette.length]
        });

        renderTemplateTags();
        return tagId;
    }

    function normalizeDashboardTemplateFromApi(template) {
        var tagTitle = normalizeTagTitle(template.tag, template.template_type);
        var tagId = ensureTemplateTag(tagTitle);

        return {
            id: "api-" + template.id,
            sourceTemplateId: template.id,
            title: template.title || "Новый шаблон",
            tagId: tagId,
            tagTitle: tagTitle,
            templateType: template.template_type || "Универсальный",
            createdAt: template.created_at || "",
            editUrl: template.edit_url || "/templates/" + template.id + "/edit",
            previewUrl: template.preview_url || "/templates/" + template.id + "/preview",
            persisted: true
        };
    }

    function loadTemplatesForReportCreate() {
        return fetch("/api/templates", {
            headers: {
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Не удалось загрузить шаблоны");
                    }

                    return data.templates || [];
                });
            });
    }

    window.loadTemplatesForReportCreate = loadTemplatesForReportCreate;

    function renderTemplateTags() {
        if (!templateTagsStrip) {
            return;
        }

        templateTagsStrip.innerHTML = "";

        templateTags.forEach(function (tag) {
            var button = document.createElement("button");
            button.className = "template-tag-button";
            button.type = "button";
            button.dataset.templateTagId = tag.id;
            button.title = tag.title;

            var dot = document.createElement("span");
            dot.className = "template-tag-dot";
            dot.style.setProperty("--template-tag-color", tag.color);

            var label = document.createElement("span");
            label.className = "template-tag-label";
            label.textContent = tag.title;

            button.appendChild(dot);
            button.appendChild(label);
            button.addEventListener("click", function () {
                setTemplateTagFilter(tag.id);
            });

            templateTagsStrip.appendChild(button);
        });

        templateTagsStrip.dataset.rendered = "true";

        if (templateTagReset && templateTagReset.dataset.bound !== "true") {
            templateTagReset.dataset.bound = "true";
            templateTagReset.addEventListener("click", function () {
                setTemplateTagFilter("");
            });
        }

        updateTemplateTagButtons();
    }

    function setTemplateTagFilter(tagId) {
        activeTemplateTag = tagId || "";
        updateTemplateTagButtons();
        filterDashboardTemplates(currentSearchQuery);
    }

    function updateTemplateTagButtons() {
        if (templateTagReset) {
            templateTagReset.classList.toggle("is-active", !activeTemplateTag);
        }

        document.querySelectorAll("[data-template-tag-id]").forEach(function (button) {
            button.classList.toggle("is-active", button.dataset.templateTagId === activeTemplateTag);
        });
    }

    function setDashboardMainMode(mode) {
        var previousMode = activeMainMode;
        activeMainMode = mode === "templates" ? "templates" : "reports";
        appState.activeMainMode = activeMainMode;
        storeDashboardMainMode(activeMainMode);

        mainModeButtons.forEach(function (button) {
            var isActive = button.dataset.mainModeToggle === activeMainMode;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        mainModePanels.forEach(function (panel) {
            var isActive = panel.dataset.mainModePanel === activeMainMode;
            panel.hidden = !isActive;
            panel.classList.toggle("is-active", isActive);
        });

        if (dashboardBoard) {
            dashboardBoard.classList.toggle("is-template-mode", activeMainMode === "templates");
        }

        updateDashboardModeVisuals(previousMode, activeMainMode);

        if (searchInput) {
            searchInput.placeholder = activeMainMode === "templates" ? "Поиск шаблонов" : "Поиск отчетов";
        }

        if (activeMainMode === "templates") {
            setSelectionMode(false);
            closeCardMenus();
        }

        filterDashboardCards(currentSearchQuery);
    }

    function getStoredDashboardMainMode() {
        var requestedMode = getRequestedDashboardMainMode();

        if (requestedMode) {
            return requestedMode;
        }

        try {
            var storedMode = window.localStorage.getItem(DASHBOARD_MAIN_MODE_STORAGE_KEY);
            return storedMode === "templates" ? "templates" : "reports";
        } catch (error) {
            return "reports";
        }
    }

    function getRequestedDashboardMainMode() {
        try {
            var params = new URLSearchParams(window.location.search || "");
            var mode = params.get("mode") || params.get("tab");
            return mode === "templates" ? "templates" : "";
        } catch (error) {
            return "";
        }
    }

    function storeDashboardMainMode(mode) {
        try {
            window.localStorage.setItem(DASHBOARD_MAIN_MODE_STORAGE_KEY, mode === "templates" ? "templates" : "reports");
        } catch (error) {
            return;
        }
    }

    function updateDashboardModeVisuals(previousMode, nextMode) {
        if (dashboardPage) {
            dashboardPage.classList.toggle("mode-reports", nextMode === "reports");
            dashboardPage.classList.toggle("mode-templates", nextMode === "templates");
        }

        updateDashboardTitle(previousMode, nextMode);
    }

    function clearDashboardTitleTimers() {
        dashboardTitleAnimationTimers.forEach(function (timerId) {
            window.clearTimeout(timerId);
        });
        dashboardTitleAnimationTimers = [];
    }

    function resetDashboardTitleClasses() {
        if (!dashboardTitle) {
            return;
        }

        [dashboardTitle, dashboardTitleCurrent, dashboardTitleNext].forEach(function (element) {
            if (!element) {
                return;
            }

            element.classList.remove(
                "is-title-exiting-left",
                "is-title-exiting-right",
                "is-title-entering-left",
                "is-title-entering-right"
            );
        });
    }

    function updateDashboardTitle(previousMode, nextMode) {
        if (!dashboardTitle) {
            return;
        }

        var nextTitle = dashboardModeTitles[nextMode] || dashboardModeTitles.reports;
        var currentTitle = dashboardTitleCurrent ? dashboardTitleCurrent.textContent.trim() : dashboardTitle.textContent.trim();

        document.title = nextTitle;

        if (!previousMode || previousMode === nextMode || currentTitle === nextTitle) {
            clearDashboardTitleTimers();
            resetDashboardTitleClasses();
            if (dashboardTitleCurrent) {
                dashboardTitleCurrent.textContent = nextTitle;
            } else {
                dashboardTitle.textContent = nextTitle;
            }
            if (dashboardTitleNext) {
                dashboardTitleNext.textContent = "";
            }
            dashboardTitle.setAttribute("aria-label", nextTitle);
            return;
        }

        animateDashboardTitle(
            nextTitle,
            dashboardModeOrder[nextMode] > dashboardModeOrder[previousMode] ? "forward" : "backward"
        );
    }

    function animateDashboardTitle(nextTitle, direction) {
        if (!dashboardTitle) {
            return;
        }

        clearDashboardTitleTimers();

        resetDashboardTitleClasses();

        var exitClass = direction === "forward" ? "is-title-exiting-left" : "is-title-exiting-right";
        var enterClass = direction === "forward" ? "is-title-entering-right" : "is-title-entering-left";

        if (!dashboardTitleCurrent || !dashboardTitleNext) {
            dashboardTitle.classList.add(exitClass);

            dashboardTitle.textContent = nextTitle;
            resetDashboardTitleClasses();
            dashboardTitle.classList.add(enterClass);

            dashboardTitleAnimationTimers.push(window.setTimeout(function () {
                resetDashboardTitleClasses();
                clearDashboardTitleTimers();
            }, DASHBOARD_TITLE_ENTER_DURATION));
            return;
        }

        dashboardTitle.setAttribute("aria-label", nextTitle);
        dashboardTitleNext.textContent = nextTitle;
        dashboardTitleCurrent.classList.add(exitClass);

        dashboardTitleAnimationTimers.push(window.setTimeout(function () {
            dashboardTitleNext.classList.add(enterClass);
        }, DASHBOARD_TITLE_ENTER_DELAY));

        dashboardTitleAnimationTimers.push(window.setTimeout(function () {
            dashboardTitleCurrent.textContent = nextTitle;
            dashboardTitleNext.textContent = "";
            resetDashboardTitleClasses();
            clearDashboardTitleTimers();
        }, Math.max(DASHBOARD_TITLE_EXIT_DURATION, DASHBOARD_TITLE_ENTER_DELAY + DASHBOARD_TITLE_ENTER_DURATION) + 40));
    }

    function renderDashboardTemplates() {
        if (!dashboardTemplateGrid || dashboardTemplateGrid.dataset.rendered === "true") {
            return;
        }

        dashboardTemplateGrid.appendChild(createDashboardTemplateCreateCard());

        dashboardTemplateMocks.forEach(function (template) {
            dashboardTemplateGrid.appendChild(createDashboardTemplateCard(template));
        });

        dashboardTemplateGrid.dataset.rendered = "true";
    }

    function createDashboardTemplateCreateCard() {
        var button = document.createElement("button");
        button.className = "report-card document-card create-card create-document-card template-create-card";
        button.type = "button";
        button.dataset.dashboardTemplateCreate = "true";
        button.innerHTML = '<span class="document-glow" aria-hidden="true"></span>' +
            '<span class="document-stack">' +
                '<span class="document-sheet document-sheet-left dashed"></span>' +
                '<span class="document-sheet document-sheet-right dashed"></span>' +
                '<span class="document-sheet document-sheet-main dashed">' +
                    '<span class="create-plus">+</span>' +
                    '<span class="create-title">Создать новый шаблон</span>' +
                '</span>' +
            '</span>';
        button.addEventListener("click", function () {
            openCreateTemplateModal();
        });

        return button;
    }

    function createDashboardTemplateCard(template) {
        var tag = getTemplateTag(template.tagId);
        var tagTitle = template.tagTitle || (tag ? tag.title : template.templateType || "Шаблон");
        var card = document.createElement("article");
        card.className = "report-card document-card template-dashboard-card";
        card.dataset.dashboardTemplateCard = "true";
        card.dataset.templateId = template.id || "";
        card.dataset.templateSourceId = template.sourceTemplateId || "";
        card.dataset.templateTitle = template.title || "";
        card.dataset.templateType = tagTitle;
        card.dataset.templateTagId = template.tagId || "";
        card.dataset.templateEditUrl = template.editUrl || "";
        card.dataset.templatePreviewUrl = template.previewUrl || "";
        card.innerHTML = '<div class="document-glow" aria-hidden="true"></div>' +
            '<div class="document-stack" aria-hidden="true">' +
                '<div class="document-sheet document-sheet-left"></div>' +
                '<div class="document-sheet document-sheet-right"></div>' +
                '<div class="document-sheet document-sheet-main">' +
                    '<div class="document-lines">' +
                        '<span></span><span></span><span></span><span></span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="document-card-glass">' +
                '<div class="document-card-title"></div>' +
                '<div class="document-card-type"></div>' +
            '</div>';

        card.querySelector(".document-card-title").textContent = template.title || "Шаблон";
        card.querySelector(".document-card-type").textContent = tagTitle;
        card.addEventListener("click", function (event) {
            if (event.target.closest("a, button, input, select, textarea, label") || event.target.closest(".card-menu-dropdown")) {
                return;
            }

            if (template.editUrl) {
                window.location.href = template.editUrl;
            }
        });

        return card;
    }

    function filterDashboardCards(query) {
        if (activeMainMode === "templates") {
            filterDashboardTemplates(query);
            return;
        }

        filterReportCards(query);
    }

    function filterDashboardTemplates(query) {
        var normalizedQuery = String(query || "").trim().toLowerCase();
        var visibleTemplateCount = 0;

        document.querySelectorAll("[data-dashboard-template-card]").forEach(function (card) {
            var title = (card.dataset.templateTitle || "").toLowerCase();
            var type = (card.dataset.templateType || "").toLowerCase();
            var matchesSearch = !normalizedQuery || title.indexOf(normalizedQuery) !== -1 || type.indexOf(normalizedQuery) !== -1;
            var matchesTag = !activeTemplateTag || card.dataset.templateTagId === activeTemplateTag;
            var isVisible = matchesSearch && matchesTag;

            card.classList.toggle("is-hidden", !isVisible);
            if (isVisible) {
                visibleTemplateCount += 1;
            }
        });

        if (dashboardTemplateEmpty) {
            dashboardTemplateEmpty.hidden = visibleTemplateCount > 0;
        }
    }

    function initializeCreateTemplateWorkflow() {
        if (!createTemplateForm) {
            return;
        }

        if (createTemplateSearch) {
            createTemplateSearch.addEventListener("input", function () {
                renderTemplateCreateBaseOptions();
            });
        }

        if (createTemplateTitle) {
            createTemplateTitle.addEventListener("input", function () {
                templateCreateState.title = createTemplateTitle.value;
            });
        }

        if (createTemplateTag) {
            createTemplateTag.addEventListener("input", function () {
                templateCreateState.tag = createTemplateTag.value;
            });
        }

        if (createTemplateType) {
            createTemplateType.addEventListener("change", function () {
                templateCreateState.type = createTemplateType.value || "Универсальный";
            });
        }

        createTemplateForm.addEventListener("submit", submitCreateTemplate);
    }

    function openCreateTemplateModal() {
        resetTemplateCreateState();
        renderTemplateCreateForm();
        renderTemplateCreateBaseOptions();
        openModal(createTemplateModal);

        if (createTemplateTitle) {
            window.setTimeout(function () {
                createTemplateTitle.focus();
            }, 120);
        }
    }

    function resetTemplateCreateState() {
        templateCreateState.sourceTemplateId = null;
        templateCreateState.sourceTemplateKey = "empty";
        templateCreateState.sourceTemplateTitle = "Пустой шаблон";
        templateCreateState.title = "";
        templateCreateState.tag = "";
        templateCreateState.type = "Универсальный";
        templateCreateState.createdAt = getTodayDisplay();

        if (createTemplateSearch) {
            createTemplateSearch.value = "";
        }
    }

    function renderTemplateCreateForm() {
        if (createTemplateTitle) {
            createTemplateTitle.value = templateCreateState.title;
        }

        if (createTemplateTag) {
            createTemplateTag.value = templateCreateState.tag;
        }

        if (createTemplateType) {
            createTemplateType.value = templateCreateState.type;
        }

        if (createTemplateDate) {
            createTemplateDate.value = templateCreateState.createdAt;
        }

        updateTemplateCreateSourceLabel();
    }

    function updateTemplateCreateSourceLabel() {
        if (createTemplateSourceLabel) {
            createTemplateSourceLabel.textContent = templateCreateState.sourceTemplateTitle || "Пустой шаблон";
        }
    }

    function getTodayDisplay() {
        var today = new Date();
        var day = String(today.getDate()).padStart(2, "0");
        var month = String(today.getMonth() + 1).padStart(2, "0");
        return day + "." + month + "." + today.getFullYear();
    }

    function getTemplateCreateBaseOptions() {
        return [
            {
                key: "empty",
                sourceTemplateId: null,
                title: "Пустой шаблон",
                tagTitle: "Без основы",
                templateType: "Пустой"
            }
        ].concat(dashboardTemplateMocks.map(function (template) {
            return {
                key: String(template.id || template.title),
                sourceTemplateId: template.persisted ? template.sourceTemplateId : null,
                title: template.title || "Шаблон",
                tagTitle: template.tagTitle || template.templateType || "Шаблон",
                templateType: template.templateType || "Универсальный"
            };
        }));
    }

    function renderTemplateCreateBaseOptions() {
        if (!createTemplateBaseGrid) {
            return;
        }

        var query = createTemplateSearch ? createTemplateSearch.value.trim().toLowerCase() : "";
        var visibleCount = 0;
        createTemplateBaseGrid.innerHTML = "";

        getTemplateCreateBaseOptions().forEach(function (option) {
            var haystack = (option.title + " " + option.tagTitle + " " + option.templateType).toLowerCase();

            if (query && haystack.indexOf(query) === -1) {
                return;
            }

            visibleCount += 1;
            createTemplateBaseGrid.appendChild(createTemplateBaseCard(option));
        });

        if (createTemplateEmpty) {
            createTemplateEmpty.hidden = visibleCount > 0;
        }
    }

    function createTemplateBaseCard(option) {
        var button = document.createElement("button");
        button.className = "template-create-base-card";
        button.type = "button";
        button.dataset.templateBaseKey = option.key;
        button.classList.toggle("is-selected", option.key === templateCreateState.sourceTemplateKey);

        var title = document.createElement("strong");
        title.textContent = option.title;

        var type = document.createElement("span");
        type.textContent = option.tagTitle || option.templateType || "Шаблон";

        button.appendChild(title);
        button.appendChild(type);
        button.addEventListener("click", function () {
            templateCreateState.sourceTemplateId = option.sourceTemplateId || null;
            templateCreateState.sourceTemplateKey = option.key;
            templateCreateState.sourceTemplateTitle = option.title;
            updateTemplateCreateSourceLabel();
            renderTemplateCreateBaseOptions();
        });

        return button;
    }

    function submitCreateTemplate(event) {
        event.preventDefault();

        if (!createTemplateForm) {
            return;
        }

        var title = createTemplateTitle ? createTemplateTitle.value.trim() : "";
        var tag = createTemplateTag ? createTemplateTag.value.trim() : "";
        var templateType = createTemplateType ? createTemplateType.value : "Универсальный";

        if (!title) {
            showToast("Введите название шаблона", "warning");
            if (createTemplateTitle) {
                createTemplateTitle.focus();
            }
            return;
        }

        fetch("/api/templates", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({
                title: title,
                tag: tag,
                template_type: templateType,
                source_template_id: templateCreateState.sourceTemplateId,
                source_template_title: templateCreateState.sourceTemplateTitle
            })
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Ошибка создания шаблона");
                    }

                    return data;
                });
            })
            .then(function (data) {
                var template = normalizeDashboardTemplateFromApi(data.template || {});
                addDashboardTemplateCard(template);
                closeModal(createTemplateModal);
                resetTemplateCreateState();
                showToast("Шаблон создан", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Ошибка создания шаблона", "error");
            });
    }

    function addDashboardTemplateCard(template) {
        dashboardTemplateMocks.unshift(template);
        renderTemplateTags();
        addTemplateToReportPicker(template);
        syncTemplateTypeFilterOptions();
        syncCreateTemplateTypeOptions();

        if (!dashboardTemplateGrid) {
            return;
        }

        var card = createDashboardTemplateCard(template);
        var createCard = dashboardTemplateGrid.querySelector("[data-dashboard-template-create]");

        if (createCard && createCard.nextSibling) {
            dashboardTemplateGrid.insertBefore(card, createCard.nextSibling);
        } else if (createCard) {
            dashboardTemplateGrid.appendChild(card);
        } else {
            dashboardTemplateGrid.appendChild(card);
        }

        filterDashboardTemplates(currentSearchQuery);
    }

    function addTemplateToReportPicker(template) {
        var grid = document.querySelector("[data-template-grid]");
        var templateKey = "template:" + String(template.sourceTemplateId || "").trim();
        var exists = false;

        if (!grid || !template.sourceTemplateId) {
            return;
        }

        getTemplateCards().forEach(function (card) {
            if (card.dataset.templateKey === templateKey) {
                exists = true;
            }
        });

        if (exists) {
            return;
        }

        grid.appendChild(createReportTemplateCardFromTemplate(template));
        bindTemplateCards();
    }

    function initializeFoldersDashboard() {
        collectFoldersFromDom();
        pinnedFolderIds = loadPinnedFolders();
        folderState.pinnedFolderIds = pinnedFolderIds.slice();
        renderPinnedFolders();
        updateFolderReportList("");

        if (folderResetButton) {
            folderResetButton.addEventListener("click", function () {
                selectedAllReportsFolderId = "";
                folderState.selectedFolderId = null;
                markFolderTreeSelection("[data-folder-select]", "");
                updateFolderReportList("");
                setFolderFilter("");
            });
        }

        if (folderSearchInput) {
            folderSearchInput.addEventListener("input", function () {
                handleFolderSearchInput();
            });
        }

        document.querySelectorAll("[data-pin-folder-search]").forEach(function (input) {
            input.addEventListener("input", function () {
                filterFolderTree(input);
            });
        });

        if (folderPickerSearch) {
            folderPickerSearch.addEventListener("input", function () {
                filterFolderTree(folderPickerSearch);
            });
        }

        if (reportLinkSearch) {
            reportLinkSearch.addEventListener("input", function () {
                renderReportLinkTree();
            });
        }

        if (folderSearchModeButton && folderSearchModeMenu) {
            folderSearchModeButton.addEventListener("click", function (event) {
                event.stopPropagation();
                folderSearchModeMenu.hidden = !folderSearchModeMenu.hidden;
            });
        }

        folderSearchModeOptions.forEach(function (button) {
            button.addEventListener("click", function () {
                setFolderSearchMode(button.dataset.searchMode || "folders");
            });
        });

        bindFolderTreeControls(document);

        if (folderPickerConfirm) {
            folderPickerConfirm.addEventListener("click", function () {
                confirmFolderPicker();
            });
        }

        if (reportLinkConfirm) {
            reportLinkConfirm.addEventListener("click", function () {
                confirmReportLinkPicker();
            });
        }

        if (reportLinkTree) {
            reportLinkTree.addEventListener("click", function (event) {
                var toggle = event.target.closest("[data-report-link-folder-toggle]");
                var reportButton = event.target.closest("[data-report-link-report]");
                var noneButton = event.target.closest("[data-report-link-none]");

                if (toggle) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleReportLinkFolder(toggle.dataset.folderId || "");
                    return;
                }

                if (reportButton) {
                    event.preventDefault();
                    reportLinkPickerState.selectedReportId = String(reportButton.dataset.reportId || "");
                    markReportLinkSelection();
                    return;
                }

                if (noneButton) {
                    event.preventDefault();
                    reportLinkPickerState.selectedReportId = "";
                    markReportLinkSelection();
                }
            });
        }

        document.querySelectorAll("[data-pin-folder-confirm]").forEach(function (button) {
            button.addEventListener("click", function () {
                pinSelectedFolder();
            });
        });

        if (pinnedFolderStrip) {
            pinnedFolderStrip.addEventListener("click", function (event) {
                var button = event.target.closest("[data-pinned-folder-id]");

                if (button) {
                    setFolderFilter(button.dataset.pinnedFolderId || "");
                }
            });

            pinnedFolderStrip.addEventListener("scroll", function () {
                updatePinnedScrollControls();
            });
        }

        pinnedFolderScrollButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                scrollPinnedFolders(button.dataset.pinnedScroll);
            });
        });

        if (pinnedFolderScrollButtons.length) {
            window.addEventListener("resize", updatePinnedScrollControls);
        }

        if (dashboardPreviewFolderButton) {
            dashboardPreviewFolderButton.addEventListener("click", function () {
                openFolderPicker({
                    currentFolderId: dashboardPreviewFolderButton.dataset.folderId || "",
                    onConfirm: updateDashboardPreviewFolder
                });
            });
        }

        if (dashboardPreviewLinkButton) {
            dashboardPreviewLinkButton.addEventListener("click", function () {
                openReportLinkPicker({
                    currentReportId: dashboardPreviewReportId,
                    selectedReportId: dashboardPreviewLinkButton.dataset.linkedReportId || "",
                    onConfirm: updateDashboardPreviewLink
                });
            });
        }

        if (dashboardPreviewShareButton) {
            dashboardPreviewShareButton.addEventListener("click", function () {
                openDashboardPreviewSharePicker();
            });
        }

        if (dashboardPreviewShareText) {
            dashboardPreviewShareText.addEventListener("click", function (event) {
                event.stopPropagation();
                toggleDashboardPreviewSharesDropdown();
            });
        }

        document.querySelectorAll(".folder-tree").forEach(function (tree) {
            initializeFolderTreeState(tree);
            refreshFolderTreeVisibility(tree);
        });

        setFolderSearchMode("folders");
    }

    function handleEditorHistoryShortcut(event) {
        var key = (event.key || "").toLowerCase();
        var hasModifier = event.ctrlKey || event.metaKey;
        var target = event.target && event.target.closest ? event.target : null;
        var activeElement = document.activeElement && document.activeElement.closest ? document.activeElement : null;
        var editorRootElement = editorRoot || document.querySelector("[data-editor-root]");
        var isTextControl = target && target.closest("input, select, textarea");
        var isInsideEditor;

        if (!editorRootElement || !hasModifier) {
            return;
        }

        if (isTextControl && !target.closest("[data-editable-page]")) {
            return;
        }

        isInsideEditor = Boolean(
            (target && target.closest("[data-editor-root]")) ||
            (activeElement && activeElement.closest("[data-editor-root]")) ||
            isEditorSelectionActive()
        );

        if (!isInsideEditor) {
            return;
        }

        if (key === "z" && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            undoEditor();
            return;
        }

        if ((key === "z" && event.shiftKey) || key === "y") {
            event.preventDefault();
            event.stopPropagation();
            redoEditor();
        }
    }

    function collectFoldersFromDom() {
        var folders = {};

        document.querySelectorAll("[data-folder-id][data-folder-name]").forEach(function (item) {
            if (!item.dataset.folderId) {
                return;
            }

            folders[item.dataset.folderId] = {
                id: item.dataset.folderId,
                name: item.dataset.folderName,
                parent_id: item.dataset.folderParentId || item.dataset.parentId || ""
            };
        });

        folderState.folders = Object.keys(folders).map(function (id) {
            return normalizeFolder(folders[id]);
        });
        rebuildFolderMaps();
    }

    function normalizeFolder(folder) {
        var parentId = "";

        if (folder && folder.parent_id !== null && typeof folder.parent_id !== "undefined") {
            parentId = String(folder.parent_id);
        }

        return {
            id: folder && folder.id !== null && typeof folder.id !== "undefined" ? String(folder.id) : "",
            name: folder && folder.name ? String(folder.name) : "",
            parent_id: parentId,
            created_at: folder && folder.created_at ? folder.created_at : "",
            updated_at: folder && folder.updated_at ? folder.updated_at : ""
        };
    }

    function rebuildFolderMaps() {
        foldersById = {};

        folderState.folders.forEach(function (folder) {
            if (!folder.id) {
                return;
            }

            foldersById[folder.id] = {
                id: folder.id,
                name: folder.name,
                parent_id: folder.parent_id
            };
        });

        pinnedFolderIds = pinnedFolderIds.filter(function (id) {
            return Boolean(foldersById[String(id)]);
        });
        folderState.pinnedFolderIds = pinnedFolderIds.slice();
    }

    function addFolderToState(folder) {
        var normalizedFolder = normalizeFolder(folder);
        var replaced = false;

        if (!normalizedFolder.id) {
            return;
        }

        folderState.folders = folderState.folders.map(function (existingFolder) {
            if (String(existingFolder.id) === String(normalizedFolder.id)) {
                replaced = true;
                return normalizedFolder;
            }

            return existingFolder;
        });

        if (!replaced) {
            folderState.folders.push(normalizedFolder);
        }

        rebuildFolderMaps();
    }

    function refreshFoldersFromApi() {
        return fetch("/api/folders")
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Не удалось обновить список папок");
                    }

                    folderState.folders = (data.folders || []).map(normalizeFolder);
                    rebuildFolderMaps();
                    renderAllFolderTrees();
                    renderPinnedFolders();
                    updateFolderReportList(selectedAllReportsFolderId);

                    return data.folders || [];
                });
            });
    }

    function bindFolderTreeControls(scope) {
        var root = scope || document;

        root.querySelectorAll("[data-folder-toggle]").forEach(function (button) {
            if (button.dataset.folderControlBound === "true") {
                return;
            }

            button.dataset.folderControlBound = "true";
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                toggleFolderBranch(button.closest("[data-folder-tree-item], [data-folder-row]"));
            });
        });

        root.querySelectorAll("[data-folder-select]").forEach(function (button) {
            if (button.dataset.folderControlBound === "true") {
                return;
            }

            button.dataset.folderControlBound = "true";
            button.addEventListener("click", function () {
                selectedAllReportsFolderId = button.dataset.folderId || "";
                folderState.selectedFolderId = selectedAllReportsFolderId;
                markFolderTreeSelection("[data-folder-select]", selectedAllReportsFolderId);
                updateFolderReportList(selectedAllReportsFolderId);
            });
        });

        root.querySelectorAll("[data-pin-folder-option]").forEach(function (button) {
            if (button.dataset.folderControlBound === "true") {
                return;
            }

            button.dataset.folderControlBound = "true";
            button.addEventListener("click", function (event) {
                if (event.target.closest(".folder-tree-caret") && button.dataset.folderHasChildren === "true") {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleFolderBranch(button);
                    return;
                }

                selectedPinFolderId = button.dataset.folderId || "";
                markFolderTreeSelection("[data-pin-folder-option]", selectedPinFolderId);
            });
        });

        root.querySelectorAll("[data-folder-picker-select]").forEach(function (button) {
            if (button.dataset.folderControlBound === "true") {
                return;
            }

            button.dataset.folderControlBound = "true";
            button.addEventListener("click", function (event) {
                var row = event.target.closest("[data-folder-row], [data-folder-tree-item]");

                event.stopPropagation();

                if (!row || event.target.closest("[data-folder-toggle], [data-create-subfolder]")) {
                    return;
                }

                folderPickerState.selectedFolderId = row.dataset.folderId || "";
                markFolderPickerSelection(folderPickerState.selectedFolderId);
            });
        });

        root.querySelectorAll("[data-create-folder]").forEach(function (button) {
            if (button.dataset.folderControlBound === "true") {
                return;
            }

            button.dataset.folderControlBound = "true";
            button.addEventListener("click", function (event) {
                event.preventDefault();
                createFolderFromPrompt();
            });
        });

        root.querySelectorAll("[data-create-subfolder]").forEach(function (button) {
            if (button.dataset.folderControlBound === "true") {
                return;
            }

            button.dataset.folderControlBound = "true";
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                createFolderFromPrompt(button.dataset.folderId || "", button.dataset.folderName || "");
            });
        });
    }

    function loadPinnedFolders() {
        try {
            return JSON.parse(window.localStorage.getItem("dashboardPinnedFolders") || "[]").filter(function (id) {
                return Boolean(foldersById[id]);
            });
        } catch (error) {
            return [];
        }
    }

    function savePinnedFolders() {
        folderState.pinnedFolderIds = pinnedFolderIds.slice();
        window.localStorage.setItem("dashboardPinnedFolders", JSON.stringify(pinnedFolderIds));
    }

    function renderPinnedFolders() {
        if (!pinnedFolderStrip) {
            return;
        }

        pinnedFolderStrip.innerHTML = "";

        pinnedFolderIds.forEach(function (folderId) {
            var folder = foldersById[folderId];

            if (!folder) {
                return;
            }

            var button = document.createElement("button");
            var icon = document.createElement("span");
            var divider = document.createElement("span");
            var name = document.createElement("span");

            button.type = "button";
            button.className = "pinned-folder-button";
            button.dataset.pinnedFolderId = folderId;
            button.title = folder.name;
            button.classList.toggle("is-active", activeFolderFilter === folderId);

            icon.className = "pinned-folder-icon";
            icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"></path></svg>';
            divider.className = "pinned-folder-divider";
            name.className = "pinned-folder-name";
            name.textContent = truncatePinnedFolderName(folder.name);

            button.appendChild(icon);
            button.appendChild(divider);
            button.appendChild(name);
            pinnedFolderStrip.appendChild(button);
        });

        updatePinnedScrollControls();
        window.setTimeout(updatePinnedScrollControls, 80);
    }

    function truncatePinnedFolderName(name) {
        var text = name || "";

        if (text.length <= 30) {
            return text;
        }

        return text.slice(0, 29) + "…";
    }

    function scrollPinnedFolders(direction) {
        if (!pinnedFolderStrip) {
            return;
        }

        var distance = Math.max(180, Math.floor(pinnedFolderStrip.clientWidth * 0.7));
        var offset = direction === "left" ? -distance : distance;
        pinnedFolderStrip.scrollBy({ left: offset, behavior: "smooth" });
        window.setTimeout(updatePinnedScrollControls, 260);
    }

    function updatePinnedScrollControls() {
        if (!pinnedFolderStrip || !pinnedFolderScrollButtons.length) {
            return;
        }

        var maxScroll = pinnedFolderStrip.scrollWidth - pinnedFolderStrip.clientWidth;
        var canScroll = maxScroll > 2;
        var atStart = pinnedFolderStrip.scrollLeft <= 2;
        var atEnd = pinnedFolderStrip.scrollLeft >= maxScroll - 2;

        pinnedFolderScrollButtons.forEach(function (button) {
            var direction = button.dataset.pinnedScroll;
            var shouldShow = canScroll && ((direction === "left" && !atStart) || (direction === "right" && !atEnd));
            button.hidden = !shouldShow;
        });
    }

    function setFolderFilter(folderId) {
        activeFolderFilter = folderId || "";
        folderState.activeFilterFolderId = activeFolderFilter;
        filterReportCards(currentSearchQuery);
        updateFolderToolbarState();
    }

    function updateFolderToolbarState() {
        if (folderResetButton) {
            folderResetButton.classList.toggle("is-active", !activeFolderFilter);
        }

        document.querySelectorAll("[data-pinned-folder-id]").forEach(function (button) {
            button.classList.toggle("is-active", button.dataset.pinnedFolderId === activeFolderFilter);
        });

        updatePinnedScrollControls();
    }

    function setFolderSearchMode(mode) {
        folderSearchMode = mode === "reports" ? "reports" : "folders";

        if (folderSearchModeMenu) {
            folderSearchModeMenu.hidden = true;
        }

        folderSearchModeOptions.forEach(function (button) {
            button.classList.toggle("is-active", button.dataset.searchMode === folderSearchMode);
        });

        if (folderSearchInput) {
            folderSearchInput.value = "";
            folderSearchInput.placeholder = folderSearchMode === "reports" ? "Поиск отчетов в папке" : "Поиск папок";
        }

        if (folderSearchModeIcon) {
            folderSearchModeIcon.innerHTML = folderSearchMode === "reports" ? getReportSearchModeIcon() : getFolderSearchModeIcon();
        }

        currentFolderSearchQuery = "";
        currentFolderReportQuery = "";

        document.querySelectorAll("[data-folder-tree]").forEach(function (tree) {
            tree.querySelectorAll(".folder-tree-item").forEach(function (item) {
                item.classList.remove("is-filtered-out", "is-search-match");
            });
            tree.dataset.searchActive = "";
            refreshFolderTreeVisibility(tree);
        });

        updateFolderReportList(selectedAllReportsFolderId);
    }

    function handleFolderSearchInput() {
        if (!folderSearchInput) {
            return;
        }

        if (folderSearchMode === "reports") {
            currentFolderReportQuery = folderSearchInput.value.trim().toLowerCase();
            updateFolderReportList(selectedAllReportsFolderId);
            return;
        }

        currentFolderSearchQuery = folderSearchInput.value.trim().toLowerCase();
        filterFolderTree(folderSearchInput);
    }

    function getFolderSearchModeIcon() {
        return '<svg class="search-mode-composite-icon" viewBox="0 0 32 32" aria-hidden="true"><path class="search-mode-main" d="M4 11.3A3.3 3.3 0 0 1 7.3 8h6.3l2.1 3h9A3.3 3.3 0 0 1 28 14.3v8.4a3.3 3.3 0 0 1-3.3 3.3H7.3A3.3 3.3 0 0 1 4 22.7Z"></path><circle class="search-mode-loupe-lens" cx="23.2" cy="23.1" r="3.7"></circle><path class="search-mode-loupe-handle" d="M26 25.9l3 3"></path></svg>';
    }

    function getReportSearchModeIcon() {
        return '<svg class="search-mode-composite-icon" viewBox="0 0 32 32" aria-hidden="true"><path class="search-mode-main" d="M8 5h10.2L24 10.8V26H8Z"></path><path class="search-mode-fold" d="M18.2 5v6.2H24"></path><circle class="search-mode-loupe-lens" cx="23.2" cy="23.1" r="3.7"></circle><path class="search-mode-loupe-handle" d="M26 25.9l3 3"></path></svg>';
    }

    function filterFolderTree(input) {
        var query = input.value.trim().toLowerCase();
        var tree = input.closest(".modal").querySelector(".folder-tree");

        if (!tree) {
            return;
        }

        var items = Array.prototype.slice.call(tree.querySelectorAll(".folder-tree-item"));
        var itemsById = {};
        var visibleIds = {};

        items.forEach(function (item) {
            var id = item.dataset.folderId || "";

            if (id) {
                itemsById[id] = item;
            }
        });

        items.forEach(function (item) {
            var name = (item.dataset.folderName || "").toLowerCase();
            var isMatch = Boolean(query) && name.indexOf(query) !== -1;
            var parentId = item.dataset.folderParentId || "";

            if (isMatch) {
                visibleIds[item.dataset.folderId || ""] = true;
                item.classList.add("is-search-match");
            } else {
                item.classList.remove("is-search-match");
            }

            while (isMatch && parentId) {
                visibleIds[parentId] = true;
                parentId = itemsById[parentId] ? itemsById[parentId].dataset.folderParentId || "" : "";
            }
        });

        items.forEach(function (item) {
            var id = item.dataset.folderId || "";
            item.classList.toggle("is-filtered-out", Boolean(query) && !visibleIds[id]);
        });

        if (query) {
            var treeExpandedFolderIds = getExpandedFolderIds(tree);

            Object.keys(visibleIds).forEach(function (id) {
                if (itemsById[id] && itemsById[id].dataset.folderHasChildren === "true") {
                    treeExpandedFolderIds.add(String(id));
                    folderState.expandedFolderIds.add(String(id));
                }
            });
        }

        tree.dataset.searchActive = query ? "true" : "";
        refreshFolderTreeVisibility(tree);
    }

    function renderAllFolderTrees() {
        document.querySelectorAll("[data-folder-tree], [data-pin-folder-tree], [data-folder-picker-tree]").forEach(function (tree) {
            renderFolderTree(tree);
        });

        bindFolderTreeControls(document);

        if (folderSearchInput && folderSearchMode === "folders" && folderSearchInput.value.trim()) {
            filterFolderTree(folderSearchInput);
        }

        document.querySelectorAll("[data-pin-folder-search]").forEach(function (input) {
            if (input.value.trim()) {
                filterFolderTree(input);
            }
        });

        if (folderPickerSearch && folderPickerSearch.value.trim()) {
            filterFolderTree(folderPickerSearch);
        }

        markFolderTreeSelection("[data-folder-select]", selectedAllReportsFolderId);
        markFolderTreeSelection("[data-pin-folder-option]", selectedPinFolderId);
        markFolderPickerSelection(folderPickerState.selectedFolderId);
    }

    function renderFolderTree(tree) {
        var isPickerTree = tree.hasAttribute("data-folder-picker-tree");
        var isPinTree = tree.hasAttribute("data-pin-folder-tree");
        var foldersByParent = getFoldersByParent();
        var rootFolders = foldersByParent[""] || [];

        tree.innerHTML = "";
        tree._expandedFolderIds = new Set(folderState.expandedFolderIds);

        if (isPickerTree) {
            tree.appendChild(createFolderPickerNoneRow());
        }

        if (!rootFolders.length) {
            tree.appendChild(createFolderEmptyState(isPinTree ? "Сначала создайте папку в окне “Все отчеты”" : "Папки еще не созданы"));
            refreshFolderTreeVisibility(tree);
            return;
        }

        function appendFolder(folder, depth) {
            var children = foldersByParent[folder.id] || [];

            tree.appendChild(createFolderTreeRow(folder, depth, children.length > 0, {
                picker: isPickerTree,
                pin: isPinTree
            }));

            children.forEach(function (childFolder) {
                appendFolder(childFolder, depth + 1);
            });
        }

        rootFolders.forEach(function (folder) {
            appendFolder(folder, 0);
        });

        refreshFolderTreeVisibility(tree);
    }

    function getFoldersByParent() {
        var groups = {};

        folderState.folders.slice().sort(sortByName).forEach(function (folder) {
            var parentKey = folder.parent_id ? String(folder.parent_id) : "";
            groups[parentKey] = groups[parentKey] || [];
            groups[parentKey].push(folder);
        });

        return groups;
    }

    function createFolderTreeRow(folder, depth, hasChildren, options) {
        var row = options.pin ? document.createElement("button") : document.createElement("div");
        var isExpanded = folderState.expandedFolderIds.has(String(folder.id));

        row.className = "folder-tree-item" + (hasChildren && !isExpanded ? " is-collapsed" : "");
        row.style.setProperty("--folder-level", depth);
        row.dataset.folderRow = "";
        row.dataset.folderTreeItem = "";
        row.dataset.folderId = folder.id;
        row.dataset.parentId = folder.parent_id || "";
        row.dataset.folderParentId = folder.parent_id || "";
        row.dataset.folderName = folder.name;
        row.dataset.folderHasChildren = hasChildren ? "true" : "false";

        if (options.picker) {
            row.dataset.folderPickerSelect = "";
        }

        if (options.pin) {
            row.type = "button";
            row.dataset.pinFolderOption = "";
            row.appendChild(createFolderCaret(hasChildren));
            row.appendChild(createFolderName(folder.name));
            return row;
        }

        row.appendChild(createFolderToggle(hasChildren));
        row.appendChild(createFolderMainButton(folder, options.picker));
        row.appendChild(createSubfolderButton(folder));

        return row;
    }

    function createFolderPickerNoneRow() {
        var row = document.createElement("div");
        var placeholder = document.createElement("span");
        var main = document.createElement("button");
        var spacer = document.createElement("span");

        row.className = "folder-tree-item folder-picker-none-option";
        row.dataset.folderRow = "";
        row.dataset.folderTreeItem = "";
        row.dataset.folderPickerSelect = "";
        row.dataset.folderId = "";
        row.dataset.parentId = "";
        row.dataset.folderParentId = "";
        row.dataset.folderName = "Без папки";
        row.dataset.folderHasChildren = "false";

        placeholder.className = "folder-tree-toggle is-placeholder";
        placeholder.setAttribute("aria-hidden", "true");

        main.className = "folder-tree-main";
        main.type = "button";
        main.dataset.folderPickerSelect = "";
        main.appendChild(createFolderName("Без папки"));

        spacer.className = "folder-subfolder-button is-placeholder";
        spacer.setAttribute("aria-hidden", "true");

        row.appendChild(placeholder);
        row.appendChild(main);
        row.appendChild(spacer);

        return row;
    }

    function createFolderToggle(hasChildren) {
        var button = document.createElement("button");

        button.className = "folder-tree-toggle" + (hasChildren ? "" : " is-placeholder");
        button.type = "button";
        button.dataset.folderToggle = "";
        button.setAttribute("aria-label", "Раскрыть папку");

        if (!hasChildren) {
            button.disabled = true;
            button.setAttribute("aria-hidden", "true");
        }

        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5l5-5"></path></svg>';
        return button;
    }

    function createFolderMainButton(folder, isPicker) {
        var button = document.createElement("button");

        button.className = "folder-tree-main";
        button.type = "button";
        button.dataset.folderId = folder.id;
        button.dataset.folderParentId = folder.parent_id || "";
        button.dataset.folderName = folder.name;
        button.dataset.folderHasChildren = hasFolderChildren(folder.id) ? "true" : "false";

        if (isPicker) {
            button.dataset.folderPickerSelect = "";
        } else {
            button.dataset.folderSelect = "";
        }

        button.appendChild(createFolderName(folder.name));
        return button;
    }

    function createFolderName(name) {
        var label = document.createElement("span");
        label.className = "folder-tree-name";
        label.textContent = name || "Папка";
        return label;
    }

    function createSubfolderButton(folder) {
        var button = document.createElement("button");

        button.className = "folder-subfolder-button";
        button.type = "button";
        button.dataset.createSubfolder = "";
        button.dataset.folderId = folder.id;
        button.dataset.folderName = folder.name;
        button.setAttribute("aria-label", "Добавить подпапку");
        button.textContent = "+";

        return button;
    }

    function createFolderCaret(hasChildren) {
        var caret = document.createElement("span");
        caret.className = "folder-tree-caret";
        caret.setAttribute("aria-hidden", "true");
        caret.textContent = hasChildren ? "▾" : "";
        return caret;
    }

    function createFolderEmptyState(text) {
        var empty = document.createElement("div");
        empty.className = "folder-empty-state";
        empty.textContent = text;
        return empty;
    }

    function hasFolderChildren(folderId) {
        var normalizedFolderId = String(folderId || "");

        return folderState.folders.some(function (folder) {
            return String(folder.parent_id || "") === normalizedFolderId;
        });
    }

    function initializeFolderTreeState(tree) {
        if (!tree) {
            return;
        }

        var treeExpandedFolderIds = getExpandedFolderIds(tree);
        treeExpandedFolderIds.clear();

        getFolderRows(tree).forEach(function (row) {
            if (row.dataset.folderHasChildren === "true" && !row.classList.contains("is-collapsed")) {
                treeExpandedFolderIds.add(String(getFolderId(row)));
                folderState.expandedFolderIds.add(String(getFolderId(row)));
            }
        });
    }

    function getExpandedFolderIds(tree) {
        if (!tree._expandedFolderIds) {
            tree._expandedFolderIds = new Set();
        }

        return tree._expandedFolderIds;
    }

    function getFolderRows(tree) {
        var scope = tree || document;

        return Array.prototype.slice.call(scope.querySelectorAll("[data-folder-row], [data-folder-tree-item]"));
    }

    function getFolderId(row) {
        return row ? String(row.dataset.folderId || "") : "";
    }

    function getParentId(row) {
        return row ? String(row.dataset.parentId || row.dataset.folderParentId || "") : "";
    }

    function getChildrenRows(folderId, tree) {
        var normalizedFolderId = String(folderId || "");

        return getFolderRows(tree).filter(function (row) {
            return getParentId(row) === normalizedFolderId;
        });
    }

    function getDescendantIds(folderId, tree) {
        var result = [];

        function collect(parentId) {
            getChildrenRows(parentId, tree).forEach(function (childRow) {
                var childId = getFolderId(childRow);

                if (!childId) {
                    return;
                }

                result.push(childId);
                collect(childId);
            });
        }

        collect(folderId);
        return result;
    }

    function collapseFolder(folderId, tree) {
        var treeExpandedFolderIds = getExpandedFolderIds(tree);
        var normalizedFolderId = String(folderId || "");

        treeExpandedFolderIds.delete(normalizedFolderId);
        folderState.expandedFolderIds.delete(normalizedFolderId);
        getDescendantIds(normalizedFolderId, tree).forEach(function (descendantId) {
            treeExpandedFolderIds.delete(String(descendantId));
            folderState.expandedFolderIds.delete(String(descendantId));
        });

        updateFolderTreeVisibility(tree);
    }

    function expandFolder(folderId, tree) {
        var normalizedFolderId = String(folderId || "");

        getExpandedFolderIds(tree).add(normalizedFolderId);
        folderState.expandedFolderIds.add(normalizedFolderId);
        updateFolderTreeVisibility(tree);
    }

    function updateFolderTreeVisibility(tree) {
        refreshFolderTreeVisibility(tree);
    }

    function toggleFolderBranch(item) {
        if (!item) {
            return;
        }

        var tree = item.closest(".folder-tree");
        var folderId = getFolderId(item);

        if (!tree || !folderId || item.dataset.folderHasChildren !== "true") {
            return;
        }

        if (getExpandedFolderIds(tree).has(String(folderId))) {
            collapseFolder(folderId, tree);
        } else {
            expandFolder(folderId, tree);
        }
    }

    function refreshFolderTreeVisibility(tree) {
        var itemsById = {};

        if (!tree) {
            return;
        }

        var treeExpandedFolderIds = getExpandedFolderIds(tree);

        getFolderRows(tree).forEach(function (item) {
            var folderId = getFolderId(item);

            if (folderId) {
                itemsById[folderId] = item;
            }
        });

        getFolderRows(tree).forEach(function (item) {
            var folderId = getFolderId(item);
            var parentId = getParentId(item);
            var hasCollapsedParent = false;

            while (parentId) {
                if (!treeExpandedFolderIds.has(String(parentId))) {
                    hasCollapsedParent = true;
                    break;
                }

                parentId = itemsById[parentId] ? getParentId(itemsById[parentId]) : "";
            }

            item.hidden = false;
            item.classList.toggle("is-hidden", item.classList.contains("is-filtered-out") || hasCollapsedParent);
            item.classList.toggle("is-collapsed", item.dataset.folderHasChildren === "true" && !treeExpandedFolderIds.has(String(folderId)));
        });

        updateFolderToggleIcons(tree);
    }

    function updateFolderToggleIcons(tree) {
        if (!tree) {
            return;
        }

        var treeExpandedFolderIds = getExpandedFolderIds(tree);

        tree.querySelectorAll("[data-folder-toggle], .folder-tree-caret").forEach(function (toggle) {
            var row = toggle.closest("[data-folder-row], [data-folder-tree-item]");

            if (!row) {
                return;
            }

            var folderId = getFolderId(row);
            var isExpanded = Boolean(folderId) && treeExpandedFolderIds.has(String(folderId));

            toggle.classList.toggle("is-expanded", isExpanded);
            toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        });
    }

    function markFolderTreeSelection(selector, folderId) {
        document.querySelectorAll(selector).forEach(function (item) {
            var isSelected = item.dataset.folderId === folderId;
            var row = item.closest("[data-folder-tree-item]");

            item.classList.toggle("is-selected", isSelected);

            if (row) {
                row.classList.toggle("is-selected", isSelected);
            }
        });
    }

    function updateFolderReportList(folderId) {
        var normalizedFolderId = String(folderId || "");
        var visibleRows = 0;
        var folderName = normalizedFolderId && foldersById[normalizedFolderId] ? foldersById[normalizedFolderId].name : "";

        folderReportRows.forEach(function (row) {
            var rowFolderId = String(row.dataset.folderId || "");
            var title = (row.dataset.reportTitle || "").toLowerCase();
            var tag = (row.dataset.reportTag || "").toLowerCase();
            var type = (row.dataset.reportType || "").toLowerCase();
            var matchesFolder = !normalizedFolderId || rowFolderId === normalizedFolderId;
            var matchesReportQuery = !currentFolderReportQuery || title.indexOf(currentFolderReportQuery) !== -1 || tag.indexOf(currentFolderReportQuery) !== -1 || type.indexOf(currentFolderReportQuery) !== -1;
            var isVisible = matchesFolder && matchesReportQuery;
            row.hidden = !isVisible;

            if (isVisible) {
                visibleRows += 1;
            }
        });

        if (folderReportCaption) {
            if (folderSearchMode === "reports" && currentFolderReportQuery) {
                folderReportCaption.textContent = folderName ? "Поиск по отчетам в папке: " + folderName : "Поиск по всем отчетам";
            } else {
                folderReportCaption.textContent = folderName ? "Отчеты в папке: " + folderName : "Выберите папку слева или просмотрите все отчеты.";
            }
        }

        if (folderReportEmpty) {
            folderReportEmpty.hidden = visibleRows > 0;
        }
    }

    function createFolderFromPrompt(parentId, parentName) {
        var targetParentId = parentId || "";
        var promptText = targetParentId && parentName ? "Название подпапки для “" + parentName + "”" : "Название новой папки";
        var name = window.prompt(promptText);

        if (name === null) {
            return;
        }

        if (!name.trim()) {
            showToast("Введите название папки", "warning");
            return;
        }

        fetch("/api/folders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name.trim(),
                parent_id: targetParentId || null
            })
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Не удалось создать папку");
                    }

                    return data;
                });
            })
            .then(function (data) {
                var createdFolder = data.folder || {};
                var createdParentId = createdFolder.parent_id !== null && typeof createdFolder.parent_id !== "undefined" ? String(createdFolder.parent_id) : "";

                addFolderToState(createdFolder);

                if (createdParentId) {
                    folderState.expandedFolderIds.add(createdParentId);
                }

                reportLinkPickerState.loaded = false;

                return refreshFoldersFromApi().catch(function () {
                    renderAllFolderTrees();
                    renderPinnedFolders();
                });
            })
            .then(function () {
                showToast("Папка создана", "success");
            })
            .catch(function (error) {
                showToast(error.message, "error");
            });
    }

    function pinSelectedFolder() {
        if (!selectedPinFolderId) {
            showToast("Выберите папку", "warning");
            return;
        }

        if (pinnedFolderIds.indexOf(selectedPinFolderId) !== -1) {
            showToast("Папка уже закреплена", "warning");
            return;
        }

        if (pinnedFolderIds.length >= PINNED_FOLDER_LIMIT) {
            showToast("Можно закрепить не больше 20 папок", "warning");
            return;
        }

        pinnedFolderIds.push(selectedPinFolderId);
        savePinnedFolders();
        renderPinnedFolders();
        closeModal(pinFolderModal);
        showToast("Папка закреплена", "success");
    }

    function openFolderPicker(options) {
        var tree = folderPickerModal ? folderPickerModal.querySelector("[data-folder-picker-tree]") : null;

        if (!folderPickerModal || !tree) {
            return;
        }

        folderPickerState.selectedFolderId = options && options.currentFolderId ? String(options.currentFolderId) : "";
        folderPickerState.onConfirm = options && typeof options.onConfirm === "function" ? options.onConfirm : null;

        if (folderPickerSearch) {
            folderPickerSearch.value = "";
        }

        tree.querySelectorAll(".folder-tree-item").forEach(function (item) {
            item.classList.remove("is-filtered-out", "is-search-match");
        });
        tree.dataset.searchActive = "";

        expandAncestorsForFolder(folderPickerState.selectedFolderId, tree);
        markFolderPickerSelection(folderPickerState.selectedFolderId);
        refreshFolderTreeVisibility(tree);
        openModal(folderPickerModal);
    }

    function markFolderPickerSelection(folderId) {
        var normalizedFolderId = String(folderId || "");

        document.querySelectorAll("[data-folder-picker-tree] [data-folder-row]").forEach(function (row) {
            row.classList.toggle("is-selected", String(row.dataset.folderId || "") === normalizedFolderId);
        });
    }

    function expandAncestorsForFolder(folderId, tree) {
        var normalizedFolderId = String(folderId || "");
        var row = normalizedFolderId ? tree.querySelector('[data-folder-row][data-folder-id="' + normalizedFolderId + '"]') : null;
        var treeExpandedFolderIds = getExpandedFolderIds(tree);

        while (row && getParentId(row)) {
            var parentId = getParentId(row);

            treeExpandedFolderIds.add(String(parentId));
            folderState.expandedFolderIds.add(String(parentId));
            row = tree.querySelector('[data-folder-row][data-folder-id="' + parentId + '"]');
        }
    }

    function confirmFolderPicker() {
        if (folderPickerState.onConfirm) {
            folderPickerState.onConfirm(folderPickerState.selectedFolderId);
        }

        closeModal(folderPickerModal);
    }

    function getFolderNameById(folderId) {
        var normalizedFolderId = String(folderId || "");

        return normalizedFolderId && foldersById[normalizedFolderId] ? foldersById[normalizedFolderId].name : "";
    }

    function updateCreateFolderSelection(folderId) {
        createSelectedFolderId = String(folderId || "");

        if (createFolderIdInput) {
            createFolderIdInput.value = createSelectedFolderId;
        }

        if (createFolderLabel) {
            createFolderLabel.textContent = createSelectedFolderId ? getFolderNameById(createSelectedFolderId) || "Папка" : "Добавить в";
        }
    }

    function updateDashboardPreviewFolderDisplay(folderId, folderName) {
        var normalizedFolderId = String(folderId || "");
        var resolvedFolderName = folderName || getFolderNameById(normalizedFolderId) || "Без папки";

        if (dashboardPreviewFolderButton) {
            dashboardPreviewFolderButton.dataset.folderId = normalizedFolderId;
        }

        if (dashboardPreviewFolderText) {
            dashboardPreviewFolderText.textContent = "Папка: " + (normalizedFolderId ? resolvedFolderName : "Без папки");
        }
    }

    function openReportLinkPicker(options) {
        if (!reportLinkPickerModal || !reportLinkTree) {
            return;
        }

        reportLinkPickerState.currentReportId = options && options.currentReportId ? String(options.currentReportId) : null;
        reportLinkPickerState.selectedReportId = options && options.selectedReportId ? String(options.selectedReportId) : "";
        reportLinkPickerState.onConfirm = options && typeof options.onConfirm === "function" ? options.onConfirm : null;

        if (reportLinkSearch) {
            reportLinkSearch.value = "";
        }

        openModal(reportLinkPickerModal);
        loadReportLinkTree().then(renderReportLinkTree).catch(function (error) {
            showToast(error.message, "error");
        });
    }

    function loadReportLinkTree() {
        if (reportLinkPickerState.loaded) {
            return Promise.resolve();
        }

        return fetch("/api/reports/link-tree")
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Не удалось загрузить список отчетов");
                    }

                    reportLinkPickerState.folders = data.folders || [];
                    reportLinkPickerState.reports = data.reports || [];
                    reportLinkPickerState.loaded = true;
                });
            });
    }

    function renderReportLinkTree() {
        if (!reportLinkTree) {
            return;
        }

        var query = reportLinkSearch ? reportLinkSearch.value.trim().toLowerCase() : "";
        var folders = reportLinkPickerState.folders.slice().sort(sortByName);
        var reports = reportLinkPickerState.reports.filter(function (report) {
            if (reportLinkPickerState.currentReportId && String(report.id) === String(reportLinkPickerState.currentReportId)) {
                return false;
            }

            return !query || (report.title || "").toLowerCase().indexOf(query) !== -1;
        }).sort(sortReportsByTitle);
        var foldersByParent = {};
        var reportsByFolder = {};
        var hasAnyReport = false;

        folders.forEach(function (folder) {
            var parentKey = folder.parent_id ? String(folder.parent_id) : "";
            foldersByParent[parentKey] = foldersByParent[parentKey] || [];
            foldersByParent[parentKey].push(folder);
        });

        reports.forEach(function (report) {
            var folderKey = report.folder_id ? String(report.folder_id) : "";
            reportsByFolder[folderKey] = reportsByFolder[folderKey] || [];
            reportsByFolder[folderKey].push(report);
        });

        if (query) {
            folders.forEach(function (folder) {
                if (folderHasVisibleLinkContent(String(folder.id), foldersByParent, reportsByFolder)) {
                    reportLinkPickerState.expandedFolderIds.add(String(folder.id));
                }
            });
        }

        reportLinkTree.innerHTML = "";
        reportLinkTree.appendChild(createReportLinkNoneRow());

        function appendFolder(folder, depth) {
            var folderId = String(folder.id);
            var childFolders = foldersByParent[folderId] || [];
            var childReports = reportsByFolder[folderId] || [];
            var hasVisibleChildren = childFolders.some(function (child) {
                return folderHasVisibleLinkContent(String(child.id), foldersByParent, reportsByFolder);
            }) || childReports.length > 0;

            if (!hasVisibleChildren) {
                return;
            }

            reportLinkTree.appendChild(createReportLinkFolderRow(folder, depth, hasVisibleChildren));

            if (!reportLinkPickerState.expandedFolderIds.has(folderId)) {
                return;
            }

            childFolders.forEach(function (childFolder) {
                appendFolder(childFolder, depth + 1);
            });

            childReports.forEach(function (report) {
                hasAnyReport = true;
                reportLinkTree.appendChild(createReportLinkReportRow(report, depth + 1));
            });
        }

        (foldersByParent[""] || []).forEach(function (folder) {
            appendFolder(folder, 0);
        });

        (reportsByFolder[""] || []).forEach(function (report) {
            hasAnyReport = true;
            reportLinkTree.appendChild(createReportLinkReportRow(report, 0));
        });

        if (!hasAnyReport) {
            var empty = document.createElement("div");
            empty.className = "report-link-empty";
            empty.textContent = query ? "Подходящие отчеты не найдены" : "Отчетов для связи пока нет";
            reportLinkTree.appendChild(empty);
        }

        markReportLinkSelection();
    }

    function folderHasVisibleLinkContent(folderId, foldersByParent, reportsByFolder) {
        var childFolders = foldersByParent[folderId] || [];

        if ((reportsByFolder[folderId] || []).length > 0) {
            return true;
        }

        return childFolders.some(function (childFolder) {
            return folderHasVisibleLinkContent(String(childFolder.id), foldersByParent, reportsByFolder);
        });
    }

    function createReportLinkNoneRow() {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "report-link-row report-link-none-option";
        button.dataset.reportLinkNone = "true";
        button.appendChild(createReportLinkSpacer(0));
        button.appendChild(createReportLinkIcon("document"));
        button.appendChild(createReportLinkTitle("Без связи"));
        return button;
    }

    function createReportLinkFolderRow(folder, depth, hasChildren) {
        var row = document.createElement("div");
        var toggle = document.createElement("button");
        var isExpanded = reportLinkPickerState.expandedFolderIds.has(String(folder.id));

        row.className = "report-link-row report-link-folder-row";
        row.title = folder.name || "Папка";
        row.appendChild(createReportLinkSpacer(depth));

        toggle.type = "button";
        toggle.className = "report-link-folder-toggle";
        toggle.dataset.reportLinkFolderToggle = "true";
        toggle.dataset.folderId = String(folder.id);
        toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        toggle.disabled = !hasChildren;
        toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5l5-5"></path></svg>';

        if (isExpanded) {
            toggle.classList.add("is-expanded");
        }

        row.appendChild(toggle);
        row.appendChild(createReportLinkIcon("folder"));
        row.appendChild(createReportLinkTitle(folder.name || "Папка"));
        return row;
    }

    function createReportLinkReportRow(report, depth) {
        var button = document.createElement("button");

        button.type = "button";
        button.className = "report-link-row report-link-report-row";
        button.dataset.reportLinkReport = "true";
        button.dataset.reportId = String(report.id);
        button.dataset.reportTitle = report.title || "";
        button.dataset.reportUrl = report.view_url || "";
        button.title = report.title || "Без названия";
        button.appendChild(createReportLinkSpacer(depth));
        button.appendChild(createReportLinkIcon("document"));
        button.appendChild(createReportLinkTitle(report.title || "Без названия"));
        return button;
    }

    function createReportLinkSpacer(depth) {
        var spacer = document.createElement("span");
        spacer.className = "report-link-row-spacer";
        spacer.style.width = String(Math.max(0, depth) * 18) + "px";
        return spacer;
    }

    function createReportLinkIcon(type) {
        var icon = document.createElement("span");
        icon.className = "report-link-icon report-link-" + type + "-icon";
        icon.innerHTML = type === "folder"
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"></path></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h8l4 4v12H7Z"></path><path d="M15 4v5h5"></path></svg>';
        return icon;
    }

    function createReportLinkTitle(text) {
        var title = document.createElement("span");
        title.className = "report-link-title";
        title.textContent = text;
        title.title = text;
        return title;
    }

    function toggleReportLinkFolder(folderId) {
        var normalizedFolderId = String(folderId || "");

        if (!normalizedFolderId) {
            return;
        }

        if (reportLinkPickerState.expandedFolderIds.has(normalizedFolderId)) {
            reportLinkPickerState.expandedFolderIds.delete(normalizedFolderId);
        } else {
            reportLinkPickerState.expandedFolderIds.add(normalizedFolderId);
        }

        renderReportLinkTree();
    }

    function markReportLinkSelection() {
        if (!reportLinkTree) {
            return;
        }

        reportLinkTree.querySelectorAll(".report-link-row").forEach(function (row) {
            var reportId = row.dataset.reportId || "";
            var isNone = row.dataset.reportLinkNone === "true";
            var isSelected = reportLinkPickerState.selectedReportId
                ? reportId === reportLinkPickerState.selectedReportId
                : isNone;

            row.classList.toggle("is-selected", isSelected);
        });
    }

    function confirmReportLinkPicker() {
        var selectedReport = getLinkPickerSelectedReport();

        if (reportLinkPickerState.onConfirm) {
            reportLinkPickerState.onConfirm(selectedReport);
        }

        closeModal(reportLinkPickerModal);
    }

    function getLinkPickerSelectedReport() {
        if (!reportLinkPickerState.selectedReportId) {
            return null;
        }

        return reportLinkPickerState.reports.filter(function (report) {
            return String(report.id) === String(reportLinkPickerState.selectedReportId);
        })[0] || null;
    }

    function sortByName(a, b) {
        return (a.name || "").localeCompare(b.name || "", "ru");
    }

    function sortReportsByTitle(a, b) {
        return (a.title || "").localeCompare(b.title || "", "ru");
    }

    function updateCreateLinkSelection(report) {
        createSelectedLinkedReportId = report ? String(report.id) : "";

        if (createLinkedReportIdInput) {
            createLinkedReportIdInput.value = createSelectedLinkedReportId;
        }

        if (createLinkEmpty) {
            createLinkEmpty.hidden = Boolean(report);
        }

        if (createLinkSelected) {
            createLinkSelected.hidden = !report;
        }

        if (createLinkLabel) {
            createLinkLabel.textContent = report ? report.title || "Без названия" : "";
        }
    }

    function updateDashboardPreviewLink(report) {
        var linkedReportId = report ? report.id : null;

        if (!dashboardPreviewLinkUpdateUrl) {
            return;
        }

        fetch(dashboardPreviewLinkUpdateUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                linked_report_id: linkedReportId
            })
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Не удалось изменить связь");
                    }

                    return data;
                });
            })
            .then(function (data) {
                updateDashboardPreviewLinkDisplay(data.linked_report_id || "", data.linked_report_title || "", data.linked_report_url || "");
                showToast("Связь обновлена", "success");
            })
            .catch(function (error) {
                showToast(error.message, "error");
            });
    }

    function updateDashboardPreviewLinkDisplay(reportId, reportTitle, reportUrl) {
        var normalizedReportId = String(reportId || "");

        if (dashboardPreviewLinkButton) {
            dashboardPreviewLinkButton.dataset.linkedReportId = normalizedReportId;
        }

        if (!dashboardPreviewLinkText) {
            return;
        }

        dashboardPreviewLinkText.innerHTML = "";
        dashboardPreviewLinkText.appendChild(document.createTextNode("Связан с: "));

        if (!normalizedReportId) {
            dashboardPreviewLinkText.appendChild(document.createTextNode("-"));
            return;
        }

        var link = document.createElement("a");
        link.className = "linked-report-link";
        link.href = reportUrl || "#";
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = reportTitle || "Связанный отчет";
        dashboardPreviewLinkText.appendChild(link);
    }

    function updateDashboardPreviewFolder(folderId) {
        if (!dashboardPreviewFolderUpdateUrl) {
            return;
        }

        fetch(dashboardPreviewFolderUpdateUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                folder_id: folderId || null
            })
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Не удалось изменить папку");
                    }

                    return data;
                });
            })
            .then(function (data) {
                if (activeDashboardPreviewCard) {
                    activeDashboardPreviewCard.dataset.folderId = data.folder_id || "";
                    document.querySelectorAll('[data-folder-report-row][data-report-id="' + activeDashboardPreviewCard.dataset.reportId + '"]').forEach(function (row) {
                        row.dataset.folderId = data.folder_id || "";
                    });
                }

                updateDashboardPreviewFolderDisplay(data.folder_id || "", data.folder_name || "");
                filterReportCards(currentSearchQuery);
                updateFolderReportList(selectedAllReportsFolderId);
                showToast("Данные сохранены", "success");
            })
            .catch(function (error) {
                showToast(error.message, "error");
            });
    }

    function initializeCreateWorkflow() {
        appendDatabaseTemplatesToReportPicker();
        syncTemplateTypeFilterOptions();
        syncCreateTemplateTypeOptions();
        bindTemplateCards();

        if (templateSearch) {
            templateSearch.addEventListener("input", filterTemplates);
        }

        if (templateTypeFilter) {
            templateTypeFilter.addEventListener("change", filterTemplates);
        }

        if (templateBack) {
            templateBack.addEventListener("click", function () {
                if (templatePreview) {
                    templatePreview.hidden = true;
                }

                if (templatePicker) {
                    templatePicker.hidden = false;
                }
            });
        }

        if (importFileInput) {
            importFileInput.addEventListener("change", function () {
                enqueueFiles(importFileInput.files);
                importFileInput.value = "";
            });
        }

        if (importDropzone) {
            ["dragenter", "dragover"].forEach(function (eventName) {
                importDropzone.addEventListener(eventName, function (event) {
                    event.preventDefault();
                    importDropzone.classList.add("is-dragover");
                });
            });

            ["dragleave", "drop"].forEach(function (eventName) {
                importDropzone.addEventListener(eventName, function (event) {
                    event.preventDefault();
                    importDropzone.classList.remove("is-dragover");
                });
            });

            importDropzone.addEventListener("drop", function (event) {
                enqueueFiles(event.dataTransfer.files);
            });
        }

        if (importFileList) {
            importFileList.addEventListener("dragover", handleImportDragOver);
            importFileList.addEventListener("drop", function (event) {
                event.preventDefault();
                clearImportDragging();
                syncImportItemsFromDom();
                updateFileTokens();
            });
        }

        if (createReportForm) {
            createReportForm.addEventListener("submit", submitCreateReport);
        }

        if (createFolderPickerButton) {
            createFolderPickerButton.addEventListener("click", function () {
                openFolderPicker({
                    currentFolderId: createSelectedFolderId,
                    onConfirm: function (folderId) {
                        updateCreateFolderSelection(folderId);
                    }
                });
            });
        }

        if (createLinkPickerButton) {
            createLinkPickerButton.addEventListener("click", function () {
                openReportLinkPicker({
                    currentReportId: null,
                    selectedReportId: createSelectedLinkedReportId,
                    onConfirm: function (report) {
                        updateCreateLinkSelection(report);
                    }
                });
            });
        }

        if (createSharePickerButton) {
            createSharePickerButton.addEventListener("click", function () {
                openCreateReportSharePicker();
            });
        }

        if (createShareEditButton) {
            createShareEditButton.addEventListener("click", function () {
                openCreateReportSharePicker();
            });
        }
    }

    function getTemplateCards() {
        return document.querySelectorAll("[data-template-card]");
    }

    function bindTemplateCards() {
        getTemplateCards().forEach(function (card) {
            if (card.dataset.bound === "true") {
                return;
            }

            card.dataset.bound = "true";
            card.addEventListener("click", function () {
                markTemplateCard(card);
            });

            card.addEventListener("dblclick", function () {
                chooseTemplate(card);
            });
        });
    }

    function appendDatabaseTemplatesToReportPicker() {
        var grid = document.querySelector("[data-template-grid]");

        if (!grid || grid.dataset.databaseTemplatesRendered === "true") {
            return;
        }

        dashboardTemplateMocks.forEach(function (template) {
            grid.appendChild(createReportTemplateCardFromTemplate(template));
        });

        grid.dataset.databaseTemplatesRendered = "true";
    }

    function createReportTemplateCardFromTemplate(template) {
        var button = document.createElement("button");
        var title = document.createElement("strong");
        var type = document.createElement("span");
        var templateType = template.templateType || "Универсальный";
        var templateTag = template.tagTitle || "";

        button.className = "template-card";
        button.type = "button";
        button.dataset.templateCard = "true";
        button.dataset.templateKey = "template:" + String(template.sourceTemplateId || "").trim();
        button.dataset.templateTitle = template.title || "Шаблон";
        button.dataset.templateType = templateType;
        button.dataset.templateDescription = templateTag && templateTag !== templateType
            ? "Пользовательский шаблон · " + templateTag
            : "Пользовательский шаблон";
        button.dataset.templateSource = "database";

        title.textContent = template.title || "Шаблон";
        type.textContent = templateType;
        button.appendChild(title);
        button.appendChild(type);

        return button;
    }

    function syncTemplateTypeFilterOptions() {
        var optionRows;

        if (!templateTypeFilter) {
            return;
        }

        optionRows = [{ value: "all", label: "Все типы" }];
        Array.prototype.forEach.call(templateTypeFilter.options || [], function (option) {
            if (option.value !== "all") {
                appendSelectOptionRow(optionRows, option.value, option.textContent || option.value);
            }
        });

        getTemplateTaxonomyNames("types").forEach(function (name) {
            appendSelectOptionRow(optionRows, name, name);
        });

        getTemplateCards().forEach(function (card) {
            if (card.dataset.templateType) {
                appendSelectOptionRow(optionRows, card.dataset.templateType, card.dataset.templateType);
            }
        });

        replaceSelectOptions(templateTypeFilter, optionRows, "all");
    }

    function syncCreateTemplateTypeOptions() {
        var currentValue;
        var optionRows = [];

        if (!createTemplateType) {
            return;
        }

        currentValue = createTemplateType.value || templateCreateState.type || "Универсальный";

        getTemplateTaxonomyNames("types").forEach(function (name) {
            appendSelectOptionRow(optionRows, name, name);
        });

        Array.prototype.forEach.call(createTemplateType.options || [], function (option) {
            appendSelectOptionRow(optionRows, option.value, option.textContent || option.value);
        });

        if (!optionRows.length) {
            appendSelectOptionRow(optionRows, "Универсальный", "Универсальный");
        }

        appendSelectOptionRow(optionRows, currentValue, currentValue);
        replaceSelectOptions(createTemplateType, optionRows, currentValue);
        templateCreateState.type = createTemplateType.value || "Универсальный";
    }

    function getTemplateTaxonomyNames(groupName) {
        var values = [];
        var seen = {};
        var options = templateTaxonomy && Array.isArray(templateTaxonomy[groupName])
            ? templateTaxonomy[groupName]
            : [];

        options.forEach(function (option) {
            var name = normalizeTagTitle(option && (option.name || option.title), "");
            var key = name.toLowerCase();

            if (!name || seen[key]) {
                return;
            }

            seen[key] = true;
            values.push(name);
        });

        return values;
    }

    function appendSelectOptionRow(rows, value, label) {
        var normalizedValue = String(value || "").trim();
        var normalizedLabel = String(label || value || "").trim();
        var exists = rows.some(function (row) {
            return row.value.toLowerCase() === normalizedValue.toLowerCase();
        });

        if (!normalizedValue || exists) {
            return;
        }

        rows.push({
            value: normalizedValue,
            label: normalizedLabel || normalizedValue
        });
    }

    function replaceSelectOptions(selectElement, rows, preferredValue) {
        var nextValue = preferredValue || selectElement.value || "";

        selectElement.innerHTML = "";
        rows.forEach(function (row) {
            var option = document.createElement("option");
            option.value = row.value;
            option.textContent = row.label;
            selectElement.appendChild(option);
        });

        if (nextValue && Array.prototype.some.call(selectElement.options, function (option) {
            return option.value === nextValue;
        })) {
            selectElement.value = nextValue;
        }
    }

    function markTemplateCard(card) {
        getTemplateCards().forEach(function (templateCard) {
            templateCard.classList.toggle("is-selected", templateCard === card);
        });
    }

    function chooseTemplate(card) {
        markTemplateCard(card);

        committedTemplate = {
            key: card.dataset.templateKey || "",
            title: card.dataset.templateTitle || "",
            type: card.dataset.templateType || "",
            description: card.dataset.templateDescription || ""
        };

        if (selectedTemplateKey) {
            selectedTemplateKey.value = committedTemplate.key;
        }

        if (selectedTemplateTitle) {
            selectedTemplateTitle.value = committedTemplate.title;
        }

        if (templatePreviewTitle) {
            templatePreviewTitle.textContent = committedTemplate.title;
        }

        if (templatePreviewType) {
            templatePreviewType.textContent = committedTemplate.type;
        }

        if (templatePreviewDescription) {
            templatePreviewDescription.textContent = committedTemplate.description;
        }

        if (templatePicker) {
            templatePicker.hidden = true;
        }

        if (templatePreview) {
            templatePreview.hidden = false;
        }
    }

    function filterTemplates() {
        var query = templateSearch ? templateSearch.value.trim().toLowerCase() : "";
        var type = templateTypeFilter ? templateTypeFilter.value : "all";

        getTemplateCards().forEach(function (card) {
            var title = (card.dataset.templateTitle || "").toLowerCase();
            var cardType = card.dataset.templateType || "";
            var matchesQuery = !query || title.indexOf(query) !== -1;
            var matchesType = type === "all" || cardType === type;

            card.classList.toggle("is-hidden", !(matchesQuery && matchesType));
        });
    }

    function enqueueFiles(fileList) {
        if (!fileList || !fileList.length) {
            return;
        }

        Array.prototype.forEach.call(fileList, function (file) {
            var itemData = {
                id: "file-" + Date.now() + "-" + Math.random().toString(16).slice(2),
                file: file,
                token: null,
                status: "pending",
                error: "",
                element: null
            };
            itemData.element = createImportItem(file, itemData.id);
            importItems.push(itemData);
        });

        updateImportEmptyState();
        processImportQueue();
    }

    function createImportItem(file, itemId) {
        var item = document.createElement("div");
        item.className = "import-file-item pending";
        item.draggable = true;
        item.dataset.importItemId = itemId;

        var handle = document.createElement("button");
        handle.className = "import-file-drag";
        handle.type = "button";
        handle.setAttribute("aria-label", "Переместить файл");
        handle.textContent = "⋮⋮";

        var name = document.createElement("span");
        name.className = "import-file-name";
        name.textContent = file.name;

        var status = document.createElement("span");
        status.className = "import-status-icon";

        item.appendChild(handle);
        item.appendChild(name);
        item.appendChild(status);

        item.addEventListener("dragstart", function (event) {
            item.classList.add("is-dragging");
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", itemId);
        });

        item.addEventListener("dragend", function () {
            clearImportDragging();
            syncImportItemsFromDom();
            updateFileTokens();
        });

        if (importFileList) {
            importFileList.appendChild(item);
        }

        return item;
    }

    function handleImportDragOver(event) {
        event.preventDefault();
        var dragging = importFileList.querySelector(".import-file-item.is-dragging");
        var target = event.target.closest(".import-file-item");

        if (!dragging || !target || dragging === target) {
            return;
        }

        var rect = target.getBoundingClientRect();
        var shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
        importFileList.insertBefore(dragging, shouldInsertAfter ? target.nextSibling : target);
    }

    function clearImportDragging() {
        document.querySelectorAll(".import-file-item.is-dragging").forEach(function (item) {
            item.classList.remove("is-dragging");
        });
    }

    function syncImportItemsFromDom() {
        if (!importFileList) {
            return;
        }

        var byId = {};

        importItems.forEach(function (item) {
            byId[item.id] = item;
        });

        importItems = Array.prototype.map.call(
            importFileList.querySelectorAll(".import-file-item[data-import-item-id]"),
            function (element) {
                return byId[element.dataset.importItemId];
            }
        ).filter(Boolean);
    }

    function processImportQueue() {
        if (isScanningFiles) {
            return;
        }

        syncImportItemsFromDom();

        var nextItem = null;

        importItems.some(function (item) {
            if (item.status === "pending") {
                nextItem = item;
                return true;
            }

            return false;
        });

        if (!nextItem) {
            updateCreateSubmitState();
            return;
        }

        isScanningFiles = true;
        importState.isProcessing = true;
        setImportItemStatus(nextItem, "processing");
        updateCreateSubmitState();

        var formData = new FormData();
        formData.append("file", nextItem.file);

        fetch("/api/reports/import/scan", {
            method: "POST",
            body: formData,
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Не удалось считать файл");
                    }

                    return data;
                });
            })
            .then(function (data) {
                nextItem.token = data.file_token;
                importState.completedFiles.push(nextItem);
                setImportItemStatus(nextItem, "completed");
                updateFileTokens();
            })
            .catch(function (error) {
                nextItem.error = error.message;
                importState.failedFiles.push(nextItem);
                setImportItemStatus(nextItem, "error");
                showToast(error.message, "warning");
            })
            .finally(function () {
                isScanningFiles = false;
                importState.isProcessing = false;
                updateCreateSubmitState();
                processImportQueue();
            });
    }

    function setImportItemStatus(item, status) {
        item.status = status;
        item.element.classList.remove("pending", "processing", "completed", "error");
        item.element.classList.add(status);

        var icon = item.element.querySelector(".import-status-icon");

        if (!icon) {
            return;
        }

        if (status === "completed") {
            icon.textContent = "✓";
        } else if (status === "error") {
            icon.textContent = "×";
        } else {
            icon.textContent = "";
        }
    }

    function updateFileTokens() {
        if (!fileTokenList) {
            return;
        }

        syncImportItemsFromDom();
        fileTokenList.innerHTML = "";

        importItems.forEach(function (item) {
            if (item.status !== "completed" || !item.token) {
                return;
            }

            var input = document.createElement("input");
            input.type = "hidden";
            input.name = "file_tokens";
            input.value = item.token;
            fileTokenList.appendChild(input);
        });
    }

    function updateImportEmptyState() {
        if (!importFileList) {
            return;
        }

        var emptyState = importFileList.querySelector(".import-empty-state");

        if (emptyState) {
            emptyState.remove();
        }
    }

    function updateCreateSubmitState() {
        if (!createSubmit) {
            return;
        }

        var hasUnfinishedFiles = importItems.some(function (item) {
            return item.status === "pending" || item.status === "processing";
        });

        createSubmit.disabled = hasUnfinishedFiles;
        createSubmit.textContent = hasUnfinishedFiles ? "Обработка..." : "Подтвердить";
    }

    function submitCreateReport(event) {
        event.preventDefault();
        updateFileTokens();

        var hasUnfinishedFiles = importItems.some(function (item) {
            return item.status === "pending" || item.status === "processing";
        });
        var hasFailedFiles = importItems.some(function (item) {
            return item.status === "error";
        });

        if (!createReportTitle || !createReportTitle.value.trim()) {
            showToast("Введите обязательные данные", "warning");
            return;
        }

        if (!committedTemplate || !selectedTemplateKey || !selectedTemplateKey.value) {
            showToast("Выберите шаблон отчета", "warning");
            return;
        }

        if (hasUnfinishedFiles) {
            showToast("Дождитесь завершения обработки файлов", "warning");
            return;
        }

        if (hasFailedFiles) {
            showToast("Исправьте ошибки во вводе данных", "warning");
            return;
        }

        updateCreateShareSelection(createSelectedShareUserIds, createSelectedShareGroupIds);
        var formData = new FormData(createReportForm);

        fetch(createReportForm.action, {
            method: "POST",
            body: formData,
            headers: {
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Ошибка");
                    }

                    return data;
                });
            })
            .then(function (data) {
                window.location.href = data.redirect_url;
            })
            .catch(function (error) {
                showToast(error.message, "warning");
            });
    }

    function initializeDraftSaveControls() {
        if (!draftSaveRoot) {
            return;
        }

        draftSaveState.isDirty = Boolean(
            (draftSaveState.sourceMode === "editor" && editorState.dirty) ||
            (draftSaveState.sourceMode === "preview" && previewState.dirty)
        );
        draftSaveState.isStale = false;
        draftSaveState.lastSavedAt = Date.now();
        window.clearTimeout(draftSaveState.autosaveTimer);
        window.clearTimeout(editorState.autosaveTimer);

        draftSaveButtons.forEach(function (button) {
            button.addEventListener("mousedown", function (event) {
                event.preventDefault();
            });

            button.addEventListener("click", function (event) {
                event.preventDefault();

                if (!isDraftSavePending() || draftSaveState.isSaving) {
                    return;
                }

                saveDraft({ reason: "manual", force: true });
            });
        });

        updateDraftSaveUI();
        scheduleDraftStaleTimer();
    }

    function isDraftSavePending() {
        return draftSaveState.isDirty || draftSaveState.isStale;
    }

    function markDraftDirty() {
        if (!draftSaveRoot) {
            return;
        }

        draftSaveState.isDirty = true;
        draftSaveState.isStale = false;
        updateDraftSaveUI();
        scheduleDraftAutosave();
    }

    function markDraftSaved() {
        if (!draftSaveRoot) {
            return;
        }

        draftSaveState.isDirty = false;
        draftSaveState.isSaving = false;
        draftSaveState.isStale = false;
        draftSaveState.lastSavedAt = Date.now();
        window.clearTimeout(draftSaveState.autosaveTimer);
        updateDraftSaveUI();
        scheduleDraftStaleTimer();
    }

    function scheduleDraftAutosave() {
        if (!draftSaveRoot || !draftSaveState.isDirty || draftSaveState.isSaving) {
            return;
        }

        window.clearTimeout(draftSaveState.autosaveTimer);
        draftSaveState.autosaveTimer = window.setTimeout(function () {
            saveDraft({ reason: "autosave", force: false });
        }, DRAFT_AUTOSAVE_DELAY);
    }

    function scheduleDraftStaleTimer() {
        if (!draftSaveRoot) {
            return;
        }

        window.clearTimeout(draftSaveState.staleTimer);
        draftSaveState.staleTimer = window.setTimeout(function () {
            if (!draftSaveState.isDirty && !draftSaveState.isSaving) {
                draftSaveState.isStale = true;
                updateDraftSaveUI();
            }
        }, DRAFT_AUTOSAVE_DELAY);
    }

    function updateDraftSaveUI() {
        if (!draftSaveRoot) {
            return;
        }

        var pending = isDraftSavePending();
        var statusText = pending ? "Ожидает сохранения" : "Сохранено";
        var titleText = draftSaveState.isSaving ? "Сохранение" : statusText;

        draftSaveButtons.forEach(function (button) {
            button.disabled = !pending || draftSaveState.isSaving;
            button.classList.toggle("is-pending", pending && !draftSaveState.isSaving);
            button.classList.toggle("is-saving", draftSaveState.isSaving);
            button.classList.toggle("is-saved", !pending && !draftSaveState.isSaving);
            button.title = titleText;
            button.setAttribute("aria-label", titleText);
        });

        draftSaveStatuses.forEach(function (status) {
            status.textContent = statusText;
            status.classList.toggle("is-pending", pending || draftSaveState.isSaving);
            status.classList.toggle("is-saving", draftSaveState.isSaving);
            status.classList.toggle("is-saved", !pending && !draftSaveState.isSaving);
        });
    }

    function saveDraft(options) {
        options = options || {};

        if (!draftSaveRoot || draftSaveState.isSaving) {
            return Promise.resolve();
        }

        if (!options.force && !draftSaveState.isDirty) {
            return Promise.resolve();
        }

        draftSaveState.isSaving = true;
        window.clearTimeout(draftSaveState.autosaveTimer);
        updateDraftSaveUI();

        var request = draftSaveState.sourceMode === "editor"
            ? saveEditorStateToServer(false, {
                force: true,
                reason: options.reason || "manual",
                suppressDraftUi: true
            })
            : savePreviewDraft(options.reason || "manual");

        return Promise.resolve(request)
            .then(function () {
                markDraftSaved();

                if (options.reason === "autosave") {
                    showToast("Черновик автоматически сохранен", "success");
                } else if (options.reason === "manual") {
                    showToast("Черновик сохранен", "success");
                }
            })
            .catch(function () {
                draftSaveState.isSaving = false;
                draftSaveState.isDirty = true;
                updateDraftSaveUI();
                showToast("Черновик может быть не сохранен", "warning");
            });
    }

    function savePreviewDraft(reason) {
        if (!draftSaveState.saveUrl) {
            return Promise.resolve();
        }

        var orderRequest = Promise.resolve();
        if (previewState.pendingOrderIds && previewPages && previewPages.dataset.reorderUrl) {
            window.clearTimeout(previewState.saveTimer);
            orderRequest = persistPreviewOrder(previewState.pendingOrderIds, { silent: true });
        }

        return orderRequest.then(function () {
            return fetch(draftSaveState.saveUrl, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify({ reason: reason || "manual" })
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Черновик может быть не сохранен");
                    }

                    return response.json();
                })
                .then(function (data) {
                    if (data && data.success === false) {
                        throw new Error(data.error || "Черновик может быть не сохранен");
                    }

                    previewState.dirty = false;
                });
        });
    }

    function initializePreviewBlocks() {
        if (!previewPages || !previewBlockSource) {
            return;
        }

        paginatePreviewBlocks();
        initializePreviewNavigation();

        previewPages.addEventListener("dragstart", function (event) {
            var block = event.target.closest("[data-imported-block]");

            if (!block) {
                return;
            }

            previewDraggedBlock = block;
            block.classList.add("is-dragging");
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", block.dataset.blockId);
        });

        previewPages.addEventListener("dragover", function (event) {
            var target = event.target.closest("[data-imported-block]");

            if (!previewDraggedBlock || !target || target === previewDraggedBlock) {
                return;
            }

            event.preventDefault();
            var beforeIds = getPreviewBlockIds();
            var rect = target.getBoundingClientRect();
            var shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
            target.parentNode.insertBefore(previewDraggedBlock, shouldInsertAfter ? target.nextSibling : target);
            var afterIds = getPreviewBlockIds();

            if (beforeIds.join(",") !== afterIds.join(",")) {
                previewDraggedBlock.dataset.reorderBefore = beforeIds.join(",");
            }
        });

        previewPages.addEventListener("drop", function (event) {
            if (!previewDraggedBlock) {
                return;
            }

            event.preventDefault();
            var beforeIds = (previewDraggedBlock.dataset.reorderBefore || "").split(",").filter(Boolean);
            var afterIds = getPreviewBlockIds();
            previewDraggedBlock.classList.remove("is-dragging");
            previewDraggedBlock.dataset.reorderBefore = "";
            previewDraggedBlock = null;

            if (beforeIds.length && beforeIds.join(",") !== afterIds.join(",")) {
                pushPreviewAction({ type: "reorder", beforeIds: beforeIds, afterIds: afterIds });
                savePreviewOrder(afterIds);
                paginatePreviewBlocks(afterIds);
            }
        });

        previewPages.addEventListener("dragend", function () {
            if (previewDraggedBlock) {
                previewDraggedBlock.classList.remove("is-dragging");
                previewDraggedBlock.dataset.reorderBefore = "";
                previewDraggedBlock = null;
            }
        });

        previewPages.addEventListener("click", function (event) {
            var deleteButton = event.target.closest("[data-delete-block]");

            if (deleteButton) {
                deletePreviewBlock(deleteButton.closest("[data-imported-block]"));
            }
        });

        window.addEventListener("resize", debounce(function () {
            paginatePreviewBlocks(getPreviewBlockIds());
        }, 180));

        window.addEventListener("scroll", debounce(updateActiveNavigationItem, 80));
    }

    function paginatePreviewBlocks(orderIds) {
        if (!previewPages) {
            return;
        }

        var blocks = Array.prototype.slice.call(document.querySelectorAll("[data-imported-block]"));
        var orderedBlocks = orderIds && orderIds.length ? sortBlocksByIds(blocks, orderIds) : blocks;

        previewPages.innerHTML = "";

        var page = createPreviewContentPage(2);
        var pageContent = page.querySelector(".preview-page-content");
        previewPages.appendChild(page);

        orderedBlocks.forEach(function (block) {
            pageContent.appendChild(block);

            if (pageContent.scrollHeight > getPreviewContentLimit(pageContent) && pageContent.children.length > 1) {
                pageContent.removeChild(block);
                page = createPreviewContentPage(previewPages.children.length + 2);
                pageContent = page.querySelector(".preview-page-content");
                previewPages.appendChild(page);
                pageContent.appendChild(block);
            }
        });

        updatePreviewPageNumbers();
        updateNavigationOrder();
    }

    function createPreviewContentPage(pageNumber) {
        var page = document.createElement("section");
        page.className = "report-preview-page content-preview-page";
        page.dataset.pageNumber = String(pageNumber);

        var kicker = document.createElement("div");
        kicker.className = "preview-title-kicker";
        kicker.textContent = pageNumber === 2 ? "Импортированные данные" : "Продолжение";

        var content = document.createElement("div");
        content.className = "preview-page-content";

        var footer = document.createElement("div");
        footer.className = "preview-page-footer";
        footer.textContent = String(pageNumber);

        page.appendChild(kicker);
        page.appendChild(content);
        page.appendChild(footer);

        return page;
    }

    function getPreviewContentLimit(content) {
        var page = content.closest(".report-preview-page");
        var footer = page.querySelector(".preview-page-footer");
        var kicker = page.querySelector(".preview-title-kicker");
        return page.clientHeight - footer.offsetHeight - kicker.offsetHeight - 44;
    }

    function updatePreviewPageNumbers() {
        Array.prototype.forEach.call(previewPages.children, function (page, index) {
            var footer = page.querySelector(".preview-page-footer");
            if (footer) {
                footer.textContent = String(index + 2);
            }
        });
    }

    function getPreviewBlockIds() {
        return Array.prototype.map.call(
            previewPages.querySelectorAll("[data-imported-block]"),
            function (block) {
                return block.dataset.blockId;
            }
        );
    }

    function sortBlocksByIds(blocks, ids) {
        var byId = {};
        blocks.forEach(function (block) {
            byId[block.dataset.blockId] = block;
        });

        return ids.map(function (id) {
            return byId[id];
        }).filter(Boolean);
    }

    function savePreviewOrder(ids) {
        if (!previewPages || !previewPages.dataset.reorderUrl) {
            return;
        }

        previewState.dirty = true;
        previewState.pendingOrderIds = ids.slice();
        markDraftDirty();
        window.clearTimeout(previewState.saveTimer);
        previewState.saveTimer = window.setTimeout(function () {
            persistPreviewOrder(ids).catch(function () {});
        }, 420);
    }

    function persistPreviewOrder(ids, options) {
        options = options || {};

        return fetch(previewPages.dataset.reorderUrl, {
            method: "PATCH",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({ block_ids: ids })
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Порядок блоков может быть не сохранен");
                }

                previewState.dirty = false;
                previewState.pendingOrderIds = null;
            })
            .catch(function () {
                previewState.dirty = true;
                markDraftDirty();
                if (!options.silent) {
                    showToast("Порядок блоков может быть не сохранен", "warning");
                }
                throw new Error("Порядок блоков может быть не сохранен");
            });
    }

    function deletePreviewBlock(block) {
        if (!block) {
            return;
        }

        var beforeIds = getPreviewBlockIds();
        var index = beforeIds.indexOf(block.dataset.blockId);

        fetch(block.dataset.deleteUrl, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Не удалось удалить блок");
                }

                return response.json();
            })
            .then(function (data) {
                if (!data.success) {
                    throw new Error("Не удалось удалить блок");
                }

                block.classList.add("is-removing");
                window.setTimeout(function () {
                    block.remove();
                    paginatePreviewBlocks(getPreviewBlockIds());
                    updateNavigationOrder();
                }, 220);

                pushPreviewAction({ type: "delete", block: block, index: index, beforeIds: beforeIds });
                markDraftDirty();
                showToast("Блок удален", "success");
            })
            .catch(function (error) {
                showToast(error.message, "error");
            });
    }

    function pushPreviewAction(action) {
        undoStack.push(action);
        redoStack = [];
        previewState.dirty = true;
        markDraftDirty();
    }

    function undoPreviewAction() {
        var action = undoStack.pop();

        if (!action) {
            return;
        }

        if (action.type === "delete") {
            action.block.classList.remove("is-removing");
            restorePreviewBlock(action.block);
            applyPreviewOrder(action.beforeIds);
            fetch(action.block.dataset.restoreUrl, { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest" } });
            markDraftDirty();
        }

        if (action.type === "reorder") {
            applyPreviewOrder(action.beforeIds);
            savePreviewOrder(action.beforeIds);
        }

        redoStack.push(action);
    }

    function redoPreviewAction() {
        var action = redoStack.pop();

        if (!action) {
            return;
        }

        if (action.type === "delete") {
            fetch(action.block.dataset.deleteUrl, { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest" } });
            action.block.remove();
            paginatePreviewBlocks(getPreviewBlockIds());
            markDraftDirty();
        }

        if (action.type === "reorder") {
            applyPreviewOrder(action.afterIds);
            savePreviewOrder(action.afterIds);
        }

        undoStack.push(action);
    }

    function restorePreviewBlock(block) {
        if (!block.parentNode) {
            previewPages.appendChild(block);
        }
        block.classList.remove("is-removing");
    }

    function applyPreviewOrder(ids) {
        paginatePreviewBlocks(ids);
        updateNavigationOrder();
    }

    function initializePreviewNavigation() {
        if (!blockNavigation) {
            return;
        }

        blockNavigation.addEventListener("click", function (event) {
            var item = event.target.closest("[data-nav-block-id]");

            if (!item) {
                return;
            }

            var block = document.querySelector('[data-block-id="' + item.dataset.navBlockId + '"]');

            if (block) {
                block.scrollIntoView({ behavior: "smooth", block: "center" });
                highlightPreviewBlock(block);
            }
        });
    }

    function updateNavigationOrder() {
        var list = document.querySelector("[data-block-navigation-list]");

        if (!list) {
            return;
        }

        getPreviewBlockIds().forEach(function (id) {
            var item = list.querySelector('[data-nav-block-id="' + id + '"]');
            if (item) {
                list.appendChild(item);
            }
        });
    }

    function updateActiveNavigationItem() {
        if (!blockNavigation) {
            return;
        }

        var activeBlock = null;
        var viewportMiddle = window.innerHeight / 2;

        document.querySelectorAll("[data-imported-block]").forEach(function (block) {
            var rect = block.getBoundingClientRect();

            if (rect.top <= viewportMiddle && rect.bottom >= viewportMiddle) {
                activeBlock = block;
            }
        });

        document.querySelectorAll("[data-nav-block-id]").forEach(function (item) {
            item.classList.toggle("is-active", activeBlock && item.dataset.navBlockId === activeBlock.dataset.blockId);
        });
    }

    function highlightPreviewBlock(block) {
        document.querySelectorAll("[data-imported-block].is-active").forEach(function (item) {
            item.classList.remove("is-active");
        });

        block.classList.add("is-active");

        window.setTimeout(function () {
            block.classList.remove("is-active");
        }, 1100);
    }

    function initializeEditor() {
        if (!editorPages || !editorSourceContent) {
            return;
        }

        paginateEditorContent();
        currentEditablePage = document.querySelector("[data-editable-page]");
        updateEditorRulerWidth();
        saveEditorState();
        editorState.dirty = false;
        window.clearTimeout(editorState.autosaveTimer);
        updateEditorHistoryControls();

        editorPages.addEventListener("focusin", function (event) {
            var page = event.target.closest("[data-editable-page]");

            if (page) {
                setCurrentEditablePage(page);
            }
        });

        editorPages.addEventListener("click", function (event) {
            var orientationButton = event.target.closest("[data-page-orientation-toggle]");
            var page = event.target.closest("[data-editable-page]");

            if (orientationButton) {
                togglePageOrientation(orientationButton.closest("[data-editor-page-wrapper]"));
                return;
            }

            if (page) {
                setCurrentEditablePage(page);
            }
        });

        editorPages.addEventListener("beforeinput", handleStyledTextInput);

        editorPages.addEventListener("input", function (event) {
            handleEditorInput(event);
            updateToolbarActiveStates();
        });

        editorPages.addEventListener("mousedown", startTableResize);
        editorPages.addEventListener("mouseup", function () {
            saveEditorSelectionRange();
            updateToolbarActiveStates();
        });
        editorPages.addEventListener("keyup", function () {
            saveEditorSelectionRange();
            updateToolbarActiveStates();
        });

        document.querySelectorAll("[data-editor-undo]").forEach(function (button) {
            button.addEventListener("click", function () {
                undoEditor();
            });
        });

        document.querySelectorAll("[data-editor-redo]").forEach(function (button) {
            button.addEventListener("click", function () {
                redoEditor();
            });
        });

        document.querySelectorAll("[data-editor-clear-styles]").forEach(function (button) {
            button.addEventListener("click", function () {
                clearSelectedEditorStyles(getCurrentEditablePage());
            });
        });

        document.querySelectorAll("[data-editor-command]").forEach(function (button) {
            button.addEventListener("click", function () {
                applyEditorCommand(button.dataset.editorCommand);
            });
        });

        document.querySelectorAll("[data-editor-align]").forEach(function (button) {
            button.addEventListener("click", function () {
                applyEditorAlignment(button.dataset.editorAlign);
            });
        });

        var fontSize = document.querySelector("[data-editor-font-size]");
        var fontName = document.querySelector("[data-editor-font-name]");
        var foreColor = document.querySelector("[data-editor-fore-color]");
        var backColor = document.querySelector("[data-editor-back-color]");
        var backApply = document.querySelector("[data-editor-back-apply]");
        var backPicker = document.querySelector("[data-editor-back-picker]");
        var backSwatch = document.querySelector("[data-editor-back-swatch]");
        var transparentBack = document.querySelector("[data-editor-back-transparent]");

        if (editorToolbar) {
            editorToolbar.addEventListener("mousedown", handleEditorToolbarMouseDown, true);
        }

        if (fontSize) {
            fontSize.addEventListener("change", function () {
                applyInlineStyle(getCurrentEditablePage(), { fontSize: fontSize.value + "pt" });
            });
        }

        if (fontName) {
            fontName.addEventListener("change", function () {
                applyInlineStyle(getCurrentEditablePage(), { fontFamily: fontName.value });
            });
        }

        if (foreColor) {
            foreColor.addEventListener("change", function () {
                applyInlineStyle(getCurrentEditablePage(), { color: foreColor.value });
            });
        }

        if (backSwatch && backColor) {
            backSwatch.style.backgroundColor = backColor.value;
        }

        if (backApply) {
            backApply.addEventListener("click", function (event) {
                event.preventDefault();
                applyBackgroundColor(getCurrentToolbarBackgroundColor(), getCurrentEditablePage());
            });
        }

        if (backPicker && backColor) {
            backPicker.addEventListener("click", function (event) {
                event.preventDefault();
                saveEditorSelection();
                openEditorColorPicker(backColor);
            });
        }

        if (backColor) {
            backColor.addEventListener("input", function () {
                setCurrentToolbarBackgroundColor(backColor.value);
            });

            backColor.addEventListener("change", function () {
                setCurrentToolbarBackgroundColor(backColor.value);
                applyBackgroundColor(backColor.value, getCurrentEditablePage());
            });
        }

        if (transparentBack) {
            transparentBack.addEventListener("click", function (event) {
                event.preventDefault();
                clearSelectionBackground(getCurrentEditablePage());
            });
        }

        editorPages.addEventListener("keydown", function (event) {
            if (event.key === " " && event.target.closest("[data-editable-page]")) {
                event.preventDefault();
                event.stopPropagation();
                document.execCommand("insertText", false, " ");
                scheduleEditorHistorySave();
                return;
            }

            if (event.key === "Tab" && event.target.closest("[data-editable-page]")) {
                event.preventDefault();
                document.execCommand("insertText", false, "    ");
                scheduleEditorHistorySave();
            }
        });

        initializeTablePicker();

        var ruler = document.querySelector("[data-editor-ruler]");

        if (ruler) {
            initializeRuler(ruler);
        }

        document.addEventListener("selectionchange", function () {
            if (document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-editable-page]")) {
                saveEditorSelectionRange();
                updateRulerFromSelection();
                updateToolbarActiveStates();
            }
        });

        document.addEventListener("mousemove", resizeEditorTable);
        document.addEventListener("mouseup", stopTableResize);
        window.addEventListener("blur", flushEditorAutosave);
        window.addEventListener("beforeunload", function () {
            flushEditorAutosave(true);
        });
        window.addEventListener("resize", debounce(function () {
            updateEditorRulerWidth();
            updateRulerFromSelection();
        }, 120));

        updateToolbarActiveStates();
    }

    function scheduleEditorPagination() {
        if (restoringEditorHistory) {
            return;
        }

        window.clearTimeout(editorPaginationTimer);
        editorPaginationTimer = window.setTimeout(function () {
            if (editorState.isTyping) {
                scheduleEditorPagination();
                return;
            }

            editorState.isPaginating = true;
            paginateEditorContent(null, { preserveSelection: true });
            editorState.isPaginating = false;
            saveEditorState();
            updateRulerFromSelection();
        }, 760);
    }

    function handleEditorInput(event) {
        var inputType = event.inputType || "";

        editorState.isTyping = true;
        window.clearTimeout(editorState.typingTimer);
        editorState.typingTimer = window.setTimeout(function () {
            editorState.isTyping = false;
        }, 650);

        scheduleEditorHistorySave();

        if (
            inputType === "insertParagraph" ||
            inputType === "insertLineBreak" ||
            inputType.indexOf("delete") === 0 ||
            inputType === "insertFromPaste"
        ) {
            scheduleEditorPagination();
        }
    }

    function scheduleEditorHistorySave() {
        if (restoringEditorHistory) {
            return;
        }

        window.clearTimeout(editorHistorySaveTimer);
        editorHistorySaveTimer = window.setTimeout(function () {
            saveEditorState();
        }, 520);
    }

    function flushEditorHistorySave() {
        window.clearTimeout(editorHistorySaveTimer);
        saveEditorState();
    }

    function paginateEditorContent(nodes, options) {
        var shouldPreserveSelection = options && options.preserveSelection;
        var markerPlaced = shouldPreserveSelection ? placeEditorSelectionMarker() : false;
        var sourceNodes = nodes || collectEditorContentNodes(markerPlaced);
        var orientations = getEditorPageOrientations();
        var currentIndex = getCurrentPageIndex();

        editorPages.innerHTML = "";

        var page = appendEditorPage(1, orientations[0] || "portrait");

        sourceNodes.forEach(function (sourceNode) {
            var node = normalizeEditorNode(sourceNode);

            if (!node) {
                return;
            }

            page.appendChild(node);

            if (getEditorUsedHeight(page) > getEditorPageLimit(page) && getEditorContentChildCount(page) > 1) {
                page.removeChild(node);
                page = appendEditorPage(editorPages.querySelectorAll("[data-editable-page]").length + 1, orientations[editorPages.querySelectorAll("[data-editable-page]").length] || "portrait");
                page.appendChild(node);
            }
        });

        updateEditorPageNumbers();
        enhanceEditorTables(editorPages);

        var pages = editorPages.querySelectorAll("[data-editable-page]");

        if (markerPlaced && restoreEditorSelectionMarker()) {
            return;
        }

        setCurrentEditablePage(pages[Math.min(currentIndex, pages.length - 1)] || pages[0]);
    }

    function collectEditorContentNodes(keepCaretMarker) {
        var pages = editorPages.querySelectorAll("[data-editable-page]");

        if (!pages.length) {
            return Array.prototype.slice.call(editorSourceContent.childNodes).map(function (node) {
                return sanitizeEditorNode(node.cloneNode(true), keepCaretMarker);
            });
        }

        var nodes = [];

        pages.forEach(function (page) {
            Array.prototype.forEach.call(page.childNodes, function (node) {
                if (node.nodeType === 1 && node.classList.contains("editor-page-number")) {
                    return;
                }

                nodes.push(sanitizeEditorNode(node.cloneNode(true), keepCaretMarker));
            });
        });

        return nodes;
    }

    function placeEditorSelectionMarker() {
        var selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return false;
        }

        var range = selection.getRangeAt(0);
        var page = getCurrentEditablePage();

        if (!page || !page.contains(range.startContainer)) {
            return false;
        }

        var marker = document.createElement("span");
        marker.dataset.editorCaretMarker = "";
        marker.className = "editor-caret-marker";
        marker.textContent = "\u200b";

        range.collapse(false);
        range.insertNode(marker);
        range.setStartAfter(marker);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        return true;
    }

    function restoreEditorSelectionMarker() {
        var marker = editorPages.querySelector("[data-editor-caret-marker]");

        if (!marker) {
            return false;
        }

        var page = marker.closest("[data-editable-page]");
        var range = document.createRange();
        var selection = window.getSelection();

        range.setStartAfter(marker);
        range.collapse(true);
        marker.remove();

        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        if (page) {
            page.focus();
            setCurrentEditablePage(page);
        }

        return true;
    }

    function sanitizeEditorNode(node, keepCaretMarker) {
        if (node.nodeType === 1) {
            node.querySelectorAll(".editor-page-number, .table-resize-handle").forEach(function (item) {
                item.remove();
            });

            if (!keepCaretMarker) {
                node.querySelectorAll("[data-editor-caret-marker]").forEach(function (item) {
                    item.remove();
                });
            }
        }

        return node;
    }

    function normalizeEditorNode(node) {
        if (node.nodeType === 3) {
            if (!node.textContent.trim()) {
                return null;
            }

            var paragraph = document.createElement("p");
            paragraph.textContent = node.textContent;
            return paragraph;
        }

        if (node.nodeType !== 1) {
            return null;
        }

        if (node.matches("table")) {
            node.classList.add("editor-table");
        }

        node.querySelectorAll("table").forEach(function (table) {
            table.classList.add("editor-table");
        });

        return node;
    }

    function appendEditorPage(pageNumber, orientation) {
        var wrapper = document.createElement("div");
        wrapper.className = "editor-page-wrapper";
        wrapper.dataset.editorPageWrapper = "";

        if (orientation === "landscape") {
            wrapper.classList.add("is-landscape");
        }

        var page = document.createElement("article");
        page.className = "editable-page";
        page.contentEditable = "true";
        page.dataset.editablePage = "";
        page.dataset.orientation = orientation === "landscape" ? "landscape" : "portrait";

        wrapper.appendChild(page);
        wrapper.appendChild(createPageOrientationButton(page.dataset.orientation));
        editorPages.appendChild(wrapper);

        return page;
    }

    function createPageOrientationButton(orientation) {
        var button = document.createElement("button");
        button.className = "page-orientation-button";
        button.type = "button";
        button.dataset.pageOrientationToggle = "";
        button.contentEditable = "false";
        updatePageOrientationButton(button, orientation);
        return button;
    }

    function updatePageOrientationButton(button, orientation) {
        var isLandscape = orientation === "landscape";
        button.setAttribute("aria-label", isLandscape ? "Вернуть вертикальную ориентацию" : "Перевернуть лист горизонтально");
        button.innerHTML = isLandscape
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12v8H6z"></path><path d="M8 5c3-3 9-3 12 1"></path><path d="M20 6v4h-4"></path></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h8v14H8z"></path><path d="M5 16c-3-3-3-9 1-12"></path><path d="M6 4h4v4"></path></svg>';
    }

    function togglePageOrientation(wrapper) {
        if (!wrapper) {
            return;
        }

        var page = wrapper.querySelector("[data-editable-page]");
        var button = wrapper.querySelector("[data-page-orientation-toggle]");
        var isLandscape = !wrapper.classList.contains("is-landscape");

        wrapper.classList.toggle("is-landscape", isLandscape);
        page.dataset.orientation = isLandscape ? "landscape" : "portrait";
        updatePageOrientationButton(button, page.dataset.orientation);
        setCurrentEditablePage(page);
        paginateEditorContent();
        saveEditorState();
    }

    function updateEditorPageNumbers() {
        editorPages.querySelectorAll("[data-editable-page]").forEach(function (page, index) {
            var existing = page.querySelector(".editor-page-number");

            if (existing) {
                existing.remove();
            }

            if (index === 0) {
                return;
            }

            var number = document.createElement("div");
            number.className = "editor-page-number";
            number.contentEditable = "false";
            number.textContent = String(index + 1);
            page.appendChild(number);
        });
    }

    function getEditorPageOrientations() {
        return Array.prototype.map.call(editorPages.querySelectorAll("[data-editable-page]"), function (page) {
            return page.dataset.orientation || "portrait";
        });
    }

    function getCurrentPageIndex() {
        var pages = Array.prototype.slice.call(editorPages.querySelectorAll("[data-editable-page]"));
        var index = pages.indexOf(currentEditablePage);
        return index === -1 ? 0 : index;
    }

    function getEditorPageLimit(page) {
        var styles = window.getComputedStyle(page);
        var paddingBottom = parseFloat(styles.paddingBottom) || 0;
        return page.clientHeight - paddingBottom - 42;
    }

    function getEditorUsedHeight(page) {
        var children = Array.prototype.filter.call(page.children, function (child) {
            return !child.classList.contains("editor-page-number");
        });

        if (!children.length) {
            return 0;
        }

        var pageRect = page.getBoundingClientRect();
        var lastRect = children[children.length - 1].getBoundingClientRect();
        return lastRect.bottom - pageRect.top;
    }

    function getEditorContentChildCount(page) {
        return Array.prototype.filter.call(page.children, function (child) {
            return !child.classList.contains("editor-page-number");
        }).length;
    }

    function getCurrentEditablePage() {
        return currentEditablePage || document.querySelector("[data-editable-page]");
    }

    function isEditorSelectionActive() {
        var selection = window.getSelection();
        var page = getCurrentEditablePage();
        var activeElement = document.activeElement;

        if (activeElement && activeElement.closest && activeElement.closest("[data-editable-page]")) {
            return true;
        }

        if (!selection || selection.rangeCount === 0 || !page) {
            return false;
        }

        return page.contains(selection.anchorNode);
    }

    function setCurrentEditablePage(page) {
        if (!page) {
            return;
        }

        currentEditablePage = page;

        document.querySelectorAll("[data-editor-page-wrapper].is-active").forEach(function (wrapper) {
            wrapper.classList.remove("is-active");
        });

        var wrapper = page.closest("[data-editor-page-wrapper]");

        if (wrapper) {
            wrapper.classList.add("is-active");
        }

        updateEditorRulerWidth();
        updateRulerFromSelection();
    }

    function updateEditorRulerWidth() {
        var ruler = document.querySelector("[data-editor-ruler]");
        var page = getCurrentEditablePage();

        if (!ruler || !page) {
            return;
        }

        ruler.style.width = Math.round(page.getBoundingClientRect().width) + "px";
    }

    function initializeTablePicker() {
        var toggle = document.querySelector("[data-editor-table-toggle]");
        var popover = document.querySelector("[data-table-size-popover]");
        var label = document.querySelector("[data-table-size-label]");
        var grid = document.querySelector("[data-table-size-grid]");

        if (!toggle || !popover || !grid) {
            return;
        }

        toggle.addEventListener("click", function (event) {
            event.stopPropagation();
            popover.hidden = !popover.hidden;
        });

        grid.addEventListener("mouseover", function (event) {
            var cell = event.target.closest("[data-table-cell]");

            if (!cell) {
                return;
            }

            var rows = Number(cell.dataset.rows);
            var cols = Number(cell.dataset.cols);
            updateTablePickerHighlight(rows, cols);

            if (label) {
                label.textContent = rows + " x " + cols;
            }
        });

        grid.addEventListener("click", function (event) {
            var cell = event.target.closest("[data-table-cell]");

            if (!cell) {
                return;
            }

            insertEditorTable(Number(cell.dataset.rows), Number(cell.dataset.cols));
            popover.hidden = true;
        });
    }

    function updateTablePickerHighlight(rows, cols) {
        document.querySelectorAll("[data-table-cell]").forEach(function (cell) {
            var cellRows = Number(cell.dataset.rows);
            var cellCols = Number(cell.dataset.cols);
            cell.classList.toggle("is-active", cellRows <= rows && cellCols <= cols);
        });
    }

    function insertEditorTable(rows, cols) {
        var html = '<table class="editor-table">';

        for (var row = 0; row < rows; row += 1) {
            html += "<tr>";
            for (var col = 0; col < cols; col += 1) {
                html += "<td><br></td>";
            }
            html += "</tr>";
        }

        html += "</table>";
        getCurrentEditablePage().focus();
        document.execCommand("insertHTML", false, html);
        enhanceEditorTables(getCurrentEditablePage());
        scheduleEditorPagination();
        saveEditorState();
    }

    function closeTablePicker() {
        var popover = document.querySelector("[data-table-size-popover]");

        if (popover) {
            popover.hidden = true;
        }
    }

    function handleEditorToolbarMouseDown(event) {
        var control = event.target.closest("button, select, input");

        if (!control || !editorToolbar || !editorToolbar.contains(control)) {
            return;
        }

        saveEditorSelection();

        if (control.tagName === "BUTTON" || control.matches("[data-editor-back-color]")) {
            event.preventDefault();
        }
    }

    function saveEditorSelectionRange() {
        var selection = window.getSelection();
        var page = getCurrentEditablePage();
        var root = getEditorRoot();
        var range;
        var rangePage;

        if (!selection || selection.rangeCount === 0 || !root) {
            return;
        }

        range = selection.getRangeAt(0);

        if (!root.contains(range.commonAncestorContainer)) {
            return;
        }

        rangePage = range.commonAncestorContainer.nodeType === 1 ?
            range.commonAncestorContainer.closest("[data-editable-page]") :
            (range.commonAncestorContainer.parentElement ? range.commonAncestorContainer.parentElement.closest("[data-editable-page]") : null);

        if (rangePage && rangePage !== page) {
            setCurrentEditablePage(rangePage);
        }

        editorSavedRange = range.cloneRange();
    }

    function saveEditorSelection() {
        saveEditorSelectionRange();
    }

    function restoreEditorSelectionRange(editablePage) {
        var page = editablePage || getCurrentEditablePage();
        var selection = window.getSelection();

        if (!page || !selection || !editorSavedRange) {
            if (page) {
                page.focus();
            }

            return false;
        }

        try {
            if (!page.contains(editorSavedRange.commonAncestorContainer)) {
                page.focus();
                return false;
            }

            selection.removeAllRanges();
            selection.addRange(editorSavedRange.cloneRange());
            page.focus();
            return true;
        } catch (error) {
            page.focus();
            return false;
        }
    }

    function restoreEditorSelection(editablePage) {
        return restoreEditorSelectionRange(editablePage);
    }

    function getEditorRoot() {
        return editorPages || document.querySelector("[data-editor-pages]") || document.querySelector(".editor-page-content") || editorRoot || document.querySelector("[data-editor-root]");
    }

    function getEditorSelectionRange(editablePage) {
        var page = editablePage || getCurrentEditablePage();
        var selection = window.getSelection();
        var range;

        if (!page || !selection || selection.rangeCount === 0) {
            return null;
        }

        range = selection.getRangeAt(0);

        return page.contains(range.commonAncestorContainer) ? range : null;
    }

    function cloneEditorSelectionRange(editablePage) {
        var range = getEditorSelectionRange(editablePage);

        return range ? range.cloneRange() : null;
    }

    function restoreEditorRange(range, editablePage) {
        var page = editablePage || getCurrentEditablePage();
        var selection = window.getSelection();

        if (!range || !page || !selection) {
            return false;
        }

        try {
            if (!page.contains(range.commonAncestorContainer)) {
                return false;
            }

            selection.removeAllRanges();
            selection.addRange(range.cloneRange());
            editorSavedRange = range.cloneRange();
            page.focus();
            return true;
        } catch (error) {
            return false;
        }
    }

    function keepEditorSelectionAfterToolbarAction(previousRange, editablePage) {
        var page = editablePage || getCurrentEditablePage();
        var currentRange = getEditorSelectionRange(page);

        if (currentRange && !currentRange.collapsed) {
            editorSavedRange = currentRange.cloneRange();
            page.focus();
            return true;
        }

        if (previousRange && !previousRange.collapsed && restoreEditorRange(previousRange, page)) {
            return true;
        }

        saveEditorSelection();
        if (page) {
            page.focus();
        }

        return false;
    }

    function getActiveTypingStyles() {
        var styles = {};

        if (currentTypingStyle.bold) {
            styles.fontWeight = "700";
        }

        if (currentTypingStyle.italic) {
            styles.fontStyle = "italic";
        }

        if (currentTypingStyle.underline) {
            styles.textDecoration = "underline";
        }

        ["fontSize", "fontFamily", "color", "backgroundColor"].forEach(function (key) {
            var value = currentTypingStyle[key];

            if (value !== null && value !== "" && value !== false && typeof value !== "undefined") {
                styles[key] = value;
            }
        });

        return styles;
    }

    function applyEditorCommand(command) {
        var page = getCurrentEditablePage();
        var selection;
        var previousRange;
        var isInlineCommand = command === "bold" || command === "italic" || command === "underline";

        if (!page || !command) {
            return;
        }

        restoreEditorSelection(page);
        selection = window.getSelection();
        previousRange = cloneEditorSelectionRange(page);

        if (
            isInlineCommand &&
            (!selection || selection.rangeCount === 0 || selection.isCollapsed || !page.contains(selection.anchorNode))
        ) {
            currentTypingStyle[command] = !currentTypingStyle[command];
            page.focus();
            updateToolbarActiveStates();
            return;
        }

        flushEditorHistorySave();
        page.focus();
        document.execCommand(command, false, null);
        keepEditorSelectionAfterToolbarAction(previousRange, page);

        if (!isInlineCommand) {
            scheduleEditorPagination();
        }

        saveEditorState();
        updateToolbarActiveStates();
    }

    function updateToolbarActiveStates() {
        var state;
        var alignMap = {
            left: "justifyLeft",
            start: "justifyLeft",
            center: "justifyCenter",
            right: "justifyRight",
            end: "justifyRight",
            justify: "justifyFull"
        };

        if (!editorPages) {
            return;
        }

        state = getEditorToolbarState();

        setToolbarControlActive('[data-editor-command="bold"]', state.bold);
        setToolbarControlActive('[data-editor-command="italic"]', state.italic);
        setToolbarControlActive('[data-editor-command="underline"]', state.underline);

        document.querySelectorAll("[data-editor-align]").forEach(function (button) {
            button.classList.toggle("is-active", button.dataset.editorAlign === (alignMap[state.textAlign] || "justifyLeft"));
        });

        setToolbarControlActive("[data-editor-back-control]", state.backgroundActive);

        updateToolbarBackgroundColor(state.backgroundColor);
    }

    function getCurrentToolbarBackgroundColor() {
        var backColorInput = document.querySelector("[data-editor-back-color]");
        var inputColor = backColorInput ? backColorInput.value : "";

        return colorToHex(inputColor) || colorToHex(currentTypingStyle.backgroundColor) || "#fff3bf";
    }

    function setCurrentToolbarBackgroundColor(color) {
        var normalizedColor = colorToHex(color) || "#fff3bf";
        var backColorInput = document.querySelector("[data-editor-back-color]");
        var backSwatch = document.querySelector("[data-editor-back-swatch]");

        if (backColorInput) {
            backColorInput.value = normalizedColor;
        }

        if (backSwatch) {
            backSwatch.style.backgroundColor = normalizedColor;
        }
    }

    function updateToolbarBackgroundColor(backgroundColor) {
        var normalizedColor = colorToHex(backgroundColor);

        if (normalizedColor) {
            setCurrentToolbarBackgroundColor(normalizedColor);
            return;
        }

        setCurrentToolbarBackgroundColor(getCurrentToolbarBackgroundColor());
    }

    function openEditorColorPicker(input) {
        if (!input) {
            return;
        }

        try {
            if (typeof input.showPicker === "function") {
                input.showPicker();
                return;
            }
        } catch (error) {
            // Some browsers reject showPicker on visually hidden inputs; click is the fallback.
        }

        input.click();
    }

    function updateEditorHistoryControls() {
        document.querySelectorAll("[data-editor-undo]").forEach(function (button) {
            button.disabled = !editorPages || editorHistoryIndex <= 0;
        });

        document.querySelectorAll("[data-editor-redo]").forEach(function (button) {
            button.disabled = !editorPages || editorHistoryIndex >= editorHistory.length - 1;
        });
    }

    function setToolbarControlActive(selector, isActive) {
        document.querySelectorAll(selector).forEach(function (control) {
            control.classList.toggle("is-active", Boolean(isActive));
        });
    }

    function getEditorToolbarState() {
        var page = getCurrentEditablePage();
        var selection = window.getSelection();
        var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
        var probeNode = range ? getEditorStyleProbeNode(range) : null;
        var probeElement = probeNode ? (probeNode.nodeType === 1 ? probeNode : probeNode.parentElement) : null;
        var computed = probeElement ? window.getComputedStyle(probeElement) : null;
        var paragraph = getCurrentParagraph();
        var paragraphStyles = paragraph ? window.getComputedStyle(paragraph) : null;
        var isCollapsed = !selection || !range || selection.isCollapsed;
        var backgroundColor = probeElement ? getEffectiveTextBackground(probeElement, page) : "";

        return {
            bold: (isCollapsed && currentTypingStyle.bold) || isComputedBold(computed),
            italic: (isCollapsed && currentTypingStyle.italic) || Boolean(computed && computed.fontStyle === "italic"),
            underline: (isCollapsed && currentTypingStyle.underline) || Boolean(computed && String(computed.textDecorationLine || computed.textDecoration || "").indexOf("underline") !== -1),
            textAlign: paragraphStyles ? normalizeTextAlign(paragraphStyles.textAlign) : "left",
            backgroundActive: Boolean((isCollapsed && hasVisibleBackground(currentTypingStyle.backgroundColor)) || hasVisibleBackground(backgroundColor)),
            backgroundColor: hasVisibleBackground(currentTypingStyle.backgroundColor) ? currentTypingStyle.backgroundColor : backgroundColor
        };
    }

    function getEditorStyleProbeNode(range) {
        var container = range.startContainer;
        var candidate;

        if (!range.collapsed) {
            return container;
        }

        if (container.nodeType === 3) {
            return container;
        }

        candidate = container.childNodes[range.startOffset] || container.childNodes[Math.max(0, range.startOffset - 1)];

        if (!candidate) {
            return container;
        }

        while (candidate && candidate.nodeType === 1 && candidate.firstChild) {
            candidate = candidate.firstChild;
        }

        return candidate || container;
    }

    function isComputedBold(computed) {
        var weight = computed ? computed.fontWeight : "";

        return weight === "bold" || Number(weight) >= 600;
    }

    function normalizeTextAlign(value) {
        if (value === "-webkit-left") {
            return "left";
        }

        if (value === "-webkit-center") {
            return "center";
        }

        if (value === "-webkit-right") {
            return "right";
        }

        return value || "left";
    }

    function getEffectiveTextBackground(element, page) {
        var current = element;

        while (current && current !== page && current.nodeType === 1) {
            var styles = window.getComputedStyle(current);
            var color = styles.backgroundColor || styles.background;

            if (hasVisibleBackground(color)) {
                return color;
            }

            current = current.parentElement;
        }

        return "";
    }

    function hasVisibleBackground(color) {
        var value = String(color || "").trim().toLowerCase();

        return Boolean(value && value !== "transparent" && value !== "rgba(0, 0, 0, 0)" && value !== "rgba(0,0,0,0)");
    }

    function colorToHex(color) {
        var value = String(color || "").trim();
        var match;
        var red;
        var green;
        var blue;

        if (/^#[0-9a-f]{6}$/i.test(value)) {
            return value;
        }

        match = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

        if (!match) {
            return "";
        }

        red = Math.max(0, Math.min(255, Number(match[1])));
        green = Math.max(0, Math.min(255, Number(match[2])));
        blue = Math.max(0, Math.min(255, Number(match[3])));

        return "#" + [red, green, blue].map(function (number) {
            return number.toString(16).padStart(2, "0");
        }).join("");
    }

    function applyEditorAlignment(command) {
        var page = getCurrentEditablePage();
        var previousRange;

        if (!page || !command) {
            return;
        }

        flushEditorHistorySave();
        restoreEditorSelection(page);
        previousRange = cloneEditorSelectionRange(page);
        document.execCommand(command, false, null);
        keepEditorSelectionAfterToolbarAction(previousRange, page);
        scheduleEditorPagination();
        saveEditorState();
        updateRulerFromSelection();
    }

    function applyInlineStyle(editablePage, styles) {
        if (!editablePage) {
            return;
        }

        restoreEditorSelection(editablePage);

        var selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !selection.anchorNode || !editablePage.contains(selection.anchorNode)) {
            Object.keys(styles).forEach(function (key) {
                currentTypingStyle[key] = styles[key];
            });
            updateToolbarActiveStates();
            return;
        }

        wrapEditorSelectionWithSpan(editablePage, styles);
    }

    function applySelectedTextBackground(editablePage, color) {
        applyBackgroundColor(color, editablePage);
    }

    function applyBackgroundColor(color, editablePage) {
        var page = editablePage || getCurrentEditablePage();
        var backgroundColor = colorToHex(color) || color || "#fff3bf";
        var selection;
        var range;

        setCurrentToolbarBackgroundColor(backgroundColor);

        if (!page) {
            currentTypingStyle.backgroundColor = backgroundColor;
            updateToolbarActiveStates();
            return;
        }

        restoreEditorSelection(page);
        selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            currentTypingStyle.backgroundColor = backgroundColor;
            page.focus();
            updateToolbarActiveStates();
            return;
        }

        range = selection.getRangeAt(0);

        if (!isEditorRangeInsidePage(range, page) || range.collapsed) {
            currentTypingStyle.backgroundColor = backgroundColor;
            page.focus();
            updateToolbarActiveStates();
            return;
        }

        wrapEditorSelectionWithSpan(page, { backgroundColor: backgroundColor });
    }

    function clearSelectionBackground(editablePage) {
        clearSelectedEditorBackground(editablePage);
    }

    function isEditorRangeInsidePage(range, page) {
        return Boolean(range && page && page.contains(range.commonAncestorContainer));
    }

    function wrapEditorSelectionWithSpan(editablePage, styles) {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var span = document.createElement("span");

        flushEditorHistorySave();

        Object.keys(styles).forEach(function (key) {
            span.style[key] = styles[key];
        });

        try {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            selection.removeAllRanges();
            var newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.addRange(newRange);
            saveEditorSelectionRange();
            scheduleEditorPagination();
            saveEditorState();
            updateToolbarActiveStates();
        } catch (error) {
            Object.keys(styles).forEach(function (key) {
                currentTypingStyle[key] = styles[key];
            });
            updateToolbarActiveStates();
        }
    }

    function handleStyledTextInput(event) {
        if (!event.target.closest("[data-editable-page]")) {
            return;
        }

        var activeTypingStyles = getActiveTypingStyles();

        if (event.inputType !== "insertText" || !event.data || !Object.keys(activeTypingStyles).length) {
            return;
        }

        var selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
            return;
        }

        event.preventDefault();

        var range = selection.getRangeAt(0);
        var span = document.createElement("span");

        Object.keys(activeTypingStyles).forEach(function (key) {
            span.style[key] = activeTypingStyles[key];
        });

        span.textContent = event.data;
        range.deleteContents();
        range.insertNode(span);
        range.setStartAfter(span);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        saveEditorSelectionRange();
        scheduleEditorHistorySave();
    }

    function clearSelectedEditorBackground(editablePage) {
        if (!editablePage) {
            return;
        }

        restoreEditorSelection(editablePage);

        var selection = window.getSelection();
        var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;

        if (!selection || !range || range.collapsed || !isEditorRangeInsidePage(range, editablePage)) {
            currentTypingStyle.backgroundColor = null;
            setToolbarControlActive("[data-editor-back-control]", false);
            updateToolbarActiveStates();
            return;
        }

        if (clearWholeBackgroundElementSelection(editablePage)) {
            currentTypingStyle.backgroundColor = null;
            updateToolbarActiveStates();
            return;
        }

        if (clearBackgroundInsideAncestorSelection(editablePage)) {
            currentTypingStyle.backgroundColor = null;
            updateToolbarActiveStates();
            return;
        }

        if (clearSingleTextNodeBackgroundSelection(editablePage)) {
            currentTypingStyle.backgroundColor = null;
            updateToolbarActiveStates();
            return;
        }

        replaceSelectionWithBackgroundlessFragment(editablePage);
        currentTypingStyle.backgroundColor = null;
        updateToolbarActiveStates();
    }

    function clearWholeBackgroundElementSelection(editablePage) {
        var selection = window.getSelection();
        var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
        var element;
        var selectsAllChildren;

        if (!range || range.collapsed || range.commonAncestorContainer.nodeType !== 1) {
            return false;
        }

        element = range.commonAncestorContainer;

        if (element === editablePage || !editablePage.contains(element)) {
            return false;
        }

        selectsAllChildren = range.startContainer === element &&
            range.endContainer === element &&
            range.startOffset === 0 &&
            range.endOffset === element.childNodes.length;

        if (!selectsAllChildren || !hasVisibleBackground(element.style.backgroundColor || window.getComputedStyle(element).backgroundColor)) {
            return false;
        }

        flushEditorHistorySave();
        removeElementBackground(element);
        selection.removeAllRanges();

        var newRange = document.createRange();
        newRange.selectNodeContents(element);
        selection.addRange(newRange);

        saveEditorSelectionRange();
        scheduleEditorPagination();
        saveEditorState();
        editablePage.focus();

        return true;
    }

    function clearBackgroundInsideAncestorSelection(editablePage) {
        var selection = window.getSelection();
        var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
        var ancestor;
        var beforeRange;
        var afterRange;
        var selectedRange;
        var beforeClone;
        var selectedClone;
        var afterClone;
        var fragment;
        var newRange;

        if (!range || range.collapsed) {
            return false;
        }

        ancestor = findBackgroundAncestor(range.commonAncestorContainer, editablePage);

        if (!ancestor || ancestor === editablePage || !ancestor.parentNode) {
            return false;
        }

        try {
            beforeRange = document.createRange();
            beforeRange.setStart(ancestor, 0);
            beforeRange.setEnd(range.startContainer, range.startOffset);

            selectedRange = range.cloneRange();

            afterRange = document.createRange();
            afterRange.setStart(range.endContainer, range.endOffset);
            afterRange.setEnd(ancestor, ancestor.childNodes.length);

            beforeClone = ancestor.cloneNode(false);
            selectedClone = ancestor.cloneNode(false);
            afterClone = ancestor.cloneNode(false);
            removeElementBackground(selectedClone);

            beforeClone.appendChild(beforeRange.cloneContents());
            selectedClone.appendChild(selectedRange.cloneContents());
            afterClone.appendChild(afterRange.cloneContents());

            if (!selectedClone.childNodes.length) {
                return false;
            }

            flushEditorHistorySave();
            fragment = document.createDocumentFragment();
            appendElementIfNotEmpty(fragment, beforeClone);
            appendElementIfNotEmpty(fragment, selectedClone);
            appendElementIfNotEmpty(fragment, afterClone);
            ancestor.parentNode.replaceChild(fragment, ancestor);

            if (selectedClone.parentNode) {
                newRange = document.createRange();
                newRange.selectNodeContents(selectedClone);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }

            saveEditorSelectionRange();
            scheduleEditorPagination();
            saveEditorState();
            editablePage.focus();
            updateToolbarActiveStates();
            return true;
        } catch (error) {
            return false;
        }
    }

    function findBackgroundAncestor(node, editablePage) {
        var element = node && (node.nodeType === 1 ? node : node.parentElement);

        while (element && element !== editablePage) {
            if (hasVisibleBackground(element.style.backgroundColor || window.getComputedStyle(element).backgroundColor)) {
                return element;
            }

            element = element.parentElement;
        }

        return null;
    }

    function clearSelectedEditorStyles(editablePage) {
        if (!editablePage) {
            return;
        }

        restoreEditorSelection(editablePage);

        var selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !editablePage.contains(selection.anchorNode)) {
            showToast("Выделите текст для очистки стилей", "warning");
            return;
        }

        flushEditorHistorySave();
        replaceSelectionWithCleanText(editablePage, {
            fontFamily: "Times New Roman",
            fontSize: "12pt",
            fontWeight: "400",
            fontStyle: "normal",
            textDecoration: "none",
            color: "#111827",
            backgroundColor: "transparent"
        });
    }

    function replaceSelectionWithCleanText(editablePage, styles) {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var span = document.createElement("span");

        Object.keys(styles).forEach(function (key) {
            span.style[key] = styles[key];
        });

        span.textContent = selection.toString();
        range.deleteContents();
        range.insertNode(span);
        selection.removeAllRanges();

        var newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
        saveEditorSelectionRange();
        scheduleEditorPagination();
        saveEditorState();
        editablePage.focus();
        updateToolbarActiveStates();
    }

    function replaceSelectionWithBackgroundlessFragment(editablePage) {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var fragment;
        var wrapper = document.createElement("span");

        flushEditorHistorySave();

        fragment = range.extractContents();
        removeBackgroundFromNode(fragment);
        wrapper.appendChild(fragment);
        wrapper.style.backgroundColor = "transparent";
        range.insertNode(wrapper);

        selection.removeAllRanges();
        var newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.addRange(newRange);

        saveEditorSelectionRange();
        scheduleEditorPagination();
        saveEditorState();
        editablePage.focus();
        updateToolbarActiveStates();
    }

    function clearSingleTextNodeBackgroundSelection(editablePage) {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var textNode = range.startContainer;
        var parent;
        var text;
        var beforeText;
        var selectedText;
        var afterText;
        var fragment;
        var beforeClone;
        var selectedNode;
        var afterClone;
        var passedTextNode = false;
        var newRange;

        if (
            range.collapsed ||
            range.startContainer !== range.endContainer ||
            textNode.nodeType !== 3 ||
            !textNode.parentElement ||
            textNode.parentElement === editablePage
        ) {
            return false;
        }

        parent = textNode.parentElement;

        if (!parent.closest("[data-editable-page]") || !hasVisibleBackground(parent.style.backgroundColor || window.getComputedStyle(parent).backgroundColor)) {
            return false;
        }

        text = textNode.textContent || "";
        beforeText = text.slice(0, range.startOffset);
        selectedText = text.slice(range.startOffset, range.endOffset);
        afterText = text.slice(range.endOffset);

        if (!selectedText) {
            return false;
        }

        flushEditorHistorySave();
        fragment = document.createDocumentFragment();
        beforeClone = parent.cloneNode(false);
        selectedNode = parent.cloneNode(false);
        afterClone = parent.cloneNode(false);

        removeElementBackground(selectedNode);

        Array.prototype.forEach.call(parent.childNodes, function (child) {
            if (child === textNode) {
                if (beforeText) {
                    beforeClone.appendChild(document.createTextNode(beforeText));
                }

                selectedNode.appendChild(document.createTextNode(selectedText));

                if (afterText) {
                    afterClone.appendChild(document.createTextNode(afterText));
                }

                passedTextNode = true;
                return;
            }

            if (passedTextNode) {
                afterClone.appendChild(child.cloneNode(true));
            } else {
                beforeClone.appendChild(child.cloneNode(true));
            }
        });

        appendElementIfNotEmpty(fragment, beforeClone);
        appendElementIfNotEmpty(fragment, selectedNode);
        appendElementIfNotEmpty(fragment, afterClone);
        parent.parentNode.replaceChild(fragment, parent);

        if (selectedNode && selectedNode.parentNode) {
            newRange = document.createRange();
            newRange.selectNodeContents(selectedNode);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }

        saveEditorSelectionRange();
        scheduleEditorPagination();
        saveEditorState();
        editablePage.focus();
        updateToolbarActiveStates();

        return true;
    }

    function appendElementIfNotEmpty(fragment, element) {
        if (element && element.childNodes.length) {
            fragment.appendChild(element);
        }
    }

    function removeBackgroundFromNode(node) {
        if (!node) {
            return;
        }

        if (node.nodeType === 1) {
            removeElementBackground(node);
        }

        if (node.querySelectorAll) {
            Array.prototype.forEach.call(node.querySelectorAll("[style]"), function (element) {
                removeElementBackground(element);
            });
        }
    }

    function removeElementBackground(element) {
        if (!element || !element.style) {
            return;
        }

        element.style.background = "";
        element.style.backgroundColor = "";
        element.style.removeProperty("background");
        element.style.removeProperty("background-color");

        if (!element.getAttribute("style")) {
            element.removeAttribute("style");
        }
    }

    function getSelectionTextStyles() {
        var selection = window.getSelection();
        var node = selection && selection.anchorNode;
        var element = node && (node.nodeType === 1 ? node : node.parentElement);
        var styles = element ? window.getComputedStyle(element) : null;

        if (!styles) {
            return {};
        }

        return {
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            fontStyle: styles.fontStyle,
            textDecoration: styles.textDecorationLine || styles.textDecoration,
            color: styles.color
        };
    }

    function initializeRuler(ruler) {
        var activeHandle = null;
        var bubble = ruler.querySelector("[data-ruler-bubble]");
        var stepCm = 0.25;
        var maxCm = 16;

        ruler.querySelectorAll("[data-ruler-handle]").forEach(function (handle) {
            handle.addEventListener("mousedown", function (event) {
                event.preventDefault();
                activeHandle = handle;
                showRulerBubble(bubble, handle, getHandleCm(handle));
            });
        });

        document.addEventListener("mousemove", function (event) {
            if (!activeHandle) {
                return;
            }

            var cm = Math.max(0, Math.min(maxCm, Math.round(getRulerCmFromClientX(ruler, event.clientX) / stepCm) * stepCm));
            setHandleCm(activeHandle, cm);
            applyRulerValue(activeHandle.dataset.rulerHandle, cm);
            showRulerBubble(bubble, activeHandle, cm);
        });

        document.addEventListener("mouseup", function () {
            if (activeHandle && bubble) {
                bubble.classList.remove("is-visible");
                saveEditorState();
                scheduleEditorPagination();
            }

            activeHandle = null;
        });

        updateRulerFromSelection();
    }

    function getRulerScaleRect(ruler) {
        var scale = ruler.querySelector(".ruler-scale");
        return (scale || ruler).getBoundingClientRect();
    }

    function getRulerCmFromClientX(ruler, clientX) {
        var rect = getRulerScaleRect(ruler);
        return ((clientX - rect.left) / rect.width) * 16;
    }

    function getHandleCm(handle) {
        var parent = handle.closest("[data-editor-ruler]");
        var rect = getRulerScaleRect(parent);
        var handleRect = handle.getBoundingClientRect();
        var center = handleRect.left + handleRect.width / 2;
        return Math.round(((center - rect.left) / rect.width * 16) * 4) / 4;
    }

    function setHandleCm(handle, cm) {
        var ruler = handle.closest("[data-editor-ruler]");
        var rulerRect = ruler.getBoundingClientRect();
        var scaleRect = getRulerScaleRect(ruler);
        var x = scaleRect.left - rulerRect.left + (cm / 16) * scaleRect.width;
        handle.style.left = x / rulerRect.width * 100 + "%";
        handle.dataset.cm = String(cm);
    }

    function applyRulerValue(type, cm) {
        var px = cm * 37.8;
        var pages = document.querySelectorAll("[data-editable-page]");

        if (type === "page-left") {
            pages.forEach(function (page) {
                page.style.paddingLeft = 48 + px + "px";
            });
        } else if (type === "page-right") {
            pages.forEach(function (page) {
                page.style.paddingRight = 48 + Math.max(0, 16 * 37.8 - px) + "px";
            });
        } else if (type === "paragraph") {
            applyToCurrentParagraph(function (paragraph) {
                paragraph.style.marginLeft = px + "px";
            });
        } else if (type === "line") {
            applyToCurrentParagraph(function (paragraph) {
                paragraph.style.textIndent = px + "px";
            });
        }
    }

    function applyToCurrentParagraph(callback) {
        var selection = window.getSelection();
        var node = selection && selection.anchorNode;
        var element = node && (node.nodeType === 1 ? node : node.parentElement);
        var paragraph = element ? element.closest("p, li, div, h1, h2, h3") : null;

        if (!paragraph || !paragraph.closest("[data-editable-page]")) {
            paragraph = getCurrentEditablePage();
        }

        callback(paragraph);
    }

    function updateRulerFromSelection() {
        var ruler = document.querySelector("[data-editor-ruler]");
        var page = getCurrentEditablePage();

        if (!ruler || !page) {
            return;
        }

        var pageStyles = window.getComputedStyle(page);
        var paragraph = getCurrentParagraph();
        var paragraphStyles = paragraph ? window.getComputedStyle(paragraph) : null;
        var leftPaddingCm = Math.max(0, ((parseFloat(pageStyles.paddingLeft) || 48) - 48) / 37.8);
        var rightPaddingCm = Math.max(0, ((parseFloat(pageStyles.paddingRight) || 48) - 48) / 37.8);
        var paragraphCm = paragraphStyles ? Math.max(0, (parseFloat(paragraphStyles.marginLeft) || 0) / 37.8) : 0;
        var lineCm = paragraphStyles ? Math.max(0, (parseFloat(paragraphStyles.textIndent) || 0) / 37.8) : 0;

        setHandleCm(ruler.querySelector('[data-ruler-handle="page-left"]'), Math.min(16, leftPaddingCm));
        setHandleCm(ruler.querySelector('[data-ruler-handle="page-right"]'), Math.max(0, 16 - rightPaddingCm));
        setHandleCm(ruler.querySelector('[data-ruler-handle="paragraph"]'), Math.min(16, paragraphCm));
        setHandleCm(ruler.querySelector('[data-ruler-handle="line"]'), Math.min(16, lineCm));
    }

    function getCurrentParagraph() {
        var selection = window.getSelection();
        var node = selection && selection.anchorNode;
        var element = node && (node.nodeType === 1 ? node : node.parentElement);
        var paragraph = element ? element.closest("p, li, div, h1, h2, h3, td, th") : null;

        if (paragraph && paragraph.closest("[data-editable-page]")) {
            return paragraph;
        }

        return getCurrentEditablePage();
    }

    function showRulerBubble(bubble, handle, cm) {
        if (!bubble) {
            return;
        }

        var normalized = Math.round(cm * 10) / 10;
        var text = normalized.toString().replace(".", ",");
        bubble.textContent = text + " см";
        bubble.style.left = handle.style.left || "0%";
        bubble.classList.add("is-visible");
    }

    function enhanceEditorTables(root) {
        var scope = root || document;

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

        if (!colHandle && !rowHandle) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        var cell = event.target.closest("td, th");
        var table = cell.closest("table");
        var row = cell.parentElement;
        var cellIndex = Array.prototype.indexOf.call(row.children, cell);
        var firstRowCells = table.rows.length ? Array.prototype.slice.call(table.rows[0].cells) : [];
        var columnWidths = firstRowCells.map(function (firstRowCell) {
            return firstRowCell.getBoundingClientRect().width;
        });

        columnWidths.forEach(function (width, index) {
            setEditorTableColumnWidth(table, index, width);
        });

        table.classList.add("is-resizing");

        tableResizeState = {
            type: colHandle ? "col" : "row",
            table: table,
            row: row,
            cellIndex: cellIndex,
            nextCellIndex: cellIndex < firstRowCells.length - 1 ? cellIndex + 1 : null,
            columnWidths: columnWidths,
            startX: event.clientX,
            startY: event.clientY,
            startWidth: cell.getBoundingClientRect().width,
            startHeight: cell.getBoundingClientRect().height
        };
    }

    function resizeEditorTable(event) {
        if (!tableResizeState) {
            return;
        }

        if (tableResizeState.type === "col") {
            resizeEditorTableColumn(event);
        } else {
            resizeEditorTableRow(event);
        }
    }

    function resizeEditorTableColumn(event) {
        var table = tableResizeState.table;
        var page = table.closest("[data-editable-page]");
        var pageStyles = window.getComputedStyle(page);
        var contentWidth = page.clientWidth - (parseFloat(pageStyles.paddingLeft) || 0) - (parseFloat(pageStyles.paddingRight) || 0);
        var delta = event.clientX - tableResizeState.startX;
        var currentStartWidth = tableResizeState.columnWidths[tableResizeState.cellIndex] || tableResizeState.startWidth;
        var nextIndex = tableResizeState.nextCellIndex;

        if (nextIndex !== null) {
            var nextStartWidth = tableResizeState.columnWidths[nextIndex] || 30;
            var minDelta = 30 - currentStartWidth;
            var maxDelta = nextStartWidth - 30;
            var clampedDelta = Math.max(minDelta, Math.min(maxDelta, delta));

            setEditorTableColumnWidth(table, tableResizeState.cellIndex, currentStartWidth + clampedDelta);
            setEditorTableColumnWidth(table, nextIndex, nextStartWidth - clampedDelta);
            return;
        }

        var otherWidth = tableResizeState.columnWidths.reduce(function (sum, width, index) {
            return index === tableResizeState.cellIndex ? sum : sum + width;
        }, 0);
        var maxWidth = Math.max(30, contentWidth - otherWidth);
        var nextWidth = Math.max(30, Math.min(maxWidth, currentStartWidth + delta));

        setEditorTableColumnWidth(table, tableResizeState.cellIndex, nextWidth);
    }

    function setEditorTableColumnWidth(table, columnIndex, width) {
        Array.prototype.forEach.call(table.rows, function (row) {
            var cell = row.cells[columnIndex];

            if (cell) {
                cell.style.width = Math.round(width) + "px";
            }
        });
    }

    function resizeEditorTableRow(event) {
        var nextHeight = Math.max(22, tableResizeState.startHeight + event.clientY - tableResizeState.startY);

        Array.prototype.forEach.call(tableResizeState.row.cells, function (cell) {
            cell.style.height = nextHeight + "px";
        });
    }

    function stopTableResize() {
        if (!tableResizeState) {
            return;
        }

        tableResizeState.table.classList.remove("is-resizing");
        tableResizeState = null;
        scheduleEditorPagination();
        saveEditorState();
    }

    function getEditorSnapshot() {
        return {
            pages: Array.prototype.map.call(editorPages.querySelectorAll("[data-editable-page]"), function (page) {
                var clone = page.cloneNode(true);
                clone.querySelectorAll(".editor-page-number, .table-resize-handle").forEach(function (node) {
                    node.remove();
                });

                return {
                    html: clone.innerHTML,
                    orientation: page.dataset.orientation || "portrait"
                };
            })
        };
    }

    function saveEditorState() {
        if (restoringEditorHistory || !editorPages) {
            return;
        }

        var snapshot = getEditorSnapshot();
        var serialized = JSON.stringify(snapshot);
        var current = editorHistory[editorHistoryIndex];

        if (current && current.serialized === serialized) {
            return;
        }

        editorHistory = editorHistory.slice(0, editorHistoryIndex + 1);
        editorHistory.push({ serialized: serialized, snapshot: snapshot });

        if (editorHistory.length > 100) {
            editorHistory.shift();
        }

        editorHistoryIndex = editorHistory.length - 1;
        updateEditorHistoryControls();
        markEditorDirty();
    }

    function markEditorDirty() {
        if (!editorState || !editorState.autosaveUrl) {
            return;
        }

        editorState.dirty = true;
        markDraftDirty();
        scheduleEditorAutosave();
    }

    function scheduleEditorAutosave() {
        if (!editorState.autosaveUrl) {
            return;
        }

        if (draftSaveRoot) {
            scheduleDraftAutosave();
            return;
        }

        window.clearTimeout(editorState.autosaveTimer);
        editorState.autosaveTimer = window.setTimeout(function () {
            saveEditorStateToServer(false, { reason: "autosave" }).catch(function () {
                showToast("Черновик может быть не сохранен", "warning");
            });
        }, DRAFT_AUTOSAVE_DELAY);
    }

    function flushEditorAutosave(useBeacon) {
        window.clearTimeout(editorState.autosaveTimer);
        window.clearTimeout(draftSaveState.autosaveTimer);

        if (editorState.dirty) {
            saveEditorStateToServer(Boolean(useBeacon), { reason: "exit" }).catch(function () {});
        }
    }

    function getEditorDocumentHtml() {
        var clone = editorPages.cloneNode(true);
        clone.querySelectorAll(".editor-page-number, .table-resize-handle, [data-page-orientation-toggle]").forEach(function (node) {
            node.remove();
        });
        return clone.innerHTML;
    }

    function saveEditorStateToServer(useBeacon, options) {
        options = options || {};

        if (!editorState.autosaveUrl || editorState.isAutosaving || (!editorState.dirty && !options.force)) {
            return Promise.resolve();
        }

        var payload = {
            document_html: getEditorDocumentHtml(),
            document_json: getEditorSnapshot(),
            _csrf_token: window.getCsrfToken ? window.getCsrfToken() : ""
        };

        if (useBeacon && navigator.sendBeacon) {
            var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
            navigator.sendBeacon(editorState.autosaveUrl, blob);
            editorState.dirty = false;
            if (!options.suppressDraftUi) {
                markDraftSaved();
            }
            return Promise.resolve();
        }

        editorState.isAutosaving = true;

        return fetch(editorState.autosaveUrl, {
            method: "PATCH",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify(payload)
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Черновик может быть не сохранен");
                }

                return response.json();
            })
            .then(function (data) {
                editorState.dirty = false;
                if (!options.suppressDraftUi) {
                    markDraftSaved();
                    if (options.reason === "autosave") {
                        showToast("Черновик автоматически сохранен", "success");
                    }
                }
                return data;
            })
            .catch(function () {
                editorState.dirty = true;
                markDraftDirty();
                throw new Error("Черновик может быть не сохранен");
            })
            .finally(function () {
                editorState.isAutosaving = false;
            });
    }

    function undoEditor() {
        flushEditorHistorySave();
        undoEditorState();

        if (getCurrentEditablePage()) {
            getCurrentEditablePage().focus();
        }

        updateEditorHistoryControls();
        updateToolbarActiveStates();
    }

    function redoEditor() {
        flushEditorHistorySave();
        redoEditorState();

        if (getCurrentEditablePage()) {
            getCurrentEditablePage().focus();
        }

        updateEditorHistoryControls();
        updateToolbarActiveStates();
    }

    function undoEditorState() {
        if (!editorPages || editorHistoryIndex <= 0) {
            return;
        }

        editorHistoryIndex -= 1;
        restoreEditorSnapshot(editorHistory[editorHistoryIndex].snapshot);
        markEditorDirty();
    }

    function redoEditorState() {
        if (!editorPages || editorHistoryIndex >= editorHistory.length - 1) {
            return;
        }

        editorHistoryIndex += 1;
        restoreEditorSnapshot(editorHistory[editorHistoryIndex].snapshot);
        markEditorDirty();
    }

    function restoreEditorSnapshot(snapshot) {
        restoringEditorHistory = true;
        editorPages.innerHTML = "";

        snapshot.pages.forEach(function (pageData, index) {
            var page = appendEditorPage(index + 1, pageData.orientation || "portrait");
            page.innerHTML = pageData.html;
        });

        updateEditorPageNumbers();
        enhanceEditorTables(editorPages);
        setCurrentEditablePage(editorPages.querySelector("[data-editable-page]"));
        if (currentEditablePage) {
            currentEditablePage.focus();
        }
        restoringEditorHistory = false;
        updateEditorHistoryControls();
        updateToolbarActiveStates();
    }

    function setPreviewExportUrl(url) {
        if (!previewModal) {
            return;
        }

        previewModal.querySelectorAll("[data-report-export-root]").forEach(function (root) {
            root.dataset.reportExportUrl = url || "";
        });
    }

    function toggleReportExportMenu(root) {
        if (!root || reportExportState.isExporting) {
            return;
        }

        var menu = root.querySelector("[data-report-export-menu]");
        var toggle = root.querySelector("[data-report-export-toggle]");
        var shouldOpen = !root.classList.contains("is-open");

        closeReportExportMenus();

        if (!menu || !toggle || !shouldOpen) {
            return;
        }

        root.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        menu.hidden = false;
    }

    function closeReportExportMenus() {
        document.querySelectorAll("[data-report-export-root].is-open").forEach(function (root) {
            var menu = root.querySelector("[data-report-export-menu]");
            var toggle = root.querySelector("[data-report-export-toggle]");

            root.classList.remove("is-open");

            if (toggle) {
                toggle.setAttribute("aria-expanded", "false");
            }

            if (menu) {
                menu.hidden = true;
            }
        });
    }

    function startReportExport(root, format) {
        var exportUrl = getReportExportUrl(root, format);

        if (!root || !format || !exportUrl || reportExportState.isExporting) {
            if (!exportUrl) {
                showToast("Не удалось определить отчет для экспорта", "error");
            }
            return;
        }

        closeReportExportMenus();
        setReportExportLoading(root, true);

        ensureCurrentReportSavedBeforeExport()
            .then(function () {
                return fetch(exportUrl, {
                    method: "POST",
                    headers: {
                        "Accept": "*/*",
                        "X-Requested-With": "XMLHttpRequest"
                    }
                });
            })
            .then(function (response) {
                if (!response.ok) {
                    return response.json().catch(function () {
                        return {};
                    }).then(function (data) {
                        throw new Error(data.error || data.message || "Не удалось сформировать файл экспорта");
                    });
                }

                return response.blob().then(function (blob) {
                    return {
                        blob: blob,
                        filename: getFilenameFromDisposition(response.headers.get("Content-Disposition")) ||
                            "report." + format
                    };
                });
            })
            .then(function (download) {
                triggerBrowserDownload(download.blob, download.filename);
                showToast("Файл экспорта сформирован", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось сформировать файл экспорта", "error");
            })
            .finally(function () {
                setReportExportLoading(root, false);
            });
    }

    function getReportExportUrl(root, format) {
        var urlTemplate = "";

        if (root) {
            urlTemplate = root.dataset.reportExportUrl || "";
        }

        if (!urlTemplate && editorRoot) {
            urlTemplate = editorRoot.dataset.reportExportUrl || "";
        }

        if (!urlTemplate && dashboardPreviewExportUrl) {
            urlTemplate = dashboardPreviewExportUrl;
        }

        return urlTemplate ? urlTemplate.replace("__format__", encodeURIComponent(format)) : "";
    }

    function setReportExportLoading(root, isLoading) {
        reportExportState.isExporting = isLoading;

        document.querySelectorAll("[data-report-export-root]").forEach(function (exportRoot) {
            var isCurrent = exportRoot === root;
            exportRoot.classList.toggle("is-exporting", isLoading && isCurrent);
            exportRoot.querySelectorAll("button").forEach(function (button) {
                button.disabled = isLoading;
            });

            var label = exportRoot.querySelector("[data-report-export-label]");
            if (label) {
                label.textContent = isLoading && isCurrent ? "Формируем..." : "Экспорт";
            }
        });
    }

    function ensureCurrentReportSavedBeforeExport() {
        if (!editorRoot || !editorState) {
            return Promise.resolve();
        }

        return waitForEditorAutosaveIdle().then(function () {
            if (!editorState.dirty) {
                return Promise.resolve();
            }

            window.clearTimeout(editorState.autosaveTimer);
            window.clearTimeout(draftSaveState.autosaveTimer);

            return saveEditorStateToServer(false, {
                force: true,
                reason: "manual"
            }).then(function () {
                markDraftSaved();
            });
        });
    }

    function waitForEditorAutosaveIdle() {
        if (!editorState || !editorState.isAutosaving) {
            return Promise.resolve();
        }

        return wait(120).then(waitForEditorAutosaveIdle);
    }

    function getFilenameFromDisposition(disposition) {
        var utfMatch;
        var asciiMatch;

        if (!disposition) {
            return "";
        }

        utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utfMatch) {
            return decodeURIComponent(utfMatch[1]);
        }

        asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
        return asciiMatch ? asciiMatch[1] : "";
    }

    function triggerBrowserDownload(blob, filename) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function openDashboardPreviewFromCard(card) {
        if (!card || !card.dataset.dashboardPreviewUrl) {
            return;
        }

        closeCardMenus();
        loadPreview(card.dataset.dashboardPreviewUrl, card);
    }

    function loadPreview(url, card) {
        if (!previewModal || !url) {
            return;
        }

        activeDashboardPreviewCard = card || null;
        dashboardPreviewReportId = card ? String(card.dataset.reportId || "") : "";
        dashboardPreviewFolderUpdateUrl = "";
        dashboardPreviewLinkUpdateUrl = "";
        dashboardPreviewExportUrl = "";
        setPreviewExportUrl("");
        updateDashboardPreviewShares([]);
        closeDashboardPreviewSharesDropdown();
        updateDashboardPreviewFolderDisplay(card ? card.dataset.folderId || "" : "", "");
        updateDashboardPreviewLinkDisplay("", "", "");
        renderDashboardPreviewPlaceholder(card ? card.dataset.reportTitle : "");
        setDashboardPreviewLoading(true);
        openModal(previewModal);

        Promise.all([
            fetch(url).then(function (response) {
                if (!response.ok) {
                    throw new Error("Не удалось загрузить предварительный просмотр.");
                }

                return response.json();
            }),
            wait(420)
        ])
            .then(function (results) {
                renderDashboardPreview(results[0]);
                setDashboardPreviewLoading(false);
            })
            .catch(function (error) {
                setDashboardPreviewLoading(false);
                showToast(error.message, "error");
            });
    }

    function setDashboardPreviewLoading(isLoading) {
        if (dashboardPreviewStage) {
            dashboardPreviewStage.classList.toggle("is-loading", isLoading);
        }

        if (dashboardPreviewDocument) {
            dashboardPreviewDocument.classList.toggle("is-blurred", isLoading);
        }
    }

    function renderDashboardPreviewPlaceholder(title) {
        if (!dashboardPreviewDocument) {
            return;
        }

        dashboardPreviewDocument.innerHTML = "";
        dashboardPreviewDocument.appendChild(
            createDashboardPreviewPages({
                report_title: title || "Подготавливаем предпросмотр",
                report_date: "—",
                tag: "",
                template_title: "—",
                blocks: []
            })
        );
    }

    function renderDashboardPreview(data) {
        if (!dashboardPreviewDocument) {
            return;
        }

        dashboardPreviewDocument.innerHTML = "";
        dashboardPreviewDocument.appendChild(createDashboardPreviewPages(data));

        dashboardPreviewFolderUpdateUrl = data.folder_update_url || "";
        dashboardPreviewLinkUpdateUrl = data.link_update_url || "";
        dashboardPreviewExportUrl = data.export_url || "";
        dashboardPreviewReportId = data.id ? String(data.id) : dashboardPreviewReportId;
        setPreviewExportUrl(dashboardPreviewExportUrl);
        updateDashboardPreviewFolderDisplay(data.folder_id || "", data.folder_name || "");
        updateDashboardPreviewLinkDisplay(data.linked_report_id || "", data.linked_report_title || "", data.linked_report_url || "");
        updateDashboardPreviewShares(data.shares || []);

        if (dashboardPreviewEdit) {
            if (data.editor_url) {
                dashboardPreviewEdit.href = data.editor_url;
                dashboardPreviewEdit.classList.remove("is-disabled");
                dashboardPreviewEdit.removeAttribute("aria-disabled");
            } else {
                dashboardPreviewEdit.href = "#";
                dashboardPreviewEdit.classList.add("is-disabled");
                dashboardPreviewEdit.setAttribute("aria-disabled", "true");
            }
        }
    }

    function createDashboardPreviewPages(data) {
        if (data.document_html && data.document_html.trim()) {
            return createDashboardPreviewPagesFromEditorHtml(data);
        }

        var pages = document.createElement("div");
        var blocks = data.blocks || [];
        var contentPage = null;

        pages.className = "dashboard-preview-pages";
        pages.appendChild(createDashboardPreviewTitlePage(data));

        blocks.forEach(function (block, index) {
            if (!contentPage || index % 4 === 0) {
                contentPage = createDashboardPreviewContentPage(Math.floor(index / 4) + 2);
                pages.appendChild(contentPage);
            }

            contentPage.appendChild(createDashboardPreviewBlock(block));
        });

        if (!blocks.length) {
            contentPage = createDashboardPreviewContentPage(2);
            contentPage.appendChild(createDashboardPreviewEmptyBlock());
            pages.appendChild(contentPage);
        }

        return pages;
    }

    function createDashboardPreviewPagesFromEditorHtml(data) {
        var pages = document.createElement("div");
        var source = document.createElement("div");
        var editorPagesList;

        pages.className = "dashboard-preview-pages";
        source.innerHTML = data.document_html || "";
        editorPagesList = source.querySelectorAll(".editable-page, [data-editable-page]");

        if (!editorPagesList.length) {
            return createDashboardPreviewPages({
                report_title: data.report_title,
                report_date: data.report_date,
                tag: data.tag,
                template_title: data.template_title,
                report_author: data.report_author,
                source_filename: data.source_filename,
                source_type: data.source_type,
                blocks: data.blocks || [],
                document_html: ""
            });
        }

        Array.prototype.forEach.call(editorPagesList, function (pageNode, index) {
            var sheet = document.createElement("section");
            var pageClone = pageNode.cloneNode(true);
            var wrapper = pageNode.closest(".editor-page-wrapper");

            pageClone.removeAttribute("contenteditable");
            pageClone.removeAttribute("data-editable-page");
            pageClone.removeAttribute("spellcheck");
            pageClone.querySelectorAll(".editor-page-number, .table-resize-handle, [data-page-orientation-toggle], [data-editor-caret-marker], .editor-caret-marker").forEach(function (node) {
                node.remove();
            });

            sheet.className = "dashboard-preview-sheet dashboard-document-sheet";

            if (wrapper && wrapper.classList.contains("is-landscape")) {
                sheet.classList.add("is-landscape");
            }

            sheet.innerHTML = pageClone.innerHTML;

            if (index > 0) {
                sheet.appendChild(createDashboardPreviewPageNumber(index + 1));
            }

            pages.appendChild(sheet);
        });

        return pages;
    }

    function createDashboardPreviewTitlePage(data) {
        var sheet = document.createElement("section");
        var title = document.createElement("h1");
        var meta = document.createElement("dl");

        sheet.className = "dashboard-preview-sheet dashboard-document-sheet dashboard-preview-title-page";
        title.textContent = data.report_title || "Без названия";
        meta.className = "dashboard-preview-meta";

        appendPreviewMeta(meta, "Дата отчета", data.report_date || "—");
        appendPreviewMeta(meta, "Тег", data.tag || "Не указан");
        appendPreviewMeta(meta, "Шаблон", data.template_title || "—");
        appendPreviewMeta(meta, "Автор", data.report_author || "Пользователь");
        appendPreviewMeta(meta, "Источник", data.source_filename || data.source_type || "manual");

        sheet.appendChild(title);
        sheet.appendChild(meta);

        return sheet;
    }

    function appendPreviewMeta(parent, label, value) {
        var row = document.createElement("div");
        var dt = document.createElement("dt");
        var dd = document.createElement("dd");

        dt.textContent = label;
        dd.textContent = value || "—";
        row.appendChild(dt);
        row.appendChild(dd);
        parent.appendChild(row);
    }

    function createDashboardPreviewContentPage(number) {
        var sheet = document.createElement("section");

        sheet.className = "dashboard-preview-sheet dashboard-document-sheet";

        if (number > 1) {
            sheet.appendChild(createDashboardPreviewPageNumber(number));
        }

        return sheet;
    }

    function createDashboardPreviewBlock(block) {
        var blockElement = document.createElement("div");
        var rows = block.rows || [];
        var items = block.items || [];

        blockElement.className = "dashboard-document-block";

        if (rows.length) {
            blockElement.appendChild(createDashboardPreviewTable(rows));
        } else if (items.length) {
            blockElement.appendChild(createDashboardPreviewList(items));
        } else {
            var paragraph = document.createElement("p");
            paragraph.textContent = block.content_text || "Пустой блок";
            blockElement.appendChild(paragraph);
        }

        return blockElement;
    }

    function createDashboardPreviewTable(rows) {
        var wrap = document.createElement("div");
        var table = document.createElement("table");

        wrap.className = "dashboard-preview-table-wrap";
        table.className = "dashboard-preview-table";

        rows.forEach(function (row) {
            var tr = document.createElement("tr");

            row.forEach(function (cell) {
                var td = document.createElement("td");
                td.textContent = cell || "";
                tr.appendChild(td);
            });

            table.appendChild(tr);
        });

        wrap.appendChild(table);
        return wrap;
    }

    function createDashboardPreviewList(items) {
        var list = document.createElement("ul");

        items.forEach(function (item) {
            var li = document.createElement("li");
            li.textContent = item;
            list.appendChild(li);
        });

        return list;
    }

    function createDashboardPreviewEmptyBlock() {
        var emptyBlock = document.createElement("div");
        emptyBlock.className = "dashboard-document-block dashboard-document-empty";
        emptyBlock.textContent = "Импортированные данные не добавлены. Отчет доступен как ручной черновик.";
        return emptyBlock;
    }

    function createDashboardPreviewPageNumber(number) {
        var pageNumber = document.createElement("div");
        pageNumber.className = "dashboard-preview-page-number";
        pageNumber.textContent = number;
        return pageNumber;
    }

    function wait(delay) {
        return new Promise(function (resolve) {
            window.setTimeout(resolve, delay);
        });
    }

    function filterReportCards(query) {
        var normalizedQuery = query.trim().toLowerCase();

        reportCards.forEach(function (card) {
            var title = (card.dataset.reportTitle || "").toLowerCase();
            var tag = (card.dataset.reportTag || "").toLowerCase();
            var folderId = card.dataset.folderId || "";
            var matchesSearch = !normalizedQuery || title.indexOf(normalizedQuery) !== -1 || tag.indexOf(normalizedQuery) !== -1;
            var matchesFolder = !activeFolderFilter || folderId === activeFolderFilter;

            card.classList.toggle("is-hidden", !(matchesSearch && matchesFolder));
        });
    }

    function setSelectionMode(isActive) {
        selectionMode = isActive;

        if (selectToggle) {
            selectToggle.classList.toggle("is-active", selectionMode);
            selectToggle.setAttribute("aria-pressed", selectionMode ? "true" : "false");
        }

        reportCards.forEach(function (card) {
            card.classList.toggle("is-selectable", selectionMode);

            if (!selectionMode) {
                card.classList.remove("is-selected");
            }
        });
    }

    function openModal(modal) {
        if (!modal) {
            return;
        }

        lockPageScroll();
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        appState.activeModal = modal.dataset.modal || null;
    }

    function closeModal(modal) {
        if (!modal) {
            return;
        }

        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        if (appState.activeModal === modal.dataset.modal) {
            appState.activeModal = null;
        }
        updateModalOpenState();
    }

    function closeCardMenus(exceptCard) {
        document.querySelectorAll(".report-card.menu-open").forEach(function (card) {
            if (card === exceptCard) {
                return;
            }

            card.classList.remove("menu-open");
            var menuButton = card.querySelector("[data-report-menu-button]");

            if (menuButton) {
                menuButton.setAttribute("aria-expanded", "false");
            }
        });

        document.querySelectorAll("[data-card-menu].open").forEach(function (menu) {
            menu.classList.remove("open");
        });
    }

    function updateModalOpenState() {
        var hasOpenModal = document.querySelector(".modal-backdrop.is-open") !== null;

        if (!hasOpenModal) {
            unlockPageScrollIfNeeded();
        }
    }

    function getScrollbarWidth() {
        return window.innerWidth - document.documentElement.clientWidth;
    }

    function lockPageScroll() {
        var scrollbarWidth = getScrollbarWidth();

        document.documentElement.classList.add("modal-open");
        document.body.classList.add("modal-open");

        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + "px";
        }
    }

    function unlockPageScrollIfNeeded() {
        var hasOpenModal = document.querySelector(".modal-backdrop.is-open") !== null;

        if (hasOpenModal) {
            return;
        }

        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
        document.body.style.paddingRight = "";
    }

    function showToast(message, category) {
        var stack = document.querySelector(".toast-stack");

        if (!stack) {
            stack = document.createElement("div");
            stack.className = "toast-stack";
            document.body.appendChild(stack);
        }

        var normalizedCategory = category || "success";

        if (normalizedCategory === "danger") {
            normalizedCategory = "error";
        }

        var toast = document.createElement("div");
        toast.className = "toast toast-" + normalizedCategory;
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");

        var icon = document.createElement("span");
        icon.className = "toast-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = normalizedCategory === "success" ? "✓" : normalizedCategory === "warning" ? "!" : "×";

        var text = document.createElement("span");
        text.className = "toast-message";
        text.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(text);
        stack.appendChild(toast);
        autoHideToast(toast);
    }

    initUserSettingsPage();

    function initUserSettingsPage() {
        var root = document.querySelector("[data-user-settings-page]");
        var dataNode = document.querySelector("[data-user-settings-data]");

        if (!root || !dataNode) {
            return;
        }

        var payload = {};

        try {
            payload = JSON.parse(dataNode.textContent || "{}");
        } catch (error) {
            payload = {};
        }

        var state = {
            values: Object.assign({}, payload.values || {}),
            groups: payload.groups || [],
            isSaving: false
        };

        renderUserSettingsGroups(state);
        bindUserSettingsEvents(root, state);
    }

    function bindUserSettingsEvents(root, state) {
        root.querySelectorAll("[data-user-settings-tab]").forEach(function (button) {
            button.addEventListener("click", function () {
                setUserSettingsPanel(root, button.dataset.userSettingsTab || "profile");
            });
        });

        root.querySelectorAll("[data-user-settings-save]").forEach(function (button) {
            button.addEventListener("click", function () {
                saveUserSettings(root, state, button);
            });
        });

        bindUserAvatarUploader(root);

        root.addEventListener("click", function (event) {
            var toggle = event.target.closest("[data-user-setting-toggle]");

            if (!toggle) {
                return;
            }

            var key = toggle.dataset.userSettingToggle || "";

            if (!key) {
                return;
            }

            state.values[key] = !Boolean(state.values[key]);
            updateUserSettingsToggle(toggle, state.values[key]);
            setUserSettingsStatus(root, "Есть несохраненные изменения.");
        });

        root.addEventListener("change", function (event) {
            var select = event.target.closest("[data-user-setting-select]");

            if (!select) {
                return;
            }

            state.values[select.dataset.userSettingSelect || ""] = select.value;
            setUserSettingsStatus(root, "Есть несохраненные изменения.");
        });
    }

    function bindUserAvatarUploader(root) {
        var uploader = root.querySelector("[data-user-avatar-uploader]");
        var fileInput = root.querySelector("[data-user-avatar-file]");
        var previewImage = root.querySelector("[data-user-avatar-preview-image]");
        var previewLetter = root.querySelector("[data-user-avatar-preview-letter]");
        var dropText = root.querySelector("[data-user-avatar-drop-text]");
        var resetButton = root.querySelector("[data-user-avatar-reset]");
        var avatarUrlInput = root.querySelector("[data-user-avatar-url]");

        if (!uploader || !fileInput || !previewImage || !previewLetter) {
            return;
        }

        var defaultDropText = dropText ? dropText.textContent : "";
        var initialImageSrc = previewImage.hidden ? "" : previewImage.getAttribute("src") || "";

        ["dragenter", "dragover"].forEach(function (eventName) {
            uploader.addEventListener(eventName, function (event) {
                event.preventDefault();
                uploader.classList.add("is-dragover");
            });
        });

        ["dragleave", "dragend"].forEach(function (eventName) {
            uploader.addEventListener(eventName, function () {
                uploader.classList.remove("is-dragover");
            });
        });

        uploader.addEventListener("drop", function (event) {
            event.preventDefault();
            uploader.classList.remove("is-dragover");

            if (!event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) {
                return;
            }

            setAvatarFile(fileInput, event.dataTransfer.files[0], function (file) {
                previewAvatarFile(file, previewImage, previewLetter, dropText);
            });
        });

        fileInput.addEventListener("change", function () {
            if (!fileInput.files || !fileInput.files.length) {
                return;
            }

            if (!previewAvatarFile(fileInput.files[0], previewImage, previewLetter, dropText)) {
                fileInput.value = "";
            }
        });

        if (resetButton) {
            resetButton.addEventListener("click", function () {
                fileInput.value = "";

                if (avatarUrlInput && avatarUrlInput.value.trim()) {
                    showAvatarImage(avatarUrlInput.value.trim(), previewImage, previewLetter);
                } else if (initialImageSrc) {
                    showAvatarImage(initialImageSrc, previewImage, previewLetter);
                } else {
                    showAvatarLetter(previewImage, previewLetter);
                }

                if (dropText) {
                    dropText.textContent = defaultDropText;
                }
            });
        }

        if (avatarUrlInput) {
            avatarUrlInput.addEventListener("input", function () {
                var value = avatarUrlInput.value.trim();

                if (!value) {
                    if (!fileInput.files || !fileInput.files.length) {
                        showAvatarLetter(previewImage, previewLetter);
                    }
                    return;
                }

                fileInput.value = "";
                showAvatarImage(value, previewImage, previewLetter);

                if (dropText) {
                    dropText.textContent = "Будет использована ссылка на изображение.";
                }
            });
        }
    }

    function setAvatarFile(fileInput, file, onReady) {
        if (!validateAvatarFile(file)) {
            return;
        }

        try {
            var dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
        } catch (error) {
            showToast("Браузер не смог прикрепить файл. Выберите его через кнопку.", "error");
            return;
        }

        onReady(file);
    }

    function validateAvatarFile(file) {
        var allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];

        if (!file || allowedTypes.indexOf(file.type) === -1) {
            showToast("Загрузите изображение в формате PNG, JPG, WEBP или GIF.", "warning");
            return false;
        }

        if (file.size > 3 * 1024 * 1024) {
            showToast("Размер аватара не должен превышать 3 MB.", "warning");
            return false;
        }

        return true;
    }

    function previewAvatarFile(file, previewImage, previewLetter, dropText) {
        if (!validateAvatarFile(file)) {
            return false;
        }

        var reader = new FileReader();

        reader.onload = function () {
            showAvatarImage(reader.result, previewImage, previewLetter);

            if (dropText) {
                dropText.textContent = "Выбран файл: " + file.name;
            }
        };

        reader.readAsDataURL(file);
        return true;
    }

    function showAvatarImage(src, previewImage, previewLetter) {
        previewImage.src = src;
        previewImage.hidden = false;
        previewLetter.hidden = true;
    }

    function showAvatarLetter(previewImage, previewLetter) {
        previewImage.removeAttribute("src");
        previewImage.hidden = true;
        previewLetter.hidden = false;
    }

    function setUserSettingsPanel(root, panelKey) {
        root.querySelectorAll("[data-user-settings-tab]").forEach(function (button) {
            button.classList.toggle("is-active", (button.dataset.userSettingsTab || "") === panelKey);
        });

        root.querySelectorAll("[data-user-settings-panel]").forEach(function (panel) {
            var isActive = (panel.dataset.userSettingsPanel || "") === panelKey;

            panel.hidden = !isActive;
            panel.classList.toggle("is-active", isActive);
        });
    }

    function renderUserSettingsGroups(state) {
        state.groups.forEach(function (group) {
            var container = document.querySelector('[data-user-settings-group="' + group.key + '"]');

            if (!container) {
                return;
            }

            container.innerHTML = "";
            (group.settings || []).forEach(function (setting) {
                container.appendChild(createUserSettingsOption(setting, state));
            });
        });
    }

    function createUserSettingsOption(setting, state) {
        var row = document.createElement("div");
        var title = document.createElement("div");
        var name = document.createElement("strong");
        var description = document.createElement("span");

        row.className = "user-settings-option";
        title.className = "user-settings-option-title";
        name.textContent = setting.title || "";
        description.textContent = setting.description || "";
        title.appendChild(name);
        title.appendChild(description);
        row.appendChild(title);

        if (setting.type === "select") {
            row.appendChild(createUserSettingsSelect(setting, state));
        } else {
            row.appendChild(createUserSettingsToggle(setting, state));
        }

        return row;
    }

    function createUserSettingsToggle(setting, state) {
        var button = document.createElement("button");
        var knob = document.createElement("span");
        var value = Boolean(state.values[setting.key]);

        button.className = "user-settings-toggle";
        button.type = "button";
        button.dataset.userSettingToggle = setting.key;
        button.setAttribute("role", "switch");
        button.setAttribute("aria-label", setting.title || "");
        button.appendChild(knob);
        updateUserSettingsToggle(button, value);

        return button;
    }

    function updateUserSettingsToggle(button, value) {
        button.classList.toggle("is-enabled", Boolean(value));
        button.setAttribute("aria-checked", Boolean(value) ? "true" : "false");
    }

    function createUserSettingsSelect(setting, state) {
        var select = document.createElement("select");

        select.className = "user-settings-select";
        select.dataset.userSettingSelect = setting.key;
        select.setAttribute("aria-label", setting.title || "");

        (setting.options || []).forEach(function (option) {
            var item = document.createElement("option");

            item.value = option.value || "";
            item.textContent = option.label || option.value || "";
            select.appendChild(item);
        });

        select.value = state.values[setting.key] || setting.default || "";
        return select;
    }

    function saveUserSettings(root, state, sourceButton) {
        if (state.isSaving) {
            return;
        }

        state.isSaving = true;
        setUserSettingsButtonsDisabled(root, true);
        setUserSettingsStatus(root, "Сохраняем...");

        fetch("/api/user/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                settings: state.values
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось сохранить настройки.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                state.values = Object.assign({}, data.values || state.values);
                setUserSettingsStatus(root, "Настройки сохранены.");
                showToast("Настройки сохранены", "success");
            })
            .catch(function (error) {
                setUserSettingsStatus(root, "Не удалось сохранить настройки.");
                showToast(error.message || "Не удалось сохранить настройки", "error");
            })
            .finally(function () {
                state.isSaving = false;
                setUserSettingsButtonsDisabled(root, false);

                if (sourceButton) {
                    sourceButton.focus();
                }
            });
    }

    function setUserSettingsButtonsDisabled(root, isDisabled) {
        root.querySelectorAll("[data-user-settings-save]").forEach(function (button) {
            button.disabled = isDisabled;
        });
    }

    function setUserSettingsStatus(root, message) {
        root.querySelectorAll("[data-user-settings-status]").forEach(function (status) {
            status.textContent = message || "";
        });
    }

    function loadAdminUsers() {
        if (!adminUsersBody || adminUsersState.isLoading) {
            return;
        }

        adminUsersState.isLoading = true;
        adminUsersState.hasError = false;
        renderAdminUsersTable();

        fetch("/api/admin/users", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить пользователей.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminUsersState.users = (data.users || []).map(normalizeAdminUserFromApi);
                adminUsersState.hasLoaded = true;
                adminUsersState.isLoading = false;
                adminUsersState.hasError = false;
                renderAdminUsersTable();
            })
            .catch(function () {
                adminUsersState.users = [];
                adminUsersState.hasLoaded = false;
                adminUsersState.isLoading = false;
                adminUsersState.hasError = true;
                renderAdminUsersTable();
            });
    }

    function normalizeAdminUserFromApi(user) {
        return {
            id: user.id,
            avatar: user.avatar || null,
            name: user.name || "",
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            display_name: user.display_name || user.name || user.username || user.email || "Пользователь",
            username: user.username || "",
            email: user.email || "—",
            position: user.position || "—",
            role: user.role || "user",
            role_label: user.role_label || "Участник",
            organization_id: user.organization_id || ""
        };
    }

    function renderAdminUsersTable() {
        var filteredUsers;

        if (!adminUsersBody) {
            return;
        }

        if (adminUsersState.isLoading) {
            showAdminUsersState("loading");
            return;
        }

        if (adminUsersState.hasError) {
            showAdminUsersState("error");
            return;
        }

        if (!adminUsersState.hasLoaded) {
            showAdminUsersState("empty");
            return;
        }

        if (!adminUsersState.users.length) {
            showAdminUsersState("empty");
            return;
        }

        filteredUsers = filterAdminUsers(adminUsersState.users);

        if (!filteredUsers.length) {
            showAdminUsersState("no-results");
            return;
        }

        showAdminUsersState("table");
        adminUsersBody.innerHTML = "";
        filteredUsers.forEach(function (user) {
            adminUsersBody.appendChild(createAdminUserRow(user));
        });
    }

    function showAdminUsersState(state) {
        var states = [
            ["loading", adminUsersLoading],
            ["error", adminUsersError],
            ["empty", adminUsersEmpty],
            ["no-results", adminUsersNoResults]
        ];

        states.forEach(function (entry) {
            if (entry[1]) {
                entry[1].hidden = entry[0] !== state;
            }
        });

        if (adminUsersTableWrap) {
            adminUsersTableWrap.hidden = state !== "table";
        }

        if (state !== "table" && adminUsersBody) {
            adminUsersBody.innerHTML = "";
        }
    }

    function filterAdminUsers(users) {
        var query = (adminUsersState.query || "").trim().toLowerCase();

        if (!query) {
            return users;
        }

        return users.filter(function (user) {
            return [
                user.last_name,
                user.first_name,
                user.display_name,
                user.email,
                user.position,
                user.role_label,
                user.role
            ].join(" ").toLowerCase().indexOf(query) !== -1;
        });
    }

    function createAdminUserRow(user) {
        var row = document.createElement("tr");
        var avatarCell = document.createElement("td");
        var avatar = document.createElement("div");
        var roleCell = document.createElement("td");
        var roleBadge = document.createElement("span");
        var actionsCell = document.createElement("td");
        var actionsButton = document.createElement("button");

        avatar.className = "admin-user-avatar";
        renderAdminUserAvatar(avatar, user);
        avatarCell.appendChild(avatar);
        row.appendChild(avatarCell);

        row.appendChild(createAdminUserTextCell(user.last_name || "—", user.last_name || "—"));
        row.appendChild(createAdminUserTextCell(getAdminUserFirstName(user), getAdminUserFirstName(user)));
        row.appendChild(createAdminUserTextCell(user.email || "—", user.email || "—"));
        row.appendChild(createAdminUserTextCell(user.position || "—", user.position || "—"));

        roleBadge.className = "admin-user-role-badge";
        if (user.role === "admin") {
            roleBadge.classList.add("is-admin");
        }
        roleBadge.textContent = user.role_label || "Участник";
        roleCell.appendChild(roleBadge);
        row.appendChild(roleCell);

        actionsButton.className = "admin-user-actions-button";
        actionsButton.type = "button";
        actionsButton.textContent = "⋯";
        actionsButton.dataset.adminUserActionButton = "true";
        actionsButton.dataset.userId = String(user.id);
        actionsButton.setAttribute("aria-label", "Действия пользователя");
        actionsCell.appendChild(actionsButton);
        row.appendChild(actionsCell);

        return row;
    }

    function createAdminUserTextCell(text, title) {
        var cell = document.createElement("td");
        var span = document.createElement("span");

        span.className = "admin-user-cell-text";
        span.textContent = text || "—";
        span.title = title || text || "—";
        cell.appendChild(span);

        return cell;
    }

    function renderAdminUserAvatar(container, user) {
        var img;

        container.innerHTML = "";

        if (user.avatar) {
            img = document.createElement("img");
            img.src = user.avatar;
            img.alt = user.display_name || "Пользователь";
            container.appendChild(img);
            return;
        }

        container.textContent = getAdminUserInitial(user);
    }

    function getAdminUserInitial(user) {
        var source = user.first_name || user.display_name || user.username || user.email || "П";
        return source.trim().charAt(0).toUpperCase() || "П";
    }

    function getAdminUserFirstName(user) {
        return user.first_name || user.name || user.username || user.email || "—";
    }

    function getAdminUserById(userId) {
        var normalizedUserId = String(userId || "");

        return adminUsersState.users.filter(function (user) {
            return String(user.id) === normalizedUserId;
        })[0] || null;
    }

    function toggleAdminUserActionsMenu(button) {
        if (
            adminUserActionsMenu &&
            adminUserActionsMenu.classList.contains("is-open") &&
            adminUserActionsMenu.dataset.userId === (button.dataset.userId || "")
        ) {
            closeAdminUserActionsMenu();
            return;
        }

        openAdminUserActionsMenu(button);
    }

    function openAdminUserActionsMenu(button) {
        var rect;
        var menuWidth;
        var menuHeight;
        var left;
        var top;

        if (!adminUserActionsMenu || !button) {
            return;
        }

        closeAdminUserActionsMenu();
        adminUserActionsMenu.hidden = false;
        adminUserActionsMenu.dataset.userId = button.dataset.userId || "";
        rect = button.getBoundingClientRect();
        menuWidth = adminUserActionsMenu.offsetWidth || 248;
        menuHeight = adminUserActionsMenu.offsetHeight || 96;
        left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12);
        top = Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 12);
        adminUserActionsMenu.style.left = Math.max(12, left) + "px";
        adminUserActionsMenu.style.top = Math.max(12, top) + "px";
        adminUserActionsMenu.classList.add("is-open");
        button.classList.add("is-open");
    }

    function closeAdminUserActionsMenu() {
        if (!adminUserActionsMenu) {
            return;
        }

        adminUserActionsMenu.classList.remove("is-open");
        adminUserActionsMenu.hidden = true;
        adminUserActionsMenu.dataset.userId = "";
        document.querySelectorAll("[data-admin-user-action-button].is-open").forEach(function (button) {
            button.classList.remove("is-open");
        });
    }

    function handleAdminUserAction(action) {
        var userId = adminUserActionsMenu ? adminUserActionsMenu.dataset.userId : "";
        var user = getAdminUserById(userId);

        if (!user) {
            closeAdminUserActionsMenu();
            showToast("Пользователь не найден.", "error");
            return;
        }

        if (action === "card") {
            openAdminUserCard(user);
            closeAdminUserActionsMenu();
            return;
        }

        if (action === "delete") {
            openAdminUserDeleteConfirm(user);
            closeAdminUserActionsMenu();
        }
    }

    function openAdminUserCard(user) {
        var avatar = document.querySelector("[data-admin-user-card-avatar]");

        setText("[data-admin-user-card-display-name]", user.display_name || "Пользователь");
        setText("[data-admin-user-card-name]", user.display_name || "Пользователь");
        setText("[data-admin-user-card-email]", user.email || "—");
        setText("[data-admin-user-card-last-name]", user.last_name || "—");
        setText("[data-admin-user-card-first-name]", getAdminUserFirstName(user));
        setText("[data-admin-user-card-position]", user.position || "—");
        setText("[data-admin-user-card-role]", user.role_label || "Участник");
        setText("[data-admin-user-card-id]", user.id || "—");
        setText("[data-admin-user-card-organization-id]", user.organization_id || "—");

        if (avatar) {
            renderAdminUserAvatar(avatar, user);
        }

        openModal(adminUserCardModal);
    }

    function setText(selector, value) {
        var element = document.querySelector(selector);

        if (element) {
            element.textContent = value == null || value === "" ? "—" : String(value);
        }
    }

    function openAdminUserDeleteConfirm(user) {
        adminUsersState.pendingDeleteUserId = user.id;

        if (adminUserDeleteName) {
            adminUserDeleteName.textContent = user.display_name || user.email || "Пользователь";
        }

        openModal(adminUserDeleteModal);
    }

    function deactivateSelectedAdminUser() {
        var userId = adminUsersState.pendingDeleteUserId;

        if (!userId || !adminUserDeleteConfirm) {
            return;
        }

        adminUserDeleteConfirm.disabled = true;

        fetch("/api/admin/users/" + encodeURIComponent(userId) + "/deactivate", {
            method: "POST",
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось удалить пользователя.");
                    }

                    return data;
                });
            })
            .then(function () {
                adminUsersState.users = adminUsersState.users.filter(function (user) {
                    return String(user.id) !== String(userId);
                });
                adminUsersState.pendingDeleteUserId = null;
                closeModal(adminUserDeleteModal);
                renderAdminUsersTable();
                showToast("Пользователь удален", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось удалить пользователя.", "error");
            })
            .finally(function () {
                adminUserDeleteConfirm.disabled = false;
            });
    }

    function loadAdminGroups() {
        if (!adminGroupsBody || adminGroupsState.isLoading) {
            return;
        }

        adminGroupsState.isLoading = true;
        adminGroupsState.hasError = false;
        renderAdminGroupsTable();

        fetch("/api/admin/user-groups", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить группы пользователей.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminGroupsState.groups = (data.groups || []).map(normalizeAdminGroupFromApi);
                adminGroupsState.hasLoaded = true;
                adminGroupsState.isLoading = false;
                adminGroupsState.hasError = false;
                renderAdminGroupsTable();
            })
            .catch(function () {
                adminGroupsState.groups = [];
                adminGroupsState.hasLoaded = false;
                adminGroupsState.isLoading = false;
                adminGroupsState.hasError = true;
                renderAdminGroupsTable();
            });
    }

    function normalizeAdminGroupFromApi(group) {
        return {
            id: group.id,
            organization_id: group.organization_id || "",
            name: group.name || "Группа",
            description: group.description || "",
            avatar: group.avatar || null,
            members_count: Number(group.members_count || 0),
            reports_count: Number(group.reports_count || 0),
            templates_count: Number(group.templates_count || 0),
            created_at: group.created_at || "",
            members: Array.isArray(group.members) ? group.members.map(normalizeAdminUserFromApi) : []
        };
    }

    function renderAdminGroupsTable() {
        var filteredGroups;

        if (!adminGroupsBody) {
            return;
        }

        if (adminGroupsState.isLoading) {
            showAdminGroupsState("loading");
            return;
        }

        if (adminGroupsState.hasError) {
            showAdminGroupsState("error");
            return;
        }

        if (!adminGroupsState.hasLoaded || !adminGroupsState.groups.length) {
            showAdminGroupsState("empty");
            return;
        }

        filteredGroups = filterAdminGroups(adminGroupsState.groups);

        if (!filteredGroups.length) {
            showAdminGroupsState("no-results");
            return;
        }

        showAdminGroupsState("table");
        adminGroupsBody.innerHTML = "";
        filteredGroups.forEach(function (group) {
            adminGroupsBody.appendChild(createAdminGroupRow(group));
        });
    }

    function showAdminGroupsState(state) {
        var states = [
            ["loading", adminGroupsLoading],
            ["error", adminGroupsError],
            ["empty", adminGroupsEmpty],
            ["no-results", adminGroupsNoResults]
        ];

        states.forEach(function (entry) {
            if (entry[1]) {
                entry[1].hidden = entry[0] !== state;
            }
        });

        if (adminGroupsTableWrap) {
            adminGroupsTableWrap.hidden = state !== "table";
        }

        if (state !== "table" && adminGroupsBody) {
            adminGroupsBody.innerHTML = "";
        }
    }

    function filterAdminGroups(groups) {
        var query = (adminGroupsState.query || "").trim().toLowerCase();

        if (!query) {
            return groups;
        }

        return groups.filter(function (group) {
            return [
                group.name,
                group.description
            ].join(" ").toLowerCase().indexOf(query) !== -1;
        });
    }

    function createAdminGroupRow(group) {
        var row = document.createElement("tr");
        var avatarCell = document.createElement("td");
        var avatar = document.createElement("div");
        var actionsCell = document.createElement("td");
        var actionsButton = document.createElement("button");

        avatar.className = "admin-user-avatar admin-group-avatar";
        renderAdminGroupAvatar(avatar, group);
        avatarCell.appendChild(avatar);
        row.appendChild(avatarCell);

        row.appendChild(createAdminUserTextCell(group.name, group.name));
        row.appendChild(createAdminUserTextCell(formatAdminCount(group.members_count, "участник", "участника", "участников"), ""));
        row.appendChild(createAdminUserTextCell(formatAdminCount(group.reports_count, "отчет", "отчета", "отчетов"), ""));
        row.appendChild(createAdminUserTextCell(formatAdminCount(group.templates_count, "шаблон", "шаблона", "шаблонов"), ""));
        row.appendChild(createAdminUserTextCell(group.description || "—", group.description || "—"));

        actionsButton.className = "admin-user-actions-button";
        actionsButton.type = "button";
        actionsButton.textContent = "⋯";
        actionsButton.dataset.adminGroupActionButton = "true";
        actionsButton.dataset.groupId = String(group.id);
        actionsButton.setAttribute("aria-label", "Действия группы");
        actionsCell.appendChild(actionsButton);
        row.appendChild(actionsCell);

        return row;
    }

    function renderAdminGroupAvatar(container, group) {
        var img;

        container.innerHTML = "";

        if (group.avatar) {
            img = document.createElement("img");
            img.src = group.avatar;
            img.alt = group.name || "Группа";
            container.appendChild(img);
            return;
        }

        container.textContent = (group.name || "Г").trim().charAt(0).toUpperCase() || "Г";
    }

    function formatAdminCount(count, one, few, many) {
        var value = Math.abs(Number(count || 0));
        var mod10 = value % 10;
        var mod100 = value % 100;
        var word = many;

        if (mod10 === 1 && mod100 !== 11) {
            word = one;
        } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
            word = few;
        }

        return String(count || 0) + " " + word;
    }

    function getAdminGroupById(groupId) {
        var normalizedGroupId = String(groupId || "");

        return adminGroupsState.groups.filter(function (group) {
            return String(group.id) === normalizedGroupId;
        })[0] || null;
    }

    function toggleAdminGroupActionsMenu(button) {
        if (
            adminGroupActionsMenu &&
            adminGroupActionsMenu.classList.contains("is-open") &&
            adminGroupActionsMenu.dataset.groupId === (button.dataset.groupId || "")
        ) {
            closeAdminGroupActionsMenu();
            return;
        }

        openAdminGroupActionsMenu(button);
    }

    function openAdminGroupActionsMenu(button) {
        var rect;
        var menuWidth;
        var menuHeight;
        var left;
        var top;

        if (!adminGroupActionsMenu || !button) {
            return;
        }

        closeAdminGroupActionsMenu();
        adminGroupActionsMenu.hidden = false;
        adminGroupActionsMenu.dataset.groupId = button.dataset.groupId || "";
        rect = button.getBoundingClientRect();
        menuWidth = adminGroupActionsMenu.offsetWidth || 248;
        menuHeight = adminGroupActionsMenu.offsetHeight || 132;
        left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12);
        top = Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 12);
        adminGroupActionsMenu.style.left = Math.max(12, left) + "px";
        adminGroupActionsMenu.style.top = Math.max(12, top) + "px";
        adminGroupActionsMenu.classList.add("is-open");
        button.classList.add("is-open");
    }

    function closeAdminGroupActionsMenu() {
        if (!adminGroupActionsMenu) {
            return;
        }

        adminGroupActionsMenu.classList.remove("is-open");
        adminGroupActionsMenu.hidden = true;
        adminGroupActionsMenu.dataset.groupId = "";
        document.querySelectorAll("[data-admin-group-action-button].is-open").forEach(function (button) {
            button.classList.remove("is-open");
        });
    }

    function handleAdminGroupAction(action) {
        var groupId = adminGroupActionsMenu ? adminGroupActionsMenu.dataset.groupId : "";

        closeAdminGroupActionsMenu();

        if (action === "card") {
            openAdminGroupCard(groupId);
            return;
        }

        if (action === "members") {
            openAdminGroupMembersModal(groupId);
            return;
        }

        if (action === "delete") {
            openAdminGroupDeleteConfirm(groupId);
        }
    }

    function fetchAdminGroupDetail(groupId) {
        return fetch("/api/admin/user-groups/" + encodeURIComponent(groupId), {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить группу.");
                    }

                    return normalizeAdminGroupFromApi(data.group || {});
                });
            });
    }

    function openAdminGroupCreateModal() {
        adminGroupsState.createSelectedMemberIds = new Set();
        adminGroupsState.createMemberQuery = "";

        if (adminGroupCreateName) {
            adminGroupCreateName.value = "";
        }

        if (adminGroupCreateDescription) {
            adminGroupCreateDescription.value = "";
        }

        if (adminGroupCreateMemberSearch) {
            adminGroupCreateMemberSearch.value = "";
        }

        openModal(adminGroupCreateModal);
        ensureAdminUsersForGroupPicker("create");
    }

    function createAdminUserGroup(event) {
        var name = adminGroupCreateName ? adminGroupCreateName.value.trim() : "";
        var description = adminGroupCreateDescription ? adminGroupCreateDescription.value.trim() : "";

        if (event) {
            event.preventDefault();
        }

        if (!name) {
            showToast("Введите название группы.", "warning");
            return;
        }

        if (adminGroupCreateSubmit) {
            adminGroupCreateSubmit.disabled = true;
        }

        fetch("/api/admin/user-groups", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                name: name,
                description: description,
                member_ids: Array.from(adminGroupsState.createSelectedMemberIds)
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось создать группу.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                upsertAdminGroup(data.group);
                adminGroupsState.hasLoaded = true;
                closeModal(adminGroupCreateModal);
                renderAdminGroupsTable();
                showToast("Группа создана", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось создать группу.", "error");
            })
            .finally(function () {
                if (adminGroupCreateSubmit) {
                    adminGroupCreateSubmit.disabled = false;
                }
            });
    }

    function openAdminGroupCard(groupId) {
        fetchAdminGroupDetail(groupId)
            .then(function (group) {
                var avatar = document.querySelector("[data-admin-group-card-avatar]");

                upsertAdminGroup(group);
                setText("[data-admin-group-card-name]", group.name || "Группа");
                setText("[data-admin-group-card-description]", group.description || "Описание не указано.");
                setText(
                    "[data-admin-group-card-meta]",
                    [
                        formatAdminCount(group.members_count, "участник", "участника", "участников"),
                        formatAdminCount(group.reports_count, "отчет", "отчета", "отчетов"),
                        formatAdminCount(group.templates_count, "шаблон", "шаблона", "шаблонов")
                    ].join(" · ")
                );

                if (avatar) {
                    renderAdminGroupAvatar(avatar, group);
                }

                renderAdminGroupCardMembers(group.members || []);
                openModal(adminGroupCardModal);
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось открыть карточку группы.", "error");
            });
    }

    function renderAdminGroupCardMembers(members) {
        var list = document.querySelector("[data-admin-group-card-members]");

        if (!list) {
            return;
        }

        list.innerHTML = "";

        if (!members.length) {
            list.appendChild(createAdminGroupCardPlaceholder("В группе пока нет участников."));
            return;
        }

        members.forEach(function (member) {
            var item = document.createElement("div");
            var avatar = document.createElement("div");
            var content = document.createElement("div");
            var name = document.createElement("strong");
            var meta = document.createElement("span");

            item.className = "admin-member-picker-option is-static";
            avatar.className = "admin-user-avatar";
            renderAdminUserAvatar(avatar, member);
            name.textContent = member.display_name || "Пользователь";
            meta.textContent = [member.position, member.email].filter(Boolean).join(" · ");
            content.appendChild(name);
            content.appendChild(meta);
            item.appendChild(avatar);
            item.appendChild(content);
            list.appendChild(item);
        });
    }

    function createAdminGroupCardPlaceholder(text) {
        var placeholder = document.createElement("div");
        placeholder.className = "admin-group-card-placeholder";
        placeholder.textContent = text;
        return placeholder;
    }

    function openAdminGroupMembersModal(groupId) {
        fetchAdminGroupDetail(groupId)
            .then(function (group) {
                adminGroupsState.editingGroupId = group.id;
                adminGroupsState.editSelectedMemberIds = new Set(
                    (group.members || []).map(function (member) {
                        return String(member.id);
                    })
                );
                adminGroupsState.editMemberQuery = "";

                if (adminGroupMembersSubtitle) {
                    adminGroupMembersSubtitle.textContent = "Группа: " + (group.name || "—");
                }

                if (adminGroupEditMemberSearch) {
                    adminGroupEditMemberSearch.value = "";
                }

                openModal(adminGroupMembersModal);
                ensureAdminUsersForGroupPicker("edit");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось открыть настройку участников.", "error");
            });
    }

    function ensureAdminUsersForGroupPicker(mode) {
        setAdminGroupMemberPickerLoading(mode, true);

        if (adminUsersState.hasLoaded) {
            setAdminGroupMemberPickerLoading(mode, false);
            renderAdminGroupMemberPicker(mode);
            return;
        }

        fetch("/api/admin/users", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить участников.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminUsersState.users = (data.users || []).map(normalizeAdminUserFromApi);
                adminUsersState.hasLoaded = true;
                adminUsersState.hasError = false;
                setAdminGroupMemberPickerLoading(mode, false);
                renderAdminGroupMemberPicker(mode);
            })
            .catch(function (error) {
                setAdminGroupMemberPickerLoading(mode, false);
                showToast(error.message || "Не удалось загрузить участников.", "error");
                renderAdminGroupMemberPicker(mode);
            });
    }

    function setAdminGroupMemberPickerLoading(mode, isLoading) {
        var elements = getAdminGroupMemberPickerElements(mode);

        if (elements.loading) {
            elements.loading.hidden = !isLoading;
        }

        if (isLoading) {
            if (elements.empty) {
                elements.empty.hidden = true;
            }
            if (elements.noResults) {
                elements.noResults.hidden = true;
            }
            if (elements.list) {
                elements.list.innerHTML = "";
            }
        }
    }

    function getAdminGroupMemberPickerElements(mode) {
        if (mode === "edit") {
            return {
                list: adminGroupEditMembersList,
                loading: adminGroupEditMembersLoading,
                empty: adminGroupEditMembersEmpty,
                noResults: adminGroupEditMembersNoResults,
                count: adminGroupEditSelectedCount
            };
        }

        return {
            list: adminGroupCreateMembersList,
            loading: adminGroupCreateMembersLoading,
            empty: adminGroupCreateMembersEmpty,
            noResults: adminGroupCreateMembersNoResults,
            count: adminGroupCreateSelectedCount
        };
    }

    function renderAdminGroupMemberPicker(mode) {
        var elements = getAdminGroupMemberPickerElements(mode);
        var selectedIds = mode === "edit" ? adminGroupsState.editSelectedMemberIds : adminGroupsState.createSelectedMemberIds;
        var query = (mode === "edit" ? adminGroupsState.editMemberQuery : adminGroupsState.createMemberQuery).trim().toLowerCase();
        var users = adminUsersState.users || [];
        var filteredUsers = users.filter(function (user) {
            if (!query) {
                return true;
            }

            return [
                user.display_name,
                user.first_name,
                user.last_name,
                user.email,
                user.position,
                user.role_label
            ].join(" ").toLowerCase().indexOf(query) !== -1;
        });

        if (elements.count) {
            elements.count.textContent = "Выбрано: " + selectedIds.size;
        }

        if (!elements.list) {
            return;
        }

        elements.list.innerHTML = "";

        if (elements.loading) {
            elements.loading.hidden = true;
        }

        if (!users.length) {
            if (elements.empty) {
                elements.empty.hidden = false;
            }
            if (elements.noResults) {
                elements.noResults.hidden = true;
            }
            return;
        }

        if (!filteredUsers.length) {
            if (elements.empty) {
                elements.empty.hidden = true;
            }
            if (elements.noResults) {
                elements.noResults.hidden = false;
            }
            return;
        }

        if (elements.empty) {
            elements.empty.hidden = true;
        }
        if (elements.noResults) {
            elements.noResults.hidden = true;
        }

        filteredUsers.forEach(function (user) {
            elements.list.appendChild(createAdminGroupMemberOption(user, selectedIds.has(String(user.id))));
        });
    }

    function createAdminGroupMemberOption(user, isSelected) {
        var option = document.createElement("button");
        var avatar = document.createElement("div");
        var content = document.createElement("div");
        var name = document.createElement("strong");
        var meta = document.createElement("span");
        var check = document.createElement("span");

        option.className = "admin-member-picker-option";
        option.type = "button";
        option.dataset.adminGroupMemberOption = "true";
        option.dataset.userId = String(user.id);
        option.classList.toggle("is-selected", isSelected);
        avatar.className = "admin-user-avatar";
        renderAdminUserAvatar(avatar, user);
        name.textContent = user.display_name || "Пользователь";
        meta.textContent = [user.position, user.email].filter(Boolean).join(" · ");
        check.className = "admin-member-picker-check";
        check.textContent = "✓";
        content.appendChild(name);
        content.appendChild(meta);
        option.appendChild(avatar);
        option.appendChild(content);
        option.appendChild(check);

        return option;
    }

    function toggleAdminGroupMemberSelection(mode, userId) {
        var selectedIds = mode === "edit" ? adminGroupsState.editSelectedMemberIds : adminGroupsState.createSelectedMemberIds;
        var normalizedUserId = String(userId || "");

        if (!normalizedUserId) {
            return;
        }

        if (selectedIds.has(normalizedUserId)) {
            selectedIds.delete(normalizedUserId);
        } else {
            selectedIds.add(normalizedUserId);
        }

        renderAdminGroupMemberPicker(mode);
    }

    function saveAdminGroupMembers() {
        var groupId = adminGroupsState.editingGroupId;

        if (!groupId || !adminGroupMembersSave) {
            return;
        }

        adminGroupMembersSave.disabled = true;

        fetch("/api/admin/user-groups/" + encodeURIComponent(groupId) + "/members", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                member_ids: Array.from(adminGroupsState.editSelectedMemberIds)
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось сохранить участников группы.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                upsertAdminGroup(data.group);
                closeModal(adminGroupMembersModal);
                renderAdminGroupsTable();
                showToast("Участники группы обновлены", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось сохранить участников группы.", "error");
            })
            .finally(function () {
                adminGroupMembersSave.disabled = false;
            });
    }

    function openAdminGroupDeleteConfirm(groupId) {
        var group = getAdminGroupById(groupId);

        adminGroupsState.pendingDeleteGroupId = groupId;

        if (adminGroupDeleteName) {
            adminGroupDeleteName.textContent = group ? group.name : "Группа";
        }

        openModal(adminGroupDeleteModal);
    }

    function deactivateSelectedAdminGroup() {
        var groupId = adminGroupsState.pendingDeleteGroupId;

        if (!groupId || !adminGroupDeleteConfirm) {
            return;
        }

        adminGroupDeleteConfirm.disabled = true;

        fetch("/api/admin/user-groups/" + encodeURIComponent(groupId) + "/deactivate", {
            method: "POST",
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось удалить группу.");
                    }

                    return data;
                });
            })
            .then(function () {
                adminGroupsState.groups = adminGroupsState.groups.filter(function (group) {
                    return String(group.id) !== String(groupId);
                });
                adminGroupsState.pendingDeleteGroupId = null;
                closeModal(adminGroupDeleteModal);
                renderAdminGroupsTable();
                showToast("Группа удалена", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось удалить группу.", "error");
            })
            .finally(function () {
                adminGroupDeleteConfirm.disabled = false;
            });
    }

    function upsertAdminGroup(rawGroup) {
        var group = normalizeAdminGroupFromApi(rawGroup || {});
        var index = -1;

        adminGroupsState.groups.forEach(function (existingGroup, existingIndex) {
            if (String(existingGroup.id) === String(group.id)) {
                index = existingIndex;
            }
        });

        if (index >= 0) {
            adminGroupsState.groups[index] = group;
        } else {
            adminGroupsState.groups.unshift(group);
        }
    }

    function loadAdminAccessOptions() {
        if (!adminAccessSubjectsList || adminAccessState.isLoadingOptions) {
            return;
        }

        adminAccessState.isLoadingOptions = true;
        adminAccessState.hasOptionsError = false;
        renderAdminAccessSubjects();
        renderAdminAccessEditorState("placeholder");

        fetch("/api/admin/access/options", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить настройки прав.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                var subjects = data.subjects || {};
                var availableSubjects;

                adminAccessState.users = (subjects.users || []).map(normalizeAdminUserFromApi);
                adminAccessState.groups = (subjects.groups || []).map(normalizeAdminGroupFromApi);
                adminAccessState.permissionGroups = data.permission_groups || [];
                adminAccessState.isLoadingOptions = false;
                adminAccessState.hasLoadedOptions = true;
                adminAccessState.hasOptionsError = false;
                renderAdminAccessSubjects();

                availableSubjects = getAdminAccessSubjects();
                if (!adminAccessState.selectedSubjectId && availableSubjects.length) {
                    selectAdminAccessSubject(adminAccessState.subjectType, availableSubjects[0].id);
                } else if (adminAccessState.selectedSubjectId) {
                    selectAdminAccessSubject(adminAccessState.subjectType, adminAccessState.selectedSubjectId);
                } else {
                    renderAdminAccessEditorState("placeholder");
                }
            })
            .catch(function () {
                adminAccessState.isLoadingOptions = false;
                adminAccessState.hasLoadedOptions = false;
                adminAccessState.hasOptionsError = true;
                renderAdminAccessSubjects();
                renderAdminAccessEditorState("error");
            });
    }

    function setAdminAccessSubjectType(subjectType) {
        var normalizedSubjectType = subjectType === "group" ? "group" : "user";
        var subjects;

        adminAccessState.subjectType = normalizedSubjectType;
        adminAccessState.selectedSubjectId = "";
        adminAccessState.selectedPermissions = new Set();
        adminAccessState.query = "";

        if (adminAccessSearch) {
            adminAccessSearch.value = "";
            adminAccessSearch.placeholder = normalizedSubjectType === "group" ? "Поиск группы" : "Поиск пользователя";
        }

        adminAccessSubjectTypeButtons.forEach(function (button) {
            button.classList.toggle("is-active", (button.dataset.adminAccessSubjectType || "user") === normalizedSubjectType);
        });

        renderAdminAccessSubjects();
        subjects = getAdminAccessSubjects();

        if (subjects.length) {
            selectAdminAccessSubject(normalizedSubjectType, subjects[0].id);
        } else {
            renderAdminAccessEditorState("placeholder");
        }
    }

    function getAdminAccessSubjects() {
        return adminAccessState.subjectType === "group"
            ? adminAccessState.groups
            : adminAccessState.users;
    }

    function renderAdminAccessSubjects() {
        var subjects;
        var filteredSubjects;
        var query;

        if (!adminAccessSubjectsList) {
            return;
        }

        if (adminAccessState.isLoadingOptions) {
            showAdminAccessSubjectsState("loading");
            return;
        }

        if (adminAccessState.hasOptionsError) {
            showAdminAccessSubjectsState("empty");
            return;
        }

        subjects = getAdminAccessSubjects();
        query = (adminAccessState.query || "").trim().toLowerCase();
        filteredSubjects = subjects.filter(function (subject) {
            if (!query) {
                return true;
            }

            return getAdminAccessSubjectSearchText(subject).indexOf(query) !== -1;
        });

        if (!subjects.length) {
            showAdminAccessSubjectsState("empty");
            return;
        }

        if (!filteredSubjects.length) {
            showAdminAccessSubjectsState("no-results");
            return;
        }

        showAdminAccessSubjectsState("list");
        adminAccessSubjectsList.innerHTML = "";
        filteredSubjects.forEach(function (subject) {
            adminAccessSubjectsList.appendChild(createAdminAccessSubjectButton(subject));
        });
    }

    function showAdminAccessSubjectsState(state) {
        if (adminAccessSubjectsLoading) {
            adminAccessSubjectsLoading.hidden = state !== "loading";
        }
        if (adminAccessSubjectsEmpty) {
            adminAccessSubjectsEmpty.hidden = state !== "empty";
        }
        if (adminAccessSubjectsNoResults) {
            adminAccessSubjectsNoResults.hidden = state !== "no-results";
        }

        if (adminAccessSubjectsList) {
            adminAccessSubjectsList.hidden = state !== "list";
            if (state !== "list") {
                adminAccessSubjectsList.innerHTML = "";
            }
        }
    }

    function getAdminAccessSubjectSearchText(subject) {
        if (adminAccessState.subjectType === "group") {
            return [
                subject.name,
                subject.description
            ].join(" ").toLowerCase();
        }

        return [
            subject.display_name,
            subject.first_name,
            subject.last_name,
            subject.email,
            subject.position,
            subject.role_label
        ].join(" ").toLowerCase();
    }

    function createAdminAccessSubjectButton(subject) {
        var button = document.createElement("button");
        var avatar = document.createElement("div");
        var content = document.createElement("div");
        var name = document.createElement("strong");
        var meta = document.createElement("span");
        var subjectType = adminAccessState.subjectType;

        button.className = "admin-access-subject-button";
        button.type = "button";
        button.dataset.adminAccessSubject = "true";
        button.dataset.subjectType = subjectType;
        button.dataset.subjectId = String(subject.id);
        button.classList.toggle("is-active", String(adminAccessState.selectedSubjectId) === String(subject.id));
        avatar.className = "admin-user-avatar";

        if (subjectType === "group") {
            avatar.classList.add("admin-group-avatar");
            renderAdminGroupAvatar(avatar, subject);
            name.textContent = subject.name || "Группа";
            meta.textContent = formatAdminCount(subject.members_count, "участник", "участника", "участников");
        } else {
            renderAdminUserAvatar(avatar, subject);
            name.textContent = subject.display_name || "Пользователь";
            meta.textContent = [subject.position, subject.email].filter(Boolean).join(" · ");
        }

        content.appendChild(name);
        content.appendChild(meta);
        button.appendChild(avatar);
        button.appendChild(content);

        return button;
    }

    function selectAdminAccessSubject(subjectType, subjectId) {
        var normalizedSubjectType = subjectType === "group" ? "group" : "user";
        var normalizedSubjectId = String(subjectId || "");

        if (!normalizedSubjectId) {
            return;
        }

        adminAccessState.subjectType = normalizedSubjectType;
        adminAccessState.selectedSubjectId = normalizedSubjectId;
        adminAccessSubjectTypeButtons.forEach(function (button) {
            button.classList.toggle("is-active", (button.dataset.adminAccessSubjectType || "user") === normalizedSubjectType);
        });
        renderAdminAccessSubjects();
        loadAdminAccessPermissions(normalizedSubjectType, normalizedSubjectId);
    }

    function loadAdminAccessPermissions(subjectType, subjectId) {
        var url = "/api/admin/access/permissions?subject_type="
            + encodeURIComponent(subjectType)
            + "&subject_id="
            + encodeURIComponent(subjectId);

        adminAccessState.isLoadingPermissions = true;
        renderAdminAccessEditorState("loading");

        fetch(url, {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить права доступа.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminAccessState.isLoadingPermissions = false;
                adminAccessState.selectedPermissions = new Set(data.permissions || []);

                if (data.permission_groups) {
                    adminAccessState.permissionGroups = data.permission_groups;
                }

                renderAdminAccessEditor(data.subject || getAdminAccessSelectedSubject());
                setAdminAccessSaveStatus("Изменения сохраняются для выбранного объекта.");
            })
            .catch(function () {
                adminAccessState.isLoadingPermissions = false;
                renderAdminAccessEditorState("error");
            });
    }

    function getAdminAccessSelectedSubject() {
        return getAdminAccessSubjects().filter(function (subject) {
            return String(subject.id) === String(adminAccessState.selectedSubjectId);
        })[0] || null;
    }

    function renderAdminAccessEditorState(state) {
        if (adminAccessPlaceholder) {
            adminAccessPlaceholder.hidden = state !== "placeholder";
        }
        if (adminAccessPermissionsLoading) {
            adminAccessPermissionsLoading.hidden = state !== "loading";
        }
        if (adminAccessPermissionsError) {
            adminAccessPermissionsError.hidden = state !== "error";
        }
        if (adminAccessEditorBody) {
            adminAccessEditorBody.hidden = state !== "editor";
        }
    }

    function renderAdminAccessEditor(subject) {
        renderAdminAccessEditorState("editor");
        renderAdminAccessSelectedSubject(subject);
        renderAdminAccessPermissions();
    }

    function renderAdminAccessSelectedSubject(subject) {
        var metaText;

        if (!subject) {
            return;
        }

        if (adminAccessSelectedAvatar) {
            adminAccessSelectedAvatar.className = "admin-user-avatar";

            if (adminAccessState.subjectType === "group") {
                adminAccessSelectedAvatar.classList.add("admin-group-avatar");
                renderAdminGroupAvatar(adminAccessSelectedAvatar, subject);
            } else {
                renderAdminUserAvatar(adminAccessSelectedAvatar, subject);
            }
        }

        if (adminAccessSelectedName) {
            adminAccessSelectedName.textContent = adminAccessState.subjectType === "group"
                ? subject.name || "Группа"
                : subject.display_name || "Пользователь";
        }

        if (adminAccessSelectedMeta) {
            metaText = adminAccessState.subjectType === "group"
                ? "Группа · " + formatAdminCount(subject.members_count, "участник", "участника", "участников")
                : "Пользователь · " + [subject.position, subject.email].filter(Boolean).join(" · ");
            adminAccessSelectedMeta.textContent = metaText;
        }
    }

    function renderAdminAccessPermissions() {
        if (!adminAccessPermissionsGrid) {
            return;
        }

        adminAccessPermissionsGrid.innerHTML = "";
        (adminAccessState.permissionGroups || []).forEach(function (category) {
            var section = document.createElement("section");
            var header = document.createElement("div");
            var title = document.createElement("h3");
            var description = document.createElement("p");
            var list = document.createElement("div");

            section.className = "admin-access-permission-group";
            header.className = "admin-access-permission-group-header";
            title.textContent = category.title || "";
            description.textContent = category.description || "";
            header.appendChild(title);
            header.appendChild(description);
            list.className = "admin-access-permission-list";
            (category.permissions || []).forEach(function (permission) {
                list.appendChild(createAdminAccessPermissionToggle(permission));
            });
            section.appendChild(header);
            section.appendChild(list);
            adminAccessPermissionsGrid.appendChild(section);
        });
    }

    function createAdminAccessPermissionToggle(permission) {
        var button = document.createElement("button");
        var text = document.createElement("span");
        var title = document.createElement("strong");
        var description = document.createElement("small");
        var switcher = document.createElement("span");
        var knob = document.createElement("span");
        var isAllowed = adminAccessState.selectedPermissions.has(permission.key);

        button.className = "admin-access-permission-toggle";
        button.type = "button";
        button.dataset.adminAccessPermission = permission.key || "";
        button.classList.toggle("is-enabled", isAllowed);
        title.textContent = permission.title || permission.key || "";
        description.textContent = permission.description || "";
        text.appendChild(title);
        text.appendChild(description);
        switcher.className = "admin-access-switch";
        switcher.appendChild(knob);
        button.appendChild(text);
        button.appendChild(switcher);

        return button;
    }

    function toggleAdminAccessPermission(permissionKey) {
        if (!permissionKey) {
            return;
        }

        if (adminAccessState.selectedPermissions.has(permissionKey)) {
            adminAccessState.selectedPermissions.delete(permissionKey);
        } else {
            adminAccessState.selectedPermissions.add(permissionKey);
        }

        renderAdminAccessPermissions();
        setAdminAccessSaveStatus("Есть несохраненные изменения.");
    }

    function saveAdminAccessPermissions() {
        if (!adminAccessState.selectedSubjectId || !adminAccessSave) {
            return;
        }

        adminAccessState.isSaving = true;
        adminAccessSave.disabled = true;
        setAdminAccessSaveStatus("Сохраняю права...");

        fetch("/api/admin/access/permissions", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                subject_type: adminAccessState.subjectType,
                subject_id: adminAccessState.selectedSubjectId,
                permissions: Array.from(adminAccessState.selectedPermissions)
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось сохранить права доступа.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminAccessState.selectedPermissions = new Set(data.permissions || []);
                renderAdminAccessPermissions();
                setAdminAccessSaveStatus("Права доступа сохранены.");
                showToast("Права доступа сохранены", "success");
            })
            .catch(function (error) {
                setAdminAccessSaveStatus("Не удалось сохранить права.");
                showToast(error.message || "Не удалось сохранить права доступа.", "error");
            })
            .finally(function () {
                adminAccessState.isSaving = false;
                adminAccessSave.disabled = false;
            });
    }

    function setAdminAccessSaveStatus(message) {
        if (adminAccessSaveStatus) {
            adminAccessSaveStatus.textContent = message;
        }
    }

    function loadAdminActions(forceReload) {
        var url;
        var params;

        if (!adminActionsBody || (adminActionsState.isLoading && !forceReload)) {
            return;
        }

        adminActionsState.isLoading = true;
        adminActionsState.hasError = false;
        renderAdminActionsTable();
        params = new URLSearchParams();

        if (adminActionsState.userId) {
            params.set("user_id", adminActionsState.userId);
        }

        if (adminActionsState.actionKey) {
            params.set("action", adminActionsState.actionKey);
        }

        url = "/api/admin/user-actions";
        if (params.toString()) {
            url += "?" + params.toString();
        }

        fetch(url, {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить действия пользователей.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminActionsState.logs = data.logs || [];
                adminActionsState.users = (data.users || []).map(normalizeAdminUserFromApi);
                adminActionsState.actions = data.actions || [];
                adminActionsState.isLoading = false;
                adminActionsState.hasLoaded = true;
                adminActionsState.hasError = false;
                renderAdminActionsFilters();
                renderAdminActionsTable();
            })
            .catch(function () {
                adminActionsState.logs = [];
                adminActionsState.isLoading = false;
                adminActionsState.hasLoaded = false;
                adminActionsState.hasError = true;
                renderAdminActionsTable();
            });
    }

    function renderAdminActionsFilters() {
        if (adminActionsUserFilter) {
            adminActionsUserFilter.innerHTML = '<option value="">Все пользователи</option>';
            adminActionsState.users.forEach(function (user) {
                var option = document.createElement("option");
                option.value = String(user.id);
                option.textContent = user.display_name || user.email || "Пользователь";
                option.selected = String(adminActionsState.userId) === String(user.id);
                adminActionsUserFilter.appendChild(option);
            });
        }

        if (adminActionsTypeFilter) {
            adminActionsTypeFilter.innerHTML = '<option value="">Все действия</option>';
            adminActionsState.actions.forEach(function (action) {
                var option = document.createElement("option");
                option.value = action.key || "";
                option.textContent = action.label || action.key || "";
                option.selected = adminActionsState.actionKey === option.value;
                adminActionsTypeFilter.appendChild(option);
            });
        }
    }

    function renderAdminActionsTable() {
        var filteredLogs;

        if (!adminActionsBody) {
            return;
        }

        if (adminActionsState.isLoading) {
            showAdminActionsState("loading");
            return;
        }

        if (adminActionsState.hasError) {
            showAdminActionsState("error");
            return;
        }

        if (!adminActionsState.hasLoaded || !adminActionsState.logs.length) {
            showAdminActionsState("empty");
            return;
        }

        filteredLogs = filterAdminActions(adminActionsState.logs);

        if (!filteredLogs.length) {
            showAdminActionsState("no-results");
            return;
        }

        showAdminActionsState("table");
        adminActionsBody.innerHTML = "";
        filteredLogs.forEach(function (log) {
            adminActionsBody.appendChild(createAdminActionRow(log));
        });
    }

    function showAdminActionsState(state) {
        var states = [
            ["loading", adminActionsLoading],
            ["error", adminActionsError],
            ["empty", adminActionsEmpty],
            ["no-results", adminActionsNoResults]
        ];

        states.forEach(function (entry) {
            if (entry[1]) {
                entry[1].hidden = entry[0] !== state;
            }
        });

        if (adminActionsTableWrap) {
            adminActionsTableWrap.hidden = state !== "table";
        }

        if (state !== "table" && adminActionsBody) {
            adminActionsBody.innerHTML = "";
        }
    }

    function filterAdminActions(logs) {
        var query = (adminActionsState.query || "").trim().toLowerCase();

        if (!query) {
            return logs;
        }

        return logs.filter(function (log) {
            return [
                log.created_at,
                log.user_display_name,
                log.user_email,
                log.action_label,
                log.action_key,
                log.entity_label,
                log.description,
                log.ip_address
            ].join(" ").toLowerCase().indexOf(query) !== -1;
        });
    }

    function createAdminActionRow(log) {
        var row = document.createElement("tr");

        row.appendChild(createAdminUserTextCell(log.created_at || "—", log.created_at || "—"));
        row.appendChild(createAdminActionUserCell(log));
        row.appendChild(createAdminActionBadgeCell(log.action_label || log.action_key || "—"));
        row.appendChild(createAdminUserTextCell(log.entity_label || "—", log.entity_label || "—"));
        row.appendChild(createAdminUserTextCell(log.description || "—", log.description || "—"));
        row.appendChild(createAdminUserTextCell(log.ip_address || "—", log.user_agent || log.ip_address || "—"));

        return row;
    }

    function createAdminActionUserCell(log) {
        var cell = document.createElement("td");
        var wrap = document.createElement("span");
        var name = document.createElement("strong");
        var email = document.createElement("small");

        wrap.className = "admin-action-user-cell";
        name.textContent = log.user_display_name || "Система";
        email.textContent = log.user_email || "—";
        wrap.appendChild(name);
        wrap.appendChild(email);
        cell.appendChild(wrap);

        return cell;
    }

    function createAdminActionBadgeCell(label) {
        var cell = document.createElement("td");
        var badge = document.createElement("span");

        badge.className = "admin-action-badge";
        badge.textContent = label || "Действие";
        cell.appendChild(badge);

        return cell;
    }

    function loadAdminReports(forceReload) {
        if (!adminReportsBody || (adminReportsState.isLoading && !forceReload)) {
            return;
        }

        if (adminReportsState.hasLoaded && !forceReload) {
            renderActiveAdminReportsPanel();
            return;
        }

        adminReportsState.isLoading = true;
        adminReportsState.hasError = false;
        renderActiveAdminReportsPanel();

        fetch("/api/admin/reports", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить отчеты.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminReportsState.reports = (data.reports || []).map(normalizeAdminReportFromApi);
                adminReportsState.stats = data.stats || {};
                adminReportsState.isLoading = false;
                adminReportsState.hasLoaded = true;
                adminReportsState.hasError = false;
                renderActiveAdminReportsPanel();
                renderAdminReportStats();
            })
            .catch(function () {
                adminReportsState.reports = [];
                adminReportsState.stats = {};
                adminReportsState.isLoading = false;
                adminReportsState.hasLoaded = false;
                adminReportsState.hasError = true;
                renderActiveAdminReportsPanel();
            });
    }

    function normalizeAdminReportFromApi(report) {
        return {
            id: report.id,
            title: report.title || "Без названия",
            author: report.author || "Пользователь",
            date: report.date || "—",
            tag: report.tag || "—",
            template_title: report.template_title || "Не выбран",
            folder_name: report.folder_name || "—",
            linked_report_title: report.linked_report_title || "—",
            source_label: report.source_label || "Ручной отчет",
            source_filename: report.source_filename || "—",
            pdf_status: report.pdf_status || "PDF не сформирован",
            status_label: report.status_label || "Создан",
            shares_users_count: Number(report.shares_users_count || 0),
            shares_groups_count: Number(report.shares_groups_count || 0),
            shares_total: Number(report.shares_total || 0),
            updated_at: report.updated_at || "—",
            created_at: report.created_at || "—",
            view_url: report.view_url || "#",
            preview_url: report.preview_url || "#",
            has_pdf: Boolean(report.has_pdf)
        };
    }

    function renderActiveAdminReportsPanel() {
        if (adminReportsState.activeSection === "taxonomy") {
            renderAdminReportTaxonomy();
        } else if (adminReportsState.activeSection === "access") {
            renderAdminReportAccessTable();
        } else if (adminReportsState.activeSection === "structure") {
            renderAdminReportStructureTable();
        } else {
            renderAdminReportsRegistry();
        }
    }

    function renderAdminReportStats() {
        var stats = adminReportsState.stats || {};
        var items = [
            ["Всего", stats.total || 0],
            ["С PDF", stats.with_pdf || 0],
            ["С доступом", stats.shared || 0],
            ["В папках", stats.with_folder || 0]
        ];

        if (!adminReportStats) {
            return;
        }

        adminReportStats.innerHTML = "";
        items.forEach(function (item) {
            var badge = document.createElement("span");
            badge.textContent = item[0] + ": " + item[1];
            adminReportStats.appendChild(badge);
        });
    }

    function renderAdminReportsRegistry() {
        var filteredReports;

        if (!adminReportsBody) {
            return;
        }

        if (adminReportsState.isLoading) {
            showAdminReportTableState("registry", "loading");
            return;
        }

        if (adminReportsState.hasError) {
            showAdminReportTableState("registry", "error");
            return;
        }

        if (!adminReportsState.hasLoaded || !adminReportsState.reports.length) {
            showAdminReportTableState("registry", "empty");
            return;
        }

        filteredReports = filterAdminReports(adminReportsState.reports, adminReportsState.query);

        if (!filteredReports.length) {
            showAdminReportTableState("registry", "no-results");
            return;
        }

        showAdminReportTableState("registry", "table");
        adminReportsBody.innerHTML = "";
        filteredReports.forEach(function (report) {
            adminReportsBody.appendChild(createAdminReportRegistryRow(report));
        });
        renderAdminReportStats();
    }

    function renderAdminReportAccessTable() {
        var sharedReports;
        var filteredReports;

        if (!adminReportAccessBody) {
            return;
        }

        if (adminReportsState.isLoading) {
            showAdminReportTableState("access", "loading");
            return;
        }

        if (adminReportsState.hasError) {
            showAdminReportTableState("access", "error");
            return;
        }

        if (!adminReportsState.hasLoaded) {
            showAdminReportTableState("access", "empty");
            return;
        }

        sharedReports = adminReportsState.reports.filter(function (report) {
            return report.shares_total > 0;
        });

        if (!sharedReports.length) {
            showAdminReportTableState("access", "empty");
            return;
        }

        filteredReports = filterAdminReports(sharedReports, adminReportsState.accessQuery);

        if (!filteredReports.length) {
            showAdminReportTableState("access", "no-results");
            return;
        }

        showAdminReportTableState("access", "table");
        adminReportAccessBody.innerHTML = "";
        filteredReports.forEach(function (report) {
            adminReportAccessBody.appendChild(createAdminReportAccessRow(report));
        });
    }

    function renderAdminReportStructureTable() {
        var filteredReports;

        if (!adminReportStructureBody) {
            return;
        }

        if (adminReportsState.isLoading) {
            showAdminReportTableState("structure", "loading");
            return;
        }

        if (adminReportsState.hasError) {
            showAdminReportTableState("structure", "error");
            return;
        }

        if (!adminReportsState.hasLoaded || !adminReportsState.reports.length) {
            showAdminReportTableState("structure", "empty");
            return;
        }

        filteredReports = filterAdminReports(adminReportsState.reports, adminReportsState.structureQuery);

        if (!filteredReports.length) {
            showAdminReportTableState("structure", "no-results");
            return;
        }

        showAdminReportTableState("structure", "table");
        adminReportStructureBody.innerHTML = "";
        filteredReports.forEach(function (report) {
            adminReportStructureBody.appendChild(createAdminReportStructureRow(report));
        });
    }

    function showAdminReportTableState(panel, state) {
        var map = {
            registry: {
                loading: adminReportsLoading,
                error: adminReportsError,
                empty: adminReportsEmpty,
                noResults: adminReportsNoResults,
                tableWrap: adminReportsTableWrap,
                body: adminReportsBody
            },
            access: {
                loading: adminReportAccessLoading,
                error: adminReportAccessError,
                empty: adminReportAccessEmpty,
                noResults: adminReportAccessNoResults,
                tableWrap: adminReportAccessTableWrap,
                body: adminReportAccessBody
            },
            structure: {
                loading: adminReportStructureLoading,
                error: adminReportStructureError,
                empty: adminReportStructureEmpty,
                noResults: adminReportStructureNoResults,
                tableWrap: adminReportStructureTableWrap,
                body: adminReportStructureBody
            }
        };
        var elements = map[panel];

        if (!elements) {
            return;
        }

        [
            ["loading", elements.loading],
            ["error", elements.error],
            ["empty", elements.empty],
            ["no-results", elements.noResults]
        ].forEach(function (entry) {
            if (entry[1]) {
                entry[1].hidden = entry[0] !== state;
            }
        });

        if (elements.tableWrap) {
            elements.tableWrap.hidden = state !== "table";
        }

        if (state !== "table" && elements.body) {
            elements.body.innerHTML = "";
        }
    }

    function filterAdminReports(reports, queryValue) {
        var query = (queryValue || "").trim().toLowerCase();

        if (!query) {
            return reports;
        }

        return reports.filter(function (report) {
            return [
                report.title,
                report.author,
                report.date,
                report.tag,
                report.template_title,
                report.folder_name,
                report.linked_report_title,
                report.source_label,
                report.source_filename,
                report.pdf_status,
                report.status_label
            ].join(" ").toLowerCase().indexOf(query) !== -1;
        });
    }

    function createAdminReportRegistryRow(report) {
        var row = document.createElement("tr");

        row.appendChild(createAdminReportTitleCell(report));
        row.appendChild(createAdminUserTextCell(report.date, report.date));
        row.appendChild(createAdminUserTextCell(report.template_title, report.template_title));
        row.appendChild(createAdminUserTextCell(report.folder_name, report.folder_name));
        row.appendChild(createAdminUserTextCell(formatAdminReportShares(report), formatAdminReportShares(report)));
        row.appendChild(createAdminReportStatusCell(report));
        row.appendChild(createAdminReportOpenCell(report));

        return row;
    }

    function createAdminReportAccessRow(report) {
        var row = document.createElement("tr");

        row.appendChild(createAdminReportTitleCell(report));
        row.appendChild(createAdminUserTextCell(String(report.shares_users_count), ""));
        row.appendChild(createAdminUserTextCell(String(report.shares_groups_count), ""));
        row.appendChild(createAdminUserTextCell(String(report.shares_total), ""));
        row.appendChild(createAdminReportAccessModeCell(report));
        row.appendChild(createAdminReportOpenCell(report));

        return row;
    }

    function createAdminReportStructureRow(report) {
        var row = document.createElement("tr");

        row.appendChild(createAdminReportTitleCell(report));
        row.appendChild(createAdminUserTextCell(report.folder_name, report.folder_name));
        row.appendChild(createAdminUserTextCell(report.linked_report_title, report.linked_report_title));
        row.appendChild(createAdminUserTextCell(getAdminReportSourceText(report), getAdminReportSourceText(report)));
        row.appendChild(createAdminUserTextCell(report.updated_at, report.updated_at));
        row.appendChild(createAdminReportOpenCell(report));

        return row;
    }

    function createAdminReportTitleCell(report) {
        var cell = document.createElement("td");
        var wrap = document.createElement("span");
        var title = document.createElement("strong");
        var meta = document.createElement("small");

        wrap.className = "admin-report-title-cell";
        title.textContent = report.title || "Без названия";
        title.title = report.title || "Без названия";
        meta.textContent = "ID " + report.id + " · " + (report.tag || "без тега");
        wrap.appendChild(title);
        wrap.appendChild(meta);
        cell.appendChild(wrap);

        return cell;
    }

    function createAdminReportStatusCell(report) {
        var cell = document.createElement("td");
        var badge = document.createElement("span");

        badge.className = "admin-user-role-badge admin-report-status-badge";
        if (report.has_pdf) {
            badge.classList.add("is-admin");
        }
        badge.textContent = report.status_label || "Создан";
        cell.appendChild(badge);

        return cell;
    }

    function createAdminReportAccessModeCell(report) {
        var cell = document.createElement("td");
        var badge = document.createElement("span");

        badge.className = "admin-user-role-badge";
        if (report.shares_groups_count > 0) {
            badge.classList.add("is-admin");
        }
        badge.textContent = report.shares_groups_count > 0 ? "Пользователи и группы" : "Пользователи";
        cell.appendChild(badge);

        return cell;
    }

    function createAdminReportOpenCell(report) {
        var cell = document.createElement("td");
        var link = document.createElement("button");

        link.className = "admin-table-link-button";
        link.type = "button";
        link.textContent = "Открыть";
        link.dataset.adminReportOpen = report.view_url || "#";
        cell.appendChild(link);

        return cell;
    }

    function formatAdminReportShares(report) {
        if (!report.shares_total) {
            return "—";
        }

        return [
            formatAdminCount(report.shares_users_count, "пользователь", "пользователя", "пользователей"),
            formatAdminCount(report.shares_groups_count, "группа", "группы", "групп")
        ].join(" · ");
    }

    function getAdminReportSourceText(report) {
        if (report.source_filename && report.source_filename !== "—") {
            return report.source_label + " · " + report.source_filename;
        }

        return report.source_label || "Ручной отчет";
    }

    function loadAdminReportSettings(forceReload) {
        if (!adminReportSettingsGrid || (adminReportSettingsState.isLoading && !forceReload)) {
            return;
        }

        if (adminReportSettingsState.hasLoaded && !forceReload) {
            renderAdminReportSettings();
            return;
        }

        adminReportSettingsState.isLoading = true;
        adminReportSettingsState.hasError = false;
        renderAdminReportSettings();

        fetch("/api/admin/report-settings", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить настройки отчетов.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminReportSettingsData(data.setting_groups || []);
                adminReportSettingsState.isLoading = false;
                adminReportSettingsState.hasLoaded = true;
                adminReportSettingsState.hasError = false;
                renderAdminReportSettings();
            })
            .catch(function () {
                adminReportSettingsState.settingGroups = [];
                adminReportSettingsState.values = {};
                adminReportSettingsState.isLoading = false;
                adminReportSettingsState.hasLoaded = false;
                adminReportSettingsState.hasError = true;
                renderAdminReportSettings();
            });
    }

    function applyAdminReportSettingsData(settingGroups) {
        adminReportSettingsState.settingGroups = settingGroups;
        adminReportSettingsState.values = {};
        settingGroups.forEach(function (group) {
            (group.settings || []).forEach(function (setting) {
                adminReportSettingsState.values[setting.key] = Boolean(setting.value);
            });
        });
    }

    function renderAdminReportSettings() {
        if (!adminReportSettingsGrid) {
            return;
        }

        if (adminReportSettingsLoading) {
            adminReportSettingsLoading.hidden = !adminReportSettingsState.isLoading;
        }
        if (adminReportSettingsError) {
            adminReportSettingsError.hidden = !adminReportSettingsState.hasError;
        }

        adminReportSettingsGrid.hidden = adminReportSettingsState.isLoading || adminReportSettingsState.hasError;
        adminReportSettingsGrid.innerHTML = "";

        if (adminReportSettingsState.isLoading || adminReportSettingsState.hasError) {
            return;
        }

        adminReportSettingsState.settingGroups.forEach(function (group) {
            var section = document.createElement("section");
            var header = document.createElement("div");
            var title = document.createElement("h3");
            var description = document.createElement("p");
            var list = document.createElement("div");

            section.className = "admin-access-permission-group";
            header.className = "admin-access-permission-group-header";
            title.textContent = group.title || "";
            description.textContent = group.description || "";
            header.appendChild(title);
            header.appendChild(description);
            list.className = "admin-access-permission-list";
            (group.settings || []).forEach(function (setting) {
                list.appendChild(createAdminReportSettingToggle(setting));
            });
            section.appendChild(header);
            section.appendChild(list);
            adminReportSettingsGrid.appendChild(section);
        });
    }

    function createAdminReportSettingToggle(setting) {
        var button = document.createElement("button");
        var text = document.createElement("span");
        var title = document.createElement("strong");
        var description = document.createElement("small");
        var switcher = document.createElement("span");
        var knob = document.createElement("span");
        var isEnabled = Boolean(adminReportSettingsState.values[setting.key]);

        button.className = "admin-access-permission-toggle";
        button.type = "button";
        button.dataset.adminReportSetting = setting.key || "";
        button.classList.toggle("is-enabled", isEnabled);
        title.textContent = setting.title || setting.key || "";
        description.textContent = setting.description || "";
        text.appendChild(title);
        text.appendChild(description);
        switcher.className = "admin-access-switch";
        switcher.appendChild(knob);
        button.appendChild(text);
        button.appendChild(switcher);

        return button;
    }

    function toggleAdminReportSetting(settingKey) {
        if (!settingKey) {
            return;
        }

        adminReportSettingsState.values[settingKey] = !adminReportSettingsState.values[settingKey];
        renderAdminReportSettings();
        setAdminReportSettingsStatus("Есть несохраненные изменения.");
    }

    function saveAdminReportSettings() {
        if (!adminReportSettingsSave) {
            return;
        }

        adminReportSettingsState.isSaving = true;
        adminReportSettingsSave.disabled = true;
        setAdminReportSettingsStatus("Сохраняю настройки...");

        fetch("/api/admin/report-settings", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                settings: adminReportSettingsState.values
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось сохранить настройки отчетов.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminReportSettingsData(data.setting_groups || []);
                renderAdminReportSettings();
                setAdminReportSettingsStatus("Настройки отчетов сохранены.");
                showToast("Настройки отчетов сохранены", "success");
            })
            .catch(function (error) {
                setAdminReportSettingsStatus("Не удалось сохранить настройки.");
                showToast(error.message || "Не удалось сохранить настройки отчетов.", "error");
            })
            .finally(function () {
                adminReportSettingsState.isSaving = false;
                adminReportSettingsSave.disabled = false;
            });
    }

    function setAdminReportSettingsStatus(message) {
        if (adminReportSettingsStatus) {
            adminReportSettingsStatus.textContent = message;
        }
    }

    function loadAdminTemplates(forceReload) {
        if (!adminTemplatesBody || (adminTemplatesState.isLoading && !forceReload)) {
            return;
        }

        if (adminTemplatesState.hasLoaded && !forceReload) {
            renderActiveAdminTemplatesPanel();
            return;
        }

        adminTemplatesState.isLoading = true;
        adminTemplatesState.hasError = false;
        renderActiveAdminTemplatesPanel();

        fetch("/api/admin/templates", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить шаблоны.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminTemplatesState.templates = (data.templates || []).map(normalizeAdminTemplateFromApi);
                adminTemplatesState.stats = data.stats || {};
                adminTemplatesState.typeSummary = data.type_summary || [];
                adminTemplatesState.tagSummary = data.tag_summary || [];
                adminTemplatesState.isLoading = false;
                adminTemplatesState.hasLoaded = true;
                adminTemplatesState.hasError = false;
                renderActiveAdminTemplatesPanel();
                renderAdminTemplateStats();
            })
            .catch(function () {
                adminTemplatesState.templates = [];
                adminTemplatesState.stats = {};
                adminTemplatesState.typeSummary = [];
                adminTemplatesState.tagSummary = [];
                adminTemplatesState.isLoading = false;
                adminTemplatesState.hasLoaded = false;
                adminTemplatesState.hasError = true;
                renderActiveAdminTemplatesPanel();
            });
    }

    function normalizeAdminTemplateFromApi(template) {
        return {
            id: template.id,
            title: template.title || "Без названия",
            tag: template.tag || "—",
            template_type: template.template_type || "Универсальный",
            source_title: template.source_title || "Пустая основа",
            derived_count: Number(template.derived_count || 0),
            group_access_count: Number(template.group_access_count || 0),
            has_content: Boolean(template.has_content),
            content_status: template.content_status || "Пустой",
            created_at: template.created_at || "—",
            updated_at: template.updated_at || "—",
            edit_url: template.edit_url || "#"
        };
    }

    function renderActiveAdminTemplatesPanel() {
        if (adminTemplatesState.activeSection === "taxonomy") {
            renderAdminTemplateTaxonomy();
        } else if (adminTemplatesState.activeSection === "access") {
            renderAdminTemplateAccessTable();
        } else if (adminTemplatesState.activeSection === "chips") {
            renderAdminTemplateChips();
        } else {
            renderAdminTemplatesRegistry();
        }
    }

    function renderAdminTemplateStats() {
        var stats = adminTemplatesState.stats || {};
        var items = [
            ["Всего", stats.total || 0],
            ["Наполнены", stats.with_content || 0],
            ["С доступом", stats.with_group_access || 0],
            ["Типов", stats.types || 0]
        ];

        if (!adminTemplateStats) {
            return;
        }

        adminTemplateStats.innerHTML = "";
        items.forEach(function (item) {
            var badge = document.createElement("span");
            badge.textContent = item[0] + ": " + item[1];
            adminTemplateStats.appendChild(badge);
        });
    }

    function renderAdminTemplatesRegistry() {
        var filteredTemplates;

        if (!adminTemplatesBody) {
            return;
        }

        if (adminTemplatesState.isLoading) {
            showAdminTemplateTableState("registry", "loading");
            return;
        }

        if (adminTemplatesState.hasError) {
            showAdminTemplateTableState("registry", "error");
            return;
        }

        if (!adminTemplatesState.hasLoaded || !adminTemplatesState.templates.length) {
            showAdminTemplateTableState("registry", "empty");
            return;
        }

        filteredTemplates = filterAdminTemplates(adminTemplatesState.templates, adminTemplatesState.query);

        if (!filteredTemplates.length) {
            showAdminTemplateTableState("registry", "no-results");
            return;
        }

        showAdminTemplateTableState("registry", "table");
        adminTemplatesBody.innerHTML = "";
        filteredTemplates.forEach(function (template) {
            adminTemplatesBody.appendChild(createAdminTemplateRegistryRow(template));
        });
        renderAdminTemplateStats();
    }

    function renderAdminTemplateAccessTable() {
        var sharedTemplates;
        var filteredTemplates;

        if (!adminTemplateAccessBody) {
            return;
        }

        if (adminTemplatesState.isLoading) {
            showAdminTemplateTableState("access", "loading");
            return;
        }

        if (adminTemplatesState.hasError) {
            showAdminTemplateTableState("access", "error");
            return;
        }

        if (!adminTemplatesState.hasLoaded) {
            showAdminTemplateTableState("access", "empty");
            return;
        }

        sharedTemplates = adminTemplatesState.templates.filter(function (template) {
            return template.group_access_count > 0;
        });

        if (!sharedTemplates.length) {
            showAdminTemplateTableState("access", "empty");
            return;
        }

        filteredTemplates = filterAdminTemplates(sharedTemplates, adminTemplatesState.accessQuery);

        if (!filteredTemplates.length) {
            showAdminTemplateTableState("access", "no-results");
            return;
        }

        showAdminTemplateTableState("access", "table");
        adminTemplateAccessBody.innerHTML = "";
        filteredTemplates.forEach(function (template) {
            adminTemplateAccessBody.appendChild(createAdminTemplateAccessRow(template));
        });
    }

    function loadAdminTaxonomyOptions(forceReload) {
        if ((!adminReportTypeOptions && !adminTemplateTypeOptions) || (adminTaxonomyState.isLoading && !forceReload)) {
            return;
        }

        if (adminTaxonomyState.hasLoaded && !forceReload) {
            renderAdminReportTaxonomy();
            renderAdminTemplateTaxonomy();
            return;
        }

        adminTaxonomyState.isLoading = true;
        adminTaxonomyState.hasError = false;
        renderAdminReportTaxonomy();
        renderAdminTemplateTaxonomy();

        fetch("/api/admin/taxonomy-options", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить типы и теги.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminTaxonomyState.options = normalizeAdminTaxonomyOptions(data.options || {});
                adminTaxonomyState.isLoading = false;
                adminTaxonomyState.hasLoaded = true;
                adminTaxonomyState.hasError = false;
                renderAdminReportTaxonomy();
                renderAdminTemplateTaxonomy();
            })
            .catch(function () {
                adminTaxonomyState.options = normalizeAdminTaxonomyOptions({});
                adminTaxonomyState.isLoading = false;
                adminTaxonomyState.hasLoaded = false;
                adminTaxonomyState.hasError = true;
                renderAdminReportTaxonomy();
                renderAdminTemplateTaxonomy();
            });
    }

    function normalizeAdminTaxonomyOptions(rawOptions) {
        var normalized = {
            report: {
                type: [],
                tag: []
            },
            template: {
                type: [],
                tag: []
            }
        };

        ["report", "template"].forEach(function (scope) {
            ["type", "tag"].forEach(function (optionType) {
                normalized[scope][optionType] = (((rawOptions[scope] || {})[optionType]) || []).map(normalizeAdminTaxonomyOption);
            });
        });

        return normalized;
    }

    function normalizeAdminTaxonomyOption(option) {
        return {
            id: option.id,
            scope: option.scope || "",
            option_type: option.option_type || "",
            name: option.name || "—",
            color: option.color || "",
            sort_order: Number(option.sort_order || 0),
            is_active: option.is_active !== false,
            is_system: Boolean(option.is_system),
            source: option.source || "configured",
            source_label: option.source_label || "Справочник",
            usage_count: Number(option.usage_count || 0)
        };
    }

    function renderAdminReportTaxonomy() {
        renderAdminTaxonomyPanel({
            scope: "report",
            typeList: adminReportTypeOptions,
            tagList: adminReportTagOptions,
            loading: adminReportTaxonomyLoading,
            error: adminReportTaxonomyError,
            empty: adminReportTaxonomyEmpty
        });
    }

    function renderAdminTemplateTaxonomy() {
        renderAdminTaxonomyPanel({
            scope: "template",
            typeList: adminTemplateTypeOptions,
            tagList: adminTemplateTagOptions,
            loading: adminTemplateTaxonomyLoading,
            error: adminTemplateTaxonomyError,
            empty: adminTemplateTaxonomyEmpty
        });
    }

    function renderAdminTaxonomyPanel(config) {
        var grid = config.typeList ? config.typeList.closest(".admin-taxonomy-grid") : null;
        var hasOptions = getAdminTaxonomyOptions(config.scope, "type").length > 0 ||
            getAdminTaxonomyOptions(config.scope, "tag").length > 0;
        var state = "table";

        if (adminTaxonomyState.isLoading) {
            state = "loading";
        } else if (adminTaxonomyState.hasError) {
            state = "error";
        } else if (!hasOptions) {
            state = "empty";
        }

        if (config.loading) {
            config.loading.hidden = state !== "loading";
        }
        if (config.error) {
            config.error.hidden = state !== "error";
        }
        if (config.empty) {
            config.empty.hidden = state !== "empty";
        }
        if (grid) {
            grid.hidden = state !== "table";
        }

        if (state !== "table") {
            if (config.typeList) {
                config.typeList.innerHTML = "";
            }
            if (config.tagList) {
                config.tagList.innerHTML = "";
            }
            return;
        }

        renderAdminTaxonomyList(config.typeList, config.scope, "type");
        renderAdminTaxonomyList(config.tagList, config.scope, "tag");
    }

    function renderAdminTaxonomyList(container, scope, optionType) {
        var options;
        var empty;

        if (!container) {
            return;
        }

        options = getAdminTaxonomyOptions(scope, optionType);
        container.innerHTML = "";

        if (!options.length) {
            empty = document.createElement("div");
            empty.className = "admin-taxonomy-empty";
            empty.textContent = "Значения пока не добавлены.";
            container.appendChild(empty);
            return;
        }

        options.forEach(function (option) {
            container.appendChild(createAdminTaxonomyOptionItem(option));
        });
    }

    function createAdminTaxonomyOptionItem(option) {
        var item = document.createElement("div");
        var content = document.createElement("div");
        var color = document.createElement("span");
        var text = document.createElement("div");
        var name = document.createElement("strong");
        var meta = document.createElement("span");
        var actions = document.createElement("div");
        var source = document.createElement("span");

        item.className = "admin-taxonomy-option";
        content.className = "admin-taxonomy-option-content";
        color.className = "admin-taxonomy-color-dot";
        color.style.background = option.color || getAdminTaxonomyDefaultColor(option.scope, option.option_type);
        text.className = "admin-taxonomy-option-text";
        name.textContent = option.name || "—";
        meta.textContent = [
            formatAdminCount(option.usage_count, "использование", "использования", "использований"),
            option.source_label || "Справочник"
        ].join(" · ");
        text.appendChild(name);
        text.appendChild(meta);
        content.appendChild(color);
        content.appendChild(text);

        actions.className = "admin-taxonomy-option-actions";
        source.className = "admin-taxonomy-source-badge";
        source.textContent = option.source_label || "Справочник";
        actions.appendChild(source);

        if (option.id) {
            var edit = document.createElement("button");
            var deactivate = document.createElement("button");

            edit.type = "button";
            edit.className = "admin-table-link-button";
            edit.textContent = "Изменить";
            edit.dataset.adminTaxonomyEdit = String(option.id);
            edit.dataset.adminTaxonomyScope = option.scope;
            edit.dataset.adminTaxonomyType = option.option_type;

            deactivate.type = "button";
            deactivate.className = "admin-table-link-button is-danger";
            deactivate.textContent = "Скрыть";
            deactivate.dataset.adminTaxonomyDeactivate = String(option.id);

            actions.appendChild(edit);
            actions.appendChild(deactivate);
        }

        item.appendChild(content);
        item.appendChild(actions);

        return item;
    }

    function getAdminTaxonomyDefaultColor(scope, optionType) {
        if (scope === "report") {
            return optionType === "type" ? "#4f46e5" : "#0ea5e9";
        }

        return optionType === "type" ? "#7c3aed" : "#0891b2";
    }

    function getAdminTaxonomyOptions(scope, optionType) {
        return (((adminTaxonomyState.options || {})[scope] || {})[optionType] || []);
    }

    function openAdminTaxonomyModal(scope, optionType, optionId) {
        var option = optionId ? findAdminTaxonomyOption(scope, optionType, optionId) : null;
        var isEditing = Boolean(option);

        if (!adminTaxonomyOptionModal || !adminTaxonomyName || !adminTaxonomyColor) {
            return;
        }

        adminTaxonomyState.editingOptionId = isEditing ? option.id : null;
        adminTaxonomyState.editingScope = scope;
        adminTaxonomyState.editingType = optionType;

        adminTaxonomyName.value = isEditing ? option.name || "" : "";
        adminTaxonomyColor.value = isEditing ? option.color || "" : "";

        if (adminTaxonomyModalTitle) {
            adminTaxonomyModalTitle.textContent = isEditing ? "Изменить значение" : "Добавить значение";
        }
        if (adminTaxonomyModalSubtitle) {
            adminTaxonomyModalSubtitle.textContent = getAdminTaxonomyScopeLabel(scope) + " · " + getAdminTaxonomyTypeLabel(optionType);
        }

        openModal(adminTaxonomyOptionModal);
        adminTaxonomyName.focus();
    }

    function findAdminTaxonomyOption(scope, optionType, optionId) {
        var id = String(optionId || "");

        return getAdminTaxonomyOptions(scope, optionType).find(function (option) {
            return String(option.id || "") === id;
        }) || null;
    }

    function saveAdminTaxonomyOption(event) {
        var optionId = adminTaxonomyState.editingOptionId;
        var url = optionId ? "/api/admin/taxonomy-options/" + optionId : "/api/admin/taxonomy-options";
        var method = optionId ? "PATCH" : "POST";

        event.preventDefault();

        if (!adminTaxonomyName || !adminTaxonomyName.value.trim()) {
            showToast("Введите название значения.", "warning");
            return;
        }

        adminTaxonomyState.isSaving = true;
        if (adminTaxonomySubmit) {
            adminTaxonomySubmit.disabled = true;
        }

        fetch(url, {
            method: method,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                scope: adminTaxonomyState.editingScope,
                option_type: adminTaxonomyState.editingType,
                name: adminTaxonomyName.value,
                color: adminTaxonomyColor ? adminTaxonomyColor.value : ""
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось сохранить значение.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminTaxonomyState.options = normalizeAdminTaxonomyOptions(data.options || {});
                adminTaxonomyState.hasLoaded = true;
                adminTaxonomyState.hasError = false;
                renderAdminReportTaxonomy();
                renderAdminTemplateTaxonomy();
                closeModal(adminTaxonomyOptionModal);
                showToast("Значение справочника сохранено", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось сохранить значение.", "error");
            })
            .finally(function () {
                adminTaxonomyState.isSaving = false;
                if (adminTaxonomySubmit) {
                    adminTaxonomySubmit.disabled = false;
                }
            });
    }

    function deactivateAdminTaxonomyOption(optionId) {
        if (!optionId) {
            return;
        }

        if (!window.confirm("Скрыть это значение из справочника?")) {
            return;
        }

        fetch("/api/admin/taxonomy-options/" + optionId + "/deactivate", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось скрыть значение.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminTaxonomyState.options = normalizeAdminTaxonomyOptions(data.options || {});
                adminTaxonomyState.hasLoaded = true;
                adminTaxonomyState.hasError = false;
                renderAdminReportTaxonomy();
                renderAdminTemplateTaxonomy();
                showToast("Значение скрыто", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось скрыть значение.", "error");
            });
    }

    function getAdminTaxonomyScopeLabel(scope) {
        return scope === "report" ? "Отчеты" : "Шаблоны";
    }

    function getAdminTaxonomyTypeLabel(optionType) {
        return optionType === "type" ? "Типы" : "Теги";
    }

    function showAdminTemplateTableState(panel, state) {
        var map = {
            registry: {
                loading: adminTemplatesLoading,
                error: adminTemplatesError,
                empty: adminTemplatesEmpty,
                noResults: adminTemplatesNoResults,
                tableWrap: adminTemplatesTableWrap,
                body: adminTemplatesBody
            },
            access: {
                loading: adminTemplateAccessLoading,
                error: adminTemplateAccessError,
                empty: adminTemplateAccessEmpty,
                noResults: adminTemplateAccessNoResults,
                tableWrap: adminTemplateAccessTableWrap,
                body: adminTemplateAccessBody
            }
        };
        var elements = map[panel];

        if (!elements) {
            return;
        }

        [
            ["loading", elements.loading],
            ["error", elements.error],
            ["empty", elements.empty],
            ["no-results", elements.noResults]
        ].forEach(function (entry) {
            if (entry[1]) {
                entry[1].hidden = entry[0] !== state;
            }
        });

        if (elements.tableWrap) {
            elements.tableWrap.hidden = state !== "table";
        }

        if (state !== "table" && elements.body) {
            elements.body.innerHTML = "";
        }
    }

    function filterAdminTemplates(templates, queryValue) {
        var query = (queryValue || "").trim().toLowerCase();

        if (!query) {
            return templates;
        }

        return templates.filter(function (template) {
            return [
                template.title,
                template.tag,
                template.template_type,
                template.source_title,
                template.content_status
            ].join(" ").toLowerCase().indexOf(query) !== -1;
        });
    }

    function createAdminTemplateRegistryRow(template) {
        var row = document.createElement("tr");

        row.appendChild(createAdminTemplateTitleCell(template));
        row.appendChild(createAdminUserTextCell(template.template_type, template.template_type));
        row.appendChild(createAdminUserTextCell(template.tag, template.tag));
        row.appendChild(createAdminUserTextCell(template.source_title, template.source_title));
        row.appendChild(createAdminUserTextCell(formatAdminCount(template.group_access_count, "группа", "группы", "групп"), ""));
        row.appendChild(createAdminTemplateStatusCell(template));
        row.appendChild(createAdminTemplateOpenCell(template));

        return row;
    }

    function createAdminTemplateAccessRow(template) {
        var row = document.createElement("tr");

        row.appendChild(createAdminTemplateTitleCell(template));
        row.appendChild(createAdminUserTextCell(template.template_type, template.template_type));
        row.appendChild(createAdminUserTextCell(formatAdminCount(template.group_access_count, "группа", "группы", "групп"), ""));
        row.appendChild(createAdminUserTextCell(formatAdminCount(template.derived_count, "шаблон", "шаблона", "шаблонов"), ""));
        row.appendChild(createAdminTemplateAccessModeCell(template));
        row.appendChild(createAdminTemplateOpenCell(template));

        return row;
    }

    function createAdminTemplateTitleCell(template) {
        var cell = document.createElement("td");
        var wrap = document.createElement("span");
        var title = document.createElement("strong");
        var meta = document.createElement("small");

        wrap.className = "admin-report-title-cell";
        title.textContent = template.title || "Без названия";
        title.title = template.title || "Без названия";
        meta.textContent = "ID " + template.id + " · обновлен " + template.updated_at;
        wrap.appendChild(title);
        wrap.appendChild(meta);
        cell.appendChild(wrap);

        return cell;
    }

    function createAdminTemplateStatusCell(template) {
        var cell = document.createElement("td");
        var badge = document.createElement("span");

        badge.className = "admin-user-role-badge admin-report-status-badge";
        if (template.has_content) {
            badge.classList.add("is-admin");
        }
        badge.textContent = template.content_status || "Пустой";
        cell.appendChild(badge);

        return cell;
    }

    function createAdminTemplateAccessModeCell(template) {
        var cell = document.createElement("td");
        var badge = document.createElement("span");

        badge.className = "admin-user-role-badge";
        badge.classList.add("is-admin");
        badge.textContent = "Группы";
        cell.appendChild(badge);

        return cell;
    }

    function createAdminTemplateOpenCell(template) {
        var cell = document.createElement("td");
        var link = document.createElement("button");

        link.className = "admin-table-link-button";
        link.type = "button";
        link.textContent = "Открыть";
        link.dataset.adminTemplateOpen = template.edit_url || "#";
        cell.appendChild(link);

        return cell;
    }

    function loadAdminTemplateChips(forceReload) {
        if (!adminTemplateChipList || (adminTemplateChipsState.isLoading && !forceReload)) {
            return;
        }

        if (adminTemplateChipsState.hasLoaded && !forceReload) {
            renderAdminTemplateChips();
            return;
        }

        adminTemplateChipsState.isLoading = true;
        adminTemplateChipsState.hasError = false;
        renderAdminTemplateChips();

        fetch("/api/admin/template-chips", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить настройки чипов.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminTemplateChipSettings(data.settings || {});
                adminTemplateChipsState.isLoading = false;
                adminTemplateChipsState.hasLoaded = true;
                adminTemplateChipsState.hasError = false;
                renderAdminTemplateChips();
            })
            .catch(function () {
                adminTemplateChipsState.chips = [];
                adminTemplateChipsState.categories = [];
                adminTemplateChipsState.isLoading = false;
                adminTemplateChipsState.hasLoaded = false;
                adminTemplateChipsState.hasError = true;
                renderAdminTemplateChips();
            });
    }

    function applyAdminTemplateChipSettings(settings) {
        adminTemplateChipsState.categories = (settings.categories || []).map(normalizeAdminTemplateChipCategory);
        adminTemplateChipsState.chips = (settings.chips || []).map(normalizeAdminTemplateChip);
    }

    function normalizeAdminTemplateChipCategory(category) {
        return {
            id: category.id,
            key: category.key || "",
            name: category.name || category.key || "Категория",
            description: category.description || "",
            sort_order: Number(category.sort_order || 0),
            is_active: category.is_active !== false,
            is_system: Boolean(category.is_system)
        };
    }

    function normalizeAdminTemplateChip(chip) {
        return {
            id: chip.id,
            field: chip.field || "",
            label: chip.label || "Чип",
            category_key: chip.category_key || chip.group || "custom",
            group: chip.group || chip.category_key || "custom",
            kind: chip.kind || "text",
            based_on: chip.based_on || chip.basedOn || "",
            latex_markup: chip.latex_markup || chip.latex || "",
            is_favorite: Boolean(chip.is_favorite || chip.isFavorite),
            is_active: chip.is_active !== false,
            sort_order: Number(chip.sort_order || 0)
        };
    }

    function renderAdminTemplateChips() {
        var hasConfiguredChips = adminTemplateChipsState.chips.length > 0;
        var hasCategories = adminTemplateChipsState.categories.length > 0;
        var layout = adminTemplateChipList ? adminTemplateChipList.closest(".admin-template-chips-layout") : null;
        var state = "table";

        if (adminTemplateChipsState.isLoading) {
            state = "loading";
        } else if (adminTemplateChipsState.hasError) {
            state = "error";
        } else if (!hasConfiguredChips && !hasCategories) {
            state = "empty";
        }

        if (adminTemplateChipsLoading) {
            adminTemplateChipsLoading.hidden = state !== "loading";
        }
        if (adminTemplateChipsError) {
            adminTemplateChipsError.hidden = state !== "error";
        }
        if (adminTemplateChipsEmpty) {
            adminTemplateChipsEmpty.hidden = state !== "empty";
        }
        if (layout) {
            layout.hidden = state !== "table";
        }

        if (state !== "table") {
            if (adminTemplateChipList) {
                adminTemplateChipList.innerHTML = "";
            }
            if (adminTemplateChipCategoryList) {
                adminTemplateChipCategoryList.innerHTML = "";
            }
            return;
        }

        renderAdminTemplateChipList();
        renderAdminTemplateChipCategoryList();
    }

    function renderAdminTemplateChipList() {
        if (!adminTemplateChipList) {
            return;
        }

        adminTemplateChipList.innerHTML = "";

        if (!adminTemplateChipsState.chips.length) {
            adminTemplateChipList.appendChild(createAdminTemplateChipEmpty("Глобальные чипы пока не добавлены."));
            return;
        }

        adminTemplateChipsState.chips.forEach(function (chip) {
            adminTemplateChipList.appendChild(createAdminTemplateChipItem(chip));
        });
    }

    function renderAdminTemplateChipCategoryList() {
        if (!adminTemplateChipCategoryList) {
            return;
        }

        adminTemplateChipCategoryList.innerHTML = "";
        adminTemplateChipsState.categories.forEach(function (category) {
            adminTemplateChipCategoryList.appendChild(createAdminTemplateChipCategoryItem(category));
        });
    }

    function createAdminTemplateChipItem(chip) {
        var item = document.createElement("div");
        var content = document.createElement("div");
        var title = document.createElement("strong");
        var meta = document.createElement("span");
        var latex = document.createElement("code");
        var actions = document.createElement("div");
        var edit = document.createElement("button");
        var deactivate = document.createElement("button");

        item.className = "admin-template-chip-item";
        content.className = "admin-template-chip-item-content";
        title.textContent = chip.label || "Чип";
        meta.textContent = [
            chip.field || "без ключа",
            getAdminTemplateChipCategoryName(chip.category_key),
            getAdminTemplateChipKindLabel(chip.kind)
        ].join(" · ");
        latex.textContent = chip.latex_markup || "LaTeX-разметка не задана";
        content.appendChild(title);
        content.appendChild(meta);
        content.appendChild(latex);

        actions.className = "admin-template-chip-item-actions";
        edit.className = "admin-table-link-button";
        edit.type = "button";
        edit.textContent = "Изменить";
        edit.dataset.adminTemplateChipEdit = String(chip.id || "");

        deactivate.className = "admin-table-link-button is-danger";
        deactivate.type = "button";
        deactivate.textContent = "Скрыть";
        deactivate.dataset.adminTemplateChipDeactivate = String(chip.id || "");

        actions.appendChild(edit);
        actions.appendChild(deactivate);
        item.appendChild(content);
        item.appendChild(actions);

        return item;
    }

    function createAdminTemplateChipCategoryItem(category) {
        var item = document.createElement("div");
        var content = document.createElement("div");
        var title = document.createElement("strong");
        var meta = document.createElement("span");
        var actions = document.createElement("div");
        var badge = document.createElement("span");

        item.className = "admin-template-chip-category-item";
        content.className = "admin-template-chip-item-content";
        title.textContent = category.name || "Категория";
        meta.textContent = category.description || category.key || "—";
        content.appendChild(title);
        content.appendChild(meta);

        actions.className = "admin-template-chip-item-actions";
        badge.className = "admin-taxonomy-source-badge";
        badge.textContent = category.is_system ? "Системная" : "Своя";
        actions.appendChild(badge);

        if (category.id) {
            var edit = document.createElement("button");
            var deactivate = document.createElement("button");

            edit.className = "admin-table-link-button";
            edit.type = "button";
            edit.textContent = "Изменить";
            edit.dataset.adminTemplateChipCategoryEdit = String(category.id);

            deactivate.className = "admin-table-link-button is-danger";
            deactivate.type = "button";
            deactivate.textContent = "Скрыть";
            deactivate.dataset.adminTemplateChipCategoryDeactivate = String(category.id);

            actions.appendChild(edit);
            actions.appendChild(deactivate);
        }

        item.appendChild(content);
        item.appendChild(actions);

        return item;
    }

    function createAdminTemplateChipEmpty(message) {
        var empty = document.createElement("div");

        empty.className = "admin-taxonomy-empty";
        empty.textContent = message || "Нет данных.";
        return empty;
    }

    function openAdminTemplateChipModal(chipId) {
        var chip = chipId ? findAdminTemplateChip(chipId) : null;
        var isEditing = Boolean(chip);

        if (!adminTemplateChipModal || !adminTemplateChipLabel) {
            return;
        }

        adminTemplateChipsState.editingChipId = isEditing ? chip.id : null;
        renderAdminTemplateChipCategorySelect(isEditing ? chip.category_key : "custom");

        if (adminTemplateChipModalTitle) {
            adminTemplateChipModalTitle.textContent = isEditing ? "Изменить чип" : "Добавить чип";
        }
        adminTemplateChipLabel.value = isEditing ? chip.label || "" : "";
        if (adminTemplateChipField) {
            adminTemplateChipField.value = isEditing ? chip.field || "" : "";
        }
        if (adminTemplateChipBasedOn) {
            adminTemplateChipBasedOn.value = isEditing ? chip.based_on || "" : "";
        }
        if (adminTemplateChipKind) {
            adminTemplateChipKind.value = isEditing ? chip.kind || "text" : "text";
        }
        if (adminTemplateChipFavorite) {
            adminTemplateChipFavorite.checked = isEditing ? Boolean(chip.is_favorite) : false;
        }
        if (adminTemplateChipLatex) {
            adminTemplateChipLatex.value = isEditing ? chip.latex_markup || "" : "";
        }

        openModal(adminTemplateChipModal);
        adminTemplateChipLabel.focus();
    }

    function renderAdminTemplateChipCategorySelect(selectedKey) {
        if (!adminTemplateChipCategory) {
            return;
        }

        adminTemplateChipCategory.innerHTML = "";
        adminTemplateChipsState.categories.forEach(function (category) {
            var option = document.createElement("option");
            option.value = category.key || "custom";
            option.textContent = category.name || category.key || "Категория";
            option.selected = option.value === (selectedKey || "custom");
            adminTemplateChipCategory.appendChild(option);
        });
    }

    function openAdminTemplateChipCategoryModal(categoryId) {
        var category = categoryId ? findAdminTemplateChipCategory(categoryId) : null;
        var isEditing = Boolean(category);

        if (!adminTemplateChipCategoryModal || !adminTemplateChipCategoryName) {
            return;
        }

        adminTemplateChipsState.editingCategoryId = isEditing ? category.id : null;
        if (adminTemplateChipCategoryModalTitle) {
            adminTemplateChipCategoryModalTitle.textContent = isEditing ? "Изменить категорию" : "Добавить категорию";
        }
        adminTemplateChipCategoryName.value = isEditing ? category.name || "" : "";
        if (adminTemplateChipCategoryKey) {
            adminTemplateChipCategoryKey.value = isEditing ? category.key || "" : "";
        }
        if (adminTemplateChipCategoryDescription) {
            adminTemplateChipCategoryDescription.value = isEditing ? category.description || "" : "";
        }

        openModal(adminTemplateChipCategoryModal);
        adminTemplateChipCategoryName.focus();
    }

    function saveAdminTemplateChip(event) {
        var chipId = adminTemplateChipsState.editingChipId;
        var url = chipId ? "/api/admin/template-chips/" + chipId : "/api/admin/template-chips";
        var method = chipId ? "PATCH" : "POST";

        event.preventDefault();

        if (!adminTemplateChipLabel || !adminTemplateChipLabel.value.trim()) {
            showToast("Введите название чипа.", "warning");
            return;
        }

        if (adminTemplateChipSubmit) {
            adminTemplateChipSubmit.disabled = true;
        }

        fetch(url, {
            method: method,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                label: adminTemplateChipLabel.value,
                field: adminTemplateChipField ? adminTemplateChipField.value : "",
                category_key: adminTemplateChipCategory ? adminTemplateChipCategory.value : "custom",
                based_on: adminTemplateChipBasedOn ? adminTemplateChipBasedOn.value : "",
                kind: adminTemplateChipKind ? adminTemplateChipKind.value : "text",
                is_favorite: adminTemplateChipFavorite ? adminTemplateChipFavorite.checked : false,
                latex_markup: adminTemplateChipLatex ? adminTemplateChipLatex.value : ""
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось сохранить чип.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminTemplateChipSettings(data.settings || {});
                adminTemplateChipsState.hasLoaded = true;
                adminTemplateChipsState.hasError = false;
                renderAdminTemplateChips();
                closeModal(adminTemplateChipModal);
                showToast("Чип сохранен", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось сохранить чип.", "error");
            })
            .finally(function () {
                if (adminTemplateChipSubmit) {
                    adminTemplateChipSubmit.disabled = false;
                }
            });
    }

    function saveAdminTemplateChipCategory(event) {
        var categoryId = adminTemplateChipsState.editingCategoryId;
        var url = categoryId ? "/api/admin/template-chip-categories/" + categoryId : "/api/admin/template-chip-categories";
        var method = categoryId ? "PATCH" : "POST";

        event.preventDefault();

        if (!adminTemplateChipCategoryName || !adminTemplateChipCategoryName.value.trim()) {
            showToast("Введите название категории.", "warning");
            return;
        }

        if (adminTemplateChipCategorySubmit) {
            adminTemplateChipCategorySubmit.disabled = true;
        }

        fetch(url, {
            method: method,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                name: adminTemplateChipCategoryName.value,
                key: adminTemplateChipCategoryKey ? adminTemplateChipCategoryKey.value : "",
                description: adminTemplateChipCategoryDescription ? adminTemplateChipCategoryDescription.value : ""
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось сохранить категорию.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminTemplateChipSettings(data.settings || {});
                adminTemplateChipsState.hasLoaded = true;
                adminTemplateChipsState.hasError = false;
                renderAdminTemplateChips();
                closeModal(adminTemplateChipCategoryModal);
                showToast("Категория сохранена", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось сохранить категорию.", "error");
            })
            .finally(function () {
                if (adminTemplateChipCategorySubmit) {
                    adminTemplateChipCategorySubmit.disabled = false;
                }
            });
    }

    function deactivateAdminTemplateChip(chipId) {
        if (!chipId || !window.confirm("Скрыть этот чип?")) {
            return;
        }

        fetch("/api/admin/template-chips/" + chipId + "/deactivate", {
            method: "POST",
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось скрыть чип.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminTemplateChipSettings(data.settings || {});
                renderAdminTemplateChips();
                showToast("Чип скрыт", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось скрыть чип.", "error");
            });
    }

    function deactivateAdminTemplateChipCategory(categoryId) {
        if (!categoryId || !window.confirm("Скрыть эту категорию?")) {
            return;
        }

        fetch("/api/admin/template-chip-categories/" + categoryId + "/deactivate", {
            method: "POST",
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось скрыть категорию.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminTemplateChipSettings(data.settings || {});
                renderAdminTemplateChips();
                showToast("Категория скрыта", "success");
            })
            .catch(function (error) {
                showToast(error.message || "Не удалось скрыть категорию.", "error");
            });
    }

    function findAdminTemplateChip(chipId) {
        var id = String(chipId || "");

        return adminTemplateChipsState.chips.find(function (chip) {
            return String(chip.id || "") === id;
        }) || null;
    }

    function findAdminTemplateChipCategory(categoryId) {
        var id = String(categoryId || "");

        return adminTemplateChipsState.categories.find(function (category) {
            return String(category.id || "") === id;
        }) || null;
    }

    function getAdminTemplateChipCategoryName(categoryKey) {
        var category = adminTemplateChipsState.categories.find(function (item) {
            return item.key === categoryKey;
        });

        return category ? category.name : categoryKey || "Пользовательские";
    }

    function getAdminTemplateChipKindLabel(kind) {
        var labels = {
            text: "Текст",
            table: "Таблица",
            list: "Список",
            asset: "Графика",
            page_break: "Разрыв страницы"
        };

        return labels[kind] || "Текст";
    }

    function loadAdminTemplateSettings(forceReload) {
        if (!adminTemplateSettingsGrid || (adminTemplateSettingsState.isLoading && !forceReload)) {
            return;
        }

        if (adminTemplateSettingsState.hasLoaded && !forceReload) {
            renderAdminTemplateSettings();
            return;
        }

        adminTemplateSettingsState.isLoading = true;
        adminTemplateSettingsState.hasError = false;
        renderAdminTemplateSettings();

        fetch("/api/admin/template-settings", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить настройки шаблонов.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminTemplateSettingsData(data.setting_groups || []);
                adminTemplateSettingsState.isLoading = false;
                adminTemplateSettingsState.hasLoaded = true;
                adminTemplateSettingsState.hasError = false;
                renderAdminTemplateSettings();
            })
            .catch(function () {
                adminTemplateSettingsState.settingGroups = [];
                adminTemplateSettingsState.values = {};
                adminTemplateSettingsState.isLoading = false;
                adminTemplateSettingsState.hasLoaded = false;
                adminTemplateSettingsState.hasError = true;
                renderAdminTemplateSettings();
            });
    }

    function applyAdminTemplateSettingsData(settingGroups) {
        adminTemplateSettingsState.settingGroups = settingGroups;
        adminTemplateSettingsState.values = {};
        settingGroups.forEach(function (group) {
            (group.settings || []).forEach(function (setting) {
                adminTemplateSettingsState.values[setting.key] = Boolean(setting.value);
            });
        });
    }

    function renderAdminTemplateSettings() {
        if (!adminTemplateSettingsGrid) {
            return;
        }

        if (adminTemplateSettingsLoading) {
            adminTemplateSettingsLoading.hidden = !adminTemplateSettingsState.isLoading;
        }
        if (adminTemplateSettingsError) {
            adminTemplateSettingsError.hidden = !adminTemplateSettingsState.hasError;
        }

        adminTemplateSettingsGrid.hidden = adminTemplateSettingsState.isLoading || adminTemplateSettingsState.hasError;
        adminTemplateSettingsGrid.innerHTML = "";

        if (adminTemplateSettingsState.isLoading || adminTemplateSettingsState.hasError) {
            return;
        }

        adminTemplateSettingsState.settingGroups.forEach(function (group) {
            var section = document.createElement("section");
            var header = document.createElement("div");
            var title = document.createElement("h3");
            var description = document.createElement("p");
            var list = document.createElement("div");

            section.className = "admin-access-permission-group";
            header.className = "admin-access-permission-group-header";
            title.textContent = group.title || "";
            description.textContent = group.description || "";
            header.appendChild(title);
            header.appendChild(description);
            list.className = "admin-access-permission-list";
            (group.settings || []).forEach(function (setting) {
                list.appendChild(createAdminTemplateSettingToggle(setting));
            });
            section.appendChild(header);
            section.appendChild(list);
            adminTemplateSettingsGrid.appendChild(section);
        });
    }

    function createAdminTemplateSettingToggle(setting) {
        var button = document.createElement("button");
        var text = document.createElement("span");
        var title = document.createElement("strong");
        var description = document.createElement("small");
        var switcher = document.createElement("span");
        var knob = document.createElement("span");
        var isEnabled = Boolean(adminTemplateSettingsState.values[setting.key]);

        button.className = "admin-access-permission-toggle";
        button.type = "button";
        button.dataset.adminTemplateSetting = setting.key || "";
        button.classList.toggle("is-enabled", isEnabled);
        title.textContent = setting.title || setting.key || "";
        description.textContent = setting.description || "";
        text.appendChild(title);
        text.appendChild(description);
        switcher.className = "admin-access-switch";
        switcher.appendChild(knob);
        button.appendChild(text);
        button.appendChild(switcher);

        return button;
    }

    function toggleAdminTemplateSetting(settingKey) {
        if (!settingKey) {
            return;
        }

        adminTemplateSettingsState.values[settingKey] = !adminTemplateSettingsState.values[settingKey];
        renderAdminTemplateSettings();
        setAdminTemplateSettingsStatus("Есть несохраненные изменения.");
    }

    function saveAdminTemplateSettings() {
        if (!adminTemplateSettingsSave) {
            return;
        }

        adminTemplateSettingsState.isSaving = true;
        adminTemplateSettingsSave.disabled = true;
        setAdminTemplateSettingsStatus("Сохраняю настройки...");

        fetch("/api/admin/template-settings", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                settings: adminTemplateSettingsState.values
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось сохранить настройки шаблонов.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminTemplateSettingsData(data.setting_groups || []);
                renderAdminTemplateSettings();
                setAdminTemplateSettingsStatus("Настройки шаблонов сохранены.");
                showToast("Настройки шаблонов сохранены", "success");
            })
            .catch(function (error) {
                setAdminTemplateSettingsStatus("Не удалось сохранить настройки.");
                showToast(error.message || "Не удалось сохранить настройки шаблонов.", "error");
            })
            .finally(function () {
                adminTemplateSettingsState.isSaving = false;
                adminTemplateSettingsSave.disabled = false;
            });
    }

    function setAdminTemplateSettingsStatus(message) {
        if (adminTemplateSettingsStatus) {
            adminTemplateSettingsStatus.textContent = message;
        }
    }

    function loadAdminSystemSettings(forceReload) {
        if (!adminSystemSettingsGrids.length || (adminSystemState.isLoadingSettings && !forceReload)) {
            return;
        }

        if (adminSystemState.hasLoadedSettings && !forceReload) {
            renderAdminSystemSettings();
            return;
        }

        adminSystemState.isLoadingSettings = true;
        adminSystemState.hasSettingsError = false;
        renderAdminSystemSettings();

        fetch("/api/admin/system-settings", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить системные настройки.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminSystemSettingsData(data.setting_groups || []);
                adminSystemState.isLoadingSettings = false;
                adminSystemState.hasLoadedSettings = true;
                adminSystemState.hasSettingsError = false;
                renderAdminSystemSettings();
            })
            .catch(function () {
                adminSystemState.settingGroups = [];
                adminSystemState.values = {};
                adminSystemState.isLoadingSettings = false;
                adminSystemState.hasLoadedSettings = false;
                adminSystemState.hasSettingsError = true;
                renderAdminSystemSettings();
            });
    }

    function applyAdminSystemSettingsData(settingGroups) {
        adminSystemState.settingGroups = settingGroups;
        adminSystemState.values = {};
        settingGroups.forEach(function (group) {
            (group.settings || []).forEach(function (setting) {
                adminSystemState.values[setting.key] = setting.value;
            });
        });
    }

    function renderAdminSystemSettings() {
        adminSystemSettingsLoading.forEach(function (element) {
            element.hidden = !adminSystemState.isLoadingSettings;
        });
        adminSystemSettingsError.forEach(function (element) {
            element.hidden = !adminSystemState.hasSettingsError;
        });

        adminSystemSettingsGrids.forEach(function (grid) {
            var sectionKey = grid.dataset.adminSystemSettingsGrid || "";
            var group = getAdminSystemSettingGroup(sectionKey);

            grid.hidden = adminSystemState.isLoadingSettings || adminSystemState.hasSettingsError;
            grid.innerHTML = "";

            if (grid.hidden || !group) {
                return;
            }

            grid.appendChild(createAdminSystemSettingGroup(group));
        });
    }

    function getAdminSystemSettingGroup(sectionKey) {
        return adminSystemState.settingGroups.find(function (group) {
            return group.key === sectionKey;
        }) || null;
    }

    function createAdminSystemSettingGroup(group) {
        var section = document.createElement("section");
        var header = document.createElement("div");
        var title = document.createElement("h3");
        var description = document.createElement("p");
        var list = document.createElement("div");

        section.className = "admin-access-permission-group";
        header.className = "admin-access-permission-group-header";
        title.textContent = group.title || "";
        description.textContent = group.description || "";
        header.appendChild(title);
        header.appendChild(description);
        list.className = "admin-system-setting-list";

        (group.settings || []).forEach(function (setting) {
            list.appendChild(createAdminSystemSettingControl(setting));
        });

        section.appendChild(header);
        section.appendChild(list);

        return section;
    }

    function createAdminSystemSettingControl(setting) {
        if ((setting.type || "") === "boolean") {
            return createAdminSystemSettingToggle(setting);
        }

        return createAdminSystemSettingField(setting);
    }

    function createAdminSystemSettingToggle(setting) {
        var button = document.createElement("button");
        var text = document.createElement("span");
        var title = document.createElement("strong");
        var description = document.createElement("small");
        var switcher = document.createElement("span");
        var knob = document.createElement("span");
        var isEnabled = Boolean(adminSystemState.values[setting.key]);

        button.className = "admin-access-permission-toggle";
        button.type = "button";
        button.dataset.adminSystemSettingToggle = setting.key || "";
        button.classList.toggle("is-enabled", isEnabled);
        title.textContent = setting.title || setting.key || "";
        description.textContent = setting.description || "";
        text.appendChild(title);
        text.appendChild(description);
        switcher.className = "admin-access-switch";
        switcher.appendChild(knob);
        button.appendChild(text);
        button.appendChild(switcher);

        return button;
    }

    function createAdminSystemSettingField(setting) {
        var field = document.createElement("label");
        var text = document.createElement("span");
        var title = document.createElement("strong");
        var description = document.createElement("small");
        var control;

        field.className = "admin-system-setting-field";
        title.textContent = setting.title || setting.key || "";
        description.textContent = setting.description || "";
        text.appendChild(title);
        text.appendChild(description);

        if ((setting.type || "") === "select") {
            control = document.createElement("select");
            (setting.options || []).forEach(function (optionData) {
                var option = document.createElement("option");
                option.value = optionData.value || "";
                option.textContent = optionData.label || optionData.value || "";
                control.appendChild(option);
            });
            control.value = adminSystemState.values[setting.key] || setting.default || "";
            control.addEventListener("change", function () {
                adminSystemState.values[setting.key] = control.value;
                setAdminSystemSettingsStatus("Есть несохраненные изменения.");
            });
        } else {
            control = document.createElement("input");
            control.type = "number";
            control.value = adminSystemState.values[setting.key];
            if (setting.min !== undefined) {
                control.min = setting.min;
            }
            if (setting.max !== undefined) {
                control.max = setting.max;
            }
            control.addEventListener("input", function () {
                adminSystemState.values[setting.key] = control.value;
                setAdminSystemSettingsStatus("Есть несохраненные изменения.");
            });
        }

        field.appendChild(text);
        field.appendChild(control);

        return field;
    }

    function toggleAdminSystemSetting(settingKey) {
        if (!settingKey) {
            return;
        }

        adminSystemState.values[settingKey] = !adminSystemState.values[settingKey];
        renderAdminSystemSettings();
        setAdminSystemSettingsStatus("Есть несохраненные изменения.");
    }

    function saveAdminSystemSettings() {
        adminSystemState.isSaving = true;
        adminSystemSettingsSaveButtons.forEach(function (button) {
            button.disabled = true;
        });
        setAdminSystemSettingsStatus("Сохраняю настройки...");

        fetch("/api/admin/system-settings", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                settings: adminSystemState.values
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось сохранить системные настройки.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                applyAdminSystemSettingsData(data.setting_groups || []);
                renderAdminSystemSettings();
                setAdminSystemSettingsStatus("Системные настройки сохранены.");
                showToast("Системные настройки сохранены", "success");
            })
            .catch(function (error) {
                setAdminSystemSettingsStatus("Не удалось сохранить настройки.");
                showToast(error.message || "Не удалось сохранить системные настройки.", "error");
            })
            .finally(function () {
                adminSystemState.isSaving = false;
                adminSystemSettingsSaveButtons.forEach(function (button) {
                    button.disabled = false;
                });
            });
    }

    function setAdminSystemSettingsStatus(message) {
        adminSystemSettingsStatuses.forEach(function (element) {
            element.textContent = message;
        });
    }

    function loadAdminSystemDiagnostics(forceReload) {
        if (!adminSystemDiagnosticsRoot || (adminSystemState.isLoadingDiagnostics && !forceReload)) {
            return;
        }

        if (adminSystemState.hasLoadedDiagnostics && !forceReload) {
            renderAdminSystemDiagnostics();
            return;
        }

        adminSystemState.isLoadingDiagnostics = true;
        adminSystemState.hasDiagnosticsError = false;
        renderAdminSystemDiagnostics();

        fetch("/api/admin/system-diagnostics", {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin"
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!response.ok) {
                        throw new Error(data.message || "Не удалось загрузить диагностику.");
                    }

                    return data;
                });
            })
            .then(function (data) {
                adminSystemState.diagnostics = data.diagnostics || null;
                adminSystemState.isLoadingDiagnostics = false;
                adminSystemState.hasLoadedDiagnostics = true;
                adminSystemState.hasDiagnosticsError = false;
                renderAdminSystemDiagnostics();
            })
            .catch(function () {
                adminSystemState.diagnostics = null;
                adminSystemState.isLoadingDiagnostics = false;
                adminSystemState.hasLoadedDiagnostics = false;
                adminSystemState.hasDiagnosticsError = true;
                renderAdminSystemDiagnostics();
            });
    }

    function renderAdminSystemDiagnostics() {
        if (adminSystemDiagnosticsLoading) {
            adminSystemDiagnosticsLoading.hidden = !adminSystemState.isLoadingDiagnostics;
        }
        if (adminSystemDiagnosticsError) {
            adminSystemDiagnosticsError.hidden = !adminSystemState.hasDiagnosticsError;
        }
        if (adminSystemDiagnosticsRoot) {
            adminSystemDiagnosticsRoot.hidden = adminSystemState.isLoadingDiagnostics || adminSystemState.hasDiagnosticsError || !adminSystemState.diagnostics;
        }

        if (!adminSystemState.diagnostics || !adminSystemSummary || !adminSystemDiagnosticGrid) {
            return;
        }

        adminSystemSummary.innerHTML = "";
        adminSystemDiagnosticGrid.innerHTML = "";

        (adminSystemState.diagnostics.summary || []).forEach(function (item) {
            adminSystemSummary.appendChild(createAdminSystemSummaryCard(item));
        });

        (adminSystemState.diagnostics.groups || []).forEach(function (group) {
            adminSystemDiagnosticGrid.appendChild(createAdminSystemDiagnosticGroup(group));
        });
    }

    function createAdminSystemSummaryCard(item) {
        var card = document.createElement("div");
        var label = document.createElement("span");
        var value = document.createElement("strong");
        var meta = document.createElement("small");

        card.className = "admin-system-summary-card";
        label.textContent = item.label || "";
        value.textContent = item.value === 0 ? "0" : item.value || "—";
        meta.textContent = item.meta || "";
        card.appendChild(label);
        card.appendChild(value);
        card.appendChild(meta);

        return card;
    }

    function createAdminSystemDiagnosticGroup(group) {
        var section = document.createElement("section");
        var title = document.createElement("h3");
        var list = document.createElement("div");

        section.className = "admin-system-diagnostic-group";
        title.textContent = group.title || "";
        list.className = "admin-system-diagnostic-list";

        (group.items || []).forEach(function (item) {
            list.appendChild(createAdminSystemDiagnosticItem(item));
        });

        section.appendChild(title);
        section.appendChild(list);

        return section;
    }

    function createAdminSystemDiagnosticItem(item) {
        var row = document.createElement("div");
        var label = document.createElement("span");
        var value = document.createElement("strong");
        var tone = item.tone || "ok";

        row.className = "admin-system-diagnostic-item";
        row.classList.add("is-" + tone);
        label.textContent = item.label || "";
        value.textContent = item.value === 0 ? "0" : item.value || "—";
        row.appendChild(label);
        row.appendChild(value);

        return row;
    }

    function renderAdminUsersModule() {
        var adminHome = document.querySelector("[data-admin-home]");
        var adminUsersModule = document.querySelector("[data-admin-users-module]");
        var adminReportsModule = document.querySelector("[data-admin-reports-module]");
        var adminTemplatesModule = document.querySelector("[data-admin-templates-module]");
        var adminSystemModule = document.querySelector("[data-admin-system-module]");

        if (!adminHome || !adminUsersModule) {
            return;
        }

        adminHome.hidden = true;
        if (adminReportsModule) {
            adminReportsModule.hidden = true;
        }
        if (adminTemplatesModule) {
            adminTemplatesModule.hidden = true;
        }
        if (adminSystemModule) {
            adminSystemModule.hidden = true;
        }
        adminUsersModule.hidden = false;
        setAdminUsersSubsection("users");
    }

    function renderAdminReportsModule() {
        var adminHome = document.querySelector("[data-admin-home]");
        var adminUsersModule = document.querySelector("[data-admin-users-module]");
        var adminReportsModule = document.querySelector("[data-admin-reports-module]");
        var adminTemplatesModule = document.querySelector("[data-admin-templates-module]");
        var adminSystemModule = document.querySelector("[data-admin-system-module]");

        if (!adminHome || !adminReportsModule) {
            return;
        }

        adminHome.hidden = true;
        if (adminUsersModule) {
            adminUsersModule.hidden = true;
        }
        if (adminTemplatesModule) {
            adminTemplatesModule.hidden = true;
        }
        if (adminSystemModule) {
            adminSystemModule.hidden = true;
        }
        adminReportsModule.hidden = false;
        setAdminReportsSubsection("registry");
    }

    function renderAdminTemplatesModule() {
        var adminHome = document.querySelector("[data-admin-home]");
        var adminUsersModule = document.querySelector("[data-admin-users-module]");
        var adminReportsModule = document.querySelector("[data-admin-reports-module]");
        var adminTemplatesModule = document.querySelector("[data-admin-templates-module]");
        var adminSystemModule = document.querySelector("[data-admin-system-module]");

        if (!adminHome || !adminTemplatesModule) {
            return;
        }

        adminHome.hidden = true;
        if (adminUsersModule) {
            adminUsersModule.hidden = true;
        }
        if (adminReportsModule) {
            adminReportsModule.hidden = true;
        }
        if (adminSystemModule) {
            adminSystemModule.hidden = true;
        }
        adminTemplatesModule.hidden = false;
        setAdminTemplatesSubsection("registry");
    }

    function renderAdminSystemModule() {
        var adminHome = document.querySelector("[data-admin-home]");
        var adminUsersModule = document.querySelector("[data-admin-users-module]");
        var adminReportsModule = document.querySelector("[data-admin-reports-module]");
        var adminTemplatesModule = document.querySelector("[data-admin-templates-module]");
        var adminSystemModule = document.querySelector("[data-admin-system-module]");

        if (!adminHome || !adminSystemModule) {
            return;
        }

        adminHome.hidden = true;
        if (adminUsersModule) {
            adminUsersModule.hidden = true;
        }
        if (adminReportsModule) {
            adminReportsModule.hidden = true;
        }
        if (adminTemplatesModule) {
            adminTemplatesModule.hidden = true;
        }
        adminSystemModule.hidden = false;
        setAdminSystemSubsection("general");
    }

    function renderAdminHome() {
        var adminHome = document.querySelector("[data-admin-home]");
        var adminUsersModule = document.querySelector("[data-admin-users-module]");
        var adminReportsModule = document.querySelector("[data-admin-reports-module]");
        var adminTemplatesModule = document.querySelector("[data-admin-templates-module]");
        var adminSystemModule = document.querySelector("[data-admin-system-module]");

        if (!adminHome) {
            return;
        }

        if (adminUsersModule) {
            adminUsersModule.hidden = true;
        }
        if (adminReportsModule) {
            adminReportsModule.hidden = true;
        }
        if (adminTemplatesModule) {
            adminTemplatesModule.hidden = true;
        }
        if (adminSystemModule) {
            adminSystemModule.hidden = true;
        }
        adminHome.hidden = false;
        closeAdminUserActionsMenu();
        closeAdminGroupActionsMenu();
    }

    function setAdminUsersSubsection(sectionKey) {
        var normalizedSectionKey = sectionKey || "users";
        var titles = {
            users: "Пользователи",
            groups: "Группы пользователей",
            access: "Права доступа",
            activity: "Действия пользователей"
        };
        var breadcrumbCurrent = document.querySelector("[data-admin-users-breadcrumb-current]");
        var breadcrumbSeparator = document.querySelector("[data-admin-users-breadcrumb-separator]");

        document.querySelectorAll("[data-admin-users-tab]").forEach(function (button) {
            button.classList.toggle("is-active", (button.dataset.adminUsersTab || "") === normalizedSectionKey);
        });

        document.querySelectorAll("[data-admin-users-panel]").forEach(function (panel) {
            var isActive = (panel.dataset.adminUsersPanel || "") === normalizedSectionKey;

            panel.hidden = !isActive;
            panel.classList.toggle("is-active", isActive);
        });

        if (breadcrumbCurrent && breadcrumbSeparator) {
            var shouldShowSubsection = normalizedSectionKey !== "users";

            breadcrumbCurrent.hidden = !shouldShowSubsection;
            breadcrumbSeparator.hidden = !shouldShowSubsection;
            breadcrumbCurrent.textContent = shouldShowSubsection ? titles[normalizedSectionKey] || "" : "";
        }

        if (normalizedSectionKey === "users") {
            if (!adminUsersState.hasLoaded && !adminUsersState.isLoading) {
                loadAdminUsers();
            } else {
                renderAdminUsersTable();
            }
            closeAdminGroupActionsMenu();
        } else if (normalizedSectionKey === "groups") {
            closeAdminUserActionsMenu();

            if (!adminGroupsState.hasLoaded && !adminGroupsState.isLoading) {
                loadAdminGroups();
            } else {
                renderAdminGroupsTable();
            }
            closeAdminGroupActionsMenu();
        } else if (normalizedSectionKey === "access") {
            closeAdminUserActionsMenu();
            closeAdminGroupActionsMenu();

            if (!adminAccessState.hasLoadedOptions && !adminAccessState.isLoadingOptions) {
                loadAdminAccessOptions();
            } else {
                renderAdminAccessSubjects();

                if (adminAccessState.selectedSubjectId) {
                    renderAdminAccessEditor(getAdminAccessSelectedSubject());
                } else {
                    renderAdminAccessEditorState("placeholder");
                }
            }
        } else if (normalizedSectionKey === "activity") {
            closeAdminUserActionsMenu();
            closeAdminGroupActionsMenu();

            if (!adminActionsState.hasLoaded && !adminActionsState.isLoading) {
                loadAdminActions();
            } else {
                renderAdminActionsFilters();
                renderAdminActionsTable();
            }
        } else {
            closeAdminUserActionsMenu();
            closeAdminGroupActionsMenu();
        }
    }

    function setAdminReportsSubsection(sectionKey) {
        var normalizedSectionKey = sectionKey || "registry";
        var titles = {
            registry: "Реестр отчетов",
            access: "Совместный доступ",
            structure: "Папки и связи",
            taxonomy: "Типы и теги",
            settings: "Параметры отчетов"
        };
        var breadcrumbCurrent = document.querySelector("[data-admin-reports-breadcrumb-current]");
        var breadcrumbSeparator = document.querySelector("[data-admin-reports-breadcrumb-separator]");

        adminReportsState.activeSection = normalizedSectionKey;

        document.querySelectorAll("[data-admin-reports-tab]").forEach(function (button) {
            button.classList.toggle("is-active", (button.dataset.adminReportsTab || "") === normalizedSectionKey);
        });

        document.querySelectorAll("[data-admin-reports-panel]").forEach(function (panel) {
            var isActive = (panel.dataset.adminReportsPanel || "") === normalizedSectionKey;

            panel.hidden = !isActive;
            panel.classList.toggle("is-active", isActive);
        });

        if (breadcrumbCurrent && breadcrumbSeparator) {
            var shouldShowSubsection = normalizedSectionKey !== "registry";

            breadcrumbCurrent.hidden = !shouldShowSubsection;
            breadcrumbSeparator.hidden = !shouldShowSubsection;
            breadcrumbCurrent.textContent = shouldShowSubsection ? titles[normalizedSectionKey] || "" : "";
        }

        closeAdminUserActionsMenu();
        closeAdminGroupActionsMenu();

        if (normalizedSectionKey === "settings") {
            if (!adminReportSettingsState.hasLoaded && !adminReportSettingsState.isLoading) {
                loadAdminReportSettings();
            } else {
                renderAdminReportSettings();
            }
            return;
        }

        if (normalizedSectionKey === "taxonomy") {
            if (!adminTaxonomyState.hasLoaded && !adminTaxonomyState.isLoading) {
                loadAdminTaxonomyOptions();
            } else {
                renderAdminReportTaxonomy();
            }
            return;
        }

        if (!adminReportsState.hasLoaded && !adminReportsState.isLoading) {
            loadAdminReports();
        } else {
            renderActiveAdminReportsPanel();
        }
    }

    function setAdminTemplatesSubsection(sectionKey) {
        var normalizedSectionKey = sectionKey || "registry";
        var titles = {
            registry: "Реестр шаблонов",
            taxonomy: "Типы и теги",
            access: "Доступ к шаблонам",
            chips: "Настройка чипов",
            settings: "Параметры редактора"
        };
        var breadcrumbCurrent = document.querySelector("[data-admin-templates-breadcrumb-current]");
        var breadcrumbSeparator = document.querySelector("[data-admin-templates-breadcrumb-separator]");

        adminTemplatesState.activeSection = normalizedSectionKey;

        document.querySelectorAll("[data-admin-templates-tab]").forEach(function (button) {
            button.classList.toggle("is-active", (button.dataset.adminTemplatesTab || "") === normalizedSectionKey);
        });

        document.querySelectorAll("[data-admin-templates-panel]").forEach(function (panel) {
            var isActive = (panel.dataset.adminTemplatesPanel || "") === normalizedSectionKey;

            panel.hidden = !isActive;
            panel.classList.toggle("is-active", isActive);
        });

        if (breadcrumbCurrent && breadcrumbSeparator) {
            var shouldShowSubsection = normalizedSectionKey !== "registry";

            breadcrumbCurrent.hidden = !shouldShowSubsection;
            breadcrumbSeparator.hidden = !shouldShowSubsection;
            breadcrumbCurrent.textContent = shouldShowSubsection ? titles[normalizedSectionKey] || "" : "";
        }

        closeAdminUserActionsMenu();
        closeAdminGroupActionsMenu();

        if (normalizedSectionKey === "settings") {
            if (!adminTemplateSettingsState.hasLoaded && !adminTemplateSettingsState.isLoading) {
                loadAdminTemplateSettings();
            } else {
                renderAdminTemplateSettings();
            }
            return;
        }

        if (normalizedSectionKey === "taxonomy") {
            if (!adminTaxonomyState.hasLoaded && !adminTaxonomyState.isLoading) {
                loadAdminTaxonomyOptions();
            } else {
                renderAdminTemplateTaxonomy();
            }
            return;
        }

        if (normalizedSectionKey === "chips") {
            if (!adminTemplateChipsState.hasLoaded && !adminTemplateChipsState.isLoading) {
                loadAdminTemplateChips();
            } else {
                renderAdminTemplateChips();
            }
            return;
        }

        if (!adminTemplatesState.hasLoaded && !adminTemplatesState.isLoading) {
            loadAdminTemplates();
        } else {
            renderActiveAdminTemplatesPanel();
        }
    }

    function setAdminSystemSubsection(sectionKey) {
        var normalizedSectionKey = sectionKey || "general";
        var titles = {
            general: "Общие настройки",
            security: "Безопасность",
            maintenance: "Обслуживание данных",
            diagnostics: "Диагностика"
        };
        var breadcrumbCurrent = document.querySelector("[data-admin-system-breadcrumb-current]");
        var breadcrumbSeparator = document.querySelector("[data-admin-system-breadcrumb-separator]");

        adminSystemState.activeSection = normalizedSectionKey;

        document.querySelectorAll("[data-admin-system-tab]").forEach(function (button) {
            button.classList.toggle("is-active", (button.dataset.adminSystemTab || "") === normalizedSectionKey);
        });

        document.querySelectorAll("[data-admin-system-panel]").forEach(function (panel) {
            var isActive = (panel.dataset.adminSystemPanel || "") === normalizedSectionKey;

            panel.hidden = !isActive;
            panel.classList.toggle("is-active", isActive);
        });

        if (breadcrumbCurrent && breadcrumbSeparator) {
            var shouldShowSubsection = normalizedSectionKey !== "general";

            breadcrumbCurrent.hidden = !shouldShowSubsection;
            breadcrumbSeparator.hidden = !shouldShowSubsection;
            breadcrumbCurrent.textContent = shouldShowSubsection ? titles[normalizedSectionKey] || "" : "";
        }

        closeAdminUserActionsMenu();
        closeAdminGroupActionsMenu();

        if (normalizedSectionKey === "diagnostics") {
            if (!adminSystemState.hasLoadedDiagnostics && !adminSystemState.isLoadingDiagnostics) {
                loadAdminSystemDiagnostics();
            } else {
                renderAdminSystemDiagnostics();
            }
            return;
        }

        if (!adminSystemState.hasLoadedSettings && !adminSystemState.isLoadingSettings) {
            loadAdminSystemSettings();
        } else {
            renderAdminSystemSettings();
        }
    }

    function autoHideToast(toast) {
        setTimeout(function () {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-8px) scale(0.98)";
            setTimeout(function () {
                toast.remove();
            }, 220);
        }, 3500);
    }

    function debounce(callback, delay) {
        var timer = null;

        return function () {
            var args = arguments;
            window.clearTimeout(timer);
            timer = window.setTimeout(function () {
                callback.apply(null, args);
            }, delay);
        };
    }
});
