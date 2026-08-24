"""
ATS & Cover Letter CLI for Resume Skill Gap Analyzer.
Handles ATS Score calculation, database storage, and retrieval for Part 8.
"""

import sys
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database.db import get_db_connection

def calculate_ats_metrics(resume_text, candidate_skills, job_title, required_skills, parsed_data=None):
    """
    Computes an objective, transparent ATS Score (0-100) based on 4 dimensions:
    1. Keyword Coverage (0-30 pts)
    2. Skill Coverage (0-35 pts)
    3. Section Completeness (0-15 pts)
    4. Job-Role Relevance (0-20 pts)
    """
    resume_lower = (resume_text or "").lower()
    candidate_skills_lower = {s.lower() for s in (candidate_skills or [])}

    # 1. Required Keyword Coverage (0-30)
    req_skills_list = required_skills or []
    if req_skills_list:
        matched_keywords = []
        missing_keywords = []
        for req in req_skills_list:
            req_l = req.lower()
            if req_l in candidate_skills_lower or req_l in resume_lower:
                matched_keywords.append(req)
            else:
                missing_keywords.append(req)

        keyword_ratio = len(matched_keywords) / max(1, len(req_skills_list))
        keyword_score = round(keyword_ratio * 30, 1)
    else:
        matched_keywords = req_skills_list
        missing_keywords = []
        keyword_ratio = 1.0
        keyword_score = 30.0

    # 2. Skill Coverage (0-35)
    matched_skills_count = len(matched_keywords)
    total_req_count = max(1, len(req_skills_list))
    skill_coverage_pct = round((matched_skills_count / total_req_count) * 100, 1)
    skill_score = round((skill_coverage_pct / 100) * 35, 1)

    # 3. Section Completeness (0-15)
    # Check 5 standard ATS sections (3 pts each)
    section_checks = {
        "contact_info": False,
        "skills_section": False,
        "experience_or_projects": False,
        "education": False,
        "summary_or_objective": False
    }

    if parsed_data:
        contact = parsed_data.get("contact", {})
        if contact.get("name") or contact.get("email") or ("@" in resume_lower):
            section_checks["contact_info"] = True
        if parsed_data.get("skills", {}).get("total_skills_count", 0) > 0 or len(candidate_skills) > 0:
            section_checks["skills_section"] = True
        if len(parsed_data.get("experience", [])) > 0 or len(parsed_data.get("projects", [])) > 0:
            section_checks["experience_or_projects"] = True
        if len(parsed_data.get("education", [])) > 0:
            section_checks["education"] = True
        if parsed_data.get("summary") or "summary" in resume_lower or "profile" in resume_lower:
            section_checks["summary_or_objective"] = True
    else:
        if "@" in resume_lower or "email" in resume_lower or "phone" in resume_lower:
            section_checks["contact_info"] = True
        if "skill" in resume_lower or len(candidate_skills) > 0:
            section_checks["skills_section"] = True
        if "experience" in resume_lower or "project" in resume_lower or "work" in resume_lower:
            section_checks["experience_or_projects"] = True
        if "education" in resume_lower or "university" in resume_lower or "bachelor" in resume_lower or "degree" in resume_lower:
            section_checks["education"] = True
        if "summary" in resume_lower or "objective" in resume_lower or "profile" in resume_lower:
            section_checks["summary_or_objective"] = True

    sections_found_count = sum(1 for v in section_checks.values() if v)
    section_score = round(sections_found_count * 3.0, 1)

    # 4. Job-Role Relevance (0-20)
    job_title_l = (job_title or "").lower()
    relevance_points = 5.0  # baseline
    if job_title_l and job_title_l in resume_lower:
        relevance_points += 7.0
    elif any(term in resume_lower for term in job_title_l.split()):
        relevance_points += 4.0

    # Tech relevance boost
    if keyword_ratio >= 0.7:
        relevance_points += 8.0
    elif keyword_ratio >= 0.4:
        relevance_points += 5.0
    else:
        relevance_points += 2.0

    job_relevance_score = min(20.0, round(relevance_points, 1))

    total_ats_score = int(round(min(100.0, max(0.0, keyword_score + skill_score + section_score + job_relevance_score))))

    return {
        "ats_score": total_ats_score,
        "ats_score_label": f"ATS Score: {total_ats_score}/100",
        "score_breakdown": {
            "keyword_coverage": {
                "score": keyword_score,
                "max": 30,
                "percentage": round((keyword_score / 30) * 100, 1),
                "matched_count": len(matched_keywords),
                "total_required": len(req_skills_list),
                "matched_keywords": matched_keywords,
                "missing_keywords": missing_keywords
            },
            "skill_coverage": {
                "score": skill_score,
                "max": 35,
                "percentage": skill_coverage_pct,
                "feedback": "Strong skill alignment" if skill_coverage_pct >= 75 else "Moderate gap in required skills" if skill_coverage_pct >= 45 else "High skill gap"
            },
            "section_completeness": {
                "score": section_score,
                "max": 15,
                "sections_found": [k.replace("_", " ").title() for k, v in section_checks.items() if v],
                "sections_missing": [k.replace("_", " ").title() for k, v in section_checks.items() if not v]
            },
            "job_role_relevance": {
                "score": job_relevance_score,
                "max": 20,
                "job_title": job_title
            }
        }
    }

