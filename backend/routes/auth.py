"""
Authentication routes blueprint for Resume Skill Gap Analyzer.
Provides endpoints for registration, login, logout, and current user validation.
"""

from functools import wraps
from flask import Blueprint, request, jsonify
from backend.services.auth_service import (
    register_user,
    login_user,
    decode_token,
    get_user_by_id
)
from backend.utils.helpers import success_response, error_response

auth_bp = Blueprint("auth", __name__)

def token_required(f):
    """Decorator to enforce authenticated session/token on protected endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        token = None

        if auth_header:
            parts = auth_header.split(" ")
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
            else:
                token = auth_header
        elif request.cookies.get("auth_token"):
            token = request.cookies.get("auth_token")

        if not token:
            payload, code = error_response(
                message="Authentication token is missing. Please log in.",
                error_code="UNAUTHORIZED",
                status_code=401
            )
            return jsonify(payload), code

        decoded = decode_token(token)
        if not decoded:
            payload, code = error_response(
                message="Invalid or expired session token. Please log in again.",
                error_code="INVALID_TOKEN",
                status_code=401
            )
            return jsonify(payload), code

        user = get_user_by_id(decoded.get("sub"))
        if not user:
            payload, code = error_response(
                message="User account associated with this token not found.",
                error_code="USER_NOT_FOUND",
                status_code=404
            )
            return jsonify(payload), code

        return f(current_user=user, *args, **kwargs)

    return decorated

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    POST /api/auth/register
    Register a new user account.
    Validates required fields, email format, password security, and duplicate emails.
    """
    data = request.get_json() or {}
    name = data.get("name", "")
    email = data.get("email", "")
    password = data.get("password", "")

    success, result, message, status_code = register_user(name, email, password)

    if not success:
        payload, code = error_response(
            message=message or "Registration failed.",
            error_code="REGISTRATION_FAILED" if status_code != 409 else "DUPLICATE_EMAIL",
            status_code=status_code
        )
        return jsonify(payload), code

    payload, code = success_response(
        data=result,
        message=message or "Registration successful.",
        status_code=status_code
    )
    resp = jsonify(payload)
    # Also set secure cookie for convenience
    if result and "token" in result:
        resp.set_cookie(
            "auth_token",
            result["token"],
            httponly=True,
            samesite="Lax",
            max_age=7 * 24 * 3600
        )
    return resp, code

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Authenticate user credentials against Werkzeug password hash.
    """
    data = request.get_json() or {}
    email = data.get("email", "")
    password = data.get("password", "")

    success, result, message, status_code = login_user(email, password)

    if not success:
        payload, code = error_response(
            message=message or "Authentication failed.",
            error_code="INVALID_CREDENTIALS" if status_code == 401 else "AUTH_ERROR",
            status_code=status_code
        )
        return jsonify(payload), code

    payload, code = success_response(
        data=result,
        message=message or "Login successful.",
        status_code=status_code
    )
    resp = jsonify(payload)
    if result and "token" in result:
        resp.set_cookie(
            "auth_token",
            result["token"],
            httponly=True,
            samesite="Lax",
            max_age=7 * 24 * 3600
        )
    return resp, code

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """
    POST /api/auth/logout
    Invalidate client-side session / clear auth cookie.
    """
    payload, code = success_response(
        data={"logged_out": True},
        message="Logged out successfully."
    )
    resp = jsonify(payload)
    resp.delete_cookie("auth_token")
    return resp, code

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user(current_user):
    """
    GET /api/auth/me
    Fetch current authenticated user profile. Protected endpoint.
    """
    payload, code = success_response(
        data={"user": current_user},
        message="Current user profile retrieved successfully."
    )
    return jsonify(payload), code
