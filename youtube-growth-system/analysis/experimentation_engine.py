"""
Experimentation Engine

Run continuous A/B tests and experiments:
1. Hypothesis → Implementation → Measurement
2. Track what's working, kill what doesn't, expand what does
3. Continuously generate new growth hypotheses
"""

import json
import os
import datetime


def load_experiments():
    """Load experiment history."""
    exp_file = os.path.join("data", "experiments.json")
    if os.path.exists(exp_file):
        with open(exp_file) as f:
            return json.load(f)
    return {"experiments": [], "learnings": {}}


def save_experiments(data):
    """Save experiment history."""
    os.makedirs("data", exist_ok=True)
    with open(os.path.join("data", "experiments.json"), "w") as f:
        json.dump(data, f, indent=2)


def log_experiment(hypothesis, implementation, status="running"):
    """Log a new experiment."""
    exp = load_experiments()

    experiment = {
        "id": f"exp_{datetime.date.today().isoformat()}_{len(exp['experiments'])}",
        "date": datetime.date.today().isoformat(),
        "hypothesis": hypothesis,
        "implementation": implementation,
        "status": status,
        "baseline_metrics": None,
        "results": None,
        "conclusion": None
    }

    exp["experiments"].append(experiment)
    save_experiments(exp)
    return experiment["id"]


def measure_experiment(exp_id, baseline, results, conclusion):
    """Measure and conclude an experiment."""
    exp = load_experiments()

    for e in exp["experiments"]:
        if e["id"] == exp_id:
            e["status"] = "completed"
            e["baseline_metrics"] = baseline
            e["results"] = results
            e["conclusion"] = conclusion

            # Learn from results
            if conclusion == "success":
                if e["hypothesis"] not in exp["learnings"]:
                    exp["learnings"][e["hypothesis"]] = {"success": 0, "fail": 0}
                exp["learnings"][e["hypothesis"]]["success"] += 1
            else:
                if e["hypothesis"] not in exp["learnings"]:
                    exp["learnings"][e["hypothesis"]] = {"success": 0, "fail": 0}
                exp["learnings"][e["hypothesis"]]["fail"] += 1

            break

    save_experiments(exp)


def generate_hypotheses(subscriber_optimizer_result, discovery_optimizer_result, video_catalog):
    """
    Generate NEW hypotheses daily based on:
    - What's working (expand it)
    - What's not working (stop it)
    - What's untested (try it)
    """

    hypotheses = []
    today = datetime.date.today().isoformat()

    # Hypothesis 1: Subscriber conversion
    if subscriber_optimizer_result:
        top = subscriber_optimizer_result.get("top_converters", [])
        if top:
            top_video = top[0]
            hypotheses.append({
                "id": f"hyp_sub_conversion_{today}",
                "hypothesis": f"Applying '{top_video['title'][:40]}' patterns (high retention + CTAs) to 5 underperformers will increase subscriber conversion 30%",
                "category": "subscriber_conversion",
                "implementation": "1) Update titles/hooks of 5 underperformers, 2) Add mid-video + end CTAs, 3) Measure subs/1k views",
                "duration_days": 7,
                "expected_impact": f"From {subscriber_optimizer_result.get('channel_conversion_rate', 0)} to {subscriber_optimizer_result.get('channel_conversion_rate', 0) * 1.3:.1f} subs per 1k views"
            })

    # Hypothesis 2: Browse/Suggested optimization
    if discovery_optimizer_result:
        hypotheses.append({
            "id": f"hyp_browse_suggested_{today}",
            "hypothesis": "Strengthening top 3 destination clusters + improving hooks will increase Browse/Suggested from 30% to 50% of traffic",
            "category": "discovery_optimization",
            "implementation": "1) Create topical playlists, 2) Improve first 30s hooks, 3) Cross-link videos in same cluster",
            "duration_days": 14,
            "expected_impact": "2x total channel traffic if Browse/Suggested reaches 50%"
        })

    # Hypothesis 3: New untested opportunity (rotate weekly)
    rotation = [
        {
            "hypothesis": "Premiere/premiere + chat will increase watch time 25% (building community)",
            "implementation": "Schedule 2 premieres this week, track watch time vs VOD",
            "expected_impact": "25% longer sessions"
        },
        {
            "hypothesis": "Adding Shorts will send 200+ viewers/week to long-form channel",
            "implementation": "Extract & publish 5 Shorts from top videos, track funnel",
            "expected_impact": "200+ new viewers to main channel"
        },
        {
            "hypothesis": "Pinned comments with viewer questions will increase comment interaction 50%",
            "implementation": "Pin 3 questions per video, monitor response rate",
            "expected_impact": "50% more comments = YouTube promotes video more"
        },
    ]

    hypothesis_index = len([e for e in load_experiments().get("experiments", [])]) % len(rotation)
    hyp = rotation[hypothesis_index]

    hypotheses.append({
        "id": f"hyp_experiment_{today}",
        "hypothesis": hyp["hypothesis"],
        "category": "continuous_experiment",
        "implementation": hyp["implementation"],
        "duration_days": 7,
        "expected_impact": hyp["expected_impact"]
    })

    return hypotheses


def analyze(subscriber_optimizer_result, discovery_optimizer_result, analytics, video_catalog):
    """
    Main: Track experiments, measure results, generate new hypotheses.
    """

    exp_history = load_experiments()

    # Generate new hypotheses for this week
    hypotheses = generate_hypotheses(subscriber_optimizer_result, discovery_optimizer_result, video_catalog)

    # Find completed experiments and their learnings
    completed = [e for e in exp_history.get("experiments", []) if e["status"] == "completed"]
    successes = [e for e in completed if e["conclusion"] == "success"]
    failures = [e for e in completed if e["conclusion"] == "failure"]

    learnings = exp_history.get("learnings", {})
    proven_strategies = sorted(
        [(k, v["success"]) for k, v in learnings.items() if v["success"] > v["fail"]],
        key=lambda x: x[1],
        reverse=True
    )

    actions = []
    if proven_strategies:
        actions.append({
            "type": "expand_proven",
            "action": f"Expand {proven_strategies[0][0]} (has {proven_strategies[0][1]} successes)",
            "rationale": f"Proven strategy: {proven_strategies[0][0]}",
            "implementation": f"Apply to 20% more videos this week"
        })

    if failures:
        actions.append({
            "type": "kill_failing",
            "action": f"Stop {failures[0]['hypothesis']} (repeated failure)",
            "rationale": "Not producing measurable growth",
            "freed_capacity": "Reallocate effort to proven strategies"
        })

    return {
        "new_hypotheses_this_week": hypotheses,
        "completed_experiments": len(completed),
        "successful_experiments": len(successes),
        "proven_strategies": proven_strategies[:3],
        "recommended_actions": actions,
        "note": "Experimentation: continuous hypothesis testing + learning from results"
    }