def calculate_ats_action(payload):
    resume_text = payload.get("resume_text", "")
    candidate_skills = payload.get("candidate_skills", [])
    job_title = payload.get("job_title", "Software Engineer")
    required_skills = payload.get("required_skills", [])
    parsed_data = payload.get("parsed_data")

    # If resume_id is provided, pull text and skills from DB
    resume_id = payload.get("resume_id")
    if resume_id:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT raw_text, parsed_data FROM resumes WHERE id = ?", (resume_id,))
        row = cursor.fetchone()
        if row:
            resume_text = row["raw_text"] or resume_text
            if row["parsed_data"]:
                try:
                    parsed_data = json.loads(row["parsed_data"])
                except Exception:
                    pass
        
        # Also check extracted skills
        cursor.execute("SELECT canonical_name FROM extracted_skills WHERE resume_id = ?", (resume_id,))
        skill_rows = cursor.fetchall()
        if skill_rows:
            db_skills = [r["canonical_name"] for r in skill_rows]
            candidate_skills = list(set(candidate_skills + db_skills))
        conn.close()

    # If job_id is provided, pull required skills from DB
    job_id = payload.get("job_id")
    if job_id:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT job_title, required_skills FROM target_jobs WHERE id = ?", (job_id,))
        jrow = cursor.fetchone()
        if jrow:
            job_title = jrow["job_title"] or job_title
            if jrow["required_skills"]:
                try:
                    required_skills = json.loads(jrow["required_skills"])
                except Exception:
                    pass
        conn.close()

    metrics = calculate_ats_metrics(resume_text, candidate_skills, job_title, required_skills, parsed_data)
    return {
        "success": True,
        "message": f"ATS compatibility metrics computed for '{job_title}'.",
        "data": metrics
    }

def save_ats_rewrite_action(payload):
    user_id = payload.get("user_id")
    resume_id = payload.get("resume_id")
    target_job_id = payload.get("target_job_id")
    job_title = payload.get("job_title", "Software Engineer")
    candidate_name = payload.get("candidate_name", "Candidate")
    ats_score = payload.get("ats_score", 75)
    score_breakdown = payload.get("score_breakdown", {})
    professional_summary = payload.get("professional_summary", "")
    improved_bullet_points = payload.get("improved_bullet_points", [])
    relevant_keywords = payload.get("relevant_keywords", {})
    ats_resume_content = payload.get("ats_resume_content", "")
    suggestions_audit = payload.get("suggestions_audit", {})
    model_used = payload.get("model_used", "gemini-3.7-flash")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO ats_rewrites (
            user_id, resume_id, target_job_id, job_title, candidate_name,
            ats_score, score_breakdown, professional_summary,
            improved_bullet_points, relevant_keywords, ats_resume_content,
            suggestions_audit, model_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        resume_id,
        target_job_id,
        job_title,
        candidate_name,
        ats_score,
        json.dumps(score_breakdown),
        professional_summary,
        json.dumps(improved_bullet_points),
        json.dumps(relevant_keywords),
        ats_resume_content,
        json.dumps(suggestions_audit),
        model_used
    ))

    rewrite_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"ATS Resume Rewrite #{rewrite_id} saved to SQLite.",
        "data": {
            "id": rewrite_id,
            "job_title": job_title,
            "ats_score": ats_score,
            "created_at": None
        }
    }

