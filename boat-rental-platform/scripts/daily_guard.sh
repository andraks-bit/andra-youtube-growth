#!/bin/sh
# Catch-up guard for the BoatHire24 daily pipeline.
# Runs the full chain ONCE per day, whenever the Mac is awake. Safe to fire
# often (hourly + on wake): it no-ops if today's run already happened or if a
# run is currently in progress.

ROOT="/Users/master/boat-rental-platform"
PY="/usr/bin/python3"
MARKER="$ROOT/logs/last_run_date.txt"
LOG="$ROOT/logs/daily_guard.log"
TODAY="$(date +%Y-%m-%d)"

mkdir -p "$ROOT/logs"

# Already ran today? -> nothing to do.
if [ -f "$MARKER" ] && [ "$(cat "$MARKER")" = "$TODAY" ]; then
    exit 0
fi

# A pipeline already running (manual or prior guard)? -> let it finish.
if pgrep -f "generate_content.py" >/dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] skip: pipeline already running" >> "$LOG"
    exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] starting daily run for $TODAY" >> "$LOG"

# Run the full chain. Only stamp the marker if generation succeeds, so a failed
# day retries on the next wake instead of being marked done.
if "$PY" "$ROOT/scripts/generate_content.py" >> "$LOG" 2>&1; then
    echo "$TODAY" > "$MARKER"
    # Newsroom: at most one sourced or first-party-data story per day. Exits 0
    # having published nothing when no story clears the verification gates —
    # a skipped day is the designed outcome, never a reason to fail the run.
    "$PY" "$ROOT/scripts/generate_news.py" >> "$LOG" 2>&1
    # SEO maintenance: quarantine thin, canonical-consolidate dupes, rebuild
    # distributed cross-links + affiliate links across all pages, then push.
    "$PY" "$ROOT/scripts/audit_fix.py" >> "$LOG" 2>&1
    cd "$ROOT" && git add -A >> "$LOG" 2>&1 && \
        git commit -m "Daily SEO maintenance ($TODAY): relink + canonical + affiliate" >> "$LOG" 2>&1 && \
        git push origin HEAD >> "$LOG" 2>&1
    "$PY" "$ROOT/scripts/translate_es.py" --limit 40 >> "$LOG" 2>&1
    "$PY" "$ROOT/scripts/post_blogger.py" --limit 40 >> "$LOG" 2>&1
    # Enrich every Blogger post/page with distributed boat images (API update
    # works even though inserts may be 403-blocked).
    "$PY" "$ROOT/scripts/blogger_enrich_images.py" >> "$LOG" 2>&1
    "$PY" "$ROOT/scripts/wp_publish.py" --limit 40 >> "$LOG" 2>&1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] done $TODAY" >> "$LOG"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] generation failed; will retry next wake" >> "$LOG"
fi
