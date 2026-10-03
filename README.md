# YouTube Growth System -- Andra Kiirkivi

Automated, read-only YouTube Analytics + SEO growth system for channel
**Andra Kiirkivi** (`UCNFCKmMFaHUDuKIGub7exhA`, `@andrakiirkivi`).

Logically and physically separate from `../blogger-automation/` (the Boat
Rental Marbella Blogger/Shorts pipeline). This system reuses the same
underlying Google OAuth client and the Analytics-scoped credential grant
that was verified in Step 1, but has its own code, data, logs, and reports,
and its own GitHub Actions schedule.

## What this does (fully automated, on a schedule)

Every run (`run_daily.py`):

1. Refreshes an access token (env vars in CI, local credential file for dev).
2. Collects a channel snapshot (subs, views, video count).
3. Collects the full video catalog (title, description, tags, duration,
   lifetime stats) via YouTube Data API v3.
4. Collects YouTube Analytics data (read-only `reports.query`): daily
   channel metrics, traffic sources, top search terms, per-video 90-day
   performance, geography, device breakdown, subscribed-status split, and
   per-video retention curves (for videos with enough views to have one).
5. Runs rule-based analysis: SEO keyword gaps, per-video optimization
   opportunities, Shorts-vs-long-form comparison + repurposing candidates,
   and a content-planning signal from top performers.
6. Writes a dated Markdown report (`reports/generated/<date>.md` and
   `latest.md`) and saves raw data snapshots (`data/<date>/*.json`) -- this
   growing dataset is what lets future runs compare against real history
   instead of a single point-in-time snapshot.
7. Logs every step (`logs/run_log.jsonl`, one JSON record per run;
   `logs/last_run.md`, human-readable) -- what ran, when, what was
   collected, what was produced, timing, and any error per step.
8. In GitHub Actions: commits `data/`, `logs/`, and `reports/generated/`
   back to this repo.

## What this does NOT do without your explicit approval

Through Step 5, this system never called a YouTube write endpoint at all.
Step 6 added a narrow, gated exception: `youtube_api.py` now has
`update_video_snippet` / `create_playlist` / `add_video_to_playlist`, but
every one of them is only ever called from `approval_workflow.apply_approved()`
-- nowhere else in the codebase calls them. A change only reaches YouTube if
**both** of these are true:

1. A human approved it -- by adding the `approved` label to the proposal's
   GitHub Issue (see "Step 6: approval workflow" below).
2. The `YT_WRITES_ENABLED` repo variable is set to `true`. It's unset by
   default, so approved proposals just queue indefinitely until you
   deliberately flip this on (Settings -> Secrets and variables -> Actions ->
   Variables -> `YT_WRITES_ENABLED` = `true`).

Collection and analysis (title/description/tag suggestions, SEO packages,
content-planning ideas) remain pure recommendations in the report either way.

## Step 6: approval workflow

Every run, after generating recommendations, the system:

1. Checks every open proposal's GitHub Issue for a label change (`sync_change_approvals`).
2. Applies anything approved -- for real, if `YT_WRITES_ENABLED=true`; otherwise it
   comments once that it's queued and leaves it alone (`apply_approved_changes`).
3. Opens up to `config.MAX_NEW_PROPOSALS_PER_RUN` (default 2) new Issues for
   fresh candidates -- one video's title/description/tags bundled together,
   or one suggested playlist -- each showing the current value, proposed
   value, and why (`generate_change_proposals`).

State lives in `data/pending_changes.json` (git-committed, so it survives
across runs). Locally, all three steps skip gracefully (`GITHUB_TOKEN` isn't
set outside GitHub Actions) -- that's expected, not a failure.

**What can't be automated at all, regardless of approval:** thumbnails (this
system produces thumbnail *text ideas*, not actual image files to upload),
end-screens, cards, and comment-pinning -- none of these have a write
endpoint in the public YouTube Data API. Those recommendations stay
Studio-only manual actions forever.

## OAuth status (fixed in Step 3)

The Google Cloud OAuth consent screen for this project (`blogger-503016`)
was moved to **In production** publish status in Step 3, which removes the
7-day refresh-token expiry that Testing-status apps have. Tokens no longer
need weekly manual re-authorization.

## Repo setup (done)

Live at `github.com/andraks-bit/andra-youtube-growth` (private), with
`YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` set as repo secrets
and the `schedule` trigger active in `.github/workflows/youtube-growth.yml`.
`workflow_dispatch` is also enabled for manual test runs from the Actions tab.

## Local usage

```bash
cd youtube-growth-system
pip install -r requirements.txt
python3 run_daily.py
```

Reads credentials from `../blogger-automation/credentials/` automatically
when `YT_CLIENT_ID`/`YT_CLIENT_SECRET`/`YT_REFRESH_TOKEN` aren't set in the
environment.
