"""
TikTok Analytics & Learning

Tracks:
1. TikTok video performance (views, engagement, funnel to YouTube)
2. Audience insights (followers, profile visits, traffic sources)
3. Content performance patterns (which types/destinations work best)
4. Learning system (optimize future posting based on data)
"""

import json
import os
import datetime
from . import tiktok_api_client


def track_posted_video(video_id, youtube_video_id, destination, caption, hashtags):
    """
    Record a TikTok video post in tracking database.
    """

    tracking_file = os.path.join("data", "tiktok_posts.json")
    os.makedirs("data", exist_ok=True)

    # Load existing posts
    if os.path.exists(tracking_file):
        with open(tracking_file) as f:
            posts = json.load(f)
    else:
        posts = []

    # Add new post
    post = {
        "tiktok_video_id": video_id,
        "youtube_source_id": youtube_video_id,
        "destination": destination,
        "posted_at": datetime.datetime.now().isoformat(),
        "caption": caption[:100],
        "hashtags": hashtags,
        "performance": {
            "views": 0,
            "likes": 0,
            "comments": 0,
            "shares": 0,
            "youtube_traffic": 0,
            "youtube_subscribers_gained": 0
        },
        "status": "tracking"
    }

    posts.append(post)

    with open(tracking_file, "w") as f:
        json.dump(posts, f, indent=2)

    return post


def update_video_performance(tiktok_video_id, analytics_data):
    """
    Update a video's performance metrics from TikTok API.
    """

    tracking_file = os.path.join("data", "tiktok_posts.json")

    if not os.path.exists(tracking_file):
        return {"status": "no_posts_tracked"}

    with open(tracking_file) as f:
        posts = json.load(f)

    for post in posts:
        if post["tiktok_video_id"] == tiktok_video_id:
            post["performance"]["views"] = analytics_data.get("views", 0)
            post["performance"]["likes"] = analytics_data.get("likes", 0)
            post["performance"]["comments"] = analytics_data.get("comments", 0)
            post["performance"]["shares"] = analytics_data.get("shares", 0)
            post["last_updated"] = datetime.datetime.now().isoformat()
            break

    with open(tracking_file, "w") as f:
        json.dump(posts, f, indent=2)


def analyze_performance():
    """
    Analyze TikTok performance patterns and generate insights.
    """

    tracking_file = os.path.join("data", "tiktok_posts.json")

    if not os.path.exists(tracking_file):
        return {
            "status": "no_data",
            "message": "No TikTok posts tracked yet",
            "total_posts": 0
        }

    with open(tracking_file) as f:
        posts = json.load(f)

    if not posts:
        return {
            "status": "no_posts",
            "total_posts": 0,
            "message": "Waiting for TikTok posts to track performance"
        }

    # Calculate aggregate metrics
    total_views = sum(p["performance"]["views"] for p in posts)
    total_likes = sum(p["performance"]["likes"] for p in posts)
    total_comments = sum(p["performance"]["comments"] for p in posts)
    total_shares = sum(p["performance"]["shares"] for p in posts)

    engagement_rate = (total_likes + total_comments + total_shares) / max(total_views, 1) * 100 if total_views > 0 else 0

    # Analyze by destination
    destination_performance = {}
    for post in posts:
        dest = post.get("destination", "Unknown")
        if dest not in destination_performance:
            destination_performance[dest] = {
                "posts": 0,
                "total_views": 0,
                "avg_engagement": 0
            }

        destination_performance[dest]["posts"] += 1
        destination_performance[dest]["total_views"] += post["performance"]["views"]

    # Rank by performance
    top_destinations = sorted(
        destination_performance.items(),
        key=lambda x: x[1]["total_views"],
        reverse=True
    )

    # Engagement insights
    high_performers = [p for p in posts if p["performance"]["views"] > total_views / len(posts) if posts]

    return {
        "total_posts": len(posts),
        "aggregate_performance": {
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "avg_engagement_rate": round(engagement_rate, 2)
        },
        "performance_by_destination": dict(top_destinations[:5]),
        "high_performers": len(high_performers),
        "average_views_per_post": round(total_views / len(posts), 0) if posts else 0,
        "insights": [
            f"Best destination: {top_destinations[0][0]} ({top_destinations[0][1]['total_views']} views)" if top_destinations else "No data yet",
            f"Engagement rate: {engagement_rate:.1f}% (likes + comments + shares / views)",
            f"High performers (above average): {len(high_performers)} videos",
        ]
    }


def generate_optimization_recommendations(tiktok_performance, youtube_funnel_data=None):
    """
    Learn from TikTok performance and recommend optimizations for next content.
    """

    if tiktok_performance.get("total_posts", 0) == 0:
        return {"status": "insufficient_data", "message": "Need at least 5 posts to generate recommendations"}

    recommendations = []

    # Recommendation 1: Focus on top-performing destinations
    perf_by_dest = tiktok_performance.get("performance_by_destination", {})
    if perf_by_dest:
        top_dest = list(perf_by_dest.keys())[0]
        recommendations.append({
            "type": "content_focus",
            "recommendation": f"Create more content from {top_dest}",
            "reason": f"{top_dest} TikToks perform {perf_by_dest[top_dest]['total_views']} views avg",
            "action": "Identify more {top_dest} YouTube videos for TikTok repurposing"
        })

    # Recommendation 2: Engagement optimization
    avg_engagement = tiktok_performance.get("aggregate_performance", {}).get("avg_engagement_rate", 0)
    if avg_engagement > 0:
        recommendations.append({
            "type": "hook_optimization",
            "recommendation": "Improve hooks in captions",
            "reason": f"Current engagement: {avg_engagement:.1f}%. Industry avg: 4-6%",
            "action": "Test new hook patterns in next batch of captions"
        })

    # Recommendation 3: Posting frequency
    total_posts = tiktok_performance.get("total_posts", 0)
    avg_views = tiktok_performance.get("average_views_per_post", 0)
    if total_posts > 0 and avg_views > 500:
        recommendations.append({
            "type": "posting_frequency",
            "recommendation": "Increase posting frequency",
            "reason": f"Average views per post: {avg_views}. Content is performing",
            "action": "Post 2x per day instead of 1x (if consistent growth continues)"
        })

    return {
        "recommendations": recommendations,
        "next_actions": [
            "1. Post next batch with optimizations",
            "2. Track performance for 7 days",
            "3. Analyze learnings",
            "4. Iterate on successful patterns"
        ]
    }


def analyze(tiktok_api_result=None):
    """
    Main: Analyze TikTok performance and generate learning.
    """

    performance = analyze_performance()
    recommendations = generate_optimization_recommendations(performance) if performance.get("total_posts", 0) > 0 else {}

    return {
        "tiktok_performance": performance,
        "optimization_recommendations": recommendations,
        "status": "tracking_active" if performance.get("total_posts", 0) > 0 else "awaiting_first_posts",
        "note": "TikTok analytics: tracks performance, learns from results, optimizes future content"
    }
