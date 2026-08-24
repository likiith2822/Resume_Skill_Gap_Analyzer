"""
Resume Skill Gap Analyzer — Flask Backend Entry Point
Phase 1: Project Setup & Health Verification
"""

import os
import sys
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Ensure root directory is on python path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database.db import get_db_connection, check_db_health
from backend.routes.health import health_bp
from backend.routes.auth import auth_bp
from backend.routes.analysis import analysis_bp
from backend.routes.jobs import jobs_bp
from backend.utils.helpers import error_response

# Load environment variables
load_dotenv(BASE_DIR / ".env")

def create_app() -> Flask:
    """Application factory for Flask backend."""
    app = Flask(
        __name__,
        static_folder=str(BASE_DIR / "backend" / "static"),
        template_folder=str(BASE_DIR / "backend" / "static")
    )

    # Configure CORS
    cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
    CORS(app, resources={r"/api/*": {"origins": cors_origins if cors_origins != ["*"] else "*"}})

    # App configuration
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key-resume-analyzer-2026")
    app.config["UPLOAD_FOLDER"] = str(BASE_DIR / "backend" / "uploads")
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max upload

    # Ensure required directories exist
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(str(BASE_DIR / "backend" / "database"), exist_ok=True)

    # Register blueprints
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")

    # Global Error Handlers
    @app.errorhandler(404)
    def handle_not_found(e):
        payload, code = error_response(
            message="The requested endpoint does not exist on this server.",
            error_code="NOT_FOUND",
            status_code=404,
            details=str(e)
        )
        return jsonify(payload), code

    @app.errorhandler(500)
    def handle_server_error(e):
        payload, code = error_response(
            message="An internal server error occurred.",
            error_code="INTERNAL_SERVER_ERROR",
            status_code=500,
            details=str(e)
        )
        return jsonify(payload), code

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    debug = os.getenv("FLASK_ENV", "development") == "development"
    print(f"Starting Flask Backend on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
