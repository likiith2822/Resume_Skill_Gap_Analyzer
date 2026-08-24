import React, { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  FileText,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Terminal,
  Database,
  Tag,
  Code2,
  Cloud,
  Check,
  AlertCircle,
  Copy,
  BarChart3,
  BookOpen
} from "lucide-react";
import {
  NlpAnalysisResultData,
  ExtractedSkillItem,
  ResumeListItem,
  ApiResponse,
  SkillTaxonomyData,
  SampleTestResult,
  SkillNormalizationItem
} from "../types";

interface NlpExtractionViewProps {
  onNavigateToUpload?: () => void;
  activeResumeId?: number | null;
}

const PRESET_SAMPLES = [
  {
    id: "sample_fullstack",
    title: "Full-Stack Software Engineer (Alex Rivers)",
    roleBadge: "Full-Stack & ML",
    text: `ALEX RIVERS
alex.rivers@college.edu | +1 (555) 345-6789 | San Francisco, CA
https://github.com/alexrivers | https://linkedin.com/in/alexrivers

SUMMARY
Passionate Full-Stack & Machine Learning Software Engineer with experience in React, Node.js, Python, FastAPI, and cloud infrastructure.

EDUCATION
Bachelor of Technology in Computer Science & Engineering
Stanford University | 2020 - 2024 | GPA: 3.9/4.0
Relevant Coursework: Data Structures, Algorithms, Distributed Systems, Machine Learning, Database Management.

TECHNICAL SKILLS
Languages: Python, TypeScript, JavaScript, SQL, C++, HTML5, CSS3
Frameworks & Libraries: React, Node.js, Express, FastAPI, Flask, PyTorch, Tailwind CSS, Redux
Databases & Cloud: PostgreSQL, SQLite, MongoDB, Redis, Docker, Kubernetes, AWS, GitHub Actions
Methodologies: Agile, Scrum, CI/CD, Microservices, REST APIs, Object-Oriented Programming, Problem Solving, Teamwork

WORK EXPERIENCE
Full-Stack Software Engineering Intern
Acme Cloud Systems | Jun 2023 - Aug 2023
· Architected scalable RESTful microservices using Python Flask and PostgreSQL, reducing latency by 35%.
· Developed responsive frontend dashboard components with React, TypeScript, and Tailwind CSS.
· Automated CI/CD deployment pipelines using Docker and GitHub Actions on AWS ECS.`
  },
  {
    id: "sample_ai_ml",
    title: "AI & Machine Learning Specialist (Sarah Chen)",
    roleBadge: "AI/ML & NLP",
    text: `SARAH CHEN
sarah.chen@ai-institute.org | Boston, MA
https://github.com/sarahchen | https://linkedin.com/in/sarahchen

SUMMARY
Machine Learning Engineer specializing in Natural Language Processing (NLP), Large Language Models (LLMs), and RAG architectures.

EDUCATION
Master of Science in Computer Science (Artificial Intelligence)
MIT | 2021 - 2023 | GPA: 4.0/4.0

TECHNICAL SKILLS
Languages: Python, R, C++, SQL
AI/ML Technologies: Machine Learning, Deep Learning, Natural Language Processing (NLP), Transformers, Large Language Models (LLMs), RAG (Retrieval-Augmented Generation), spaCy, NLTK, Hugging Face, LangChain, PyTorch, TensorFlow, Scikit-Learn, Pandas, NumPy, Computer Vision, OpenCV
Cloud & Databases: PostgreSQL, MongoDB, Vector Databases, AWS S3, Docker, Git
Soft Skills: Critical Thinking, Communication, Analytical Skills, Problem Solving, Mentorship`
  },
  {
    id: "sample_devops",
    title: "Cloud & DevOps Platform Engineer (David Miller)",
    roleBadge: "Cloud & DevOps",
    text: `DAVID MILLER
david.miller@cloudops.net | Seattle, WA
https://github.com/davidmiller | https://linkedin.com/in/davidmiller

SUMMARY
DevOps and Site Reliability Engineer with 4+ years of expertise in Kubernetes container orchestration, Terraform infrastructure as code, and multi-cloud CI/CD automation.

TECHNICAL SKILLS
Languages: Go, Python, Shell / Bash
Cloud Platforms: AWS, Google Cloud Platform (GCP), Microsoft Azure
DevOps & Orchestration: Docker, Kubernetes, Terraform, Ansible, Jenkins, CI/CD, GitHub Actions, GitLab CI, Linux, Nginx
Monitoring & Observability: Prometheus & Grafana, ELK Stack, Distributed Systems, Microservices, REST APIs, Object-Oriented Programming
Leadership & Culture: Agile / Scrum, Teamwork & Collaboration, Leadership & Mentorship, Time Management`
  }
];

