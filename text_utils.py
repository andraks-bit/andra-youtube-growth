"""Small shared text helpers for generated titles/tags/hashtags."""
import re


def to_hashtag(text):
    """Strip anything that isn't a letter/digit so the result is a valid hashtag."""
    cleaned = re.sub(r"[^A-Za-z0-9]", "", text)
    return "#" + cleaned if cleaned else ""


def dedupe_ci(items):
    """Case-insensitive de-dup that keeps the first-seen casing and order."""
    seen = set()
    out = []
    for item in items:
        key = item.lower()
        if key not in seen and item:
            seen.add(key)
            out.append(item)
    return out
