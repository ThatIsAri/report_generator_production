from pathlib import Path

from flask import Blueprint, current_app, jsonify, render_template, request, session, url_for
from sqlalchemy import inspect, text

from app.access_permission_service import (
    ensure_access_permission_schema,
    get_access_subject,
    get_permission_definitions,
    get_subject_permission_keys,
    normalize_subject_type,
    replace_subject_permissions,
)
from app.auth import login_required, role_required
from app.extensions import db
from app.models import (
    AdminReportSetting,
    AdminTemplateSetting,
    AdminTaxonomyOption,
    Folder,
    GroupReportAccess,
    GroupTemplateAccess,
    Report,
    ReportDraft,
    ReportShare,
    Template,
    TemplateChipCategory,
    TemplateChipDefinition,
    User,
    UserActionLog,
    UserGroup,
)
from app.organization_service import (
    ensure_organization_data,
    ensure_user_organization_defaults,
    get_role_label,
    normalize_user_role,
)
from app.user_group_service import (
    ensure_user_group_schema,
    get_group_for_admin,
    replace_group_members,
    serialize_user_group,
)
from app.user_action_log_service import (
    ensure_user_action_log_schema,
    get_action_logs,
    get_action_type_options,
    log_user_action,
    serialize_action_log,
)
from app.template_chip_service import (
    create_chip_field_from_label,
    create_chip_key_from_name,
    ensure_template_chip_schema,
    normalize_chip_key,
    normalize_chip_name,
    parse_sort_order,
    serialize_chip_category,
    serialize_chip_definition,
    serialize_template_chip_settings,
)
from app.system_settings_service import (
    ensure_system_settings_schema,
    save_system_settings,
    serialize_system_setting_groups,
)


admin_bp = Blueprint("admin", __name__)

REPORT_TEMPLATE_TITLES = {
    "generic_report_default": "Универсальный отчет",
    "analytical_report_default": "Аналитический отчет",
    "table_report_default": "Табличный отчет",
    "imported_report_default": "Отчет на основе импортированных данных",
    "summary_report_default": "Сводный отчет",
}

ADMIN_TAXONOMY_SCOPES = {"report", "template"}
ADMIN_TAXONOMY_TYPES = {"type", "tag"}
ADMIN_TAXONOMY_DEFAULTS = {
    "report": {
        "type": list(REPORT_TEMPLATE_TITLES.values()),
        "tag": ["Без тега"],
    },
    "template": {
        "type": ["Универсальный", "Учебный", "Практика", "Аналитика", "Табличный", "Импортированный"],
        "tag": ["Без тега"],
    },
}

ADMIN_REPORT_SETTING_GROUPS = [
    {
        "title": "Создание отчетов",
        "description": "Правила, которые помогают держать реестр отчетов аккуратным.",
        "settings": [
            {
                "key": "require_folder",
                "title": "Требовать папку отчета",
                "description": "Новый отчет должен быть привязан к папке перед созданием.",
                "default": False,
            },
            {
                "key": "allow_report_linking",
                "title": "Разрешить связи отчетов",
                "description": "Пользователи могут связывать отчеты между собой в карточке создания.",
                "default": True,
            },
        ],
    },
    {
        "title": "Совместная работа",
        "description": "Параметры общего доступа для пользователей и групп.",
        "settings": [
            {
                "key": "allow_shared_access",
                "title": "Включить совместный доступ",
                "description": "Разрешить открывать доступ к отчетам другим участникам.",
                "default": True,
            },
            {
                "key": "allow_group_sharing",
                "title": "Разрешить доступ группам",
                "description": "В окне совместного доступа можно выбирать группы пользователей.",
                "default": True,
            },
        ],
    },
    {
        "title": "Редактор и сохранение",
        "description": "Поведение отчетов после создания и во время редактирования.",
        "settings": [
            {
                "key": "autosave_enabled",
                "title": "Автосохранение редактора",
                "description": "Сохранять черновики отчетов во время редактирования.",
                "default": True,
            },
            {
                "key": "show_import_source",
                "title": "Показывать источник импорта",
                "description": "Отображать исходные файлы в предпросмотре и админском реестре.",
                "default": True,
            },
        ],
    },
]

ADMIN_TEMPLATE_SETTING_GROUPS = [
    {
        "title": "Создание шаблонов",
        "description": "Правила для новых шаблонов и копирования существующих основ.",
        "settings": [
            {
                "key": "allow_empty_template",
                "title": "Разрешить пустой шаблон",
                "description": "Пользователи могут создавать шаблон без выбора основы.",
                "default": True,
            },
            {
                "key": "require_template_tag",
                "title": "Требовать тег шаблона",
                "description": "Новый шаблон должен иметь тег или категорию.",
                "default": False,
            },
        ],
    },
    {
        "title": "Редактор шаблонов",
        "description": "Поведение редактора, чипов и предпросмотра шаблона.",
        "settings": [
            {
                "key": "template_autosave_enabled",
                "title": "Автосохранение шаблонов",
                "description": "Сохранять изменения шаблона во время редактирования.",
                "default": True,
            },
            {
                "key": "allow_custom_chips",
                "title": "Разрешить пользовательские чипы",
                "description": "Пользователи могут создавать свои чипы и категории.",
                "default": True,
            },
        ],
    },
    {
        "title": "Доступ и публикация",
        "description": "Настройки видимости шаблонов для групп и отчетов.",
        "settings": [
            {
                "key": "allow_group_template_access",
                "title": "Разрешить доступ группам",
                "description": "Группы пользователей могут получать доступ к шаблонам.",
                "default": True,
            },
            {
                "key": "show_templates_in_report_create",
                "title": "Показывать шаблоны при создании отчета",
                "description": "Шаблоны доступны в окне создания отчета.",
                "default": True,
            },
        ],
    },
]


@admin_bp.route("/admin")
@login_required
@role_required("admin")
def index():
    sections = [
        {
            "key": "users",
            "title": "Пользователи",
            "description": "Управление пользователями, ролями и доступами.",
        },
        {
            "key": "reports",
            "title": "Отчеты",
            "description": "Настройка поведения отчетов, доступа и шаблонов.",
        },
        {
            "key": "templates",
            "title": "Шаблоны",
            "description": "Управление шаблонами, чипами и параметрами редактора.",
        },
        {
            "key": "system",
            "title": "Система",
            "description": "Общие системные настройки приложения.",
        },
    ]

    return render_template("admin/index.html", sections=sections)


@admin_bp.route("/api/admin/system-settings", methods=["GET", "POST"])
@login_required
def api_admin_system_settings():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_system_settings_schema()

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        save_system_settings(current_user.organization_id, payload.get("settings") or {})
        log_user_action(
            "admin.system.settings.update",
            user=current_user,
            entity_type="system_settings",
            entity_id=current_user.organization_id,
            description="Администратор обновил системные настройки приложения.",
            metadata={"settings": payload.get("settings") or {}},
        )

    return jsonify({
        "success": True,
        "setting_groups": serialize_system_setting_groups(current_user.organization_id),
    })


@admin_bp.route("/api/admin/system-diagnostics", methods=["GET"])
@login_required
def api_admin_system_diagnostics():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    return jsonify({
        "success": True,
        "diagnostics": build_admin_system_diagnostics(current_user),
    })


