"""
Authentication service for Resume Skill Gap Analyzer.
Handles registration, password hashing (Werkzeug), credential validation, and JWT sessions.
"""

import os
import re
import sqlite3
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from backend.database.db import get_db_connection

SECRET_KEY = os.getenv("SECRET_KEY", "resume-skill-gap-analyzer-super-secret-key-2026")
EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

def validate_registration_payload(name: str, email: str, password: str) -> Tuple[bool, Optional[str]]:
    """Validate registration inputs."""
    if not name or not name.strip():
        return False, "Full name is required."
    if len(name.strip()) < 2:
        return False, "Full name must be at least 2 characters long."
    
    if not email or not email.strip():
        return False, "Email address is required."
    if not EMAIL_REGEX.match(email.strip()):
        return False, "Please provide a valid email address (e.g., user@example.com)."
    
    if not password:
        return False, "Password is required."
    if len(password) < 6:
        return False, "Password must be at least 6 characters long."
        
    return True, None

def generate_token(user_id: int, email: str, name: str) -> str:
    """Generate a signed JWT token."""
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def register_user(name: str, email: str, password: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str], int]:
    """
    Register a new user with Werkzeug password hashing.
    Returns (success, user_data_with_token, error_message, status_code).
    """
    name_clean = name.strip()
    email_clean = email.strip().lower()

    # Validate fields
    is_valid, err_msg = validate_registration_payload(name_clean, email_clean, password)
    if not is_valid:
        return False, None, err_msg, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check duplicate email
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email_clean,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return False, None, "An account with this email already exists. Please login instead.", 409

        # Hash password securely using Werkzeug
        password_hash = generate_password_hash(password, method="scrypt")

        # Insert new user
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name_clean, email_clean, password_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()

        # Fetch created user record
        cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        user_data = {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "created_at": row["created_at"]
        }
        token = generate_token(user_data["id"], user_data["email"], user_data["name"])

        return True, {"user": user_data, "token": token}, "User registered successfully.", 201

    except sqlite3.IntegrityError:
        conn.close()
        return False, None, "An account with this email already exists.", 409
    except Exception as e:
        conn.close()
        return False, None, f"Database error during registration: {str(e)}", 500

def login_user(email: str, password: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str], int]:
    """
    Authenticate user credentials using Werkzeug check_password_hash.
    Returns (success, user_data_with_token, error_message, status_code).
    """
    if not email or not email.strip():
        return False, None, "Email address is required.", 400
    if not password:
        return False, None, "Password is required.", 400

    email_clean = email.strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT id, name, email, password_hash, created_at FROM users WHERE LOWER(email) = ?",
            (email_clean,)
        )
        user = cursor.fetchone()
        conn.close()

        if not user:
            return False, None, "Invalid email or password.", 401

        # Verify Werkzeug hashed password
        if not check_password_hash(user["password_hash"], password):
            return False, None, "Invalid email or password.", 401

        user_data = {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
        token = generate_token(user_data["id"], user_data["email"], user_data["name"])

        return True, {"user": user_data, "token": token}, "Login successful.", 200

    except Exception as e:
        conn.close()
        return False, None, f"Server error during login: {str(e)}", 500

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve user record by ID without password hash."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
    return None
