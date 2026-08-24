from datetime import datetime
from typing import Any, Dict, Optional

def success_response(data: Any, message: str = "Success", status_code: int = 200) -> tuple[Dict[str, Any], int]:
    """Format standardized success JSON response."""
    payload = {
        "success": True,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    return payload, status_code

def error_response(message: str = "An error occurred", error_code: str = "ERROR", status_code: int = 400, details: Optional[Any] = None) -> tuple[Dict[str, Any], int]:
    """Format standardized error JSON response."""
    payload = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "details": details
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    return payload, status_code