@admin_bp.route("/api/admin/reports", methods=["GET"])
@login_required
def api_admin_reports():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    reports = (
        Report.query
        .order_by(Report.updated_at.desc(), Report.created_at.desc(), Report.id.desc())
        .all()
    )
    serialized_reports = [
        serialize_admin_report(report)
        for report in reports
    ]

    return jsonify({
        "reports": serialized_reports,
        "stats": {
            "total": len(serialized_reports),
            "with_pdf": len([report for report in serialized_reports if report["has_pdf"]]),
            "shared": len([report for report in serialized_reports if report["shares_total"] > 0]),
            "with_folder": len([report for report in serialized_reports if report["folder_name"] != "—"]),
        },
    })


@admin_bp.route("/api/admin/report-settings", methods=["GET", "POST"])
@login_required
def api_admin_report_settings():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_admin_report_settings_schema()

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        save_admin_report_settings(
            current_user.organization_id,
            payload.get("settings") or {},
        )
        log_user_action(
            "admin.reports.settings.update",
            user=current_user,
            entity_type="report_settings",
            entity_id=current_user.organization_id,
            description="Администратор изменил настройки отчетов.",
            metadata={"settings": payload.get("settings") or {}},
        )

    return jsonify({
        "success": True,
        "setting_groups": serialize_admin_report_setting_groups(current_user.organization_id),
    })


@admin_bp.route("/api/admin/templates", methods=["GET"])
@login_required
def api_admin_templates():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    templates = (
        Template.query
        .order_by(Template.updated_at.desc(), Template.created_at.desc(), Template.id.desc())
        .all()
    )
    serialized_templates = [
        serialize_admin_template(template)
        for template in templates
    ]

    return jsonify({
        "templates": serialized_templates,
        "stats": build_admin_template_stats(serialized_templates),
        "type_summary": build_admin_template_type_summary(serialized_templates),
        "tag_summary": build_admin_template_tag_summary(serialized_templates),
    })


@admin_bp.route("/api/admin/template-settings", methods=["GET", "POST"])
@login_required
def api_admin_template_settings():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_admin_template_settings_schema()

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        save_admin_template_settings(
            current_user.organization_id,
            payload.get("settings") or {},
        )
        log_user_action(
            "admin.templates.settings.update",
            user=current_user,
            entity_type="template_settings",
            entity_id=current_user.organization_id,
            description="Администратор изменил настройки шаблонов.",
            metadata={"settings": payload.get("settings") or {}},
        )

    return jsonify({
        "success": True,
        "setting_groups": serialize_admin_template_setting_groups(current_user.organization_id),
    })


@admin_bp.route("/api/admin/template-chips", methods=["GET", "POST"])
@login_required
def api_admin_template_chips():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_template_chip_schema()

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        chip, error_response = create_admin_template_chip(current_user.organization_id, payload)

        if error_response:
            return error_response

        log_user_action(
            "admin.template_chips.create",
            user=current_user,
            entity_type="template_chip",
            entity_id=chip.id,
            description="Администратор добавил чип шаблона.",
            metadata={"field": chip.field, "label": chip.label},
        )

        return jsonify({
            "success": True,
            "chip": serialize_chip_definition(chip),
            "settings": serialize_template_chip_settings(current_user.organization_id),
        }), 201

    return jsonify({
        "success": True,
        "settings": serialize_template_chip_settings(current_user.organization_id),
    })


