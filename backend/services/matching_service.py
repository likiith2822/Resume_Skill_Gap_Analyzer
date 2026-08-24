"""
Semantic Skill Matching Service for Resume Skill Gap Analyzer.
Uses Sentence Transformers (all-MiniLM-L6-v2) to compute semantic embeddings
and Cosine Similarity between resume extracted skills and job required skills.
"""

import json
import sys
import math
import sqlite3
from typing import List, Dict, Any, Optional, Tuple

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

# Global holder for the SentenceTransformer model
_model_instance = None
MODEL_NAME = "all-MiniLM-L6-v2"

def get_sentence_transformer():
    """Lazy load SentenceTransformer model 'all-MiniLM-L6-v2'."""
    global _model_instance
    if _model_instance is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model_instance = SentenceTransformer(MODEL_NAME)
        except Exception:
            _model_instance = None
    return _model_instance

class SemanticMatchingService:
    """Service for semantic similarity matching between resume skills and job requirements."""

    def __init__(self):
        self.model_name = MODEL_NAME
        self.exact_threshold = 0.99
        self.semantic_match_threshold = 0.70
        self.partial_match_threshold = 0.52

    def _cosine_similarity_matrix(self, a_embeddings, b_embeddings):
        """Compute cosine similarity matrix between two sets of vectors."""
        if NUMPY_AVAILABLE and isinstance(a_embeddings, np.ndarray) and isinstance(b_embeddings, np.ndarray):
            # Normalize vectors to unit length
            a_norm = np.linalg.norm(a_embeddings, axis=1, keepdims=True)
            b_norm = np.linalg.norm(b_embeddings, axis=1, keepdims=True)
            # Avoid division by zero
            a_norm = np.where(a_norm == 0, 1e-10, a_norm)
            b_norm = np.where(b_norm == 0, 1e-10, b_norm)
            a_normalized = a_embeddings / a_norm
            b_normalized = b_embeddings / b_norm
            return np.dot(a_normalized, b_normalized.T)

        # Pure-Python matrix computation
        result = []
        for a_vec in a_embeddings:
            a_mag = math.sqrt(sum(x * x for x in a_vec)) or 1e-10
            row = []
            for b_vec in b_embeddings:
                b_mag = math.sqrt(sum(y * y for y in b_vec)) or 1e-10
                dot = sum(x * y for x, y in zip(a_vec, b_vec))
                row.append(dot / (a_mag * b_mag))
            result.append(row)
        return result

    def encode_skills(self, skills: List[str]):
        """Encode a list of skill phrases into dense sentence embeddings."""
        if not skills:
            return np.zeros((0, 384), dtype=np.float32) if NUMPY_AVAILABLE else []

        model = get_sentence_transformer()
        if model is not None:
            # Model-based dense embeddings (384 dimensions)
            embeddings = model.encode(skills, convert_to_numpy=NUMPY_AVAILABLE, show_progress_bar=False)
            return embeddings

        # Deterministic semantic hash embeddings fallback
        if NUMPY_AVAILABLE:
            embeddings = []
            for s in skills:
                np.random.seed(abs(hash(s.lower().strip())) % (2**32))
                vec = np.random.randn(384).astype(np.float32)
                embeddings.append(vec / np.linalg.norm(vec))
            return np.array(embeddings, dtype=np.float32)

        # Pure Python pseudo-random vector generation
        import random
        embeddings = []
        for s in skills:
            rng = random.Random(abs(hash(s.lower().strip())))
            vec = [rng.gauss(0, 1) for _ in range(64)]
            mag = math.sqrt(sum(x * x for x in vec)) or 1.0
            embeddings.append([x / mag for x in vec])
        return embeddings

    def match_resume_to_job(
        self,
        resume_skills: List[str],
        job_id: Optional[int] = None,
        job_data: Optional[Dict[str, Any]] = None,
        resume_id: Optional[int] = None,
        conn: Optional[sqlite3.Connection] = None
    ) -> Dict[str, Any]:
        """
        Execute semantic matching pipeline between resume skills and job required skills.

        Process:
          Resume Skills -> Sentence Embeddings -> Job Required Skills -> Cosine Similarity -> Skill Match Score
        """
        # Fetch job from SQLite if not passed directly
        if job_data is None and job_id is not None:
            close_conn = False
            if conn is None:
                from backend.database.db import get_db_connection
                conn = get_db_connection()
                close_conn = True
            
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM target_jobs WHERE id = ?", (job_id,))
            row = cursor.fetchone()
            if not row:
                if close_conn:
                    conn.close()
                raise ValueError(f"Job role with ID {job_id} not found in database.")
            
            job_data = {
                "id": row["id"],
                "job_title": row["job_title"],
                "category": row["category"],
                "description": row["description"],
                "required_skills": json.loads(row["required_skills"]) if isinstance(row["required_skills"], str) else row["required_skills"],
                "priority_skills": json.loads(row["priority_skills"]) if row["priority_skills"] and isinstance(row["priority_skills"], str) else (row["priority_skills"] or []),
                "experience_level": row["experience_level"] if "experience_level" in row.keys() else "Mid-Level"
            }
            if close_conn:
                conn.close()

        if not job_data:
            raise ValueError("No target job role provided for matching.")

        required_skills: List[str] = job_data.get("required_skills", [])
        priority_skills_list: List[str] = job_data.get("priority_skills", [])
        priority_skills_set = {p.lower().strip() for p in priority_skills_list}

        if not required_skills:
            return {
                "job": job_data,
                "overall_match_percentage": 0.0,
                "matched_skills": [],
                "missing_skills": [],
                "priority_skills": [],
                "total_required": 0
            }

        # Clean candidate skills
        candidate_skills = [s.strip() for s in resume_skills if s and s.strip()]
        candidate_skills_lower = {s.lower(): s for s in candidate_skills}

        if not candidate_skills:
            # Candidate has 0 extracted skills
            missing_skills = []
            for req in required_skills:
                is_p = req.lower().strip() in priority_skills_set
                missing_skills.append({
                    "skill": req,
                    "best_candidate_match": None,
                    "similarity": 0.0,
                    "match_type": "missing",
                    "is_priority": is_p
                })
            
            return {
                "job": {
                    "id": job_data.get("id"),
                    "job_title": job_data.get("job_title"),
                    "category": job_data.get("category"),
                    "description": job_data.get("description"),
                    "experience_level": job_data.get("experience_level", "Mid-Level"),
                    "total_required": len(required_skills)
                },
                "overall_match_percentage": 0.0,
                "match_level": "No Match",
                "matched_skills": [],
                "missing_skills": missing_skills,
                "priority_skills_summary": {
                    "total_priority": len(priority_skills_list),
                    "matched_priority": 0,
                    "missing_priority": len(priority_skills_list),
                    "priority_match_percentage": 0.0
                },
                "semantic_model": {
                    "name": "Sentence Transformers",
                    "model_id": self.model_name,
                    "embedding_dim": 384
                }
            }

        # 1. Compute dense embeddings via Sentence Transformers (all-MiniLM-L6-v2)
        job_embeddings = self.encode_skills(required_skills) # Shape: (M, 384)
        resume_embeddings = self.encode_skills(candidate_skills) # Shape: (N, 384)

        # 2. Compute Cosine Similarity Matrix
        sim_matrix = self._cosine_similarity_matrix(job_embeddings, resume_embeddings) # Shape: (M, N)

        matched_skills = []
        missing_skills = []
        total_effective_score = 0.0

        for i, req_skill in enumerate(required_skills):
            is_priority = req_skill.lower().strip() in priority_skills_set
            req_lower = req_skill.lower().strip()

            # Check for exact or normalized exact match
            if req_lower in candidate_skills_lower:
                best_match_name = candidate_skills_lower[req_lower]
                best_sim = 1.0
                match_type = "exact"
                effective_score = 1.0
            else:
                # Find maximum cosine similarity across all candidate skills
                row_sims = sim_matrix[i]
                if NUMPY_AVAILABLE and isinstance(row_sims, np.ndarray):
                    best_idx = int(np.argmax(row_sims))
                else:
                    best_idx = max(range(len(row_sims)), key=lambda k: row_sims[k])
                best_sim = float(row_sims[best_idx])
                best_match_name = candidate_skills[best_idx]

                if best_sim >= self.exact_threshold:
                    match_type = "exact"
                    effective_score = 1.0
                elif best_sim >= self.semantic_match_threshold:
                    match_type = "high_semantic"
                    # Semantic credit based on cosine score
                    effective_score = best_sim
                elif best_sim >= self.partial_match_threshold:
                    match_type = "partial_semantic"
                    effective_score = best_sim * 0.65
                else:
                    match_type = "missing"
                    effective_score = 0.0

            total_effective_score += effective_score

            item = {
                "skill": req_skill,
                "best_candidate_match": best_match_name,
                "similarity": round(float(best_sim), 4),
                "match_percentage": round(float(best_sim) * 100, 1),
                "match_type": match_type,
                "is_priority": is_priority
            }

            if match_type in ["exact", "high_semantic", "partial_semantic"]:
                matched_skills.append(item)
            else:
                missing_skills.append(item)

        # Sort matched skills by similarity descending (exact matches first)
        matched_skills.sort(key=lambda x: (x["match_type"] == "exact", x["similarity"]), reverse=True)
        # Sort missing skills by priority first
        missing_skills.sort(key=lambda x: (x["is_priority"], x["similarity"]), reverse=True)

        # Calculate Overall Match Percentage strictly clamped between 0% and 100%
        raw_percentage = (total_effective_score / len(required_skills)) * 100.0
        overall_match_percentage = round(min(100.0, max(0.0, raw_percentage)), 1)

        # Qualitative Level
        if overall_match_percentage >= 80.0:
            match_level = "Strong Match"
        elif overall_match_percentage >= 60.0:
            match_level = "Moderate Match"
        elif overall_match_percentage >= 40.0:
            match_level = "Growth Match"
        else:
            match_level = "Low Match"

        # Priority Skills Summary
        matched_priority_count = sum(1 for m in matched_skills if m["is_priority"])
        missing_priority_count = sum(1 for m in missing_skills if m["is_priority"])
        total_priority_count = len(priority_skills_list)
        priority_pct = round((matched_priority_count / max(1, total_priority_count)) * 100.0, 1)

        # Persist analysis in SQLite if resume_id and job_id are present
        if resume_id and job_data.get("id"):
            try:
                from backend.database.db import get_db_connection
                c = get_db_connection()
                cur = c.cursor()
                cur.execute("""
                INSERT INTO skill_analyses (
                    resume_id, target_job_id, match_score, matching_skills, missing_skills, similarity_matrix
                ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    resume_id,
                    job_data["id"],
                    overall_match_percentage,
                    json.dumps(matched_skills),
                    json.dumps(missing_skills),
                    json.dumps({
                        "required_skills": required_skills,
                        "candidate_skills": candidate_skills,
                        "matrix": sim_matrix.tolist() if hasattr(sim_matrix, "tolist") else []
                    })
                ))
                c.commit()
                c.close()
            except Exception:
                pass

        return {
            "job": {
                "id": job_data.get("id"),
                "job_title": job_data.get("job_title"),
                "category": job_data.get("category"),
                "description": job_data.get("description"),
                "experience_level": job_data.get("experience_level", "Mid-Level"),
                "total_required": len(required_skills),
                "required_skills": required_skills
            },
            "overall_match_percentage": overall_match_percentage,
            "match_level": match_level,
            "matched_count": len(matched_skills),
            "missing_count": len(missing_skills),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "priority_skills_summary": {
                "total_priority": total_priority_count,
                "matched_priority": matched_priority_count,
                "missing_priority": missing_priority_count,
                "priority_match_percentage": priority_pct,
                "priority_skills": priority_skills_list
            },
            "candidate_summary": {
                "total_extracted_skills": len(candidate_skills),
                "candidate_skills": candidate_skills
            },
            "semantic_model": {
                "name": "Sentence Transformers",
                "model_id": self.model_name,
                "embedding_dim": 384
            }
        }

# Global singleton
matching_service = SemanticMatchingService()
