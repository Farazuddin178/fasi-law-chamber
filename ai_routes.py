"""
Flask routes for Chamber AI — an admin-only assistant for legal Q&A,
translation, and scanned-document analysis, backed by the Gemini API.

Model/config choices here were verified against a live call before writing
this file, not assumed from documentation:
  - "gemini-2.0-flash" (the originally requested model) 404s — it has been
    retired. The API's own error message names the replacement, which is
    what GEMINI_MODEL defaults to below. Model names get retired over time;
    if this one 404s in the future, the error message from Gemini itself
    will name the current replacement — update GEMINI_MODEL_DEFAULT then.
  - Gemini 3.x models spend part of max_output_tokens on internal "thinking"
    before producing visible text. A small max_output_tokens (tried: 20-50)
    produces finish_reason=STOP with NO error and an EMPTY response — the
    tokens were entirely consumed by thinking. max_output_tokens must stay
    generous (kept at 4096 below) or the assistant silently goes mute.
  - thinking_budget is capped (not left on "automatic") to bound latency in
    a chat UI — an unbounded thinking budget makes streaming feel like it
    hung before the first token arrives.
"""
import base64
import logging
import os

from flask import Blueprint, Response, jsonify, request, stream_with_context

logger = logging.getLogger(__name__)

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

GEMINI_MODEL_DEFAULT = "gemini-3.6-flash"
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", GEMINI_MODEL_DEFAULT)

# Load lazily so a missing/broken google-genai install doesn't take down the
# whole backend at import time — same "degrade, don't crash" pattern proxy.py
# already uses for the notification system and Legal Doc Generator.
_genai = None
_types = None
_errors = None
_import_error = None


def _load_sdk():
    global _genai, _types, _errors, _import_error
    if _genai is not None or _import_error is not None:
        return
    try:
        from google import genai as genai_module
        from google.genai import types as types_module
        from google.genai import errors as errors_module

        _genai = genai_module
        _types = types_module
        _errors = errors_module
    except ImportError as e:
        _import_error = e


_load_sdk()

_client_cache = {}


def _ensure_sdk_loaded():
    if _import_error is not None:
        raise RuntimeError(
            "The AI SDK is not installed on the server. Run: pip install google-genai"
        )


def _get_client():
    """Returns a genai.Client for the current GEMINI_API_KEY, or raises
    RuntimeError with a message safe to show the user (never includes the
    key itself)."""
    _ensure_sdk_loaded()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured on the server. Set it as an "
            "environment variable (Render dashboard -> Environment, or a "
            "local .env file) — never hard-code it into source."
        )
    if api_key not in _client_cache:
        _client_cache.clear()  # only ever cache the current key
        _client_cache[api_key] = _genai.Client(api_key=api_key)
    return _client_cache[api_key]


SYSTEM_PROMPT = """You are Chamber AI, the in-house legal assistant for Fasi Law Chamber, \
an advocacy practice appearing before the Telangana High Court and the District \
& Sessions Courts (including Magistrate Courts) in Telangana.

You assist the chamber's advocates and staff with:
- Legal research and statutory interpretation under Indian law, especially the \
Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), the \
Code of Civil Procedure (CPC), and — where a matter still involves it — the \
older Criminal Procedure Code (CrPC) and Indian Penal Code (IPC) sections it \
replaced. When a matter could fall under either the old or new criminal codes \
depending on when the offence occurred, say so explicitly rather than picking \
one silently.
- Translating documents and passages between English, Telugu, Urdu, and Hindi, \
preserving legal terminology precisely (e.g., keep terms like "FIR", "quash", \
"vakalath", "cause of action" recognizable, and flag any term that has no \
exact equivalent rather than inventing one).
- Reading and analyzing scanned court orders, notices, cause lists, and case \
documents supplied as images — extract the text faithfully first, then answer \
what was asked about it.

Rules:
- You are drafting support for a licensed advocate, not giving advice directly \
to a member of the public. Never present output as final legal advice ready to \
file or rely on without the advocate's own review — say so briefly when the \
context calls for it (e.g. when drafting petition text or ground language),
but don't repeat a disclaimer on every single reply.
- When you cite a section number, name the Act it belongs to. If you are not \
certain a section number is correct, say so rather than presenting a guess as \
settled.
- Keep answers focused and practical. Use short paragraphs, and use numbered \
or bulleted lists for anything with multiple parts (grounds, steps, requested \
information) rather than one dense paragraph.
- If an uploaded image is blurry, partially cropped, or a name/number is \
ambiguous, say what you could and couldn't read rather than filling gaps by \
guessing."""

