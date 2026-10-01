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

# --- Step 5: traffic & growth engine ---
# How many top-by-views videos get a per-video traffic-source breakdown
# query each run (a new API call per video -- bounded to control runtime,
# same reasoning as RETENTION_MIN_VIEWS/the 15-video retention-curve cap).
PRIORITY_VIDEO_COUNT = 15

# Long-tail phrasing added to the Step 4 template list for search SEO.
LONGTAIL_KEYWORD_TEMPLATES = [
    "how much does {dest} cost",
    "best area to stay in {dest}",
    "{dest} itinerary 5 days",
    "solo female travel {dest}",
    "{dest} honest review",
]

TRAFFIC_ACTIONS_COUNT = 5

# --- Step 6: approval workflow ---
# GitHub repo this system lives in -- used to create/query/comment on Issues
# via the GitHub REST API (the approval surface: a human applies the
# "approved" label to the proposal issue they want applied).
GITHUB_REPO = "andraks-bit/andra-youtube-growth"

PENDING_CHANGES_FILE = os.path.join(BASE_DIR, "data", "pending_changes.json")

# Bounded so a single run can't flood the Issues tab.
MAX_NEW_PROPOSALS_PER_RUN = 2

GITHUB_LABEL_PENDING = "pending-approval"
GITHUB_LABEL_APPROVED = "approved"
GITHUB_LABEL_APPLIED = "applied"
GITHUB_LABEL_FAILED = "failed"
GITHUB_LABEL_PROPOSAL = "yt-change-proposal"

# THE kill switch for actually calling a YouTube write endpoint. Read from
# the environment (a GitHub Actions secret/variable, or unset locally) --
# deliberately NOT a Python constant, so turning real writes on/off never
# requires a code change or redeploy. Defaults to OFF: approved proposals
# queue indefinitely until this is explicitly turned on.
#
# This is the single gate every write path in this codebase must pass
# through -- see approval_workflow.apply_approved().
def youtube_writes_enabled():
    return os.environ.get("YT_WRITES_ENABLED", "").strip().lower() in ("1", "true", "yes")
