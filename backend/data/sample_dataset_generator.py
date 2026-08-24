"""
Sample Salary Dataset Generator for Resume Skill Gap Analyzer.
Generates a realistic demonstration dataset for development, testing, and training
using Scikit-learn regression models (RandomForestRegressor / LinearRegression).

DISCLAIMER: This dataset contains synthetic demonstration data for academic and
educational prototyping. It does not represent real-time compensation data.
"""

import csv
import random
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
CSV_FILE = DATA_DIR / "salary_dataset.csv"

ROLES_BASE_SALARY = {
    "Software Engineer": 78000,
    "Full Stack Developer": 82000,
    "Data Scientist": 88000,
    "AI Engineer": 98000,
    "ML Engineer": 95000,
    "Cloud Engineer": 90000,
    "DevOps Engineer": 89000,
    "Frontend Developer": 74000,
    "Backend Developer": 80000,
    "Cyber Security Analyst": 85000,
    "Mobile Developer": 76000,
    "Data Engineer": 87000
}

EDUCATION_MULTIPLIER = {
    "High School / Bootcamp": 0.92,
    "Associate's Degree": 0.95,
    "Bachelor's Degree": 1.00,
    "Master's Degree": 1.10,
    "Ph.D.": 1.22
}

SKILL_VALUE_BONUS = {
    "Python": 2500,
    "PyTorch": 5500,
    "TensorFlow": 4500,
    "Natural Language Processing": 5000,
    "Large Language Models": 7500,
    "Transformers": 6000,
    "RAG": 6500,
    "React": 3000,
    "TypeScript": 3200,
    "Node.js": 2800,
    "Docker": 3500,
    "Kubernetes": 5000,
    "AWS": 4500,
    "Google Cloud Platform (GCP)": 4200,
    "Terraform": 4000,
    "Microservices": 3800,
    "SQL": 2000,
    "PostgreSQL": 2200,
    "MongoDB": 1800,
    "Scikit-Learn": 3500,
    "Pandas": 1800,
    "FastAPI": 2500,
    "CI/CD": 2800,
    "Linux": 2000,
    "Git": 1000,
    "System Design": 4500,
    "Distributed Systems": 6000,
    "Rust": 5000,
    "Go": 4500,
    "Data Structures": 2000,
    "Algorithms": 2000
}

ROLE_COMMON_SKILLS = {
    "Software Engineer": ["Python", "Java", "Data Structures", "Algorithms", "Git", "SQL", "REST APIs", "CI/CD", "Linux", "Microservices", "System Design"],
    "Full Stack Developer": ["JavaScript", "TypeScript", "React", "Node.js", "Express", "HTML5", "CSS3", "Tailwind CSS", "REST APIs", "PostgreSQL", "MongoDB", "Docker", "Git"],
    "Data Scientist": ["Python", "SQL", "Pandas", "NumPy", "Scikit-Learn", "Statistical Modeling", "Data Visualization", "Machine Learning", "Tableau", "Data Wrangling", "A/B Testing"],
    "AI Engineer": ["Python", "PyTorch", "TensorFlow", "Natural Language Processing", "Large Language Models", "Transformers", "LangChain", "Hugging Face", "RAG", "Vector Databases", "Deep Learning"],
    "ML Engineer": ["Python", "Machine Learning", "Deep Learning", "PyTorch", "Scikit-Learn", "TensorFlow", "MLOps", "Docker", "Kubernetes", "Data Pipelines", "FastAPI", "Pandas"],
    "Cloud Engineer": ["AWS", "Google Cloud Platform (GCP)", "Microsoft Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "DevOps", "Microservices", "System Design"],
    "DevOps Engineer": ["Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "AWS", "Nginx", "Prometheus & Grafana", "Shell / Bash", "Microservices", "Git"],
    "Frontend Developer": ["JavaScript", "TypeScript", "React", "HTML5", "CSS3", "Tailwind CSS", "Redux", "REST APIs", "Git", "Responsive Design"],
    "Backend Developer": ["Python", "Node.js", "Java", "Go", "PostgreSQL", "MongoDB", "REST APIs", "Microservices", "Docker", "SQL", "FastAPI", "System Design"],
    "Cyber Security Analyst": ["Linux", "Networking", "Python", "Security Compliance", "Penetration Testing", "SIEM", "Incident Response", "Cryptography", "AWS"],
    "Mobile Developer": ["React Native", "Flutter", "Swift", "Kotlin", "TypeScript", "REST APIs", "Git", "Mobile UI", "Firebase"],
    "Data Engineer": ["Python", "SQL", "PostgreSQL", "Apache Spark", "Kafka", "Data Pipelines", "AWS", "Docker", "Pandas", "Data Warehousing", "ETL"]
}

def generate_sample_salary_dataset(num_samples=650, seed=42):
    random.seed(seed)
    records = []

    roles = list(ROLES_BASE_SALARY.keys())
    educations = list(EDUCATION_MULTIPLIER.keys())

    for _ in range(num_samples):
        role = random.choices(roles, weights=[15, 15, 12, 10, 10, 10, 8, 8, 8, 5, 5, 5])[0]
        
        # Experience distribution: skewed towards 0-8 years with some 9-15
        exp = round(random.betavariate(1.5, 3.5) * 16, 1)
        if exp < 0: exp = 0.0
        
        # Education distribution
        edu = random.choices(educations, weights=[8, 7, 55, 25, 5])[0]

        # Select a realistic subset of skills for this role
        pool = ROLE_COMMON_SKILLS.get(role, ["Python", "Git", "SQL"])
        num_skills = random.randint(3, min(8, len(pool)))
        selected_skills = random.sample(pool, num_skills)
        
        # Add 10% chance of cross-domain premium skill (e.g. AWS or LLM)
        if random.random() < 0.2:
            extra = random.choice(["AWS", "Docker", "Kubernetes", "Large Language Models", "System Design", "Rust", "Go"])
            if extra not in selected_skills:
                selected_skills.append(extra)

        # Base calculation
        base = ROLES_BASE_SALARY[role]
        
        # Experience curve (exponential diminishing return)
        # 0 yrs: 1.0x, 2 yrs: ~1.18x, 5 yrs: ~1.45x, 10 yrs: ~1.85x, 15 yrs: ~2.15x
        exp_factor = 1.0 + (exp ** 0.82) * 0.12
        
        # Education factor
        edu_factor = EDUCATION_MULTIPLIER[edu]
        
        # Skill bonus sum
        skill_bonus = sum(SKILL_VALUE_BONUS.get(s, 1500) for s in selected_skills)
        
        # Add realistic Gaussian noise (+/- 5%)
        noise = random.gauss(1.0, 0.04)
        
        calculated_salary = (base * exp_factor * edu_factor + skill_bonus) * noise
        final_salary = int(round(calculated_salary / 500) * 500)  # Round to nearest $500
        
        # Bounds check
        final_salary = max(45000, min(280000, final_salary))

        records.append({
            "job_role": role,
            "experience_years": exp,
            "education_level": edu,
            "skills": ", ".join(selected_skills),
            "salary": final_salary,
            "is_demonstration": "True"
        })

    # Write to CSV
    with open(CSV_FILE, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["job_role", "experience_years", "education_level", "skills", "salary", "is_demonstration"])
        writer.writeheader()
        writer.writerows(records)

    print(f"Generated {len(records)} sample salary records in {CSV_FILE}")
    return CSV_FILE

if __name__ == "__main__":
    generate_sample_salary_dataset()
