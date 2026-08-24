"""
NLP CLI Interface for Resume Skill Gap Analyzer.
Coordinates with SQLite database and backend/services/nlp_service.py.
Handles POST /api/analysis/extract-skills and test runs.
"""

import os
import sys
import json
import sqlite3
from pathlib import Path
from typing import Dict, Any, List

# Ensure backend directory is in python path
CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))
sys.path.insert(0, str(CURRENT_DIR.parent))

from database.db import get_db_connection
from services.nlp_service import nlp_service, SKILL_TAXONOMY, ALIAS_TO_CANONICAL


def extract_skills_action(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract skills, perform text cleaning, tokenization, stop-word removal,
    lemmatization, and store extracted skills in SQLite.
    """
    resume_id = payload.get("resume_id")
    raw_text = payload.get("text", "")
    filename = payload.get("filename", "")
    user_id = payload.get("user_id")

    basic_info: Dict[str, Any] = {
        "filename": filename,
        "resume_id": resume_id
    }

    conn = get_db_connection()
    cursor = conn.cursor()

    # If resume_id is provided and raw_text is empty, load from SQLite resumes table
    if resume_id and not raw_text:
        cursor.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {
                "success": False,
                "error": {
                    "code": "RESUME_NOT_FOUND",
                    "message": f"Resume with ID {resume_id} not found in database."
                }
            }

        raw_text = row["raw_text"] or ""
        basic_info["filename"] = row["original_filename"] or row["filename"]
        basic_info["file_type"] = row["file_type"]
        basic_info["file_size"] = row["file_size"]
        basic_info["uploaded_at"] = row["uploaded_at"]

        # Parse existing parsed_data if present
        if row["parsed_data"]:
            try:
                pdata = json.loads(row["parsed_data"])
                contact = pdata.get("contact", {})
                basic_info["candidate_name"] = contact.get("name")
                basic_info["candidate_email"] = contact.get("email")
                basic_info["candidate_phone"] = contact.get("phone")
                basic_info["github"] = contact.get("github")
                basic_info["linkedin"] = contact.get("linkedin")
            except Exception:
                pass

    if not raw_text.strip():
        conn.close()
        return {
            "success": False,
            "error": {
                "code": "EMPTY_TEXT",
                "message": "No text or resume found to process for skill extraction."
            }
        }

    # Execute full NLP processing pipeline (Cleaning -> Tokenizing -> Stopwords -> Lemmatization -> Extraction)
    pipeline_result = nlp_service.process_text_pipeline(raw_text, basic_info)

    extracted_skills = pipeline_result["extracted_skills"]
    categorized_skills = pipeline_result["categorized_skills"]

    # Store extracted skills in SQLite if resume_id is present
    if resume_id:
        try:
            # Delete old extracted skills for this resume to maintain idempotency
            cursor.execute("DELETE FROM extracted_skills WHERE resume_id = ?", (resume_id,))

            # Insert extracted skills
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

            # Update resumes table with latest NLP enrichment in parsed_data
            cursor.execute("SELECT parsed_data FROM resumes WHERE id = ?", (resume_id,))
            res_row = cursor.fetchone()
            if res_row and res_row["parsed_data"]:
                try:
                    pdata = json.loads(res_row["parsed_data"])
                    if "skills" not in pdata:
                        pdata["skills"] = {}
                    pdata["skills"]["total_skills_count"] = len(extracted_skills)
                    pdata["skills"]["all_skills"] = [s["skill"] for s in extracted_skills]
                    pdata["skills"]["categories"] = categorized_skills
                    pdata["nlp_pipeline"] = pipeline_result["nlp_pipeline"]
                    cursor.execute("UPDATE resumes SET parsed_data = ? WHERE id = ?", (json.dumps(pdata), resume_id))
                except Exception:
                    pass

            conn.commit()
        except Exception as db_err:
            print(f"[Warning] Failed to persist extracted skills to SQLite: {db_err}", file=sys.stderr)

    conn.close()

    return {
        "success": True,
        "message": f"Successfully extracted {len(extracted_skills)} skills using spaCy and NLTK NLP pipeline.",
        "data": {
            "resume_id": resume_id,
            "basic_info": pipeline_result["basic_info"],
            "cleaned_text": pipeline_result["cleaned_text"],
            "nlp_pipeline": pipeline_result["nlp_pipeline"],
            "skills_summary": {
                "total_extracted": len(extracted_skills),
                "categories_count": len(categorized_skills),
                "category_breakdown": pipeline_result["skills"]["category_counts"],
                "top_skills": pipeline_result["skills"]["top_skills"]
            },
            "extracted_skills": extracted_skills,
            "categorized_skills": categorized_skills
        }
    }


def normalize_skills_action(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize input skill string(s) into canonical form."""
    input_skills = payload.get("skills", [])
    if isinstance(input_skills, str):
        input_skills = [input_skills]

    normalized_list = []
    for s in input_skills:
        res = nlp_service.normalize_skill(s)
        if res:
            normalized_list.append({
                "original": s,
                "canonical": res["canonical"],
                "category": res["category"],
                "matched": True
            })
        else:
            normalized_list.append({
                "original": s,
                "canonical": s.strip().title(),
                "category": "Uncategorized",
                "matched": False
            })

    return {
        "success": True,
        "message": f"Normalized {len(normalized_list)} skill term(s).",
        "data": {
            "results": normalized_list
        }
    }


def get_taxonomy_action(_payload: Dict[str, Any]) -> Dict[str, Any]:
    """Return the complete skill taxonomy dictionary and categories."""
    categories: Dict[str, List[Dict[str, Any]]] = {}
    for canonical, meta in SKILL_TAXONOMY.items():
        cat = meta["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({
            "name": canonical,
            "aliases": meta.get("aliases", [])
        })

    return {
        "success": True,
        "data": {
            "categories": categories,
            "total_canonical_skills": len(SKILL_TAXONOMY),
            "total_aliases": len(ALIAS_TO_CANONICAL),
            "category_names": list(categories.keys())
        }
    }


