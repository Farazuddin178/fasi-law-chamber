"""
Legal document generation engine.

Renders the .docx templates in legal_templates/ (built by
scripts/build_legal_templates.py) by merging in structured form data from the
"Legal Doc Generator" page. The templates carry all the real Word formatting
(fonts, centering, bold headings, numbered paragraphs); this module only ever
substitutes text into existing runs/paragraphs/table rows via docxtpl — it
never reconstructs a document from scratch, which is what keeps the output
"same to same" with the source layout instead of scrambled.

See CONTEXT.md for the docxtpl loop/if tag placement rule this relies on.
"""
import io
import os

from docxtpl import DocxTemplate

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "legal_templates")

DOCUMENT_TEMPLATES = {
    "rti_application": "rti_application.docx",
    "representation_letter": "representation_letter.docx",
    "ia_petition": "ia_petition.docx",
    "quash_petition": "quash_petition.docx",
}

DOCUMENT_LABELS = {
    "rti_application": "RTI Application",
    "representation_letter": "Representation Letter",
    "ia_petition": "High Court IA Petition",
    "quash_petition": "Criminal Quash Petition",
}


class LegalDocError(ValueError):
    """Bad input from the form. The Flask route turns this into a 400 with
    the message shown back to the user, so messages here must be readable
    on their own (not stack traces)."""


def _s(value) -> str:
    """Coerce to a stripped string; None/False/0 all become ''."""
    if value is None:
        return ""
    return str(value).strip()


def _require(fields: dict, key: str, label: str) -> str:
    value = _s(fields.get(key))
    if not value:
        raise LegalDocError(f"{label} is required")
    return value


def format_party_line(party) -> str:
    if not isinstance(party, dict):
        raise LegalDocError("Each party must be an object with name/address, etc.")
    name = _s(party.get("name"))
    if not name:
        raise LegalDocError("Every party needs a name")
    parts = [name]

    relation_type = _s(party.get("relation_type"))
    related_to = _s(party.get("related_to"))
    relation_text = _s(party.get("relation_text"))
    if relation_type and related_to:
        parts.append(f"{relation_type} {related_to}")
    elif relation_text:
        parts.append(relation_text)

    age = _s(party.get("age"))
    if age:
        parts.append(f"Aged about {age} years")

    occupation = _s(party.get("occupation"))
    if occupation:
        parts.append(f"Occ: {occupation}")

    address = _s(party.get("address"))
    if address:
        parts.append(f"R/o {address}")

    line = ", ".join(p for p in parts if p)
    return line if line.endswith(".") else line + "."


def format_party_list(parties, singular: str, plural: str, field_label: str):
    if not isinstance(parties, list) or not parties:
        raise LegalDocError(f"At least one {field_label} is required")
    total = len(parties)
    label = plural if total > 1 else singular
    out = []
    for i, party in enumerate(parties, start=1):
        out.append(
            {
                "index": i,
                "line": format_party_line(party),
                "suffix": f"... {label}" if i == total else "",
            }
        )
    return out


def format_paragraph_list(items, field_label: str, required: bool = False):
    items = items or []
    if not isinstance(items, list):
        raise LegalDocError(f"{field_label} must be a list of text entries")
    cleaned = [_s(i) for i in items if _s(i)]
    if required and not cleaned:
        raise LegalDocError(f"At least one entry is required for {field_label}")
    return [{"index": i, "text": t} for i, t in enumerate(cleaned, start=1)]


def _advocate_context(fields: dict) -> dict:
    advocate = fields.get("advocate") or {}
    if not isinstance(advocate, dict):
        raise LegalDocError("advocate must be an object")
    return {
        "advocate_name": _require(advocate, "advocate_name", "Advocate name"),
        "enrollment_no": _s(advocate.get("enrollment_no")),
        "office_address": _require(advocate, "office_address", "Advocate office address"),
        "email": _s(advocate.get("email")),
        "phone": _s(advocate.get("phone")),
    }


def _build_rti_application_context(fields: dict) -> dict:
    applicant = fields.get("applicant") or {}
    return {
        "application_date": _require(fields, "application_date", "Application date"),
        "pio_line": _s(fields.get("pio_line")),
        "authority_name": _require(fields, "authority_name", "Authority name"),
        "authority_office": _require(fields, "authority_office", "Authority office"),
        "through_line": _s(fields.get("through_line")),
        "language": _s(fields.get("language")) or "Telugu",
        "opening_paragraph": _require(fields, "opening_paragraph", "Opening paragraph"),
        "background_paragraph": _s(fields.get("background_paragraph")),
        "info_requests": format_paragraph_list(
            fields.get("info_requests"), "information requested", required=True
        ),
        "fee_text": _require(fields, "fee_text", "Fee paragraph"),
        "applicant": {"line": format_party_line(applicant)},
        "applicant_phone": _s(applicant.get("phone")),
    }


def _build_representation_letter_context(fields: dict) -> dict:
    sender = fields.get("sender") or {}
    return {
        "authority_designation": _require(fields, "authority_designation", "Authority designation"),
        "authority_office": _require(fields, "authority_office", "Authority office"),
        "letter_date": _require(fields, "letter_date", "Letter date"),
        "salutation": _s(fields.get("salutation")) or "Respected Sir/Madam,",
        "subject_line": _require(fields, "subject_line", "Subject line"),
        "body_paragraphs": format_paragraph_list(
            fields.get("body_paragraphs"), "body paragraphs", required=True
        ),
        "prayer_text": _require(fields, "prayer_text", "Prayer text"),
        "sender": {"line": format_party_line(sender)},
        "sender_phone": _s(sender.get("phone")),
    }


