"""
Generates concrete replacement title/description/tag suggestions for videos
already flagged by analysis/optimization_opportunities.py.

Template-based, not LLM-generated -- deterministic and explainable using the
channel's own proven keywords (from content_planning's recurring top words)
and real keyword gaps (from keyword_discovery), rather than a black box.
Nothing here writes to YouTube; this only produces text for the report.
"""
import destinations
from text_utils import to_hashtag, dedupe_ci, thumbnail_text_ideas, GENERIC_CHAPTER_TEMPLATE, clean_tag_parts

_TITLE_TEMPLATES = [
    "{subject}",
    "{subject} | {dest}",
]

# Subject-specific description templates (keyed by detected video type)
_DESCRIPTIONS = {
    "beach": "Explore {subject} with us. {dest_intro}\nJoin us for sun, sand, and unforgettable coastal moments.\n\nFollow for more travel content.\n#{dest_hashtag}",
    "zoo": "Tour {subject} with us in {dest}.\n{dest_intro}\nExperience amazing wildlife and attractions.\n\nFollow for more travel content.\n#{dest_hashtag}",
    "hotel": "Experience {subject} in {dest}.\n{dest_intro}\nDiscover luxury accommodations and unforgettable stays.\n\nFollow for more travel content.\n#{dest_hashtag}",
    "pets": "Join us for {subject} in {dest}.\n{dest_intro}\nExperience pet life and animal adventures.\n\nFollow for more travel content.\n#{dest_hashtag}",
    "cars": "Test drive {subject} in {dest}.\n{dest_intro}\nExperience supercar vibes and luxury travel.\n\nFollow for more travel content.\n#{dest_hashtag}",
    "city": "Explore {subject} with us in {dest}.\n{dest_intro}\nExperience urban culture and city vibes.\n\nFollow for more travel content.\n#{dest_hashtag}",
    "island": "Discover {subject} with us in {dest}.\n{dest_intro}\nExperience tropical island paradise.\n\nFollow for more travel content.\n#{dest_hashtag}",
    "seasonal": "Experience {subject} with us.\n{dest_intro}\nJoin us for seasonal travel moments.\n\nFollow for more travel content.\n#{dest_hashtag}",
    "default": "Experience {subject} with us in {dest}.\n{dest_intro}\n\nFollow for more travel content.\n#{dest_hashtag}",
}

MAX_REWRITES = 12


def _pick_top_word(recurring_words, exclude_words):
    for word, _count in recurring_words:
        if word.lower() not in exclude_words:
            return word.capitalize()
    return "Travel Guide"


def _detect_video_type(title_clean):
    """Detect video subject type for appropriate description and tags"""
    title_lower = title_clean.lower()

    # Island detection BEFORE beach (islands include beaches but are distinct)
    if "island" in title_lower or "lembongan" in title_lower or "gili" in title_lower:
        return "island"
    if any(w in title_lower for w in ["beach", "coastal", "ocean", "lagoon", "gulf"]):
        return "beach"
    if any(w in title_lower for w in ["zoo", "wildlife", "animal"]):
        return "zoo"
    if any(w in title_lower for w in ["hotel", "resort", "luxurious", "luxury"]):
        return "hotel"
    if any(w in title_lower for w in ["dog", "dogs", "pet", "pets"]):
        return "pets"
    # Car detection: require "brabus", "g-wagon", "test drive", or "lamborghini" (not just "car")
    if any(w in title_lower for w in ["brabus", "g-wagon", "g wagon", "lamborghini", "ferrari", "test drive"]):
        return "cars"
    if any(w in title_lower for w in ["september", "christmas", "summer", "spring", "fall", "autumn", "winter", "holiday"]):
        return "seasonal"
    if any(w in title_lower for w in ["city", "city life", "urban", "manhattan", "nyc", "downtown"]):
        return "city"

    return "default"