@admin_bp.route("/api/admin/template-chips/<int:chip_id>", methods=["PATCH"])
@login_required
def api_admin_template_chip_update(chip_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_template_chip_schema()
    chip = (
        TemplateChipDefinition.query
        .filter(TemplateChipDefinition.id == chip_id)
        .filter(TemplateChipDefinition.organization_id == current_user.organization_id)
        .first()
    )

    if not chip:
        return jsonify({"error": "not_found", "message": "Чип не найден."}), 404

    error_response = update_admin_template_chip(chip, request.get_json(silent=True) or {})

    if error_response:
        return error_response

    db.session.commit()
    log_user_action(
        "admin.template_chips.update",
        user=current_user,
        entity_type="template_chip",
        entity_id=chip.id,
        description="Администратор изменил чип шаблона.",
        metadata={"field": chip.field, "label": chip.label},
    )

    return jsonify({
        "success": True,
        "chip": serialize_chip_definition(chip),
        "settings": serialize_template_chip_settings(current_user.organization_id),
    })


@admin_bp.route("/api/admin/template-chips/<int:chip_id>/deactivate", methods=["POST"])
@login_required
def api_admin_template_chip_deactivate(chip_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_template_chip_schema()
    chip = (
        TemplateChipDefinition.query
        .filter(TemplateChipDefinition.id == chip_id)
        .filter(TemplateChipDefinition.organization_id == current_user.organization_id)
        .first()
    )

    if not chip:
        return jsonify({"error": "not_found", "message": "Чип не найден."}), 404

    chip.is_active = False
    db.session.commit()
    log_user_action(
        "admin.template_chips.deactivate",
        user=current_user,
        entity_type="template_chip",
        entity_id=chip.id,
        description="Администратор скрыл чип шаблона.",
        metadata={"field": chip.field, "label": chip.label},
    )

    return jsonify({
        "success": True,
        "settings": serialize_template_chip_settings(current_user.organization_id),
    })


@admin_bp.route("/api/admin/template-chip-categories", methods=["POST"])
@login_required
def api_admin_template_chip_category_create():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_template_chip_schema()
    category, error_response = create_admin_template_chip_category(
        current_user.organization_id,
        request.get_json(silent=True) or {},
    )

    if error_response:
        return error_response

    log_user_action(
        "admin.template_chip_categories.create",
        user=current_user,
        entity_type="template_chip_category",
        entity_id=category.id,
        description="Администратор добавил категорию чипов.",
        metadata={"key": category.category_key, "name": category.name},
    )

    return jsonify({
        "success": True,
        "category": serialize_chip_category(category),
        "settings": serialize_template_chip_settings(current_user.organization_id),
    }), 201


@admin_bp.route("/api/admin/template-chip-categories/<int:category_id>", methods=["PATCH"])
@login_required
def api_admin_template_chip_category_update(category_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_template_chip_schema()
    category = (
        TemplateChipCategory.query
        .filter(TemplateChipCategory.id == category_id)
        .filter(TemplateChipCategory.organization_id == current_user.organization_id)
        .first()
    )

    if not category:
        return jsonify({"error": "not_found", "message": "Категория не найдена."}), 404

    error_response = update_admin_template_chip_category(category, request.get_json(silent=True) or {})

    if error_response:
        return error_response

    db.session.commit()
    log_user_action(
        "admin.template_chip_categories.update",
        user=current_user,
        entity_type="template_chip_category",
        entity_id=category.id,
        description="Администратор изменил категорию чипов.",
        metadata={"key": category.category_key, "name": category.name},
    )

    return jsonify({
        "success": True,
        "category": serialize_chip_category(category),
        "settings": serialize_template_chip_settings(current_user.organization_id),
    })


@admin_bp.route("/api/admin/template-chip-categories/<int:category_id>/deactivate", methods=["POST"])
@login_required
def api_admin_template_chip_category_deactivate(category_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_template_chip_schema()
    category = (
        TemplateChipCategory.query
        .filter(TemplateChipCategory.id == category_id)
        .filter(TemplateChipCategory.organization_id == current_user.organization_id)
        .first()
    )

    if not category:
        return jsonify({"error": "not_found", "message": "Категория не найдена."}), 404

    category.is_active = False
    db.session.commit()
    log_user_action(
        "admin.template_chip_categories.deactivate",
        user=current_user,
        entity_type="template_chip_category",
        entity_id=category.id,
        description="Администратор скрыл категорию чипов.",
        metadata={"key": category.category_key, "name": category.name},
    )

    return jsonify({
        "success": True,
        "settings": serialize_template_chip_settings(current_user.organization_id),
    })


@admin_bp.route("/api/admin/taxonomy-options", methods=["GET", "POST"])
@login_required
def api_admin_taxonomy_options():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_admin_taxonomy_schema()

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        option, error_response = create_admin_taxonomy_option(
            current_user.organization_id,
            payload.get("scope"),
            payload.get("option_type"),
            payload.get("name"),
            payload.get("color"),
            payload.get("sort_order"),
        )

        if error_response:
            return error_response

        log_user_action(
            "admin.taxonomy.create",
            user=current_user,
            entity_type="taxonomy_option",
            entity_id=option.id,
            description="Администратор добавил значение справочника.",
            metadata={
                "scope": option.scope,
                "option_type": option.option_type,
                "name": option.name,
            },
        )

        return jsonify({
            "success": True,
            "option": serialize_configured_taxonomy_option(option, get_taxonomy_usage_counts(option.organization_id)),
            "options": serialize_admin_taxonomy_options(current_user.organization_id),
        }), 201

    return jsonify({
        "options": serialize_admin_taxonomy_options(current_user.organization_id),
    })


@admin_bp.route("/api/admin/taxonomy-options/<int:option_id>", methods=["PATCH"])
@login_required
def api_admin_taxonomy_option_update(option_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_admin_taxonomy_schema()

    option = (
        AdminTaxonomyOption.query
        .filter(AdminTaxonomyOption.id == option_id)
        .filter(AdminTaxonomyOption.organization_id == current_user.organization_id)
        .first()
    )

    if not option:
        return jsonify({
            "error": "not_found",
            "message": "Значение справочника не найдено.",
        }), 404

    payload = request.get_json(silent=True) or {}
    error_response = update_admin_taxonomy_option(option, payload)

    if error_response:
        return error_response

    db.session.commit()
    log_user_action(
        "admin.taxonomy.update",
        user=current_user,
        entity_type="taxonomy_option",
        entity_id=option.id,
        description="Администратор обновил значение справочника.",
        metadata={
            "scope": option.scope,
            "option_type": option.option_type,
            "name": option.name,
        },
    )

    return jsonify({
        "success": True,
        "option": serialize_configured_taxonomy_option(option, get_taxonomy_usage_counts(option.organization_id)),
        "options": serialize_admin_taxonomy_options(current_user.organization_id),
    })


@admin_bp.route("/api/admin/taxonomy-options/<int:option_id>/deactivate", methods=["POST"])
@login_required
def api_admin_taxonomy_option_deactivate(option_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_admin_taxonomy_schema()

    option = (
        AdminTaxonomyOption.query
        .filter(AdminTaxonomyOption.id == option_id)
        .filter(AdminTaxonomyOption.organization_id == current_user.organization_id)
        .first()
    )

    if not option:
        return jsonify({
            "error": "not_found",
            "message": "Значение справочника не найдено.",
        }), 404

    option.is_active = False
    db.session.commit()
    log_user_action(
        "admin.taxonomy.deactivate",
        user=current_user,
        entity_type="taxonomy_option",
        entity_id=option.id,
        description="Администратор скрыл значение справочника.",
        metadata={
            "scope": option.scope,
            "option_type": option.option_type,
            "name": option.name,
        },
    )

    return jsonify({
        "success": True,
        "options": serialize_admin_taxonomy_options(current_user.organization_id),
    })


@admin_bp.route("/api/admin/users", methods=["GET"])
@login_required
def api_admin_users():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    users = (
        User.query
        .filter(User.organization_id == current_user.organization_id)
        .filter(User.is_active == 1)
        .order_by(User.id.asc())
        .all()
    )

    return jsonify({
        "users": [
            serialize_admin_user(user)
            for user in users
        ]
    })


@admin_bp.route("/api/admin/users/<int:user_id>/deactivate", methods=["POST"])
@login_required
def api_deactivate_admin_user(user_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    if user_id == current_user.id:
        return jsonify({
            "error": "self_deactivate_forbidden",
            "message": "Нельзя удалить самого себя.",
        }), 400

    user = (
        User.query
        .filter(User.id == user_id)
        .filter(User.organization_id == current_user.organization_id)
        .first()
    )

    if not user:
        return jsonify({
            "error": "not_found",
            "message": "Пользователь не найден.",
        }), 404

    user.is_active = False
    db.session.commit()
    log_user_action(
        "admin.user.deactivate",
        user=current_user,
        entity_type="user",
        entity_id=user.id,
        description="Администратор удалил пользователя {0} из организации.".format(
            get_user_display_name_for_log(user)
        ),
    )

    return jsonify({"success": True})


@admin_bp.route("/api/admin/user-groups", methods=["GET"])
@login_required
def api_admin_user_groups():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_user_group_schema()
    groups = (
        UserGroup.query
        .filter(UserGroup.organization_id == current_user.organization_id)
        .filter(UserGroup.is_active == 1)
        .order_by(UserGroup.updated_at.desc(), UserGroup.created_at.desc(), UserGroup.id.desc())
        .all()
    )

    return jsonify({
        "groups": [
            serialize_user_group(group)
            for group in groups
        ]
    })


@admin_bp.route("/api/admin/user-groups", methods=["POST"])
@login_required
def api_create_admin_user_group():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_user_group_schema()
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    description = (payload.get("description") or "").strip() or None

    if not name:
        return jsonify({
            "error": "validation_error",
            "message": "Введите название группы.",
        }), 400

    group = UserGroup(
        organization_id=current_user.organization_id,
        name=name,
        description=description,
        avatar=None,
        created_by=current_user.id,
        is_active=True,
    )
    db.session.add(group)
    db.session.flush()
    replace_group_members(group, payload.get("member_ids") or [], current_user.organization_id)
    db.session.commit()
    log_user_action(
        "admin.group.create",
        user=current_user,
        entity_type="user_group",
        entity_id=group.id,
        description="Администратор создал рабочую группу «{0}».".format(group.name),
        metadata={"member_ids": payload.get("member_ids") or []},
    )

    return jsonify({
        "success": True,
        "group": serialize_user_group(group),
    }), 201


@admin_bp.route("/api/admin/user-groups/<int:group_id>", methods=["GET"])
@login_required
def api_admin_user_group_detail(group_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_user_group_schema()
    group = get_group_for_admin(group_id, current_user.organization_id)

    if not group:
        return jsonify({
            "error": "not_found",
            "message": "Группа не найдена.",
        }), 404

    return jsonify({
        "group": serialize_user_group(group, include_members=True),
    })


@admin_bp.route("/api/admin/user-groups/<int:group_id>/members", methods=["POST"])
@login_required
def api_update_admin_user_group_members(group_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_user_group_schema()
    group = get_group_for_admin(group_id, current_user.organization_id)

    if not group:
        return jsonify({
            "error": "not_found",
            "message": "Группа не найдена.",
        }), 404

    payload = request.get_json(silent=True) or {}
    replace_group_members(group, payload.get("member_ids") or [], current_user.organization_id)
    db.session.commit()
    log_user_action(
        "admin.group.members.update",
        user=current_user,
        entity_type="user_group",
        entity_id=group.id,
        description="Администратор изменил участников группы «{0}».".format(group.name),
        metadata={"member_ids": payload.get("member_ids") or []},
    )

    return jsonify({
        "success": True,
        "group": serialize_user_group(group, include_members=True),
    })


@admin_bp.route("/api/admin/user-groups/<int:group_id>/deactivate", methods=["POST"])
@login_required
def api_deactivate_admin_user_group(group_id):
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_user_group_schema()
    group = get_group_for_admin(group_id, current_user.organization_id)

    if not group:
        return jsonify({
            "error": "not_found",
            "message": "Группа не найдена.",
        }), 404

    group.is_active = False
    db.session.commit()
    log_user_action(
        "admin.group.deactivate",
        user=current_user,
        entity_type="user_group",
        entity_id=group.id,
        description="Администратор удалил рабочую группу «{0}».".format(group.name),
    )

    return jsonify({"success": True})


@admin_bp.route("/api/admin/access/options", methods=["GET"])
@login_required
def api_admin_access_options():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_access_permission_schema()
    users = (
        User.query
        .filter(User.organization_id == current_user.organization_id)
        .filter(User.is_active == 1)
        .order_by(User.id.asc())
        .all()
    )
    groups = (
        UserGroup.query
        .filter(UserGroup.organization_id == current_user.organization_id)
        .filter(UserGroup.is_active == 1)
        .order_by(UserGroup.name.asc(), UserGroup.id.asc())
        .all()
    )

    return jsonify({
        "permission_groups": get_permission_definitions(),
        "subjects": {
            "users": [
                serialize_admin_user(user)
                for user in users
            ],
            "groups": [
                serialize_user_group(group)
                for group in groups
            ],
        },
    })


@admin_bp.route("/api/admin/access/permissions", methods=["GET"])
@login_required
def api_admin_access_permissions():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_access_permission_schema()
    subject_type = normalize_subject_type(request.args.get("subject_type"))
    subject_id = request.args.get("subject_id")
    subject = get_access_subject(subject_type, subject_id, current_user.organization_id)

    if not subject:
        return jsonify({
            "error": "not_found",
            "message": "Объект прав не найден.",
        }), 404

    return jsonify({
        "subject": serialize_access_subject(subject_type, subject),
        "permissions": get_subject_permission_keys(subject_type, subject.id, current_user.organization_id),
        "permission_groups": get_permission_definitions(),
    })


@admin_bp.route("/api/admin/access/permissions", methods=["POST"])
@login_required
def api_save_admin_access_permissions():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_access_permission_schema()
    payload = request.get_json(silent=True) or {}
    subject_type = normalize_subject_type(payload.get("subject_type"))
    subject_id = payload.get("subject_id")
    subject = get_access_subject(subject_type, subject_id, current_user.organization_id)

    if not subject:
        return jsonify({
            "error": "not_found",
            "message": "Объект прав не найден.",
        }), 404

    permissions = replace_subject_permissions(
        subject_type,
        subject.id,
        current_user.organization_id,
        payload.get("permissions") or [],
    )
    log_user_action(
        "admin.permissions.update",
        user=current_user,
        entity_type="access_{0}".format(subject_type),
        entity_id=subject.id,
        description="Администратор изменил права доступа для {0}.".format(
            get_access_subject_display_name(subject_type, subject)
        ),
        metadata={"permissions": permissions},
    )

    return jsonify({
        "success": True,
        "subject": serialize_access_subject(subject_type, subject),
        "permissions": permissions,
    })


@admin_bp.route("/api/admin/user-actions", methods=["GET"])
@login_required
def api_admin_user_actions():
    current_user, error_response = get_current_admin_user()

    if error_response:
        return error_response

    ensure_user_action_log_schema()
    logs = get_action_logs(
        current_user.organization_id,
        search=request.args.get("search") or "",
        user_id=request.args.get("user_id") or "",
        action_key=request.args.get("action") or "",
        limit=request.args.get("limit") or 200,
    )
    users = (
        User.query
        .filter(User.organization_id == current_user.organization_id)
        .filter(User.is_active == 1)
        .order_by(User.id.asc())
        .all()
    )

    return jsonify({
        "logs": [
            serialize_action_log(log)
            for log in logs
        ],
        "users": [
            serialize_admin_user(user)
            for user in users
        ],
        "actions": get_action_type_options(),
    })


def build_admin_system_diagnostics(current_user):
    ensure_system_settings_schema()
    ensure_user_action_log_schema()
    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())
    organization_id = current_user.organization_id
    active_users_count = (
        User.query
        .filter(User.organization_id == organization_id)
        .filter(User.is_active == 1)
        .count()
    )
    inactive_users_count = (
        User.query
        .filter(User.organization_id == organization_id)
        .filter(User.is_active == 0)
        .count()
    )
    groups_count = (
        UserGroup.query
        .filter(UserGroup.organization_id == organization_id)
        .filter(UserGroup.is_active == 1)
        .count()
    )
    reports_count = Report.query.count()
    templates_count = Template.query.count()
    logs_count = UserActionLog.query.filter(UserActionLog.organization_id == organization_id).count()
    temp_import_storage = get_admin_storage_summary("temp_imports")

    return {
        "summary": [
            {
                "label": "Пользователи",
                "value": active_users_count,
                "meta": "активных, отключено: {0}".format(inactive_users_count),
            },
            {
                "label": "Группы",
                "value": groups_count,
                "meta": "рабочих групп организации",
            },
            {
                "label": "Отчеты",
                "value": reports_count,
                "meta": "в реестре отчетов",
            },
            {
                "label": "Шаблоны",
                "value": templates_count,
                "meta": "в реестре шаблонов",
            },
        ],
        "groups": [
            {
                "title": "Конфигурация",
                "items": [
                    {
                        "label": "База данных",
                        "value": "{0}@{1}".format(
                            current_app.config.get("DB_NAME") or "—",
                            current_app.config.get("DB_HOST") or "localhost",
                        ),
                        "tone": "ok",
                    },
                    {
                        "label": "LaTeX-компилятор",
                        "value": current_app.config.get("LATEX_COMPILER") or "—",
                        "tone": "ok",
                    },
                    {
                        "label": "Максимальный размер загрузки",
                        "value": "{0} МБ".format(get_upload_limit_mb()),
                        "tone": "ok",
                    },
                    {
                        "label": "Yandex SmartCaptcha",
                        "value": "включена" if current_app.config.get("YANDEX_SMARTCAPTCHA_ENABLED") else "выключена",
                        "tone": "ok" if current_app.config.get("YANDEX_SMARTCAPTCHA_ENABLED") else "warning",
                    },
                    {
                        "label": "Ключи SmartCaptcha",
                        "value": get_smartcaptcha_key_status(),
                        "tone": "ok" if get_smartcaptcha_key_status() == "site и secret указаны" else "warning",
                    },
                ],
            },
            {
                "title": "Данные приложения",
                "items": [
                    {"label": "Папки", "value": Folder.query.count(), "tone": "ok"},
                    {"label": "Совместный доступ к отчетам", "value": ReportShare.query.count(), "tone": "ok"},
                    {"label": "Доступ групп к отчетам", "value": GroupReportAccess.query.count(), "tone": "ok"},
                    {"label": "Доступ групп к шаблонам", "value": GroupTemplateAccess.query.count(), "tone": "ok"},
                    {"label": "Журнал действий", "value": logs_count, "tone": "ok"},
                ],
            },
            {
                "title": "Хранилище",
                "items": [
                    {
                        "label": "Временные импорты",
                        "value": "{0} файлов, {1}".format(
                            temp_import_storage["file_count"],
                            temp_import_storage["size_label"],
                        ),
                        "tone": "warning" if temp_import_storage["file_count"] else "ok",
                    },
                    {
                        "label": "Путь storage",
                        "value": str(get_storage_root()),
                        "tone": "ok",
                    },
                ],
            },
            {
                "title": "Ключевые таблицы",
                "items": [
                    {
                        "label": table_name,
                        "value": "есть" if table_name in table_names else "нет",
                        "tone": "ok" if table_name in table_names else "danger",
                    }
                    for table_name in [
                        "users",
                        "organizations",
                        "reports",
                        "templates",
                        "user_groups",
                        "access_permissions",
                        "admin_system_settings",
                    ]
                ],
            },
        ],
    }


def get_upload_limit_mb():
    limit = current_app.config.get("MAX_CONTENT_LENGTH") or 0

    try:
        return max(1, round(int(limit) / 1024 / 1024))
    except (TypeError, ValueError):
        return "—"


def get_smartcaptcha_key_status():
    site_key_exists = bool(current_app.config.get("YANDEX_SMARTCAPTCHA_SITE_KEY"))
    secret_key_exists = bool(current_app.config.get("YANDEX_SMARTCAPTCHA_SECRET_KEY"))

    if site_key_exists and secret_key_exists:
        return "site и secret указаны"

    if site_key_exists:
        return "указан только site key"

    if secret_key_exists:
        return "указан только secret key"

    return "ключи не указаны"


def get_storage_root():
    return Path(current_app.root_path).parent / "storage"


def get_admin_storage_summary(folder_name):
    storage_dir = get_storage_root() / folder_name
    file_count = 0
    total_size = 0

    if storage_dir.exists():
        for path in storage_dir.rglob("*"):
            if not path.is_file():
                continue

            file_count += 1
            try:
                total_size += path.stat().st_size
            except OSError:
                continue

    return {
        "file_count": file_count,
        "size_bytes": total_size,
        "size_label": format_bytes(total_size),
    }


def format_bytes(value):
    size = float(value or 0)

    for unit in ["Б", "КБ", "МБ", "ГБ"]:
        if size < 1024 or unit == "ГБ":
            if unit == "Б":
                return "{0} {1}".format(int(size), unit)
            return "{0:.1f} {1}".format(size, unit)
        size /= 1024

    return "0 Б"


def ensure_admin_report_settings_schema():
    db.create_all()
    inspector = inspect(db.engine)

    if "admin_report_settings" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("admin_report_settings")
    }
    migration_queries = {
        "organization_id": "ALTER TABLE admin_report_settings ADD COLUMN organization_id INT NULL",
        "setting_key": "ALTER TABLE admin_report_settings ADD COLUMN setting_key VARCHAR(120) NOT NULL",
        "value": "ALTER TABLE admin_report_settings ADD COLUMN value VARCHAR(255) NOT NULL",
        "created_at": "ALTER TABLE admin_report_settings ADD COLUMN created_at DATETIME NULL",
        "updated_at": "ALTER TABLE admin_report_settings ADD COLUMN updated_at DATETIME NULL",
    }

    for column_name, query in migration_queries.items():
        if column_name not in existing_columns:
            db.session.execute(text(query))

    db.session.commit()


def serialize_admin_report(report):
    draft = (
        ReportDraft.query
        .filter(ReportDraft.linked_report_id == report.id)
        .order_by(ReportDraft.updated_at.desc(), ReportDraft.created_at.desc(), ReportDraft.id.desc())
        .first()
    )
    user_shares_count = ReportShare.query.filter_by(report_id=report.id).count()
    group_shares_count = GroupReportAccess.query.filter_by(report_id=report.id).count()
    linked_report_title = report.linked_report.report_title if report.linked_report else "—"
    folder_name = report.folder.name if report.folder else "—"
    template_title = REPORT_TEMPLATE_TITLES.get(report.template_key or "", report.template_key or "Не выбран")
    has_pdf = bool(report.pdf_filename)

    return {
        "id": report.id,
        "title": report.report_title,
        "author": report.report_author or "Пользователь",
        "date": report.report_date.strftime("%d.%m.%Y") if report.report_date else "—",
        "tag": report.tag or "—",
        "template_key": report.template_key or "",
        "template_title": template_title,
        "folder_id": report.folder_id,
        "folder_name": folder_name,
        "linked_report_id": report.linked_report_id,
        "linked_report_title": linked_report_title,
        "source_type": report.source_type or "manual",
        "source_label": get_report_source_label(report.source_type),
        "source_filename": report.source_filename or "—",
        "has_pdf": has_pdf,
        "pdf_status": "PDF готов" if has_pdf else "PDF не сформирован",
        "status_label": get_admin_report_status_label(report, draft),
        "shares_users_count": user_shares_count,
        "shares_groups_count": group_shares_count,
        "shares_total": user_shares_count + group_shares_count,
        "created_at": report.created_at.strftime("%d.%m.%Y %H:%M") if report.created_at else "—",
        "updated_at": report.updated_at.strftime("%d.%m.%Y %H:%M") if report.updated_at else "—",
        "view_url": url_for("reports.view_report", report_id=report.id),
        "preview_url": url_for("reports.dashboard_report_preview", report_id=report.id),
    }


def get_report_source_label(source_type):
    labels = {
        "manual": "Ручной отчет",
        "imported_data": "Импорт данных",
    }

    return labels.get(source_type or "manual", source_type or "Ручной отчет")


def get_admin_report_status_label(report, draft):
    if report.pdf_filename:
        return "Готов к выдаче"

    if draft:
        return "Черновик"

    return "Создан"


def serialize_admin_report_setting_groups(organization_id):
    values = get_admin_report_setting_values(organization_id)
    groups = []

    for group in ADMIN_REPORT_SETTING_GROUPS:
        groups.append({
            "title": group["title"],
            "description": group["description"],
            "settings": [
                {
                    "key": setting["key"],
                    "title": setting["title"],
                    "description": setting["description"],
                    "value": values.get(setting["key"], bool(setting["default"])),
                }
                for setting in group["settings"]
            ],
        })

    return groups


def get_admin_report_setting_values(organization_id):
    defaults = {
        setting["key"]: bool(setting["default"])
        for group in ADMIN_REPORT_SETTING_GROUPS
        for setting in group["settings"]
    }
    rows = (
        AdminReportSetting.query
        .filter(AdminReportSetting.organization_id == organization_id)
        .all()
    )

    for row in rows:
        if row.setting_key in defaults:
            defaults[row.setting_key] = str(row.value).lower() in {"1", "true", "yes", "on"}

    return defaults


def save_admin_report_settings(organization_id, raw_settings):
    allowed_settings = {
        setting["key"]
        for group in ADMIN_REPORT_SETTING_GROUPS
        for setting in group["settings"]
    }

    for setting_key in allowed_settings:
        raw_value = raw_settings.get(setting_key)
        value = "true" if bool(raw_value) else "false"
        row = (
            AdminReportSetting.query
            .filter(AdminReportSetting.organization_id == organization_id)
            .filter(AdminReportSetting.setting_key == setting_key)
            .first()
        )

        if not row:
            row = AdminReportSetting(
                organization_id=organization_id,
                setting_key=setting_key,
                value=value,
            )
            db.session.add(row)
        else:
            row.value = value

    db.session.commit()


def ensure_admin_template_settings_schema():
    db.create_all()
    inspector = inspect(db.engine)

    if "admin_template_settings" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("admin_template_settings")
    }
    migration_queries = {
        "organization_id": "ALTER TABLE admin_template_settings ADD COLUMN organization_id INT NULL",
        "setting_key": "ALTER TABLE admin_template_settings ADD COLUMN setting_key VARCHAR(120) NOT NULL",
        "value": "ALTER TABLE admin_template_settings ADD COLUMN value VARCHAR(255) NOT NULL",
        "created_at": "ALTER TABLE admin_template_settings ADD COLUMN created_at DATETIME NULL",
        "updated_at": "ALTER TABLE admin_template_settings ADD COLUMN updated_at DATETIME NULL",
    }

    for column_name, query in migration_queries.items():
        if column_name not in existing_columns:
            db.session.execute(text(query))

    db.session.commit()


def serialize_admin_template(template):
    derived_count = Template.query.filter(Template.source_template_id == template.id).count()
    group_access_count = GroupTemplateAccess.query.filter_by(template_id=template.id).count()
    source_title = template.source_template.title if template.source_template else "Пустая основа"
    has_content = bool((template.content_html or "").strip() or (template.content_json or "").strip())

    return {
        "id": template.id,
        "title": template.title,
        "tag": template.tag or "—",
        "template_type": template.template_type or "Универсальный",
        "source_template_id": template.source_template_id,
        "source_title": source_title,
        "derived_count": derived_count,
        "group_access_count": group_access_count,
        "has_content": has_content,
        "content_status": "Наполнен" if has_content else "Пустой",
        "created_at": template.created_at.strftime("%d.%m.%Y") if template.created_at else "—",
        "updated_at": template.updated_at.strftime("%d.%m.%Y") if template.updated_at else "—",
        "edit_url": url_for("templates.edit_template", template_id=template.id),
    }


def build_admin_template_stats(templates):
    return {
        "total": len(templates),
        "with_content": len([template for template in templates if template["has_content"]]),
        "with_group_access": len([template for template in templates if template["group_access_count"] > 0]),
        "types": len({template["template_type"] for template in templates if template["template_type"]}),
    }


def build_admin_template_type_summary(templates):
    summary = {}

    for template in templates:
        key = template["template_type"] or "Универсальный"
        summary.setdefault(key, {
            "name": key,
            "count": 0,
            "with_content": 0,
            "group_access_count": 0,
        })
        summary[key]["count"] += 1
        summary[key]["with_content"] += 1 if template["has_content"] else 0
        summary[key]["group_access_count"] += template["group_access_count"]

    return sorted(summary.values(), key=lambda item: (-item["count"], item["name"]))


def build_admin_template_tag_summary(templates):
    summary = {}

    for template in templates:
        key = template["tag"] if template["tag"] != "—" else "Без тега"
        summary.setdefault(key, {
            "name": key,
            "count": 0,
            "types": set(),
        })
        summary[key]["count"] += 1
        summary[key]["types"].add(template["template_type"] or "Универсальный")

    result = []
    for item in summary.values():
        result.append({
            "name": item["name"],
            "count": item["count"],
            "types_count": len(item["types"]),
        })

    return sorted(result, key=lambda item: (-item["count"], item["name"]))


def serialize_admin_template_setting_groups(organization_id):
    values = get_admin_template_setting_values(organization_id)
    groups = []

    for group in ADMIN_TEMPLATE_SETTING_GROUPS:
        groups.append({
            "title": group["title"],
            "description": group["description"],
            "settings": [
                {
                    "key": setting["key"],
                    "title": setting["title"],
                    "description": setting["description"],
                    "value": values.get(setting["key"], bool(setting["default"])),
                }
                for setting in group["settings"]
            ],
        })

    return groups


def get_admin_template_setting_values(organization_id):
    defaults = {
        setting["key"]: bool(setting["default"])
        for group in ADMIN_TEMPLATE_SETTING_GROUPS
        for setting in group["settings"]
    }
    rows = (
        AdminTemplateSetting.query
        .filter(AdminTemplateSetting.organization_id == organization_id)
        .all()
    )

    for row in rows:
        if row.setting_key in defaults:
            defaults[row.setting_key] = str(row.value).lower() in {"1", "true", "yes", "on"}

    return defaults


def save_admin_template_settings(organization_id, raw_settings):
    allowed_settings = {
        setting["key"]
        for group in ADMIN_TEMPLATE_SETTING_GROUPS
        for setting in group["settings"]
    }

    for setting_key in allowed_settings:
        raw_value = raw_settings.get(setting_key)
        value = "true" if bool(raw_value) else "false"
        row = (
            AdminTemplateSetting.query
            .filter(AdminTemplateSetting.organization_id == organization_id)
            .filter(AdminTemplateSetting.setting_key == setting_key)
            .first()
        )

        if not row:
            row = AdminTemplateSetting(
                organization_id=organization_id,
                setting_key=setting_key,
                value=value,
            )
            db.session.add(row)
        else:
            row.value = value

    db.session.commit()


def create_admin_template_chip_category(organization_id, payload):
    name = normalize_chip_name(payload.get("name"))
    category_key = normalize_chip_key(payload.get("key")) or create_chip_key_from_name(name)

    if not name:
        return None, (jsonify({"error": "empty_name", "message": "Введите название категории."}), 400)

    duplicate = find_template_chip_category_duplicate(organization_id, category_key)

    if duplicate and duplicate.is_active:
        return None, (jsonify({"error": "duplicate", "message": "Такая категория уже есть."}), 409)

    if duplicate:
        duplicate.name = name
        duplicate.description = (payload.get("description") or "").strip() or None
        duplicate.sort_order = parse_sort_order(payload.get("sort_order"))
        duplicate.is_active = True
        db.session.commit()
        return duplicate, None

    category = TemplateChipCategory(
        organization_id=organization_id,
        category_key=category_key,
        name=name,
        description=(payload.get("description") or "").strip() or None,
        sort_order=parse_sort_order(payload.get("sort_order")),
        is_active=True,
    )
    db.session.add(category)
    db.session.commit()

    return category, None


def update_admin_template_chip_category(category, payload):
    if "name" in payload:
        name = normalize_chip_name(payload.get("name"))
        if not name:
            return jsonify({"error": "empty_name", "message": "Введите название категории."}), 400
        category.name = name

    if "key" in payload:
        category_key = normalize_chip_key(payload.get("key")) or create_chip_key_from_name(category.name)
        duplicate = find_template_chip_category_duplicate(category.organization_id, category_key, exclude_id=category.id)
        if duplicate and duplicate.is_active:
            return jsonify({"error": "duplicate", "message": "Категория с таким ключом уже есть."}), 409
        category.category_key = category_key

    if "description" in payload:
        category.description = (payload.get("description") or "").strip() or None

    if "sort_order" in payload:
        category.sort_order = parse_sort_order(payload.get("sort_order"))

    return None


def find_template_chip_category_duplicate(organization_id, category_key, exclude_id=None):
    query = (
        TemplateChipCategory.query
        .filter(TemplateChipCategory.organization_id == organization_id)
        .filter(TemplateChipCategory.category_key == category_key)
    )

    if exclude_id:
        query = query.filter(TemplateChipCategory.id != exclude_id)

    return query.first()


def create_admin_template_chip(organization_id, payload):
    label = normalize_chip_name(payload.get("label"))
    field = normalize_chip_key(payload.get("field")) or create_chip_field_from_label(label)

    if not label:
        return None, (jsonify({"error": "empty_label", "message": "Введите название чипа."}), 400)

    field = ensure_unique_template_chip_field(organization_id, field)
    duplicate = find_template_chip_duplicate(organization_id, field)

    if duplicate and duplicate.is_active:
        return None, (jsonify({"error": "duplicate", "message": "Чип с таким ключом уже есть."}), 409)

    if duplicate:
        apply_template_chip_payload(duplicate, payload, label=label)
        duplicate.is_active = True
        db.session.commit()
        return duplicate, None

    chip = TemplateChipDefinition(
        organization_id=organization_id,
        field=field,
        label=label,
        category_key=normalize_chip_key(payload.get("category_key") or payload.get("group")) or "custom",
        kind=normalize_template_chip_kind(payload.get("kind")),
        based_on=normalize_chip_key(payload.get("based_on") or payload.get("basedOn")) or None,
        latex_markup=(payload.get("latex_markup") or payload.get("latex") or "").strip() or None,
        sort_order=parse_sort_order(payload.get("sort_order")),
        is_favorite=bool(payload.get("is_favorite") or payload.get("isFavorite")),
        is_active=True,
    )
    db.session.add(chip)
    db.session.commit()

    return chip, None


def update_admin_template_chip(chip, payload):
    label = normalize_chip_name(payload.get("label")) if "label" in payload else chip.label

    if not label:
        return jsonify({"error": "empty_label", "message": "Введите название чипа."}), 400

    if "field" in payload:
        field = normalize_chip_key(payload.get("field")) or create_chip_field_from_label(label)
        duplicate = find_template_chip_duplicate(chip.organization_id, field, exclude_id=chip.id)
        if duplicate and duplicate.is_active:
            return jsonify({"error": "duplicate", "message": "Чип с таким ключом уже есть."}), 409
        chip.field = field

    apply_template_chip_payload(chip, payload, label=label)
    return None


def apply_template_chip_payload(chip, payload, label=None):
    chip.label = label or normalize_chip_name(payload.get("label")) or chip.label

    if "category_key" in payload or "group" in payload:
        chip.category_key = normalize_chip_key(payload.get("category_key") or payload.get("group")) or "custom"

    if "kind" in payload:
        chip.kind = normalize_template_chip_kind(payload.get("kind"))

    if "based_on" in payload or "basedOn" in payload:
        chip.based_on = normalize_chip_key(payload.get("based_on") or payload.get("basedOn")) or None

    if "latex_markup" in payload or "latex" in payload:
        chip.latex_markup = (payload.get("latex_markup") or payload.get("latex") or "").strip() or None

    if "sort_order" in payload:
        chip.sort_order = parse_sort_order(payload.get("sort_order"))

    if "is_favorite" in payload or "isFavorite" in payload:
        chip.is_favorite = bool(payload.get("is_favorite") or payload.get("isFavorite"))


def find_template_chip_duplicate(organization_id, field, exclude_id=None):
    query = (
        TemplateChipDefinition.query
        .filter(TemplateChipDefinition.organization_id == organization_id)
        .filter(TemplateChipDefinition.field == field)
    )

    if exclude_id:
        query = query.filter(TemplateChipDefinition.id != exclude_id)

    return query.first()


def ensure_unique_template_chip_field(organization_id, field):
    base = field or "admin_chip"
    candidate = base[:120]
    index = 1

    while find_template_chip_duplicate(organization_id, candidate):
        index += 1
        suffix = "_{0}".format(index)
        candidate = (base[:120 - len(suffix)] + suffix)[:120]

    return candidate


def normalize_template_chip_kind(kind):
    normalized = (kind or "text").strip().lower()
    return normalized if normalized in {"text", "table", "list", "asset", "page_break"} else "text"


def ensure_admin_taxonomy_schema():
    db.create_all()
    inspector = inspect(db.engine)

    if "admin_taxonomy_options" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("admin_taxonomy_options")
    }
    migration_queries = {
        "organization_id": "ALTER TABLE admin_taxonomy_options ADD COLUMN organization_id INT NULL",
        "scope": "ALTER TABLE admin_taxonomy_options ADD COLUMN scope VARCHAR(50) NOT NULL DEFAULT 'report'",
        "option_type": "ALTER TABLE admin_taxonomy_options ADD COLUMN option_type VARCHAR(50) NOT NULL DEFAULT 'tag'",
        "name": "ALTER TABLE admin_taxonomy_options ADD COLUMN name VARCHAR(255) NOT NULL",
        "color": "ALTER TABLE admin_taxonomy_options ADD COLUMN color VARCHAR(32) NULL",
        "sort_order": "ALTER TABLE admin_taxonomy_options ADD COLUMN sort_order INT NOT NULL DEFAULT 0",
        "is_active": "ALTER TABLE admin_taxonomy_options ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
        "created_at": "ALTER TABLE admin_taxonomy_options ADD COLUMN created_at DATETIME NULL",
        "updated_at": "ALTER TABLE admin_taxonomy_options ADD COLUMN updated_at DATETIME NULL",
    }

    for column_name, query in migration_queries.items():
        if column_name not in existing_columns:
            db.session.execute(text(query))

    db.session.commit()


def normalize_admin_taxonomy_scope(scope):
    normalized_scope = (scope or "").strip().lower()
    return normalized_scope if normalized_scope in ADMIN_TAXONOMY_SCOPES else ""


def normalize_admin_taxonomy_type(option_type):
    normalized_type = (option_type or "").strip().lower()
    return normalized_type if normalized_type in ADMIN_TAXONOMY_TYPES else ""


def normalize_admin_taxonomy_name(name):
    return " ".join((name or "").strip().split())


def normalize_admin_taxonomy_color(color):
    value = (color or "").strip()

    if not value:
        return None

    if len(value) > 32:
        return value[:32]

    return value


def create_admin_taxonomy_option(organization_id, scope, option_type, name, color=None, sort_order=None):
    normalized_scope = normalize_admin_taxonomy_scope(scope)
    normalized_type = normalize_admin_taxonomy_type(option_type)
    normalized_name = normalize_admin_taxonomy_name(name)

    if not normalized_scope or not normalized_type:
        return None, (jsonify({
            "error": "invalid_taxonomy",
            "message": "Некорректный раздел справочника.",
        }), 400)

    if not normalized_name:
        return None, (jsonify({
            "error": "empty_name",
            "message": "Введите название значения.",
        }), 400)

    duplicate = find_admin_taxonomy_duplicate(
        organization_id,
        normalized_scope,
        normalized_type,
        normalized_name,
    )

    if duplicate and duplicate.is_active:
        return None, (jsonify({
            "error": "duplicate",
            "message": "Такое значение уже есть в справочнике.",
        }), 409)

    if duplicate and not duplicate.is_active:
        duplicate.is_active = True
        duplicate.color = normalize_admin_taxonomy_color(color)
        duplicate.sort_order = parse_admin_sort_order(sort_order)
        db.session.commit()
        return duplicate, None

    option = AdminTaxonomyOption(
        organization_id=organization_id,
        scope=normalized_scope,
        option_type=normalized_type,
        name=normalized_name,
        color=normalize_admin_taxonomy_color(color),
        sort_order=parse_admin_sort_order(sort_order),
        is_active=True,
    )
    db.session.add(option)
    db.session.commit()

    return option, None


def update_admin_taxonomy_option(option, payload):
    if "name" in payload:
        normalized_name = normalize_admin_taxonomy_name(payload.get("name"))

        if not normalized_name:
            return jsonify({
                "error": "empty_name",
                "message": "Введите название значения.",
            }), 400

        duplicate = find_admin_taxonomy_duplicate(
            option.organization_id,
            option.scope,
            option.option_type,
            normalized_name,
            exclude_id=option.id,
        )

        if duplicate and duplicate.is_active:
            return jsonify({
                "error": "duplicate",
                "message": "Такое значение уже есть в справочнике.",
            }), 409

        option.name = normalized_name

    if "color" in payload:
        option.color = normalize_admin_taxonomy_color(payload.get("color"))

    if "sort_order" in payload:
        option.sort_order = parse_admin_sort_order(payload.get("sort_order"))

    if "is_active" in payload:
        option.is_active = bool(payload.get("is_active"))

    return None


def find_admin_taxonomy_duplicate(organization_id, scope, option_type, name, exclude_id=None):
    normalized_name = normalize_admin_taxonomy_name(name).lower()
    rows = (
        AdminTaxonomyOption.query
        .filter(AdminTaxonomyOption.organization_id == organization_id)
        .filter(AdminTaxonomyOption.scope == scope)
        .filter(AdminTaxonomyOption.option_type == option_type)
        .all()
    )

    for row in rows:
        if exclude_id and row.id == exclude_id:
            continue
        if normalize_admin_taxonomy_name(row.name).lower() == normalized_name:
            return row

    return None


def parse_admin_sort_order(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def serialize_admin_taxonomy_options(organization_id):
    usage_counts = get_taxonomy_usage_counts(organization_id)
    options = {
        "report": {"type": [], "tag": []},
        "template": {"type": [], "tag": []},
    }
    configured_names = {
        "report": {"type": set(), "tag": set()},
        "template": {"type": set(), "tag": set()},
    }
    rows = (
        AdminTaxonomyOption.query
        .filter(AdminTaxonomyOption.organization_id == organization_id)
        .filter(AdminTaxonomyOption.is_active == 1)
        .order_by(AdminTaxonomyOption.scope.asc(), AdminTaxonomyOption.option_type.asc(), AdminTaxonomyOption.sort_order.asc(), AdminTaxonomyOption.name.asc())
        .all()
    )

    for row in rows:
        if row.scope not in options or row.option_type not in options[row.scope]:
            continue

        options[row.scope][row.option_type].append(serialize_configured_taxonomy_option(row, usage_counts))
        configured_names[row.scope][row.option_type].add(normalize_admin_taxonomy_name(row.name).lower())

    for scope, type_groups in ADMIN_TAXONOMY_DEFAULTS.items():
        for option_type, names in type_groups.items():
            for name in names:
                add_virtual_taxonomy_option(
                    options,
                    configured_names,
                    usage_counts,
                    scope,
                    option_type,
                    name,
                    "default",
                )

    for scope, type_groups in usage_counts.items():
        for option_type, counts in type_groups.items():
            for name in counts.keys():
                add_virtual_taxonomy_option(
                    options,
                    configured_names,
                    usage_counts,
                    scope,
                    option_type,
                    name,
                    "detected",
                )

    for scope in options:
        for option_type in options[scope]:
            options[scope][option_type] = sorted(
                options[scope][option_type],
                key=lambda item: (
                    {"configured": 0, "default": 1, "detected": 2}.get(item["source"], 3),
                    item.get("sort_order", 0),
                    item["name"].lower(),
                ),
            )

    return options


def serialize_configured_taxonomy_option(option, usage_counts):
    return {
        "id": option.id,
        "scope": option.scope,
        "option_type": option.option_type,
        "name": option.name,
        "color": option.color or "",
        "sort_order": option.sort_order or 0,
        "is_active": bool(option.is_active),
        "is_system": False,
        "source": "configured",
        "source_label": "Справочник",
        "usage_count": get_taxonomy_usage_count(usage_counts, option.scope, option.option_type, option.name),
    }


def add_virtual_taxonomy_option(options, configured_names, usage_counts, scope, option_type, name, source):
    normalized_name = normalize_admin_taxonomy_name(name)
    lowered_name = normalized_name.lower()

    if not normalized_name or lowered_name in configured_names[scope][option_type]:
        return

    options[scope][option_type].append({
        "id": None,
        "scope": scope,
        "option_type": option_type,
        "name": normalized_name,
        "color": "",
        "sort_order": 0,
        "is_active": True,
        "is_system": True,
        "source": source,
        "source_label": "По умолчанию" if source == "default" else "Найдено в данных",
        "usage_count": get_taxonomy_usage_count(usage_counts, scope, option_type, normalized_name),
    })
    configured_names[scope][option_type].add(lowered_name)


def get_taxonomy_usage_count(usage_counts, scope, option_type, name):
    return usage_counts.get(scope, {}).get(option_type, {}).get(normalize_admin_taxonomy_name(name), 0)


def get_taxonomy_usage_counts(organization_id):
    counts = {
        "report": {"type": {}, "tag": {}},
        "template": {"type": {}, "tag": {}},
    }

    for tag, total in (
        Report.query
        .with_entities(Report.tag, db.func.count(Report.id))
        .filter(Report.tag.isnot(None))
        .filter(Report.tag != "")
        .group_by(Report.tag)
        .all()
    ):
        counts["report"]["tag"][normalize_admin_taxonomy_name(tag)] = int(total or 0)

    for template_key, total in (
        Report.query
        .with_entities(Report.template_key, db.func.count(Report.id))
        .filter(Report.template_key.isnot(None))
        .filter(Report.template_key != "")
        .group_by(Report.template_key)
        .all()
    ):
        type_name = REPORT_TEMPLATE_TITLES.get(template_key or "", template_key or "Не выбран")
        counts["report"]["type"][normalize_admin_taxonomy_name(type_name)] = int(total or 0)

    for template_type, total in (
        Template.query
        .with_entities(Template.template_type, db.func.count(Template.id))
        .filter(Template.template_type.isnot(None))
        .filter(Template.template_type != "")
        .group_by(Template.template_type)
        .all()
    ):
        counts["template"]["type"][normalize_admin_taxonomy_name(template_type)] = int(total or 0)

    for tag, total in (
        Template.query
        .with_entities(Template.tag, db.func.count(Template.id))
        .filter(Template.tag.isnot(None))
        .filter(Template.tag != "")
        .group_by(Template.tag)
        .all()
    ):
        counts["template"]["tag"][normalize_admin_taxonomy_name(tag)] = int(total or 0)

    return counts


def get_current_admin_user():
    ensure_organization_data()

    current_user = db.session.get(User, session.get("user_id"))

    if not current_user:
        return None, (jsonify({"error": "unauthorized"}), 401)

    ensure_user_organization_defaults(current_user)
    session["organization_id"] = current_user.organization_id

    if normalize_user_role(current_user.role) != "admin":
        return None, (jsonify({"error": "forbidden"}), 403)

    return current_user, None


def serialize_admin_user(user):
    role = normalize_user_role(user.role)
    first_name = (user.first_name or "").strip()
    last_name = (user.last_name or "").strip()
    name = (user.name or "").strip()
    username = (user.username or "").strip()
    email_value = (user.email or "").strip()
    display_name = " ".join(
        part
        for part in [last_name, first_name]
        if part
    ).strip() or name or username or email_value or "Пользователь"

    return {
        "id": user.id,
        "avatar": (user.avatar or "").strip() or None,
        "name": name or None,
        "last_name": last_name or None,
        "first_name": first_name or None,
        "display_name": display_name,
        "username": username or None,
        "email": email_value or "—",
        "position": (user.position or "").strip() or "—",
        "role": role,
        "role_label": get_role_label(role),
        "organization_id": user.organization_id,
    }


def serialize_access_subject(subject_type, subject):
    if subject_type == "group":
        group = serialize_user_group(subject)
        group["subject_type"] = "group"
        group["display_name"] = group.get("name") or "Группа"
        return group

    user = serialize_admin_user(subject)
    user["subject_type"] = "user"
    return user


def get_access_subject_display_name(subject_type, subject):
    if subject_type == "group":
        return "группы «{0}»".format(subject.name)

    return "пользователя {0}".format(get_user_display_name_for_log(subject))


def get_user_display_name_for_log(user):
    if not user:
        return "Пользователь"

    return (
        " ".join(
            part
            for part in [
                (user.last_name or "").strip(),
                (user.first_name or "").strip(),
            ]
            if part
        ).strip()
        or (user.name or "").strip()
        or (user.username or "").strip()
        or (user.email or "").strip()
        or "Пользователь"
    )
