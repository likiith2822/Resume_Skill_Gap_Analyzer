import React, { useState, useEffect } from "react";
import { 
  Compass, 
  Sparkles, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Layers, 
  Briefcase, 
  Cpu, 
  RefreshCw, 
  ExternalLink,
  Award,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { 
  JobRole, 
  ResumeListItem, 
  SkillGapAnalysisData, 
  LearningRoadmapData 
} from "../types";

interface SkillGapRoadmapViewProps {
  onNavigateToUpload?: () => void;
  onNavigateToMatching?: () => void;
}

export const SkillGapRoadmapView: React.FC<SkillGapRoadmapViewProps> = ({
  onNavigateToUpload,
  onNavigateToMatching
}) => {
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string>("Entry-Level / Junior (0-2 yrs)");
  const [durationWeeks, setDurationWeeks] = useState<number>(4);

  const [gapData, setGapData] = useState<SkillGapAnalysisData | null>(null);
  const [roadmapData, setRoadmapData] = useState<LearningRoadmapData | null>(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState<any[]>([]);

  const [isAnalyzingGap, setIsAnalyzingGap] = useState<boolean>(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [jobsRes, resumesRes, roadmapsRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/resumes"),
        fetch("/api/roadmaps")
      ]);

      const jobsJson = await jobsRes.json();
      if (jobsJson.success && jobsJson.data?.jobs) {
        setJobs(jobsJson.data.jobs);
        if (jobsJson.data.jobs.length > 0) {
          setSelectedJobId(jobsJson.data.jobs[0].id);
        }
      }

      const resumesJson = await resumesRes.json();
      if (resumesJson.success && resumesJson.data?.resumes) {
        setResumes(resumesJson.data.resumes);
        if (resumesJson.data.resumes.length > 0) {
          setSelectedResumeId(resumesJson.data.resumes[0].id);
        }
      }

      const roadmapsJson = await roadmapsRes.json();
      if (roadmapsJson.success && roadmapsJson.data?.roadmaps) {
        setSavedRoadmaps(roadmapsJson.data.roadmaps);
      }
    } catch (e) {
      console.warn("Failed to load initial data:", e);
    }
  };

  const handleRunSkillGap = async () => {
    if (!selectedJobId) {
      setErrorMessage("Please select a target job role.");
      return;
    }

    setIsAnalyzingGap(true);
    setErrorMessage(null);

    try {
      const payload: any = { job_id: selectedJobId };
      if (selectedResumeId) {
        payload.resume_id = selectedResumeId;
      }

      const res = await fetch("/api/analysis/gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setGapData(json.data);
      } else {
        setErrorMessage(json.error?.message || "Failed to analyze skill gap.");
      }
    } catch (err: any) {
      setErrorMessage(`Network error: ${err.message || "Could not reach server"}`);
    } finally {
      setIsAnalyzingGap(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    const targetJob = jobs.find((j) => j.id === selectedJobId);
    if (!targetJob) {
      setErrorMessage("Please select a target job role first.");
      return;
    }

    setIsGeneratingRoadmap(true);
    setErrorMessage(null);

    try {
      // Gather candidate skills
      let candidateSkills: string[] = [];
      if (gapData) {
        candidateSkills = gapData.matched_skills.map((s) => s.best_candidate_match || s.skill);
      }

      // Gather missing skills
      const missingSkills = gapData 
        ? gapData.missing_skills.map((s) => s.skill)
        : targetJob.required_skills.slice(0, 4);

      const payload = {
        job_role: targetJob.job_title,
        job_id: targetJob.id,
        resume_id: selectedResumeId || null,
        candidate_skills: candidateSkills,
        missing_skills: missingSkills,
        experience_level: experienceLevel,
        duration_weeks: durationWeeks,
        match_percentage: gapData?.skill_match_percentage || null
      };

      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.success && json.data?.roadmap) {
        setRoadmapData(json.data.roadmap);
        // Refresh saved roadmaps
        const roadmapsRes = await fetch("/api/roadmaps");
        const roadmapsJson = await roadmapsRes.json();
        if (roadmapsJson.success && roadmapsJson.data?.roadmaps) {
          setSavedRoadmaps(roadmapsJson.data.roadmaps);
        }
      } else {
        setErrorMessage(json.error?.message || "Failed to generate learning roadmap.");
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message || "Failed to communicate with AI engine"}`);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-stone-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
            <Compass className="w-3.5 h-3.5" />
            <span>Part 6: Skill Gap & Gemini Learning Roadmap</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Targeted Skill Gap Analysis & AI Learning Roadmap
          </h1>
          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            Calculate precise matched, missing, priority, and recommended skills between candidate resumes and job roles.
            Harness Google Gemini to synthesize a structured weekly curriculum with projects and learning resources.
          </p>
        </div>
      </div>

      {/* Control Panel: Select Job & Resume */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-stone-900 flex items-center space-x-2">
          <Target className="w-5 h-5 text-amber-500" />
          <span>Select Target Job & Candidate Resume</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Job Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Target Job Role ({jobs.length} Available)
            </label>
            <select
              value={selectedJobId || ""}
              onChange={(e) => setSelectedJobId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_title} ({j.category})
                </option>
              ))}
            </select>
          </div>

          {/* Resume Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Candidate Resume ({resumes.length} in SQLite)
            </label>
            <select
              value={selectedResumeId || ""}
              onChange={(e) => setSelectedResumeId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} - {r.candidate_name || r.filename} ({r.skills_count} skills)
                </option>
              ))}
            </select>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Experience Level
            </label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="Entry-Level / Junior (0-2 yrs)">Entry-Level / Junior (0-2 yrs)</option>
              <option value="Mid-Level (2-5 yrs)">Mid-Level (2-5 yrs)</option>
              <option value="Senior (5+ yrs)">Senior (5+ yrs)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleRunSkillGap}
            disabled={isAnalyzingGap}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-sm flex items-center space-x-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzingGap ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing Skill Gap...</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                <span>1. Calculate Skill Gap</span>
              </>
            )}
          </button>

          <button
            onClick={handleGenerateRoadmap}
            disabled={isGeneratingRoadmap}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center space-x-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingRoadmap ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating with Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>2. Generate Gemini Learning Roadmap</span>
              </>
            )}
          </button>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Skill Gap Results View */}
      {gapData && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-amber-600">
                Skill Gap Evaluation
              </span>
              <h3 className="text-xl font-bold text-stone-900 mt-1">
                {gapData.job.job_title}
              </h3>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-3xl font-black text-stone-900 font-mono">
                  {gapData.skill_match_percentage}%
                </div>
                <div className="text-[11px] text-stone-500 font-medium">Skill Match %</div>
              </div>
              <div className="h-10 w-px bg-stone-200" />
              <div className="text-right">
                <div className="text-3xl font-black text-stone-900 font-mono">
                  {gapData.priority_skills.priority_match_percentage}%
                </div>
                <div className="text-[11px] text-stone-500 font-medium">Priority Skills Match</div>
              </div>
            </div>
          </div>

          {/* 4-Grid Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Matched Skills */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-emerald-900 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Matched Skills ({gapData.total_matched})</span>
                </h4>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {gapData.matched_skills.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-emerald-200 text-xs flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <span className="font-bold text-stone-900">{item.skill}</span>
                      {item.is_priority && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Priority
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] font-bold text-emerald-700">
                      {item.match_percentage}% Match
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Skills */}
            <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-rose-900 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Missing Skills ({gapData.total_missing})</span>
                </h4>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {gapData.missing_skills.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-rose-200 text-xs flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <span className="font-bold text-stone-900">{item.skill}</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.importance === "High" 
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-stone-100 text-stone-700"
                      }`}>
                        {item.importance} Priority
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 font-medium">
                      {item.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Recommended Skills Checklist */}
          {gapData.recommended_skills.length > 0 && (
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <h4 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span>Recommended Priority Learning Order</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gapData.recommended_skills.map((rec) => (
                  <div
                    key={rec.rank}
                    className="p-3 bg-white rounded-xl border border-stone-200 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-900">
                        {rec.rank}. {rec.skill}
                      </span>
                      <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        Est: {rec.estimated_effort}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px] leading-relaxed">
                      {rec.recommendation_reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Learning Roadmap View */}
      {roadmapData && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Powered by {roadmapData.model_used}</span>
              </div>
              <h3 className="text-2xl font-bold text-stone-900">
                {roadmapData.duration_weeks}-Week Personalized Learning Roadmap
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-xl">
                {roadmapData.overview}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-stone-500 block">Target Role</span>
              <span className="font-bold text-stone-900">{roadmapData.job_title}</span>
            </div>
          </div>

          {/* Weekly Accordion Cards */}
          <div className="space-y-4">
            {roadmapData.weekly_plan.map((week) => {
              const isExpanded = expandedWeek === week.week_number;
              return (
                <div
                  key={week.week_number}
                  className="rounded-2xl border border-stone-200 overflow-hidden transition-all bg-white"
                >
                  <button
                    onClick={() => setExpandedWeek(isExpanded ? 0 : week.week_number)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-sm shrink-0">
                        W{week.week_number}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-stone-900 text-sm sm:text-base truncate">
                            {week.title}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {week.primary_skill}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Estimated ~{week.estimated_hours} Hours • {week.key_topics.length} Core Modules
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-stone-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-stone-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-5 space-y-5 border-t border-stone-200">
                      {/* Learning Objectives */}
                      <div>
                        <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                          Learning Objectives
                        </h5>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                          {week.learning_objectives.map((obj, oIdx) => (
                            <li key={oIdx} className="flex items-start space-x-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Practical Project */}
                      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                        <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                          <span>Weekly Capstone Project: {week.practical_project.name}</span>
                        </h5>
                        <p className="text-xs text-stone-800 leading-relaxed">
                          {week.practical_project.description}
                        </p>
                      </div>

                      {/* Resources */}
                      {week.recommended_resources.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                            Curated Learning Resources
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {week.recommended_resources.map((res, rIdx) => (
                              <a
                                key={rIdx}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 inline-flex items-center space-x-1.5 font-medium transition-colors"
                              >
                                <span>{res.name}</span>
                                <ExternalLink className="w-3 h-3 text-stone-400" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Strategic Advice */}
          {roadmapData.strategic_advice && (
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Strategic Career Advice
              </h4>
              <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
                {roadmapData.strategic_advice}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Saved Roadmaps in SQLite */}
      {savedRoadmaps.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-stone-500" />
            <span>Saved Roadmaps in SQLite Database</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedRoadmaps.map((rm) => (
              <div
                key={rm.id}
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/roadmap/${rm.id}`);
                    const json = await res.json();
                    if (json.success && json.data) {
                      setRoadmapData(json.data);
                    }
                  } catch (e) {}
                }}
                className="p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50/50 hover:bg-amber-50/20 transition-all cursor-pointer space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-stone-900 truncate">
                    {rm.job_title}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {rm.duration_weeks} Wks
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 truncate">
                  {rm.experience_level} • Model: {rm.model_used}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