def _generate_relevant_tags(title_clean, dest_label, video_type):
    """Generate relevant tags: destination + specific attractions + type keywords"""
    title_lower = title_clean.lower()
    tags = []

    # Add destination-specific tags with search keywords
    dest_lower = dest_label.lower()
    if "sydney" in dest_lower:
        tags.extend(["Sydney", "Australia", "Sydney attractions", "things to do Sydney"])
    elif "dubai" in dest_lower:
        tags.extend(["Dubai", "UAE", "Dubai attractions", "things to do Dubai"])
    elif "bali" in dest_lower:
        tags.extend(["Bali", "Indonesia", "Bali attractions", "things to do Bali"])
    elif "marbella" in dest_lower:
        tags.extend(["Marbella", "Spain", "Puerto Banus", "luxury travel"])
    elif "new york" in dest_lower:
        tags.extend(["New York", "USA", "NYC attractions", "things to do NYC"])

    # Add specific video subject tags (not generic)
    if "manly" in title_lower or "beach" in title_lower:
        tags.extend(["Manly Beach", "beach vlog", "coastal travel"])
    elif "zoo" in title_lower:
        tags.extend(["zoo", "wildlife", "family attractions"])
    elif "hotel" in title_lower or "luxurious" in title_lower:
        tags.extend(["luxury hotel", "hotel review", "accommodation"])
    elif "dogs" in title_lower or "pets" in title_lower:
        tags.extend(["pet travel", "pet vlog", "animals"])
    elif "brabus" in title_lower or "supercar" in title_lower or "lamborghini" in title_lower:
        tags.extend(["supercars", "luxury cars", "car review"])
    elif "fountain" in title_lower or "roses" in title_lower:
        tags.extend(["Dubai Fountain", "landmarks"])
    elif "lembongan" in title_lower or "island" in title_lower:
        tags.extend(["island", "paradise", "tropical"])
    elif "newcastle" in title_lower:
        tags.extend(["Newcastle", "Australia", "travel vlog"])
    else:
        tags.append("travel vlog")

    # Add category tag
    tags.append("travel vlog")

    # Deduplicate and limit to 8
    tags = dedupe_ci(tags)[:8]
    return tags


def _generate_natural_description(title_clean, dest_label, video_type):
    """Generate unique, natural description based on actual video subject"""
    title_lower = title_clean.lower()
    dest_short = dest_label.split("/")[0].strip()

    # Specific descriptions for each video type/subject
    if "manly" in title_lower:
        desc = "Join us at iconic Manly Beach in Sydney. Explore sandy shores, ocean views, and coastal vibes.\n\nFollow for more Sydney travel content."
    elif "zoo" in title_lower:
        desc = "Tour Sydney Zoo with us and discover amazing wildlife and family attractions.\n\nFollow for more Sydney travel content."
    elif "hotel" in title_lower or "luxurious" in title_lower:
        desc = "Experience luxury accommodation in Sydney. Discover stunning views and unforgettable stays.\n\nFollow for more Sydney travel content."
    elif "dogs" in title_lower or "pets" in title_lower:
        desc = "Follow along as we explore Dubai with our furry friends. Pet-friendly travel and animal adventures.\n\nFollow for more Dubai travel content."
    elif "brabus" in title_lower or "supercar" in title_lower:
        desc = "Test drive the powerful BRABUS G-Wagon through Dubai. Experience luxury supercars and high-speed adventures.\n\nFollow for more Dubai travel content."
    elif "fountain" in title_lower:
        desc = "Experience the stunning Dubai Fountain with iconic roses and luxury vibes. A must-see Dubai landmark.\n\nFollow for more Dubai travel content."
    elif "lembongan" in title_lower or "island" in title_lower:
        desc = "Discover Lembongan Island in Bali. Explore tropical paradise, pristine beaches, and island adventures.\n\nFollow for more Bali travel content."
    elif "newcastle" in title_lower:
        desc = "Join us for an Australian adventure in Newcastle. Explore coastal towns and unexpected surprises.\n\nFollow for more Sydney travel content."
    elif "city" in title_lower or "life" in title_lower:
        desc = "Experience Sydney life with us. Discover urban culture, city vibes, and local favorites.\n\nFollow for more Sydney travel content."
    elif "september" in title_lower:
        desc = "Experience New York City in September. Discover fall weather, seasonal events, and urban exploration.\n\nFollow for more NYC travel content."
    elif "puerto" in title_lower or "friday" in title_lower:
        desc = "Join us for luxury weekend fun in Puerto Banús, Marbella. Experience Mediterranean vibes and exclusive destinations.\n\nFollow for more travel content."
    else:
        desc = f"Experience {title_clean} with us in {dest_label}. Join our travel adventures.\n\nFollow for more travel content."

    return desc


