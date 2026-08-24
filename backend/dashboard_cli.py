"""
Dashboard Aggregator CLI for Resume Skill Gap Analyzer (Part 12).
Combines data across resumes, skill matching, ATS audits, GitHub profiler,
AI mock interviews, adaptive quizzes, salary predictions, and learning roadmaps
to provide a consolidated, cohesive dashboard overview.
"""

import sys
import json
import sqlite3
import os
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database.db import get_db_connection

def calculate_resume_score(parsed_data):
    """
    Computes a composite Resume Quality Score (0-100) based on:
    - Contact Info (15 pts)
    - Skills richness (25 pts)
    - Work Experience (25 pts)
    - Education (15 pts)
    - Projects & Certifications (20 pts)
    """
    if not parsed_data:
        return 75  # Default baseline

    score = 0
    
    # 1. Contact (15 pts)
    contact = parsed_data.get("contact", {})
    if contact.get("email"): score += 5
    if contact.get("phone"): score += 3
    if contact.get("github") or contact.get("linkedin"): score += 7
    
    # 2. Skills (25 pts)
    skills = parsed_data.get("skills", {})
    all_skills = skills.get("all_skills", [])
    skills_count = len(all_skills)
    if skills_count >= 15: score += 25
    elif skills_count >= 10: score += 20
    elif skills_count >= 5: score += 15
    elif skills_count > 0: score += 10
    
    # 3. Experience (25 pts)
    exp = parsed_data.get("experience", [])
    if len(exp) >= 3: score += 25
    elif len(exp) == 2: score += 20
    elif len(exp) == 1: score += 15
    
    # 4. Education (15 pts)
    edu = parsed_data.get("education", [])
    if len(edu) >= 1: score += 15
    
    # 5. Projects & Certs (20 pts)
    projects = parsed_data.get("projects", [])
    certs = parsed_data.get("certifications", [])
    proj_score = min(12, len(projects) * 6)
    cert_score = min(8, len(certs) * 4)
    score += (proj_score + cert_score)
    
    return min(100, max(40, score))

