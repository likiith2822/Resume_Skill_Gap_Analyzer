"""
Adaptive Knowledge Quiz CLI for Resume Skill Gap Analyzer (Part 11).
Handles quiz session initialization, answer recording, adaptive difficulty updates,
result synthesis persistence (scores, weak/strong areas, recommended topics), and history retrieval.
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

def start_quiz(payload):
    """
    Initializes a new adaptive knowledge quiz attempt in SQLite.
    """
    user_id = payload.get("user_id")
    resume_id = payload.get("resume_id")
    target_job_id = payload.get("target_job_id")
    job_role = payload.get("job_role", "Software Engineer")
    missing_skills = payload.get("missing_skills", [])
    priority_skills = payload.get("priority_skills", [])
    total_questions = int(payload.get("total_questions", 5))
    initial_difficulty = payload.get("initial_difficulty", "medium")
    first_question = payload.get("first_question")
    model_used = payload.get("model_used", "gemini-3.7-flash")

    questions_data = [first_question] if first_question else []

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO quizzes (
        user_id, resume_id, target_job_id, job_role,
        missing_skills, priority_skills, status, current_difficulty,
        total_questions, current_question_index, score, score_percentage,
        questions_data, answers_data, model_used, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?, ?, 0, 0, 0.0, ?, '[]', ?, CURRENT_TIMESTAMP);
    """, (
        user_id,
        resume_id,
        target_job_id,
        job_role,
        json.dumps(missing_skills),
        json.dumps(priority_skills),
        initial_difficulty,
        total_questions,
        json.dumps(questions_data),
        model_used
    ))

    quiz_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "quiz_id": quiz_id,
        "job_role": job_role,
        "total_questions": total_questions,
        "current_difficulty": initial_difficulty,
        "first_question": first_question,
        "model_used": model_used
    }

def record_answer(payload):
    """
    Records a user's answer to a quiz question, adjusts score, updates adaptive difficulty,
    and optionally attaches the next question.
    """
    quiz_id = payload.get("quiz_id")
    question_id = payload.get("question_id")
    selected_option = payload.get("selected_option", "")
    is_correct = bool(payload.get("is_correct", False))
    correct_answer = payload.get("correct_answer", "")
    explanation = payload.get("explanation", "")
    next_difficulty = payload.get("next_difficulty", "medium")
    next_question = payload.get("next_question")
    time_taken_seconds = payload.get("time_taken_seconds", 0)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"success": False, "error": {"code": "QUIZ_NOT_FOUND", "message": f"Quiz #{quiz_id} not found."}}

    questions_data = json.loads(row["questions_data"]) if row["questions_data"] else []
    answers_data = json.loads(row["answers_data"]) if row["answers_data"] else []
    current_score = row["score"]
    current_idx = row["current_question_index"]
    total_q = row["total_questions"]

    # Match target question info
    target_q = next((q for q in questions_data if q.get("id") == question_id), None)
    if not target_q and current_idx < len(questions_data):
        target_q = questions_data[current_idx]

    question_text = target_q.get("question", "") if target_q else ""
    skill = target_q.get("skill", "") if target_q else ""
    difficulty = target_q.get("difficulty", "medium") if target_q else "medium"
    options = target_q.get("options", []) if target_q else []

    answer_record = {
        "question_id": question_id,
        "question_index": current_idx + 1,
        "skill": skill,
        "difficulty": difficulty,
        "question": question_text,
        "options": options,
        "user_answer": selected_option,
        "correct_answer": correct_answer,
        "is_correct": is_correct,
        "explanation": explanation,
        "time_taken_seconds": time_taken_seconds,
        "answered_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }

    answers_data.append(answer_record)
    new_score = current_score + (1 if is_correct else 0)
    new_idx = current_idx + 1
    new_pct = round((new_score / total_q) * 100.0, 1) if total_q > 0 else 0.0

    if next_question:
        questions_data.append(next_question)

    cursor.execute("""
    UPDATE quizzes SET
        score = ?,
        score_percentage = ?,
        current_question_index = ?,
        current_difficulty = ?,
        questions_data = ?,
        answers_data = ?
    WHERE id = ?;
    """, (
        new_score,
        new_pct,
        new_idx,
        next_difficulty,
        json.dumps(questions_data),
        json.dumps(answers_data),
        quiz_id
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "quiz_id": quiz_id,
        "question_id": question_id,
        "is_correct": is_correct,
        "correct_answer": correct_answer,
        "explanation": explanation,
        "score": new_score,
        "score_percentage": new_pct,
        "current_question_index": new_idx,
        "next_difficulty": next_difficulty,
        "next_question": next_question
    }

def finish_quiz(payload):
    """
    Finalizes a quiz session with weak areas, strong areas, and recommended topics.
    """
    quiz_id = payload.get("quiz_id")
    weak_areas = payload.get("weak_areas", [])
    strong_areas = payload.get("strong_areas", [])
    recommended_topics = payload.get("recommended_topics", [])
    summary_notes = payload.get("summary_notes", "")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"success": False, "error": {"code": "QUIZ_NOT_FOUND", "message": f"Quiz #{quiz_id} not found."}}

    score = row["score"]
    total_q = row["total_questions"]
    score_pct = round((score / total_q) * 100.0, 1) if total_q > 0 else 0.0
    answers_data = json.loads(row["answers_data"]) if row["answers_data"] else []

    # If weak/strong areas were not generated by AI, calculate deterministic heuristics
    if not weak_areas or not strong_areas:
        skill_stats = {}
        for ans in answers_data:
            s = ans.get("skill", "General")
            if s not in skill_stats:
                skill_stats[s] = {"correct": 0, "total": 0, "difficulties": []}
            skill_stats[s]["total"] += 1
            if ans.get("is_correct"):
                skill_stats[s]["correct"] += 1
            skill_stats[s]["difficulties"].append(ans.get("difficulty", "medium"))

        if not weak_areas:
            computed_weak = []
            for s, st in skill_stats.items():
                if st["correct"] < st["total"]:
                    computed_weak.append({
                        "skill": s,
                        "reason": f"Missed {st['total'] - st['correct']} of {st['total']} question(s) tested.",
                        "missed_count": st["total"] - st["correct"],
                        "difficulty_level": st["difficulties"][-1] if st["difficulties"] else "medium",
                        "recommended_action": f"Review core conceptual syntax and practical patterns for {s}."
                    })
            weak_areas = computed_weak

        if not strong_areas:
            computed_strong = []
            for s, st in skill_stats.items():
                if st["correct"] == st["total"] and st["total"] > 0:
                    computed_strong.append({
                        "skill": s,
                        "mastery_level": "High" if "hard" in st["difficulties"] else "Proficient",
                        "correct_count": st["correct"],
                        "highest_difficulty_cleared": "Hard" if "hard" in st["difficulties"] else ("Medium" if "medium" in st["difficulties"] else "Easy")
                    })
            strong_areas = computed_strong

    if not recommended_topics and weak_areas:
        recommended_topics = [
            {
                "topic": f"Advanced {w['skill']} Architectures & Best Practices",
                "skill": w["skill"],
                "importance": "High",
                "estimated_study_time": "2-4 hours",
                "description": f"Focus on core troubleshooting, design principles, and syntax edge cases in {w['skill']}.",
                "recommended_practice": f"Build a focused 30-minute coding exercise or review official {w['skill']} documentation."
            }
            for w in weak_areas[:4]
        ]

    cursor.execute("""
    UPDATE quizzes SET
        status = 'completed',
        score_percentage = ?,
        weak_areas = ?,
        strong_areas = ?,
        recommended_topics = ?,
        summary_notes = ?,
        completed_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    """, (
        score_pct,
        json.dumps(weak_areas),
        json.dumps(strong_areas),
        json.dumps(recommended_topics),
        summary_notes,
        quiz_id
    ))

    conn.commit()

    # Re-fetch full updated record
    cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
    updated = cursor.fetchone()
    conn.close()

    return {
        "success": True,
        "quiz": format_quiz_row(updated)
    }

def get_quiz_by_id(payload):
    """
    Retrieves a single quiz by ID with parsed JSON payloads.
    """
    quiz_id = payload.get("id") or payload.get("quiz_id")
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"success": False, "error": {"code": "NOT_FOUND", "message": f"Quiz #{quiz_id} not found."}}

    return {
        "success": True,
        "quiz": format_quiz_row(row)
    }

