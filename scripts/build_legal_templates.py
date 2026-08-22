"""
Builds the .docx templates used by legal_doc_engine.py / legal_doc_routes.py.

Run once (and again any time a template's layout needs to change):
    python scripts/build_legal_templates.py

Each template is a real Word document (python-docx), with docxtpl/Jinja tags
written as plain text runs. At render time docxtpl substitutes those tags in
place without touching any surrounding formatting, so the generated filing
keeps the exact fonts/centering/bold/spacing set up here — nothing is
reconstructed from scratch.

Loop/conditional tag rule (verified against docxtpl 0.20.2 — see CONTEXT.md
"Legal Doc Generator" section): a "{%p for %}" / "{%p endfor %}" (or "{%tr
for %}" / "{%tr endfor %}") tag MUST be the only thing in its own whole
paragraph (or table row). If it shares a paragraph/row with real content,
docxtpl deletes that entire paragraph/row — tag and content together —
instead of looping it. So every loop here is written as three separate
paragraphs/rows: a "for" marker, the templated paragraph/row that repeats,
and an "endfor" marker.
"""
import os

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "legal_templates")


def new_doc() -> Document:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(12)
    return doc


def para(doc, text="", bold=False, align=None, italic=False, size=None, underline=False):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    r.underline = underline
    if size:
        r.font.size = Pt(size)
    return p


def blank(doc):
    doc.add_paragraph("")


def loop_start(doc, tag_expr: str):
    """tag_expr example: 'for pet in petitioners'"""
    doc.add_paragraph("{%p " + tag_expr + " %}")


def loop_end(doc):
    doc.add_paragraph("{%p endfor %}")


def if_start(doc, tag_expr: str):
    """tag_expr example: 'if through_line'"""
    doc.add_paragraph("{%p " + tag_expr + " %}")


def if_end(doc):
    doc.add_paragraph("{%p endif %}")


def party_block(doc, list_name: str, item_name: str = "p"):
    """A numbered party paragraph with a right-aligned role suffix on the
    last row, matching the cause-title layout in every sample filing."""
    loop_start(doc, f"for {item_name} in {list_name}")
    p = doc.add_paragraph()
    p.add_run("{{ " + item_name + ".index }}. {{ " + item_name + ".line }}")
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p2.add_run("{{ " + item_name + ".suffix }}")
    loop_end(doc)


def advocate_footer(doc, heading: str = "COUNSEL FOR THE PETITIONER"):
    blank(doc)
    p = doc.add_paragraph()
    p.add_run("{{ filing_place }}")
    p2 = doc.add_paragraph()
    p2.add_run("Date: {{ filing_date }}")
    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p3.add_run(heading).bold = True
    blank(doc)
    para(doc, "{{ advocate.advocate_name }} ({{ advocate.enrollment_no }})")
    para(doc, "Advocate")
    para(doc, "{{ advocate.office_address }}")
    if_start(doc, "if advocate.email")
    para(doc, "Email: {{ advocate.email }}")
    if_end(doc)
    if_start(doc, "if advocate.phone")
    para(doc, "Cell No.: {{ advocate.phone }}")
    if_end(doc)


