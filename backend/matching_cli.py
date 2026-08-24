"""
CLI Interface for Semantic Skill Matching & Job Roles.
Invoked by Express API or directly for testing and evaluation.
"""

import sys
import json
import os
from pathlib import Path

# Add root directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database.db import get_db_connection
from backend.services.matching_service import matching_service
from backend.services.nlp_service import nlp_service
from backend.services.gap_service import gap_service

def extract_skill_names_helper(extracted):
    if not extracted:
        return []
    if isinstance(extracted, dict):
        if "all_skills" in extracted and isinstance(extracted["all_skills"], list):
            return [str(s).strip() for s in extracted["all_skills"] if str(s).strip()]
        if "extracted_skills" in extracted and isinstance(extracted["extracted_skills"], list):
            skills = []
            for item in extracted["extracted_skills"]:
                if isinstance(item, dict) and "skill" in item:
                    skills.append(str(item["skill"]).strip())
                elif isinstance(item, str):
                    skills.append(item.strip())
            return [s for s in skills if s]
        return []
    elif isinstance(extracted, list):
        skills = []
        for item in extracted:
            if isinstance(item, dict) and "skill" in item:
                skills.append(str(item["skill"]).strip())
            elif isinstance(item, str):
                skills.append(item.strip())
        return [s for s in skills if s]
    return []

def get_jobs_action(payload):
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

    return {
        "success": True,
        "message": f"Successfully retrieved {len(jobs_list)} job roles from database.",
        "data": {
            "jobs": jobs_list,
            "total": len(jobs_list)
        }
    }

