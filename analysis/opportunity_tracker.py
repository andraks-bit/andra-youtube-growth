"""
Opportunity Tracking Database

Maintains a complete history of discovered opportunities to avoid repeating work.
Tracks: discovered date, source, status (discovered/contacted/executed/rejected), outcome.
"""

import json
import os
import datetime


def get_tracker_path():
    """Get path to opportunity tracking database."""
    data_dir = os.path.join("data", "opportunities")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "opportunities_log.json")


def load_opportunities():
    """Load all tracked opportunities."""
    path = get_tracker_path()
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"opportunities": []}


def save_opportunities(data):
    """Save opportunity database."""
    path = get_tracker_path()
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def add_opportunity(source_type, description, video_id, action_needed, contact_info=None, estimated_reach=None):
    """
    Add a newly discovered opportunity to tracking database.

    Args:
        source_type: "pinterest", "directory", "blog", "community", "collaboration", "backlink", etc.
        description: Clear description of the opportunity
        video_id: Most relevant video (or None for channel-level)
        action_needed: What needs to be done (submit, contact, publish, etc.)
        contact_info: Email/URL/contact details if applicable
        estimated_reach: Estimated monthly viewers/potential

    Returns: opportunity ID
    """
    db = load_opportunities()

    opp_id = f"{source_type}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"

    opportunity = {
        "id": opp_id,
        "source_type": source_type,
        "description": description,
        "video_id": video_id,
        "action_needed": action_needed,
        "contact_info": contact_info,
        "estimated_reach": estimated_reach,
        "discovered_date": datetime.date.today().isoformat(),
        "status": "discovered",
        "executed_date": None,
        "outcome": None,
        "notes": ""
    }

    db["opportunities"].append(opportunity)
    save_opportunities(db)
    return opp_id


def mark_executed(opp_id, outcome, notes=""):
    """Mark an opportunity as executed/contacted."""
    db = load_opportunities()
    for opp in db["opportunities"]:
        if opp["id"] == opp_id:
            opp["status"] = "executed"
            opp["executed_date"] = datetime.date.today().isoformat()
            opp["outcome"] = outcome
            opp["notes"] = notes
            break
    save_opportunities(db)


def mark_rejected(opp_id, reason=""):
    """Mark an opportunity as rejected (not worth pursuing)."""
    db = load_opportunities()
    for opp in db["opportunities"]:
        if opp["id"] == opp_id:
            opp["status"] = "rejected"
            opp["notes"] = reason
            break
    save_opportunities(db)


def get_already_discovered(source_type, description_keywords):
    """
    Check if an opportunity similar to this has already been discovered.
    Returns True if found, to avoid duplicate discoveries.
    """
    db = load_opportunities()
    keywords_set = set(description_keywords.lower().split())

    for opp in db["opportunities"]:
        if opp["source_type"] == source_type and opp["status"] != "rejected":
            existing_keywords = set(opp["description"].lower().split())
            if keywords_set & existing_keywords:  # Overlap detected
                return True

    return False


def get_pending_opportunities(source_type=None):
    """Get opportunities that haven't been executed yet."""
    db = load_opportunities()
    pending = [o for o in db["opportunities"] if o["status"] == "discovered"]

    if source_type:
        pending = [o for o in pending if o["source_type"] == source_type]

    return pending[:10]


def analyze(all_analyses_results):
    """
    Generate summary of opportunity tracking status.
    """
    db = load_opportunities()

    discovered_count = len([o for o in db["opportunities"] if o["status"] == "discovered"])
    executed_count = len([o for o in db["opportunities"] if o["status"] == "executed"])
    rejected_count = len([o for o in db["opportunities"] if o["status"] == "rejected"])

    pending = get_pending_opportunities()

    return {
        "total_opportunities": len(db["opportunities"]),
        "discovered_today": len([o for o in db["opportunities"] if o["discovered_date"] == datetime.date.today().isoformat()]),
        "pending_opportunities": pending,
        "discovered_count": discovered_count,
        "executed_count": executed_count,
        "rejected_count": rejected_count,
        "note": "Tracks all growth opportunities to avoid repeating work and measure effectiveness."
    }
