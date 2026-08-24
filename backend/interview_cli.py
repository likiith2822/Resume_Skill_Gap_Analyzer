"""
AI Mock Interview CLI for Resume Skill Gap Analyzer (Part 9).
Handles interview session creation, question & answer tracking, evaluation persistence,
and optional pyttsx3 / SpeechRecognition voice helpers.
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

def create_interview(payload):
    """
    Creates a new mock interview session in SQLite.
    """
    user_id = payload.get("user_id")
    resume_id = payload.get("resume_id")
    target_job_id = payload.get("target_job_id")
    job_title = payload.get("job_title", "Software Engineer")
    candidate_name = payload.get("candidate_name", "Candidate")
    experience_level = payload.get("experience_level", "Mid-Level")
    total_questions = payload.get("total_questions", 5)
    questions_data = payload.get("questions_data", [])
    model_used = payload.get("model_used", "gemini-3.7-flash")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO interviews (
        user_id, resume_id, target_job_id, job_title, candidate_name,
        experience_level, status, total_questions, answered_questions,
        questions_data, answers_data, model_used, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?, 0, ?, '[]', ?, CURRENT_TIMESTAMP);
    """, (
        user_id,
        resume_id,
        target_job_id,
        job_title,
        candidate_name,
        experience_level,
        total_questions,
        json.dumps(questions_data),
        model_used
    ))

    interview_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "interview_id": interview_id,
        "job_title": job_title,
        "candidate_name": candidate_name,
        "experience_level": experience_level,
        "total_questions": total_questions,
        "questions": questions_data,
        "model_used": model_used
    }

def record_answer(payload):
    """
    Records an answer to a specific interview question and stores incremental answer feedback.
    """
    interview_id = payload.get("interview_id")
    question_id = payload.get("question_id")
    question_text = payload.get("question_text", "")
    category = payload.get("category", "technical")
    target_skill = payload.get("target_skill", "")
    user_answer = payload.get("user_answer", "")
    input_type = payload.get("input_type", "text")
    score = payload.get("score", 75)
    feedback = payload.get("feedback", "")
    strengths = payload.get("strengths", [])
    areas_for_improvement = payload.get("areas_for_improvement", [])
    sample_improved_answer = payload.get("sample_improved_answer", "")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT questions_data, answers_data, total_questions FROM interviews WHERE id = ?", (interview_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"success": False, "error": f"Interview with ID {interview_id} not found."}

    questions_data = json.loads(row["questions_data"] or "[]")
    answers_data = json.loads(row["answers_data"] or "[]")

    answer_entry = {
        "question_id": question_id,
        "question_text": question_text,
        "category": category,
        "target_skill": target_skill,
        "user_answer": user_answer,
        "input_type": input_type,
        "score": score,
        "feedback": feedback,
        "strengths": strengths,
        "areas_for_improvement": areas_for_improvement,
        "sample_improved_answer": sample_improved_answer,
        "answered_at": datetime.utcnow().isoformat()
    }

    # Replace if previously answered, or append
    existing_idx = next((i for i, a in enumerate(answers_data) if a.get("question_id") == question_id), None)
    if existing_idx is not None:
        answers_data[existing_idx] = answer_entry
    else:
        answers_data.append(answer_entry)

    answered_count = len(answers_data)

    cursor.execute("""
    UPDATE interviews 
    SET answers_data = ?, answered_questions = ?
    WHERE id = ?
    """, (json.dumps(answers_data), answered_count, interview_id))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "interview_id": interview_id,
        "question_id": question_id,
        "answered_questions": answered_count,
        "total_questions": row["total_questions"],
        "answer_feedback": answer_entry
    }

