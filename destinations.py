"""
Destination classification for travel-vlog videos.

Keyword-match based (title + tags + description against config.DESTINATIONS
match_terms) -- not ML, not a real NLP model. Transparent and easy to extend:
add an entry to config.DESTINATIONS and every downstream module picks it up.
"""
import config


def classify(video):
    """Return the destination key for a video, or config.UNCLASSIFIED_DESTINATION."""
    text = " ".join([
        video.get("title", ""),
        video.get("description", ""),
        " ".join(video.get("tags", [])),
    ]).lower()

    for key, dest in config.DESTINATIONS.items():
        for term in dest["match_terms"]:
            if term in text:
                return key
    return config.UNCLASSIFIED_DESTINATION


def label_for(destination_key):
    if destination_key == config.UNCLASSIFIED_DESTINATION:
        return config.UNCLASSIFIED_LABEL
    return config.DESTINATIONS.get(destination_key, {}).get("label", destination_key)


def classify_text(text):
    """Classify a freestanding piece of text (e.g. a search term) by destination, or None."""
    text = text.lower()
    for key, dest in config.DESTINATIONS.items():
        for term in dest["match_terms"]:
            if term in text:
                return key
    return None


def all_destination_keys(include_unclassified=False):
    keys = list(config.DESTINATIONS.keys())
    if include_unclassified:
        keys.append(config.UNCLASSIFIED_DESTINATION)
    return keys
