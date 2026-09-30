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
