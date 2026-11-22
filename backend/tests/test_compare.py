import pytest

import compare


def test_validation_runs_before_any_llm_work(monkeypatch):
    monkeypatch.setattr(compare.db, "list_titles", lambda: ["A", "B", "C"])
    with pytest.raises(compare.BadRequest):
        compare.compare_papers(["A", "B"], "   ")                       # empty topic
    with pytest.raises(compare.BadRequest):
        compare.compare_papers(["A"], "learning")                       # too few papers
    with pytest.raises(compare.BadRequest):
        compare.compare_papers(["A", "A"], "learning")                  # duplicates collapse to one
    with pytest.raises(compare.BadRequest):
        compare.compare_papers(["A", "Z"], "learning")                  # unknown paper
    with pytest.raises(compare.BadRequest):
        compare.compare_papers(list("ABCDE"), "learning")               # too many


def test_clean_normalises_model_output():
    raw = {
        "summary": "s",
        "points": [{
            "point": "p", "verdict": "CONTRADICTION",
            "positions": [
                {"paper": "A", "stance": "Not Mentioned", "claim": "", "pages": [3, 1, 3, "x"]},
                {"paper": "B", "stance": "weird", "claim": "c", "pages": []},
            ],
        }, {"point": "q", "verdict": "???", "positions": []}],
    }
    out = compare._clean(raw, ["A", "B"])
    first, second = out["points"]
    assert first["verdict"] == "contradiction"
    assert first["positions"][0] == {"paper": "A", "stance": "not_mentioned", "claim": "", "pages": [1, 3]}
    assert first["positions"][1]["stance"] == "partial"
    assert second["verdict"] == "partial"
    assert out["papers"] == ["A", "B"]
