# Resume Skill Gap Analyzer

A full-stack, AI-powered **Resume Skill Gap Analyzer & Career Acceleration Platform** designed for candidate resume evaluation, precision NLP skill extraction, Sentence Transformers semantic matching, Gemini AI personalized learning roadmaps, GitHub portfolio verification, AI mock interviews with speech recognition/TTS, ATS score auditing & resume re-writing, Scikit-learn market salary prediction, and adaptive technical quizzes.

---

## 1. Project Overview

The **Resume Skill Gap Analyzer** bridges the gap between job seeker qualifications and modern employer requirements. Candidates upload resumes in PDF or DOCX formats, which undergo multi-stage NLP tokenization, lemmatization, and technical skill extraction. Extracted qualifications are matched against target benchmark job specifications using semantic vector embeddings (Sentence Transformers `all-MiniLM-L6-v2`) and Cosine Similarity to compute accurate match scores and identify critical skill gaps.

Powered by **Google Gemini API**, the platform generates personalized multi-week learning roadmaps, conducts interactive AI mock interviews with voice and audio feedback, and optimizes resumes for Applicant Tracking Systems (ATS). A **Scikit-learn** regression model predicts candidate market salary benchmarks, while **GitHub REST API** verifies technical portfolios.

---

## 2. Key Features

- **Authentication & User Management**: Secure session management with Werkzeug password hashing, JWT tokens, and user profile persistence in SQLite.
- **Multi-Format Resume Parser**: PDF and DOCX parsing with PyMuPDF (`fitz`), `python-docx`, and pure-Python zero-dependency fallbacks. Extracts contact details, education, work history, and raw text.
- **5-Stage NLP Skill Extraction**: Text cleaning, tokenization, domain stop-word filtering, POS tagging/lemmatization (spaCy & NLTK), and dictionary-based canonical skill mapping across 500+ technical competencies.
- **Semantic Skill Matching & Gap Analysis**: Sentence Transformers (`all-MiniLM-L6-v2`) dense vector embeddings and Cosine Similarity matrix calculation to evaluate exact, high semantic, and partial skill matches.
- **Gemini AI Learning Roadmap**: Dynamic, multi-week step-by-step career upskilling plans complete with curated learning resources, project ideas, and weekly milestones.
- **GitHub Portfolio Profiler**: Direct GitHub REST API integration analyzing candidate repositories, primary languages, commit activity, stars, and code authenticity scores.
- **AI Mock Interview Simulator**: Interactive technical, behavioral, and HR interview session with voice synthesis (TTS), speech-to-text recording, and STAR-method scoring criteria.
- **ATS Resume Rewriter & Cover Letter Generator**: Calculates 4-dimension ATS compatibility scores (0-100) and rewrites bullet points with strong action verbs and keyword optimization.
- **Market Salary Predictor**: Scikit-learn Random Forest regression model trained on industry benchmarks predicting Minimum, Expected, and Maximum salary ranges with skill premium uplift and experience curves.
- **Adaptive Knowledge Quiz**: Dynamic multiple-choice assessment adjusting question difficulty (Easy, Medium, Hard) based on real-time candidate answers.
- **Unified Analytics Dashboard**: Chart.js and React visualization suite featuring radar skill comparisons, ATS audit trajectories, and readiness verdicts.
- **Persistent SQLite Database**: Normalized schema storing users, parsed resumes, job specifications, analyses, roadmaps, interview logs, salary reports, and quiz attempts.

---

## 3. Architecture & Data Flow

```text
[ Candidate Browser / Client ]
            │
            ▼ (React 19 + Tailwind CSS + Lucide Icons + Chart.js)
[ Full-Stack Web Service / Express & Flask Engine ]
            │
            ├─► [ PyMuPDF / python-docx / Fallback Parser ] ──► Raw Text & Sections
            ├─► [ spaCy & NLTK NLP Pipeline ] ──────────────► Categorized Skills
            ├─► [ Sentence Transformers / Cosine Sim ] ─────► Semantic Match Score & Gaps
            ├─► [ Google Gemini API ] ──────────────────────► Roadmaps, Interview, ATS, Quiz
            ├─► [ GitHub REST API ] ────────────────────────► Repo Metrics & Code Verification
            ├─► [ Scikit-Learn Regression Model ] ──────────► Salary Predictions ($ Min/Exp/Max)
            │
            ▼
[ SQLite 3 Database (backend/database/app.db) ]
```

