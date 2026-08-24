"""
GitHub CLI for Resume Skill Gap Analyzer.
Performs GitHub portfolio profiling, calculates the transparent GitHub Skill Score,
and manages persistence in SQLite.
"""

import sys
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database.db import get_db_connection
from backend.services.github_service import github_service

def analyze_github_action(payload):
    username_or_url = payload.get("username") or payload.get("profile_url") or payload.get("url") or ""
    user_id = payload.get("user_id")

    if not username_or_url.strip():
        return {
            "success": False,
            "error": {
                "code": "MISSING_USERNAME",
                "message": "Please provide a GitHub username or profile URL."
            }
        }

    # 1. Run GitHub API Analysis
    analysis_res = github_service.analyze_profile(username_or_url)
    if not analysis_res.get("success", False):
        return analysis_res

    data = analysis_res["data"]

    # 2. Save in SQLite Database
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO github_profiles (
            user_id, username, profile_url, avatar_url, name, bio, company,
            location, blog, twitter_username, public_repos, public_gists,
            followers, following, total_stars, total_forks, primary_language,
            languages, top_repositories, activity_summary, score_breakdown,
            skill_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        data["username"],
        data["profile_url"],
        data["avatar_url"],
        data["name"],
        data["bio"],
        data["company"],
        data["location"],
        data["blog"],
        data["twitter_username"],
        data["public_repos"],
        data["public_gists"],
        data["followers"],
        data["following"],
        data["activity_summary"]["total_stars"],
        data["activity_summary"]["total_forks"],
        data["primary_language"],
        json.dumps(data["languages"]),
        json.dumps(data["top_projects"]),
        json.dumps(data["activity_summary"]),
        json.dumps(data["score_breakdown"]),
        data["skill_score"]
    ))

    profile_id = cursor.lastrowid
    conn.commit()
    conn.close()

    data["id"] = profile_id

    return {
        "success": True,
        "message": f"GitHub profile '@{data['username']}' successfully analyzed. GitHub Skill Score: {data['skill_score']}/100",
        "data": data
    }

def get_github_by_id_action(payload):
    profile_id = payload.get("id") or payload.get("profile_id")
    if not profile_id:
        return {"success": False, "error": {"code": "MISSING_ID", "message": "GitHub profile ID is required."}}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM github_profiles WHERE id = ?", (profile_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"success": False, "error": {"code": "PROFILE_NOT_FOUND", "message": f"GitHub analysis #{profile_id} not found."}}

    return {
        "success": True,
        "message": f"GitHub profile analysis #{profile_id} retrieved.",
        "data": {
            "id": row["id"],
            "user_id": row["user_id"],
            "username": row["username"],
            "profile_url": row["profile_url"],
            "avatar_url": row["avatar_url"],
            "name": row["name"],
            "bio": row["bio"],
            "company": row["company"],
            "location": row["location"],
            "blog": row["blog"],
            "twitter_username": row["twitter_username"],
            "public_repos": row["public_repos"],
            "public_gists": row["public_gists"],
            "followers": row["followers"],
            "following": row["following"],
            "total_stars": row["total_stars"],
            "total_forks": row["total_forks"],
            "primary_language": row["primary_language"],
            "languages": json.loads(row["languages"]) if row["languages"] else [],
            "top_projects": json.loads(row["top_repositories"]) if row["top_repositories"] else [],
            "activity_summary": json.loads(row["activity_summary"]) if row["activity_summary"] else {},
            "score_breakdown": json.loads(row["score_breakdown"]) if row["score_breakdown"] else {},
            "skill_score": row["skill_score"],
            "skill_score_label": f"GitHub Skill Score: {row['skill_score']}/100",
            "created_at": row["created_at"]
        }
    }

