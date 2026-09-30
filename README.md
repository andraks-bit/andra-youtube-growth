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

## What this does NOT do (approval-only, by design)

This system **never calls a YouTube write endpoint**. There is no code path
anywhere in this repo that can change a title, description, tag, thumbnail,
visibility, publish date, or upload/delete a video. `youtube_api.py` only
exposes `.list` / `reports.query` style read calls. Recommendations
(keyword gaps, optimization opportunities, new-video SEO package template)
are written to the report for you to review and apply manually. That stays
true until you explicitly ask to build an approval workflow on top of this
(Step 3+).

## Known operational limitation: 7-day refresh token expiry

The Google Cloud OAuth consent screen for this project (`blogger-503016`)
is in **Testing** publish status, which caps refresh-token lifetime at 7
days regardless of scope (confirmed empirically in Step 1 -- every token
issued reports `refresh_token_expires_in: 604799`). That means:

- The `YT_REFRESH_TOKEN` GitHub secret **will stop working about a week
  after it's set**, and the scheduled workflow will fail loudly (non-zero
  exit, visible in the Actions tab) rather than silently produce stale data.
- Fix options, in order of effort: (a) manually re-run the OAuth flow and
  update the GitHub secret weekly, or (b) move the OAuth consent screen to
  "In production" in Google Cloud Console, which removes the 7-day cap.
  Option (b) is a Cloud Console change only you can make -- see "Manual
  setup" below.

## Manual setup required before this runs unattended on GitHub

None of this has been done yet -- run_daily.py has only been run locally
against real data so far (see Step 2 test results).

1. **Choose/create a GitHub repo.** This machine has working SSH push
   access to GitHub as `andraks-bit` (confirmed), separate from the
   `devglobalxxx` account used for `boat-rental-platform`. Recommend a new
   repo (e.g. `andra-youtube-growth`) rather than folding this into an
   unrelated repo -- tell me the name and whether it should be private, and
   I'll push this directory as its initial commit.
2. **Add three repo secrets** (Settings -> Secrets and variables -> Actions):
   - `YT_CLIENT_ID` -- from `blogger-automation/credentials/client_secret.json`
   - `YT_CLIENT_SECRET` -- same file
   - `YT_REFRESH_TOKEN` -- from `blogger-automation/credentials/token_marbella_analytics.json`
   I can print the exact values for you to paste in, but I won't transmit
   them anywhere myself -- entering secrets into GitHub's UI is something
   you do directly.
3. **Consider moving the OAuth consent screen to Production** (see above)
   if you want this to run for more than ~7 days without manual
   re-authorization.
4. **Enable the workflow** -- once secrets are set and the repo is pushed,
   the `schedule` trigger in `.github/workflows/youtube-growth.yml` takes
   over automatically. `workflow_dispatch` is also enabled so you (or I, if
   you ask) can trigger a manual run from the Actions tab to test it first.

## Local usage

```bash
cd youtube-growth-system
pip install -r requirements.txt
python3 run_daily.py
```

Reads credentials from `../blogger-automation/credentials/` automatically
when `YT_CLIENT_ID`/`YT_CLIENT_SECRET`/`YT_REFRESH_TOKEN` aren't set in the
environment.