def test_samples_action(_payload: Dict[str, Any]) -> Dict[str, Any]:
    """Test NLP extraction against multiple built-in sample resumes."""
    sample_resumes = [
        {
            "role": "Full-Stack Software Engineer (Alex Rivers)",
            "text": """
            Alex Rivers | alex.rivers@college.edu | San Francisco, CA
            SUMMARY: Full-Stack Engineer with experience in React, TypeScript, Node.js, Express, and Python.
            SKILLS: Python, TypeScript, JavaScript, SQL, C++, HTML5, CSS3, React, Node.js, Express.js, FastAPI,
            Flask, PyTorch, Tailwind CSS, PostgreSQL, SQLite, MongoDB, Redis, Docker, Kubernetes, AWS ECS,
            GitHub Actions, CI/CD, Microservices, REST APIs, Agile, Scrum, Problem Solving, Teamwork.
            """
        },
        {
            "role": "Machine Learning & AI Engineer (Sarah Chen)",
            "text": """
            Sarah Chen | sarah.chen@ai-institute.org | Boston, MA
            SUMMARY: Machine Learning & NLP Specialist with background in deep learning models and RAG architectures.
            SKILLS: Python, R, C++, PyTorch, TensorFlow, Keras, Scikit-Learn, Pandas, NumPy, spaCy, NLTK,
            Hugging Face Transformers, LangChain, Large Language Models (LLMs), Computer Vision, OpenCV,
            Data Analysis, Data Visualization, Matplotlib, PostgreSQL, Docker, AWS S3, Git, Critical Thinking, Communication.
            """
        },
        {
            "role": "Cloud DevOps & Platform Engineer (David Miller)",
            "text": """
            David Miller | david.miller@cloudops.net | Seattle, WA
            SUMMARY: Senior DevOps Engineer specializing in infrastructure automation and Kubernetes orchestration.
            SKILLS: Go, Python, Shell / Bash, Linux, Docker, Kubernetes, Terraform, Ansible, Jenkins,
            CI/CD, GitLab CI, GitHub Actions, AWS, Microsoft Azure, Google Cloud Platform (GCP), Prometheus,
            Grafana, Nginx, Microservices, REST APIs, Object-Oriented Programming, Leadership & Mentorship, Time Management.
            """
        }
    ]

    results = []
    for sample in sample_resumes:
        processed = nlp_service.process_text_pipeline(sample["text"], {"role": sample["role"]})
        results.append({
            "role": sample["role"],
            "total_skills": processed["skills"]["total_skills_count"],
            "category_counts": processed["skills"]["category_counts"],
            "top_skills": processed["skills"]["top_skills"],
            "token_count": processed["nlp_pipeline"]["stage_2_tokenization"]["total_tokens"],
            "stopwords_removed": processed["nlp_pipeline"]["stage_3_stopword_removal"]["stopwords_removed_count"]
        })

    return {
        "success": True,
        "message": f"Successfully executed NLP tests on {len(sample_resumes)} sample resumes.",
        "data": {
            "samples_tested": len(sample_resumes),
            "results": results
        }
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": {"code": "INVALID_USAGE", "message": "Usage: python nlp_cli.py <action> '<json_payload>'"}
        }))
        sys.exit(1)

    action = sys.argv[1]
    raw_payload = sys.argv[2]

    try:
        payload = json.loads(raw_payload)
    except Exception as err:
        print(json.dumps({
            "success": False,
            "error": {"code": "INVALID_JSON", "message": f"Failed to parse JSON payload: {err}"}
        }))
        sys.exit(1)

    try:
        if action == "extract_skills":
            res = extract_skills_action(payload)
            print(json.dumps(res))
        elif action == "normalize_skills":
            res = normalize_skills_action(payload)
            print(json.dumps(res))
        elif action == "get_taxonomy":
            res = get_taxonomy_action(payload)
            print(json.dumps(res))
        elif action == "test_samples":
            res = test_samples_action(payload)
            print(json.dumps(res))
        else:
            print(json.dumps({
                "success": False,
                "error": {"code": "UNKNOWN_ACTION", "message": f"Action '{action}' is not supported."}
            }))
            sys.exit(1)
    except Exception as err:
        print(json.dumps({
            "success": False,
            "error": {"code": "NLP_FAILED", "message": str(err)}
        }))
        sys.exit(1)