def get_ats_rewrite_action(payload):
    rewrite_id = payload.get("id") or payload.get("rewrite_id")
    if not rewrite_id:
        return {"success": False, "error": {"code": "MISSING_ID", "message": "Rewrite ID is required."}}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ats_rewrites WHERE id = ?", (rewrite_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"success": False, "error": {"code": "REWRITE_NOT_FOUND", "message": f"ATS rewrite #{rewrite_id} not found."}}

    return {
        "success": True,
        "message": f"ATS rewrite #{rewrite_id} retrieved.",
        "data": {
            "id": row["id"],
            "user_id": row["user_id"],
            "resume_id": row["resume_id"],
            "target_job_id": row["target_job_id"],
            "job_title": row["job_title"],
            "candidate_name": row["candidate_name"],
            "ats_score": row["ats_score"],
            "ats_score_label": f"ATS Score: {row['ats_score']}/100",
            "score_breakdown": json.loads(row["score_breakdown"]) if row["score_breakdown"] else {},
            "professional_summary": row["professional_summary"],
            "improved_bullet_points": json.loads(row["improved_bullet_points"]) if row["improved_bullet_points"] else [],
            "relevant_keywords": json.loads(row["relevant_keywords"]) if row["relevant_keywords"] else {},
            "ats_resume_content": row["ats_resume_content"],
            "suggestions_audit": json.loads(row["suggestions_audit"]) if row["suggestions_audit"] else {},
            "model_used": row["model_used"],
            "created_at": row["created_at"]
        }
    }

def list_ats_rewrites_action(payload):
    user_id = payload.get("user_id")
    limit = payload.get("limit", 20)

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("""
            SELECT id, user_id, resume_id, target_job_id, job_title, candidate_name,
                   ats_score, model_used, created_at
            FROM ats_rewrites
            WHERE user_id = ?
            ORDER BY id DESC LIMIT ?
        """, (user_id, limit))
    else:
        cursor.execute("""
            SELECT id, user_id, resume_id, target_job_id, job_title, candidate_name,
                   ats_score, model_used, created_at
            FROM ats_rewrites
            ORDER BY id DESC LIMIT ?
        """, (limit,))

    rows = cursor.fetchall()
    conn.close()

    rewrites = []
    for r in rows:
        rewrites.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "resume_id": r["resume_id"],
            "target_job_id": r["target_job_id"],
            "job_title": r["job_title"],
            "candidate_name": r["candidate_name"],
            "ats_score": r["ats_score"],
            "ats_score_label": f"ATS Score: {r['ats_score']}/100",
            "model_used": r["model_used"],
            "created_at": r["created_at"]
        })

    return {
        "success": True,
        "message": f"Retrieved {len(rewrites)} ATS rewrites.",
        "data": {
            "rewrites": rewrites,
            "total": len(rewrites)
        }
    }

