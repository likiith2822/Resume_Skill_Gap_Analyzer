import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  ChevronRight,
  Plus,
  X,
  Sliders,
  Award,
  ArrowUpRight,
  Database,
  History,
  FileText,
  BarChart3,
  Percent
} from "lucide-react";
import {
  SalaryPrediction,
  SalaryMetadata,
  ApiResponse,
  ResumeDetail,
  JobRole
} from "../types";

interface MarketSalaryPredictorViewProps {
  onNavigateToUpload?: () => void;
  onNavigateToMatching?: () => void;
}

const CURRENCY_CONVERSIONS: Record<string, { symbol: string; rate: number; name: string }> = {
  USD: { symbol: "$", rate: 1.0, name: "US Dollar (USD)" },
  EUR: { symbol: "€", rate: 0.92, name: "Euro (EUR)" },
  GBP: { symbol: "£", rate: 0.79, name: "British Pound (GBP)" },
  CAD: { symbol: "CA$", rate: 1.36, name: "Canadian Dollar (CAD)" },
  AUD: { symbol: "AU$", rate: 1.52, name: "Australian Dollar (AUD)" },
  INR: { symbol: "₹", rate: 83.5, name: "Indian Rupee (INR)" }
};

export const MarketSalaryPredictorView: React.FC<MarketSalaryPredictorViewProps> = ({
  onNavigateToUpload,
  onNavigateToMatching
}) => {
  // Input State
  const [jobRole, setJobRole] = useState<string>("Full Stack Developer");
  const [customRole, setCustomRole] = useState<string>("");
  const [experienceYears, setExperienceYears] = useState<number>(4.0);
  const [educationLevel, setEducationLevel] = useState<string>("Bachelor's Degree");
  const [skills, setSkills] = useState<string[]>([
    "React",
    "TypeScript",
    "Node.js",
    "Docker",
    "PostgreSQL",
    "REST APIs"
  ]);
  const [skillInput, setSkillInput] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");

  // Resume & Job Auto-Fill
  const [resumes, setResumes] = useState<Array<{ id: number; filename: string; parsed_data?: any }>>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  // Result & History State
  const [prediction, setPrediction] = useState<SalaryPrediction | null>(null);
  const [metadata, setMetadata] = useState<SalaryMetadata | null>(null);
  const [history, setHistory] = useState<SalaryPrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch initial metadata, resumes, jobs, and history
  useEffect(() => {
    fetchMetadata();
    fetchResumes();
    fetchJobs();
    fetchHistory();
  }, []);

  const fetchMetadata = async () => {
    try {
      const res = await fetch("/api/salary/metadata");
      const json = await res.json();
      if (json.success && json.data) {
        setMetadata(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch salary metadata:", err);
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await fetch("/api/resume/list");
      const json: ApiResponse<any> = await res.json();
      if (json.success && json.data?.resumes) {
        setResumes(json.data.resumes);
      }
    } catch {}
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const json: ApiResponse<any> = await res.json();
      if (json.success && json.data?.jobs) {
        setJobs(json.data.jobs);
      }
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/salary/history");
      const json = await res.json();
      if (json.success && json.data?.predictions) {
        setHistory(json.data.predictions);
      }
    } catch {}
  };

  // Auto-fill from Resume
  const handleAutoFillResume = async (resumeIdStr: string) => {
    setSelectedResumeId(resumeIdStr);
    if (!resumeIdStr) return;
    const rId = parseInt(resumeIdStr, 10);
    try {
      const res = await fetch(`/api/resume/${rId}`);
      const json: ApiResponse<ResumeDetail> = await res.json();
      if (json.success && json.data) {
        const p = json.data.parsed_data;
        if (p?.experience?.[0]?.role) {
          setJobRole(p.experience[0].role);
        }
        if (p?.education?.[0]?.degree) {
          const deg = p.education[0].degree.toLowerCase();
          if (deg.includes("master")) setEducationLevel("Master's Degree");
          else if (deg.includes("phd") || deg.includes("doctor")) setEducationLevel("Ph.D.");
          else if (deg.includes("bachelor") || deg.includes("b.s") || deg.includes("b.tech")) setEducationLevel("Bachelor's Degree");
          else if (deg.includes("associate")) setEducationLevel("Associate's Degree");
        }
        if (p?.skills?.all_skills && p.skills.all_skills.length > 0) {
          setSkills(Array.from(new Set(p.skills.all_skills)).slice(0, 12));
        } else if (p?.skills?.categories) {
          const gathered: string[] = [];
          Object.values(p.skills.categories).forEach((arr: any) => {
            if (Array.isArray(arr)) gathered.push(...arr);
          });
          if (gathered.length > 0) {
            setSkills(Array.from(new Set(gathered)).slice(0, 12));
          }
        }
        setSuccessMsg(`Auto-filled parameters from resume: ${json.data.original_filename}`);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.warn("Failed auto-filling from resume:", err);
    }
  };

  // Auto-fill from Target Job
  const handleAutoFillJob = (jobIdStr: string) => {
    setSelectedJobId(jobIdStr);
    if (!jobIdStr) return;
    const jId = parseInt(jobIdStr, 10);
    const found = jobs.find((j) => j.id === jId);
    if (found) {
      setJobRole(found.job_title);
      if (found.required_skills && found.required_skills.length > 0) {
        setSkills(found.required_skills);
      }
      setSuccessMsg(`Auto-filled role & skills from target job: ${found.job_title}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Skill Management
  const handleAddSkill = (skillToAdd?: string) => {
    const term = (skillToAdd || skillInput).trim();
    if (!term) return;
    if (!skills.map((s) => s.toLowerCase()).includes(term.toLowerCase())) {
      setSkills([...skills, term]);
    }
    if (!skillToAdd) {
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Predict Salary via Scikit-Learn API
  const handlePredictSalary = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    const activeRole = jobRole === "Custom" ? customRole.trim() : jobRole;
    if (!activeRole) {
      setError("Please select or specify a Job Role.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/salary/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_role: activeRole,
          experience_years: experienceYears,
          education_level: educationLevel,
          skills: skills,
          resume_id: selectedResumeId ? parseInt(selectedResumeId, 10) : null,
          target_job_id: selectedJobId ? parseInt(selectedJobId, 10) : null
        })
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error?.message || "Failed to predict salary.");
      }

      setPrediction(json.data);
      setSuccessMsg(`Calculated salary range for ${activeRole} (${experienceYears} yrs exp).`);
      setTimeout(() => setSuccessMsg(null), 4500);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || "An error occurred while calculating salary prediction.");
    } finally {
      setIsLoading(false);
    }
  };

  // Retrain Scikit-Learn Model
  const handleRetrainModel = async () => {
    setIsRetraining(true);
    setError(null);
    try {
      const res = await fetch("/api/salary/train", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data) {
        setSuccessMsg(`Model Retrained! New R² Score: ${json.data.r2_score}, MAE: $${json.data.mae}`);
        fetchMetadata();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        throw new Error(json.error?.message || "Retrain failed.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrain model.");
    } finally {
      setIsRetraining(false);
    }
  };

  // Reload previous prediction parameters
  const handleReloadPrediction = (p: SalaryPrediction) => {
    setJobRole(p.job_role);
    setExperienceYears(p.experience_years);
    setEducationLevel(p.education_level);
    setSkills(p.skills || []);
    setPrediction(p);
    setSuccessMsg(`Loaded prediction record #${p.id} (${p.job_role})`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Currency Formatter
  const formatCurrency = (amount: number): string => {
    const conf = CURRENCY_CONVERSIONS[selectedCurrency] || CURRENCY_CONVERSIONS.USD;
    const converted = Math.round(amount * conf.rate);
    return `${conf.symbol}${converted.toLocaleString()}`;
  };

  const getSeniorityLabel = (exp: number) => {
    if (exp < 2) return "Entry-Level (0-2 yrs)";
    if (exp < 5) return "Mid-Level (3-4 yrs)";
    if (exp < 8) return "Senior (5-7 yrs)";
    if (exp < 12) return "Lead / Staff (8-11 yrs)";
    return "Principal / Director (12+ yrs)";
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner with Strict Disclaimer */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 leading-relaxed">
            <span className="font-bold">Demonstration & Academic Notice:</span> All salary ranges,
            benchmarks, and trajectory graphs generated on this page are computed using a{" "}
            <span className="font-semibold text-amber-950 underline decoration-amber-400">
              Scikit-learn RandomForestRegressor
            </span>{" "}
            model trained on synthetic sample data for development and demonstration purposes. They do
            not represent real-time compensation offers or contractual commitments.
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-800 border border-emerald-200">
                <DollarSign className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                Market Salary Predictor
              </h1>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-full border border-emerald-300">
                Part 10 • Scikit-learn Regression
              </span>
            </div>
            <p className="text-sm sm:text-base text-stone-600 max-w-3xl leading-relaxed">
              Estimate realistic compensation bands (Minimum, Expected, Maximum) based on job title,
              years of experience, educational credentials, and stack-specific skill premiums using
              Scikit-learn.
            </p>
          </div>

          {/* Quick Currency Selector */}
          <div className="flex items-center space-x-2 bg-stone-50 border border-stone-200 p-1.5 rounded-xl self-start md:self-auto">
            <span className="text-xs font-semibold text-stone-500 pl-2">Currency:</span>
            <select
              aria-label="Currency"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="bg-white border border-stone-200 text-xs font-bold text-stone-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.entries(CURRENCY_CONVERSIONS).map(([code, info]) => (
                <option key={code} value={code}>
                  {code} ({info.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Auto-Fill Helpers */}
        <div className="mt-6 pt-6 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-stone-800">Auto-fill from Parsed Resume:</span>
            </div>
            {resumes.length > 0 ? (
              <select
                aria-label="Auto-fill from Parsed Resume"
                value={selectedResumeId}
                onChange={(e) => handleAutoFillResume(e.target.value)}
                className="w-full bg-white border border-stone-300 text-xs text-stone-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose an uploaded resume --</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} • {r.filename}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-stone-500">
                No resumes uploaded yet.{" "}
                {onNavigateToUpload && (
                  <button
                    onClick={onNavigateToUpload}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Upload a resume
                  </button>
                )}
              </p>
            )}
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center space-x-2 mb-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-stone-800">Auto-fill from Target Job:</span>
            </div>
            {jobs.length > 0 ? (
              <select
                aria-label="Auto-fill from Target Job"
                value={selectedJobId}
                onChange={(e) => handleAutoFillJob(e.target.value)}
                className="w-full bg-white border border-stone-300 text-xs text-stone-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose a standard job role --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.job_title} ({j.category})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-stone-500">Loading target job profiles...</p>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Form Inputs & Live Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handlePredictSalary}
            className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 text-base flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Candidate Profile Parameters</span>
              </h2>
              <span className="text-xs font-medium text-stone-400">Step 1</span>
            </div>

            {/* Job Role Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Target Job Role
              </label>
              <select
                aria-label="Target Job Role"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(metadata?.popular_roles || [
                  "Software Engineer",
                  "Full Stack Developer",
                  "Data Scientist",
                  "AI Engineer",
                  "ML Engineer",
                  "Cloud Engineer",
                  "DevOps Engineer",
                  "Frontend Developer",
                  "Backend Developer",
                  "Cyber Security Analyst",
                  "Mobile Developer",
                  "Data Engineer"
                ]).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
                <option value="Custom">-- Custom Role --</option>
              </select>

              {jobRole === "Custom" && (
                <input
                  type="text"
                  placeholder="Enter custom job title..."
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="mt-2 w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}
            </div>

            {/* Experience Slider & Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Years of Experience:{" "}
                  <span className="text-emerald-700 font-bold">{experienceYears} yrs</span>
                </label>
                <span className="text-xs font-semibold px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md">
                  {getSeniorityLabel(experienceYears)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="18"
                step="0.5"
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                <span>0 yr (Entry)</span>
                <span>5 yrs (Mid)</span>
                <span>10 yrs (Senior)</span>
                <span>15+ yrs (Lead)</span>
              </div>
            </div>

            {/* Education Level */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center space-x-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-stone-500" />
                <span>Education Level</span>
              </label>
              <select
                aria-label="Education Level"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(metadata?.education_levels || [
                  "High School / Bootcamp",
                  "Associate's Degree",
                  "Bachelor's Degree",
                  "Master's Degree",
                  "Ph.D."
                ]).map((edu) => (
                  <option key={edu} value={edu}>
                    {edu}
                  </option>
                ))}
              </select>
            </div>

            {/* Skills Chips & Fast Add */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Relevant Skills ({skills.length})
                </label>
                {skills.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSkills([])}
                    className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1.5 min-h-[50px] p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                {skills.length === 0 ? (
                  <span className="text-xs text-stone-400 self-center">
                    No skills added yet. Type below or pick from suggestions.
                  </span>
                ) : (
                  skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-stone-200 text-stone-800 text-xs font-medium rounded-lg shadow-2xs"
                    >
                      <span>{s}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s)}
                        className="text-stone-400 hover:text-rose-600 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Custom Skill Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Add skill (e.g. PyTorch, React, AWS)..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill()}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Skill Suggestions */}
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-stone-400 block mb-1">
                  Popular Skill Suggestions:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    "Python",
                    "React",
                    "TypeScript",
                    "Docker",
                    "Kubernetes",
                    "AWS",
                    "PyTorch",
                    "SQL",
                    "Microservices",
                    "Large Language Models",
                    "CI/CD"
                  ]
                    .filter((s) => !skills.includes(s))
                    .slice(0, 8)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSkill(s)}
                        className="text-[11px] bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 text-stone-600 px-2 py-0.5 rounded-md transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Predict Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Regression Prediction...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  <span>Calculate Salary Range (Scikit-Learn)</span>
                </>
              )}
            </button>
          </form>

          {/* Model Transparency Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-xs text-stone-600 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-800 flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>Scikit-Learn Model Architecture</span>
              </span>
              <button
                type="button"
                onClick={handleRetrainModel}
                disabled={isRetraining}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRetraining ? "animate-spin" : ""}`} />
                <span>Retrain Model</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-stone-700">
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <span className="text-stone-400 block text-[10px]">Algorithm</span>
                <span className="font-bold font-mono">RandomForestRegressor</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <span className="text-stone-400 block text-[10px]">Library</span>
                <span className="font-bold font-mono">scikit-learn 1.9.0</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <span className="text-stone-400 block text-[10px]">Model Path</span>
                <span className="font-bold font-mono text-[11px]">models/salary_model.joblib</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <span className="text-stone-400 block text-[10px]">Test R² Score</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {metadata?.model_meta?.r2_score || 0.81} (Test Set)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Prediction Results & Visuals */}
        <div className="lg:col-span-7 space-y-6">
          {prediction ? (
            <div className="space-y-6">
              {/* Primary 3 Salary Stat Cards */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      Predicted Market Range • {prediction.job_role}
                    </span>
                    <h3 className="text-lg font-bold text-stone-900">
                      {prediction.experience_years} Years Exp • {prediction.education_level}
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-full border border-emerald-300">
                    Scikit-Learn Point & Interval
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  {/* Minimum Salary */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col justify-between text-center">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Minimum Salary
                    </span>
                    <div className="my-2">
                      <span className="text-2xl font-bold text-stone-800 tracking-tight">
                        {formatCurrency(prediction.min_salary)}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-400">15th Percentile Floor</span>
                  </div>

                  {/* Expected Salary (Hero Card) */}
                  <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 flex flex-col justify-between text-center shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-md uppercase">
                      Expected Median
                    </div>
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Expected Salary
                    </span>
                    <div className="my-2">
                      <span className="text-3xl font-extrabold text-emerald-950 tracking-tight">
                        {formatCurrency(prediction.expected_salary)}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-medium">
                      Model Point Estimate
                    </span>
                  </div>

                  {/* Maximum Salary */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col justify-between text-center">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Maximum Salary
                    </span>
                    <div className="my-2">
                      <span className="text-2xl font-bold text-stone-800 tracking-tight">
                        {formatCurrency(prediction.max_salary)}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-400">85th-90th Percentile Ceiling</span>
                  </div>
                </div>

                {/* Range Distribution Gauge */}
                <div className="mt-6 pt-6 border-t border-stone-100 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-stone-600">
                    <span>Base: {formatCurrency(prediction.min_salary)}</span>
                    <span className="text-emerald-700 font-bold">
                      Median: {formatCurrency(prediction.expected_salary)}
                    </span>
                    <span>High: {formatCurrency(prediction.max_salary)}</span>
                  </div>

                  {/* Gradient Bar */}
                  <div className="relative h-4 bg-stone-200 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-stone-300 via-emerald-400 to-emerald-600" />
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-stone-900 shadow-md"
                      style={{
                        left: `${Math.max(10, Math.min(90, ((prediction.expected_salary - prediction.min_salary) / (prediction.max_salary - prediction.min_salary || 1)) * 100))}%`
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-stone-400 text-center">
                    Spread Range: ±{formatCurrency(Math.round((prediction.max_salary - prediction.min_salary) / 2))} variance based on negotiation, geography & company tier.
                  </p>
                </div>
              </div>

              {/* Experience Growth Trajectory Chart */}
              {prediction.insights?.experience_curve && (
                <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      <span>Projected Experience Trajectory Curve</span>
                    </h4>
                    <span className="text-xs text-stone-400">Same Role & Skills</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
                    {prediction.insights.experience_curve.map((pt, idx) => {
                      const isCurrent =
                        Math.abs(pt.years - prediction.experience_years) <= 1.5;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            isCurrent
                              ? "bg-emerald-50 border-emerald-400 shadow-xs"
                              : "bg-stone-50 border-stone-200"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-stone-500 block uppercase">
                            {pt.label}
                          </span>
                          <span
                            className={`text-sm font-bold block mt-1 ${
                              isCurrent ? "text-emerald-950" : "text-stone-800"
                            }`}
                          >
                            {formatCurrency(pt.predicted_salary)}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full inline-block mt-1">
                              Current Tier
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top Skill Value Contribution Insights */}
              {prediction.insights?.top_contributing_skills &&
                prediction.insights.top_contributing_skills.length > 0 && (
                  <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Estimated Skill Premium Breakdown</span>
                      </h4>
                      <span className="text-xs text-stone-400">Marginal Annual Uplift</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {prediction.insights.top_contributing_skills.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xl"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-stone-800 text-xs">
                              {item.skill}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-emerald-700">
                              +{formatCurrency(item.estimated_annual_uplift)}/yr
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                item.impact_tier === "High"
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-stone-200 text-stone-700"
                              }`}
                            >
                              {item.impact_tier}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            /* Empty State Prompt */
            <div className="bg-white border border-dashed border-stone-300 rounded-2xl p-10 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-700 border border-emerald-200">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">
                Ready to Calculate Market Salary Band
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                Configure your target job role, experience level, education tier, and technical skills
                on the left, then click <strong>Calculate Salary Range</strong>.
              </p>
              <button
                type="button"
                onClick={() => handlePredictSalary()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Run Default Benchmark Prediction
              </button>
            </div>
          )}

          {/* Past Predictions History Table */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <History className="w-4 h-4 text-stone-500" />
                <span>Saved Predictions in SQLite ({history.length})</span>
              </h4>
              <button
                type="button"
                onClick={fetchHistory}
                className="text-xs text-stone-500 hover:text-stone-800 flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 text-center">
                No saved predictions yet. Run your first prediction above.
              </p>
            ) : (
              <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="py-3 flex items-center justify-between hover:bg-stone-50 px-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-stone-800 text-xs">{h.job_role}</span>
                        <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                          {h.experience_years} yrs exp
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(h.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600">
                        Range:{" "}
                        <span className="font-semibold text-emerald-800">
                          {formatCurrency(h.min_salary)} – {formatCurrency(h.max_salary)}
                        </span>{" "}
                        (Median: {formatCurrency(h.expected_salary)})
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReloadPrediction(h)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"
                    >
                      Reload
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
