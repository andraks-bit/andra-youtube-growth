"""Shared configuration for the Andra Kiirkivi YouTube Growth System."""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
REPORTS_DIR = os.path.join(BASE_DIR, "reports", "generated")
RUN_LOG_FILE = os.path.join(LOGS_DIR, "run_log.jsonl")

CHANNEL_ID = "UCNFCKmMFaHUDuKIGub7exhA"
CHANNEL_HANDLE = "@andrakiirkivi"
CHANNEL_TITLE = "Andra Kiirkivi"

# Existing blogger-automation credentials this system reuses for local/dev runs
# (same Google Cloud OAuth client, same Analytics-scoped grant verified in Step 1).
# In GitHub Actions, these are NOT read from disk -- auth.py reads
# YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN from the environment instead.
LEGACY_CREDENTIALS_DIR = os.path.join(
    os.path.dirname(BASE_DIR), "blogger-automation", "credentials"
)
LEGACY_CLIENT_SECRET_FILE = os.path.join(LEGACY_CREDENTIALS_DIR, "client_secret.json")
LEGACY_TOKEN_FILE = os.path.join(LEGACY_CREDENTIALS_DIR, "token_marbella_analytics.json")

# Shorts heuristic: the Data API exposes no explicit "is this a Short" flag.
# YouTube's current Shorts eligibility window is <= 180s, so we use that as an
# approximation and label it as such everywhere it's used.
SHORTS_MAX_DURATION_SECONDS = 180

# How many days of Analytics history to pull per run for trend metrics.
ANALYTICS_WINDOW_DAYS = 90

# Minimum views before we trust a video's retention curve (below this the API
# tends to return zero rows -- confirmed empirically during Step 2 testing).
RETENTION_MIN_VIEWS = 50

# --- Step 4: destination registry ---
# Keyword-match based, not ML -- a video is classified into a destination if
# any of its match_terms appear in the title/tags/description. Extensible:
# add a new entry any time a new destination is filmed. Entries with zero
# videos today (e.g. explicitly-requested future destinations) still get
# SEO packages generated for them -- see analysis/seo_package_generator.py.
DESTINATIONS = {
    "tokyo_japan": {"label": "Tokyo / Japan", "match_terms": ["tokyo", "japan", "japanese", "kyoto", "osaka"]},
    "milan": {"label": "Milan", "match_terms": ["milan", "milano"]},
    "dubai": {"label": "Dubai", "match_terms": ["dubai", "uae", "abu dhabi"]},
    "punta_cana": {"label": "Punta Cana", "match_terms": ["punta cana", "dominican"]},
    "bali": {"label": "Bali", "match_terms": ["bali", "lembongan", "nusa"]},
    "sydney": {"label": "Sydney / Australia", "match_terms": ["sydney", "australia", "manly", "newcastle"]},
    "marbella": {"label": "Marbella / Puerto Banus", "match_terms": ["marbella", "puerto banus", "puerto banús"]},
    "new_york": {"label": "New York City", "match_terms": ["new york", "nyc", "manhattan"]},
    "colombo": {"label": "Colombo / Sri Lanka", "match_terms": ["colombo", "sri lanka"]},
}
UNCLASSIFIED_DESTINATION = "unclassified"
UNCLASSIFIED_LABEL = "Other / Unclassified"

# Template-based keyword expansion modifiers used for discovery -- not real
# search-volume data (no keyword-research API is authorized for this
# project), just common high-intent travel-vlog query patterns checked
# against what's already covered in the channel's own titles/tags/descriptions.
KEYWORD_INTENT_TEMPLATES = [
    "{dest} vlog",
    "{dest} travel guide",
    "{dest} itinerary",
    "things to do in {dest}",
    "{dest} food",
    "{dest} on a budget",
    "is {dest} worth visiting",
    "{dest} tips",
    "best time to visit {dest}",
    "{dest} day trip",
]

# How far back to look for a comparison snapshot when computing momentum
# (gaining/losing views). Prefers the oldest available snapshot within this
# window to maximize signal; falls back gracefully if less history exists.
MOMENTUM_LOOKBACK_DAYS = 14

# Cohort size for top-vs-bottom retention pattern comparison.
RETENTION_PATTERN_COHORT_SIZE = 5