def save_cover_letter_action(payload):
    user_id = payload.get("user_id")
    resume_id = payload.get("resume_id")
    target_job_id = payload.get("target_job_id")
    job_title = payload.get("job_title", "Software Engineer")
    candidate_name = payload.get("candidate_name", "Candidate")
    company_name = payload.get("company_name", "Target Company")
    recipient_name = payload.get("recipient_name", "Hiring Manager")
    tone = payload.get("tone", "Professional & Confident")
    cover_letter_text = payload.get("cover_letter_text", "")
    key_highlights = payload.get("key_highlights", [])
    model_used = payload.get("model_used", "gemini-3.7-flash")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO cover_letters (
            user_id, resume_id, target_job_id, job_title, candidate_name,
            company_name, recipient_name, tone, cover_letter_text,
            key_highlights, model_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        resume_id,
        target_job_id,
        job_title,
        candidate_name,
        company_name,
        recipient_name,
        tone,
        cover_letter_text,
        json.dumps(key_highlights),
        model_used
    ))

    letter_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Cover letter #{letter_id} for '{job_title}' saved to SQLite.",
        "data": {
            "id": letter_id,
            "job_title": job_title,
            "candidate_name": candidate_name,
            "company_name": company_name,
            "created_at": None
        }
    }

def get_cover_letter_action(payload):
    letter_id = payload.get("id") or payload.get("letter_id")
    if not letter_id:
        return {"success": False, "error": {"code": "MISSING_ID", "message": "Cover letter ID is required."}}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cover_letters WHERE id = ?", (letter_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"success": False, "error": {"code": "LETTER_NOT_FOUND", "message": f"Cover letter #{letter_id} not found."}}

    return {
        "success": True,
        "message": f"Cover letter #{letter_id} retrieved.",
        "data": {
            "id": row["id"],
            "user_id": row["user_id"],
            "resume_id": row["resume_id"],
            "target_job_id": row["target_job_id"],
            "job_title": row["job_title"],
            "candidate_name": row["candidate_name"],
            "company_name": row["company_name"],
            "recipient_name": row["recipient_name"],
            "tone": row["tone"],
            "cover_letter_text": row["cover_letter_text"],
            "key_highlights": json.loads(row["key_highlights"]) if row["key_highlights"] else [],
            "model_used": row["model_used"],
            "created_at": row["created_at"]
        }
    }

def list_cover_letters_action(payload):
    user_id = payload.get("user_id")
    limit = payload.get("limit", 20)

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("""
            SELECT id, user_id, resume_id, target_job_id, job_title, candidate_name,
                   company_name, recipient_name, tone, model_used, created_at
            FROM cover_letters
            WHERE user_id = ?
            ORDER BY id DESC LIMIT ?
        """, (user_id, limit))
    else:
        cursor.execute("""
            SELECT id, user_id, resume_id, target_job_id, job_title, candidate_name,
                   company_name, recipient_name, tone, model_used, created_at
            FROM cover_letters
            ORDER BY id DESC LIMIT ?
        """, (limit,))

    rows = cursor.fetchall()
    conn.close()

    letters = []
    for r in rows:
        letters.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "resume_id": r["resume_id"],
            "target_job_id": r["target_job_id"],
            "job_title": r["job_title"],
            "candidate_name": r["candidate_name"],
            "company_name": r["company_name"],
            "recipient_name": r["recipient_name"],
            "tone": r["tone"],
            "model_used": r["model_used"],
            "created_at": r["created_at"]
        })

    return {
        "success": True,
        "message": f"Retrieved {len(letters)} cover letters.",
        "data": {
            "cover_letters": letters,
            "total": len(letters)
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

    if action == "calculate_ats":
        res = calculate_ats_action(payload)
    elif action == "save_ats_rewrite":
        res = save_ats_rewrite_action(payload)
    elif action == "get_ats_rewrite":
        res = get_ats_rewrite_action(payload)
    elif action == "list_ats_rewrites":
        res = list_ats_rewrites_action(payload)
    elif action == "save_cover_letter":
        res = save_cover_letter_action(payload)
    elif action == "get_cover_letter":
        res = get_cover_letter_action(payload)
    elif action == "list_cover_letters":
        res = list_cover_letters_action(payload)
    else:
        res = {"success": False, "error": {"code": "UNKNOWN_ACTION", "message": f"Action '{action}' is unrecognized."}}

    print(json.dumps(res))
    if not res.get("success", True):
        sys.exit(1)

if __name__ == "__main__":
    main()