export const NlpExtractionView: React.FC<NlpExtractionViewProps> = ({
  onNavigateToUpload,
  activeResumeId
}) => {
  // Input source state
  const [sourceType, setSourceType] = useState<"resume" | "preset" | "custom">(
    activeResumeId ? "resume" : "preset"
  );
  const [selectedResumeId, setSelectedResumeId] = useState<number | "">(activeResumeId || "");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("sample_fullstack");
  const [customText, setCustomText] = useState<string>(PRESET_SAMPLES[0].text);
  const [customFilename, setCustomFilename] = useState<string>("custom_resume.txt");

  // Server resume list
  const [resumesList, setResumesList] = useState<ResumeListItem[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(false);

  // Processing state & analysis results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<NlpAnalysisResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active sub-tab in NLP view
  const [activeTab, setActiveTab] = useState<"pipeline" | "skills" | "normalizer" | "samples_test" | "taxonomy">("pipeline");

  // Filters & search
  const [skillSearchQuery, setSkillSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [copiedCleanText, setCopiedCleanText] = useState<boolean>(false);

  // Normalizer tool state
  const [normalizerInput, setNormalizerInput] = useState<string>("python, PYTHON, react.js, k8s, ci/cd, postgres, aws, DL, microservices");
  const [normalizedResults, setNormalizedResults] = useState<SkillNormalizationItem[]>([]);
  const [isNormalizing, setIsNormalizing] = useState<boolean>(false);

  // Taxonomy data
  const [taxonomyData, setTaxonomyData] = useState<SkillTaxonomyData | null>(null);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState<boolean>(false);

  // Batch samples test runner state
  const [sampleTestResults, setSampleTestResults] = useState<SampleTestResult[]>([]);
  const [isTestingSamples, setIsTestingSamples] = useState<boolean>(false);

  // Fetch available user resumes from SQLite on mount
  useEffect(() => {
    fetchUserResumes();
    fetchTaxonomy();
    // Pre-run NLP analysis on default preset
    runNlpPipeline(PRESET_SAMPLES[0].text, "Alex_Rivers_Resume.pdf");
  }, []);

  // Update selected resume if parent changes
  useEffect(() => {
    if (activeResumeId) {
      setSelectedResumeId(activeResumeId);
      setSourceType("resume");
      runNlpPipelineForResume(activeResumeId);
    }
  }, [activeResumeId]);

  const fetchUserResumes = async () => {
    setIsLoadingResumes(true);
    try {
      const res = await fetch("/api/resumes", { credentials: "include" });
      const data: ApiResponse<{ resumes: ResumeListItem[] }> = await res.json();
      if (data.success && data.data?.resumes) {
        setResumesList(data.data.resumes);
        if (data.data.resumes.length > 0 && !selectedResumeId) {
          setSelectedResumeId(data.data.resumes[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const fetchTaxonomy = async () => {
    setIsLoadingTaxonomy(true);
    try {
      const res = await fetch("/api/analysis/skills/taxonomy");
      const data = await res.json();
      if (data.success && data.data) {
        setTaxonomyData(data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingTaxonomy(false);
    }
  };

  // Run NLP Extraction with raw text
  const runNlpPipeline = async (textToProcess: string, filenameLabel?: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/analysis/extract-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToProcess,
          filename: filenameLabel || "sample_resume.txt"
        })
      });

      const res: ApiResponse<NlpAnalysisResultData> = await response.json();
      if (res.success && res.data) {
        setAnalysisResult(res.data);
      } else {
        setErrorMsg(res.error?.message || "Failed to execute NLP skill extraction pipeline.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error while calling NLP pipeline.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Run NLP Extraction for a stored SQLite resume ID
  const runNlpPipelineForResume = async (resumeId: number) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/analysis/extract-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: resumeId
        })
      });

      const res: ApiResponse<NlpAnalysisResultData> = await response.json();
      if (res.success && res.data) {
        setAnalysisResult(res.data);
      } else {
        setErrorMsg(res.error?.message || `Failed to process resume ID ${resumeId}.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error during resume NLP extraction.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerAnalysis = () => {
    if (sourceType === "resume") {
      if (!selectedResumeId) {
        setErrorMsg("Please select a resume from your SQLite database.");
        return;
      }
      runNlpPipelineForResume(Number(selectedResumeId));
    } else if (sourceType === "preset") {
      const preset = PRESET_SAMPLES.find(p => p.id === selectedPresetId);
      if (preset) {
        runNlpPipeline(preset.text, `${preset.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`);
      }
    } else {
      if (!customText.trim()) {
        setErrorMsg("Please enter some resume text to analyze.");
        return;
      }
      runNlpPipeline(customText, customFilename);
    }
  };

  // Normalizer Action
  const handleNormalizeInput = async () => {
    setIsNormalizing(true);
    try {
      const skillsArray = normalizerInput
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/analysis/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: skillsArray })
      });

      const data = await res.json();
      if (data.success && data.data?.results) {
        setNormalizedResults(data.data.results);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsNormalizing(false);
    }
  };

  // Run Batch Samples Test
  const handleRunSamplesTest = async () => {
    setIsTestingSamples(true);
    try {
      const res = await fetch("/api/analysis/test-samples", { method: "POST" });
      const data = await res.json();
      if (data.success && data.data?.results) {
        setSampleTestResults(data.data.results);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsTestingSamples(false);
    }
  };

  const copyCleanedText = () => {
    if (analysisResult?.cleaned_text) {
      navigator.clipboard.writeText(analysisResult.cleaned_text);
      setCopiedCleanText(true);
      setTimeout(() => setCopiedCleanText(false), 2000);
    }
  };

  // Category Color Map
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Programming Languages":
        return { bg: "bg-blue-50 text-blue-800 border-blue-200", badge: "bg-blue-100 text-blue-900", dot: "bg-blue-500" };
      case "Frameworks & Libraries":
        return { bg: "bg-indigo-50 text-indigo-800 border-indigo-200", badge: "bg-indigo-100 text-indigo-900", dot: "bg-indigo-500" };
      case "Databases & Storage":
        return { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", badge: "bg-emerald-100 text-emerald-900", dot: "bg-emerald-500" };
      case "Cloud & DevOps":
        return { bg: "bg-sky-50 text-sky-800 border-sky-200", badge: "bg-sky-100 text-sky-900", dot: "bg-sky-500" };
      case "AI/ML Technologies":
        return { bg: "bg-purple-50 text-purple-800 border-purple-200", badge: "bg-purple-100 text-purple-900", dot: "bg-purple-500" };
      case "Development Tools":
        return { bg: "bg-amber-50 text-amber-800 border-amber-200", badge: "bg-amber-100 text-amber-900", dot: "bg-amber-500" };
      case "Soft Skills":
        return { bg: "bg-rose-50 text-rose-800 border-rose-200", badge: "bg-rose-100 text-rose-900", dot: "bg-rose-500" };
      default:
        return { bg: "bg-stone-100 text-stone-800 border-stone-200", badge: "bg-stone-200 text-stone-900", dot: "bg-stone-500" };
    }
  };

  // Filter skills
  const filteredSkills = (analysisResult?.extracted_skills || []).filter(item => {
    const matchesCategory = selectedCategoryFilter === "all" || item.category === selectedCategoryFilter;
    const matchesSearch =
      item.skill.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
      (item.matched_as && item.matched_as.some(m => m.toLowerCase().includes(skillSearchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="nlp-extraction-view" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold">
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              <span>Part 4 Milestone: NLP Pipeline with spaCy & NLTK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              NLP & Canonical Skill Extraction
            </h1>
            <p className="text-sm sm:text-base text-stone-600 max-w-3xl leading-relaxed">
              Processes resume text through a multi-stage NLP pipeline: text cleaning, tokenization, stop-word removal,
              POS lemmatization, and canonical skill taxonomy normalization with SQLite storage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="run-pipeline-main-btn"
              onClick={handleTriggerAnalysis}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing NLP Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run NLP Extraction</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tech Badges */}
        <div className="mt-6 pt-5 border-t border-stone-100 flex flex-wrap items-center gap-2.5 text-xs text-stone-600">
          <span className="font-semibold text-stone-800">Pipeline Stack:</span>
          <span className="px-2.5 py-1 bg-stone-100 rounded-md font-mono text-stone-700 font-medium">spaCy (en_core_web_sm)</span>
          <span className="px-2.5 py-1 bg-stone-100 rounded-md font-mono text-stone-700 font-medium">NLTK (stopwords, tokenizers, wordnet)</span>
          <span className="px-2.5 py-1 bg-stone-100 rounded-md font-mono text-stone-700 font-medium">Python 3.11</span>
          <span className="px-2.5 py-1 bg-stone-100 rounded-md font-mono text-stone-700 font-medium">SQLite (extracted_skills table)</span>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold">
            POST /api/analysis/extract-skills
          </span>
        </div>
      </div>

      {/* Input Source Selector Card */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-purple-700" />
            <h2 className="font-semibold text-stone-900 text-sm sm:text-base">1. Select Input Source for NLP Pipeline</h2>
          </div>

          {/* Source Tabs */}
          <div className="flex p-1 bg-stone-100 rounded-xl">
            <button
              id="source-tab-preset"
              onClick={() => {
                setSourceType("preset");
                const preset = PRESET_SAMPLES.find(p => p.id === selectedPresetId);
                if (preset) setCustomText(preset.text);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sourceType === "preset"
                  ? "bg-white text-stone-900 shadow-sm font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Benchmark Samples (3)
            </button>
            <button
              id="source-tab-resume"
              onClick={() => setSourceType("resume")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sourceType === "resume"
                  ? "bg-white text-stone-900 shadow-sm font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              SQLite Stored Resumes ({resumesList.length})
            </button>
            <button
              id="source-tab-custom"
              onClick={() => setSourceType("custom")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sourceType === "custom"
                  ? "bg-white text-stone-900 shadow-sm font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Custom Text Editor
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        {sourceType === "preset" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRESET_SAMPLES.map(preset => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPresetId(preset.id);
                    setCustomText(preset.text);
                    runNlpPipeline(preset.text, `${preset.title}.txt`);
                  }}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    isSelected
                      ? "border-purple-500 bg-purple-50/50 shadow-sm ring-2 ring-purple-500/20"
                      : "border-stone-200 bg-stone-50/50 hover:bg-stone-100/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {preset.roleBadge}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </div>
                  <h3 className="font-semibold text-stone-900 text-sm">{preset.title}</h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                    {preset.text.split("\n").filter(Boolean).slice(1, 3).join(" ")}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* SQLite Stored Resumes Selector */}
        {sourceType === "resume" && (
          <div>
            {isLoadingResumes ? (
              <div className="p-6 text-center text-sm text-stone-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-stone-400" />
                <span>Loading uploaded resumes from SQLite...</span>
              </div>
            ) : resumesList.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-stone-300 rounded-xl bg-stone-50/50 space-y-3">
                <FileText className="w-8 h-8 text-stone-400 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-stone-800">No resumes uploaded yet in SQLite database.</p>
                  <p className="text-xs text-stone-500 mt-0.5">Upload a PDF or DOCX resume in Part 3 to test SQLite-linked NLP processing.</p>
                </div>
                {onNavigateToUpload && (
                  <button
                    onClick={onNavigateToUpload}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800"
                  >
                    <span>Go to Resume Upload</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-stone-700">
                  Select Uploaded Resume (ID / Candidate / File):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {resumesList.map(resume => {
                    const isSelected = selectedResumeId === resume.id;
                    return (
                      <button
                        key={resume.id}
                        onClick={() => {
                          setSelectedResumeId(resume.id);
                          runNlpPipelineForResume(resume.id);
                        }}
                        className={`p-3.5 rounded-xl text-left border transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20 shadow-sm"
                            : "border-stone-200 bg-stone-50/50 hover:bg-stone-100/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-stone-900 text-xs truncate max-w-[180px]">
                            {resume.original_filename}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-stone-200/80 rounded text-stone-700">
                            ID #{resume.id}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1 font-medium">{resume.candidate_name}</p>
                        <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-200/60">
                          <span>{resume.file_type} ({(resume.file_size / 1024).toFixed(1)} KB)</span>
                          <span className="font-medium text-purple-700">{resume.skills_count} skills indexed</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Textarea */}
        {sourceType === "custom" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-700">Paste or edit raw resume text:</label>
              <span className="text-xs text-stone-400 font-mono">{customText.length} characters</span>
            </div>
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-stone-300 p-3 text-xs font-mono focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none leading-relaxed text-stone-800"
              placeholder="Paste candidate resume text with skills, experiences, and education here..."
            />
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs for Analysis Results */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
        <div className="flex flex-wrap gap-2">
          <button
            id="tab-pipeline"
            onClick={() => setActiveTab("pipeline")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "pipeline"
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>5-Stage NLP Pipeline Details</span>
          </button>

          <button
            id="tab-skills"
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "skills"
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Extracted Skills Cloud ({analysisResult?.skills_summary.total_extracted || 0})</span>
          </button>

          <button
            id="tab-normalizer"
            onClick={() => setActiveTab("normalizer")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "normalizer"
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200"
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Skill Normalizer Tool</span>
          </button>

          <button
            id="tab-samples-test"
            onClick={() => {
              setActiveTab("samples_test");
              if (sampleTestResults.length === 0) handleRunSamplesTest();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "samples_test"
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Benchmark Validation Runner</span>
          </button>

          <button
            id="tab-taxonomy"
            onClick={() => setActiveTab("taxonomy")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "taxonomy"
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Taxonomy Dataset ({taxonomyData?.total_canonical_skills || 0})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 5-Stage NLP Pipeline Detailed View */}
      {/* ========================================================================= */}
      {activeTab === "pipeline" && analysisResult && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs text-stone-500 font-medium">Total Extracted Skills</span>
              <p className="text-2xl font-bold text-purple-700">{analysisResult.skills_summary.total_extracted}</p>
              <span className="text-[11px] text-stone-400">across {analysisResult.skills_summary.categories_count} categories</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs text-stone-500 font-medium">Raw Tokens Processed</span>
              <p className="text-2xl font-bold text-blue-700">
                {analysisResult.nlp_pipeline.stage_2_tokenization.total_tokens}
              </p>
              <span className="text-[11px] text-stone-400">using spaCy en_core_web_sm</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs text-stone-500 font-medium">Stop-words Filtered</span>
              <p className="text-2xl font-bold text-amber-700">
                {analysisResult.nlp_pipeline.stage_3_stopword_removal.stopwords_removed_count}
              </p>
              <span className="text-[11px] text-stone-400">NLTK standard + domain preserved</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs text-stone-500 font-medium">Lemmas & POS Tags</span>
              <p className="text-2xl font-bold text-emerald-700">
                {analysisResult.nlp_pipeline.stage_4_lemmatization_and_pos.total_lemmatized}
              </p>
              <span className="text-[11px] text-stone-400">WordNet & spaCy POS tagged</span>
            </div>
          </div>

          {/* 5-Stage Stepper Cards */}
          <div className="space-y-4">
            {/* Stage 1: Text Cleaning */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-bold font-mono">
                    1
                  </span>
                  <h3 className="font-semibold text-stone-900 text-sm sm:text-base">Stage 1: Text Preprocessing & Cleaning</h3>
                </div>
                <button
                  onClick={copyCleanedText}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200"
                >
                  {copiedCleanText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCleanText ? "Copied" : "Copy Clean Text"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                  <span className="font-medium text-stone-700">Cleaning Transformations:</span>
                  <ul className="list-disc list-inside space-y-1 text-stone-600 text-[11px]">
                    <li>Unicode normalization (NFKD form)</li>
                    <li>Non-standard bullet point glyphs stripped</li>
                    <li>Special syntax preserved (C++, C#, .NET, Node.js)</li>
                    <li>Whitespace, control chars, and linefeeds unified</li>
                  </ul>
                </div>

                <div className="lg:col-span-2 p-3 bg-stone-900 text-stone-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-36">
                  <span className="text-stone-400 block mb-1"># Cleaned Text Output (Preview):</span>
                  {analysisResult.cleaned_text.slice(0, 400)}...
                </div>
              </div>
            </div>

            {/* Stage 2: Tokenization */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                    2
                  </span>
                  <h3 className="font-semibold text-stone-900 text-sm sm:text-base">Stage 2: Lexical Tokenization & N-grams</h3>
                </div>
                <span className="text-xs font-mono text-stone-500">
                  {analysisResult.nlp_pipeline.stage_2_tokenization.total_tokens} total tokens
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-stone-500 font-medium">Token Stream Sample:</span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-3 bg-stone-50 rounded-xl border border-stone-200">
                  {analysisResult.nlp_pipeline.stage_2_tokenization.tokens_sample.map((token, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-white border border-stone-200 text-stone-800 font-mono text-[11px] rounded"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stage 3: Stop-word Removal */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold font-mono">
                    3
                  </span>
                  <h3 className="font-semibold text-stone-900 text-sm sm:text-base">
                    Stage 3: Stop-word Filtering & Technical Token Guarding
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono">
                  {analysisResult.nlp_pipeline.stage_3_stopword_removal.stopwords_removed_count} removed
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Filtered Meaningful Tokens:</span>
                  <span className="text-[11px] text-stone-400">Guards short terms: C, R, Go, IT, AI, ML, NLP</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-3 bg-stone-50 rounded-xl border border-stone-200">
                  {analysisResult.nlp_pipeline.stage_3_stopword_removal.filtered_sample.map((tok, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px] rounded font-medium"
                    >
                      {tok}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stage 4: Lemmatization and POS Tagging */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                    4
                  </span>
                  <h3 className="font-semibold text-stone-900 text-sm sm:text-base">
                    Stage 4: Morphological Lemmatization & POS Tagging
                  </h3>
                </div>
                <span className="text-xs text-stone-500 font-mono">WordNet & spaCy POS</span>
              </div>

              {/* POS Breakdown Chips */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-stone-700">POS Distribution:</span>
                {Object.entries(analysisResult.nlp_pipeline.stage_4_lemmatization_and_pos.pos_distribution).map(
                  ([pos, count]) => (
                    <span
                      key={pos}
                      className="px-2.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-stone-700 text-xs font-mono"
                    >
                      {pos}: <strong className="text-stone-900">{count}</strong>
                    </span>
                  )
                )}
              </div>

              {/* Lemma Inspection Table */}
              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="py-2 px-3">Surface Token</th>
                      <th className="py-2 px-3">Base Lemma</th>
                      <th className="py-2 px-3">Universal POS</th>
                      <th className="py-2 px-3">Fine Tag</th>
                      <th className="py-2 px-3">Stopword</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                    {analysisResult.nlp_pipeline.stage_4_lemmatization_and_pos.sample_lemmas.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/60">
                        <td className="py-1.5 px-3 font-semibold text-stone-900">{item.word}</td>
                        <td className="py-1.5 px-3 text-purple-700 font-medium">{item.lemma}</td>
                        <td className="py-1.5 px-3">
                          <span className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-700">{item.pos}</span>
                        </td>
                        <td className="py-1.5 px-3 text-stone-500">{item.tag}</td>
                        <td className="py-1.5 px-3">
                          {item.is_stop ? (
                            <span className="text-amber-600">Yes</span>
                          ) : (
                            <span className="text-stone-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stage 5: Canonical Skill Extraction */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-bold font-mono">
                    5
                  </span>
                  <h3 className="font-semibold text-stone-900 text-sm sm:text-base">
                    Stage 5: Taxonomy Matching & SQLite Persistence
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab("skills")}
                  className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
                >
                  <span>Explore Skills Grid</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Category Breakdown Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(analysisResult.skills_summary.category_breakdown).map(([cat, count]) => {
                  const style = getCategoryColor(cat);
                  return (
                    <div key={cat} className={`p-3 rounded-xl border ${style.bg} space-y-1`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs truncate max-w-[140px]">{cat}</span>
                        <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded bg-white/70">
                          {count}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 line-clamp-1">
                        {(analysisResult.categorized_skills[cat] || []).join(", ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Extracted Skills Cloud & Details */}
      {/* ========================================================================= */}
      {activeTab === "skills" && analysisResult && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={skillSearchQuery}
                onChange={e => setSkillSearchQuery(e.target.value)}
                placeholder="Search extracted skills or categories..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-stone-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <button
                onClick={() => setSelectedCategoryFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategoryFilter === "all"
                    ? "bg-stone-900 text-white font-semibold"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                All ({analysisResult.extracted_skills.length})
              </button>
              {Object.keys(analysisResult.categorized_skills).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategoryFilter === cat
                      ? "bg-purple-700 text-white font-semibold"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {cat} ({analysisResult.categorized_skills[cat].length})
                </button>
              ))}
            </div>
          </div>

          {/* Skills Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSkills.map((item, idx) => {
              const style = getCategoryColor(item.category);
              return (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                        <h4 className="font-bold text-stone-900 text-sm">{item.skill}</h4>
                      </div>
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${style.badge}`}>
                        {item.category}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                        {item.occurrences} {item.occurrences === 1 ? "occurrence" : "occurrences"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-stone-500">
                      <span>Normalized Match:</span>
                      <span className="font-mono text-emerald-700 font-medium">
                        {(item.confidence * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                    {item.matched_as && item.matched_as.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 overflow-hidden">
                        <span className="shrink-0 text-stone-400">Found as:</span>
                        <div className="flex flex-wrap gap-1">
                          {item.matched_as.map((m, mi) => (
                            <span key={mi} className="px-1.5 py-0.2 bg-stone-100 text-stone-800 rounded font-mono">
                              "{m}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSkills.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-sm">
              No skills match your search or filter query.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Interactive Skill Normalizer Tool */}
      {/* ========================================================================= */}
      {activeTab === "normalizer" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-purple-700" />
              <h3 className="text-lg font-bold text-stone-900">Skill Variation Normalizer Sandbox</h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 max-w-2xl">
              Demonstrates automatic normalization of casing, punctuation, abbreviations, and synonyms
              into standard canonical forms (e.g., <code>python</code> &rarr; <code>Python</code>, <code>k8s</code> &rarr; <code>Kubernetes</code>, <code>react.js</code> &rarr; <code>React</code>).
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-stone-800">
              Input Skills / Aliases (comma-separated):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={normalizerInput}
                onChange={e => setNormalizerInput(e.target.value)}
                placeholder="e.g. python, PYTHON, reactjs, k8s, ci/cd, postgres, aws, DL"
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                onClick={handleNormalizeInput}
                disabled={isNormalizing}
                className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {isNormalizing ? "Normalizing..." : "Normalize Skills"}
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="text-stone-400">Quick tests:</span>
              {[
                "python, PYTHON, Python3, py",
                "react.js, reactjs, react native",
                "k8s, kubernetes, docker, containerization",
                "ci/cd, cicd, continuous integration",
                "postgres, postgresql, mongo, mongodb",
                "ml, dl, nlp, llm, genai, transformers"
              ].map((sample, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setNormalizerInput(sample);
                    setTimeout(() => handleNormalizeInput(), 50);
                  }}
                  className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded font-mono text-[11px]"
                >
                  {sample.slice(0, 24)}...
                </button>
              ))}
            </div>
          </div>

          {/* Normalization Results */}
          {normalizedResults.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Normalization Output ({normalizedResults.length} terms mapped):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {normalizedResults.map((res, i) => {
                  const style = getCategoryColor(res.category);
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center justify-between"
                    >
                      <div className="space-y-1 font-mono text-xs">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-stone-500 font-normal">"{res.original}"</span>
                          <ArrowRight className="w-3 h-3 text-purple-600" />
                          <span className="font-bold text-stone-900">{res.canonical}</span>
                        </div>
                        <span className={`inline-block text-[10px] font-sans font-semibold px-2 py-0.5 rounded ${style.badge}`}>
                          {res.category}
                        </span>
                      </div>

                      {res.matched ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                          Mapped
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-stone-200 text-stone-600 rounded">
                          Raw
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Benchmark Samples Validation Runner */}
      {/* ========================================================================= */}
      {activeTab === "samples_test" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900">Multi-Resume Benchmark Validation</h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Executes the full spaCy/NLTK pipeline on 3 diverse engineering profiles to verify extraction accuracy and category coverage.
              </p>
            </div>
            <button
              onClick={handleRunSamplesTest}
              disabled={isTestingSamples}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingSamples ? "animate-spin" : ""}`} />
              <span>{isTestingSamples ? "Running Tests..." : "Re-run Batch Validation"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {sampleTestResults.map((sample, idx) => (
              <div key={idx} className="p-5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-semibold">
                    Test Sample #{idx + 1}
                  </span>
                  <h4 className="font-bold text-stone-900 text-sm mt-1">{sample.role}</h4>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 block text-[10px]">EXTRACTED SKILLS</span>
                    <span className="text-lg font-bold text-purple-700">{sample.total_skills}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 block text-[10px]">TOKENS / STOPS</span>
                    <span className="text-sm font-bold text-stone-800">
                      {sample.token_count} / {sample.stopwords_removed}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-stone-700">Category Breakdown:</span>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {Object.entries(sample.category_counts).map(([cat, count]) => (
                      <span key={cat} className="px-2 py-0.5 bg-white border border-stone-200 rounded text-stone-700">
                        {cat}: <strong>{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-stone-200/60">
                  <span className="text-xs font-semibold text-stone-700">Top Extracted Skills:</span>
                  <p className="text-xs text-stone-600 line-clamp-2">
                    {sample.top_skills.join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: Skill Taxonomy Dataset Explorer */}
      {/* ========================================================================= */}
      {activeTab === "taxonomy" && taxonomyData && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-stone-900">Skill Taxonomy & Canonical Dictionary</h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Curated taxonomy containing {taxonomyData.total_canonical_skills} canonical technologies across{" "}
                {taxonomyData.category_names.length} primary domains.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 bg-stone-100 rounded-lg text-stone-700 font-semibold">
              v1.0 Standard Dataset
            </span>
          </div>

          <div className="space-y-6">
            {taxonomyData.category_names.map(categoryName => {
              const skills = taxonomyData.categories[categoryName] || [];
              const style = getCategoryColor(categoryName);
              return (
                <div key={categoryName} className="space-y-3">
                  <div className="flex items-center space-x-2 border-b border-stone-100 pb-2">
                    <span className={`w-3 h-3 rounded-full ${style.dot}`} />
                    <h4 className="font-bold text-stone-900 text-sm">{categoryName}</h4>
                    <span className="text-xs font-mono text-stone-400">({skills.length} skills)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {skills.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-100/60 transition-colors"
                      >
                        <span className="font-bold text-stone-900 text-xs">{s.name}</span>
                        {s.aliases && s.aliases.length > 0 && (
                          <p className="text-[10px] font-mono text-stone-500 mt-0.5 truncate">
                            Aliases: {s.aliases.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
