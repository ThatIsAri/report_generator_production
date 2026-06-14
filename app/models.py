from datetime import datetime

from app.extensions import db


class Organization(db.Model):
    __tablename__ = "organizations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    avatar = db.Column(db.String(500), nullable=True)
    description = db.Column(db.Text, nullable=True)
    tariff = db.Column(db.String(100), nullable=False, default="Базовый")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    users = db.relationship("User", back_populates="organization")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(50), nullable=False, default="user")
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    position = db.Column(db.String(255), nullable=True)
    avatar = db.Column(db.String(500), nullable=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    organization = db.relationship("Organization", back_populates="users")
    group_memberships = db.relationship("UserGroupMember", back_populates="user")
    preferences = db.relationship(
        "UserPreference",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="UserPreference.setting_key",
    )


class UserPreference(db.Model):
    __tablename__ = "user_preferences"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    setting_key = db.Column(db.String(120), nullable=False)
    value = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    user = db.relationship("User", back_populates="preferences")

    __table_args__ = (
        db.UniqueConstraint("user_id", "setting_key", name="unique_user_preference"),
        db.Index("idx_user_preferences_user_id", "user_id"),
        db.Index("idx_user_preferences_key", "setting_key"),
    )


class UserGroup(db.Model):
    __tablename__ = "user_groups"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    avatar = db.Column(db.String(500), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    organization = db.relationship("Organization", backref=db.backref("user_groups", lazy="dynamic"))
    creator = db.relationship("User", foreign_keys=[created_by])
    members = db.relationship(
        "UserGroupMember",
        back_populates="group",
        cascade="all, delete-orphan",
        order_by="UserGroupMember.id",
    )


class UserGroupMember(db.Model):
    __tablename__ = "user_group_members"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("user_groups.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="member")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    group = db.relationship("UserGroup", back_populates="members")
    user = db.relationship("User", back_populates="group_memberships")

    __table_args__ = (
        db.UniqueConstraint("group_id", "user_id", name="unique_group_user"),
        db.Index("idx_user_group_members_group_id", "group_id"),
        db.Index("idx_user_group_members_user_id", "user_id"),
    )


class GroupReportAccess(db.Model):
    __tablename__ = "group_report_access"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("user_groups.id"), nullable=False)
    report_id = db.Column(db.Integer, db.ForeignKey("reports.id"), nullable=False)
    access_level = db.Column(db.String(50), nullable=False, default="view")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    group = db.relationship("UserGroup")
    report = db.relationship("Report")

    __table_args__ = (
        db.UniqueConstraint("group_id", "report_id", name="unique_group_report"),
        db.Index("idx_group_report_access_group_id", "group_id"),
        db.Index("idx_group_report_access_report_id", "report_id"),
    )


class GroupTemplateAccess(db.Model):
    __tablename__ = "group_template_access"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("user_groups.id"), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey("templates.id"), nullable=False)
    access_level = db.Column(db.String(50), nullable=False, default="view")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    group = db.relationship("UserGroup")
    template = db.relationship("Template")

    __table_args__ = (
        db.UniqueConstraint("group_id", "template_id", name="unique_group_template"),
        db.Index("idx_group_template_access_group_id", "group_id"),
        db.Index("idx_group_template_access_template_id", "template_id"),
    )


class AccessPermission(db.Model):
    __tablename__ = "access_permissions"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False)
    subject_type = db.Column(db.String(20), nullable=False)
    subject_id = db.Column(db.Integer, nullable=False)
    permission_key = db.Column(db.String(120), nullable=False)
    is_allowed = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    organization = db.relationship("Organization")

    __table_args__ = (
        db.UniqueConstraint(
            "organization_id",
            "subject_type",
            "subject_id",
            "permission_key",
            name="unique_access_permission_subject",
        ),
        db.Index("idx_access_permissions_organization_id", "organization_id"),
        db.Index("idx_access_permissions_subject", "subject_type", "subject_id"),
    )


