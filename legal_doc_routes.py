"""
Flask routes for the Legal Doc Generator.

Thin HTTP wrapper around legal_doc_engine.render_legal_document(). All the
actual formatting/validation logic lives in that module so it can be unit
tested without booting Flask.
"""
import logging
from io import BytesIO

from flask import Blueprint, jsonify, request, send_file

from legal_doc_engine import DOCUMENT_LABELS, LegalDocError, render_legal_document

logger = logging.getLogger(__name__)

legal_docs_bp = Blueprint("legal_docs", __name__, url_prefix="/api/legal-docs")


@legal_docs_bp.route("/types", methods=["GET"])
def list_document_types():
    """Lets the frontend confirm at runtime which document types this
    deployment's backend actually supports, instead of hard-coding it."""
    return jsonify({"types": [{"id": k, "label": v} for k, v in DOCUMENT_LABELS.items()]})


@legal_docs_bp.route("/generate", methods=["POST"])
def generate_document():
    """
    Body: { "document_type": "rti_application" | "representation_letter" |
            "ia_petition" | "quash_petition", "fields": {...} }
    Returns: the rendered .docx as a file download.
    """
    payload = request.get_json(silent=True) or {}
    document_type = payload.get("document_type")
    fields = payload.get("fields") or {}

    if not document_type:
        return jsonify({"error": "document_type is required"}), 400

    try:
        docx_bytes = render_legal_document(document_type, fields)
    except LegalDocError as e:
        # User-fixable input problem (missing field, empty party list, etc.)
        return jsonify({"error": str(e)}), 400
    except Exception:
        logger.exception("Legal doc generation failed for type=%s", document_type)
        return jsonify({"error": "Could not generate the document. Please try again."}), 500

    filename = f"{document_type}.docx"
    return send_file(
        BytesIO(docx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        as_attachment=True,
        download_name=filename,
    )