def save_evaluation(payload):
    """
    Saves final comprehensive evaluation results into the interview session.
    """
    interview_id = payload.get("interview_id")
    overall_score = payload.get("overall_score", 0)
    technical_score = payload.get("technical_score", 0)
    behavioral_score = payload.get("behavioral_score", 0)
    hr_score = payload.get("hr_score", 0)
    strengths = payload.get("strengths", [])
    weaknesses = payload.get("weaknesses", [])
    feedback = payload.get("feedback", "")
    suggested_improvements = payload.get("suggested_improvements", [])
    readiness_verdict = payload.get("readiness_verdict", "Candidate Evaluated")
    model_used = payload.get("model_used", "gemini-3.7-flash")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM interviews WHERE id = ?", (interview_id,))
    if not cursor.fetchone():
        conn.close()
        return {"success": False, "error": f"Interview with ID {interview_id} not found."}

    cursor.execute("""
    UPDATE interviews 
    SET status = 'completed',
        overall_score = ?,
        technical_score = ?,
        behavioral_score = ?,
        hr_score = ?,
        strengths = ?,
        weaknesses = ?,
        feedback = ?,
        suggested_improvements = ?,
        readiness_verdict = ?,
        model_used = ?,
        completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (
        overall_score,
        technical_score,
        behavioral_score,
        hr_score,
        json.dumps(strengths),
        json.dumps(weaknesses),
        feedback,
        json.dumps(suggested_improvements),
        readiness_verdict,
        model_used,
        interview_id
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "interview_id": interview_id,
        "overall_score": overall_score,
        "technical_score": technical_score,
        "behavioral_score": behavioral_score,
        "hr_score": hr_score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "feedback": feedback,
        "suggested_improvements": suggested_improvements,
        "readiness_verdict": readiness_verdict,
        "status": "completed"
    }

def get_interview(interview_id):
    """
    Retrieves full interview record by ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM interviews WHERE id = ?", (interview_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"success": False, "error": f"Interview with ID {interview_id} not found."}

    return {
        "success": True,
        "interview": {
            "id": row["id"],
            "user_id": row["user_id"],
            "resume_id": row["resume_id"],
            "target_job_id": row["target_job_id"],
            "job_title": row["job_title"],
            "candidate_name": row["candidate_name"],
            "experience_level": row["experience_level"],
            "status": row["status"],
            "total_questions": row["total_questions"],
            "answered_questions": row["answered_questions"],
            "overall_score": row["overall_score"],
            "technical_score": row["technical_score"],
            "behavioral_score": row["behavioral_score"],
            "hr_score": row["hr_score"],
            "strengths": json.loads(row["strengths"] or "[]"),
            "weaknesses": json.loads(row["weaknesses"] or "[]"),
            "feedback": row["feedback"] or "",
            "suggested_improvements": json.loads(row["suggested_improvements"] or "[]"),
            "readiness_verdict": row["readiness_verdict"] or "",
            "questions": json.loads(row["questions_data"] or "[]"),
            "answers": json.loads(row["answers_data"] or "[]"),
            "model_used": row["model_used"],
            "created_at": row["created_at"],
            "completed_at": row["completed_at"]
        }
    }

def list_interviews(payload):
    """
    Lists recent interview sessions for a user or generally.
    """
    user_id = payload.get("user_id")
    limit = payload.get("limit", 20)

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("""
        SELECT id, user_id, resume_id, target_job_id, job_title, candidate_name, 
               experience_level, status, total_questions, answered_questions,
               overall_score, readiness_verdict, created_at, completed_at
        FROM interviews
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
        """, (user_id, limit))
    else:
        cursor.execute("""
        SELECT id, user_id, resume_id, target_job_id, job_title, candidate_name, 
               experience_level, status, total_questions, answered_questions,
               overall_score, readiness_verdict, created_at, completed_at
        FROM interviews
        ORDER BY id DESC
        LIMIT ?
        """, (limit,))

    rows = cursor.fetchall()
    conn.close()

    interviews = []
    for r in rows:
        interviews.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "resume_id": r["resume_id"],
            "target_job_id": r["target_job_id"],
            "job_title": r["job_title"],
            "candidate_name": r["candidate_name"],
            "experience_level": r["experience_level"],
            "status": r["status"],
            "total_questions": r["total_questions"],
            "answered_questions": r["answered_questions"],
            "overall_score": r["overall_score"],
            "readiness_verdict": r["readiness_verdict"],
            "created_at": r["created_at"],
            "completed_at": r["completed_at"]
        })

    return {"success": True, "interviews": interviews}

def tts_synthesize(payload):
    """
    Uses pyttsx3 to synthesize audio or verify text-to-speech engine.
    """
    text = payload.get("text", "Hello, welcome to your AI mock interview.")
    output_filename = payload.get("output_filename", "question_audio.wav")
    
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.setProperty("rate", 160)
        
        # In headless Linux containers, pyttsx3 can save directly to a wav file
        output_path = os.path.join(str(BASE_DIR), "backend", "uploads", output_filename)
        engine.save_to_file(text, output_path)
        engine.runAndWait()
        
        return {
            "success": True,
            "engine": "pyttsx3",
            "message": "Speech successfully synthesized via pyttsx3.",
            "file_path": output_path,
            "text": text
        }
    except Exception as e:
        return {
            "success": False,
            "engine": "pyttsx3_fallback",
            "message": f"pyttsx3 note: {str(e)}. Web Speech API synthesis is active in frontend.",
            "text": text
        }

def stt_transcribe(payload):
    """
    Uses SpeechRecognition to transcribe an audio file.
    """
    audio_path = payload.get("audio_path")
    if not audio_path or not os.path.exists(audio_path):
        return {
            "success": False,
            "error": "Audio file not found for SpeechRecognition."
        }

    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        with sr.AudioFile(audio_path) as source:
            audio_data = r.record(source)
            text = r.recognize_google(audio_data)
            return {
                "success": True,
                "engine": "SpeechRecognition",
                "transcript": text
            }
    except Exception as e:
        return {
            "success": False,
            "engine": "SpeechRecognition_fallback",
            "error": f"SpeechRecognition transcription: {str(e)}"
        }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing action argument"}))
        sys.exit(1)

    action = sys.argv[1]
    payload = {}
    if len(sys.argv) > 2:
        try:
            payload = json.loads(sys.argv[2])
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Invalid JSON payload: {str(e)}"}))
            sys.exit(1)

    if action == "create_interview":
        res = create_interview(payload)
        print(json.dumps(res))
    elif action == "record_answer":
        res = record_answer(payload)
        print(json.dumps(res))
    elif action == "save_evaluation":
        res = save_evaluation(payload)
        print(json.dumps(res))
    elif action == "get_interview":
        interview_id = payload.get("id") or (int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 0)
        res = get_interview(interview_id)
        print(json.dumps(res))
    elif action == "list_interviews":
        res = list_interviews(payload)
        print(json.dumps(res))
    elif action == "tts_synthesize":
        res = tts_synthesize(payload)
        print(json.dumps(res))
    elif action == "stt_transcribe":
        res = stt_transcribe(payload)
        print(json.dumps(res))
    else:
        print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
