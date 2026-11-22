from io import BytesIO
from typing import List, Tuple

from pypdf import PdfReader

from config import Config


def extract_pages(pdf_bytes: bytes) -> List[Tuple[int, str]]:
    """Return [(page_number, text)] for pages that contain text."""
    reader = PdfReader(BytesIO(pdf_bytes))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i, text))
    return pages


def chunk_pages(pages: List[Tuple[int, str]],
                size: int = Config.CHUNK_CHARS,
                overlap: int = Config.CHUNK_OVERLAP) -> List[Tuple[int, str]]:
    """Split each page into overlapping chunks, keeping the page number."""
    chunks: List[Tuple[int, str]] = []
    step = max(size - overlap, 1)
    for page, text in pages:
        start = 0
        while start < len(text):
            piece = text[start:start + size].strip()
            if piece:
                chunks.append((page, piece))
            start += step
    return chunks
