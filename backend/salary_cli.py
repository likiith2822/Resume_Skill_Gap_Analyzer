"""
CLI Interface for Market Salary Predictor using Scikit-Learn.
Invoked by Express API or directly for testing and evaluation.
"""

import sys
import json
import os
from pathlib import Path

# Add root directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.services.salary_service import salary_service

def predict_action(payload):
    job_role = payload.get("job_role", "Software Engineer")
    experience_years = float(payload.get("experience_years", 0.0))
    education_level = payload.get("education_level", "Bachelor's Degree")
    skills = payload.get("skills", [])
    resume_id = payload.get("resume_id")
    target_job_id = payload.get("target_job_id")
    user_id = payload.get("user_id")

    try:
        prediction = salary_service.predict_salary(
            job_role=job_role,
            experience_years=experience_years,
            education_level=education_level,
            skills=skills,
            resume_id=resume_id,
            target_job_id=target_job_id,
            user_id=user_id
        )
        return {
            "success": True,
            "message": f"Salary prediction computed for '{job_role}' ({experience_years} yrs exp).",
            "data": prediction
        }
    except Exception as e:
        return {
            "success": False,
            "error": {"code": "PREDICTION_FAILED", "message": str(e)}
        }

def get_prediction_action(payload):
    pred_id = payload.get("id") or payload.get("prediction_id")
    if not pred_id:
        return {
            "success": False,
            "error": {"code": "MISSING_ID", "message": "Prediction ID is required."}
        }

    prediction = salary_service.get_prediction_by_id(int(pred_id))
    if not prediction:
        return {
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Salary prediction #{pred_id} not found."}
        }

    return {
        "success": True,
        "message": f"Salary prediction #{pred_id} retrieved.",
        "data": prediction
    }

def list_predictions_action(payload):
    limit = int(payload.get("limit", 20))
    user_id = payload.get("user_id")
    predictions = salary_service.list_predictions(limit=limit, user_id=user_id)
    return {
        "success": True,
        "message": f"Retrieved {len(predictions)} past salary predictions.",
        "data": {
            "predictions": predictions,
            "total": len(predictions)
        }
    }

def train_model_action(payload):
    try:
        meta = salary_service.train_model()
        return {
            "success": True,
            "message": "Scikit-learn RandomForestRegressor model trained and serialized.",
            "data": meta
        }
    except Exception as e:
        return {
            "success": False,
            "error": {"code": "TRAIN_FAILED", "message": str(e)}
        }

def get_metadata_action(payload):
    meta = salary_service.get_metadata()
    return {
        "success": True,
        "message": "Market Salary Predictor metadata retrieved.",
        "data": meta
    }

ACTIONS = {
    "predict": predict_action,
    "get_prediction": get_prediction_action,
    "list_predictions": list_predictions_action,
    "train_model": train_model_action,
    "get_metadata": get_metadata_action
}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": {"code": "INVALID_USAGE", "message": "Usage: python salary_cli.py <action> [payload_json]"}
        }))
        sys.exit(1)

    action = sys.argv[1]
    payload = {}
    if len(sys.argv) > 2:
        try:
            payload = json.loads(sys.argv[2])
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": {"code": "INVALID_JSON", "message": f"Failed to parse JSON payload: {str(e)}"}
            }))
            sys.exit(1)

    handler = ACTIONS.get(action)
    if not handler:
        print(json.dumps({
            "success": False,
            "error": {"code": "UNKNOWN_ACTION", "message": f"Action '{action}' is not supported."}
        }))
        sys.exit(1)

    result = handler(payload)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
