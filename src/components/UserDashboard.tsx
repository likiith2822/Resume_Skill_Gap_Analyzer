import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Radar, Bar, Line } from "react-chartjs-2";
import {
  FileText,
  Target,
  FileCheck,
  Github,
  Mic,
  Brain,
  TrendingUp,
  Map,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  Compass,
  Star,
  GitFork,
  DollarSign,
  Clock,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Zap,
  BarChart3,
  Calendar,
  LayoutDashboard
} from "lucide-react";
import { fetchDashboardOverviewApi } from "../services/api";
import { DashboardOverviewData, NavTab } from "../types";

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface UserDashboardProps {
  onNavigateTab?: (tab: NavTab) => void;
}

// Circular Score Indicator Component
const CircularScoreGauge: React.FC<{
  score: number;
  max?: number;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  colorClass?: string;
  strokeColor?: string;
  onClick?: () => void;
}> = ({
  score,
  max = 100,
  label,
  sublabel,
  icon,
  strokeColor = "#2563eb",
  onClick
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((score / max) * 100)));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between ${
        onClick ? "cursor-pointer group" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            {icon}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </span>
        </div>
        {onClick && (
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {score}
            </span>
            <span className="text-sm font-semibold text-slate-400">
              {max === 100 ? "%" : `/${max}`}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {sublabel || (percentage >= 80 ? "Proficient" : percentage >= 60 ? "Moderate" : "Developing")}
          </div>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 96 96">
            {/* Background track */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="#e2e8f0"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Value fill */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke={strokeColor}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
            {percentage}%
          </div>
        </div>
      </div>
    </div>
  );
};

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "skills" | "career" | "evaluations">("all");

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardOverviewApi();
      if (res.success && res.data) {
        setDashboardData(res.data);
      } else {
        setError(res.error?.message || "Failed to load dashboard data.");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const scores = dashboardData?.main_scores || {
    resume_score: 82,
    skill_match_percentage: 78,
    ats_score: 85,
    github_score: 88,
    interview_score: 84,
    quiz_score: 90,
    composite_readiness: 84.5
  };

  // Chart 1: Skill Match Radar Chart (Chart.js)
  const radarChartData = useMemo(() => {
    const categories = dashboardData?.chart_data?.categories || [
      "Frontend",
      "Backend",
      "Cloud / DevOps",
      "Database & Storage",
      "AI / ML",
      "Core CS & Tools"
    ];
    const candidateData = dashboardData?.chart_data?.candidate_competency || [88, 92, 58, 85, 68, 90];
    const benchmarkData = dashboardData?.chart_data?.job_benchmark || [85, 90, 80, 80, 75, 85];

    return {
      labels: categories,
      datasets: [
        {
          label: "Your Skill Competency",
          data: candidateData,
          backgroundColor: "rgba(37, 99, 235, 0.2)", // Blue
          borderColor: "#2563eb",
          borderWidth: 2,
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#2563eb"
        },
        {
          label: "Target Role Benchmark",
          data: benchmarkData,
          backgroundColor: "rgba(148, 163, 184, 0.15)", // Gray/Slate
          borderColor: "#94a3b8",
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointBackgroundColor: "#94a3b8",
          pointBorderColor: "#fff"
        }
      ]
    };
  }, [dashboardData]);

  // Chart 2: Skill Gap Breakdown (Bar Chart - Chart.js)
  const skillGapBarData = useMemo(() => {
    const domains = ["Languages", "Frameworks", "Cloud/DevOps", "Databases", "Architecture"];
    const matched = [4, 3, 1, 2, 2];
    const missing = [0, 1, 2, 1, 1];

    return {
      labels: domains,
      datasets: [
        {
          label: "Matched Skills",
          data: matched,
          backgroundColor: "#2563eb", // Blue
          borderRadius: 6
        },
        {
          label: "Missing Gaps",
          data: missing,
          backgroundColor: "#cbd5e1", // Gray
          borderRadius: 6
        }
      ]
    };
  }, [dashboardData]);

  // Chart 3: Progress & Evaluation Trajectory (Line Chart - Chart.js)
  const progressLineData = useMemo(() => {
    const labels = ["Resume Quality", "Skill Match %", "ATS Audit", "GitHub Score", "AI Interview", "Adaptive Quiz"];
    const candidateScores = [
      scores.resume_score,
      scores.skill_match_percentage,
      scores.ats_score,
      scores.github_score,
      scores.interview_score,
      scores.quiz_score
    ];
    const targetBenchmark = [85, 80, 85, 80, 85, 80];

    return {
      labels,
      datasets: [
        {
          label: "Candidate Performance Score",
          data: candidateScores,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 5,
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2
        },
        {
          label: "Industry Standard Benchmark",
          data: targetBenchmark,
          borderColor: "#94a3b8",
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 3,
          pointBackgroundColor: "#94a3b8",
          fill: false,
          tension: 0.1
        }
      ]
    };
  }, [scores]);

  // Chart 4: Salary Range Visualization (Chart.js Bar Range)
  const salaryBarData = useMemo(() => {
    const minSal = dashboardData?.salary?.min_salary || 115000;
    const expSal = dashboardData?.salary?.expected_salary || 138000;
    const maxSal = dashboardData?.salary?.max_salary || 162000;
    const marketMedian = dashboardData?.salary?.market_median || 132000;

    return {
      labels: ["Minimum Band", "Market Baseline", "Expected Salary (ML)", "Upper Ceiling"],
      datasets: [
        {
          label: "Annual Compensation (USD)",
          data: [minSal, marketMedian, expSal, maxSal],
          backgroundColor: [
            "#94a3b8", // Gray for min
            "#64748b", // Slate for market baseline
            "#2563eb", // Vibrant Blue for expected ML prediction
            "#1d4ed8"  // Deep Blue for upper ceiling
          ],
          borderRadius: 8
        }
      ]
    };
  }, [dashboardData]);

  const targetJobTitle = dashboardData?.target_job_title || "Full Stack Developer";
  const matchedSkills = dashboardData?.matched_skills || [];
  const missingSkills = dashboardData?.missing_skills || [];
  const recentReports = dashboardData?.recent_reports || [];
  const salary = dashboardData?.salary;
  const github = dashboardData?.github;
  const roadmap = dashboardData?.roadmap;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
                <span>Part 12: Unified Candidate Dashboard</span>
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500">
                Target Role: <strong className="text-slate-800 font-semibold">{targetJobTitle}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Executive Career & Skill Overview
            </h1>
            <p className="text-slate-600 text-sm max-w-3xl leading-relaxed">
              Consolidated intelligence combining resume parsing, NLP semantic gap matching, ATS audit, GitHub portfolio, AI mock interview, adaptive quiz diagnostics, and Scikit-Learn market salary modeling.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              id="refresh-dashboard-btn"
              onClick={loadDashboard}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
              <span>{isLoading ? "Syncing..." : "Sync Live Data"}</span>
            </button>
            {onNavigateTab && (
              <button
                id="quick-start-interview-btn"
                onClick={() => onNavigateTab("mock_interview")}
                className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Start AI Interview</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Composite Readiness Banner */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Composite Readiness Score
              </div>
              <div className="text-2xl font-black text-blue-900 mt-0.5">
                {scores.composite_readiness || 84.5}%
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Predicted Salary Median
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                ${(salary?.expected_salary || 138000).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Learning Roadmap
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {roadmap?.duration_weeks || 4} Weeks Plan
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <Map className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Easy Step-by-Step Guided Navigation for Students / Beginners */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-300 bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-400/30">
              Simple 4-Step Career Guide
            </span>
            <h2 className="text-xl font-bold text-white mt-1.5">
              How to reach your dream tech role:
            </h2>
          </div>
          <p className="text-xs text-blue-200/80 max-w-sm">
            Follow these 4 simple steps to analyze your resume, fill skill gaps, practice questions, and get job ready!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Step 1 */}
          <button
            onClick={() => onNavigateTab && onNavigateTab("upload")}
            className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition group backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-blue-500 text-white font-black text-xs flex items-center justify-center">
                1
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                Upload
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-blue-300 transition">
              Upload Resume
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Add your PDF or DOCX file (or use sample student resumes).
            </p>
          </button>

          {/* Step 2 */}
          <button
            onClick={() => onNavigateTab && onNavigateTab("matching")}
            className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition group backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center">
                2
              </span>
              <span className="text-[11px] font-semibold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded">
                Compare
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-indigo-300 transition">
              Skill Matching
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Compare your skills against Full Stack, AI, or Cloud roles.
            </p>
          </button>

          {/* Step 3 */}
          <button
            onClick={() => onNavigateTab && onNavigateTab("roadmap")}
            className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition group backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-purple-500 text-white font-black text-xs flex items-center justify-center">
                3
              </span>
              <span className="text-[11px] font-semibold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded">
                Learn
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-purple-300 transition">
              Study Roadmap
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Get a weekly study plan with curated links and project ideas.
            </p>
          </button>

          {/* Step 4 */}
          <button
            onClick={() => onNavigateTab && onNavigateTab("mock_interview")}
            className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition group backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                4
              </span>
              <span className="text-[11px] font-semibold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded">
                Practice
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-amber-300 transition">
              Mock Interview
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Practice real interview questions with instant AI scoring.
            </p>
          </button>
        </div>
      </div>

      {/* Main Scores Grid - 6 Core Metric Gauges */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">
              Core Evaluation Dimensions
            </h2>
            <span className="text-xs font-medium text-slate-500">(All 6 System Modules)</span>
          </div>
          <span className="text-xs text-slate-400">Click any card to inspect full details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* 1. Resume Score */}
          <CircularScoreGauge
            score={scores.resume_score}
            label="Resume Score"
            sublabel="Completeness & Depth"
            icon={<FileText className="w-4 h-4 text-blue-600" />}
            strokeColor="#2563eb"
            onClick={onNavigateTab ? () => onNavigateTab("upload") : undefined}
          />

          {/* 2. Skill Match % */}
          <CircularScoreGauge
            score={scores.skill_match_percentage}
            label="Skill Match %"
            sublabel="Semantic Similarity"
            icon={<Target className="w-4 h-4 text-blue-600" />}
            strokeColor="#3b82f6"
            onClick={onNavigateTab ? () => onNavigateTab("matching") : undefined}
          />

          {/* 3. ATS Score */}
          <CircularScoreGauge
            score={scores.ats_score}
            label="ATS Score"
            sublabel="Keyword & Bullet Impact"
            icon={<FileCheck className="w-4 h-4 text-blue-600" />}
            strokeColor="#2563eb"
            onClick={onNavigateTab ? () => onNavigateTab("ats_rewriter") : undefined}
          />

          {/* 4. GitHub Score */}
          <CircularScoreGauge
            score={scores.github_score}
            label="GitHub Score"
            sublabel="Codebase & Activity"
            icon={<Github className="w-4 h-4 text-slate-800" />}
            strokeColor="#475569"
            onClick={onNavigateTab ? () => onNavigateTab("github") : undefined}
          />

          {/* 5. Interview Score */}
          <CircularScoreGauge
            score={scores.interview_score}
            label="Interview Score"
            sublabel="STAR & Technical Depth"
            icon={<Mic className="w-4 h-4 text-blue-600" />}
            strokeColor="#2563eb"
            onClick={onNavigateTab ? () => onNavigateTab("mock_interview") : undefined}
          />

          {/* 6. Quiz Score */}
          <CircularScoreGauge
            score={scores.quiz_score}
            label="Quiz Score"
            sublabel="Adaptive Accuracy"
            icon={<Brain className="w-4 h-4 text-blue-600" />}
            strokeColor="#1d4ed8"
            onClick={onNavigateTab ? () => onNavigateTab("adaptive_quiz") : undefined}
          />
        </div>
      </div>

      {/* Main Dashboard Layout with Sidebar Navigation and Content Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 sticky top-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Dashboard Navigation
              </h3>
              <p className="text-xs text-slate-600">Quick views & system modules</p>
            </div>

            <nav className="space-y-1.5 text-xs font-medium">
              <button
                onClick={() => setActiveFilter("all")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                  activeFilter === "all"
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>Executive Overview</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800">Live</span>
              </button>

              <button
                onClick={() => setActiveFilter("skills")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                  activeFilter === "skills"
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Target className="w-4 h-4 text-slate-600" />
                  <span>Skills & Gap Analysis</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {matchedSkills.length}M / {missingSkills.length}G
                </span>
              </button>

              <button
                onClick={() => setActiveFilter("career")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                  activeFilter === "career"
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                  <span>Salary & Roadmap</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  ${Math.round((salary?.expected_salary || 138000) / 1000)}k
                </span>
              </button>

              <button
                onClick={() => setActiveFilter("evaluations")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                  activeFilter === "evaluations"
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Mic className="w-4 h-4 text-slate-600" />
                  <span>Interview & Quiz Diagnostic</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {scores.interview_score}% / {scores.quiz_score}%
                </span>
              </button>
            </nav>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Deep Dive Modules
              </h4>
              <div className="space-y-1 text-xs">
                {onNavigateTab && (
                  <>
                    <button
                      onClick={() => onNavigateTab("adaptive_quiz")}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition"
                    >
                      <span className="flex items-center space-x-2">
                        <Brain className="w-3.5 h-3.5 text-blue-600" />
                        <span>Adaptive Quiz</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => onNavigateTab("salary_predictor")}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition"
                    >
                      <span className="flex items-center space-x-2">
                        <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                        <span>Salary Predictor</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => onNavigateTab("mock_interview")}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition"
                    >
                      <span className="flex items-center space-x-2">
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>Mock Interview</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => onNavigateTab("ats_rewriter")}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition"
                    >
                      <span className="flex items-center space-x-2">
                        <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>ATS Rewriter</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => onNavigateTab("gap_roadmap")}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition"
                    >
                      <span className="flex items-center space-x-2">
                        <Map className="w-3.5 h-3.5 text-blue-600" />
                        <span>Learning Roadmap</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => onNavigateTab("github")}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition"
                    >
                      <span className="flex items-center space-x-2">
                        <Github className="w-3.5 h-3.5 text-slate-700" />
                        <span>GitHub Profiler</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Candidate Session Info */}
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Account:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[120px]">{user?.email || "User"}</span>
              </div>
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="font-mono text-slate-700">SQLite app.db</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area (9 Columns) */}
        <main className="lg:col-span-9 space-y-8">
          {/* Charts Section: 4 Distinct Chart.js Visualizations */}
          {(activeFilter === "all" || activeFilter === "skills") && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Analytical Visualizations (Chart.js Engine)
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-medium">Domain-Specific Precision</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Skill Match Radar Chart */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        1. Skill Match Competency Radar
                      </h3>
                      <p className="text-xs text-slate-500">
                        Multi-category candidate competency vs target role benchmark
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Radar
                    </span>
                  </div>

                  <div className="h-64 flex items-center justify-center relative">
                    <Radar
                      data={radarChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            angleLines: { color: "#f1f5f9" },
                            grid: { color: "#e2e8f0" },
                            pointLabels: {
                              font: { size: 11, weight: "bold" },
                              color: "#475569"
                            },
                            suggestedMin: 30,
                            suggestedMax: 100
                          }
                        },
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: { boxWidth: 12, font: { size: 11 } }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Chart 2: Skill Gap Chart (Bar Chart) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        2. Skill Gap Distribution Chart
                      </h3>
                      <p className="text-xs text-slate-500">
                        Matched skills vs missing gaps categorized by technical domain
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Bar
                    </span>
                  </div>

                  <div className="h-64 flex items-center justify-center relative">
                    <Bar
                      data={skillGapBarData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { font: { size: 11 } }
                          },
                          y: {
                            grid: { color: "#f1f5f9" },
                            ticks: { stepSize: 1 }
                          }
                        },
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: { boxWidth: 12, font: { size: 11 } }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Chart 3: Progress Trajectory Chart (Line Chart) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        3. Evaluation Progress Trajectory
                      </h3>
                      <p className="text-xs text-slate-500">
                        Candidate scores across all 6 stages vs 80-85% industry standard
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Line Area
                    </span>
                  </div>

                  <div className="h-64 flex items-center justify-center relative">
                    <Line
                      data={progressLineData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            min: 40,
                            max: 100,
                            grid: { color: "#f1f5f9" }
                          },
                          x: {
                            grid: { display: false },
                            ticks: { font: { size: 10 } }
                          }
                        },
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: { boxWidth: 12, font: { size: 11 } }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Chart 4: Salary Range Visualization */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        4. Market Salary Range Visualization
                      </h3>
                      <p className="text-xs text-slate-500">
                        Scikit-Learn predicted compensation band vs market baseline
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Compensation
                    </span>
                  </div>

                  <div className="h-64 flex items-center justify-center relative">
                    <Bar
                      data={salaryBarData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            grid: { color: "#f1f5f9" },
                            ticks: {
                              callback: (val) => `$${Number(val) / 1000}k`
                            }
                          },
                          x: {
                            grid: { display: false },
                            ticks: { font: { size: 10 } }
                          }
                        },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `Salary: $${ctx.raw?.toLocaleString()} USD`
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Matched vs Missing Skills Cards */}
          {(activeFilter === "all" || activeFilter === "skills") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matched Skills Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Verified Matched Skills ({matchedSkills.length})
                      </h3>
                      <p className="text-xs text-slate-500">Demonstrated candidate competencies</p>
                    </div>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab("matching")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span>Full Match</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {matchedSkills.slice(0, 5).map((skill: any, idx: number) => {
                    const skillName = typeof skill === "string" ? skill : skill.skill || "Skill";
                    const matchPct = typeof skill === "object" ? skill.match_percentage || 90 : 90;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 text-xs">
                              {skillName}
                            </span>
                            {skill.is_priority && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                Priority
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-blue-700 font-mono">
                            {matchPct}% Match
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${matchPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Missing Skills Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Missing Skills & Gaps ({missingSkills.length})
                      </h3>
                      <p className="text-xs text-slate-500">Prioritized for career progression</p>
                    </div>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab("gap_roadmap")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span>Build Roadmap</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {missingSkills.slice(0, 4).map((gap: any, idx: number) => {
                    const skillName = typeof gap === "string" ? gap : gap.skill || "Missing Skill";
                    const severity = typeof gap === "object" ? gap.gap_severity || "High" : "High";
                    const reason = typeof gap === "object" ? gap.reason || "Key requirement for role." : "Key requirement for role.";
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 text-xs">
                              {skillName}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              severity === "High"
                                ? "bg-slate-200 text-slate-800"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {severity} Severity
                            </span>
                          </div>
                          {gap.is_priority && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Priority Gap
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 leading-snug">
                          {reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Learning Roadmap & Salary Prediction Section */}
          {(activeFilter === "all" || activeFilter === "career") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Learning Roadmap Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                      <Map className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        AI Learning Roadmap
                      </h3>
                      <p className="text-xs text-slate-500">
                        {roadmap?.duration_weeks || 4}-Week Targeted Acceleration
                      </p>
                    </div>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab("gap_roadmap")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span>Full Plan</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-slate-700 leading-relaxed">
                  <strong className="text-blue-900 block font-semibold mb-1">Strategic Overview:</strong>
                  {roadmap?.overview || "4-week structured curriculum addressing priority skill gaps with practical deliverables and weekly milestones."}
                </div>

                {/* Roadmap Weeks Timeline List */}
                <div className="space-y-2 pt-1">
                  {(roadmap?.weekly_plan || []).slice(0, 4).map((week: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          W{week.week_number || idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {week.title || `Week ${idx + 1}`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Focus: <span className="font-medium text-slate-700">{week.primary_skill || "Core Concepts"}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">
                        {week.estimated_hours || 8} hrs
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Salary Prediction Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Market Salary Prediction
                      </h3>
                      <p className="text-xs text-slate-500">
                        Scikit-Learn RandomForest Regression Model
                      </p>
                    </div>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab("salary_predictor")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span>Simulate</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Salary Bands Highlight Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Predicted Expected Annual Compensation
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    ${(salary?.expected_salary || 138000).toLocaleString()}{" "}
                    <span className="text-sm font-normal text-slate-500">{salary?.currency || "USD"}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-4 text-xs text-slate-600 pt-1">
                    <span>Min: <strong>${(salary?.min_salary || 115000).toLocaleString()}</strong></span>
                    <span>•</span>
                    <span>Max: <strong>${(salary?.max_salary || 162000).toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Skill Value Uplift Insights */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Top Salary-Boosting Skills
                  </h4>
                  <div className="space-y-1.5">
                    {(salary?.top_contributing_skills || []).slice(0, 3).map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs"
                      >
                        <span className="font-semibold text-slate-800">{item.skill}</span>
                        <span className="font-bold text-blue-700 font-mono">
                          +${(item.estimated_annual_uplift || 10000).toLocaleString()}/yr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GitHub Summary & Candidate Diagnostics */}
          {(activeFilter === "all" || activeFilter === "evaluations") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GitHub Portfolio Summary */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
                      <Github className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        GitHub Portfolio Summary
                      </h3>
                      <p className="text-xs text-slate-500">
                        Profile: @{github?.username || "developer"}
                      </p>
                    </div>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab("github")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Repos</div>
                    <div className="text-lg font-bold text-slate-900">{github?.public_repos || 24}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Stars</div>
                    <div className="text-lg font-bold text-slate-900">{github?.total_stars || 86}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Forks</div>
                    <div className="text-lg font-bold text-slate-900">{github?.total_forks || 19}</div>
                  </div>
                </div>

                {/* Primary Language & Tier Badge */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Primary Language</span>
                    <span className="font-bold text-slate-900">{github?.primary_language || "TypeScript"}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {github?.tier || "Advanced / Contributor"}
                  </span>
                </div>

                {/* Top Repository */}
                {github?.top_project && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate">
                        {github.top_project.name || "core-project"}
                      </span>
                      <span className="flex items-center space-x-1 text-slate-600 text-[11px]">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{github.top_project.stars || 42}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {github.top_project.description || "Production system repository"}
                    </p>
                  </div>
                )}
              </div>

              {/* AI Mock Interview & Adaptive Quiz Combined Diagnostic */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Interview & Quiz Readiness
                      </h3>
                      <p className="text-xs text-slate-500">Live evaluation telemetry</p>
                    </div>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab("adaptive_quiz")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span>Take Quiz</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Mock Interview Summary Bar */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      AI Mock Interview Readiness
                    </span>
                    <span className="font-bold text-blue-700">{scores.interview_score}/100 pts</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${scores.interview_score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Strengths in technical reasoning and architecture. Practice behavioral collaboration scenarios.
                  </p>
                </div>

                {/* Adaptive Quiz Diagnostic */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      Adaptive Knowledge Quiz
                    </span>
                    <span className="font-bold text-blue-700">{scores.quiz_score}% Accuracy</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${scores.quiz_score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Demonstrated Hard difficulty mastery on Python & React; reinforce Kubernetes networking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Reports Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Recent Generated Reports & Evaluations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audit history persisted in SQLite database
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400">Showing {recentReports.length} records</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Report Type</th>
                    <th className="py-3 px-4">Target Job / Title</th>
                    <th className="py-3 px-4">Result / Score</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
                  {recentReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No previous reports recorded yet. Generate analyses to view history.
                      </td>
                    </tr>
                  ) : (
                    recentReports.map((report, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <span className="inline-flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            <span>{report.report_type}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {report.title}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {report.unit === "USD"
                            ? `$${Number(report.score).toLocaleString()}`
                            : `${report.score} ${report.unit}`}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {report.created_at || "Recent"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {onNavigateTab && (
                            <button
                              onClick={() => onNavigateTab(report.tab_target)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
                            >
                              <span>View Module</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
