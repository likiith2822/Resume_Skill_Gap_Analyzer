"""
Job Roles Management Routes for Resume Skill Gap Analyzer.
Exposes endpoints for listing and viewing target job profiles and required skills.
"""

import json
from flask import Blueprint, jsonify, request
from backend.database.db import get_db_connection
from backend.utils.helpers import success_response, error_response

jobs_bp = Blueprint("jobs", __name__)

@jobs_bp.route("", methods=["GET"])
@jobs_bp.route("/", methods=["GET"])
def get_jobs():
    """
    GET /api/jobs
    Returns all supported job roles with required and priority skills from SQLite.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, job_title, category, required_skills, priority_skills, experience_level, description, created_at
        FROM target_jobs
        ORDER BY id ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    jobs_list = []
    for r in rows:
        req_skills = json.loads(r["required_skills"]) if isinstance(r["required_skills"], str) else (r["required_skills"] or [])
        prio_skills = json.loads(r["priority_skills"]) if r["priority_skills"] and isinstance(r["priority_skills"], str) else (r["priority_skills"] or [])
        
        jobs_list.append({
            "id": r["id"],
            "job_title": r["job_title"],
            "category": r["category"],
            "description": r["description"],
            "experience_level": r["experience_level"] if "experience_level" in r.keys() else "Mid-Level",
            "required_skills": req_skills,
            "priority_skills": prio_skills,
            "total_required_skills": len(req_skills),
            "total_priority_skills": len(prio_skills),
            "created_at": r["created_at"]
        })

    payload, code = success_response(
        data={
            "jobs": jobs_list,
            "total": len(jobs_list)
        },
        message=f"Retrieved {len(jobs_list)} job roles from database.",
        status_code=200
    )
    return jsonify(payload), code

@jobs_bp.route("/<int:job_id>", methods=["GET"])
def get_job_by_id(job_id: int):
    """
    GET /api/jobs/<id>
    Returns detailed job role specification and required skills.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, job_title, category, required_skills, priority_skills, experience_level, description, created_at
        FROM target_jobs
        WHERE id = ?
    """, (job_id,))
    r = cursor.fetchone()
    conn.close()

    if not r:
        payload, code = error_response(
            message=f"Job role with ID {job_id} not found.",
            error_code="JOB_NOT_FOUND",
            status_code=404
        )
        return jsonify(payload), code

    req_skills = json.loads(r["required_skills"]) if isinstance(r["required_skills"], str) else (r["required_skills"] or [])
    prio_skills = json.loads(r["priority_skills"]) if r["priority_skills"] and isinstance(r["priority_skills"], str) else (r["priority_skills"] or [])

    job_detail = {
        "id": r["id"],
        "job_title": r["job_title"],
        "category": r["category"],
        "description": r["description"],
        "experience_level": r["experience_level"] if "experience_level" in r.keys() else "Mid-Level",
        "required_skills": req_skills,
        "priority_skills": prio_skills,
        "total_required_skills": len(req_skills),
        "total_priority_skills": len(prio_skills),
        "created_at": r["created_at"]
    }

    payload, code = success_response(
        data=job_detail,
        message=f"Job role '{r['job_title']}' retrieved successfully.",
        status_code=200
    )
    return jsonify(payload), code
