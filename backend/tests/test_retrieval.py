import re

import retrieval


def test_tsquery_is_sanitised_or_query():
    q = retrieval._tsquery("What's the capital, of France?!")
    assert "france" in q and "capital" in q
    assert all(re.fullmatch(r"[a-z0-9]+", part) for part in q.split(" | "))


def test_tsquery_empty_for_punctuation_only():
    assert retrieval._tsquery("?!... ") == ""


def test_rrf_prefers_chunks_found_by_both_retrievers():
    vector = [{"id": 1, "score": 0.9}, {"id": 2, "score": 0.8}]
    keyword = [{"id": 2, "score": 5.0}, {"id": 3, "score": 4.0}]
    fused = retrieval._fuse(vector, keyword)
    assert [h["id"] for h in fused] == [2, 1, 3]
    assert fused[0]["score"] > fused[1]["score"] > fused[2]["score"]


def test_fuse_keeps_vector_similarity():
    fused = retrieval._fuse([{"id": 1, "score": 0.7, "sim": 0.7}], [{"id": 1, "score": 3.0}])
    assert fused[0]["sim"] == 0.7


def test_off_topic_needs_both_signals_low():
    assert retrieval.looks_off_topic([]) is True
    assert retrieval.looks_off_topic([{"score": 0.001, "sim": 0.30}]) is True
    assert retrieval.looks_off_topic([{"score": 0.001, "sim": 0.60}]) is False   # similar enough
    assert retrieval.looks_off_topic([{"score": 0.200, "sim": 0.30}]) is False   # reranker likes it
    assert retrieval.looks_off_topic([{"score": 0.001}]) is True                  # keyword-only hit
