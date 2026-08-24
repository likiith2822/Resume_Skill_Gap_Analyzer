import React, { useState, useEffect } from "react";
import { 
  Github, 
  Search, 
  Star, 
  GitFork, 
  BookOpen, 
  Code2, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Sparkles, 
  Award, 
  BarChart3, 
  RefreshCw, 
  Clock, 
  Users, 
  MapPin, 
  Briefcase, 
  Link as LinkIcon, 
  Layers,
  ShieldCheck,
  Zap,
  Info
} from "lucide-react";
import { GitHubProfileData } from "../types";

export const GitHubPortfolioProfiler: React.FC = () => {
  const [inputHandle, setInputHandle] = useState<string>("torvalds");
  const [profileData, setProfileData] = useState<GitHubProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"projects" | "breakdown" | "languages" | "recommendations">("projects");

  const sampleHandles = [
    { label: "Linus Torvalds", handle: "torvalds", tag: "Kernel / C" },
    { label: "Dan Abramov", handle: "gaearon", tag: "React / JS" },
    { label: "The Octocat", handle: "octocat", tag: "GitHub Demo" },
    { label: "Salvatore Sanfilippo", handle: "antirez", tag: "Redis / C" }
  ];

  // Fetch recent profiles on mount
  useEffect(() => {
    fetchRecentProfiles();
    // Default load torvalds or octocat
    handleAnalyze("torvalds");
  }, []);

  const fetchRecentProfiles = async () => {
    try {
      const res = await fetch("/api/github/profiles?limit=10");
      const json = await res.json();
      if (json.success && json.data?.profiles) {
        setRecentProfiles(json.data.profiles);
      }
    } catch (e) {
      console.warn("Failed to fetch recent GitHub profiles:", e);
    }
  };

  const handleAnalyze = async (overrideHandle?: string) => {
    const target = (overrideHandle || inputHandle || "").trim();
    if (!target) {
      setErrorMessage("Please enter a valid GitHub username or profile URL.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/github/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target })
      });

      const result = await response.json();

      if (response.ok && result.success && result.data) {
        setProfileData(result.data);
        fetchRecentProfiles();
      } else {
        const errorText = result.error?.message || "Failed to analyze GitHub profile.";
        setErrorMessage(errorText);
      }
    } catch (err: any) {
      setErrorMessage(`Network error: ${err.message || "Could not reach server"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 65) return "text-teal-600 bg-teal-50 border-teal-200";
    if (score >= 45) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getProgressColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 60) return "bg-teal-500";
    if (pct >= 40) return "bg-amber-500";
    return "bg-blue-500";
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-stone-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
            <Github className="w-3.5 h-3.5" />
            <span>Part 7: GitHub Portfolio Profiler</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Real-Time GitHub Skill & Portfolio Scoring
          </h1>
          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            Analyze any public GitHub profile using the GitHub REST API. Computes a transparent 100-point 
            <strong className="text-amber-400"> GitHub Skill Score</strong> based on repository depth, language diversity, 
            commit momentum, open-source community impact, and repository engineering polish.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Input & Search Section */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze();
          }}
          className="space-y-4"
        >
          <label className="block text-sm font-semibold text-stone-800">
            Enter GitHub Profile URL or Username
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Github className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={inputHandle}
                onChange={(e) => setInputHandle(e.target.value)}
                placeholder="e.g. torvalds or https://github.com/gaearon"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-300 bg-stone-50/50 text-stone-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing via GitHub API...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Analyze Portfolio</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Benchmark Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-stone-600">
            <span className="font-semibold text-stone-500">Quick Test Profiles:</span>
            {sampleHandles.map((sample) => (
              <button
                key={sample.handle}
                type="button"
                onClick={() => {
                  setInputHandle(sample.handle);
                  handleAnalyze(sample.handle);
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium border border-stone-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>@{sample.handle}</span>
                <span className="text-[10px] text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                  {sample.tag}
                </span>
              </button>
            ))}
          </div>
        </form>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Analysis Failed</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis Results */}
      {profileData && (
        <div className="space-y-6">
          {/* Profile Overview Card & Skill Score Hero */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Profile Details (Left) */}
              <div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                {profileData.avatar_url ? (
                  <img
                    src={profileData.avatar_url}
                    alt={profileData.username}
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-amber-500/20 shadow-md object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200">
                    <Github className="w-12 h-12" />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-stone-900">{profileData.name}</h2>
                    <a
                      href={profileData.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                    >
                      <span>@{profileData.username}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {profileData.bio && (
                    <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 max-w-md">
                      {profileData.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-stone-500 pt-1">
                    {profileData.company && (
                      <span className="flex items-center space-x-1">
                        <Briefcase className="w-3.5 h-3.5 text-stone-400" />
                        <span>{profileData.company}</span>
                      </span>
                    )}
                    {profileData.location && (
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>{profileData.location}</span>
                      </span>
                    )}
                    {profileData.blog && (
                      <a
                        href={profileData.blog.startsWith("http") ? profileData.blog : `https://${profileData.blog}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-stone-600 hover:text-amber-600 underline"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-stone-400" />
                        <span className="truncate max-w-[150px]">{profileData.blog}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* GitHub Skill Score Display (Right) */}
              <div className="lg:col-span-5 bg-stone-50 rounded-2xl border border-stone-200 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="text-xs uppercase tracking-wider font-bold text-stone-500 mb-1">
                  Evaluated Public Standing
                </div>
                
                <div className="my-2">
                  <div className="text-4xl sm:text-5xl font-black tracking-tight text-stone-900">
                    {profileData.skill_score}
                    <span className="text-2xl font-bold text-stone-400">/100</span>
                  </div>
                  <div className="text-xs font-bold text-amber-600 mt-1 font-mono tracking-wide">
                    {profileData.skill_score_label}
                  </div>
                </div>

                <div className="mt-3">
                  <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(profileData.skill_score)}`}>
                    <Award className="w-3.5 h-3.5" />
                    <span>{profileData.score_breakdown?.tier || "Industry Candidate"}</span>
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 w-full pt-3 border-t border-stone-200 text-center">
                  <div>
                    <div className="text-lg font-bold text-stone-900">{profileData.activity_summary.total_stars}</div>
                    <div className="text-[11px] text-stone-500 font-medium">Total Stars</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-stone-900">{profileData.public_repos}</div>
                    <div className="text-[11px] text-stone-500 font-medium">Public Repos</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-stone-900">{profileData.followers}</div>
                    <div className="text-[11px] text-stone-500 font-medium">Followers</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-stone-200 space-x-4 text-sm font-semibold">
            <button
              onClick={() => setActiveTab("projects")}
              className={`pb-3 px-1 border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
                activeTab === "projects"
                  ? "border-amber-500 text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Top Repositories ({profileData.top_projects.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("breakdown")}
              className={`pb-3 px-1 border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
                activeTab === "breakdown"
                  ? "border-amber-500 text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Transparent Score Breakdown</span>
            </button>
            <button
              onClick={() => setActiveTab("languages")}
              className={`pb-3 px-1 border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
                activeTab === "languages"
                  ? "border-amber-500 text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Languages ({profileData.languages.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("recommendations")}
              className={`pb-3 px-1 border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
                activeTab === "recommendations"
                  ? "border-amber-500 text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Recommendations ({profileData.recommendations.length})</span>
            </button>
          </div>

          {/* Sub-Tab 1: Top Repositories */}
          {activeTab === "projects" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileData.top_projects.map((repo, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-stone-900 hover:text-amber-600 transition-colors flex items-center space-x-1.5 group text-base"
                      >
                        <span className="group-hover:underline">{repo.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600" />
                      </a>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                        {repo.language}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                      {repo.description}
                    </p>

                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {repo.topics.slice(0, 4).map((topic, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-md border border-amber-200"
                          >
                            #{topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100 text-xs text-stone-500">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1 font-semibold text-stone-700">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span>{repo.stars.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center space-x-1 font-semibold text-stone-700">
                        <GitFork className="w-3.5 h-3.5 text-stone-400" />
                        <span>{repo.forks.toLocaleString()}</span>
                      </span>
                    </div>

                    {repo.homepage && (
                      <a
                        href={repo.homepage.startsWith("http") ? repo.homepage : `https://${repo.homepage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-amber-600 hover:text-amber-700 font-semibold"
                      >
                        <span>Live Demo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sub-Tab 2: Transparent Score Breakdown */}
          {activeTab === "breakdown" && (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Transparent 100-Point Scoring Breakdown
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Each pillar is scored out of 20 points based on concrete, objective GitHub signals.
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Project Count */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center space-x-2 font-bold text-stone-800 text-sm">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span>1. Project Count & Original Repositories</span>
                    </div>
                    <div className="text-sm font-bold text-stone-900 font-mono">
                      {profileData.score_breakdown.project_count.score} / 20 pts
                    </div>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${getProgressColor(profileData.score_breakdown.project_count.score, 20)}`}
                      style={{ width: `${(profileData.score_breakdown.project_count.score / 20) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-600">
                    {profileData.score_breakdown.project_count.feedback} ({profileData.score_breakdown.project_count.original_repos} original out of {profileData.score_breakdown.project_count.total_repos} public repos).
                  </p>
                </div>

                {/* 2. Language Diversity */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center space-x-2 font-bold text-stone-800 text-sm">
                      <Code2 className="w-4 h-4 text-amber-600" />
                      <span>2. Language Diversity & Tech Stack Range</span>
                    </div>
                    <div className="text-sm font-bold text-stone-900 font-mono">
                      {profileData.score_breakdown.language_diversity.score} / 20 pts
                    </div>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${getProgressColor(profileData.score_breakdown.language_diversity.score, 20)}`}
                      style={{ width: `${(profileData.score_breakdown.language_diversity.score / 20) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-600">
                    {profileData.score_breakdown.language_diversity.feedback}
                  </p>
                </div>

                {/* 3. Repository Activity */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center space-x-2 font-bold text-stone-800 text-sm">
                      <Activity className="w-4 h-4 text-amber-600" />
                      <span>3. Repository Activity & Commit Momentum</span>
                    </div>
                    <div className="text-sm font-bold text-stone-900 font-mono">
                      {profileData.score_breakdown.repository_activity.score} / 20 pts
                    </div>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${getProgressColor(profileData.score_breakdown.repository_activity.score, 20)}`}
                      style={{ width: `${(profileData.score_breakdown.repository_activity.score / 20) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-600">
                    {profileData.score_breakdown.repository_activity.feedback}
                  </p>
                </div>

                {/* 4. Community Impact */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center space-x-2 font-bold text-stone-800 text-sm">
                      <Star className="w-4 h-4 text-amber-600" />
                      <span>4. Community Impact (Stars & Forks)</span>
                    </div>
                    <div className="text-sm font-bold text-stone-900 font-mono">
                      {profileData.score_breakdown.community_impact.score} / 20 pts
                    </div>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${getProgressColor(profileData.score_breakdown.community_impact.score, 20)}`}
                      style={{ width: `${(profileData.score_breakdown.community_impact.score / 20) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-600">
                    {profileData.score_breakdown.community_impact.feedback}
                  </p>
                </div>

                {/* 5. Project Quality */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center space-x-2 font-bold text-stone-800 text-sm">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>5. Project Quality & Engineering Metadata</span>
                    </div>
                    <div className="text-sm font-bold text-stone-900 font-mono">
                      {profileData.score_breakdown.project_quality.score} / 20 pts
                    </div>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${getProgressColor(profileData.score_breakdown.project_quality.score, 20)}`}
                      style={{ width: `${(profileData.score_breakdown.project_quality.score / 20) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-600">
                    {profileData.score_breakdown.project_quality.feedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Programming Languages */}
          {activeTab === "languages" && (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    Language Distribution
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Primary focus: <strong className="text-stone-800">{profileData.primary_language}</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {profileData.languages.map((lang, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-stone-800">
                      <span>{lang.language}</span>
                      <span className="text-stone-500 font-mono">
                        {lang.repo_count} {lang.repo_count === 1 ? "repo" : "repos"} ({lang.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${lang.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Recommendations */}
          {activeTab === "recommendations" && (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Targeted Portfolio Action Items
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Follow these proven guidelines to optimize your GitHub profile for technical recruiters.
                </p>
              </div>

              <div className="space-y-3">
                {profileData.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start space-x-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm font-medium text-stone-800 leading-relaxed">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Analyses SQLite History Card */}
      {recentProfiles.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-stone-500" />
              <span>Recent Analyzed Profiles in SQLite</span>
            </h3>
            <button
              onClick={fetchRecentProfiles}
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentProfiles.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setInputHandle(p.username);
                  handleAnalyze(p.username);
                }}
                className="p-3 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50/50 hover:bg-amber-50/30 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.username}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover border border-stone-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center text-stone-600 font-bold">
                      {p.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 truncate">@{p.username}</p>
                    <p className="text-[11px] text-stone-500 truncate">{p.name || p.primary_language || "Developer"}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-800 font-mono">
                    {p.skill_score}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
