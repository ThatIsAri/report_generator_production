from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse


ALLOWED_TAGS = {
    "a",
    "b",
    "blockquote",
    "br",
    "caption",
    "code",
    "col",
    "colgroup",
    "div",
    "em",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "section",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
}

VOID_TAGS = {"br", "hr", "img", "col"}
SKIP_CONTENT_TAGS = {"script", "style", "iframe", "object", "embed", "link", "meta"}
GLOBAL_ATTRS = {"class", "style", "title", "align"}
TAG_ATTRS = {
    "a": {"href", "target", "rel"},
    "img": {"src", "alt", "width", "height"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
    "table": {"cellpadding", "cellspacing", "border"},
    "col": {"span", "width"},
}
URI_ATTRS = {"href", "src"}
SAFE_URI_SCHEMES = {"", "http", "https", "mailto", "tel"}
SAFE_DATA_IMAGE_PREFIXES = (
    "data:image/png;base64,",
    "data:image/jpeg;base64,",
    "data:image/jpg;base64,",
    "data:image/gif;base64,",
    "data:image/webp;base64,",
)


class HTMLSanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.output = []
        self.open_tags = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()

        if tag in SKIP_CONTENT_TAGS:
            self.skip_depth += 1
            return

        if self.skip_depth or tag not in ALLOWED_TAGS:
            return

        clean_attrs = self._sanitize_attrs(tag, attrs)
        attrs_text = "".join(
            ' {0}="{1}"'.format(name, escape(value, quote=True))
            for name, value in clean_attrs
        )
        self.output.append("<{0}{1}>".format(tag, attrs_text))

        if tag not in VOID_TAGS:
            self.open_tags.append(tag)

    def handle_endtag(self, tag):
        tag = tag.lower()

        if tag in SKIP_CONTENT_TAGS and self.skip_depth:
            self.skip_depth -= 1
            return

        if self.skip_depth or tag not in ALLOWED_TAGS or tag in VOID_TAGS:
            return

        if tag not in self.open_tags:
            return

        while self.open_tags:
            open_tag = self.open_tags.pop()
            self.output.append("</{0}>".format(open_tag))
            if open_tag == tag:
                break

    def handle_data(self, data):
        if not self.skip_depth:
            self.output.append(escape(data, quote=False))

    def handle_entityref(self, name):
        if not self.skip_depth:
            self.output.append("&{0};".format(name))

    def handle_charref(self, name):
        if not self.skip_depth:
            self.output.append("&#{0};".format(name))

    def close(self):
        super().close()

        while self.open_tags:
            self.output.append("</{0}>".format(self.open_tags.pop()))

    def _sanitize_attrs(self, tag, attrs):
        allowed_attrs = set(GLOBAL_ATTRS) | TAG_ATTRS.get(tag, set())
        clean_attrs = []

        for raw_name, raw_value in attrs:
            name = (raw_name or "").strip().lower()

            if not name or name.startswith("on"):
                continue

            if name.startswith("data-"):
                clean_attrs.append((name, raw_value or ""))
                continue

            if name not in allowed_attrs:
                continue

            value = raw_value or ""

            if name in URI_ATTRS and not _is_safe_uri(value):
                continue

            if name == "target" and value not in {"_blank", "_self", "_parent", "_top"}:
                continue

            if tag == "a" and name == "target" and value == "_blank":
                clean_attrs.append((name, value))
                clean_attrs.append(("rel", "noopener noreferrer"))
                continue

            clean_attrs.append((name, value))

        return clean_attrs


def sanitize_editor_html(html):
    sanitizer = HTMLSanitizer()
    sanitizer.feed(html or "")
    sanitizer.close()
    return "".join(sanitizer.output)


def _is_safe_uri(value):
    normalized_value = (value or "").strip()
    lowered_value = normalized_value.lower()

    if lowered_value.startswith(SAFE_DATA_IMAGE_PREFIXES):
        return True

    parsed = urlparse(normalized_value)
    return parsed.scheme.lower() in SAFE_URI_SCHEMES
