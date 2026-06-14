import re
import subprocess
from uuid import uuid4
from pathlib import Path

from flask import current_app
from jinja2 import Environment, FileSystemLoader

from app.template_registry import REPORT_TEMPLATES


def escape_latex(value):
    """
    Экранирование специальных символов LaTeX.
    Нужно, чтобы пользовательский текст не ломал PDF.
    """
    if value is None:
        return ""

    value = str(value)

    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }

    value = re.sub(
        r"([\\&%$#_{}~^])",
        lambda match: replacements[match.group(1)],
        value,
    )

    value = value.replace("\n", r"\par ")
    return value


def _get_latex_environment(templates_dir):
    env = Environment(
        loader=FileSystemLoader(str(templates_dir)),
        autoescape=False,
    )
    env.filters["latex"] = escape_latex
    return env


def _compile_latex(tex_path, pdf_dir, pdf_path):
    compiler = current_app.config.get("LATEX_COMPILER", "xelatex")

    command = [
        compiler,
        "-interaction=nonstopmode",
        "-halt-on-error",
        f"-output-directory={pdf_dir}",
        str(tex_path),
    ]

    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="ignore",
    )

    if result.returncode != 0:
        raise RuntimeError(
            "Ошибка компиляции LaTeX:\n"
            + result.stdout
            + "\n"
            + result.stderr
        )

    if not pdf_path.exists():
        raise FileNotFoundError("PDF-файл не был создан.")


def generate_status_report_pdf(report):
    """
    Генерирует PDF-отчет на основе данных из БД.
    Сначала создается .tex, затем он компилируется через xelatex.
    """
    base_dir = Path(current_app.root_path).parent

    templates_dir = base_dir / "latex_templates"
    tex_dir = base_dir / "storage" / "tex"
    pdf_dir = base_dir / "storage" / "generated"

    tex_dir.mkdir(parents=True, exist_ok=True)
    pdf_dir.mkdir(parents=True, exist_ok=True)

    env = _get_latex_environment(templates_dir)
    template = env.get_template("status_report.tex.j2")

    tex_content = template.render(report=report)

    tex_filename = f"status_report_{report.id}.tex"
    pdf_filename = f"status_report_{report.id}.pdf"

    tex_path = tex_dir / tex_filename
    pdf_path = pdf_dir / pdf_filename

    tex_path.write_text(tex_content, encoding="utf-8")

    _compile_latex(tex_path, pdf_dir, pdf_path)

    return pdf_filename


def generate_imported_report_pdf(imported_data, template_key):
    """
    Генерирует PDF на основе импортированных и нормализованных данных.
    Шаблон выбирается из реестра REPORT_TEMPLATES.
    """
    template_info = REPORT_TEMPLATES.get(template_key)
    if not template_info:
        raise ValueError("Выбран неизвестный шаблон отчета.")

    base_dir = Path(current_app.root_path).parent

    templates_dir = base_dir / "latex_templates"
    tex_dir = base_dir / "storage" / "tex"
    pdf_dir = base_dir / "storage" / "generated"

    tex_dir.mkdir(parents=True, exist_ok=True)
    pdf_dir.mkdir(parents=True, exist_ok=True)

    env = _get_latex_environment(templates_dir)
    template = env.get_template(template_info["latex_template"])
    fields = _build_final_fields(imported_data)

    tex_content = template.render(
        data=imported_data,
        fields=fields,
        template=template_info,
    )

    unique_suffix = uuid4().hex[:8]
    base_filename = f"imported_report_{imported_data.id}_{template_key}_{unique_suffix}"
    tex_filename = f"{base_filename}.tex"
    pdf_filename = f"{base_filename}.pdf"

    tex_path = tex_dir / tex_filename
    pdf_path = pdf_dir / pdf_filename

    tex_path.write_text(tex_content, encoding="utf-8")

    _compile_latex(tex_path, pdf_dir, pdf_path)

    return tex_filename, pdf_filename


def _build_final_fields(imported_data):
    imported_document = imported_data.imported_document

    if not imported_document or not imported_document.document_scan:
        return {}

    return {
        field.field_key: field.final_value or ""
        for field in imported_document.document_scan.extracted_fields
    }
