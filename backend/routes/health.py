from datetime import datetime
import os
from flask import Blueprint, jsonify
from backend.database.db import check_db_health
from backend.utils.helpers import success_response, error_response

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint to verify backend status, SQLite database,
    and system runtime configuration.
    """
    try:
        db_status = check_db_health()
        
        health_data = {
            "status": "healthy",
            "service": "Resume Skill Gap Analyzer Backend",
            "version": "1.0.0",
            "phase": "Part 1 - Project Setup & Architecture Verification",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "database": db_status,
            "environment": os.getenv("FLASK_ENV", "development"),
            "technologies": {
                "framework": "Flask 3.0+",
                "database": "SQLite 3",
                "nlp": ["spaCy", "NLTK", "PyMuPDF", "python-docx"],
                "semantic_similarity": "Sentence Transformers (all-MiniLM-L6-v2)",
                "ai": "Google Gemini API",
                "ml": "Scikit-learn",
                "external": "GitHub REST API",
                "charts": "Chart.js",
                "deployment": "Render"
            }
        }
        
        payload, code = success_response(
            data=health_data,
            message="Backend service is operational and SQLite database connected."
        )
        return jsonify(payload), code
        
    except Exception as e:
        payload, code = error_response(
            message=f"Health check failed: {str(e)}",
            error_code="SERVICE_UNHEALTHY",
            status_code=500,
            details=str(e)
        )
        return jsonify(payload), code
