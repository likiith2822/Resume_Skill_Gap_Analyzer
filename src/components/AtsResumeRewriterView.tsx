import React, { useState, useEffect } from "react";
import {
  FileCheck,
  Sparkles,
  Target,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  BookOpen,
  Send,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Edit3,
  Award,
  Check,
  Building2,
  User,
  Sliders,
  History,
  FileText,
  Clock,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import {
  JobRole,
  ResumeListItem,
  AtsRewriteData,
  CoverLetterData
} from "../types";

interface AtsResumeRewriterViewProps {
  onNavigateToUpload?: () => void;
  onNavigateToMatching?: () => void;
}

export const AtsResumeRewriterView: React.FC<AtsResumeRewriterViewProps> = ({
  onNavigateToUpload,
  onNavigateToMatching
}) => {
  // Main view mode: ATS Rewriter, Cover Letter, or History
  const [activeTab, setActiveTab] = useState<"rewriter" | "cover_letter" | "history">("rewriter");

  // Selection state
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Cover letter specific inputs
  const [companyName, setCompanyName] = useState<string>("Google");
  const [recipientName, setRecipientName] = useState<string>("Technical Hiring Team");
  const [coverLetterTone, setCoverLetterTone] = useState<string>("Professional & Confident");

  // Data states
  const [rewriteData, setRewriteData] = useState<AtsRewriteData | null>(null);
  const [coverLetterData, setCoverLetterData] = useState<CoverLetterData | null>(null);
  const [savedRewrites, setSavedRewrites] = useState<any[]>([]);
  const [savedLetters, setSavedLetters] = useState<any[]>([]);

  // Loading & error states
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState<boolean>(false);
  const [isCalculatingScore, setIsCalculatingScore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Editable cover letter state
  const [editableCoverLetter, setEditableCoverLetter] = useState<string>("");
  const [isEditingLetter, setIsEditingLetter] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resumesRes, jobsRes, rewritesRes, lettersRes] = await Promise.all([
        fetch("/api/resumes"),
        fetch("/api/jobs"),
        fetch("/api/ats/history"),
        fetch("/api/cover-letter/history")
      ]);

      const resumesJson = await resumesRes.json();
      if (resumesJson.success && resumesJson.data?.resumes) {
        setResumes(resumesJson.data.resumes);
        if (resumesJson.data.resumes.length > 0) {
          setSelectedResumeId(resumesJson.data.resumes[0].id);
        }
      }

      const jobsJson = await jobsRes.json();
      if (jobsJson.success && jobsJson.data?.jobs) {
        setJobs(jobsJson.data.jobs);
        if (jobsJson.data.jobs.length > 0) {
          setSelectedJobId(jobsJson.data.jobs[0].id);
        }
      }

      const rewritesJson = await rewritesRes.json();
      if (rewritesJson.success && rewritesJson.data?.rewrites) {
        setSavedRewrites(rewritesJson.data.rewrites);
      }

      const lettersJson = await lettersRes.json();
      if (lettersJson.success && lettersJson.data?.cover_letters) {
        setSavedLetters(lettersJson.data.cover_letters);
      }
    } catch (e) {
      console.warn("Failed to load initial ATS data:", e);
    }
  };

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleDownload = (content: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleGenerateAtsRewrite = async () => {
    if (!selectedResumeId) {
      setErrorMessage("Please select or upload a candidate resume.");
      return;
    }
    if (!selectedJobId) {
      setErrorMessage("Please select a target job role.");
      return;
    }

    setIsRewriting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ats/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: selectedResumeId,
          job_id: selectedJobId
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setRewriteData(json.data);
        // Refresh saved rewrites list
        const rewritesRes = await fetch("/api/ats/history");
        const rewritesJson = await rewritesRes.json();
        if (rewritesJson.success && rewritesJson.data?.rewrites) {
          setSavedRewrites(rewritesJson.data.rewrites);
        }
      } else {
        setErrorMessage(json.error?.message || "Failed to generate ATS resume rewrite.");
      }
    } catch (err: any) {
      setErrorMessage(`Error communicating with ATS rewrite service: ${err.message}`);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedResumeId) {
      setErrorMessage("Please select a candidate resume.");
      return;
    }
    if (!selectedJobId) {
      setErrorMessage("Please select a target job role.");
      return;
    }

    setIsGeneratingLetter(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: selectedResumeId,
          job_id: selectedJobId,
          company_name: companyName,
          recipient_name: recipientName,
          tone: coverLetterTone
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCoverLetterData(json.data);
        setEditableCoverLetter(json.data.cover_letter_text);
        setIsEditingLetter(false);
        // Refresh saved letters list
        const lettersRes = await fetch("/api/cover-letter/history");
        const lettersJson = await lettersRes.json();
        if (lettersJson.success && lettersJson.data?.cover_letters) {
          setSavedLetters(lettersJson.data.cover_letters);
        }
      } else {
        setErrorMessage(json.error?.message || "Failed to generate customized cover letter.");
      }
    } catch (err: any) {
      setErrorMessage(`Error communicating with Cover Letter service: ${err.message}`);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleLoadSavedRewrite = async (id: number) => {
    try {
      const res = await fetch(`/api/ats/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRewriteData(json.data);
        setActiveTab("rewriter");
      }
    } catch (e) {
      console.warn("Could not load rewrite:", e);
    }
  };

  const handleLoadSavedLetter = async (id: number) => {
    try {
      const res = await fetch(`/api/cover-letter/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCoverLetterData(json.data);
        setEditableCoverLetter(json.data.cover_letter_text);
        setActiveTab("cover_letter");
      }
    } catch (e) {
      console.warn("Could not load letter:", e);
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  return (
    <div id="ats-rewriter-view" className="space-y-8 max-w-7xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/80 border border-indigo-700/50 rounded-full text-indigo-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Part 8: ATS Optimization & AI Cover Letter</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              ATS Resume Rewriter & Cover Letter Generator
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Transform your resume into an Applicant Tracking System (ATS) powerhouse powered by Google Gemini API.
              Quantify bullet points, compute transparent 4-pillar ATS compatibility scores, and generate tailored cover letters.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          {rewriteData && (
            <div className="bg-slate-800/90 border border-indigo-500/30 rounded-xl p-4 flex items-center gap-4 shrink-0 shadow-lg">
              <div className="w-14 h-14 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold text-xl">
                {rewriteData.ats_score}%
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">ATS Match Score</p>
                <p className="text-lg font-bold text-white tracking-tight">{rewriteData.ats_score_label}</p>
                <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Ready for ATS Scanners
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800">
          <button
            id="tab-btn-ats-rewriter"
            onClick={() => setActiveTab("rewriter")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "rewriter"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>ATS Resume Rewriter</span>
            {rewriteData && (
              <span className="ml-1.5 px-2 py-0.5 text-xs bg-indigo-900 text-indigo-200 rounded-full font-bold">
                {rewriteData.ats_score}/100
              </span>
            )}
          </button>

          <button
            id="tab-btn-cover-letter"
            onClick={() => setActiveTab("cover_letter")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "cover_letter"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Cover Letter Generator</span>
            {coverLetterData && (
              <span className="ml-1.5 px-2 py-0.5 text-xs bg-indigo-900 text-indigo-200 rounded-full font-bold">
                Ready
              </span>
            )}
          </button>

          <button
            id="tab-btn-history"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Saved History</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs bg-slate-800 text-slate-300 rounded-full font-mono">
              {savedRewrites.length + savedLetters.length}
            </span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-4 flex items-start gap-3 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold">ATS Operation Notice</p>
            <p className="text-sm mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded hover:bg-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control Panel: Resume & Job Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Target Parameters & Input Sources
            </h2>
          </div>
          {onNavigateToUpload && (
            <button
              onClick={onNavigateToUpload}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
            >
              Upload another resume <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Resume Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              1. Candidate Resume
            </label>
            <select
              id="select-resume-for-ats"
              value={selectedResumeId || ""}
              onChange={(e) => setSelectedResumeId(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {resumes.length === 0 && <option value="">No resumes found. Please upload one.</option>}
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} - {r.candidate_name || r.original_filename} ({r.skills_count} skills, {r.file_type})
                </option>
              ))}
            </select>
            {selectedResume && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Candidate: <strong className="text-slate-700 dark:text-slate-300">{selectedResume.candidate_name}</strong> | Email: {selectedResume.candidate_email || "N/A"}
              </p>
            )}
          </div>

          {/* Target Job Role Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              2. Target Job Role
            </label>
            <select
              id="select-job-for-ats"
              value={selectedJobId || ""}
              onChange={(e) => setSelectedJobId(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_title} ({j.category}) - {j.required_skills?.length || 0} req skills
                </option>
              ))}
            </select>
            {selectedJob && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                Required skills: {selectedJob.required_skills?.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Cover Letter specific fields when Cover Letter tab is active */}
        {activeTab === "cover_letter" && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Company Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google, Stripe, Microsoft"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Recipient / Hiring Team
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Hiring Manager, Engineering Team"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cover Letter Tone
              </label>
              <select
                value={coverLetterTone}
                onChange={(e) => setCoverLetterTone(e.target.value)}
                className="w-full py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Professional & Confident">Professional & Confident</option>
                <option value="Technical & Impact-Driven">Technical & Impact-Driven</option>
                <option value="Passionate & Growth-Minded">Passionate & Growth-Minded</option>
                <option value="Executive & Strategic">Executive & Strategic</option>
              </select>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Strict Truthfulness: Only factually verified experiences are enhanced.</span>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "rewriter" ? (
              <button
                id="btn-run-ats-rewrite"
                onClick={handleGenerateAtsRewrite}
                disabled={isRewriting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isRewriting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Optimizing Resume with Gemini API...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Re-write & Compute ATS Score</span>
                  </>
                )}
              </button>
            ) : (
              <button
                id="btn-run-cover-letter"
                onClick={handleGenerateCoverLetter}
                disabled={isGeneratingLetter}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isGeneratingLetter ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Tailored Cover Letter...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Generate Customized Cover Letter</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: ATS RESUME REWRITER OUTPUT                                       */}
      {/* ========================================================================= */}
      {activeTab === "rewriter" && rewriteData && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* ATS Score & 4-Pillar Breakdown Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>ATS Compatibility Evaluation</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  ATS Score Analysis: {rewriteData.job_title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Engineered using Google Gemini API ({rewriteData.model_used}) adhering to strict applicant tracking system parsing protocols.
                </p>
              </div>

              {/* Huge ATS Score Display */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 px-6 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                    Compatibility
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
                    {rewriteData.ats_score_label}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin-slow flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {rewriteData.ats_score}%
                </div>
              </div>
            </div>

            {/* 4-Pillar Breakdown Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {/* 1. Keyword Coverage */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">1. Keyword Coverage</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {rewriteData.score_breakdown.keyword_coverage.score} / {rewriteData.score_breakdown.keyword_coverage.max} pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${(rewriteData.score_breakdown.keyword_coverage.score / rewriteData.score_breakdown.keyword_coverage.max) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {rewriteData.score_breakdown.keyword_coverage.matched_count} of {rewriteData.score_breakdown.keyword_coverage.total_required} keywords verified
                </p>
              </div>

              {/* 2. Skill Coverage */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">2. Skill Coverage</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {rewriteData.score_breakdown.skill_coverage.score} / {rewriteData.score_breakdown.skill_coverage.max} pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${(rewriteData.score_breakdown.skill_coverage.score / rewriteData.score_breakdown.skill_coverage.max) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {rewriteData.score_breakdown.skill_coverage.feedback}
                </p>
              </div>

              {/* 3. Section Completeness */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">3. Section Completeness</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {rewriteData.score_breakdown.section_completeness.score} / {rewriteData.score_breakdown.section_completeness.max} pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all"
                    style={{ width: `${(rewriteData.score_breakdown.section_completeness.score / rewriteData.score_breakdown.section_completeness.max) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {rewriteData.score_breakdown.section_completeness.sections_found?.length || 5} standard ATS sections present
                </p>
              </div>

              {/* 4. Job-Role Relevance */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">4. Job-Role Relevance</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {rewriteData.score_breakdown.job_role_relevance.score} / {rewriteData.score_breakdown.job_role_relevance.max} pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${(rewriteData.score_breakdown.job_role_relevance.score / rewriteData.score_breakdown.job_role_relevance.max) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
                  Targeted for {rewriteData.job_title}
                </p>
              </div>
            </div>
          </div>

          {/* Professional Summary Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ATS Professional Summary
                </h3>
              </div>
              <button
                onClick={() => handleCopy(rewriteData.professional_summary, "summary")}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                {copiedSection === "summary" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-sans">
              {rewriteData.professional_summary}
            </div>
          </div>

          {/* Improved Bullet Points (CAR / STAR Framework) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Quantified & Improved Bullet Points (CAR / STAR Format)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    High-impact action verbs and performance metrics mapped to candidate's verified experience.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {rewriteData.improved_bullet_points.map((bullet, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4.5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-md">
                        {bullet.action_verb_used}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {bullet.section_or_role}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(bullet.improved_bullet, `bullet-${idx}`)}
                      className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                    >
                      {copiedSection === `bullet-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {bullet.original_bullet && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 pl-3 border-l-2 border-slate-300 dark:border-slate-600 italic">
                      Original: "{bullet.original_bullet}"
                    </div>
                  )}

                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 pl-3 border-l-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 py-2 pr-2 rounded-r-md">
                    {bullet.improved_bullet}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-500">Keywords:</span>
                      {bullet.keywords_incorporated.map((kw, kidx) => (
                        <span key={kidx} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-mono text-[11px]">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 italic">
                      Why: {bullet.rationale}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categorized Relevant Keywords */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Relevant ATS Keywords
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Core Technical Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rewriteData.relevant_keywords.core_technical_skills?.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs rounded-lg font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Frameworks & Tools
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rewriteData.relevant_keywords.frameworks_and_tools?.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs rounded-lg font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Domain Concepts
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rewriteData.relevant_keywords.domain_concepts?.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs rounded-lg font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Leadership & Methodologies
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rewriteData.relevant_keywords.soft_and_leadership?.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Full ATS-Friendly Resume Content Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Full ATS-Friendly Resume Content
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Single-column, clean layout optimized for automated resume parser parsing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(rewriteData.ats_resume_content, "full_resume")}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {copiedSection === "full_resume" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDownload(rewriteData.ats_resume_content, `${rewriteData.candidate_name.replace(/\s+/g, "_")}_ATS_Resume.md`)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Markdown</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-xl p-5 font-mono text-xs leading-relaxed overflow-x-auto max-h-[500px] border border-slate-800">
              <pre className="whitespace-pre-wrap">{rewriteData.ats_resume_content}</pre>
            </div>
          </div>

          {/* Strict Verification & Suggestions vs Facts Audit Box */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
              <div className="space-y-3 flex-1">
                <div>
                  <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                    Factual Resume Information vs. AI Suggestions Audit
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {rewriteData.suggestions_audit?.disclaimer || "Strict ATS Rule: No fictional experience was invented. AI suggestions are explicitly flagged."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      ✓ Factual Baseline Preserved
                    </p>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                      {rewriteData.suggestions_audit?.factual_elements_preserved?.map((f, idx) => (
                        <li key={idx}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      ⚡ Action Verb Enhancements
                    </p>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                      {rewriteData.suggestions_audit?.ai_framing_enhancements?.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      💡 Bridging Suggestions Only
                    </p>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                      {rewriteData.suggestions_audit?.bridging_recommendations_only?.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                      {(!rewriteData.suggestions_audit?.bridging_recommendations_only || rewriteData.suggestions_audit.bridging_recommendations_only.length === 0) && (
                        <li>No unverified gaps detected in candidate baseline.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: COVER LETTER GENERATOR OUTPUT                                    */}
      {/* ========================================================================= */}
      {activeTab === "cover_letter" && coverLetterData && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Cover Letter Document Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
                  <Send className="w-3.5 h-3.5" />
                  <span>Tailored Cover Letter ({coverLetterData.tone})</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Application for {coverLetterData.job_title} at {coverLetterData.company_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Recipient: {coverLetterData.recipient_name} | Candidate: {coverLetterData.candidate_name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingLetter(!isEditingLetter)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingLetter ? "Lock Preview" : "Edit In-Place"}</span>
                </button>

                <button
                  onClick={() => handleCopy(editableCoverLetter || coverLetterData.cover_letter_text, "cover_letter")}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {copiedSection === "cover_letter" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Letter</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDownload(editableCoverLetter || coverLetterData.cover_letter_text, `${coverLetterData.candidate_name.replace(/\s+/g, "_")}_Cover_Letter.txt`)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>
            </div>

            {/* Highlights Takeaway */}
            {coverLetterData.key_highlights && coverLetterData.key_highlights.length > 0 && (
              <div className="my-6 p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-xl">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-2">
                  Key Value Propositions Highlighted:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  {coverLetterData.key_highlights.map((h, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Document Letter Body */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-inner">
              {isEditingLetter ? (
                <textarea
                  value={editableCoverLetter}
                  onChange={(e) => setEditableCoverLetter(e.target.value)}
                  rows={16}
                  className="w-full bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-600 rounded-lg p-4 font-serif text-sm sm:text-base leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              ) : (
                <div className="font-serif text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {editableCoverLetter || coverLetterData.cover_letter_text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW C: SAVED HISTORY DRAWER                                             */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ATS Rewrites History */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Saved ATS Rewrites ({savedRewrites.length})
                </h3>
              </div>

              {savedRewrites.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic py-4 text-center">
                  No ATS rewrites generated yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {savedRewrites.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleLoadSavedRewrite(r.id)}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/70 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          #{r.id} {r.job_title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Candidate: {r.candidate_name || "N/A"} | {r.created_at?.slice(0, 16) || "Recent"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg">
                          {r.ats_score}/100
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Cover Letters */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Saved Cover Letters ({savedLetters.length})
                </h3>
              </div>

              {savedLetters.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic py-4 text-center">
                  No cover letters generated yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {savedLetters.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => handleLoadSavedLetter(l.id)}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/70 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          #{l.id} {l.job_title} @ {l.company_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          To: {l.recipient_name} | {l.created_at?.slice(0, 16) || "Recent"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