def get_quiz_history(payload):
    """
    Retrieves a list of previous quiz attempts.
    """
    user_id = payload.get("user_id")
    limit = int(payload.get("limit", 20))

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("""
        SELECT * FROM quizzes
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY created_at DESC
        LIMIT ?;
        """, (user_id, limit))
    else:
        cursor.execute("""
        SELECT * FROM quizzes
        ORDER BY created_at DESC
        LIMIT ?;
        """, (limit,))

    rows = cursor.fetchall()
    conn.close()

    history = [format_quiz_row(r) for r in rows]
    return {
        "success": True,
        "count": len(history),
        "history": history
    }

def delete_quiz(payload):
    """
    Deletes a specific quiz attempt by ID.
    """
    quiz_id = payload.get("id") or payload.get("quiz_id")
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM quizzes WHERE id = ?", (quiz_id,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()

    return {
        "success": True,
        "deleted": deleted > 0,
        "message": f"Quiz #{quiz_id} deleted."
    }

def format_quiz_row(row):
    """Helper to convert sqlite3.Row into serializable Python dictionary with JSON fields parsed."""
    if not row:
        return None
    d = dict(row)
    for json_col in ["missing_skills", "priority_skills", "questions_data", "answers_data", "weak_areas", "strong_areas", "recommended_topics"]:
        if d.get(json_col):
            try:
                d[json_col] = json.loads(d[json_col])
            except Exception:
                d[json_col] = []
        else:
            d[json_col] = []
    return d

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": {"code": "INVALID_USAGE", "message": "Missing command argument."}}))
        sys.exit(1)

    command = sys.argv[1]
    raw_payload = sys.argv[2] if len(sys.argv) > 2 else "{}"

    try:
        payload = json.loads(raw_payload)
    except Exception as e:
        print(json.dumps({"success": False, "error": {"code": "INVALID_JSON", "message": f"Malformed payload JSON: {str(e)}"}}))
        sys.exit(1)

    try:
        if command == "start_quiz":
            result = start_quiz(payload)
        elif command == "record_answer":
            result = record_answer(payload)
        elif command == "finish_quiz":
            result = finish_quiz(payload)
        elif command == "get_quiz":
            result = get_quiz_by_id(payload)
        elif command == "get_history":
            result = get_quiz_history(payload)
        elif command == "delete_quiz":
            result = delete_quiz(payload)
        else:
            result = {"success": False, "error": {"code": "UNKNOWN_COMMAND", "message": f"Unknown CLI command: {command}"}}

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": {"code": "EXEC_ERROR", "message": str(e)}}))
        sys.exit(1)

if __name__ == "__main__":
    main()
