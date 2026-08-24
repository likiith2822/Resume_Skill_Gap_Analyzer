"""
Analysis & NLP Routes for Resume Skill Gap Analyzer.
Exposes endpoints for skill extraction, normalization, and NLP pipeline metrics.
"""

from flask import Blueprint, request, jsonify
from backend.services.nlp_service import nlp_service, SKILL_TAXONOMY
from backend.services.matching_service import matching_service
from backend.database.db import get_db_connection
from backend.utils.helpers import success_response, error_response
import json

analysis_bp = Blueprint("analysis", __name__)

@analysis_bp.route("/extract-skills", methods=["POST"])
def extract_skills():
    """
    POST /api/analysis/extract-skills
    Accepts:
      - { "resume_id": 1 }
      - { "text": "...", "filename": "Optional" }
    Returns:
      - extracted skills with canonical normalization and categories
      - cleaned text
      - NLP pipeline breakdown (tokens, stopwords removed, lemmas)
      - basic resume information
    """
    payload = request.get_json() or {}
    resume_id = payload.get("resume_id")
    raw_text = payload.get("text", "")
    filename = payload.get("filename", "")

    basic_info = {"filename": filename, "resume_id": resume_id}

    conn = get_db_connection()
    cursor = conn.cursor()

    if resume_id and not raw_text:
        cursor.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            payload, code = error_response(
                message=f"Resume with ID {resume_id} not found.",
                error_code="RESUME_NOT_FOUND",
                status_code=404
            )
            return jsonify(payload), code

        raw_text = row["raw_text"] or ""
        basic_info["filename"] = row["original_filename"] or row["filename"]
        basic_info["file_type"] = row["file_type"]
        basic_info["file_size"] = row["file_size"]
        basic_info["uploaded_at"] = row["uploaded_at"]

    if not raw_text.strip():
        conn.close()
        payload, code = error_response(
            message="No text or resume provided for skill extraction.",
            error_code="EMPTY_TEXT",
            status_code=400
        )
        return jsonify(payload), code

    # Execute NLP pipeline
    result = nlp_service.process_text_pipeline(raw_text, basic_info)
    extracted_skills = result["extracted_skills"]
    categorized_skills = result["categorized_skills"]

    # Persist in SQLite if resume_id is provided
    if resume_id:
        try:
            cursor.execute("DELETE FROM extracted_skills WHERE resume_id = ?", (resume_id,))
            for item in extracted_skills:
                cursor.execute("""
                INSERT INTO extracted_skills (
                    resume_id, skill_name, canonical_name, category, confidence, occurrences, matched_as
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    resume_id,
                    item["skill"],
                    item["skill"],
                    item["category"],
                    item.get("confidence", 1.0),
                    item.get("occurrences", 1),
                    json.dumps(item.get("matched_as", []))
                ))
            conn.commit()
        except Exception as e:
            print(f"Error persisting extracted skills: {e}")

    conn.close()

    res_data = {
        "resume_id": resume_id,
        "basic_info": result["basic_info"],
        "cleaned_text": result["cleaned_text"],
        "nlp_pipeline": result["nlp_pipeline"],
        "skills_summary": {
            "total_extracted": len(extracted_skills),
            "categories_count": len(categorized_skills),
            "category_breakdown": result["skills"]["category_counts"],
            "top_skills": result["skills"]["top_skills"]
        },
        "extracted_skills": extracted_skills,
        "categorized_skills": categorized_skills
    }

    payload_resp, code = success_response(
        data=res_data,
        message=f"Successfully extracted {len(extracted_skills)} skills using spaCy and NLTK pipeline.",
        status_code=200
    )
    return jsonify(payload_resp), code


@analysis_bp.route("/match", methods=["POST"])
def match_skills():
    """
    POST /api/analysis/match
    Semantic skill matching using Sentence Transformers (all-MiniLM-L6-v2) and Cosine Similarity.
    
    Accepts:
      - { "job_id": 1, "resume_id": 2 }
      - { "job_id": 1, "skills": ["Python", "Docker", "AWS", "React"] }
      - { "job_id": 1, "text": "Experienced Python developer with React and AWS." }
      - { "job_title": "Software Engineer", "skills": [...] }
    
    Returns:
      - matched_skills: list of matched skills with similarity scores and match types
      - missing_skills: list of missing skills with closest candidate matches
      - similarity_scores: comprehensive score breakdown
      - overall_match_percentage: float between 0 and 100%
      - priority_skills: analysis of high-priority must-have requirements
    """
    payload = request.get_json() or {}
    job_id = payload.get("job_id")
    job_title = payload.get("job_title")
    resume_id = payload.get("resume_id")
    provided_skills = payload.get("skills", [])
    raw_text = payload.get("text", "")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Resolve target job role
    if not job_id and job_title:
        cursor.execute("SELECT id FROM target_jobs WHERE LOWER(job_title) = LOWER(?)", (job_title.strip(),))
        job_row = cursor.fetchone()
        if job_row:
            job_id = job_row["id"]

    if not job_id:
        # Default to first job if not provided
        cursor.execute("SELECT id FROM target_jobs LIMIT 1")
        default_job = cursor.fetchone()
        if default_job:
            job_id = default_job["id"]
        else:
            conn.close()
            payload_err, code = error_response(
                message="No job role specified and no job roles found in database.",
                error_code="NO_JOB_FOUND",
                status_code=400
            )
            return jsonify(payload_err), code

    # Resolve candidate skills
    candidate_skills = []
    if provided_skills and isinstance(provided_skills, list):
        candidate_skills = [str(s).strip() for s in provided_skills if str(s).strip()]
    elif resume_id:
        # Try fetching from extracted_skills table
        cursor.execute("SELECT canonical_name FROM extracted_skills WHERE resume_id = ?", (resume_id,))
        rows = cursor.fetchall()
        if rows:
            candidate_skills = [r["canonical_name"] for r in rows]
        else:
            # Fallback to resume text
            cursor.execute("SELECT raw_text FROM resumes WHERE id = ?", (resume_id,))
            res_row = cursor.fetchone()
            if res_row and res_row["raw_text"]:
                extracted = nlp_service.extract_skills(res_row["raw_text"])
                candidate_skills = extracted.get("all_skills", []) if isinstance(extracted, dict) else [s.get("skill") for s in extracted if isinstance(s, dict)]
    elif raw_text.strip():
        extracted = nlp_service.extract_skills(raw_text)
        candidate_skills = extracted.get("all_skills", []) if isinstance(extracted, dict) else [s.get("skill") for s in extracted if isinstance(s, dict)]

    # Execute semantic matching pipeline
    try:
        match_result = matching_service.match_resume_to_job(
            resume_skills=candidate_skills,
            job_id=job_id,
            resume_id=resume_id,
            conn=conn
        )
        conn.close()

        payload_resp, code = success_response(
            data=match_result,
            message=f"Semantic matching completed with {match_result['overall_match_percentage']}% match score.",
            status_code=200
        )
        return jsonify(payload_resp), code
    except Exception as e:
        conn.close()
        payload_err, code = error_response(
            message=f"Error executing semantic matching: {str(e)}",
            error_code="MATCHING_ERROR",
            status_code=500,
            details=str(e)
        )
        return jsonify(payload_err), code


@analysis_bp.route("/skills/taxonomy", methods=["GET"])
def get_taxonomy():
    """GET /api/analysis/skills/taxonomy"""
    categories = {}
    for canonical, meta in SKILL_TAXONOMY.items():
        cat = meta["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({
            "name": canonical,
            "aliases": meta.get("aliases", [])
        })

    payload, code = success_response(
        data={
            "categories": categories,
            "total_canonical_skills": len(SKILL_TAXONOMY),
            "category_names": list(categories.keys())
        },
        message="Skill taxonomy retrieved."
    )
    return jsonify(payload), code

