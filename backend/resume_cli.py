"""
Resume Management and Parsing CLI for Resume Skill Gap Analyzer.
Coordinates with SQLite database and backend/parser/resume_parser.py.
"""

import os
import sys
import json
import sqlite3
from pathlib import Path
from typing import Dict, Any

# Ensure backend directory is in path
CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))
sys.path.insert(0, str(CURRENT_DIR.parent))

from database.db import get_db_connection
from parser.resume_parser import parse_resume_file


def save_and_parse_resume(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Parse an uploaded resume file and persist metadata to SQLite."""
    file_path = payload.get("file_path")
    original_filename = payload.get("original_filename") or os.path.basename(file_path)
    stored_filename = payload.get("stored_filename") or os.path.basename(file_path)
    user_id = payload.get("user_id")
    file_size = payload.get("file_size", 0)
    file_type = payload.get("file_type", "").upper()

    if not file_path or not os.path.exists(file_path):
        raise FileNotFoundError(f"Uploaded file not found at: {file_path}")

    # 1. Parse text and entities with PyMuPDF / python-docx
    parsed_result = parse_resume_file(file_path, original_filename)

    raw_text = parsed_result.get("raw_text", "")
    parsed_json_str = json.dumps(parsed_result)
    candidate_name = parsed_result.get("contact", {}).get("name")
    candidate_email = parsed_result.get("contact", {}).get("email")

    conn = get_db_connection()
    cursor = conn.cursor()

    # 2. Optionally record / link candidate profile
    candidate_id = None
    if candidate_email:
        cursor.execute("SELECT id FROM candidates WHERE email = ?", (candidate_email,))
        existing_candidate = cursor.fetchone()
        if existing_candidate:
            candidate_id = existing_candidate["id"]
        else:
            cursor.execute(
                "INSERT INTO candidates (name, email) VALUES (?, ?)",
                (candidate_name, candidate_email)
            )
            candidate_id = cursor.lastrowid

    # 3. Store resume in SQLite
    cursor.execute("""
    INSERT INTO resumes (
        user_id, candidate_id, filename, original_filename,
        file_path, file_type, file_size, raw_text, parsed_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, candidate_id, stored_filename, original_filename,
        file_path, file_type, file_size, raw_text, parsed_json_str
    ))
    resume_id = cursor.lastrowid
    conn.commit()

    # Fetch newly created record
    cursor.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,))
    row = cursor.fetchone()
    conn.close()

    return {
        "success": True,
        "message": f"Resume '{original_filename}' successfully parsed and stored.",
        "data": {
            "resume_id": resume_id,
            "user_id": user_id,
            "filename": stored_filename,
            "original_filename": original_filename,
            "file_type": file_type,
            "file_size": file_size,
            "uploaded_at": row["uploaded_at"] if row else None,
            "parsed_data": parsed_result,
            "summary": {
                "name": candidate_name,
                "email": candidate_email,
                "phone": parsed_result.get("contact", {}).get("phone"),
                "total_skills": parsed_result.get("skills", {}).get("total_skills_count", 0),
                "skills_categories": list(parsed_result.get("skills", {}).get("categories", {}).keys()),
                "education_count": len(parsed_result.get("education", [])),
                "experience_count": len(parsed_result.get("experience", [])),
                "projects_count": len(parsed_result.get("projects", [])),
                "certifications_count": len(parsed_result.get("certifications", []))
            }
        }
    }


