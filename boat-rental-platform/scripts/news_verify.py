#!/usr/bin/env python3
"""
Verification gates for the BoatHire24 newsroom.

Everything here exists to stop one failure mode: publishing a claim that isn't
in the source. A newsroom caught inventing facts loses the whole section, so
these run BEFORE anything reaches the store — a rejected draft is a skipped day,
which is the cheap outcome.

Gates:
  numeric_grounding  — every figure in the draft must appear in the source text
  verbatim_overlap   — no long verbatim run lifted from the source (copyright)
  live_sources       — every cited URL must still resolve
  structural         — headline length, slug uniqueness, body size
"""
from __future__ import annotations

import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (compatible; BoatHire24NewsBot/1.0; +https://boathire24.com/news)"}

# Google caps news headlines at 110 characters.
MAX_HEADLINE = 110
# Longest run of consecutive words allowed to match the source verbatim.
MAX_VERBATIM_RUN = 15


class Rejected(Exception):
    """A draft failed a gate. The caller should skip it, never 'fix and ship'."""


def strip_tags(html: str) -> str:
    text = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", '"')
                .replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">"))
    return re.sub(r"\s+", " ", text).strip()


def _words(text: str) -> list[str]:
    return re.findall(r"[a-zA-ZÀ-ÿ0-9']+", text.lower())


def _normalise_number(tok: str) -> str:
    """
    Canonicalise a numeric token so 1.200, 1,200 and 1200 compare equal.

    European sources write 1.200,50 where English writes 1,200.50; comparing raw
    strings would flag correctly-reproduced figures as invented.
    """
    tok = tok.strip().rstrip("%€$£")
    tok = re.sub(r"[.,](?=\d{3}\b)", "", tok)   # thousands separators
    tok = tok.replace(",", ".")                  # decimal comma -> point
    try:
        f = float(tok)
    except ValueError:
        return tok
    return str(int(f)) if f == int(f) else str(f)


def _numbers(text: str) -> set[str]:
    return {_normalise_number(m) for m in re.findall(r"\d[\d.,]*", text)}


def numeric_grounding(draft_html: str, source_text: str, allowed: set[str] | None = None) -> None:
    """
    Every number in the draft must be traceable to the source (or to `allowed`,
    which carries figures WE computed ourselves in the data track).

    This is the main defence against a model quietly inventing a berth count or
    a percentage that reads plausibly and is entirely made up.
    """
    allowed = (allowed or set()) | _numbers(source_text)
    # Years and small ordinals appear constantly in prose and carry no factual
    # weight on their own; requiring them in the source produces false rejects.
    allowed |= {str(y) for y in range(2000, 2100)} | {str(n) for n in range(0, 13)}

    invented = sorted(n for n in _numbers(strip_tags(draft_html)) if n not in allowed)
    if invented:
        raise Rejected(f"ungrounded figures not present in source: {invented[:8]}")


def verbatim_overlap(draft_html: str, source_text: str, max_run: int = MAX_VERBATIM_RUN) -> None:
    """Reject drafts that lift a long passage verbatim rather than reporting it."""
    dw, sw = _words(strip_tags(draft_html)), _words(source_text)
    if len(dw) < max_run or len(sw) < max_run:
        return
    source_runs = {tuple(sw[i:i + max_run]) for i in range(len(sw) - max_run + 1)}
    for i in range(len(dw) - max_run + 1):
        run = tuple(dw[i:i + max_run])
        if run in source_runs:
            raise Rejected(f"verbatim {max_run}-word run copied from source: {' '.join(run)[:90]}…")


def live_sources(sources: list[dict], timeout: int = 20) -> None:
    """Every cited URL must resolve. A dead citation is worse than no citation."""
    if not sources:
        raise Rejected("no sources — newsroom items must cite their basis")
    for s in sources:
        url = s.get("url", "")
        if not url.startswith("http"):
            raise Rejected(f"malformed source URL: {url!r}")
        try:
            req = urllib.request.Request(url, headers=UA, method="HEAD")
            code = urllib.request.urlopen(req, timeout=timeout).status
        except Exception:
            try:  # some publishers reject HEAD but serve GET fine
                req = urllib.request.Request(url, headers=UA)
                code = urllib.request.urlopen(req, timeout=timeout).status
            except Exception as e:
                raise Rejected(f"source unreachable ({type(e).__name__}): {url}")
        if code >= 400:
            raise Rejected(f"source returned HTTP {code}: {url}")


def structural(article: dict, existing_slugs: set[str], min_words: int = 220) -> None:
    if not article.get("slug") or article["slug"] in existing_slugs:
        raise Rejected(f"missing or duplicate slug: {article.get('slug')!r}")
    if len(article.get("title", "")) > MAX_HEADLINE:
        raise Rejected(f"headline {len(article['title'])} chars exceeds Google's {MAX_HEADLINE}")
    body_words = len(_words(strip_tags(article.get("content", ""))))
    if body_words < min_words:
        raise Rejected(f"body too thin: {body_words} words")
    if not article.get("standfirst"):
        raise Rejected("missing standfirst")


def verify_sourced(article: dict, source_text: str, existing_slugs: set[str]) -> None:
    """All gates for a Track 1 (externally sourced) article."""
    structural(article, existing_slugs)
    numeric_grounding(article["content"] + " " + article["standfirst"], source_text)
    verbatim_overlap(article["content"], source_text)
    live_sources(article.get("sources", []))


def verify_data(article: dict, computed: dict, existing_slugs: set[str]) -> None:
    """
    All gates for a Track 2 (first-party data) article.

    The source text is our own computed figures, so `allowed` carries them and
    the grounding check still catches anything the model made up around them.
    """
    structural(article, existing_slugs)
    allowed = {_normalise_number(str(v)) for v in computed.values() if isinstance(v, (int, float))}
    for v in computed.values():
        if isinstance(v, dict):
            allowed |= {_normalise_number(str(x)) for x in v.values() if isinstance(x, (int, float))}
    numeric_grounding(article["content"] + " " + article["standfirst"], "", allowed=allowed)
    live_sources(article.get("sources", []))
