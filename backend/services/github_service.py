"""
GitHub Portfolio Profiler Service for Resume Skill Gap Analyzer.
Fetches public GitHub profiles and repositories via the GitHub REST API,
calculates a transparent GitHub Skill Score (0-100), language distributions,
repository activity metrics, and top project highlights.
"""

import os
import re
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

class GitHubProfilerService:
    """Service to analyze public GitHub user profiles and repositories."""

    def __init__(self):
        self.base_url = "https://api.github.com"
        self.user_agent = "Resume-Skill-Gap-Analyzer-App"

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": self.user_agent
        }
        token = os.environ.get("GITHUB_TOKEN", "").strip()
        if token and token != "MY_GITHUB_TOKEN":
            headers["Authorization"] = f"token {token}"
        return headers

    def extract_username(self, input_str: str) -> str:
        """Extract clean username from URLs, @ handles, or plain strings."""
        if not input_str:
            return ""
        s = input_str.strip()
        # Remove trailing slashes
        s = re.sub(r"/+$", "", s)
        # Match URL patterns like https://github.com/username or github.com/username
        url_match = re.search(r"(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)", s, re.IGNORECASE)
        if url_match:
            return url_match.group(1)
        # Remove leading @
        if s.startswith("@"):
            s = s[1:]
        # Take first path segment
        s = s.split("/")[0].strip()
        return s

    def _make_github_request(self, endpoint: str) -> Tuple[Optional[Any], Optional[Dict[str, Any]], Optional[Dict[str, str]]]:
        """Makes an HTTP GET request to GitHub REST API."""
        url = f"{self.base_url}{endpoint}"
        req = urllib.request.Request(url, headers=self._get_headers())

        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                status_code = response.getcode()
                raw_body = response.read().decode("utf-8")
                headers = dict(response.headers)
                rate_limit_info = {
                    "limit": headers.get("x-ratelimit-limit", "60"),
                    "remaining": headers.get("x-ratelimit-remaining", "60"),
                    "reset": headers.get("x-ratelimit-reset", "")
                }
                data = json.loads(raw_body)
                return data, None, rate_limit_info
        except urllib.error.HTTPError as e:
            error_body = ""
            try:
                error_body = e.read().decode("utf-8")
                err_json = json.loads(error_body)
                err_msg = err_json.get("message", e.reason)
            except Exception:
                err_msg = str(e.reason)

            if e.code == 404:
                return None, {"code": "USER_NOT_FOUND", "status": 404, "message": f"GitHub user not found (HTTP 404)."}, None
            elif e.code == 403 and "rate limit" in err_msg.lower():
                return None, {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "status": 403,
                    "message": "GitHub API rate limit reached. Please try again later or add a GITHUB_TOKEN."
                }, None
            else:
                return None, {"code": "GITHUB_API_ERROR", "status": e.code, "message": f"GitHub API error ({e.code}): {err_msg}"}, None
        except Exception as ex:
            return None, {"code": "NETWORK_ERROR", "status": 500, "message": f"Failed to connect to GitHub API: {str(ex)}"}, None

    def calculate_skill_score(
        self,
        user_data: Dict[str, Any],
        repos: List[Dict[str, Any]],
        languages: Dict[str, int]
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Calculate transparent 100-point GitHub Skill Score:
        1. Project Count (0 - 20 pts)
        2. Language Diversity (0 - 20 pts)
        3. Repository Activity (0 - 20 pts)
        4. Community Impact / Stars & Forks (0 - 20 pts)
        5. Project Quality & Engineering Polish (0 - 20 pts)
        """
        original_repos = [r for r in repos if not r.get("fork", False)]
        original_count = len(original_repos)
        total_repos_count = len(repos)

        # 1. Project Count Score (0 - 20 pts)
        if original_count >= 10:
            count_score = 20
            count_feedback = "Extensive portfolio with 10+ original repositories."
        elif original_count >= 6:
            count_score = 17
            count_feedback = "Strong portfolio with 6-9 original projects."
        elif original_count >= 3:
            count_score = 13
            count_feedback = "Solid foundation with 3-5 original projects."
        elif original_count >= 1:
            count_score = 8
            count_feedback = "Active start with 1-2 original projects."
        else:
            count_score = 3 if total_repos_count > 0 else 0
            count_feedback = "Limited or no original public repositories detected."

        # 2. Language Diversity Score (0 - 20 pts)
        lang_count = len([k for k, v in languages.items() if k != "Other" and v > 0])
        if lang_count >= 5:
            lang_score = 20
            lang_feedback = f"Exceptional polyglot stack across {lang_count} distinct programming languages."
        elif lang_count >= 3:
            lang_score = 17
            lang_feedback = f"Versatile multi-stack skillset across {lang_count} languages."
        elif lang_count == 2:
            lang_score = 13
            lang_feedback = "Dual-language stack (e.g. Frontend + Backend)."
        elif lang_count == 1:
            lang_score = 8
            lang_feedback = "Specialized in a single primary programming language."
        else:
            lang_score = 2
            lang_feedback = "No primary programming language detected in public repositories."

        # 3. Repository Activity Score (0 - 20 pts)
        now = datetime.now(timezone.utc)
        latest_push_days = 9999
        pushed_in_last_30 = 0
        pushed_in_last_90 = 0

        for r in repos:
            pushed_at_str = r.get("pushed_at") or r.get("updated_at")
            if pushed_at_str:
                try:
                    pushed_dt = datetime.fromisoformat(pushed_at_str.replace("Z", "+00:00"))
                    diff_days = (now - pushed_dt).days
                    if diff_days < latest_push_days:
                        latest_push_days = diff_days
                    if diff_days <= 30:
                        pushed_in_last_30 += 1
                    if diff_days <= 90:
                        pushed_in_last_90 += 1
                except Exception:
                    pass

        if latest_push_days <= 14 or pushed_in_last_30 >= 2:
            activity_score = 20
            activity_feedback = f"High recent momentum (last active {latest_push_days} days ago, {pushed_in_last_30} repos pushed in last month)."
        elif latest_push_days <= 45 or pushed_in_last_90 >= 2:
            activity_score = 16
            activity_feedback = f"Consistent activity (last active {latest_push_days} days ago)."
        elif latest_push_days <= 120:
            activity_score = 11
            activity_feedback = f"Moderate cadence (last active {latest_push_days} days ago)."
        elif latest_push_days <= 365:
            activity_score = 6
            activity_feedback = f"Occasional activity within the past year."
        else:
            activity_score = 2
            activity_feedback = "Low recent activity (>1 year since last public push)."

        # 4. Community Impact / Stars & Forks (0 - 20 pts)
        total_stars = sum(r.get("stargazers_count", 0) for r in repos)
        total_forks = sum(r.get("forks_count", 0) for r in repos)
        impact_units = total_stars * 1.5 + total_forks * 2.0

        if impact_units >= 50 or total_stars >= 30:
            impact_score = 20
            impact_feedback = f"High open-source impact ({total_stars} stars, {total_forks} forks across projects)."
        elif impact_units >= 20 or total_stars >= 10:
            impact_score = 17
            impact_feedback = f"Notable community traction ({total_stars} stars, {total_forks} forks)."
        elif impact_units >= 6 or total_stars >= 3:
            impact_score = 13
            impact_feedback = f"Growing open-source recognition ({total_stars} stars, {total_forks} forks)."
        elif total_stars >= 1 or total_forks >= 1:
            impact_score = 9
            impact_feedback = f"Initial community engagement ({total_stars} stars, {total_forks} forks)."
        else:
            impact_score = 5
            impact_feedback = "Portfolio ready for community visibility and star attraction."

        # 5. Project Quality & Engineering Polish (0 - 20 pts)
        # Evaluated by: descriptions, topics/tags, homepage links, license, original repo ratio
        repos_with_desc = sum(1 for r in original_repos if r.get("description"))
        repos_with_topics = sum(1 for r in original_repos if r.get("topics") and len(r.get("topics", [])) > 0)
        repos_with_homepage = sum(1 for r in original_repos if r.get("homepage"))
        has_license_count = sum(1 for r in original_repos if r.get("license"))

        quality_pts = 0
        if original_count > 0:
            desc_ratio = repos_with_desc / original_count
            topics_ratio = repos_with_topics / original_count
            
            if desc_ratio >= 0.75:
                quality_pts += 6
            elif desc_ratio >= 0.4:
                quality_pts += 4
            else:
                quality_pts += 2

            if topics_ratio >= 0.5:
                quality_pts += 5
            elif topics_ratio > 0:
                quality_pts += 3

            if repos_with_homepage >= 1 or has_license_count >= 1:
                quality_pts += 5
            else:
                quality_pts += 2

            # Non-fork ratio bonus
            if original_count / max(1, total_repos_count) >= 0.7:
                quality_pts += 4
            else:
                quality_pts += 2
        else:
            quality_pts = 4

        quality_score = min(20, quality_pts)
        quality_feedback = f"Documentation & Metadata: {repos_with_desc}/{original_count} projects documented, {repos_with_topics} tagged with topics."

        total_score = min(100, max(0, count_score + lang_score + activity_score + impact_score + quality_score))

        # Skill Level Designation
        if total_score >= 85:
            tier = "Advanced / Open Source Leader"
            tier_badge = "emerald"
        elif total_score >= 70:
            tier = "Proficient / Industry Ready"
            tier_badge = "teal"
        elif total_score >= 50:
            tier = "Intermediate / Active Builder"
            tier_badge = "amber"
        else:
            tier = "Emerging / Early Stage"
            tier_badge = "blue"

        breakdown = {
            "project_count": {
                "score": count_score,
                "max": 20,
                "original_repos": original_count,
                "total_repos": total_repos_count,
                "feedback": count_feedback
            },
            "language_diversity": {
                "score": lang_score,
                "max": 20,
                "distinct_languages": lang_count,
                "feedback": lang_feedback
            },
            "repository_activity": {
                "score": activity_score,
                "max": 20,
                "days_since_last_push": latest_push_days if latest_push_days < 9999 else None,
                "pushed_in_last_30_days": pushed_in_last_30,
                "pushed_in_last_90_days": pushed_in_last_90,
                "feedback": activity_feedback
            },
            "community_impact": {
                "score": impact_score,
                "max": 20,
                "total_stars": total_stars,
                "total_forks": total_forks,
                "followers": user_data.get("followers", 0),
                "feedback": impact_feedback
            },
            "project_quality": {
                "score": quality_score,
                "max": 20,
                "documented_repos": repos_with_desc,
                "tagged_repos": repos_with_topics,
                "live_demos": repos_with_homepage,
                "feedback": quality_feedback
            },
            "tier": tier,
            "tier_badge": tier_badge
        }

        return total_score, breakdown

    def analyze_profile(self, input_identifier: str) -> Dict[str, Any]:
        """Conduct full portfolio analysis for a GitHub user."""
        username = self.extract_username(input_identifier)
        if not username:
            return {
                "success": False,
                "error": {
                    "code": "INVALID_USERNAME",
                    "message": "Please provide a valid GitHub username or profile URL."
                }
            }

        # 1. Fetch User Profile
        user_data, user_err, rate_info = self._make_github_request(f"/users/{username}")
        if user_err:
            return {"success": False, "error": user_err}

        # 2. Fetch User Repositories (up to 100)
        repos_data, repos_err, _ = self._make_github_request(f"/users/{username}/repos?sort=updated&per_page=100")
        repos = repos_data if isinstance(repos_data, list) else []

        # 3. Analyze Languages
        lang_counts: Dict[str, int] = {}
        for r in repos:
            lang = r.get("language")
            if lang:
                lang_counts[lang] = lang_counts.get(lang, 0) + 1

        total_lang_repos = sum(lang_counts.values()) or 1
        sorted_languages = sorted(
            [
                {
                    "language": k,
                    "repo_count": v,
                    "percentage": round((v / total_lang_repos) * 100, 1)
                }
                for k, v in lang_counts.items()
            ],
            key=lambda x: -x["repo_count"]
        )

        primary_language = sorted_languages[0]["language"] if sorted_languages else "None"

        # 4. Calculate Transparent GitHub Skill Score
        skill_score, score_breakdown = self.calculate_skill_score(user_data, repos, lang_counts)

        # 5. Extract & Rank Top Projects
        def repo_quality_rank(r: Dict[str, Any]) -> float:
            stars = r.get("stargazers_count", 0) * 10
            forks = r.get("forks_count", 0) * 8
            is_fork = -50 if r.get("fork", False) else 20
            has_desc = 15 if r.get("description") else 0
            has_topics = len(r.get("topics", [])) * 5
            has_demo = 15 if r.get("homepage") else 0
            return stars + forks + is_fork + has_desc + has_topics + has_demo

        sorted_repos = sorted(repos, key=repo_quality_rank, reverse=True)
        top_projects = []
        for r in sorted_repos[:8]:
            top_projects.append({
                "name": r.get("name"),
                "full_name": r.get("full_name"),
                "html_url": r.get("html_url"),
                "description": r.get("description") or "No description provided.",
                "language": r.get("language") or "General",
                "stars": r.get("stargazers_count", 0),
                "forks": r.get("forks_count", 0),
                "open_issues": r.get("open_issues_count", 0),
                "homepage": r.get("homepage"),
                "is_fork": r.get("fork", False),
                "topics": r.get("topics", []) or [],
                "updated_at": r.get("updated_at"),
                "pushed_at": r.get("pushed_at")
            })

        total_stars = sum(r.get("stargazers_count", 0) for r in repos)
        total_forks = sum(r.get("forks_count", 0) for r in repos)

        activity_summary = {
            "total_public_repos": len(repos),
            "original_repos": len([r for r in repos if not r.get("fork", False)]),
            "forked_repos": len([r for r in repos if r.get("fork", False)]),
            "total_stars": total_stars,
            "total_forks": total_forks,
            "days_since_last_push": score_breakdown["repository_activity"]["days_since_last_push"],
            "recent_activity_level": "High" if skill_score >= 70 else ("Moderate" if skill_score >= 45 else "Low")
        }

        # 6. Portfolio Improvement Recommendations
        recommendations = []
        if score_breakdown["project_quality"]["score"] < 15:
            recommendations.append("Add rich READMEs, architecture diagrams, and clear descriptions to your top repositories.")
        if score_breakdown["language_diversity"]["score"] < 14:
            recommendations.append("Diversify your portfolio by building a full-stack project combining frontend (React/TypeScript) and backend (Python/Node.js).")
        if score_breakdown["repository_activity"]["score"] < 15:
            recommendations.append("Maintain an active commit streak by committing code increments at least 2-3 times per week.")
        if score_breakdown["community_impact"]["score"] < 13:
            recommendations.append("Share your project links on technical communities (LinkedIn, Reddit, Dev.to) to gain community stars and feedback.")
        if not recommendations:
            recommendations.append("Outstanding technical portfolio! Keep your flagship repositories updated with recent tech stacks.")

        return {
            "success": True,
            "message": f"GitHub portfolio analysis completed for @{user_data.get('login')}.",
            "data": {
                "username": user_data.get("login"),
                "profile_url": user_data.get("html_url"),
                "avatar_url": user_data.get("avatar_url"),
                "name": user_data.get("name") or user_data.get("login"),
                "bio": user_data.get("bio"),
                "company": user_data.get("company"),
                "location": user_data.get("location"),
                "blog": user_data.get("blog"),
                "twitter_username": user_data.get("twitter_username"),
                "public_repos": user_data.get("public_repos", len(repos)),
                "public_gists": user_data.get("public_gists", 0),
                "followers": user_data.get("followers", 0),
                "following": user_data.get("following", 0),
                "account_created_at": user_data.get("created_at"),
                "skill_score": skill_score,
                "skill_score_label": f"GitHub Skill Score: {skill_score}/100",
                "score_breakdown": score_breakdown,
                "primary_language": primary_language,
                "languages": sorted_languages,
                "top_projects": top_projects,
                "activity_summary": activity_summary,
                "recommendations": recommendations,
                "rate_limit_info": rate_info
            }
        }

github_service = GitHubProfilerService()
