"""Retrieval evaluation. Local only: no LLM calls, no API cost.

  python -m eval.run_eval --pdf path/to/paper.pdf --reingest      # rebuild chunks first
  python -m eval.run_eval --modes dense,hybrid,full
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db  # noqa: E402
import retrieval  # noqa: E402
import services  # noqa: E402

K = 30


def norm(text: str) -> str:
    text = re.sub(r"-\s*\n\s*", "", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def first_hit_rank(hits, phrases):
    for i, h in enumerate(hits, 1):
        t = norm(h["content"])
        if any(p in t for p in phrases):
            return i, h["score"]
    return None, None


def run(mode, data):
    title = data["title"]
    ranks, pos_scores = [], []
    for item in data["positive"]:
        hits = retrieval.retrieve(item["q"], title, mode, K)
        r, s = first_hit_rank(hits, [norm(p) for p in item["any_of"]])
        ranks.append(r)
        if s is not None:
            pos_scores.append(s)
    neg_scores = []
    for q in data["negative"]:
        hits = retrieval.retrieve(q, title, mode, K)
        neg_scores.append(hits[0]["score"] if hits else 0.0)

    n = len(ranks)

    def hit(k):
        return sum(1 for r in ranks if r is not None and r <= k) / n

    mrr = sum(1 / r for r in ranks if r) / n
    return ranks, hit, mrr, pos_scores, neg_scores


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--modes", default="dense,hybrid,full")
    ap.add_argument("--pdf")
    ap.add_argument("--reingest", action="store_true")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()
    data = json.loads((Path(__file__).parent / "questions.json").read_text(encoding="utf-8"))

    if args.reingest:
        if not args.pdf:
            sys.exit("--reingest needs --pdf")
        db.delete_paper(data["title"])
        n = services.ingest(data["title"], Path(args.pdf).read_bytes())
        print(f"re-ingested '{data['title']}': {n} chunks")

    print(f"{'mode':8} {'hit@1':>6} {'hit@3':>6} {'hit@5':>6} {'hit@10':>7} {'hit@30':>7} {'MRR':>6}   misses (question:rank)")
    for mode in args.modes.split(","):
        ranks, hit, mrr, pos, neg = run(mode, data)
        miss = [f"Q{i + 1}:{r or '-'}" for i, r in enumerate(ranks) if r is None or r > 3]
        print(f"{mode:8} {hit(1):6.2f} {hit(3):6.2f} {hit(5):6.2f} {hit(10):7.2f} {hit(30):7.2f} {mrr:6.2f}   {' '.join(miss) or 'none'}")
        if args.verbose or mode == "full":
            med = sorted(pos)[len(pos) // 2] if pos else 0
            print(f"         first-correct-hit score: min {min(pos or [0]):.3f} median {med:.3f}"
                  f" | off-topic top score: max {max(neg):.3f} ({', '.join(f'{x:.3f}' for x in neg)})")
        if mode == "full":
            gate(data)


def gate(data):
    """How the free off-topic pre-check behaves (the LLM judges everything it lets through)."""
    title = data["title"]
    wrongly_rejected = [
        i + 1 for i, item in enumerate(data["positive"])
        if retrieval.looks_off_topic(retrieval.retrieve(item["q"], title, "full", 5))
    ]
    caught = sum(1 for q in data["negative"] if retrieval.looks_off_topic(retrieval.retrieve(q, title, "full", 5)))
    print(f"         pre-check: on-topic questions wrongly rejected: {wrongly_rejected or 'none'}"
          f" | off-topic caught for free: {caught}/{len(data['negative'])}")


if __name__ == "__main__":
    main()
