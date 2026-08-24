#!/usr/bin/env python3
"""
Comprehensive Integration & Edge Case Test Suite for Resume Skill Gap Analyzer
Verifies the exact requested 16-step flow, negative edge cases, and user data isolation.
"""

import sys
import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import http.cookiejar

BASE_URL = "http://localhost:3000"

class TestRunner:
    def __init__(self):
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookie_jar))
        self.results = []
        self.user_token = None
        self.user_id = None
        self.resume_id = None
        self.job_id = None
        self.analysis_id = None
        self.roadmap_id = None
        self.interview_id = None
        self.quiz_id = None

    def log(self, name, passed, details=""):
        status = "✅ PASS" if passed else "❌ FAIL"
        self.results.append({"name": name, "passed": passed, "details": details})
        print(f"{status} | {name}: {details}")

    def request(self, method, endpoint, data=None, headers=None, expect_status=200):
        url = f"{BASE_URL}{endpoint}"
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        if self.user_token and "Authorization" not in req_headers:
            req_headers["Authorization"] = f"Bearer {self.user_token}"

        req_data = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)

        try:
            with self.opener.open(req) as resp:
                status_code = resp.getcode()
                body = resp.read().decode("utf-8")
                try:
                    parsed_json = json.loads(body)
                except Exception:
                    parsed_json = {"raw": body}
                return status_code, parsed_json
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8")
            try:
                parsed_json = json.loads(body)
            except Exception:
                parsed_json = {"raw": body}
            return err.code, parsed_json
        except Exception as e:
            return 500, {"error": str(e)}

    def run_all_tests(self):
        print("=" * 80)
        print("STARTING FULL INTEGRATION & EDGE CASE TEST SUITE (Part 13)")
        print("=" * 80)

        # 1. Health check
        self.test_health_endpoint()

        # 2. Negative Tests: Invalid Login & Malformed Inputs
        self.test_invalid_auth()

        # 3. Registration
        self.test_register_flow()

        # 4. Login
        self.test_login_flow()

        # 5. Negative Tests: Resume Upload Edge Cases (unsupported format, empty payload)
        self.test_resume_upload_edge_cases()

        # 6. Upload Valid Resume
        self.test_valid_resume_upload()

        # 7. Resume Parsing Verification
        self.test_resume_parsing()

        # 8. NLP Skill Extraction
        self.test_nlp_skill_extraction()

        # 9. Select Job Role
        self.test_target_job_selection()

        # 10. Semantic Skill Matching
        self.test_semantic_matching()

        # 11. Skill Gap Analysis
        self.test_skill_gap_analysis()

        # 12. Learning Roadmap Generation (Gemini AI)
        self.test_learning_roadmap()

        # 13. GitHub Analysis & Profiler (with invalid username edge case)
        self.test_github_profiler()

        # 14. ATS Resume Rewriter & Cover Letter (Gemini AI)
        self.test_ats_rewriter_and_cover_letter()

        # 15. Mock Interview Flow (Gemini AI)
        self.test_mock_interview()

        # 16. Salary Prediction (Scikit-Learn ML)
        self.test_salary_prediction()

        # 17. Adaptive Quiz Flow
        self.test_adaptive_quiz()

        # 18. Main Dashboard Aggregation
        self.test_main_dashboard()

        # 19. User Isolation & Security (User A vs User B)
        self.test_user_isolation_security()

        # 20. Summary
        self.print_summary()

    def test_health_endpoint(self):
        status, body = self.request("GET", "/api/health")
        passed = status == 200 and body.get("success") is True
        self.log("Health Endpoint Check (/api/health)", passed, f"Status: {status}")

    def test_invalid_auth(self):
        # Non-existent user login
        status, body = self.request("POST", "/api/auth/login", {
            "email": "nonexistent_user_9999@example.com",
            "password": "WrongPassword123!"
        })
        passed = status in (401, 404) and body.get("success") is False
        self.log("Negative Test: Invalid Login (Non-existent user)", passed, f"Status {status}")

        # Invalid password
        status, body = self.request("POST", "/api/auth/login", {
            "email": "testuser@example.com",
            "password": "IncorrectPassword"
        })
        passed = status in (401, 404) and body.get("success") is False
        self.log("Negative Test: Invalid Login (Wrong password)", passed, f"Status {status}")

        # Invalid user input: malformed email
        status, body = self.request("POST", "/api/auth/register", {
            "name": "Bad User",
            "email": "not-an-email",
            "password": "123"
        })
        passed = status in (400, 422) and body.get("success") is False
        self.log("Negative Test: Invalid Registration Input (Malformed email/short password)", passed, f"Status {status}")

    def test_register_flow(self):
        timestamp = int(time.time())
        email = f"candidate_{timestamp}@analyzer-test.org"
        status, body = self.request("POST", "/api/auth/register", {
            "name": "Integration Test Candidate",
            "email": email,
            "password": "ValidSecurePassword2026!"
        })
        passed = status in (200, 201) and body.get("success") is True
        if passed and "data" in body:
            self.user_token = body["data"].get("token")
            self.user_id = body["data"].get("user", {}).get("id")
        self.email = email
        self.log("Step 1: User Registration (/api/auth/register)", passed, f"User ID: {self.user_id}")

    def test_login_flow(self):
        status, body = self.request("POST", "/api/auth/login", {
            "email": self.email,
            "password": "ValidSecurePassword2026!"
        })
        passed = status == 200 and body.get("success") is True
        if passed and "data" in body:
            self.user_token = body["data"].get("token")
            if not self.user_id:
                self.user_id = body["data"].get("user", {}).get("id")
        self.log("Step 2: User Login (/api/auth/login)", passed, f"JWT Token acquired")

        # Verify /api/auth/me
        status, body = self.request("GET", "/api/auth/me")
        me_passed = status == 200 and body.get("success") is True and body.get("data", {}).get("email") == self.email
        self.log("Step 2b: Verified Auth Profile (/api/auth/me)", me_passed, f"Authenticated as {self.email}")

    def test_resume_upload_edge_cases(self):
        # Empty payload
        status, body = self.request("POST", "/api/resumes/upload-text", {"raw_text": ""})
        passed = status == 400 and body.get("success") is False
        self.log("Negative Test: Empty Resume Text Upload", passed, f"Status: {status}")

        # Non-numeric ID request
        status, body = self.request("GET", "/api/resumes/not-an-id")
        passed = status in (400, 404)
        self.log("Negative Test: Malformed Resume ID (/api/resumes/invalid)", passed, f"Status: {status}")

    def test_valid_resume_upload(self):
        sample_resume_text = """
Alex Chen
Senior Software Engineer | San Francisco, CA | alex.chen@example.com | (555) 234-5678 | github.com/alexchen-dev

PROFESSIONAL SUMMARY
Dynamic and results-driven Full Stack Engineer with 4+ years of hands-on experience building scalable distributed web applications, high-throughput microservices, and reactive user interfaces using Python, React, TypeScript, Node.js, and PostgreSQL. Proven track record of improving API latency by 40% and containerizing workloads using Docker.

TECHNICAL SKILLS
• Programming Languages: Python, TypeScript, JavaScript, SQL, HTML5, CSS3, Go
• Frameworks & Libraries: React, Node.js, Express, FastAPI, Django, Redux, Tailwind CSS
• Databases & Storage: PostgreSQL, MySQL, SQLite, Redis, MongoDB
• Cloud & DevOps: Docker, Git, GitHub Actions, AWS (S3, EC2), Linux/Unix, CI/CD
• Architecture & Practices: RESTful APIs, Microservices, Agile/Scrum, Test-Driven Development (TDD), Unit Testing

WORK EXPERIENCE
Senior Full Stack Developer | Nexus Cloud Systems | 2022 - Present
• Designed and developed high-throughput REST APIs and microservices using Python FastAPI and PostgreSQL serving 1.5M daily active users.
• Architected responsive single-page web dashboards in React and TypeScript with Tailwind CSS, reducing bundle size by 35%.
• Containerized backend applications with Docker and established automated CI/CD deployment pipelines using GitHub Actions.
• Implemented Redis distributed caching layer, reducing database query overhead and p99 latency by 42%.

Software Engineer | Apex Digital Solutions | 2020 - 2022
• Developed modern frontend UI components using React, Redux, and modern JavaScript.
• Integrated third-party payment gateways, OAuth authentication flows, and webhook endpoints.
• Authored comprehensive unit and integration test suites achieving 88% test coverage.

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley | 2016 - 2020
• Relevant Coursework: Data Structures, Algorithms, Distributed Systems, Database Management Systems, Machine Learning

CERTIFICATIONS
• AWS Certified Solutions Architect - Associate
• Meta Certified Frontend Developer
"""
        status, body = self.request("POST", "/api/resumes/upload-text", {
            "title": "Alex Chen - Senior Full Stack Resume",
            "raw_text": sample_resume_text
        })
        passed = status in (200, 201) and body.get("success") is True
        if passed and "data" in body:
            self.resume_id = body["data"].get("id")
        self.log("Step 3: Upload & Ingest Resume (/api/resumes/upload-text)", passed, f"Resume ID: {self.resume_id}")

    def test_resume_parsing(self):
        if not self.resume_id:
            self.log("Step 4: Resume Parsing Check", False, "Skipped due to missing resume_id")
            return

        status, body = self.request("GET", f"/api/resumes/{self.resume_id}")
        passed = status == 200 and body.get("success") is True and "data" in body
        data = body.get("data", {})
        skills_found = len(data.get("extracted_skills", []))
        self.log("Step 4: Resume Parsing & Section Extraction (/api/resumes/:id)", passed, f"Parsed {skills_found} initial skills & contact info")

    def test_nlp_skill_extraction(self):
        if not self.resume_id:
            self.log("Step 5: NLP Skill Extraction", False, "Skipped due to missing resume_id")
            return

        status, body = self.request("POST", "/api/nlp/extract", {
            "resume_id": self.resume_id
        })
        passed = status == 200 and body.get("success") is True
        data = body.get("data", {})
        tech_skills = len(data.get("technical_skills", []))
        soft_skills = len(data.get("soft_skills", []))
        self.log("Step 5: NLP Skill Extraction (/api/nlp/extract)", passed, f"{tech_skills} technical skills, {soft_skills} soft skills extracted")

    def test_target_job_selection(self):
        status, body = self.request("GET", "/api/target-jobs")
        passed = status == 200 and body.get("success") is True and len(body.get("data", [])) > 0
        jobs = body.get("data", [])
        if passed and jobs:
            # Pick 'Full Stack Developer' or first available
            matched = [j for j in jobs if "Full Stack" in j.get("title", "")]
            selected_job = matched[0] if matched else jobs[0]
            self.job_id = selected_job.get("id")
            self.job_title = selected_job.get("title")
        self.log("Step 6: Target Job Role Selection (/api/target-jobs)", passed, f"Selected: '{self.job_title}' (ID: {self.job_id})")

    def test_semantic_matching(self):
        if not self.resume_id or not self.job_id:
            self.log("Step 7: Semantic Skill Matching", False, "Skipped due to missing resume or job")
            return

        # Negative check: missing job_id
        status, body = self.request("POST", "/api/matching/analyze", {
            "resume_id": self.resume_id
        })
        neg_passed = status == 400 and body.get("success") is False
        self.log("Negative Test: Semantic Matching without Job ID", neg_passed, f"Status {status}")

        # Valid matching
        status, body = self.request("POST", "/api/matching/analyze", {
            "resume_id": self.resume_id,
            "target_job_id": self.job_id
        })
        passed = status == 200 and body.get("success") is True
        data = body.get("data", {})
        score = data.get("overall_match_percentage")
        self.analysis_id = data.get("id")
        self.log("Step 7: Semantic Skill Matching (/api/matching/analyze)", passed, f"Match Score: {score}% (Analysis ID: {self.analysis_id})")

    def test_skill_gap_analysis(self):
        if not self.resume_id or not self.job_id:
            self.log("Step 8: Skill Gap Analysis", False, "Skipped due to missing parameters")
            return

        status, body = self.request("POST", "/api/matching/gap-analysis", {
            "resume_id": self.resume_id,
            "target_job_id": self.job_id
        })
        passed = status == 200 and body.get("success") is True
        data = body.get("data", {})
        missing_count = len(data.get("missing_skills", []))
        matched_count = len(data.get("matched_skills", []))
        self.log("Step 8: Skill Gap Analysis (/api/matching/gap-analysis)", passed, f"{matched_count} matched skills, {missing_count} identified skill gaps")

    def test_learning_roadmap(self):
        status, body = self.request("POST", "/api/roadmap/generate", {
            "job_title": self.job_title or "Full Stack Developer",
            "missing_skills": ["Kubernetes", "AWS Cloud", "GraphQL", "Redis"],
            "target_duration_weeks": 4
        })
        passed = status == 200 and body.get("success") is True
        data = body.get("data", {})
        weeks = len(data.get("weekly_plan", []))
        self.roadmap_id = data.get("id")
        self.log("Step 9: Learning Roadmap Generation (/api/roadmap/generate)", passed, f"Generated {weeks}-week structured curriculum")

    def test_github_profiler(self):
        # Negative test: invalid / empty username
        status, body = self.request("POST", "/api/github/analyze", {
            "username": "   "
        })
        neg_passed = status == 400 and body.get("success") is False
        self.log("Negative Test: GitHub Profiler with Empty Username", neg_passed, f"Status {status}")

        # Valid user audit
        status, body = self.request("POST", "/api/github/analyze", {
            "username": "torvalds"
        })
        passed = status == 200 and body.get("success") is True
        data = body.get("data", {})
        score = data.get("github_score")
        tier = data.get("tier")
        self.log("Step 10: GitHub Portfolio Profiler (/api/github/analyze)", passed, f"Score: {score}/100, Tier: {tier}")

    def test_ats_rewriter_and_cover_letter(self):
        # 1. ATS Rewriter
        status, body = self.request("POST", "/api/ats/rewrite", {
            "job_title": self.job_title or "Full Stack Developer",
            "current_resume_text": "Built web applications using Python and React. Fixed bugs and added features.",
            "target_skills": ["Python", "React", "Docker", "PostgreSQL", "FastAPI"]
        })
        ats_passed = status == 200 and body.get("success") is True
        data = body.get("data", {})
        ats_score = data.get("ats_score")
        self.log("Step 11: ATS Resume Rewriter (/api/ats/rewrite)", ats_passed, f"ATS Score: {ats_score}/100 with quantified bullets")

        # 2. Cover Letter Generation
        status, body = self.request("POST", "/api/ats/cover-letter", {
            "job_title": self.job_title or "Full Stack Developer",
            "company_name": "Acme Innovations Inc",
            "resume_summary": "4+ years Full Stack Engineer with expertise in Python, React, and cloud architecture.",
            "job_requirements": "Requires Python, React, PostgreSQL, Docker, microservices."
        })
        cl_passed = status == 200 and body.get("success") is True
        self.log("Step 12: Cover Letter Generator (/api/ats/cover-letter)", cl_passed, f"Generated personalized cover letter")

    def test_mock_interview(self):
        # 1. Start session & generate questions
        status, body = self.request("POST", "/api/interview/start", {
            "job_title": self.job_title or "Full Stack Developer",
            "difficulty": "Mid-Level",
            "num_questions": 3,
            "target_skills": ["Python", "React", "System Design"]
        })
        passed = status in (200, 201) and body.get("success") is True
        data = body.get("data", {})
        self.interview_id = data.get("id")
        questions = data.get("questions", [])
        self.log("Step 13a: AI Mock Interview Session Start (/api/interview/start)", passed, f"Interview ID: {self.interview_id}, {len(questions)} questions generated")

        # 2. Evaluate answer
        if self.interview_id and questions:
            q_id = questions[0].get("id")
            q_text = questions[0].get("question")
            status, body = self.request("POST", "/api/interview/evaluate-answer", {
                "interview_id": self.interview_id,
                "question_id": q_id,
                "question_text": q_text,
                "user_answer": "In my previous project, we had high API latency under load. I profiled the slow endpoints, identified N+1 database queries, added Redis caching, and indexed key PostgreSQL columns. This reduced response times by 40%."
            })
            ans_passed = status == 200 and body.get("success") is True
            self.log("Step 13b: Mock Interview Answer Evaluation (/api/interview/evaluate-answer)", ans_passed, f"STAR Method evaluation completed")

    def test_salary_prediction(self):
        # 1. Scikit-learn salary prediction
        status, body = self.request("POST", "/api/salary/predict", {
            "job_role": "Full Stack Developer",
            "experience_years": 4.5,
            "education_level": "Bachelor's Degree",
            "candidate_skills": ["Python", "React", "TypeScript", "Docker", "PostgreSQL"],
            "location_tier": "Tier 1 (High CoL)"
        })
        passed = status == 200 and body.get("success") is True
        data = body.get("data", {})
        expected = data.get("expected_salary")
        currency = data.get("currency", "USD")
        self.log("Step 14: ML Salary Predictor (/api/salary/predict)", passed, f"Expected: {currency} {expected:,}")

    def test_adaptive_quiz(self):
        # 1. Start adaptive quiz
        status, body = self.request("POST", "/api/quiz/start", {
            "job_role": self.job_title or "Full Stack Developer",
            "target_skills": ["Python", "React", "SQL", "Docker"],
            "difficulty": "medium",
            "total_questions": 3
        })
        passed = status in (200, 201) and body.get("success") is True
        data = body.get("data", {})
        self.quiz_id = data.get("id")
        first_q = data.get("current_question", {})
        self.log("Step 15a: Adaptive Quiz Session Start (/api/quiz/start)", passed, f"Quiz ID: {self.quiz_id}")

        # 2. Submit answer
        if self.quiz_id and first_q:
            status, body = self.request("POST", "/api/quiz/submit-answer", {
                "session_id": self.quiz_id,
                "question_id": first_q.get("id"),
                "selected_option": "A",
                "time_taken_seconds": 18
            })
            ans_passed = status == 200 and body.get("success") is True
            self.log("Step 15b: Adaptive Quiz Answer Submission (/api/quiz/submit-answer)", ans_passed, f"Answer submitted & scored")

    def test_main_dashboard(self):
        status, body = self.request("GET", "/api/dashboard/overview")
        passed = status == 200 and body.get("success") is True
        data = body.get("data", {})
        main_scores = data.get("main_scores", {})
        composite = main_scores.get("composite_readiness")
        self.log("Step 16: Main Dashboard Aggregation (/api/dashboard/overview)", passed, f"Composite Readiness Score: {composite}%")

    def test_user_isolation_security(self):
        # Create User B
        timestamp = int(time.time()) + 99
        email_b = f"user_b_{timestamp}@security-test.org"
        status, body = self.request("POST", "/api/auth/register", {
            "name": "User B",
            "email": email_b,
            "password": "PasswordUserB2026!"
        })
        token_b = body.get("data", {}).get("token")
        user_b_id = body.get("data", {}).get("user", {}).get("id")

        if not token_b or not self.resume_id:
            self.log("Security: User Isolation Check", False, "Missing prerequisites")
            return

        # Attempt to access User A's resume using User B's token
        headers_b = {"Authorization": f"Bearer {token_b}"}
        status, body = self.request("GET", f"/api/resumes/{self.resume_id}", headers=headers_b)
        
        # User B should NOT be able to view User A's resume (should be 403 Forbidden or 404 Not Found)
        passed = status in (403, 404) or (status == 200 and body.get("data", {}).get("user_id") == user_b_id)
        if status == 403 or status == 404 or body.get("success") is False:
            self.log("Security: Data Isolation Check (User B accessing User A's resume)", True, f"Blocked with HTTP {status}: {body.get('error', {}).get('message', 'Access Denied')}")
        else:
            # Let's verify resume owner
            if body.get("data", {}).get("user_id") != user_b_id:
                self.log("Security: Data Isolation Check", False, "User B was able to read User A's resume!")
            else:
                self.log("Security: Data Isolation Check", True, "Isolated")

    def print_summary(self):
        print("\n" + "=" * 80)
        print("TEST SUITE EXECUTION SUMMARY")
        print("=" * 80)
        total = len(self.results)
        passed_count = sum(1 for r in self.results if r["passed"])
        failed_count = total - passed_count
        print(f"Total Tests Executed: {total}")
        print(f"Passed: {passed_count}")
        print(f"Failed: {failed_count}")
        print(f"Success Rate: {(passed_count / total) * 100:.1f}%")
        print("=" * 80)

if __name__ == "__main__":
    runner = TestRunner()
    runner.run_all_tests()
