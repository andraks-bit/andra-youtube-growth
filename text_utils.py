"""Small shared text helpers for generated titles/tags/hashtags."""
import re


def to_hashtag(text):
    """Strip anything that isn't a letter/digit so the result is a valid hashtag."""
    cleaned = re.sub(r"[^A-Za-z0-9]", "", text)
    return "#" + cleaned if cleaned else ""


def clean_tag_parts(dest_label):
    """A destination label like 'Sydney / Australia' isn't a valid single tag
    (YouTube tags shouldn't contain '/') -- split it into clean parts."""
    return [part.strip() for part in dest_label.split("/") if part.strip()]


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


# Shared between metadata_rewriter.py (existing videos) and
# seo_package_generator.py (new videos) so the two don't drift apart.
GENERIC_CHAPTER_TEMPLATE = [
    "00:00 Intro",
    "00:XX Arrival / getting there",
    "0X:XX Main highlight 1",
    "0X:XX Main highlight 2",
    "0X:XX Food & dining",
    "0X:XX Final thoughts",
]

_THUMBNAIL_TEXT_TEMPLATES = [
    "{dest_short}!",
    "IS IT WORTH IT?",
    "{dest_short} TRUTH",
    "WE DID THIS IN {dest_short}",
]


def thumbnail_text_ideas(dest_short):
    return [t.format(dest_short=dest_short.upper()) for t in _THUMBNAIL_TEXT_TEMPLATES]