class UserActionLog(db.Model):
    __tablename__ = "user_action_logs"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action_key = db.Column(db.String(120), nullable=False)
    action_label = db.Column(db.String(255), nullable=False)
    entity_type = db.Column(db.String(80), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)
    description = db.Column(db.Text, nullable=True)
    metadata_json = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(100), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    organization = db.relationship("Organization")
    user = db.relationship("User")

    __table_args__ = (
        db.Index("idx_user_action_logs_organization_id", "organization_id"),
        db.Index("idx_user_action_logs_user_id", "user_id"),
        db.Index("idx_user_action_logs_action_key", "action_key"),
        db.Index("idx_user_action_logs_created_at", "created_at"),
    )


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)

    report_title = db.Column(db.String(255), nullable=False)
    report_author = db.Column(db.String(255), nullable=False)
    report_date = db.Column(db.Date, nullable=False)

    tag = db.Column(db.String(100), nullable=True)

    template_key = db.Column(db.String(100), nullable=True)
    folder_id = db.Column(db.Integer, db.ForeignKey("folders.id"), nullable=True)
    linked_report_id = db.Column(db.Integer, db.ForeignKey("reports.id"), nullable=True)

    source_type = db.Column(db.String(50), nullable=True)
    source_filename = db.Column(db.String(255), nullable=True)

    pdf_filename = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    folder = db.relationship("Folder", back_populates="reports")
    linked_report = db.relationship("Report", remote_side=[id], foreign_keys=[linked_report_id], post_update=True)


class ReportShare(db.Model):
    __tablename__ = "report_shares"

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey("reports.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    access_level = db.Column(db.String(50), nullable=False, default="view")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    report = db.relationship("Report", backref=db.backref("shared_users", cascade="all, delete-orphan"))
    user = db.relationship("User", foreign_keys=[user_id])
    creator = db.relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        db.UniqueConstraint("report_id", "user_id", name="unique_report_user"),
        db.Index("idx_report_shares_report_id", "report_id"),
        db.Index("idx_report_shares_user_id", "user_id"),
    )


class AdminReportSetting(db.Model):
    __tablename__ = "admin_report_settings"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    setting_key = db.Column(db.String(120), nullable=False)
    value = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    organization = db.relationship("Organization")

    __table_args__ = (
        db.UniqueConstraint("organization_id", "setting_key", name="unique_admin_report_setting"),
        db.Index("idx_admin_report_settings_organization_id", "organization_id"),
        db.Index("idx_admin_report_settings_key", "setting_key"),
    )


class AdminTemplateSetting(db.Model):
    __tablename__ = "admin_template_settings"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    setting_key = db.Column(db.String(120), nullable=False)
    value = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    organization = db.relationship("Organization")

    __table_args__ = (
        db.UniqueConstraint("organization_id", "setting_key", name="unique_admin_template_setting"),
        db.Index("idx_admin_template_settings_organization_id", "organization_id"),
        db.Index("idx_admin_template_settings_key", "setting_key"),
    )


class AdminSystemSetting(db.Model):
    __tablename__ = "admin_system_settings"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    setting_key = db.Column(db.String(120), nullable=False)
    value = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    organization = db.relationship("Organization")

    __table_args__ = (
        db.UniqueConstraint("organization_id", "setting_key", name="unique_admin_system_setting"),
        db.Index("idx_admin_system_settings_organization_id", "organization_id"),
        db.Index("idx_admin_system_settings_key", "setting_key"),
    )


