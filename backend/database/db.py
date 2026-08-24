import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "database" / "app.db"))

def get_db_connection():
    """Create and return a database connection with row factory."""
    db_file = Path(DB_PATH)
    db_file.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    return conn

def check_db_health():
    """Verify SQLite database connectivity and return status."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        return {
            "status": "connected",
            "type": "SQLite",
            "path": str(DB_PATH),
            "healthy": True
        }
    except Exception as e:
        return {
            "status": "error",
            "type": "SQLite",
            "error": str(e),
            "healthy": False
        }
