"""
CLI Helper for SQLite User Authentication Operations.
Uses standard Python sqlite3 and secure password hashing (Werkzeug compatible format pbkdf2:sha256).
"""

import sys
import os
import json
import sqlite3
import re
import secrets
import hashlib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "backend" / "database" / "app.db"))
EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

def get_connection():
    db_file = Path(DB_PATH)
    db_file.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    
    # Ensure users table exists
    conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()
    return conn

def hash_password(password: str) -> str:
    """Generate Werkzeug-compatible pbkdf2:sha256 password hash."""
    try:
        from werkzeug.security import generate_password_hash
        return generate_password_hash(password)
    except Exception:
        salt = secrets.token_hex(16)
        iterations = 260000
        derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
        return f"pbkdf2:sha256:{iterations}${salt}${derived.hex()}"

def verify_password(stored_hash: str, password: str) -> bool:
    """Verify password against Werkzeug-compatible pbkdf2:sha256 hash or plain werkzeug format."""
    try:
        from werkzeug.security import check_password_hash
        if check_password_hash(stored_hash, password):
            return True
    except Exception:
        pass

    try:
        if stored_hash.startswith("pbkdf2:sha256:"):
            parts = stored_hash.split("$")
            if len(parts) == 3:
                header, salt, expected_hex = parts
                iter_str = header.split(":")[-1]
                iterations = int(iter_str)
                derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
                return hmac_compare(derived.hex(), expected_hex)
        elif stored_hash.startswith("scrypt:"):
            # If scrypt was used
            parts = stored_hash.split("$")
            if len(parts) >= 3:
                salt = parts[1]
                expected_hex = parts[2]
                derived = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1)
                return hmac_compare(derived.hex(), expected_hex)
        # Fallback comparison if plain string or simple hash
        if stored_hash == password:
            return True
        return False
    except Exception:
        return False

def hmac_compare(a: str, b: str) -> bool:
    import hmac
    return hmac.compare_digest(a, b)

def register(name: str, email: str, password: str):
    name = (name or "").strip()
    email = (email or "").strip().lower()

    if not name:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Full name is required."}}, 400
    if len(name) < 2:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Full name must be at least 2 characters long."}}, 400
    
    if not email:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Email address is required."}}, 400
    if not EMAIL_REGEX.match(email):
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Please enter a valid email address."}}, 400
    
    if not password:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Password is required."}}, 400
    if len(password) < 6:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Password must be at least 6 characters long."}}, 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return {"success": False, "error": {"code": "DUPLICATE_EMAIL", "message": "An account with this email address already exists. Please login."}}, 409

        p_hash = hash_password(password)
        cursor.execute("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", (name, email, p_hash))
        user_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
        user = dict(cursor.fetchone())
        conn.close()

        return {
            "success": True,
            "message": "User registered successfully.",
            "data": {
                "user": user
            }
        }, 201
    except Exception as e:
        conn.close()
        return {"success": False, "error": {"code": "DATABASE_ERROR", "message": str(e)}}, 500

def login(email: str, password: str):
    email = (email or "").strip().lower()
    if not email:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Email is required."}}, 400
    if not password:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Password is required."}}, 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, name, email, password_hash, created_at FROM users WHERE LOWER(email) = ?", (email,))
        user = cursor.fetchone()
        conn.close()

        if not user:
            if email == "student@college.edu" and password == "Password123!":
                # Auto-create demo student account
                p_hash = hash_password(password)
                cursor = conn.cursor()
                cursor.execute("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", ("Alex Chen (Demo Student)", email, p_hash))
                user_id = cursor.lastrowid
                conn.commit()
                cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
                user_dict = dict(cursor.fetchone())
                conn.close()
                return {
                    "success": True,
                    "message": "Demo login successful.",
                    "data": {
                        "user": user_dict
                    }
                }, 200

            conn.close()
            return {"success": False, "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password. Please check your credentials or create a new account."}}, 401

        if not verify_password(user["password_hash"], password):
            return {"success": False, "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."}}, 401

        user_dict = {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
        return {
            "success": True,
            "message": "Login successful.",
            "data": {
                "user": user_dict
            }
        }, 200
    except Exception as e:
        conn.close()
        return {"success": False, "error": {"code": "DATABASE_ERROR", "message": str(e)}}, 500

def get_user(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        if not user:
            return {"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found."}}, 404
        return {
            "success": True,
            "data": {
                "user": dict(user)
            }
        }, 200
    except Exception as e:
        conn.close()
        return {"success": False, "error": {"code": "DATABASE_ERROR", "message": str(e)}}, 500

def list_users():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, email, created_at FROM users ORDER BY id DESC")
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {
            "success": True,
            "data": {
                "users": users,
                "count": len(users)
            }
        }, 200
    except Exception as e:
        conn.close()
        return {"success": False, "error": {"code": "DATABASE_ERROR", "message": str(e)}}, 500

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action specified"}))
        sys.exit(1)

    action = sys.argv[1]
    input_data = {}
    if len(sys.argv) > 2:
        try:
            input_data = json.loads(sys.argv[2])
        except Exception:
            pass

    if action == "register":
        res, code = register(input_data.get("name"), input_data.get("email"), input_data.get("password"))
        print(json.dumps(res))
        sys.exit(0 if code in (200, 201) else 1)

    elif action == "login":
        res, code = login(input_data.get("email"), input_data.get("password"))
        print(json.dumps(res))
        sys.exit(0 if code == 200 else 1)

    elif action == "get_user":
        res, code = get_user(input_data.get("user_id"))
        print(json.dumps(res))
        sys.exit(0 if code == 200 else 1)

    elif action == "list_users":
        res, code = list_users()
        print(json.dumps(res))
        sys.exit(0 if code == 200 else 1)

    else:
        print(json.dumps({"error": f"Unknown action: {action}"}))
        sys.exit(1)
