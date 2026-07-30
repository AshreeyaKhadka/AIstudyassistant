import base64
import logging
import mimetypes
import os
import requests
import fitz
from config import Config

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {'.pdf', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.pptx'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}
OCR_TEXT_MIN_CHARS_PER_PAGE = 80
MAX_OCR_PAGES = 25


def is_supported_material(filename: str) -> bool:
    _, ext = os.path.splitext(filename or '')
    return ext.lower() in SUPPORTED_EXTENSIONS


def supported_material_message() -> str:
    return 'Supported files: PDF slides/notes, PPTX slides, TXT notes, and PNG/JPG/WEBP handwritten-note images.'


def parse_uploaded_material(file, filepath: str) -> str:
    text, _metadata = parse_uploaded_material_with_metadata(file, filepath)
    return text


def parse_uploaded_material_with_metadata(file, filepath: str) -> tuple[str, dict]:
    """
    Save and extract study text from supported material files.

    PDFs and PPTX files use structured text extraction first. Scanned PDFs and
    handwritten note images fall back to Gemini vision OCR when configured.
    """
    filename = file.filename or ''
    _, ext = os.path.splitext(filename)
    ext = ext.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(supported_material_message())

    file.save(filepath)

    if ext == '.txt':
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
        return text, _extraction_metadata('typed_text', text)

    if ext == '.pdf':
        text = _parse_pdf(filepath)
        method = 'pdf_text_ocr' if '[OCR Page' in text else 'pdf_text'
        return text, _extraction_metadata(method, text)

    if ext == '.pptx':
        text = _parse_pptx(filepath)
        return text, _extraction_metadata('slide_text', text)

    if ext in IMAGE_EXTENSIONS:
        text = _ocr_image_file(filepath)
        return text, _extraction_metadata('ocr', text)

    raise ValueError(supported_material_message())


def _extraction_metadata(method: str, text: str) -> dict:
    length = len((text or '').strip())
    if length >= 500:
        quality = 'good'
    elif length >= 120:
        quality = 'partial'
    else:
        quality = 'low'
    return {
        'extraction_method': method,
        'extraction_quality': quality,
        'character_count': length,
    }


def _parse_pdf(filepath: str) -> str:
    parts = []
    ocr_pages = []
    doc = fitz.open(filepath)
    try:
        for index, page in enumerate(doc):
            text = (page.get_text() or '').strip()
            if text:
                parts.append(f"[Page {index + 1}]\n{text}")
            if len(text) < OCR_TEXT_MIN_CHARS_PER_PAGE and len(ocr_pages) < MAX_OCR_PAGES:
                ocr_pages.append(index)

        if ocr_pages:
            for index in ocr_pages:
                page = doc[index]
                pixmap = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
                image_bytes = pixmap.tobytes('png')
                ocr_text = _ocr_image_bytes(image_bytes, 'image/png')
                if ocr_text:
                    parts.append(f"[OCR Page {index + 1}]\n{ocr_text}")
    finally:
        doc.close()

    return "\n\n".join(part for part in parts if part.strip())


def _parse_pptx(filepath: str) -> str:
    try:
        from pptx import Presentation
    except ImportError as exc:
        raise RuntimeError("PPTX parsing requires python-pptx. Install backend requirements first.") from exc

    prs = Presentation(filepath)
    slides = []
    for index, slide in enumerate(prs.slides, start=1):
        text_parts = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text:
                text_parts.append(shape.text.strip())
            if getattr(shape, "has_table", False):
                for row in shape.table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        text_parts.append(row_text)
        if text_parts:
            slides.append(f"[Slide {index}]\n" + "\n".join(text_parts))
    return "\n\n".join(slides)


def _ocr_image_file(filepath: str) -> str:
    mime_type = mimetypes.guess_type(filepath)[0] or 'image/png'
    with open(filepath, 'rb') as f:
        return _ocr_image_bytes(f.read(), mime_type)


def _ocr_image_bytes(image_bytes: bytes, mime_type: str) -> str:
    if not Config.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is required for OCR of handwritten or scanned notes.")

    base_url = Config.GEMINI_API_BASE_URL.rstrip('/')
    model = Config.GEMINI_MODEL or 'gemini-2.5-flash'
    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {
                    "text": (
                        "Extract all readable study-note text from this image. "
                        "Preserve headings, bullet points, formulas, and slide structure. "
                        "Return plain text only. If text is unclear, transcribe the readable parts."
                    )
                },
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": base64.b64encode(image_bytes).decode('ascii'),
                    }
                },
            ],
        }],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 4096,
        },
    }

    try:
        response = requests.post(
            f"{base_url}/models/{model}:generateContent",
            headers={"x-goog-api-key": Config.GEMINI_API_KEY},
            json=payload,
            timeout=90,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error(f"Gemini OCR request failed: {exc}")
        raise RuntimeError(f"OCR failed: {exc}")

    data = response.json()
    candidates = data.get("candidates", [])
    if not candidates:
        return ""
    content = candidates[0].get("content", {}) or {}
    parts = content.get("parts", []) or []
    return "\n".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
