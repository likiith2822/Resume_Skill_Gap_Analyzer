"""
Database initialization script for Resume Skill Gap Analyzer.
Sets up base tables for users, parsed resumes, job requirements, and skill analyses.
Seeds initial 6 job roles with required skills and priority flags.
"""

import json
import sqlite3
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "database" / "app.db"))

INITIAL_JOB_ROLES = [
    {
        "job_title": "Software Engineer",
        "category": "Engineering",
        "description": "Core software engineering role building scalable backend services, algorithmic problem solving, clean system design, and reliable software lifecycle maintenance.",
        "required_skills": [
            "Python", "Java", "C++", "Data Structures", "Algorithms",
            "Git", "SQL", "REST APIs", "Object-Oriented Programming",
            "Problem Solving", "CI/CD", "Linux", "Unit Testing", "Microservices"
        ],
        "priority_skills": [
            "Data Structures", "Algorithms", "Python", "SQL", "Git", "REST APIs"
        ],
        "experience_level": "Entry / Mid-Level"
    },
    {
        "job_title": "Data Scientist",
        "category": "Data & Analytics",
        "description": "Data science role analyzing large structured and unstructured datasets, building statistical modeling pipelines, extracting insights, and developing predictive machine learning models.",
        "required_skills": [
            "Python", "R", "SQL", "Data Analysis", "Pandas", "NumPy",
            "Scikit-Learn", "Statistical Modeling", "Data Visualization",
            "Machine Learning", "Tableau", "Data Wrangling", "A/B Testing", "Statistics"
        ],
        "priority_skills": [
            "Python", "SQL", "Data Analysis", "Pandas", "Machine Learning", "Statistical Modeling"
        ],
        "experience_level": "Mid-Level"
    },
    {
        "job_title": "AI Engineer",
        "category": "Artificial Intelligence",
        "description": "AI engineering role developing and deploying modern foundation models, Large Language Models (LLMs), RAG architectures, prompt engineering, and generative AI pipelines.",
        "required_skills": [
            "Python", "PyTorch", "TensorFlow", "Natural Language Processing",
            "Large Language Models", "Transformers", "LangChain", "Hugging Face",
            "RAG (Retrieval-Augmented Generation)", "Vector Databases", "Deep Learning",
            "Computer Vision", "MLOps", "OpenAI API"
        ],
        "priority_skills": [
            "Python", "PyTorch", "Natural Language Processing", "Large Language Models",
            "Transformers", "RAG (Retrieval-Augmented Generation)"
        ],
        "experience_level": "Mid / Senior Level"
    },
    {
        "job_title": "Full Stack Developer",
        "category": "Web Development",
        "description": "Full stack engineering role designing end-to-end web applications, interactive user interfaces with modern React, scalable Node/Express or FastAPI backends, and responsive design systems.",
        "required_skills": [
            "JavaScript", "TypeScript", "React", "Node.js", "Express",
            "HTML5", "CSS3", "Tailwind CSS", "REST APIs", "PostgreSQL",
            "MongoDB", "Git", "Docker", "Redux", "Responsive Design"
        ],
        "priority_skills": [
            "React", "Node.js", "TypeScript", "JavaScript", "REST APIs", "PostgreSQL"
        ],
        "experience_level": "Entry / Mid-Level"
    },
    {
        "job_title": "ML Engineer",
        "category": "Machine Learning",
        "description": "Machine learning engineering role architecting, training, evaluating, and deploying high-performance machine learning models and automated MLOps production pipelines.",
        "required_skills": [
            "Python", "Machine Learning", "Deep Learning", "PyTorch",
            "Scikit-Learn", "TensorFlow", "MLOps", "Docker", "Kubernetes",
            "Data Pipelines", "Model Deployment", "FastAPI", "Git", "Pandas"
        ],
        "priority_skills": [
            "Python", "Machine Learning", "Deep Learning", "PyTorch", "MLOps", "Model Deployment"
        ],
        "experience_level": "Mid-Level"
    },
    {
        "job_title": "Cloud Engineer",
        "category": "Cloud & Infrastructure",
        "description": "Cloud and DevOps platform engineering role managing container orchestration with Kubernetes, multi-cloud infrastructure (AWS/GCP/Azure), Terraform IaC, and reliable CI/CD pipelines.",
        "required_skills": [
            "AWS", "Google Cloud Platform (GCP)", "Microsoft Azure", "Docker",
            "Kubernetes", "Terraform", "CI/CD", "Linux", "DevOps",
            "Infrastructure as Code", "Nginx", "Prometheus & Grafana", "Shell / Bash", "Networking"
        ],
        "priority_skills": [
            "AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux"
        ],
        "experience_level": "Mid / Senior Level"
    }
]

