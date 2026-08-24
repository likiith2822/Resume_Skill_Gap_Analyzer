import React, { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Award,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BookOpen,
  Clock,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
  Layers,
  History,
  Trash2,
  RefreshCw,
  FileText,
  Check,
  Compass,
  Code
} from "lucide-react";
import { QuizAttempt, QuizQuestion, QuizDifficulty, QuizAnswerRecord, ParsedResumeData } from "../types";

interface AdaptiveKnowledgeQuizViewProps {
  parsedResume?: ParsedResumeData | null;
  onNavigateToRoadmap?: () => void;
  onNavigateToInterview?: () => void;
}

const DEFAULT_ROLES = [
  "Senior Python Developer",
  "Full Stack Engineer (React & Node)",
  "Data Scientist / ML Engineer",
  "AI Engineer (LLMs & RAG)",
  "Cloud & DevOps Engineer",
  "Backend Go / Distributed Systems",
  "Frontend Engineer (React / TypeScript)"
];

const ROLE_SKILLS_MAP: Record<string, { missing: string[]; priority: string[] }> = {
  "Senior Python Developer": {
    missing: ["Asyncio", "CPython Memory & GIL", "Metaclasses", "TypeVar Generics"],
    priority: ["Python", "Algorithms", "Concurrency", "Design Patterns"]
  },
  "Full Stack Engineer (React & Node)": {
    missing: ["React 18 Concurrent Features", "useSyncExternalStore", "Database Indexing", "WebSockets"],
    priority: ["React", "TypeScript", "Node.js", "SQL", "REST APIs"]
  },
  "Data Scientist / ML Engineer": {
    missing: ["PyTorch Autograd", "Transformer Attention", "Feature Drift", "Scikit-Learn Pipelines"],
    priority: ["Python", "Pandas", "Scikit-Learn", "Machine Learning", "SQL"]
  },
  "AI Engineer (LLMs & RAG)": {
    missing: ["Vector Embeddings", "RAG Chunking Strategies", "Prompt Optimization", "Cosine Similarity"],
    priority: ["Python", "LangChain", "Vector Databases", "REST APIs", "PyTorch"]
  },
  "Cloud & DevOps Engineer": {
    missing: ["Kubernetes Ingress Controllers", "Terraform State Locking", "Docker Multi-stage Builds", "CI/CD Pipelines"],
    priority: ["Docker", "Kubernetes", "Linux", "AWS", "Git"]
  },
  "Backend Go / Distributed Systems": {
    missing: ["Goroutine Synchronization", "Channel Buffering", "Raft Consensus", "gRPC Protobuf"],
    priority: ["Go", "Distributed Systems", "PostgreSQL", "Redis", "Microservices"]
  },
  "Frontend Engineer (React / TypeScript)": {
    missing: ["TypeScript Conditional Types", "Web Performance (LCP/CLS)", "CSS Subgrid", "React Server Components"],
    priority: ["React", "TypeScript", "Tailwind CSS", "Next.js", "State Management"]
  }
};