def _build_ia_petition_context(fields: dict) -> dict:
    petitioners = format_party_list(
        fields.get("petitioners"), "Petitioner", "Petitioners", "petitioner"
    )
    respondents = format_party_list(
        fields.get("respondents"), "Respondent", "Respondents", "respondent"
    )
    include_affidavit = bool(fields.get("include_affidavit", True))

    ctx = {
        "court_name": _s(fields.get("court_name"))
        or "HIGH COURT FOR THE STATE OF TELANGANA AT HYDERABAD",
        "ia_no": _s(fields.get("ia_no")) or "____",
        "ia_year": _require(fields, "ia_year", "IA year"),
        "parent_case_type": _require(fields, "parent_case_type", "Parent case type (e.g. W.P.No.)"),
        "parent_case_no": _require(fields, "parent_case_no", "Parent case number"),
        "parent_case_year": _require(fields, "parent_case_year", "Parent case year"),
        "petitioners": petitioners,
        "respondents": respondents,
        "application_section": _s(fields.get("application_section"))
        or "SECTION 151 OF THE CODE OF CIVIL PROCEDURE, 1908",
        "nature_label": _s(fields.get("nature_label")),
        "prayer_text": _require(fields, "prayer_text", "Prayer text"),
        "include_affidavit": include_affidavit,
        "filing_place": _s(fields.get("filing_place")) or "Hyderabad",
        "filing_date": _require(fields, "filing_date", "Filing date"),
        "advocate": _advocate_context(fields),
    }

    if include_affidavit:
        deponent_index = fields.get("deponent_index", 0)
        try:
            deponent_index = int(deponent_index)
        except (TypeError, ValueError):
            raise LegalDocError("deponent_index must be a number")
        raw_petitioners = fields.get("petitioners") or []
        if not (0 <= deponent_index < len(raw_petitioners)):
            raise LegalDocError("deponent_index must point at one of the petitioners")
        ctx["deponent"] = {"line": format_party_line(raw_petitioners[deponent_index])}
        ctx["affidavit_paragraphs"] = format_paragraph_list(
            fields.get("affidavit_paragraphs"), "affidavit paragraphs", required=True
        )
        ctx["verification_place"] = _s(fields.get("verification_place")) or "Hyderabad"
        ctx["verification_date"] = _require(
            fields, "verification_date", "Verification date"
        )
    else:
        # Keys still need to exist because {%p if include_affidavit%} only
        # guards the surrounding paragraphs — Jinja still evaluates any tag
        # inside, and an undefined lookup there raises instead of skipping.
        ctx["deponent"] = {"line": ""}
        ctx["affidavit_paragraphs"] = []
        ctx["verification_place"] = ""
        ctx["verification_date"] = ""

    return ctx


def _build_quash_petition_context(fields: dict) -> dict:
    petitioners = format_party_list(
        fields.get("petitioners"), "Petitioner/Accused No.1", "Petitioners/Accused", "petitioner"
    )
    respondents = format_party_list(
        fields.get("respondents"), "Respondent", "Respondents", "respondent"
    )
    return {
        "court_name": _s(fields.get("court_name"))
        or "HIGH COURT FOR THE STATE OF TELANGANA AT HYDERABAD",
        "crlp_no": _s(fields.get("crlp_no")) or "____",
        "crlp_year": _require(fields, "crlp_year", "Crl.P. year"),
        "fir_no": _require(fields, "fir_no", "FIR number"),
        "fir_year": _require(fields, "fir_year", "FIR year"),
        "sections": _require(fields, "sections", "Sections"),
        "police_station": _require(fields, "police_station", "Police station"),
        "trial_court": _require(fields, "trial_court", "Trial court"),
        "petitioners": petitioners,
        "respondents": respondents,
        "grounds": format_paragraph_list(fields.get("grounds"), "grounds", required=True),
        "main_prayer": _require(fields, "main_prayer", "Main prayer"),
        "stay_prayer": _s(fields.get("stay_prayer")),
        "include_dispense_with": bool(fields.get("include_dispense_with")),
        "filing_place": _s(fields.get("filing_place")) or "Hyderabad",
        "filing_date": _require(fields, "filing_date", "Filing date"),
        "advocate": _advocate_context(fields),
    }


_CONTEXT_BUILDERS = {
    "rti_application": _build_rti_application_context,
    "representation_letter": _build_representation_letter_context,
    "ia_petition": _build_ia_petition_context,
    "quash_petition": _build_quash_petition_context,
}


def render_legal_document(document_type: str, fields: dict) -> bytes:
    """Merge `fields` into the matching template and return the rendered
    .docx as bytes. Raises LegalDocError for anything the caller can fix by
    correcting the form; anything else is a real bug."""
    if document_type not in DOCUMENT_TEMPLATES:
        raise LegalDocError(
            f"Unknown document_type '{document_type}'. Expected one of: "
            + ", ".join(DOCUMENT_TEMPLATES)
        )
    if not isinstance(fields, dict):
        raise LegalDocError("fields must be an object")

    context = _CONTEXT_BUILDERS[document_type](fields)

    template_path = os.path.join(TEMPLATES_DIR, DOCUMENT_TEMPLATES[document_type])
    tpl = DocxTemplate(template_path)
    tpl.render(context)

    buf = io.BytesIO()
    tpl.save(buf)
    return buf.getvalue()