class AdminTaxonomyOption(db.Model):
    __tablename__ = "admin_taxonomy_options"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    scope = db.Column(db.String(50), nullable=False)
    option_type = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    color = db.Column(db.String(32), nullable=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    organization = db.relationship("Organization")

    __table_args__ = (
        db.UniqueConstraint("organization_id", "scope", "option_type", "name", name="unique_admin_taxonomy_option"),
        db.Index("idx_admin_taxonomy_options_organization_id", "organization_id"),
        db.Index("idx_admin_taxonomy_options_scope_type", "scope", "option_type"),
        db.Index("idx_admin_taxonomy_options_is_active", "is_active"),
    )


class TemplateChipCategory(db.Model):
    __tablename__ = "template_chip_categories"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    category_key = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    organization = db.relationship("Organization")

    __table_args__ = (
        db.UniqueConstraint("organization_id", "category_key", name="unique_template_chip_category"),
        db.Index("idx_template_chip_categories_organization_id", "organization_id"),
        db.Index("idx_template_chip_categories_is_active", "is_active"),
    )


class TemplateChipDefinition(db.Model):
    __tablename__ = "template_chip_definitions"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    field = db.Column(db.String(120), nullable=False)
    label = db.Column(db.String(255), nullable=False)
    category_key = db.Column(db.String(100), nullable=False, default="custom")
    kind = db.Column(db.String(50), nullable=False, default="text")
    based_on = db.Column(db.String(120), nullable=True)
    latex_markup = db.Column(db.Text, nullable=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_favorite = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    organization = db.relationship("Organization")

    __table_args__ = (
        db.UniqueConstraint("organization_id", "field", name="unique_template_chip_definition"),
        db.Index("idx_template_chip_definitions_organization_id", "organization_id"),
        db.Index("idx_template_chip_definitions_category", "category_key"),
        db.Index("idx_template_chip_definitions_is_active", "is_active"),
    )


class Folder(db.Model):
    __tablename__ = "folders"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("folders.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    parent = db.relationship("Folder", remote_side=[id], backref=db.backref("children", order_by="Folder.name"))
    reports = db.relationship("Report", back_populates="folder")


class Template(db.Model):
    __tablename__ = "templates"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    tag = db.Column(db.String(100), nullable=True)
    template_type = db.Column(db.String(100), nullable=False, default="Универсальный")
    source_template_id = db.Column(db.Integer, db.ForeignKey("templates.id"), nullable=True)
    content_html = db.Column(db.Text, nullable=True)
    content_json = db.Column(db.Text, nullable=True)
    latex_template = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    source_template = db.relationship(
        "Template",
        remote_side=[id],
        backref=db.backref("derived_templates", lazy="dynamic"),
    )


class StatusReport(db.Model):
    __tablename__ = "status_reports"

    id = db.Column(db.Integer, primary_key=True)

    project_name = db.Column(db.String(255), nullable=False)
    report_date = db.Column(db.Date, nullable=False)
    manager_name = db.Column(db.String(255), nullable=False)

    project_status = db.Column(db.String(100), nullable=False)
    completed_work = db.Column(db.Text, nullable=False)
    current_risks = db.Column(db.Text, nullable=True)
    next_steps = db.Column(db.Text, nullable=False)

    pdf_filename = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ImportedDocument(db.Model):
    __tablename__ = "imported_documents"

    id = db.Column(db.Integer, primary_key=True)

    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_extension = db.Column(db.String(20), nullable=False)
    raw_text = db.Column(db.Text, nullable=True)
    import_status = db.Column(db.String(50), nullable=False, default="success")
    error_message = db.Column(db.Text, nullable=True)

    source_document_id = db.Column(db.Integer, db.ForeignKey("source_documents.id"), nullable=True)
    document_scan_id = db.Column(db.Integer, db.ForeignKey("document_scans.id"), nullable=True)
    detected_profile_key = db.Column(db.String(100), nullable=True)
    detected_profile_title = db.Column(db.String(255), nullable=True)
    classification_confidence = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    source_document = db.relationship("SourceDocument", foreign_keys=[source_document_id])
    document_scan = db.relationship("DocumentScan", foreign_keys=[document_scan_id])

    report_data = db.relationship(
        "ImportedReportData",
        back_populates="imported_document",
        uselist=False,
    )


class ImportedReportData(db.Model):
    __tablename__ = "imported_report_data"

    id = db.Column(db.Integer, primary_key=True)

    imported_document_id = db.Column(
        db.Integer,
        db.ForeignKey("imported_documents.id"),
        nullable=False,
    )

    project_name = db.Column(db.String(255), nullable=True)
    report_period = db.Column(db.String(255), nullable=True)
    manager_name = db.Column(db.String(255), nullable=True)
    project_status = db.Column(db.String(100), nullable=True)
    completed_work = db.Column(db.Text, nullable=True)
    current_risks = db.Column(db.Text, nullable=True)
    next_steps = db.Column(db.Text, nullable=True)

    verification_status = db.Column(db.String(50), nullable=False, default="needs_review")
    verified_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    imported_document = db.relationship(
        "ImportedDocument",
        back_populates="report_data",
    )
    normalization_changes = db.relationship(
        "NormalizationChange",
        back_populates="imported_report_data",
        order_by="NormalizationChange.created_at",
    )
    user_corrections = db.relationship(
        "UserCorrection",
        back_populates="imported_report_data",
        order_by="UserCorrection.created_at",
    )


class SourceDocument(db.Model):
    __tablename__ = "source_documents"

    id = db.Column(db.Integer, primary_key=True)

    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_extension = db.Column(db.String(20), nullable=False)
    mime_type = db.Column(db.String(255), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    scan_status = db.Column(db.String(50), nullable=False, default="pending")
    error_message = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scans = db.relationship(
        "DocumentScan",
        back_populates="source_document",
        order_by="DocumentScan.created_at",
    )


class DocumentScan(db.Model):
    __tablename__ = "document_scans"

    id = db.Column(db.Integer, primary_key=True)

    source_document_id = db.Column(
        db.Integer,
        db.ForeignKey("source_documents.id"),
        nullable=False,
    )

    plain_text = db.Column(db.Text, nullable=True)
    detected_format = db.Column(db.String(50), nullable=False)
    pages_count = db.Column(db.Integer, nullable=True)
    sheets_count = db.Column(db.Integer, nullable=True)
    paragraphs_count = db.Column(db.Integer, nullable=True)
    tables_count = db.Column(db.Integer, nullable=True)
    key_values_count = db.Column(db.Integer, nullable=True)
    sections_count = db.Column(db.Integer, nullable=True)
    scan_json = db.Column(db.Text, nullable=True)
    warnings_text = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    source_document = db.relationship(
        "SourceDocument",
        back_populates="scans",
    )
    extracted_fields = db.relationship(
        "ExtractedField",
        back_populates="document_scan",
        order_by="ExtractedField.created_at",
    )


class ExtractedField(db.Model):
    __tablename__ = "extracted_fields"

    id = db.Column(db.Integer, primary_key=True)

    document_scan_id = db.Column(
        db.Integer,
        db.ForeignKey("document_scans.id"),
        nullable=False,
    )

    field_key = db.Column(db.String(100), nullable=False)
    field_label = db.Column(db.String(255), nullable=False)
    original_value = db.Column(db.Text, nullable=True)
    normalized_value = db.Column(db.Text, nullable=True)
    final_value = db.Column(db.Text, nullable=True)
    confidence = db.Column(db.Float, nullable=True)
    is_required = db.Column(db.Boolean, nullable=False, default=False)
    is_missing = db.Column(db.Boolean, nullable=False, default=False)
    source_type = db.Column(db.String(100), nullable=True)
    source_location = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    document_scan = db.relationship(
        "DocumentScan",
        back_populates="extracted_fields",
    )


class NormalizationChange(db.Model):
    __tablename__ = "normalization_changes"

    id = db.Column(db.Integer, primary_key=True)

    imported_report_data_id = db.Column(
        db.Integer,
        db.ForeignKey("imported_report_data.id"),
        nullable=False,
    )

    field_name = db.Column(db.String(100), nullable=False)
    original_value = db.Column(db.Text, nullable=True)
    normalized_value = db.Column(db.Text, nullable=True)
    change_description = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    imported_report_data = db.relationship(
        "ImportedReportData",
        back_populates="normalization_changes",
    )


class UserCorrection(db.Model):
    __tablename__ = "user_corrections"

    id = db.Column(db.Integer, primary_key=True)

    imported_report_data_id = db.Column(
        db.Integer,
        db.ForeignKey("imported_report_data.id"),
        nullable=False,
    )

    field_name = db.Column(db.String(100), nullable=False)
    previous_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    correction_description = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    imported_report_data = db.relationship(
        "ImportedReportData",
        back_populates="user_corrections",
    )


class GeneratedDocument(db.Model):
    __tablename__ = "generated_documents"

    id = db.Column(db.Integer, primary_key=True)

    source_type = db.Column(db.String(50), nullable=False)
    source_id = db.Column(db.Integer, nullable=False)
    template_key = db.Column(db.String(100), nullable=False)
    tex_filename = db.Column(db.String(255), nullable=False)
    pdf_filename = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ReportDraft(db.Model):
    __tablename__ = "report_drafts"

    id = db.Column(db.Integer, primary_key=True)

    report_title = db.Column(db.String(255), nullable=False)
    report_date = db.Column(db.Date, nullable=False)
    tag = db.Column(db.String(100), nullable=True)
    template_key = db.Column(db.String(100), nullable=False)
    template_title = db.Column(db.String(255), nullable=False)
    folder_name = db.Column(db.String(255), nullable=True)
    access_placeholder = db.Column(db.String(255), nullable=True)
    linked_report_id = db.Column(db.Integer, db.ForeignKey("reports.id"), nullable=True)
    status = db.Column(db.String(50), nullable=False, default="draft")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    linked_report = db.relationship("Report", foreign_keys=[linked_report_id])
    source_files = db.relationship(
        "ImportedSourceFile",
        back_populates="draft",
        cascade="all, delete-orphan",
        order_by="ImportedSourceFile.order_index",
    )
    data_blocks = db.relationship(
        "ImportedDataBlock",
        back_populates="draft",
        cascade="all, delete-orphan",
        order_by="ImportedDataBlock.order_index",
    )


class ImportedSourceFile(db.Model):
    __tablename__ = "imported_source_files"

    id = db.Column(db.Integer, primary_key=True)

    draft_id = db.Column(
        db.Integer,
        db.ForeignKey("report_drafts.id"),
        nullable=False,
    )

    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_extension = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="completed")
    error_message = db.Column(db.Text, nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    draft = db.relationship("ReportDraft", back_populates="source_files")
    data_blocks = db.relationship(
        "ImportedDataBlock",
        back_populates="source_file",
        cascade="all, delete-orphan",
        order_by="ImportedDataBlock.order_index",
    )


class ImportedDataBlock(db.Model):
    __tablename__ = "imported_data_blocks"

    id = db.Column(db.Integer, primary_key=True)

    draft_id = db.Column(
        db.Integer,
        db.ForeignKey("report_drafts.id"),
        nullable=False,
    )
    source_file_id = db.Column(
        db.Integer,
        db.ForeignKey("imported_source_files.id"),
        nullable=True,
    )

    block_type = db.Column(db.String(50), nullable=False)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    source_file_name = db.Column(db.String(255), nullable=True)
    content_text = db.Column(db.Text, nullable=True)
    content_json = db.Column(db.Text, nullable=True)
    color_index = db.Column(db.Integer, nullable=False, default=1)
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    draft = db.relationship("ReportDraft", back_populates="data_blocks")
    source_file = db.relationship("ImportedSourceFile", back_populates="data_blocks")


class ReportEditorState(db.Model):
    __tablename__ = "report_editor_states"

    id = db.Column(db.Integer, primary_key=True)

    draft_id = db.Column(
        db.Integer,
        db.ForeignKey("report_drafts.id"),
        nullable=False,
        unique=True,
    )

    document_html = db.Column(db.Text, nullable=True)
    document_json = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    draft = db.relationship("ReportDraft", backref=db.backref("editor_state", uselist=False))


class ReportVersion(db.Model):
    __tablename__ = "report_versions"

    id = db.Column(db.Integer, primary_key=True)

    draft_id = db.Column(
        db.Integer,
        db.ForeignKey("report_drafts.id"),
        nullable=False,
    )

    version_number = db.Column(db.Integer, nullable=False, default=1)
    snapshot_json = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    draft = db.relationship("ReportDraft", backref=db.backref("versions", order_by="ReportVersion.version_number"))
