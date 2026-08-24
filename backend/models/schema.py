"""
Data models and schemas for Resume Skill Gap Analyzer.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class CandidateModel:
    id: Optional[int] = None
    name: str = ""
    email: str = ""
    github_username: Optional[str] = None

@dataclass
class ResumeModel:
    id: Optional[int] = None
    candidate_id: Optional[int] = None
    filename: str = ""
    file_path: str = ""
    raw_text: Optional[str] = None
    parsed_skills: List[str] = field(default_factory=list)

@dataclass
class TargetJobModel:
    id: Optional[int] = None
    job_title: str = ""
    category: str = ""
    required_skills: List[str] = field(default_factory=list)
    description: str = ""

@dataclass
class SkillAnalysisModel:
    id: Optional[int] = None
    resume_id: Optional[int] = None
    target_job_id: Optional[int] = None
    match_score: float = 0.0
    matching_skills: List[str] = field(default_factory=list)
    missing_skills: List[str] = field(default_factory=list)
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
