import math
import re
from collections import Counter
from io import BytesIO
from typing import List, Tuple

from pypdf import PdfReader

from config import Config


def _line_key(line: str) -> str:
    """Normalise a line so 'WINTER 1987 59' and 'WINTER 1987 61' count as the same footer."""
    return re.sub(r"\d+", "#", line.strip().lower())


def clean_pages(pages: List[Tuple[int, str]]) -> List[Tuple[int, str]]:
    """Strip running headers/footers and page numbers, fix hyphenation, join wrapped lines."""
    counts: Counter = Counter()
    for _, text in pages:
        counts.update({_line_key(l) for l in text.splitlines() if l.strip()})
    repeat_at = max(3, math.ceil(0.4 * len(pages)))

    cleaned = []
    for number, text in pages:
        kept = []
        for line in text.splitlines():
            s = line.strip()
            if not s or re.fullmatch(r"\d{1,4}", s):
                continue
            if len(s) < 80 and counts[_line_key(s)] >= repeat_at:
                continue
            kept.append(s)
        body = "\n".join(kept)
        body = re.sub(r"(\w)-\n(\w)", r"\1\2", body)      # de-hyphenate line breaks
        body = re.sub(r"\s*\n\s*", " ", body)              # join wrapped lines
        body = re.sub(r"\s+", " ", body).strip()
        if body:
            cleaned.append((number, body))
    return cleaned


def extract_pages(pdf_bytes: bytes) -> List[Tuple[int, str]]:
    """Return [(page_number, cleaned_text)] for pages that contain text."""
    reader = PdfReader(BytesIO(pdf_bytes))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i, text))
    return clean_pages(pages)


_SENTENCE_END = re.compile(r'(?<=[.!?])\s+(?=[A-Z0-9"“(\[])')


def _sentences(text: str, size: int) -> List[str]:
    out: List[str] = []
    for s in _SENTENCE_END.split(text):
        while len(s) > size:                                # pathological run-on text
            cut = s.rfind(" ", 0, size)
            cut = cut if cut > 0 else size
            out.append(s[:cut])
            s = s[cut:].strip()
        if s:
            out.append(s)
    return out


def chunk_pages(pages: List[Tuple[int, str]],
                size: int = Config.CHUNK_CHARS,
                overlap: int = Config.CHUNK_OVERLAP) -> List[Tuple[int, str]]:
    """Pack whole sentences into ~`size`-char chunks, carrying ~`overlap` chars into the next one."""
    chunks: List[Tuple[int, str]] = []
    for page, text in pages:
        current: List[str] = []
        length = 0
        for sent in _sentences(text, size):
            if current and length + 1 + len(sent) > size:
                chunks.append((page, " ".join(current)))
                tail: List[str] = []
                tail_len = 0
                for prev in reversed(current):
                    if tail_len + len(prev) > overlap:
                        break
                    tail.insert(0, prev)
                    tail_len += len(prev) + 1
                current, length = tail, tail_len
            current.append(sent)
            length += len(sent) + 1
        if current:
            piece = " ".join(current)
            # skip a trailing chunk that is only the overlap carried from the previous one
            if not chunks or chunks[-1][0] != page or piece not in chunks[-1][1]:
                chunks.append((page, piece))
    return chunks
