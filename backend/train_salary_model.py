"""
Train Scikit-Learn Salary Model Script.
Trains and serializes the Scikit-learn RandomForestRegressor model to `models/salary_model.joblib`.
"""

import sys
from pathlib import Path

# Add root directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.data.sample_dataset_generator import generate_sample_salary_dataset
from backend.services.salary_service import salary_service

def main():
    print("=== Training Scikit-Learn Market Salary Model ===")
    print("1. Generating sample demonstration dataset...")
    generate_sample_salary_dataset()

    print("2. Training Scikit-learn RandomForestRegressor pipeline...")
    meta = salary_service.train_model()

    print("\n--- Training Completed Successfully ---")
    print(f"Model Type:        {meta.get('model_type')}")
    print(f"R² Score:          {meta.get('r2_score')}")
    print(f"Mean Absolute Err: ${meta.get('mae')}")
    print(f"Root Mean Sq Err:  ${meta.get('rmse')}")
    print(f"Saved Path:        models/salary_model.joblib")
    print(f"Training Samples:  {meta.get('training_samples')}")
    print("==================================================")

if __name__ == "__main__":
    main()