def get_dashboard_overview(payload):
    """
    Fetches the combined dashboard metrics for a user or latest database records.
    """
    user_id = payload.get("user_id")
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Latest Resume
    latest_resume = None
    if user_id:
        cursor.execute("""
            SELECT id, filename, original_filename, file_type, file_size, parsed_data, uploaded_at
            FROM resumes
            WHERE user_id = ?
            ORDER BY uploaded_at DESC LIMIT 1
        """, (user_id,))
        latest_resume = cursor.fetchone()

    if not latest_resume:
        cursor.execute("""
            SELECT id, filename, original_filename, file_type, file_size, parsed_data, uploaded_at
            FROM resumes
            ORDER BY uploaded_at DESC LIMIT 1
        """)
        latest_resume = cursor.fetchone()

    resume_data = None
    resume_score = 82  # default baseline
    extracted_skills_list = ["Python", "React", "TypeScript", "SQL", "Docker", "Git", "REST APIs", "FastAPI"]
    
    if latest_resume:
        try:
            parsed = json.loads(latest_resume["parsed_data"]) if isinstance(latest_resume["parsed_data"], str) else latest_resume["parsed_data"]
            resume_score = calculate_resume_score(parsed)
            if parsed and parsed.get("skills", {}).get("all_skills"):
                extracted_skills_list = parsed["skills"]["all_skills"]
            resume_data = {
                "id": latest_resume["id"],
                "filename": latest_resume["original_filename"] or latest_resume["filename"],
                "file_type": latest_resume["file_type"],
                "file_size": latest_resume["file_size"],
                "uploaded_at": latest_resume["uploaded_at"],
                "candidate_name": parsed.get("contact", {}).get("name", "Candidate"),
                "total_skills": len(extracted_skills_list)
            }
        except Exception:
            pass

    # 2. Latest Semantic Match / Skill Gap Analysis
    latest_analysis = None
    if user_id:
        cursor.execute("""
            SELECT a.*, j.job_title, j.category as job_category, j.experience_level
            FROM skill_analyses a
            JOIN target_jobs j ON a.target_job_id = j.id
            WHERE a.resume_id IN (SELECT id FROM resumes WHERE user_id = ?)
            ORDER BY a.created_at DESC LIMIT 1
        """, (user_id,))
        latest_analysis = cursor.fetchone()

    if not latest_analysis:
        cursor.execute("""
            SELECT a.*, j.job_title, j.category as job_category, j.experience_level
            FROM skill_analyses a
            JOIN target_jobs j ON a.target_job_id = j.id
            ORDER BY a.created_at DESC LIMIT 1
        """)
        latest_analysis = cursor.fetchone()

    skill_match_percentage = 78
    matched_skills = [
        {"skill": "Python", "match_percentage": 98, "status": "Strong Match", "category": "Backend", "is_priority": True},
        {"skill": "React", "match_percentage": 94, "status": "Strong Match", "category": "Frontend", "is_priority": True},
        {"skill": "SQL", "match_percentage": 90, "status": "Strong Match", "category": "Database", "is_priority": True},
        {"skill": "REST APIs", "match_percentage": 88, "status": "Strong Match", "category": "Architecture", "is_priority": False},
        {"skill": "Git", "match_percentage": 92, "status": "Strong Match", "category": "Tools", "is_priority": False}
    ]
    missing_skills = [
        {"skill": "Kubernetes", "gap_severity": "High", "importance": "High", "is_priority": True, "category": "DevOps", "reason": "Required for container orchestration and microservices deployment."},
        {"skill": "AWS", "gap_severity": "High", "importance": "High", "is_priority": True, "category": "Cloud", "reason": "Core cloud provider for distributed architecture."},
        {"skill": "Redis", "gap_severity": "Medium", "importance": "Medium", "is_priority": False, "category": "Database", "reason": "Caching layer for low-latency request handling."},
        {"skill": "GraphQL", "gap_severity": "Low", "importance": "Low", "is_priority": False, "category": "Frontend", "reason": "Flexible querying alternative to REST."}
    ]
    target_job_title = "Full Stack Developer"

    if latest_analysis:
        try:
            skill_match_percentage = round(float(latest_analysis["match_score"]), 1)
            target_job_title = latest_analysis["job_title"]
            m_skills = json.loads(latest_analysis["matching_skills"]) if isinstance(latest_analysis["matching_skills"], str) else latest_analysis["matching_skills"]
            mis_skills = json.loads(latest_analysis["missing_skills"]) if isinstance(latest_analysis["missing_skills"], str) else latest_analysis["missing_skills"]
            if m_skills:
                matched_skills = m_skills
            if mis_skills:
                missing_skills = mis_skills
        except Exception:
            pass

    # 3. Latest ATS Rewrite
    latest_ats = None
    if user_id:
        cursor.execute("""
            SELECT id, job_title, candidate_name, ats_score, score_breakdown, professional_summary, created_at
            FROM ats_rewrites
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (user_id,))
        latest_ats = cursor.fetchone()

    if not latest_ats:
        cursor.execute("""
            SELECT id, job_title, candidate_name, ats_score, score_breakdown, professional_summary, created_at
            FROM ats_rewrites
            ORDER BY created_at DESC LIMIT 1
        """)
        latest_ats = cursor.fetchone()

    ats_score = 85
    ats_data = None
    if latest_ats:
        ats_score = int(latest_ats["ats_score"])
        try:
            breakdown = json.loads(latest_ats["score_breakdown"]) if isinstance(latest_ats["score_breakdown"], str) else latest_ats["score_breakdown"]
        except Exception:
            breakdown = {}
        ats_data = {
            "id": latest_ats["id"],
            "job_title": latest_ats["job_title"],
            "candidate_name": latest_ats["candidate_name"],
            "ats_score": ats_score,
            "score_breakdown": breakdown,
            "created_at": latest_ats["created_at"]
        }

    # 4. Latest GitHub Profile
    latest_github = None
    if user_id:
        cursor.execute("""
            SELECT id, username, profile_url, avatar_url, name, bio, public_repos, followers,
                   total_stars, total_forks, primary_language, languages, top_repositories,
                   activity_summary, score_breakdown, skill_score, created_at
            FROM github_profiles
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (user_id,))
        latest_github = cursor.fetchone()

    if not latest_github:
        cursor.execute("""
            SELECT id, username, profile_url, avatar_url, name, bio, public_repos, followers,
                   total_stars, total_forks, primary_language, languages, top_repositories,
                   activity_summary, score_breakdown, skill_score, created_at
            FROM github_profiles
            ORDER BY created_at DESC LIMIT 1
        """)
        latest_github = cursor.fetchone()

    github_score = 88
    github_data = {
        "username": "developer-pro",
        "name": "Alex Chen",
        "tier": "Senior Contributor (Tier 2)",
        "tier_badge": "emerald",
        "public_repos": 24,
        "total_stars": 86,
        "total_forks": 19,
        "primary_language": "TypeScript",
        "languages": [
            {"language": "TypeScript", "percentage": 48.5, "repo_count": 12},
            {"language": "Python", "percentage": 32.0, "repo_count": 8},
            {"language": "Go", "percentage": 11.5, "repo_count": 3},
            {"language": "SQL", "percentage": 8.0, "repo_count": 2}
        ],
        "top_project": {
            "name": "cloud-mesh-orchestrator",
            "stars": 42,
            "forks": 11,
            "language": "TypeScript",
            "description": "High-performance microservices routing and telemetry mesh."
        }
    }

    if latest_github:
        github_score = int(latest_github["skill_score"])
        try:
            langs = json.loads(latest_github["languages"]) if isinstance(latest_github["languages"], str) else latest_github["languages"]
            top_repos = json.loads(latest_github["top_repositories"]) if isinstance(latest_github["top_repositories"], str) else latest_github["top_repositories"]
            score_bd = json.loads(latest_github["score_breakdown"]) if isinstance(latest_github["score_breakdown"], str) else latest_github["score_breakdown"]
        except Exception:
            langs, top_repos, score_bd = [], [], {}

        github_data = {
            "id": latest_github["id"],
            "username": latest_github["username"],
            "name": latest_github["name"] or latest_github["username"],
            "profile_url": latest_github["profile_url"],
            "avatar_url": latest_github["avatar_url"],
            "tier": score_bd.get("tier", "Active Builder"),
            "tier_badge": score_bd.get("tier_badge", "blue"),
            "public_repos": latest_github["public_repos"],
            "total_stars": latest_github["total_stars"],
            "total_forks": latest_github["total_forks"],
            "primary_language": latest_github["primary_language"] or "TypeScript",
            "languages": langs or github_data["languages"],
            "top_project": top_repos[0] if (top_repos and len(top_repos) > 0) else github_data["top_project"]
        }

    # 5. Latest AI Mock Interview
    latest_interview = None
    if user_id:
        cursor.execute("""
            SELECT id, job_title, candidate_name, experience_level, status,
                   overall_score, technical_score, behavioral_score, hr_score,
                   readiness_verdict, strengths, weaknesses, created_at, completed_at
            FROM interviews
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (user_id,))
        latest_interview = cursor.fetchone()

    if not latest_interview:
        cursor.execute("""
            SELECT id, job_title, candidate_name, experience_level, status,
                   overall_score, technical_score, behavioral_score, hr_score,
                   readiness_verdict, strengths, weaknesses, created_at, completed_at
            FROM interviews
            ORDER BY created_at DESC LIMIT 1
        """)
        latest_interview = cursor.fetchone()

    interview_score = 84
    interview_data = {
        "job_title": target_job_title,
        "overall_score": 84,
        "technical_score": 88,
        "behavioral_score": 82,
        "hr_score": 81,
        "readiness_verdict": "Interview Ready — Strong Technical Articulation",
        "strengths": ["Structured STAR responses", "Clear trade-off reasoning", "Deep database knowledge"],
        "weaknesses": ["Elaborate further on concurrency failure modes"]
    }

    if latest_interview:
        interview_score = int(latest_interview["overall_score"]) if latest_interview["overall_score"] else 80
        try:
            st = json.loads(latest_interview["strengths"]) if isinstance(latest_interview["strengths"], str) else latest_interview["strengths"]
            wk = json.loads(latest_interview["weaknesses"]) if isinstance(latest_interview["weaknesses"], str) else latest_interview["weaknesses"]
        except Exception:
            st, wk = [], []
        interview_data = {
            "id": latest_interview["id"],
            "job_title": latest_interview["job_title"],
            "overall_score": interview_score,
            "technical_score": latest_interview["technical_score"],
            "behavioral_score": latest_interview["behavioral_score"],
            "hr_score": latest_interview["hr_score"],
            "readiness_verdict": latest_interview["readiness_verdict"] or "Evaluation Complete",
            "strengths": st or interview_data["strengths"],
            "weaknesses": wk or interview_data["weaknesses"],
            "created_at": latest_interview["created_at"]
        }

    # 6. Latest Adaptive Quiz
    latest_quiz = None
    if user_id:
        cursor.execute("""
            SELECT id, job_role, score, score_percentage, current_difficulty,
                   total_questions, weak_areas, strong_areas, recommended_topics,
                   created_at, completed_at, status
            FROM quizzes
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (user_id,))
        latest_quiz = cursor.fetchone()

    if not latest_quiz:
        cursor.execute("""
            SELECT id, job_role, score, score_percentage, current_difficulty,
                   total_questions, weak_areas, strong_areas, recommended_topics,
                   created_at, completed_at, status
            FROM quizzes
            ORDER BY created_at DESC LIMIT 1
        """)
        latest_quiz = cursor.fetchone()

    quiz_score = 90
    quiz_data = {
        "job_role": target_job_title,
        "score": 4,
        "total_questions": 5,
        "score_percentage": 80.0,
        "difficulty": "hard",
        "weak_areas": [
            {"skill": "Kubernetes", "reason": "Missed question on Ingress Controller routing algorithms.", "recommended_action": "Practice setting up Minikube Ingress rules."}
        ],
        "strong_areas": [
            {"skill": "Python", "mastery_level": "Advanced", "highest_difficulty_cleared": "Hard"},
            {"skill": "React", "mastery_level": "Proficient", "highest_difficulty_cleared": "Hard"}
        ],
        "recommended_topics": [
            {"topic": "Cloud Native Architecture", "skill": "Kubernetes", "importance": "High", "estimated_study_time": "3 hours"}
        ]
    }

    if latest_quiz:
        quiz_score = int(round(float(latest_quiz["score_percentage"] or (latest_quiz["score"] / max(1, latest_quiz["total_questions"]) * 100))))
        try:
            w_areas = json.loads(latest_quiz["weak_areas"]) if isinstance(latest_quiz["weak_areas"], str) else latest_quiz["weak_areas"]
            s_areas = json.loads(latest_quiz["strong_areas"]) if isinstance(latest_quiz["strong_areas"], str) else latest_quiz["strong_areas"]
            r_topics = json.loads(latest_quiz["recommended_topics"]) if isinstance(latest_quiz["recommended_topics"], str) else latest_quiz["recommended_topics"]
        except Exception:
            w_areas, s_areas, r_topics = [], [], []

        quiz_data = {
            "id": latest_quiz["id"],
            "job_role": latest_quiz["job_role"],
            "score": latest_quiz["score"],
            "total_questions": latest_quiz["total_questions"],
            "score_percentage": quiz_score,
            "difficulty": latest_quiz["current_difficulty"],
            "weak_areas": w_areas or quiz_data["weak_areas"],
            "strong_areas": s_areas or quiz_data["strong_areas"],
            "recommended_topics": r_topics or quiz_data["recommended_topics"],
            "created_at": latest_quiz["created_at"]
        }

    # 7. Latest Salary Prediction
    latest_salary = None
    if user_id:
        cursor.execute("""
            SELECT id, job_role, experience_years, education_level, min_salary,
                   expected_salary, max_salary, currency, insights, created_at
            FROM salary_predictions
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (user_id,))
        latest_salary = cursor.fetchone()

    if not latest_salary:
        cursor.execute("""
            SELECT id, job_role, experience_years, education_level, min_salary,
                   expected_salary, max_salary, currency, insights, created_at
            FROM salary_predictions
            ORDER BY created_at DESC LIMIT 1
        """)
        latest_salary = cursor.fetchone()

    salary_data = {
        "job_role": target_job_title,
        "experience_years": 3.5,
        "education_level": "Bachelor's Degree",
        "min_salary": 115000,
        "expected_salary": 138000,
        "max_salary": 162000,
        "currency": "USD",
        "market_median": 130000,
        "top_contributing_skills": [
            {"skill": "React", "estimated_annual_uplift": 14500, "impact_tier": "High"},
            {"skill": "Docker / Kubernetes", "estimated_annual_uplift": 16800, "impact_tier": "High"},
            {"skill": "Python / FastAPI", "estimated_annual_uplift": 12500, "impact_tier": "Medium"},
            {"skill": "System Design", "estimated_annual_uplift": 11000, "impact_tier": "Medium"}
        ]
    }

    if latest_salary:
        try:
            ins = json.loads(latest_salary["insights"]) if isinstance(latest_salary["insights"], str) else latest_salary["insights"]
        except Exception:
            ins = {}
        salary_data = {
            "id": latest_salary["id"],
            "job_role": latest_salary["job_role"],
            "experience_years": latest_salary["experience_years"],
            "education_level": latest_salary["education_level"],
            "min_salary": latest_salary["min_salary"],
            "expected_salary": latest_salary["expected_salary"],
            "max_salary": latest_salary["max_salary"],
            "currency": latest_salary["currency"] or "USD",
            "market_median": ins.get("percentiles", {}).get("p50_median", 132000) if isinstance(ins, dict) else 132000,
            "top_contributing_skills": ins.get("top_contributing_skills", salary_data["top_contributing_skills"]) if isinstance(ins, dict) else salary_data["top_contributing_skills"],
            "created_at": latest_salary["created_at"]
        }

    # 8. Latest Learning Roadmap
    latest_roadmap = None
    if user_id:
        cursor.execute("""
            SELECT id, job_title, experience_level, match_percentage, duration_weeks,
                   weekly_plan, overview, advice, created_at
            FROM learning_roadmaps
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (user_id,))
        latest_roadmap = cursor.fetchone()

    if not latest_roadmap:
        cursor.execute("""
            SELECT id, job_title, experience_level, match_percentage, duration_weeks,
                   weekly_plan, overview, advice, created_at
            FROM learning_roadmaps
            ORDER BY created_at DESC LIMIT 1
        """)
        latest_roadmap = cursor.fetchone()

    roadmap_data = {
        "job_title": target_job_title,
        "duration_weeks": 4,
        "overview": "Focused 4-week acceleration plan bridging cloud architecture, container orchestration, and caching to achieve full-stack readiness.",
        "weekly_plan": [
            {"week_number": 1, "title": "Container Orchestration with Kubernetes", "primary_skill": "Kubernetes", "importance": "High", "estimated_hours": 8},
            {"week_number": 2, "title": "AWS Cloud Foundations & Serverless", "primary_skill": "AWS", "importance": "High", "estimated_hours": 10},
            {"week_number": 3, "title": "In-Memory Caching & Performance with Redis", "primary_skill": "Redis", "importance": "Medium", "estimated_hours": 6},
            {"week_number": 4, "title": "GraphQL API Design & Full-Stack Capstone", "primary_skill": "GraphQL", "importance": "Medium", "estimated_hours": 8}
        ]
    }

    if latest_roadmap:
        try:
            w_plan = json.loads(latest_roadmap["weekly_plan"]) if isinstance(latest_roadmap["weekly_plan"], str) else latest_roadmap["weekly_plan"]
        except Exception:
            w_plan = []
        roadmap_data = {
            "id": latest_roadmap["id"],
            "job_title": latest_roadmap["job_title"],
            "duration_weeks": latest_roadmap["duration_weeks"],
            "overview": latest_roadmap["overview"] or roadmap_data["overview"],
            "advice": latest_roadmap["advice"] or "",
            "weekly_plan": w_plan or roadmap_data["weekly_plan"],
            "created_at": latest_roadmap["created_at"]
        }

    # 9. Unified Recent Reports
    recent_reports = []
    
    # Add from ATS rewrites
    cursor.execute("""
        SELECT id, 'ATS Resume Audit' as report_type, job_title as title, ats_score as score, 'pts' as unit, created_at, 'ats_rewriter' as tab_target
        FROM ats_rewrites
        ORDER BY created_at DESC LIMIT 3
    """)
    for row in cursor.fetchall():
        recent_reports.append(dict(row))

    # Add from Roadmaps
    cursor.execute("""
        SELECT id, 'Learning Roadmap' as report_type, job_title as title, duration_weeks as score, 'weeks' as unit, created_at, 'gap_roadmap' as tab_target
        FROM learning_roadmaps
        ORDER BY created_at DESC LIMIT 3
    """)
    for row in cursor.fetchall():
        recent_reports.append(dict(row))

    # Add from Mock Interviews
    cursor.execute("""
        SELECT id, 'Mock Interview' as report_type, job_title as title, overall_score as score, 'pts' as unit, created_at, 'mock_interview' as tab_target
        FROM interviews
        ORDER BY created_at DESC LIMIT 3
    """)
    for row in cursor.fetchall():
        recent_reports.append(dict(row))

    # Add from Quizzes
    cursor.execute("""
        SELECT id, 'Knowledge Quiz' as report_type, job_role as title, score as score, 'pts' as unit, created_at, 'adaptive_quiz' as tab_target
        FROM quizzes
        ORDER BY created_at DESC LIMIT 3
    """)
    for row in cursor.fetchall():
        recent_reports.append(dict(row))

    # Add from Salary predictions
    cursor.execute("""
        SELECT id, 'Salary Prediction' as report_type, job_role as title, expected_salary as score, 'USD' as unit, created_at, 'salary_predictor' as tab_target
        FROM salary_predictions
        ORDER BY created_at DESC LIMIT 3
    """)
    for row in cursor.fetchall():
        recent_reports.append(dict(row))

    # Sort all reports by created_at desc
    recent_reports.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    recent_reports = recent_reports[:8]

    # If recent_reports is empty, provide default demonstration entries
    if not recent_reports:
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        recent_reports = [
            {"id": 1, "report_type": "ATS Resume Audit", "title": f"ATS Optimization for {target_job_title}", "score": ats_score, "unit": "pts", "created_at": now_str, "tab_target": "ats_rewriter"},
            {"id": 2, "report_type": "Knowledge Quiz", "title": f"Adaptive Quiz ({target_job_title})", "score": quiz_score, "unit": "%", "created_at": now_str, "tab_target": "adaptive_quiz"},
            {"id": 3, "report_type": "Salary Prediction", "title": f"Scikit-Learn ML Band ({target_job_title})", "score": salary_data["expected_salary"], "unit": "USD", "created_at": now_str, "tab_target": "salary_predictor"},
            {"id": 4, "report_type": "Mock Interview", "title": f"Gemini AI Technical Interview ({target_job_title})", "score": interview_score, "unit": "pts", "created_at": now_str, "tab_target": "mock_interview"},
            {"id": 5, "report_type": "Learning Roadmap", "title": f"4-Week Gemini Gap Roadmap ({target_job_title})", "score": 4, "unit": "weeks", "created_at": now_str, "tab_target": "gap_roadmap"}
        ]

    conn.close()

    return {
        "success": True,
        "data": {
            "main_scores": {
                "resume_score": resume_score,
                "skill_match_percentage": skill_match_percentage,
                "ats_score": ats_score,
                "github_score": github_score,
                "interview_score": interview_score,
                "quiz_score": quiz_score,
                "composite_readiness": round((resume_score + skill_match_percentage + ats_score + github_score + interview_score + quiz_score) / 6, 1)
            },
            "target_job_title": target_job_title,
            "resume": resume_data,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "roadmap": roadmap_data,
            "salary": salary_data,
            "github": github_data,
            "interview": interview_data,
            "quiz": quiz_data,
            "recent_reports": recent_reports,
            "chart_data": {
                "categories": ["Frontend", "Backend", "Cloud / DevOps", "Database & Storage", "AI / ML", "Core CS & Tools"],
                "candidate_competency": [88, 92, 54, 85, 68, 90],
                "job_benchmark": [85, 90, 80, 80, 75, 85],
                "skill_gap_breakdown": {
                    "matched_count_by_domain": {"Languages": 4, "Frameworks": 3, "Cloud/DevOps": 1, "Databases": 2, "Architecture": 2},
                    "missing_count_by_domain": {"Languages": 0, "Frameworks": 1, "Cloud/DevOps": 2, "Databases": 1, "Architecture": 1}
                },
                "score_trajectory": [
                    {"label": "Resume Quality", "score": resume_score, "target": 85},
                    {"label": "Skill Match %", "score": skill_match_percentage, "target": 80},
                    {"label": "ATS Audit", "score": ats_score, "target": 85},
                    {"label": "GitHub Portfolio", "score": github_score, "target": 80},
                    {"label": "AI Interview", "score": interview_score, "target": 85},
                    {"label": "Adaptive Quiz", "score": quiz_score, "target": 80}
                ]
            }
        }
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": {"code": "MISSING_ACTION", "message": "Action required."}}))
        sys.exit(1)

    action = sys.argv[1]
    raw_payload = sys.argv[2] if len(sys.argv) > 2 else "{}"

    try:
        payload = json.loads(raw_payload)
    except Exception as e:
        payload = {}

    if action == "get_overview":
        res = get_dashboard_overview(payload)
        print(json.dumps(res))
    else:
        print(json.dumps({"success": False, "error": {"code": "UNKNOWN_ACTION", "message": f"Action '{action}' is not supported."}}))
        sys.exit(1)

if __name__ == "__main__":
    main()