# ---------------------------------------------------------------------------
# 1. RTI Application
# ---------------------------------------------------------------------------
def build_rti_application():
    doc = new_doc()
    para(doc, "APPLICATION FOR INFORMATION", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    blank(doc)
    para(doc, "Date: {{ application_date }}")
    blank(doc)
    para(doc, "To,")
    if_start(doc, "if pio_line")
    para(doc, "{{ pio_line }}")
    if_end(doc)
    para(doc, "{{ authority_name }}")
    para(doc, "{{ authority_office }}")
    if_start(doc, "if through_line")
    blank(doc)
    para(doc, "Through:")
    para(doc, "{{ through_line }}")
    if_end(doc)
    blank(doc)
    para(doc, "APPLICATION FOR INFORMATION", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    blank(doc)
    para(
        doc,
        "Under Section 6(1) of the Right to Information Act, 2005, I respectfully "
        "request the following information in {{ language }} language.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )
    para(doc, "{{ opening_paragraph }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    if_start(doc, "if background_paragraph")
    para(doc, "{{ background_paragraph }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    if_end(doc)
    blank(doc)
    para(doc, "Therefore, I request you to kindly furnish the following information:")
    loop_start(doc, "for item in info_requests")
    para(doc, "{{ item.index }}. {{ item.text }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    loop_end(doc)
    blank(doc)
    para(doc, "FEE:", bold=True)
    para(doc, "{{ fee_text }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    blank(doc)
    para(doc, "Thanking you,")
    para(doc, "Yours faithfully,")
    blank(doc)
    para(doc, "{{ applicant.line }}")
    if_start(doc, "if applicant_phone")
    para(doc, "Cell No.: {{ applicant_phone }}")
    if_end(doc)
    doc.save(os.path.join(OUT_DIR, "rti_application.docx"))


# ---------------------------------------------------------------------------
# 2. Municipal / authority representation letter
# ---------------------------------------------------------------------------
def build_representation_letter():
    doc = new_doc()
    para(doc, "To:")
    para(doc, "{{ authority_designation }}")
    para(doc, "{{ authority_office }}")
    blank(doc)
    para(doc, "Date: {{ letter_date }}")
    blank(doc)
    para(doc, "{{ salutation }}", bold=True)
    blank(doc)
    para(doc, "Subject: {{ subject_line }} – Reg.", bold=True)
    blank(doc)
    para(doc, "{{ salutation }}", bold=True)
    blank(doc)
    loop_start(doc, "for item in body_paragraphs")
    para(doc, "{{ item.text }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    blank(doc)
    loop_end(doc)
    para(doc, "{{ prayer_text }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    blank(doc)
    para(doc, "Thanking you,")
    blank(doc)
    para(doc, "Yours faithfully,")
    blank(doc)
    para(doc, "{{ sender.line }}")
    if_start(doc, "if sender_phone")
    para(doc, "Cell No.: {{ sender_phone }}")
    if_end(doc)
    doc.save(os.path.join(OUT_DIR, "representation_letter.docx"))


# ---------------------------------------------------------------------------
# Shared cause title for the two High Court templates
# ---------------------------------------------------------------------------
def cause_title(doc):
    para(doc, "{{ court_name }}", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "IA NO. {{ ia_no }} OF {{ ia_year }}", align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "IN", align=WD_ALIGN_PARAGRAPH.CENTER)
    para(
        doc,
        "{{ parent_case_type }} {{ parent_case_no }} OF {{ parent_case_year }}",
        align=WD_ALIGN_PARAGRAPH.CENTER,
    )
    blank(doc)
    para(doc, "Between:", bold=True)
    party_block(doc, "petitioners", "pet")
    blank(doc)
    para(doc, "AND", align=WD_ALIGN_PARAGRAPH.CENTER)
    blank(doc)
    party_block(doc, "respondents", "resp")


# ---------------------------------------------------------------------------
# 3. High Court IA petition (For Being Mentioned / Implead / Stay / Dispense
#    With / any Sec 151 CPC application) with optional affidavit+verification
# ---------------------------------------------------------------------------
def build_ia_petition():
    doc = new_doc()
    cause_title(doc)
    blank(doc)
    para(
        doc,
        "APPLICATION FILED UNDER {{ application_section }}",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.CENTER,
    )
    if_start(doc, "if nature_label")
    para(doc, "({{ nature_label }})", align=WD_ALIGN_PARAGRAPH.CENTER)
    if_end(doc)
    blank(doc)
    para(doc, "PRAYER", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    blank(doc)
    para(doc, "{{ prayer_text }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    advocate_footer(doc, "COUNSEL FOR THE PETITIONER")

    if_start(doc, "if include_affidavit")
    doc.add_page_break()
    cause_title(doc)
    blank(doc)
    para(doc, "AFFIDAVIT", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    blank(doc)
    para(
        doc,
        "I, {{ deponent.line }}, do hereby solemnly affirm and state on oath as follows:",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )
    blank(doc)
    loop_start(doc, "for item in affidavit_paragraphs")
    para(doc, "{{ item.index }}. {{ item.text }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    blank(doc)
    loop_end(doc)
    para(doc, "PRAYER", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "{{ prayer_text }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    blank(doc)
    p = doc.add_paragraph()
    p.add_run("Place: {{ verification_place }}")
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p2.add_run("DEPONENT")
    blank(doc)
    para(doc, "VERIFICATION", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    blank(doc)
    para(
        doc,
        "I, the above-named deponent, do hereby verify that the contents of the "
        "above affidavit are true and correct to the best of my knowledge and "
        "belief, and nothing material has been concealed therein.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )
    p3 = doc.add_paragraph()
    p3.add_run("Verified at {{ verification_place }} on this {{ verification_date }}.")
    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p4.add_run("DEPONENT")
    if_end(doc)

    doc.save(os.path.join(OUT_DIR, "ia_petition.docx"))


# ---------------------------------------------------------------------------
# 4. Criminal petition u/s 528 BNSS to quash an FIR
# ---------------------------------------------------------------------------
def build_quash_petition():
    doc = new_doc()
    para(doc, "MEMORANDUM OF CRIMINAL PETITION", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "(Under Sec. 528 of BNSS)", align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "{{ court_name }}", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "Crl.P.No. {{ crlp_no }} of {{ crlp_year }}", align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "Against", align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "FIR/{{ fir_no }}/{{ fir_year }}", align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "U/s {{ sections }}", align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "(P.S. {{ police_station }})", align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "IN THE COURT OF {{ trial_court }}", align=WD_ALIGN_PARAGRAPH.CENTER)
    blank(doc)
    para(doc, "Between:", bold=True)
    party_block(doc, "petitioners", "pet")
    para(doc, "Versus", align=WD_ALIGN_PARAGRAPH.CENTER)
    party_block(doc, "respondents", "resp")
    blank(doc)
    para(
        doc,
        "The address for service of summons for the above named petitioner(s) is as "
        "mentioned in the above cause title and that of their counsel "
        "{{ advocate.advocate_name }} ({{ advocate.enrollment_no }}), Advocate, "
        "{{ advocate.office_address }}",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )
    blank(doc)
    para(doc, "GROUNDS FOR QUASHING FIR", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    blank(doc)
    loop_start(doc, "for item in grounds")
    para(doc, "{{ item.index }}. {{ item.text }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    blank(doc)
    loop_end(doc)
    para(doc, "MAIN PRAYER", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "{{ main_prayer }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    blank(doc)
    if_start(doc, "if stay_prayer")
    para(doc, "STAY PRAYER", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    para(doc, "{{ stay_prayer }}", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    if_end(doc)
    if_start(doc, "if include_dispense_with")
    blank(doc)
    para(doc, "DISPENSE WITH PETITION", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    para(
        doc,
        "It is submitted that the Certified Copy of the FIR/{{ fir_no }}/{{ fir_year }}, "
        "pending before {{ trial_court }}, is not readily available and the Xerox copy of "
        "the same is filed herewith. It is prayed that this Hon'ble Court may be pleased to "
        "dispense with the requirement of the Certified Copy in the interest of justice.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )
    if_end(doc)
    advocate_footer(doc, "COUNSEL FOR THE PETITIONER(S)")
    doc.save(os.path.join(OUT_DIR, "quash_petition.docx"))


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    build_rti_application()
    build_representation_letter()
    build_ia_petition()
    build_quash_petition()
    print(f"Built 4 templates in {os.path.abspath(OUT_DIR)}")