---

## 4. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Chart.js, Motion
- **Backend**: Python 3.10+, Flask 3.0+, Express.js proxy layer, Gunicorn
- **Database**: SQLite 3 (`backend/database/app.db`)
- **Document Parsers**: PyMuPDF (`fitz`), `python-docx`, pure-Python XML/zlib fallbacks
- **Natural Language Processing**: `spaCy`, `NLTK`, Regular Expressions
- **Semantic Embeddings**: `sentence-transformers` (`all-MiniLM-L6-v2`), NumPy
- **Generative AI**: Google Gemini API (`@google/genai` & `google-genai` Python SDK)
- **Machine Learning**: `scikit-learn` (Random Forest Regressor, DictVectorizer), `joblib`
- **External APIs**: GitHub REST API v3
- **Deployment Platform**: Render

---

## 5. Folder Structure

```text
Resume-Skill-Gap-Analyzer/
├── src/                          # React Frontend Application
│   ├── components/               # Modular UI Components (Navbar, Dashboard, Quiz, etc.)
│   ├── services/                 # Frontend API Integration & Data Fetchers
│   ├── types.ts                  # Shared TypeScript Interfaces & Types
│   ├── App.tsx                   # Main React Application & State
│   ├── main.tsx                  # React DOM Entrypoint
│   └── index.css                 # Tailwind CSS Styles
│
├── backend/                      # Python NLP, ML, and Database Services
│   ├── app.py                    # Flask API Server
│   ├── resume_cli.py             # Resume Parsing CLI Interface
│   ├── nlp_cli.py                # NLP Skill Extraction CLI Interface
│   ├── matching_cli.py           # Semantic Skill Matching CLI Interface
│   ├── roadmap_cli.py            # Learning Roadmap CLI Interface
│   ├── github_cli.py             # GitHub Profiler CLI Interface
│   ├── interview_cli.py          # AI Mock Interview CLI Interface
│   ├── ats_cli.py                # ATS Rewriter CLI Interface
│   ├── salary_cli.py             # Salary Predictor CLI Interface
│   ├── quiz_cli.py               # Adaptive Quiz CLI Interface
│   ├── dashboard_cli.py          # Consolidated Dashboard CLI Interface
│   │
│   ├── database/                 # SQLite Database Management
│   │   ├── db.py                 # SQLite Connection Helper
│   │   ├── init_db.py            # Database Schema Initializer & Job Seeder
│   │   └── app.db                # SQLite Database File
│   │
│   ├── parser/                   # Document Extractors
│   │   └── resume_parser.py      # Resilient PDF & DOCX Parser
│   │
│   ├── services/                 # Core Business Logic & Algorithms
│   │   ├── auth_service.py       # Password Hashing & Auth Verification
│   │   ├── nlp_service.py        # spaCy/NLTK Tokenization & Lemmatization
│   │   ├── matching_service.py   # Sentence Embeddings & Cosine Similarity
│   │   ├── gap_service.py        # Priority Skill Gap Logic
│   │   ├── github_service.py     # GitHub Profile & Repo Analyzer
│   │   └── salary_service.py     # Scikit-Learn Salary Regression
│   │
│   ├── data/                     # Demonstration Benchmarks & Training Data
│   │   ├── salary_dataset.csv    # 1,000+ Sample Compensation Records
│   │   └── sample_dataset_generator.py
│   │
│   └── uploads/                  # Safe Temporary Storage for Uploaded Resumes
│
├── server.ts                     # Full-Stack Express Server & API Proxy
├── package.json                  # Node.js Dependencies & Build Scripts
├── requirements.txt              # Python Dependencies Specification
├── .env.example                  # Environment Configuration Template
├── .gitignore                    # Git Exclusion Rules
├── metadata.json                 # AI Studio Project Metadata
└── README.md                     # Comprehensive Project Documentation
```

---

## 6. Installation & Prerequisites

