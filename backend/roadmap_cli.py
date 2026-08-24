"""
Roadmap CLI for Resume Skill Gap Analyzer.
Handles saving, retrieving, and listing learning roadmaps in SQLite.
"""

import sys
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database.db import get_db_connection

def save_roadmap_action(payload):
    user_id = payload.get("user_id")
    resume_id = payload.get("resume_id")
    target_job_id = payload.get("target_job_id")
    job_title = payload.get("job_title", "Software Engineer")
    experience_level = payload.get("experience_level", "Entry / Mid-Level")
    match_percentage = payload.get("match_percentage")
    matched_skills = payload.get("matched_skills", [])
    missing_skills = payload.get("missing_skills", [])
    recommended_skills = payload.get("recommended_skills", [])
    priority_skills = payload.get("priority_skills")
    duration_weeks = payload.get("duration_weeks", 4)
    weekly_plan = payload.get("weekly_plan", [])
    overview = payload.get("overview", "")
    advice = payload.get("advice", "")
    model_used = payload.get("model_used", "gemini-3.7-flash")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO learning_roadmaps (
            user_id, resume_id, target_job_id, job_title, experience_level,
            match_percentage, matched_skills, missing_skills, recommended_skills,
            priority_skills, duration_weeks, weekly_plan, overview, advice, model_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        resume_id,
        target_job_id,
        job_title,
        experience_level,
        match_percentage,
        json.dumps(matched_skills) if matched_skills is not None else None,
        json.dumps(missing_skills) if missing_skills is not None else "[]",
        json.dumps(recommended_skills) if recommended_skills is not None else None,
        json.dumps(priority_skills) if priority_skills is not None else None,
        duration_weeks,
        json.dumps(weekly_plan) if weekly_plan is not None else "[]",
        overview,
        advice,
        model_used
    ))

    roadmap_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Roadmap #{roadmap_id} for '{job_title}' successfully saved in SQLite.",
        "data": {
            "id": roadmap_id,
            "job_title": job_title,
            "duration_weeks": duration_weeks,
            "created_at": None
        }
    }

def get_roadmap_action(payload):
    roadmap_id = payload.get("id") or payload.get("roadmap_id")
    if not roadmap_id:
        return {"success": False, "error": {"code": "MISSING_ID", "message": "Roadmap ID is required."}}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM learning_roadmaps WHERE id = ?", (roadmap_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"success": False, "error": {"code": "ROADMAP_NOT_FOUND", "message": f"Roadmap #{roadmap_id} not found."}}

    return {
        "success": True,
        "message": f"Roadmap #{roadmap_id} retrieved.",
        "data": {
            "id": row["id"],
            "user_id": row["user_id"],
            "resume_id": row["resume_id"],
            "target_job_id": row["target_job_id"],
            "job_title": row["job_title"],
            "experience_level": row["experience_level"],
            "match_percentage": row["match_percentage"],
            "matched_skills": json.loads(row["matched_skills"]) if row["matched_skills"] else [],
            "missing_skills": json.loads(row["missing_skills"]) if row["missing_skills"] else [],
            "recommended_skills": json.loads(row["recommended_skills"]) if row["recommended_skills"] else [],
            "priority_skills": json.loads(row["priority_skills"]) if row["priority_skills"] else None,
            "duration_weeks": row["duration_weeks"],
            "weekly_plan": json.loads(row["weekly_plan"]) if row["weekly_plan"] else [],
            "overview": row["overview"],
            "strategic_advice": row["advice"],
            "model_used": row["model_used"],
            "created_at": row["created_at"]
        }
    }

def list_roadmaps_action(payload):
    user_id = payload.get("user_id")
    limit = payload.get("limit", 20)

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("""
            SELECT id, user_id, resume_id, target_job_id, job_title, experience_level,
                   match_percentage, duration_weeks, model_used, created_at
            FROM learning_roadmaps
            WHERE user_id = ?
            ORDER BY id DESC LIMIT ?
        """, (user_id, limit))
    else:
        cursor.execute("""
            SELECT id, user_id, resume_id, target_job_id, job_title, experience_level,
                   match_percentage, duration_weeks, model_used, created_at
            FROM learning_roadmaps
            ORDER BY id DESC LIMIT ?
        """, (limit,))

    rows = cursor.fetchall()
    conn.close()

    roadmaps = []
    for r in rows:
        roadmaps.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "resume_id": r["resume_id"],
            "target_job_id": r["target_job_id"],
            "job_title": r["job_title"],
            "experience_level": r["experience_level"],
            "match_percentage": r["match_percentage"],
            "duration_weeks": r["duration_weeks"],
            "model_used": r["model_used"],
            "created_at": r["created_at"]
        })

    return {
        "success": True,
        "message": f"Retrieved {len(roadmaps)} roadmaps.",
        "data": {
            "roadmaps": roadmaps,
            "total": len(roadmaps)
        }
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": {"code": "MISSING_ACTION", "message": "No CLI action specified."}}))
        sys.exit(1)

    action = sys.argv[1]
    raw_payload = sys.argv[2] if len(sys.argv) > 2 else "{}"

    try:
        payload = json.loads(raw_payload)
    except Exception as e:
        print(json.dumps({"success": False, "error": {"code": "INVALID_JSON", "message": str(e)}}))
        sys.exit(1)

    if action == "save_roadmap":
        res = save_roadmap_action(payload)
    elif action == "get_roadmap":
        res = get_roadmap_action(payload)
    elif action == "list_roadmaps":
        res = list_roadmaps_action(payload)
    else:
        res = {"success": False, "error": {"code": "UNKNOWN_ACTION", "message": f"Action '{action}' is unrecognized."}}

    print(json.dumps(res))
    if not res.get("success", True):
        sys.exit(1)

if __name__ == "__main__":
    main()
