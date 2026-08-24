import React, { useState, useEffect, useCallback } from "react";
import { 
  JobRole, 
  SemanticMatchResult, 
  MatchedSkillItem, 
  ApiResponse 
} from "../types";
import { 
  fetchJobsListApi, 
  matchSkillsApi, 
  fetchResumesListApi,
  runMatchingBenchmarkApi 
} from "../services/api";
import { 
  Brain, 
  Briefcase, 
  Target, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  Search, 
  Sliders, 
  FileText, 
  Layers, 
  Award, 
  ChevronRight, 
  Cpu, 
  Network,
  BarChart3,
  HelpCircle,
  Zap,
  Star,
  Flame,
  Info
} from "lucide-react";

interface SemanticMatchingViewProps {
  onNavigateToUpload?: () => void;
  onNavigateToNlp?: () => void;
}

export const SemanticMatchingView: React.FC<SemanticMatchingViewProps> = ({
  onNavigateToUpload,
  onNavigateToNlp
}) => {
  // State for Job Roles
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);

  // State for Resumes / Input Mode
  const [inputMode, setInputMode] = useState<"resume" | "custom_skills" | "benchmark">("resume");
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [customSkillsInput, setCustomSkillsInput] = useState<string>(
    "React, TypeScript, JavaScript, Node.js, Express, Tailwind CSS, PostgreSQL, Git, REST APIs"
  );

  // State for Matching Results
  const [matchResult, setMatchResult] = useState<SemanticMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Filter / Tab inside Results
  const [skillFilter, setSkillFilter] = useState<"all" | "matched" | "missing" | "priority">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Benchmark multi-role comparison state
  const [benchmarkData, setBenchmarkData] = useState<any[] | null>(null);
  const [isLoadingBenchmark, setIsLoadingBenchmark] = useState<boolean>(false);

  // 1. Fetch available Job Roles & Resumes on load
  const loadInitialData = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const [jobsRes, resumesRes] = await Promise.all([
        fetchJobsListApi(),
        fetchResumesListApi()
      ]);

      if (jobsRes.success && jobsRes.data?.jobs) {
        setJobs(jobsRes.data.jobs);
        if (jobsRes.data.jobs.length > 0 && !selectedJobId) {
          setSelectedJobId(jobsRes.data.jobs[0].id);
        }
      }

      if (resumesRes.success && resumesRes.data?.resumes) {
        setResumes(resumesRes.data.resumes);
        if (resumesRes.data.resumes.length > 0 && !selectedResumeId) {
          setSelectedResumeId(resumesRes.data.resumes[0].id);
        }
      }
    } catch (err: any) {
      console.error("Error loading jobs/resumes:", err);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [selectedJobId, selectedResumeId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Perform Semantic Match
  const executeMatch = useCallback(async (jobIdToMatch?: number) => {
    const targetJobId = jobIdToMatch || selectedJobId;
    if (!targetJobId) return;

    setIsMatching(true);
    setMatchError(null);

    let payload: any = { job_id: targetJobId };

    if (inputMode === "resume" && selectedResumeId) {
      payload.resume_id = selectedResumeId;
    } else if (inputMode === "custom_skills") {
      const parsedSkills = customSkillsInput
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      payload.skills = parsedSkills;
    }

    try {
      const res = await matchSkillsApi(payload);
      if (res.success && res.data) {
        setMatchResult(res.data);
      } else {
        setMatchError(res.error?.message || "Failed to perform semantic match.");
      }
    } catch (err: any) {
      setMatchError(err.message || "Network error occurred.");
    } finally {
      setIsMatching(false);
    }
  }, [selectedJobId, inputMode, selectedResumeId, customSkillsInput]);

  // Auto trigger match when job role or resume changes if in resume or custom mode
  useEffect(() => {
    if (selectedJobId && (selectedResumeId || inputMode === "custom_skills")) {
      executeMatch(selectedJobId);
    }
  }, [selectedJobId, selectedResumeId, inputMode]);

  // 3. Run multi-role benchmark
  const handleRunBenchmark = async () => {
    setIsLoadingBenchmark(true);
    try {
      const res = await runMatchingBenchmarkApi();
      if (res.success && res.data?.benchmark_results) {
        setBenchmarkData(res.data.benchmark_results);
      }
    } catch (err: any) {
      console.error("Failed benchmark:", err);
    } finally {
      setIsLoadingBenchmark(false);
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Helper for score badge colors
  const getScoreColorClass = (pct: number) => {
    if (pct >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-300";
    if (pct >= 65) return "text-teal-700 bg-teal-50 border-teal-300";
    if (pct >= 50) return "text-amber-700 bg-amber-50 border-amber-300";
    if (pct >= 35) return "text-orange-700 bg-orange-50 border-orange-300";
    return "text-rose-700 bg-rose-50 border-rose-300";
  };

  const getScoreBarGradient = (pct: number) => {
    if (pct >= 80) return "bg-gradient-to-r from-emerald-500 to-teal-500";
    if (pct >= 65) return "bg-gradient-to-r from-teal-500 to-cyan-500";
    if (pct >= 50) return "bg-gradient-to-r from-amber-500 to-amber-600";
    if (pct >= 35) return "bg-gradient-to-r from-orange-500 to-amber-500";
    return "bg-gradient-to-r from-rose-500 to-red-500";
  };

  // Filter skills list
  const allSkillsCombined: MatchedSkillItem[] = matchResult ? [
    ...matchResult.matched_skills,
    ...matchResult.missing_skills
  ] : [];

  const filteredSkills = allSkillsCombined.filter(item => {
    const matchesSearch = item.skill.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.best_candidate_match && item.best_candidate_match.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (skillFilter === "matched") return item.match_type !== "missing";
    if (skillFilter === "missing") return item.match_type === "missing";
    if (skillFilter === "priority") return item.is_priority;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Pipeline Description */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Brain className="w-3.5 h-3.5" />
            <span>Part 5: Semantic Skill Matching Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Target Job Selection & Cosine Similarity Matcher
          </h1>
          <p className="text-sm text-stone-300 leading-relaxed mb-6">
            Evaluates candidate skills against 6 standard job roles using deep sentence embeddings generated with 
            <strong className="text-amber-300 font-mono ml-1">all-MiniLM-L6-v2 (384 dims)</strong>. 
            Identifies exact matches, high-affinity semantic equivalents, and prioritized skill gaps with accurate mathematical scoring (0–100%).
          </p>

          {/* Flow Diagram */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
            <div className="bg-stone-800/80 border border-stone-700/80 rounded-lg p-2.5">
              <span className="text-stone-400 block text-[10px]">Step 1</span>
              <strong className="text-amber-300">Resume Skills</strong>
            </div>
            <div className="bg-stone-800/80 border border-stone-700/80 rounded-lg p-2.5">
              <span className="text-stone-400 block text-[10px]">Step 2</span>
              <strong className="text-purple-300">all-MiniLM-L6-v2</strong>
            </div>
            <div className="bg-stone-800/80 border border-stone-700/80 rounded-lg p-2.5">
              <span className="text-stone-400 block text-[10px]">Step 3</span>
              <strong className="text-cyan-300">Target Job Skills</strong>
            </div>
            <div className="bg-stone-800/80 border border-stone-700/80 rounded-lg p-2.5">
              <span className="text-stone-400 block text-[10px]">Step 4</span>
              <strong className="text-emerald-300">Cosine Sim Matrix</strong>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-amber-950/40 border border-amber-600/40 rounded-lg p-2.5">
              <span className="text-amber-400/80 block text-[10px]">Step 5</span>
              <strong className="text-amber-300">0–100% Score</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Input Mode Selector Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Candidate Input Source:</span>
          <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              id="input-mode-resume"
              onClick={() => setInputMode("resume")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                inputMode === "resume" 
                  ? "bg-white text-stone-900 shadow-xs border border-stone-200" 
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Parsed Resumes ({resumes.length})</span>
            </button>
            <button
              id="input-mode-custom"
              onClick={() => setInputMode("custom_skills")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                inputMode === "custom_skills" 
                  ? "bg-white text-stone-900 shadow-xs border border-stone-200" 
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Custom Skill List</span>
            </button>
            <button
              id="input-mode-benchmark"
              onClick={() => {
                setInputMode("benchmark");
                if (!benchmarkData) handleRunBenchmark();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                inputMode === "benchmark" 
                  ? "bg-purple-900 text-purple-100 shadow-xs" 
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Multi-Role Benchmark</span>
            </button>
          </div>
        </div>

        {/* Action button */}
        {inputMode !== "benchmark" && (
          <button
            id="recalculate-match-btn"
            onClick={() => executeMatch()}
            disabled={isMatching}
            className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMatching ? "animate-spin" : ""}`} />
            <span>{isMatching ? "Computing Embeddings..." : "Re-Calculate Similarity"}</span>
          </button>
        )}
      </div>

      {/* Input Options Body */}
      {inputMode === "resume" && (
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            Select Active Candidate Resume from SQLite:
          </label>
          {resumes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {resumes.map((r) => {
                const isSel = selectedResumeId === r.id;
                return (
                  <button
                    key={r.id}
                    id={`resume-item-${r.id}`}
                    onClick={() => setSelectedResumeId(r.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isSel 
                        ? "bg-amber-50/80 border-amber-400 shadow-xs ring-2 ring-amber-300/40" 
                        : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-stone-900 truncate max-w-[180px]">
                        {r.original_filename || r.filename}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                        #{r.id}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center justify-between">
                      <span>{r.candidate_name || "Parsed Candidate"}</span>
                      <span>{r.total_skills_count || "Auto"} skills</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-300">
              <FileText className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-xs text-stone-600 font-semibold mb-2">No resumes uploaded yet in SQLite database.</p>
              <button
                onClick={onNavigateToUpload}
                className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition"
              >
                Upload a Resume First
              </button>
            </div>
          )}
        </div>
      )}

      {inputMode === "custom_skills" && (
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
            Test Custom Candidate Skills (Comma or Newline Separated):
          </label>
          <textarea
            id="custom-skills-textarea"
            rows={3}
            value={customSkillsInput}
            onChange={(e) => setCustomSkillsInput(e.target.value)}
            placeholder="e.g. Python, PyTorch, Natural Language Processing, Hugging Face, Transformers..."
            className="w-full text-xs font-mono p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
          />
          <div className="flex items-center justify-between mt-2 text-[11px] text-stone-500">
            <span>Enter any skills, frameworks, or domain keywords to test semantic vectors against job specs.</span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setCustomSkillsInput("Python, PyTorch, Deep Learning, Natural Language Processing, Transformers, Large Language Models, LangChain, RAG (Retrieval-Augmented Generation)")}
                className="text-purple-700 hover:underline font-semibold"
              >
                Preset: AI / LLM
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setCustomSkillsInput("AWS, Docker, Kubernetes, Terraform, CI/CD, Linux, Shell / Bash, DevOps, Nginx")}
                className="text-cyan-700 hover:underline font-semibold"
              >
                Preset: Cloud / DevOps
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setCustomSkillsInput("Python, SQL, Pandas, NumPy, Scikit-Learn, Data Analysis, Machine Learning, Data Visualization")}
                className="text-emerald-700 hover:underline font-semibold"
              >
                Preset: Data Science
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark Matrix View */}
      {inputMode === "benchmark" && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>Cross-Role Semantic Benchmark Matrix</span>
              </h2>
              <p className="text-xs text-stone-500">
                Simultaneously testing 3 benchmark candidate profiles across all 6 SQLite job roles.
              </p>
            </div>
            <button
              onClick={handleRunBenchmark}
              disabled={isLoadingBenchmark}
              className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBenchmark ? "animate-spin" : ""}`} />
              <span>{isLoadingBenchmark ? "Computing..." : "Re-Run Benchmark"}</span>
            </button>
          </div>

          {isLoadingBenchmark ? (
            <div className="py-12 text-center text-stone-500 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500" />
              <p className="text-xs font-semibold">Running multi-vector semantic scoring...</p>
            </div>
          ) : benchmarkData ? (
            <div className="space-y-6">
              {benchmarkData.map((cand, idx) => (
                <div key={idx} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200">
                    <div>
                      <h3 className="font-bold text-sm text-stone-900">{cand.candidate_name}</h3>
                      <span className="text-[11px] text-stone-500">{cand.skills_count} extracted skills in profile</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {cand.role_matches.map((rm: any, rIdx: number) => {
                      const score = rm.match_percentage;
                      return (
                        <div 
                          key={rIdx} 
                          className="bg-white border border-stone-200 rounded-xl p-3 text-center shadow-2xs hover:border-amber-400 transition"
                        >
                          <span className="block text-[11px] font-bold text-stone-800 truncate mb-1" title={rm.job_title}>
                            {rm.job_title}
                          </span>
                          <div className={`inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getScoreColorClass(score)} mb-1.5`}>
                            {score}%
                          </div>
                          <div className="text-[10px] text-stone-500">
                            <span>{rm.matched_count} match • {rm.missing_count} gap</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-stone-500">
              Click &apos;Re-Run Benchmark&apos; to execute the multi-candidate evaluation.
            </div>
          )}
        </div>
      )}

      {/* Main 6-Role Selector Tabs */}
      {inputMode !== "benchmark" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-amber-500" />
              <span>Select Target Job Role (6 Roles in SQLite):</span>
            </h2>
            <span className="text-xs text-stone-500 font-medium">Click any role to inspect match score</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {jobs.map((job) => {
              const isSelected = selectedJobId === job.id;
              return (
                <button
                  key={job.id}
                  id={`job-role-btn-${job.id}`}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? "bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-amber-400"
                      : "bg-white text-stone-900 border-stone-200 hover:border-stone-300 hover:bg-stone-50 shadow-2xs"
                  }`}
                >
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                      isSelected ? "text-amber-400" : "text-stone-500"
                    }`}>
                      {job.category}
                    </span>
                    <h3 className="font-bold text-xs sm:text-sm leading-tight mb-2">
                      {job.job_title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-stone-200/20 flex items-center justify-between text-[11px]">
                    <span className={isSelected ? "text-stone-300" : "text-stone-500"}>
                      {job.required_skills?.length || 14} reqs
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Matching Results Stage */}
      {inputMode !== "benchmark" && (
        <div className="space-y-6">
          {matchError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{matchError}</span>
            </div>
          )}

          {isMatching && !matchResult ? (
            <div className="bg-white rounded-2xl p-12 border border-stone-200 text-center space-y-3">
              <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-stone-900">Computing Sentence Embeddings...</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Running <strong>all-MiniLM-L6-v2</strong> model to encode candidate and job requirements into 384-dimensional vector space and calculating cosine similarity.
              </p>
            </div>
          ) : matchResult ? (
            <div className="space-y-6">
              {/* Header Overview Card */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-2xs">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  
                  {/* Left Column: Big Score Gauge */}
                  <div className="lg:col-span-4 text-center lg:text-left lg:border-r lg:border-stone-200 lg:pr-8">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                      Overall Semantic Match Score
                    </span>
                    <div className="flex items-baseline justify-center lg:justify-start space-x-3 mb-2">
                      <span className="text-4xl sm:text-5xl font-extrabold text-stone-900 font-mono tracking-tight">
                        {matchResult.overall_match_percentage}%
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColorClass(matchResult.overall_match_percentage)}`}>
                        {matchResult.match_level}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-stone-100 rounded-full h-3 mb-3 overflow-hidden border border-stone-200">
                      <div 
                        className={`h-full transition-all duration-700 ${getScoreBarGradient(matchResult.overall_match_percentage)}`}
                        style={{ width: `${Math.min(100, Math.max(0, matchResult.overall_match_percentage))}%` }}
                      ></div>
                    </div>

                    <p className="text-xs text-stone-500 leading-normal">
                      Target Role: <strong className="text-stone-800">{matchResult.job.job_title}</strong> ({matchResult.job.category})
                    </p>
                  </div>

                  {/* Right Column: Metrics Grid */}
                  <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                      <span className="text-xl font-bold font-mono text-emerald-900 block">
                        {matchResult.matched_count}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700">Matched Skills</span>
                    </div>

                    <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-center">
                      <XCircle className="w-4 h-4 text-rose-600 mx-auto mb-1" />
                      <span className="text-xl font-bold font-mono text-rose-900 block">
                        {matchResult.missing_count}
                      </span>
                      <span className="text-[11px] font-semibold text-rose-700">Missing Gaps</span>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
                      <Star className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                      <span className="text-xl font-bold font-mono text-amber-900 block">
                        {matchResult.priority_skills_summary.matched_priority} / {matchResult.priority_skills_summary.total_priority}
                      </span>
                      <span className="text-[11px] font-semibold text-amber-700">Priority Matched</span>
                    </div>

                    <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-center">
                      <Cpu className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                      <span className="text-xl font-bold font-mono text-purple-900 block">
                        {matchResult.candidate_summary?.total_extracted_skills || 0}
                      </span>
                      <span className="text-[11px] font-semibold text-purple-700">Candidate Skills</span>
                    </div>
                  </div>

                </div>

                {/* Priority Skills Highlight Strip */}
                <div className="mt-6 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-stone-700">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span className="font-bold">Priority Must-Have Skills for {matchResult.job.job_title}:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchResult.priority_skills_summary.priority_skills.map((ps, i) => {
                      const isFound = matchResult.matched_skills.some(m => m.skill === ps);
                      return (
                        <span 
                          key={i}
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            isFound 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                              : "bg-rose-50 text-rose-800 border-rose-300"
                          }`}
                        >
                          {isFound ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>{ps}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Skills Analysis Breakdown Table */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
                      <Target className="w-4 h-4 text-amber-500" />
                      <span>Skill Requirement Cosine Similarity Breakdown</span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      Detailed matching matrix comparing each required job skill against the candidate&apos;s closest skill vector.
                    </p>
                  </div>

                  {/* Filters & Search */}
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search skill..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="inline-flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[11px]">
                      <button
                        onClick={() => setSkillFilter("all")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          skillFilter === "all" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-600"
                        }`}
                      >
                        All ({allSkillsCombined.length})
                      </button>
                      <button
                        onClick={() => setSkillFilter("matched")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          skillFilter === "matched" ? "bg-white text-emerald-800 shadow-2xs" : "text-stone-600"
                        }`}
                      >
                        Matched ({matchResult.matched_count})
                      </button>
                      <button
                        onClick={() => setSkillFilter("missing")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          skillFilter === "missing" ? "bg-white text-rose-800 shadow-2xs" : "text-stone-600"
                        }`}
                      >
                        Missing ({matchResult.missing_count})
                      </button>
                      <button
                        onClick={() => setSkillFilter("priority")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          skillFilter === "priority" ? "bg-white text-amber-800 shadow-2xs" : "text-stone-600"
                        }`}
                      >
                        Priority ({matchResult.priority_skills_summary.total_priority})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Skills Table */}
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-50 text-stone-700 font-bold border-b border-stone-200 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Required Job Skill</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Closest Resume Match</th>
                        <th className="py-3 px-4">Cosine Similarity</th>
                        <th className="py-3 px-4">Match Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-sans">
                      {filteredSkills.map((item, idx) => {
                        const isMatch = item.match_type !== "missing";
                        return (
                          <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                            {/* Skill Name */}
                            <td className="py-2.5 px-4 font-bold text-stone-900">
                              <div className="flex items-center space-x-2">
                                <span>{item.skill}</span>
                              </div>
                            </td>

                            {/* Priority Badge */}
                            <td className="py-2.5 px-4">
                              {item.is_priority ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Flame className="w-2.5 h-2.5" />
                                  <span>Priority</span>
                                </span>
                              ) : (
                                <span className="text-stone-400 text-[11px]">Recommended</span>
                              )}
                            </td>

                            {/* Candidate Match */}
                            <td className="py-2.5 px-4">
                              {item.best_candidate_match ? (
                                <span className="font-mono text-stone-800 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                                  {item.best_candidate_match}
                                </span>
                              ) : (
                                <span className="text-stone-400 italic">No vector match found</span>
                              )}
                            </td>

                            {/* Cosine Similarity Score */}
                            <td className="py-2.5 px-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full ${isMatch ? "bg-emerald-500" : "bg-rose-400"}`}
                                    style={{ width: `${Math.min(100, Math.max(0, item.match_percentage))}%` }}
                                  ></div>
                                </div>
                                <span className="font-mono font-bold text-[11px] text-stone-800">
                                  {item.similarity.toFixed(3)} ({item.match_percentage}%)
                                </span>
                              </div>
                            </td>

                            {/* Match Type Badge */}
                            <td className="py-2.5 px-4">
                              {item.match_type === "exact" && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Exact Match (1.00)</span>
                                </span>
                              )}
                              {item.match_type === "high_semantic" && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                                  <Sparkles className="w-3 h-3 text-teal-600" />
                                  <span>High Semantic (&gt;0.70)</span>
                                </span>
                              )}
                              {item.match_type === "partial_semantic" && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <Sliders className="w-3 h-3 text-amber-600" />
                                  <span>Partial Semantic (&gt;0.52)</span>
                                </span>
                              )}
                              {item.match_type === "missing" && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Missing Skill Gap</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Model Footnote */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2">
                  <div className="flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      Model: <strong>{matchResult.semantic_model.name} ({matchResult.semantic_model.model_id})</strong> • Vectors stored in SQLite for fast similarity ranking.
                    </span>
                  </div>
                  <span>Showing {filteredSkills.length} of {allSkillsCombined.length} skills</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