Ensure the following runtimes are installed on your machine:
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10.0 or higher
- **Git**: v2.30.0 or higher

Clone the repository:
```bash
git clone https://github.com/your-username/resume-skill-gap-analyzer.git
cd resume-skill-gap-analyzer
```

---

## 7. Environment Variables

Create a `.env` file at the project root by copying `.env.example`:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
# Google Gemini AI Secret Key (Required for AI features)
GEMINI_API_KEY="your_actual_gemini_api_key_here"

# Application URL
APP_URL="http://localhost:3000"

# Optional GitHub Token (Increases GitHub API rate limit from 60 to 5000 req/hr)
GITHUB_TOKEN=""

# Backend Database Path
DATABASE_PATH="backend/database/app.db"
```

> **Security Note**: Never commit your `.env` file or hardcode API keys into source code. `.env` is ignored by Git.

---

## 8. Backend & Database Setup

1. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Initialize SQLite Database**:
   ```bash
   python3 backend/database/init_db.py
   ```
   *This creates all normalized database tables and seeds 6 target job roles (Software Engineer, Data Scientist, AI Engineer, Full Stack Developer, ML Engineer, Cloud Engineer).*

---

## 9. Frontend Setup

1. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

2. **Build the Frontend**:
   ```bash
   npm run build
   ```

---

## 10. Running the Application Locally

Start the full-stack server:

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 11. Testing & Validation

### Health Check Endpoint
Verify the backend and database connection:
```bash
curl http://localhost:3000/api/health
```

### Resume Parsing CLI Test
```bash
python3 backend/parser/resume_parser.py sample_resume.pdf
```

### NLP Skill Extraction Test
```bash
python3 backend/nlp_cli.py extract_skills '{"text": "Proficient in Python, React, Docker, Kubernetes, PostgreSQL, and AWS."}'
```

### Semantic Matching Test
```bash
python3 backend/matching_cli.py match_skills '{"skills": ["Python", "SQL", "Git"], "job_id": 1}'
```

### Salary Prediction Test
```bash
python3 backend/salary_cli.py predict '{"job_role": "Full Stack Developer", "experience_years": 3, "skills": ["React", "TypeScript", "Node.js"]}'
```

---

## 12. Deployment to Render

To deploy the **Resume Skill Gap Analyzer** to [Render](https://render.com):

1. **Create a New Web Service** on the Render Dashboard and link your Git repository.
2. Select **Node** as the Environment.
3. Configure the **Build Command**:
   ```bash
   pip install -r requirements.txt && npm install && npm run build
   ```
4. Configure the **Start Command**:
   ```bash
   npm start
   ```
5. In the **Environment Variables** section, add:
   - `GEMINI_API_KEY` = `<Your Google Gemini API Key>`
   - `NODE_ENV` = `production`
   - `DATABASE_PATH` = `backend/database/app.db`
6. Click **Deploy Web Service**. Render will install dependencies, compile the frontend, initialize the database, and launch the service.

---

## 13. College Demonstration Guide

When presenting this project for academic evaluation:

1. **Upload & NLP Extraction**: Upload a sample PDF resume in the **Resume Upload** tab. Show the 5-stage NLP pipeline visualizing raw text, filtered tokens, POS tags, and extracted canonical skills.
2. **Semantic Matching & Gap Analysis**: Select target job roles (e.g. *Full Stack Developer*). Demonstrate the Sentence Transformers cosine similarity breakdown comparing matched vs. missing priority skills.
3. **AI Roadmap & Mock Interview**: Generate a personalized 4-week roadmap using Gemini AI. Launch an **AI Mock Interview**, speak into the microphone, and review instant STAR-method score evaluations.
4. **ATS Audit & Rewriter**: Run the ATS auditor to inspect keyword coverage, structure score, and view AI-optimized bullet points.
5. **Market Salary & Adaptive Quiz**: Use the Scikit-learn salary predictor to estimate earnings curves, and take a 5-question adaptive quiz demonstrating dynamic difficulty adjustment.
6. **Analytics Dashboard**: Review the consolidated dashboard displaying the composite readiness verdict and cross-module chart telemetry.