MAX_HISTORY_MESSAGES = 30
MAX_IMAGE_BYTES = 15 * 1024 * 1024  # Gemini's own inline-image ceiling is ~20MB; stay under it
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


class ChatRequestError(ValueError):
    """Bad request from the client; the route turns this into a 400."""


def _build_contents(messages, image_base64, image_mime_type):
    """Turns the frontend's {role, content} history into google.genai
    Content objects, attaching the image (if any) to the last user turn."""
    if not isinstance(messages, list) or not messages:
        raise ChatRequestError("messages must be a non-empty list")

    trimmed = messages[-MAX_HISTORY_MESSAGES:]

    image_part = None
    if image_base64:
        if not image_mime_type or image_mime_type not in ALLOWED_IMAGE_MIME_TYPES:
            raise ChatRequestError(
                f"image_mime_type must be one of: {', '.join(sorted(ALLOWED_IMAGE_MIME_TYPES))}"
            )
        # Accept either a bare base64 string or a data: URL.
        raw = image_base64.split(",", 1)[1] if image_base64.startswith("data:") else image_base64
        try:
            image_bytes = base64.b64decode(raw, validate=True)
        except Exception as exc:
            raise ChatRequestError("image_base64 is not valid base64") from exc
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise ChatRequestError("Image is too large (max 15MB)")
        image_part = _types.Part.from_bytes(data=image_bytes, mime_type=image_mime_type)

    last_user_index = max((i for i, m in enumerate(trimmed) if m.get("role") == "user"), default=-1)

    contents = []
    for i, m in enumerate(trimmed):
        role = m.get("role")
        text = (m.get("content") or "").strip()
        if role not in ("user", "assistant") or not text:
            continue
        gemini_role = "model" if role == "assistant" else "user"
        parts = [_types.Part.from_text(text=text)]
        if image_part is not None and i == last_user_index and gemini_role == "user":
            parts.append(image_part)
        contents.append(_types.Content(role=gemini_role, parts=parts))

    if not contents:
        raise ChatRequestError("messages must contain at least one non-empty user message")
    if image_part is not None and last_user_index == -1:
        raise ChatRequestError("An image was attached but there is no user message to attach it to")

    return contents


def _build_tools():
    """Extensibility point for future chamber automation (case-file search,
    drafting notices, etc.) — return a list of google.genai.types.Tool here
    once a real tool exists. Empty today; deliberately not a fake framework
    ahead of an actual tool to plug into it."""
    return None


@ai_bp.route("/chat", methods=["POST"])
def chat():
    payload = request.get_json(silent=True) or {}

    try:
        _ensure_sdk_loaded()
        contents = _build_contents(
            payload.get("messages"),
            payload.get("image_base64"),
            payload.get("image_mime_type"),
        )
        client = _get_client()
    except ChatRequestError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503

    config = _types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        max_output_tokens=4096,
        thinking_config=_types.ThinkingConfig(thinking_budget=512, include_thoughts=False),
        tools=_build_tools(),
    )

    def generate():
        try:
            for chunk in client.models.generate_content_stream(
                model=GEMINI_MODEL, contents=contents, config=config
            ):
                if chunk.text:
                    yield chunk.text
        except _errors.APIError as e:
            code = getattr(e, "code", None)
            if code == 429:
                message = "Chamber AI is receiving too many requests right now. Please try again shortly."
            elif code == 404:
                message = (
                    f"The configured model ({GEMINI_MODEL}) is not available. "
                    "Set GEMINI_MODEL to a currently supported model."
                )
            else:
                message = "Chamber AI hit an error and could not finish this response."
            logger.error("Gemini API error (code=%s): %s", code, e)
            yield f"\n\n⚠️ {message}"
        except Exception:
            logger.exception("Unexpected error while streaming Chamber AI response")
            yield "\n\n⚠️ Something went wrong generating this response. Please try again."

    return Response(stream_with_context(generate()), mimetype="text/plain")


@ai_bp.route("/status", methods=["GET"])
def status():
    """Lets the frontend show a clear "not configured" state instead of a
    confusing failure on first message send."""
    configured = _import_error is None and bool(os.environ.get("GEMINI_API_KEY"))
    return jsonify({"configured": configured, "model": GEMINI_MODEL})