def get_job_by_id_action(payload):
    job_id = payload.get("job_id") or payload.get("id")
    if not job_id:
        return {
            "success": False,
            "error": {"code": "MISSING_ID", "message": "Job ID is required."}
        }

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
        return {
            "success": False,
            "error": {"code": "JOB_NOT_FOUND", "message": f"Job role with ID {job_id} not found."}
        }

    req_skills = json.loads(r["required_skills"]) if isinstance(r["required_skills"], str) else (r["required_skills"] or [])
    prio_skills = json.loads(r["priority_skills"]) if r["priority_skills"] and isinstance(r["priority_skills"], str) else (r["priority_skills"] or [])

    return {
        "success": True,
        "message": f"Job role '{r['job_title']}' retrieved successfully.",
        "data": {
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
    }

def match_skills_action(payload):
    job_id = payload.get("job_id")
    job_title = payload.get("job_title")
    resume_id = payload.get("resume_id")
    provided_skills = payload.get("skills", [])
    raw_text = payload.get("text", "")

    conn = get_db_connection()
    cursor = conn.cursor()

    if not job_id and job_title:
        cursor.execute("SELECT id FROM target_jobs WHERE LOWER(job_title) = LOWER(?)", (job_title.strip(),))
        job_row = cursor.fetchone()
        if job_row:
            job_id = job_row["id"]

    if not job_id:
        cursor.execute("SELECT id FROM target_jobs LIMIT 1")
        default_job = cursor.fetchone()
        if default_job:
            job_id = default_job["id"]
        else:
            conn.close()
            return {
                "success": False,
                "error": {"code": "NO_JOB_FOUND", "message": "No job roles found in database."}
            }

    candidate_skills = []
    if provided_skills and isinstance(provided_skills, list) and len(provided_skills) > 0:
        candidate_skills = [str(s).strip() for s in provided_skills if str(s).strip()]
    elif resume_id:
        cursor.execute("SELECT canonical_name FROM extracted_skills WHERE resume_id = ?", (resume_id,))
        rows = cursor.fetchall()
        if rows:
            candidate_skills = [r["canonical_name"] for r in rows]
        else:
            cursor.execute("SELECT raw_text FROM resumes WHERE id = ?", (resume_id,))
            res_row = cursor.fetchone()
            if res_row and res_row["raw_text"]:
                extracted = nlp_service.extract_skills(res_row["raw_text"])
                candidate_skills = extract_skill_names_helper(extracted)
    elif raw_text.strip():
        extracted = nlp_service.extract_skills(raw_text)
        candidate_skills = extract_skill_names_helper(extracted)

    try:
        match_result = matching_service.match_resume_to_job(
            resume_skills=candidate_skills,
            job_id=job_id,
            resume_id=resume_id,
            conn=conn
        )
        conn.close()

        return {
            "success": True,
            "message": f"Semantic matching evaluated: {match_result['overall_match_percentage']}% match score for '{match_result['job']['job_title']}'.",
            "data": match_result
        }
    except Exception as e:
        conn.close()
        return {
            "success": False,
            "error": {"code": "MATCHING_FAILED", "message": str(e)}
        }

def skill_gap_action(payload):
    """Compute enriched Skill Gap analysis: Matched, Missing, Recommended, Match %, Priority Skills."""
    job_id = payload.get("job_id")
    job_title = payload.get("job_title")
    resume_id = payload.get("resume_id")
    provided_skills = payload.get("skills", [])
    raw_text = payload.get("text", "")

    conn = get_db_connection()
    cursor = conn.cursor()

    if not job_id and job_title:
        cursor.execute("SELECT id FROM target_jobs WHERE LOWER(job_title) = LOWER(?)", (job_title.strip(),))
        job_row = cursor.fetchone()
        if job_row:
            job_id = job_row["id"]

    if not job_id:
        cursor.execute("SELECT id FROM target_jobs LIMIT 1")
        default_job = cursor.fetchone()
        if default_job:
            job_id = default_job["id"]
        else:
            conn.close()
            return {
                "success": False,
                "error": {"code": "NO_JOB_FOUND", "message": "No job roles found in database."}
            }

    # Fetch job info
    cursor.execute("SELECT * FROM target_jobs WHERE id = ?", (job_id,))
    j_row = cursor.fetchone()
    if not j_row:
        conn.close()
        return {
            "success": False,
            "error": {"code": "JOB_NOT_FOUND", "message": f"Job role with ID {job_id} not found."}
        }

    job_data = {
        "id": j_row["id"],
        "job_title": j_row["job_title"],
        "category": j_row["category"],
        "description": j_row["description"],
        "experience_level": j_row["experience_level"] if "experience_level" in j_row.keys() else "Mid-Level",
        "required_skills": json.loads(j_row["required_skills"]) if isinstance(j_row["required_skills"], str) else j_row["required_skills"],
        "priority_skills": json.loads(j_row["priority_skills"]) if j_row["priority_skills"] and isinstance(j_row["priority_skills"], str) else (j_row["priority_skills"] or [])
    }

    candidate_skills = []
    if provided_skills and isinstance(provided_skills, list) and len(provided_skills) > 0:
        candidate_skills = [str(s).strip() for s in provided_skills if str(s).strip()]
    elif resume_id:
        cursor.execute("SELECT canonical_name FROM extracted_skills WHERE resume_id = ?", (resume_id,))
        rows = cursor.fetchall()
        if rows:
            candidate_skills = [r["canonical_name"] for r in rows]
        else:
            cursor.execute("SELECT raw_text FROM resumes WHERE id = ?", (resume_id,))
            res_row = cursor.fetchone()
            if res_row and res_row["raw_text"]:
                extracted = nlp_service.extract_skills(res_row["raw_text"])
                candidate_skills = extract_skill_names_helper(extracted)
    elif raw_text.strip():
        extracted = nlp_service.extract_skills(raw_text)
        candidate_skills = extract_skill_names_helper(extracted)

    try:
        matching_result = matching_service.match_resume_to_job(
            resume_skills=candidate_skills,
            job_id=job_id,
            resume_id=resume_id,
            conn=conn
        )
        conn.close()

        gap_result = gap_service.calculate_skill_gap(
            matching_data=matching_result,
            job_data=job_data,
            candidate_skills=candidate_skills
        )

        return {
            "success": True,
            "message": f"Skill gap analysis calculated for '{job_data['job_title']}': {gap_result['skill_match_percentage']}% match, {gap_result['total_missing']} missing skills.",
            "data": gap_result
        }
    except Exception as e:
        conn.close()
        return {
            "success": False,
            "error": {"code": "GAP_ANALYSIS_FAILED", "message": str(e)}
        }

def test_multi_matching_action(payload):
    """Run semantic matching benchmarks across sample resumes and job roles."""
    sample_profiles = [
        {
            "name": "Alex Chen (Full Stack Senior Dev)",
            "skills": ["JavaScript", "TypeScript", "React", "Node.js", "Express", "Tailwind CSS", "PostgreSQL", "MongoDB", "Git", "Docker", "REST APIs", "Redux", "HTML5", "CSS3"]
        },
        {
            "name": "Dr. Sarah Lin (AI / NLP Researcher)",
            "skills": ["Python", "PyTorch", "TensorFlow", "Natural Language Processing", "Transformers", "Large Language Models", "LangChain", "Hugging Face", "RAG (Retrieval-Augmented Generation)", "Vector Databases", "Deep Learning", "Scikit-Learn"]
        },
        {
            "name": "Marcus Vance (Cloud & Platform Engineer)",
            "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "DevOps", "Infrastructure as Code", "Nginx", "Prometheus & Grafana", "Shell / Bash", "Networking", "Python"]
        }
    ]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, job_title FROM target_jobs ORDER BY id ASC")
    all_jobs = cursor.fetchall()
    conn.close()

    results = []
    for prof in sample_profiles:
        profile_results = {
            "candidate_name": prof["name"],
            "skills_count": len(prof["skills"]),
            "role_matches": []
        }
        for job_row in all_jobs:
            m = matching_service.match_resume_to_job(
                resume_skills=prof["skills"],
                job_id=job_row["id"]
            )
            profile_results["role_matches"].append({
                "job_id": job_row["id"],
                "job_title": job_row["job_title"],
                "match_percentage": m["overall_match_percentage"],
                "match_level": m["match_level"],
                "matched_count": m["matched_count"],
                "missing_count": m["missing_count"],
                "priority_match_pct": m["priority_skills_summary"]["priority_match_percentage"]
            })
        results.append(profile_results)

    return {
        "success": True,
        "message": f"Successfully evaluated {len(sample_profiles)} benchmark candidate profiles across {len(all_jobs)} job roles.",
        "data": {
            "benchmark_results": results
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
        print(json.dumps({"success": False, "error": {"code": "INVALID_JSON", "message": f"Malformed payload JSON: {str(e)}"}}))
        sys.exit(1)

    if action == "get_jobs":
        res = get_jobs_action(payload)
    elif action == "get_job":
        res = get_job_by_id_action(payload)
    elif action == "match_skills":
        res = match_skills_action(payload)
    elif action == "skill_gap":
        res = skill_gap_action(payload)
    elif action == "test_multi":
        res = test_multi_matching_action(payload)
    else:
        res = {"success": False, "error": {"code": "UNKNOWN_ACTION", "message": f"Action '{action}' is unrecognized."}}

    print(json.dumps(res))
    if not res.get("success", True):
        sys.exit(1)

if __name__ == "__main__":
    main()