def list_resumes(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve all resumes uploaded by the current user."""
    user_id = payload.get("user_id")
    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("""
        SELECT id, user_id, candidate_id, filename, original_filename, file_type, file_size, uploaded_at, parsed_data
        FROM resumes
        WHERE user_id = ?
        ORDER BY uploaded_at DESC
        """, (user_id,))
    else:
        cursor.execute("""
        SELECT id, user_id, candidate_id, filename, original_filename, file_type, file_size, uploaded_at, parsed_data
        FROM resumes
        ORDER BY uploaded_at DESC
        """)

    rows = cursor.fetchall()
    resumes_list = []

    for row in rows:
        parsed = {}
        try:
            if row["parsed_data"]:
                parsed = json.loads(row["parsed_data"])
        except Exception:
            parsed = {}

        contact = parsed.get("contact", {})
        skills = parsed.get("skills", {})

        resumes_list.append({
            "id": row["id"],
            "user_id": row["user_id"],
            "filename": row["filename"],
            "original_filename": row["original_filename"] or row["filename"],
            "file_type": row["file_type"],
            "file_size": row["file_size"],
            "uploaded_at": row["uploaded_at"],
            "candidate_name": contact.get("name") or "Candidate",
            "candidate_email": contact.get("email") or "",
            "skills_count": skills.get("total_skills_count", 0),
            "top_skills": skills.get("all_skills", [])[:8],
            "education_count": len(parsed.get("education", [])),
            "experience_count": len(parsed.get("experience", []))
        })

    conn.close()

    return {
        "success": True,
        "message": f"Retrieved {len(resumes_list)} resume(s).",
        "data": {
            "resumes": resumes_list,
            "total": len(resumes_list)
        }
    }


def get_resume_details(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve full resume details, extracted entities, and raw text."""
    resume_id = payload.get("resume_id")
    user_id = payload.get("user_id")

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("SELECT * FROM resumes WHERE id = ? AND (user_id = ? OR user_id IS NULL)", (resume_id, user_id))
    else:
        cursor.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return {
            "success": False,
            "error": {
                "code": "RESUME_NOT_FOUND",
                "message": f"Resume with ID {resume_id} not found."
            }
        }

    parsed = {}
    try:
        if row["parsed_data"]:
            parsed = json.loads(row["parsed_data"])
    except Exception:
        parsed = {}

    return {
        "success": True,
        "message": f"Resume details retrieved for ID {resume_id}.",
        "data": {
            "resume": {
                "id": row["id"],
                "user_id": row["user_id"],
                "candidate_id": row["candidate_id"],
                "filename": row["filename"],
                "original_filename": row["original_filename"] or row["filename"],
                "file_type": row["file_type"],
                "file_size": row["file_size"],
                "uploaded_at": row["uploaded_at"],
                "raw_text": row["raw_text"],
                "parsed_data": parsed
            }
        }
    }


def delete_resume(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Delete resume from SQLite and file system."""
    resume_id = payload.get("resume_id")
    user_id = payload.get("user_id")

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("SELECT file_path FROM resumes WHERE id = ? AND user_id = ?", (resume_id, user_id))
    else:
        cursor.execute("SELECT file_path FROM resumes WHERE id = ?", (resume_id,))

    row = cursor.fetchone()
    if not row:
        conn.close()
        return {
            "success": False,
            "error": {
                "code": "RESUME_NOT_FOUND",
                "message": f"Resume with ID {resume_id} not found."
            }
        }

    file_path = row["file_path"]

    cursor.execute("DELETE FROM resumes WHERE id = ?", (resume_id,))
    conn.commit()
    conn.close()

    # Attempt file deletion
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    return {
        "success": True,
        "message": f"Resume ID {resume_id} successfully deleted.",
        "data": {
            "deleted_id": resume_id
        }
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": {"code": "INVALID_USAGE", "message": "Usage: python resume_cli.py <action> '<json_payload>'"}
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
        if action == "parse_and_save":
            res = save_and_parse_resume(payload)
            print(json.dumps(res))
        elif action == "list_resumes":
            res = list_resumes(payload)
            print(json.dumps(res))
        elif action == "get_resume":
            res = get_resume_details(payload)
            print(json.dumps(res))
        elif action == "delete_resume":
            res = delete_resume(payload)
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
            "error": {"code": "PARSING_FAILED", "message": str(err)}
        }))
        sys.exit(1)