def get_github_by_username_action(payload):
    username = payload.get("username", "").strip()
    if not username:
        return {"success": False, "error": {"code": "MISSING_USERNAME", "message": "Username is required."}}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM github_profiles WHERE LOWER(username) = LOWER(?) ORDER BY id DESC LIMIT 1", (username,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"success": False, "error": {"code": "PROFILE_NOT_FOUND", "message": f"No analysis found for '@{username}'."}}

    return {
        "success": True,
        "message": f"Latest analysis for '@{username}' retrieved.",
        "data": {
            "id": row["id"],
            "user_id": row["user_id"],
            "username": row["username"],
            "profile_url": row["profile_url"],
            "avatar_url": row["avatar_url"],
            "name": row["name"],
            "bio": row["bio"],
            "company": row["company"],
            "location": row["location"],
            "blog": row["blog"],
            "public_repos": row["public_repos"],
            "followers": row["followers"],
            "following": row["following"],
            "total_stars": row["total_stars"],
            "total_forks": row["total_forks"],
            "primary_language": row["primary_language"],
            "languages": json.loads(row["languages"]) if row["languages"] else [],
            "top_projects": json.loads(row["top_repositories"]) if row["top_repositories"] else [],
            "activity_summary": json.loads(row["activity_summary"]) if row["activity_summary"] else {},
            "score_breakdown": json.loads(row["score_breakdown"]) if row["score_breakdown"] else {},
            "skill_score": row["skill_score"],
            "skill_score_label": f"GitHub Skill Score: {row['skill_score']}/100",
            "created_at": row["created_at"]
        }
    }

def list_github_profiles_action(payload):
    limit = payload.get("limit", 20)
    user_id = payload.get("user_id")

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("""
            SELECT id, user_id, username, name, avatar_url, profile_url,
                   public_repos, total_stars, total_forks, primary_language,
                   skill_score, created_at
            FROM github_profiles
            WHERE user_id = ?
            ORDER BY id DESC LIMIT ?
        """, (user_id, limit))
    else:
        cursor.execute("""
            SELECT id, user_id, username, name, avatar_url, profile_url,
                   public_repos, total_stars, total_forks, primary_language,
                   skill_score, created_at
            FROM github_profiles
            ORDER BY id DESC LIMIT ?
        """, (limit,))

    rows = cursor.fetchall()
    conn.close()

    profiles = []
    for r in rows:
        profiles.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "username": r["username"],
            "name": r["name"],
            "avatar_url": r["avatar_url"],
            "profile_url": r["profile_url"],
            "public_repos": r["public_repos"],
            "total_stars": r["total_stars"],
            "total_forks": r["total_forks"],
            "primary_language": r["primary_language"],
            "skill_score": r["skill_score"],
            "skill_score_label": f"GitHub Skill Score: {r['skill_score']}/100",
            "created_at": r["created_at"]
        })

    return {
        "success": True,
        "message": f"Retrieved {len(profiles)} GitHub profiles from SQLite.",
        "data": {
            "profiles": profiles,
            "total": len(profiles)
        }
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": {"code": "MISSING_ACTION", "message": "No CLI action provided."}}))
        sys.exit(1)

    action = sys.argv[1]
    raw_payload = sys.argv[2] if len(sys.argv) > 2 else "{}"

    try:
        payload = json.loads(raw_payload)
    except Exception as e:
        print(json.dumps({"success": False, "error": {"code": "INVALID_JSON", "message": str(e)}}))
        sys.exit(1)

    if action == "analyze_github":
        res = analyze_github_action(payload)
    elif action == "get_github_by_id":
        res = get_github_by_id_action(payload)
    elif action == "get_github_by_username":
        res = get_github_by_username_action(payload)
    elif action == "list_github_profiles":
        res = list_github_profiles_action(payload)
    else:
        res = {"success": False, "error": {"code": "UNKNOWN_ACTION", "message": f"Action '{action}' is unrecognized."}}

    print(json.dumps(res))
    if not res.get("success", True):
        sys.exit(1)

if __name__ == "__main__":
    main()