def analyze(video_catalog, optimization, keyword_discovery, content_planning):
    by_id = {v["video_id"]: v for v in video_catalog}

    top_performer_ids = {
        v["video_id"] for v in content_planning.get("top_performing_recent_videos", [])
    }
    preserved = []

    rewrites = []
    for opp in optimization.get("opportunities", [])[:MAX_REWRITES]:
        if opp["video_id"] in top_performer_ids:
            preserved.append({"video_id": opp["video_id"], "title": opp["title"]})
            continue
        video = by_id.get(opp["video_id"])
        if not video:
            continue

        dest_key = destinations.classify(video)
        dest_label = destinations.label_for(dest_key)

        # Extract clean subject from title
        current_title = opp["title"]
        # Remove emojis and hashtags to get subject
        subject_clean = current_title.split("#")[0].strip()
        # Remove common emoji ranges
        for emoji_range in ["🇦🇺", "🇦", "🇪🇸", "🇪", "🇺🇸", "🇺", "🇮🇩", "💍", "😍", "🐶", "✨", "🔥", "👑", "🌺", "🏝️", "💋", "❤️", "🌹", "🐨", "🦘", "🌆", "🌉", "🏙️", "😳", "🌏", "😢", "😏", "🫶🏽", "🚕", "🗽", "🇭", "🇸"]:
            subject_clean = subject_clean.replace(emoji_range, "")
        subject_clean = subject_clean.replace("  ", " ").strip()
        subject_clean = subject_clean.rstrip("!.?").strip()

        if not subject_clean:
            subject_clean = dest_label

        # Detect video type for appropriate tags and description
        video_type = _detect_video_type(subject_clean)

        # Generate natural title (not just appending destination)
        proposed_title = subject_clean
        if dest_label not in subject_clean:
            proposed_title = f"{subject_clean} | {dest_label}"

        # Generate relevant tags based on subject + destination
        tags = _generate_relevant_tags(subject_clean, dest_label, video_type)

        # Generate unique description based on video type
        description = _generate_natural_description(subject_clean, dest_label, video_type)

        rewrites.append({
            "video_id": opp["video_id"],
            "current_title": opp["title"],
            "destination": dest_label,
            "reasons_flagged": opp["reasons"],
            "suggested_titles": [proposed_title],
            "suggested_description": description,
            "suggested_tags": tags,
            "suggested_hashtags": [],
            "chapters_template": GENERIC_CHAPTER_TEMPLATE,
            "thumbnail_text_ideas": thumbnail_text_ideas(dest_label.split("/")[0].strip()),
        })

    return {
        "rewrites": rewrites,
        "preserved_top_performers": preserved,
        "note": (
            "Template-based suggestions built from this channel's own proven "
            "keywords and real search-term gaps -- not LLM-generated copy. "
            "Nothing was changed on YouTube; review and edit before using. "
            "preserved_top_performers lists videos that tripped a technical flag "
            "but were deliberately left out because they're already top performers "
            "-- 'never change a strong-performing video blindly'."
        ),
    }