def get_db_connection():
    db_file = Path(DB_PATH)
    db_file.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Base System Info
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_info (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Users Table (Part 2: Auth)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed Default Demo Student User if not exists
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", ("student@college.edu",))
    if not cursor.fetchone():
        # PBKDF2:sha256 hash for 'Password123!'
        demo_salt = "d3m0s4lt2026"
        demo_iter = 260000
        import hashlib
        demo_derived = hashlib.pbkdf2_hmac("sha256", b"Password123!", demo_salt.encode("utf-8"), demo_iter)
        demo_hash = f"pbkdf2:sha256:{demo_iter}${demo_salt}${demo_derived.hex()}"
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            ("Alex Chen (Demo Student)", "student@college.edu", demo_hash)
        )

    # Candidate Profiles
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        github_username TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed Default Demo Candidate Profile if not exists
    cursor.execute("SELECT id FROM candidates WHERE LOWER(email) = ?", ("student@college.edu",))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO candidates (name, email, github_username) VALUES (?, ?, ?)",
            ("Alex Chen", "student@college.edu", "alexchen-dev")
        )

    # Resumes Table (Part 3)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        candidate_id INTEGER,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        raw_text TEXT,
        parsed_data JSON,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );
    """)

    # Extracted Skills Table (Part 4)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS extracted_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id INTEGER,
        skill_name TEXT NOT NULL,
        canonical_name TEXT NOT NULL,
        category TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        occurrences INTEGER DEFAULT 1,
        matched_as JSON,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_extracted_skills_resume_id ON extracted_skills(resume_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_extracted_skills_canonical ON extracted_skills(canonical_name);")

    # Target Job Profiles Table (Part 5: Job Roles & Semantic Matching)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS target_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_title TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        required_skills JSON NOT NULL,
        priority_skills JSON,
        experience_level TEXT DEFAULT 'Mid-Level',
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Schema migration helper for target_jobs
    cursor.execute("PRAGMA table_info(target_jobs);")
    target_jobs_cols = [col[1] for col in cursor.fetchall()]
    if "priority_skills" not in target_jobs_cols:
        cursor.execute("ALTER TABLE target_jobs ADD COLUMN priority_skills JSON;")
    if "experience_level" not in target_jobs_cols:
        cursor.execute("ALTER TABLE target_jobs ADD COLUMN experience_level TEXT DEFAULT 'Mid-Level';")

    # Seed Initial 6 Job Roles
    for job in INITIAL_JOB_ROLES:
        cursor.execute("""
        INSERT INTO target_jobs (job_title, category, required_skills, priority_skills, experience_level, description)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(job_title) DO UPDATE SET
            category = excluded.category,
            required_skills = excluded.required_skills,
            priority_skills = excluded.priority_skills,
            experience_level = excluded.experience_level,
            description = excluded.description;
        """, (
            job["job_title"],
            job["category"],
            json.dumps(job["required_skills"]),
            json.dumps(job["priority_skills"]),
            job["experience_level"],
            job["description"]
        ))

    # Analysis Results Table (Part 5)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS skill_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id INTEGER,
        target_job_id INTEGER NOT NULL,
        match_score REAL NOT NULL,
        matching_skills JSON NOT NULL,
        missing_skills JSON NOT NULL,
        similarity_matrix JSON,
        recommendations JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_job_id) REFERENCES target_jobs(id)
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_skill_analyses_resume ON skill_analyses(resume_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_skill_analyses_job ON skill_analyses(target_job_id);")

    # Learning Roadmaps Table (Part 6: Gemini Learning Roadmap)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS learning_roadmaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        resume_id INTEGER,
        target_job_id INTEGER,
        job_title TEXT NOT NULL,
        experience_level TEXT NOT NULL,
        match_percentage REAL,
        matched_skills JSON,
        missing_skills JSON NOT NULL,
        recommended_skills JSON,
        priority_skills JSON,
        duration_weeks INTEGER DEFAULT 4,
        weekly_plan JSON NOT NULL,
        overview TEXT,
        advice TEXT,
        model_used TEXT DEFAULT 'gemini-3.7-flash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
        FOREIGN KEY (target_job_id) REFERENCES target_jobs(id) ON DELETE SET NULL
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON learning_roadmaps(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_roadmaps_resume ON learning_roadmaps(resume_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_roadmaps_job ON learning_roadmaps(target_job_id);")

    # GitHub Profiles Table (Part 7: GitHub Portfolio Profiler)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS github_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        profile_url TEXT NOT NULL,
        avatar_url TEXT,
        name TEXT,
        bio TEXT,
        company TEXT,
        location TEXT,
        blog TEXT,
        twitter_username TEXT,
        public_repos INTEGER DEFAULT 0,
        public_gists INTEGER DEFAULT 0,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        total_stars INTEGER DEFAULT 0,
        total_forks INTEGER DEFAULT 0,
        primary_language TEXT,
        languages JSON,
        top_repositories JSON,
        activity_summary JSON,
        score_breakdown JSON,
        skill_score INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_github_username ON github_profiles(username);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_github_user_id ON github_profiles(user_id);")

    # ATS Resume Rewrites Table (Part 8: ATS Resume Rewriter)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ats_rewrites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        resume_id INTEGER,
        target_job_id INTEGER,
        job_title TEXT NOT NULL,
        candidate_name TEXT,
        ats_score INTEGER NOT NULL,
        score_breakdown JSON NOT NULL,
        professional_summary TEXT NOT NULL,
        improved_bullet_points JSON NOT NULL,
        relevant_keywords JSON NOT NULL,
        ats_resume_content TEXT NOT NULL,
        suggestions_audit JSON,
        model_used TEXT DEFAULT 'gemini-3.7-flash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
        FOREIGN KEY (target_job_id) REFERENCES target_jobs(id) ON DELETE SET NULL
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ats_rewrites_user ON ats_rewrites(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ats_rewrites_resume ON ats_rewrites(resume_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ats_rewrites_job ON ats_rewrites(target_job_id);")

    # Cover Letters Table (Part 8: Cover Letter Generator)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cover_letters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        resume_id INTEGER,
        target_job_id INTEGER,
        job_title TEXT NOT NULL,
        candidate_name TEXT NOT NULL,
        company_name TEXT,
        recipient_name TEXT,
        tone TEXT DEFAULT 'Professional & Confident',
        cover_letter_text TEXT NOT NULL,
        key_highlights JSON,
        model_used TEXT DEFAULT 'gemini-3.7-flash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
        FOREIGN KEY (target_job_id) REFERENCES target_jobs(id) ON DELETE SET NULL
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON cover_letters(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cover_letters_resume ON cover_letters(resume_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cover_letters_job ON cover_letters(target_job_id);")

    # Interviews Table (Part 9: AI Mock Interview)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        resume_id INTEGER,
        target_job_id INTEGER,
        job_title TEXT NOT NULL,
        candidate_name TEXT,
        experience_level TEXT DEFAULT 'Mid-Level',
        status TEXT DEFAULT 'in_progress',
        total_questions INTEGER DEFAULT 5,
        answered_questions INTEGER DEFAULT 0,
        overall_score INTEGER DEFAULT 0,
        technical_score INTEGER DEFAULT 0,
        behavioral_score INTEGER DEFAULT 0,
        hr_score INTEGER DEFAULT 0,
        strengths JSON,
        weaknesses JSON,
        feedback TEXT,
        suggested_improvements JSON,
        questions_data JSON NOT NULL,
        answers_data JSON,
        readiness_verdict TEXT,
        model_used TEXT DEFAULT 'gemini-3.7-flash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
        FOREIGN KEY (target_job_id) REFERENCES target_jobs(id) ON DELETE SET NULL
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_interviews_resume ON interviews(resume_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_interviews_job ON interviews(target_job_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);")

    # Salary Predictions Table (Part 10: Market Salary Predictor)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS salary_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        resume_id INTEGER,
        target_job_id INTEGER,
        job_role TEXT NOT NULL,
        experience_years REAL NOT NULL,
        education_level TEXT NOT NULL,
        skills JSON NOT NULL,
        min_salary INTEGER NOT NULL,
        expected_salary INTEGER NOT NULL,
        max_salary INTEGER NOT NULL,
        currency TEXT DEFAULT 'USD',
        insights JSON,
        model_version TEXT DEFAULT 'scikit-learn-randomforest-v1',
        disclaimer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
        FOREIGN KEY (target_job_id) REFERENCES target_jobs(id) ON DELETE SET NULL
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_salary_user ON salary_predictions(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_salary_resume ON salary_predictions(resume_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_salary_job ON salary_predictions(target_job_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_salary_role ON salary_predictions(job_role);")

    # Adaptive Knowledge Quizzes Table (Part 11: Adaptive Knowledge Quiz)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        resume_id INTEGER,
        target_job_id INTEGER,
        job_role TEXT NOT NULL,
        missing_skills JSON NOT NULL,
        priority_skills JSON,
        status TEXT DEFAULT 'in_progress',
        current_difficulty TEXT DEFAULT 'medium',
        total_questions INTEGER DEFAULT 5,
        current_question_index INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        score_percentage REAL DEFAULT 0.0,
        weak_areas JSON,
        strong_areas JSON,
        recommended_topics JSON,
        questions_data JSON NOT NULL,
        answers_data JSON DEFAULT '[]',
        summary_notes TEXT,
        model_used TEXT DEFAULT 'gemini-3.7-flash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
        FOREIGN KEY (target_job_id) REFERENCES target_jobs(id) ON DELETE SET NULL
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_quizzes_resume ON quizzes(resume_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_quizzes_job ON quizzes(target_job_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);")

    # System Info Version Stamp
    cursor.execute("""
    INSERT OR REPLACE INTO system_info (key, value)
    VALUES ('schema_version', '1.11.0'), ('project_name', 'Resume-Skill-Gap-Analyzer');
    """)

    conn.commit()
    conn.close()
    print("Database schema and 6 initial job roles successfully initialized.")

if __name__ == "__main__":
    init_database()

