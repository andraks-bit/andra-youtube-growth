"""
Step 6 approval workflow: GitHub Issues are the human approval surface.

Lifecycle per proposal:
  pending   -- issue open, labeled 'pending-approval', waiting on a human
  approved  -- human added the 'approved' label; queued to apply
  applied   -- config.youtube_writes_enabled() was True and the YouTube
               write succeeded; issue commented + closed
  failed    -- the YouTube write was attempted and errored; issue
               commented, left open with a 'failed' label for visibility
  rejected  -- the human closed the issue without approving

Every run: sync_approvals() checks open 'pending'/'approved' issues for
label/state changes, apply_approved() applies anything approved (only if
writes are enabled -- otherwise it comments once that it's queued and
leaves it alone), then create_new_proposals() opens fresh issues for new
candidates (see analysis/change_proposals.py), bounded and deduplicated
against what's already open.
"""
import json
import os

import config
import github_api


def load_state():
    if not os.path.exists(config.PENDING_CHANGES_FILE):
        return {"proposals": []}
    with open(config.PENDING_CHANGES_FILE) as f:
        return json.load(f)


def save_state(state):
    os.makedirs(os.path.dirname(config.PENDING_CHANGES_FILE), exist_ok=True)
    with open(config.PENDING_CHANGES_FILE, "w") as f:
        json.dump(state, f, indent=2)


def already_proposed_video_ids(state):
    return {
        p["video_id"] for p in state["proposals"]
        if p["type"] == "metadata_update" and p["status"] in ("pending", "approved")
    }


def already_proposed_playlist_titles(state):
    return {
        p["playlist_title"] for p in state["proposals"]
        if p["type"] == "playlist" and p["status"] in ("pending", "approved")
    }


def sync_approvals(gh):
    """Check every open (pending/approved) proposal's GitHub issue for a
    label or closed-state change. Returns (approved_count, rejected_count)."""
    state = load_state()
    approved_count = rejected_count = 0

    for p in state["proposals"]:
        if p["status"] not in ("pending", "approved"):
            continue
        issue = gh.get_issue(p["github_issue_number"])
        labels = {l["name"] for l in issue.get("labels", [])}

        if issue["state"] == "closed" and config.GITHUB_LABEL_APPROVED not in labels:
            p["status"] = "rejected"
            rejected_count += 1
            continue

        if config.GITHUB_LABEL_APPROVED in labels and p["status"] == "pending":
            p["status"] = "approved"
            approved_count += 1

    save_state(state)
    return approved_count, rejected_count


def _apply_one(youtube_client, p):
    if p["type"] == "metadata_update":
        youtube_client.update_video_snippet(
            p["video_id"], title=p["proposed_title"],
            description=p["proposed_description"], tags=p["proposed_tags"],
        )
        return f"Updated title/description/tags for video {p['video_id']}."
    elif p["type"] == "playlist":
        playlist = youtube_client.create_playlist(
            p["playlist_title"], f"Auto-created from the {p['destination']} cluster."
        )
        playlist_id = playlist["id"]
        for vid in p["video_ids"]:
            youtube_client.add_video_to_playlist(playlist_id, vid)
        return f"Created playlist '{p['playlist_title']}' ({playlist_id}) with {len(p['video_ids'])} videos."
    raise ValueError(f"unknown proposal type: {p['type']}")


def apply_approved(youtube_client, gh):
    """Applies every 'approved' proposal IF writes are enabled; otherwise
    comments once per proposal that it's queued. If config.pilot_only_
    proposal_id() is set, every approved proposal EXCEPT that one id is
    held back regardless of writes_on -- a second, independent gate for a
    controlled pilot (see Step 7). Returns (applied, failed, queued)."""
    state = load_state()
    writes_on = config.youtube_writes_enabled()
    pilot_id = config.pilot_only_proposal_id()
    applied = failed = queued = 0

    for p in state["proposals"]:
        if p["status"] != "approved":
            continue

        pilot_blocked = pilot_id is not None and p["proposal_id"] != pilot_id

        if not writes_on or pilot_blocked:
            if not p.get("commented_queued"):
                if pilot_blocked:
                    msg = (
                        "Approved and queued, but held back by the active write pilot "
                        f"(`YT_WRITES_PILOT_ONLY_PROPOSAL_ID` is restricted to a different "
                        "proposal right now) -- this will be applied once the pilot "
                        "restriction is lifted or covers this proposal."
                    )
                else:
                    msg = (
                        "Approved and queued. Real YouTube writes are currently disabled "
                        "(`YT_WRITES_ENABLED` is off) -- this will be applied automatically "
                        "once that's turned on, with no further action needed here."
                    )
                gh.comment_on_issue(p["github_issue_number"], msg)
                p["commented_queued"] = True
            queued += 1
            continue

        try:
            result_msg = _apply_one(youtube_client, p)
            p["status"] = "applied"
            gh.comment_on_issue(p["github_issue_number"], f"✅ Applied.\n\n{result_msg}")
            gh.add_labels(p["github_issue_number"], [config.GITHUB_LABEL_APPLIED])
            gh.close_issue(p["github_issue_number"])
            applied += 1
        except Exception as e:
            p["status"] = "failed"
            gh.comment_on_issue(p["github_issue_number"], f"❌ Failed to apply: {e}")
            gh.add_labels(p["github_issue_number"], [config.GITHUB_LABEL_FAILED])
            failed += 1

    save_state(state)
    return applied, failed, queued


def _format_metadata_issue_body(p):
    return (
        f"**Video:** {p['video_id']} ({p['destination']})\n\n"
        f"**Why flagged:** {p['reasoning']}\n\n"
        f"### Current title\n{p['current_title']}\n\n"
        f"### Proposed title\n{p['proposed_title']}\n\n"
        f"### Proposed description\n```\n{p['proposed_description']}\n```\n\n"
        f"### Proposed tags\n{', '.join(p['proposed_tags'])}\n\n"
        "---\n"
        f"To approve: add the `{config.GITHUB_LABEL_APPROVED}` label to this issue.\n"
        "To reject: just close this issue without approving.\n\n"
        "Nothing is changed on YouTube until this is approved AND `YT_WRITES_ENABLED` is on."
    )


def _format_playlist_issue_body(p):
    return (
        f"**Destination:** {p['destination']}\n\n"
        f"**Why:** {p['reasoning']}\n\n"
        f"### Proposed playlist\n**{p['playlist_title']}**\n\n"
        f"Videos to add ({len(p['video_ids'])}): {', '.join(p['video_ids'])}\n\n"
        "---\n"
        f"To approve: add the `{config.GITHUB_LABEL_APPROVED}` label to this issue.\n"
        "To reject: just close this issue without approving.\n\n"
        "Nothing is changed on YouTube until this is approved AND `YT_WRITES_ENABLED` is on."
    )


def create_new_proposals(gh, candidates):
    """Opens one GitHub issue per candidate, records it in state. Returns count created."""
    state = load_state()
    created = 0

    for c in candidates:
        if c["type"] == "metadata_update":
            title = f"[YT change] Update metadata: {c['current_title'][:60]}"
            body = _format_metadata_issue_body(c)
        else:
            title = f"[YT change] Create playlist: {c['playlist_title']}"
            body = _format_playlist_issue_body(c)

        issue = gh.create_issue(
            title, body, labels=[config.GITHUB_LABEL_PROPOSAL, config.GITHUB_LABEL_PENDING]
        )
        c["status"] = "pending"
        c["github_issue_number"] = issue["number"]
        c["commented_queued"] = False
        state["proposals"].append(c)
        created += 1

    save_state(state)
    return created
