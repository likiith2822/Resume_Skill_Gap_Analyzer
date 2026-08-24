"""
Skill Gap Analysis Service for Resume Skill Gap Analyzer.
Calculates matched skills, missing skills, recommended skills, skill match %,
and prioritizes missing skills based on their importance for the target job role.
"""

from typing import List, Dict, Any, Optional
import json
import sqlite3

class SkillGapService:
    """Computes comprehensive skill gap analysis from semantic matching results."""

    def __init__(self):
        self.exact_threshold = 0.99
        self.semantic_threshold = 0.70
        self.partial_threshold = 0.52

    def calculate_skill_gap(
        self,
        matching_data: Dict[str, Any],
        job_data: Dict[str, Any],
        candidate_skills: List[str]
    ) -> Dict[str, Any]:
        """
        Calculate enriched skill gap metrics:
        - Matched Skills
        - Missing Skills
        - Recommended Skills
        - Skill Match %
        - Priority Skills Breakdown
        """
        required_skills = job_data.get("required_skills", [])
        priority_skills_list = job_data.get("priority_skills", [])
        priority_set = {p.lower().strip() for p in priority_skills_list}

        raw_matched = matching_data.get("matched_skills", [])
        raw_missing = matching_data.get("missing_skills", [])
        overall_match_pct = matching_data.get("overall_match_percentage", 0.0)

        # 1. Enrich Matched Skills
        enriched_matched = []
        for m in raw_matched:
            skill_name = m.get("skill")
            is_priority = skill_name.lower().strip() in priority_set or m.get("is_priority", False)
            sim = m.get("similarity", 0.0)
            
            if sim >= self.exact_threshold or m.get("match_type") == "exact":
                status = "Exact Match"
                badge_color = "emerald"
            elif sim >= self.semantic_threshold:
                status = "High Semantic Match"
                badge_color = "teal"
            else:
                status = "Partial Match"
                badge_color = "blue"

            enriched_matched.append({
                "skill": skill_name,
                "best_candidate_match": m.get("best_candidate_match"),
                "similarity": round(float(sim), 4),
                "match_percentage": round(float(sim) * 100, 1),
                "match_type": m.get("match_type", "exact"),
                "status": status,
                "badge_color": badge_color,
                "is_priority": is_priority,
                "importance": "High (Priority)" if is_priority else "Standard"
            })

        # 2. Enrich Missing Skills with Priority-based Importance
        enriched_missing = []
        for miss in raw_missing:
            skill_name = miss.get("skill")
            is_priority = skill_name.lower().strip() in priority_set or miss.get("is_priority", False)
            sim = miss.get("similarity", 0.0)

            if is_priority:
                importance = "High"
                importance_weight = 3
                reason = "Must-have core priority skill for this job role."
            else:
                importance = "Medium"
                importance_weight = 2
                reason = "Required role capability for comprehensive technical depth."

            enriched_missing.append({
                "skill": skill_name,
                "best_candidate_match": miss.get("best_candidate_match"),
                "similarity": round(float(sim), 4),
                "is_priority": is_priority,
                "importance": importance,
                "importance_weight": importance_weight,
                "reason": reason,
                "gap_severity": "Critical Gap" if is_priority else "Moderate Gap"
            })

        # Sort missing skills: High priority first, then lowest candidate similarity (greatest gap)
        enriched_missing.sort(key=lambda x: (-x["importance_weight"], x["similarity"]))

        # 3. Calculate Recommended Skills (Ordered learning queue)
        recommended_skills = []
        rank = 1
        for m in enriched_missing:
            estimated_weeks = "1 Week" if m["importance"] == "Medium" else "1-2 Weeks"
            recommended_skills.append({
                "rank": rank,
                "skill": m["skill"],
                "importance": m["importance"],
                "is_priority": m["is_priority"],
                "estimated_effort": estimated_weeks,
                "recommendation_reason": (
                    f"Immediate priority: Master {m['skill']} to significantly boost candidate eligibility for {job_data.get('job_title')}."
                    if m["is_priority"]
                    else f"Recommended progression: Learn {m['skill']} to expand full-stack technical competencies."
                )
            })
            rank += 1

        # 4. Priority Skills Summary
        matched_priority_skills = [m["skill"] for m in enriched_matched if m["is_priority"]]
        missing_priority_skills = [m["skill"] for m in enriched_missing if m["is_priority"]]
        total_priority = len(priority_skills_list)
        matched_prio_count = len(matched_priority_skills)
        missing_prio_count = len(missing_priority_skills)
        priority_pct = round((matched_prio_count / max(1, total_priority)) * 100.0, 1)

        priority_summary = {
            "total_priority_skills": total_priority,
            "matched_priority_count": matched_prio_count,
            "missing_priority_count": missing_prio_count,
            "priority_match_percentage": priority_pct,
            "matched_priority_skills": matched_priority_skills,
            "missing_priority_skills": missing_priority_skills,
            "status": "Ready" if missing_prio_count == 0 else ("Minor Gap" if missing_prio_count <= 2 else "Substantial Gap")
        }

        return {
            "job": {
                "id": job_data.get("id"),
                "job_title": job_data.get("job_title"),
                "category": job_data.get("category"),
                "experience_level": job_data.get("experience_level", "Mid-Level"),
                "total_required_skills": len(required_skills)
            },
            "skill_match_percentage": overall_match_pct,
            "matched_skills": enriched_matched,
            "missing_skills": enriched_missing,
            "recommended_skills": recommended_skills,
            "priority_skills": priority_summary,
            "total_matched": len(enriched_matched),
            "total_missing": len(enriched_missing),
            "total_required": len(required_skills),
            "total_candidate_skills": len(candidate_skills)
        }

gap_service = SkillGapService()