export const AdaptiveKnowledgeQuizView: React.FC<AdaptiveKnowledgeQuizViewProps> = ({
  parsedResume,
  onNavigateToRoadmap,
  onNavigateToInterview
}) => {
  // Setup State
  const [selectedRole, setSelectedRole] = useState<string>("Senior Python Developer");
  const [customRoleInput, setCustomRoleInput] = useState<string>("");
  const [missingSkills, setMissingSkills] = useState<string[]>(ROLE_SKILLS_MAP["Senior Python Developer"].missing);
  const [prioritySkills, setPrioritySkills] = useState<string[]>(ROLE_SKILLS_MAP["Senior Python Developer"].priority);
  const [newMissingInput, setNewMissingInput] = useState<string>("");
  const [newPriorityInput, setNewPriorityInput] = useState<string>("");
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [initialDifficulty, setInitialDifficulty] = useState<QuizDifficulty>("medium");

  // Active Quiz State
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Feedback State for current question
  const [lastFeedback, setLastFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
    previousDifficulty: QuizDifficulty;
    nextDifficulty: QuizDifficulty;
  } | null>(null);

  // Completed State
  const [completedQuiz, setCompletedQuiz] = useState<QuizAttempt | null>(null);
  const [activeAccordionIndex, setActiveAccordionIndex] = useState<number | null>(null);

  // History Drawer State
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<QuizAttempt[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Auto-sync skills when role changes
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    if (ROLE_SKILLS_MAP[role]) {
      setMissingSkills([...ROLE_SKILLS_MAP[role].missing]);
      setPrioritySkills([...ROLE_SKILLS_MAP[role].priority]);
    }
  };

  // Populate from uploaded resume if available
  const handleLoadFromResume = () => {
    if (!parsedResume) return;
    const resumeSkills = parsedResume.skills?.all_skills || [];
    if (resumeSkills.length > 0) {
      // Set priority skills to candidate's top known skills
      setPrioritySkills(resumeSkills.slice(0, 6));
      // For missing skills, suggest complementary high-impact skills
      const complementary = ["System Design", "Unit Testing", "Docker", "Database Indexing", "Cloud Architecture"];
      const missing = complementary.filter(s => !resumeSkills.some(rs => rs.toLowerCase().includes(s.toLowerCase())));
      setMissingSkills(missing.slice(0, 4));
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/quiz/history?limit=15");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setHistoryList(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch quiz history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Start Quiz
  const handleStartQuiz = async () => {
    setIsStarting(true);
    setErrorMessage(null);
    setLastFeedback(null);
    setSelectedOption("");
    setCompletedQuiz(null);

    const activeRole = selectedRole === "custom" ? customRoleInput.trim() || "Software Engineer" : selectedRole;

    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_role: activeRole,
          missing_skills: missingSkills,
          priority_skills: prioritySkills,
          total_questions: totalQuestions,
          initial_difficulty: initialDifficulty
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to start quiz.");
      }

      setSessionId(json.data.session_id);
      setCurrentQuestion(json.data.question);
      setQuestionNumber(1);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred starting the quiz.");
    } finally {
      setIsStarting(false);
    }
  };

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion || !selectedOption || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const prevDiff = currentQuestion.difficulty;

    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: currentQuestion.id,
          selected_option: selectedOption,
          time_taken_seconds: 15
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to submit answer.");
      }

      const d = json.data;
      setLastFeedback({
        isCorrect: d.is_correct,
        correctAnswer: d.correct_answer,
        explanation: d.explanation,
        previousDifficulty: prevDiff,
        nextDifficulty: d.next_difficulty || prevDiff
      });

      if (d.is_completed) {
        // Quiz completed
        setCompletedQuiz(d.final_results);
        fetchHistory();
      } else if (d.next_question) {
        // Prepare next question
        // Hold on current screen so user can view feedback, user clicks 'Next Question'
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit answer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Proceed to next question after reviewing feedback
  const handleProceedNextQuestion = async () => {
    if (!sessionId) return;
    setLastFeedback(null);
    setSelectedOption("");

    // Fetch up-to-date quiz session to load next question
    try {
      const res = await fetch(`/api/quiz/${sessionId}`);
      const json = await res.json();
      if (json.success && json.data) {
        const qz: QuizAttempt = json.data;
        const qIndex = qz.current_question_index;
        if (qz.status === "completed") {
          setCompletedQuiz(qz);
        } else if (qz.questions_data && qz.questions_data[qIndex]) {
          const nextQ = qz.questions_data[qIndex];
          setCurrentQuestion({
            id: nextQ.id,
            skill: nextQ.skill,
            difficulty: nextQ.difficulty,
            question: nextQ.question,
            options: nextQ.options,
            concept_tested: nextQ.concept_tested
          });
          setQuestionNumber(qIndex + 1);
        }
      }
    } catch (err: any) {
      setErrorMessage("Could not load next question.");
    }
  };

  // Delete Attempt
  const handleDeleteAttempt = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/quiz/${id}`, { method: "DELETE" });
      setHistoryList(prev => prev.filter(h => h.id !== id));
      if (completedQuiz && completedQuiz.id === id) {
        setCompletedQuiz(null);
      }
    } catch (err) {
      console.error("Failed to delete quiz:", err);
    }
  };

  // Reset to Start Screen
  const handleResetQuiz = () => {
    setSessionId(null);
    setCurrentQuestion(null);
    setCompletedQuiz(null);
    setLastFeedback(null);
    setSelectedOption("");
    setQuestionNumber(1);
    setErrorMessage(null);
  };

  const getDifficultyBadge = (difficulty: QuizDifficulty) => {
    switch (difficulty) {
      case "easy":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Easy
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            Medium
          </span>
        );
      case "hard":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            Hard
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/60 pb-16 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Feature Banner */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                  <Brain className="w-3.5 h-3.5 text-amber-700" />
                  Part 11: Adaptive Knowledge Quiz
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Google Gemini API
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  Real-time Difficulty Adaptation
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                Adaptive Skill Evaluation & Knowledge Quiz
              </h1>
              <p className="text-stone-600 text-sm sm:text-base max-w-3xl leading-relaxed">
                Generate dynamically tailored technical questions focusing on your identified <strong>missing skills</strong>, 
                priority competencies, and target job role. Experience genuine <strong>adaptive difficulty</strong> that climbs when you answer correctly 
                and reinforces fundamentals when you need assistance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-quiz-history"
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory) fetchHistory();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm transition-colors shadow-2xs"
              >
                <History className="w-4 h-4 text-stone-500" />
                <span>Past Attempts ({historyList.length})</span>
              </button>

              {(sessionId || completedQuiz) && (
                <button
                  id="btn-new-quiz"
                  onClick={handleResetQuiz}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm transition-colors shadow-2xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>New Quiz</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* History Drawer Modal / Section */}
        {showHistory && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-stone-900 text-base">Previous Quiz History (SQLite)</h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-medium"
              >
                Close
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-8 text-center text-stone-500 flex items-center justify-center gap-2 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                Loading past quiz attempts...
              </div>
            ) : historyList.length === 0 ? (
              <p className="text-sm text-stone-500 py-4 text-center">
                No past quiz attempts found in SQLite. Start your first quiz below!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {historyList.map(h => (
                  <div
                    key={h.id}
                    onClick={() => {
                      setCompletedQuiz(h);
                      setSessionId(h.id);
                      setShowHistory(false);
                    }}
                    className="p-4 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50/50 hover:bg-amber-50/30 transition-all cursor-pointer space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm truncate max-w-[170px]">
                        {h.job_role}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        h.score_percentage >= 80 ? "bg-emerald-100 text-emerald-800" :
                        h.score_percentage >= 50 ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {h.score} / {h.total_questions} ({h.score_percentage}%)
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 flex items-center justify-between">
                      <span>{new Date(h.created_at).toLocaleDateString()}</span>
                      <span className="capitalize text-stone-600 font-medium">
                        Difficulty: {h.current_difficulty}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-amber-700 font-semibold group-hover:underline">
                        View Full Report &rarr;
                      </span>
                      <button
                        onClick={(e) => handleDeleteAttempt(h.id, e)}
                        className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Error: </span>
              {errorMessage}
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-bold">
              &times;
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: QUIZ SETUP CONFIGURATION (Shown when no active quiz in progress)   */}
        {/* ========================================================================= */}
        {!sessionId && !completedQuiz && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Configuration Form */}
            <div className="lg:col-span-2 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Configure Your Adaptive Quiz</h2>
                  <p className="text-xs text-stone-500">
                    Questions will be dynamically synthesized using Gemini based on these skills and parameters.
                  </p>
                </div>
                {parsedResume && (
                  <button
                    id="btn-sync-resume-skills"
                    onClick={handleLoadFromResume}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Auto-Fill from Resume
                  </button>
                )}
              </div>

              {/* Job Role Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Target Job Role
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEFAULT_ROLES.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                        selectedRole === role
                          ? "bg-amber-500 text-stone-950 border-amber-600 shadow-2xs font-bold"
                          : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedRole("custom")}
                    className={`px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      selectedRole === "custom"
                        ? "bg-amber-500 text-stone-950 border-amber-600 shadow-2xs font-bold"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    + Custom Job Role...
                  </button>
                </div>

                {selectedRole === "custom" && (
                  <div className="pt-2">
                    <input
                      type="text"
                      placeholder="e.g. Distributed Database Architect, Embedded Rust Engineer"
                      value={customRoleInput}
                      onChange={e => setCustomRoleInput(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Missing Skills (Primary Generation Driver) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Missing Skills to Target (Priority Focus)
                  </label>
                  <span className="text-[11px] text-stone-500">
                    {missingSkills.length} skill(s) targeted
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-rose-50/50 border border-rose-200/80 rounded-xl min-h-[50px] items-center">
                  {missingSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => setMissingSkills(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-800 font-bold ml-1"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {missingSkills.length === 0 && (
                    <span className="text-xs text-rose-400 italic">No missing skills added. Add below.</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add specific missing skill (e.g. Docker, PyTorch, Concurrency)..."
                    value={newMissingInput}
                    onChange={e => setNewMissingInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newMissingInput.trim()) {
                        e.preventDefault();
                        if (!missingSkills.includes(newMissingInput.trim())) {
                          setMissingSkills([...missingSkills, newMissingInput.trim()]);
                        }
                        setNewMissingInput("");
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newMissingInput.trim() && !missingSkills.includes(newMissingInput.trim())) {
                        setMissingSkills([...missingSkills, newMissingInput.trim()]);
                        setNewMissingInput("");
                      }
                    }}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Priority Skills Context */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Priority Competencies (Core Foundation)
                  </label>
                  <span className="text-[11px] text-stone-500">
                    {prioritySkills.length} skill(s)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl min-h-[50px] items-center">
                  {prioritySkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => setPrioritySkills(prev => prev.filter((_, i) => i !== idx))}
                        className="text-emerald-600 hover:text-emerald-900 font-bold ml-1"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {prioritySkills.length === 0 && (
                    <span className="text-xs text-emerald-500 italic">No priority skills configured.</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add priority competency (e.g. Python, SQL, REST APIs)..."
                    value={newPriorityInput}
                    onChange={e => setNewPriorityInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newPriorityInput.trim()) {
                        e.preventDefault();
                        if (!prioritySkills.includes(newPriorityInput.trim())) {
                          setPrioritySkills([...prioritySkills, newPriorityInput.trim()]);
                        }
                        setNewPriorityInput("");
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPriorityInput.trim() && !prioritySkills.includes(newPriorityInput.trim())) {
                        setPrioritySkills([...prioritySkills, newPriorityInput.trim()]);
                        setNewPriorityInput("");
                      }
                    }}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Number of Questions & Initial Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Quiz Length
                  </label>
                  <div className="flex gap-2">
                    {[3, 5, 7, 10].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setTotalQuestions(cnt)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                          totalQuestions === cnt
                            ? "bg-amber-500 text-stone-950 border-amber-600 shadow-2xs"
                            : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                        }`}
                      >
                        {cnt} Qs
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Initial Difficulty
                  </label>
                  <div className="flex gap-2">
                    {(["easy", "medium", "hard"] as QuizDifficulty[]).map(diff => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setInitialDifficulty(diff)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-colors ${
                          initialDifficulty === diff
                            ? "bg-stone-900 text-white border-stone-900 shadow-2xs"
                            : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Launch Button */}
              <div className="pt-4 border-t border-stone-100">
                <button
                  id="btn-launch-quiz"
                  type="button"
                  disabled={isStarting}
                  onClick={handleStartQuiz}
                  className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm transition-all disabled:opacity-50"
                >
                  {isStarting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Synthesizing Adaptive Question #1 with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Start Adaptive Knowledge Quiz ({totalQuestions} Questions)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Architectural & Behavior Explainer Card */}
            <div className="space-y-6">
              <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 text-stone-900 font-bold text-base">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>How the Adaptive Quiz Works</span>
                </div>

                <div className="space-y-3 text-xs text-stone-600 leading-relaxed">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      1. Dynamic Difficulty Escalation
                    </div>
                    <p>
                      When you answer correctly, Gemini escalates the difficulty (Easy &rarr; Medium &rarr; Hard), introducing deep architectural mechanics and edge cases.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      2. Reinforcement Back-off
                    </div>
                    <p>
                      When you miss a question, the engine eases difficulty to reinforce core foundational principles before re-testing higher levels.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      3. Synthesis & Study Plan
                    </div>
                    <p>
                      Upon finishing, Gemini synthesizes your exact <strong>Weak Areas</strong>, <strong>Strong Areas</strong>, and a prioritized list of <strong>Recommended Study Topics</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
                  <span>Persistence: SQLite Database</span>
                  <span>Model: gemini-3.7-flash</span>
                </div>
              </div>

              {/* Quick Jump Links */}
              <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Related Modules
                </span>
                <div className="space-y-1.5">
                  {onNavigateToRoadmap && (
                    <button
                      onClick={onNavigateToRoadmap}
                      className="w-full text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-800 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        Part 6: Skill Gap & Roadmap
                      </span>
                      <span>&rarr;</span>
                    </button>
                  )}
                  {onNavigateToInterview && (
                    <button
                      onClick={onNavigateToInterview}
                      className="w-full text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-800 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Code className="w-3.5 h-3.5 text-blue-600" />
                        Part 9: AI Mock Interview
                      </span>
                      <span>&rarr;</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: ACTIVE QUIZ IN PROGRESS (Taking Question)                         */}
        {/* ========================================================================= */}
        {sessionId && currentQuestion && !completedQuiz && (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Active Quiz Header / Status Tracker */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-stone-900 text-white font-bold text-xs">
                    Question {questionNumber} of {totalQuestions}
                  </span>
                  <span className="text-xs font-bold text-stone-800">
                    Role: {selectedRole === "custom" ? customRoleInput : selectedRole}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-medium">Difficulty:</span>
                  {getDifficultyBadge(currentQuestion.difficulty)}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-600" />
                  Testing Skill: <strong className="text-stone-800">{currentQuestion.skill}</strong>
                </span>
                {currentQuestion.concept_tested && (
                  <span className="text-stone-600 font-medium">
                    Concept: <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-800">{currentQuestion.concept_tested}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-bold tracking-wider text-amber-700 uppercase">
                  Multiple Choice Question
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-snug">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Options Grid */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const letter = String.fromCharCode(65 + idx); // A, B, C, D
                  const isSelected = selectedOption === option;
                  const isAnswered = lastFeedback !== null;
                  const isCorrectAnswer = isAnswered && option.trim() === lastFeedback.correctAnswer.trim();
                  const isUserWrongAnswer = isAnswered && isSelected && !lastFeedback.isCorrect;

                  let cardStyle = "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800";
                  if (isSelected && !isAnswered) {
                    cardStyle = "bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-400 font-semibold";
                  } else if (isCorrectAnswer) {
                    cardStyle = "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400 font-bold";
                  } else if (isUserWrongAnswer) {
                    cardStyle = "bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-400 font-semibold line-through";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered || isSubmitting}
                      onClick={() => setSelectedOption(option)}
                      className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex items-start gap-3.5 ${cardStyle} disabled:cursor-default`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isSelected && !isAnswered ? "bg-amber-500 text-stone-950" :
                        isCorrectAnswer ? "bg-emerald-600 text-white" :
                        isUserWrongAnswer ? "bg-rose-600 text-white" :
                        "bg-stone-200 text-stone-700"
                      }`}>
                        {letter}
                      </div>
                      <div className="flex-1 leading-relaxed">
                        {option}
                      </div>
                      {isCorrectAnswer && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      {isUserWrongAnswer && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Immediate Feedback Banner after Answer Submission */}
              {lastFeedback && (
                <div className={`p-5 rounded-2xl border space-y-3 animate-in fade-in duration-200 ${
                  lastFeedback.isCorrect
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : "bg-rose-50/80 border-rose-300 text-rose-950"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-base">
                      {lastFeedback.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>Correct Answer!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-600" />
                          <span>Incorrect.</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {lastFeedback.isCorrect ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-200/80 text-emerald-900">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Difficulty escalating: {lastFeedback.previousDifficulty} &rarr; {lastFeedback.nextDifficulty}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-200/80 text-rose-900">
                          <TrendingDown className="w-3.5 h-3.5" />
                          Difficulty easing: {lastFeedback.previousDifficulty} &rarr; {lastFeedback.nextDifficulty}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm leading-relaxed border-t border-stone-200/50 pt-2">
                    <strong className="block mb-1 font-semibold">Explanation:</strong>
                    {lastFeedback.explanation}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleResetQuiz}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-semibold transition-colors"
                >
                  Quit Quiz
                </button>

                {!lastFeedback ? (
                  <button
                    id="btn-submit-answer"
                    type="button"
                    disabled={!selectedOption || isSubmitting}
                    onClick={handleSubmitAnswer}
                    className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Evaluating & Adapting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Answer</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    id="btn-next-question"
                    type="button"
                    onClick={handleProceedNextQuestion}
                    className="py-3 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
                  >
                    <span>{questionNumber >= totalQuestions ? "View Final Results & Analysis" : "Proceed to Next Question"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: COMPREHENSIVE QUIZ RESULTS DASHBOARD (Weak, Strong, Topics)       */}
        {/* ========================================================================= */}
        {completedQuiz && (
          <div className="space-y-6">
            
            {/* Top Score Summary Banner */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      Quiz Completed
                    </span>
                    <span className="text-xs text-stone-500">
                      Session #{completedQuiz.id} • {new Date(completedQuiz.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-stone-900">
                    Performance Evaluation: {completedQuiz.job_role}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
                    {completedQuiz.summary_notes || "Performance assessment synthesized with Gemini based on your answers across adaptive difficulty tiers."}
                  </p>
                </div>

                {/* Score Dial */}
                <div className="flex items-center gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-extrabold text-stone-900">
                      {completedQuiz.score} <span className="text-lg text-stone-400 font-normal">/ {completedQuiz.total_questions}</span>
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${
                      completedQuiz.score_percentage >= 80 ? "text-emerald-600" :
                      completedQuiz.score_percentage >= 50 ? "text-amber-600" :
                      "text-rose-600"
                    }`}>
                      {completedQuiz.score_percentage}% Accuracy
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid of Weak Areas & Strong Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Weak Areas Panel */}
              <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <h3 className="font-bold text-stone-900 text-base">Identified Weak Areas</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {completedQuiz.weak_areas?.length || 0} Areas
                  </span>
                </div>

                {(!completedQuiz.weak_areas || completedQuiz.weak_areas.length === 0) ? (
                  <div className="py-8 text-center text-stone-500 text-xs sm:text-sm">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    No significant weak areas detected! Excellent work on this assessment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedQuiz.weak_areas.map((weak, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-950 text-sm">{weak.skill}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                            Missed {weak.missed_count} Q(s)
                          </span>
                        </div>
                        <p className="text-xs text-rose-900/80 leading-relaxed">
                          {weak.reason}
                        </p>
                        <div className="text-xs font-medium text-rose-950 bg-white/70 p-2.5 rounded-lg border border-rose-200/60">
                          <strong className="text-rose-900">Action Plan: </strong>
                          {weak.recommended_action}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strong Areas Panel */}
              <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-stone-900 text-base">Demonstrated Strong Areas</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {completedQuiz.strong_areas?.length || 0} Areas
                  </span>
                </div>

                {(!completedQuiz.strong_areas || completedQuiz.strong_areas.length === 0) ? (
                  <div className="py-8 text-center text-stone-500 text-xs sm:text-sm">
                    Keep practicing to establish solid proficiencies across targeted skills.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedQuiz.strong_areas.map((strong, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-950 text-sm">{strong.skill}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                            {strong.mastery_level || "Proficient"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-emerald-900">
                          <span>Correctly answered: <strong>{strong.correct_count} Q(s)</strong></span>
                          {strong.highest_difficulty_cleared && (
                            <span>Highest cleared: <strong>{strong.highest_difficulty_cleared}</strong></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Recommended Topics & Study Plan */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-stone-900 text-lg">Recommended Learning Topics & Practice Plan</h3>
                  </div>
                  <p className="text-xs text-stone-500">
                    Prioritized learning modules generated to close skill gaps identified during this adaptive quiz.
                  </p>
                </div>
              </div>

              {(!completedQuiz.recommended_topics || completedQuiz.recommended_topics.length === 0) ? (
                <p className="text-xs text-stone-500 italic py-4">No specific study topics suggested.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedQuiz.recommended_topics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-stone-900 text-sm leading-snug">
                          {topic.topic}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          topic.importance === "High" ? "bg-rose-100 text-rose-800" :
                          topic.importance === "Medium" ? "bg-amber-100 text-amber-800" :
                          "bg-stone-200 text-stone-800"
                        }`}>
                          {topic.importance} Priority
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed">
                        {topic.description}
                      </p>

                      <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-stone-500 font-medium">
                          <span>Target Skill: <strong className="text-stone-800">{topic.skill}</strong></span>
                          <span className="flex items-center gap-1 text-amber-700 font-bold">
                            <Clock className="w-3 h-3" />
                            {topic.estimated_study_time || "2-3 hrs"}
                          </span>
                        </div>
                        {topic.recommended_practice && (
                          <p className="text-stone-700 text-[11px] pt-1 border-t border-stone-100">
                            <strong>Practice: </strong>{topic.recommended_practice}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detailed Question Review Accordion */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-stone-700" />
                  <h3 className="font-bold text-stone-900 text-base">Full Question & Answer Review</h3>
                </div>
                <span className="text-xs text-stone-500">
                  {completedQuiz.answers_data?.length || 0} Questions Evaluated
                </span>
              </div>

              <div className="space-y-3">
                {completedQuiz.answers_data?.map((ans: QuizAnswerRecord, idx: number) => {
                  const isOpen = activeAccordionIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-stone-200 rounded-xl overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveAccordionIndex(isOpen ? null : idx)}
                        className={`w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition-colors ${
                          ans.is_correct ? "bg-emerald-50/40 hover:bg-emerald-50" : "bg-rose-50/40 hover:bg-rose-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 truncate">
                          {ans.is_correct ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span className="text-stone-500 font-mono">Q{idx + 1}.</span>
                          <span className="truncate text-stone-900 font-bold">{ans.question}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-stone-500 font-medium capitalize hidden sm:inline">
                            {ans.skill} • {ans.difficulty}
                          </span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="p-4 bg-white border-t border-stone-100 space-y-3 text-xs">
                          <div className="space-y-2">
                            <strong className="block text-stone-700">Options:</strong>
                            <div className="space-y-1.5 pl-2">
                              {ans.options?.map((opt, oIdx) => {
                                const isUserChoice = opt.trim() === ans.user_answer?.trim();
                                const isCorrectChoice = opt.trim() === ans.correct_answer?.trim();
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                                      isCorrectChoice
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                                        : isUserChoice && !ans.is_correct
                                        ? "bg-rose-50 border-rose-300 text-rose-950 line-through"
                                        : "bg-stone-50 border-stone-200 text-stone-700"
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {isCorrectChoice && <span className="text-emerald-700 font-bold text-[10px]">CORRECT</span>}
                                    {isUserChoice && !ans.is_correct && <span className="text-rose-700 font-bold text-[10px]">YOUR ANSWER</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 leading-relaxed text-stone-700">
                            <strong className="text-stone-900">Explanation: </strong>
                            {ans.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
              <button
                type="button"
                onClick={handleResetQuiz}
                className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Take Another Adaptive Quiz</span>
              </button>

              <div className="flex items-center gap-3">
                {onNavigateToRoadmap && (
                  <button
                    type="button"
                    onClick={onNavigateToRoadmap}
                    className="py-2.5 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors"
                  >
                    View Personalized Learning Roadmap &rarr;
                  </button>
                )}
                {onNavigateToInterview && (
                  <button
                    type="button"
                    onClick={onNavigateToInterview}
                    className="py-2.5 px-4 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold transition-colors"
                  >
                    Practice in AI Mock Interview &rarr;
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
