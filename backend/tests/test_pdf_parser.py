from utils.pdf_parser import chunk_pages, clean_pages


def test_clean_pages_strips_footers_numbers_and_hyphenation():
    pages = [
        (1, "Intro text one.\n12\nWINTER 1987 59"),
        (2, "Body two with knowl-\nedge here.\n60 AI MAGAZINE"),
        (3, "More text.\nWINTER 1987 61"),
        (4, "Fourth page.\n62 AI MAGAZINE"),
        (5, "Fifth.\nWINTER 1987 63"),
        (6, "Sixth.\n64 AI MAGAZINE"),
    ]
    cleaned = dict(clean_pages(pages))
    joined = " ".join(cleaned.values())
    assert "WINTER" not in joined and "MAGAZINE" not in joined
    assert cleaned[1] == "Intro text one."
    assert cleaned[2] == "Body two with knowledge here."


def test_clean_pages_joins_wrapped_lines():
    (_, text), = clean_pages([(1, "one line\nsecond line\n\nthird")])
    assert text == "one line second line third"


def _sentences(n):
    return " ".join(f"Sentence number {i} is here." for i in range(n))


def test_chunks_respect_size_and_page():
    chunks = chunk_pages([(7, _sentences(40))], size=100, overlap=30)
    assert len(chunks) > 3
    assert all(page == 7 for page, _ in chunks)
    assert all(len(text) <= 100 for _, text in chunks)


def test_chunks_break_on_sentence_boundaries():
    chunks = chunk_pages([(1, _sentences(40))], size=100, overlap=30)
    assert all(text.endswith(".") and text.startswith("Sentence") for _, text in chunks)


def test_chunks_overlap_by_whole_sentences():
    chunks = chunk_pages([(1, _sentences(40))], size=100, overlap=60)
    first, second = chunks[0][1], chunks[1][1]
    last_sentence = first.rsplit(". ", 1)[-1]
    assert last_sentence in second


def test_chunks_do_not_cross_pages():
    chunks = chunk_pages([(1, _sentences(5)), (2, _sentences(5))], size=100, overlap=30)
    assert {page for page, _ in chunks} == {1, 2}


def test_overlong_sentence_is_split():
    long = "word " * 400
    chunks = chunk_pages([(1, long.strip())], size=100, overlap=20)
    assert all(len(text) <= 100 for _, text in chunks)
