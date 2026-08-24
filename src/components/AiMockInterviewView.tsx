import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  Send,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  ArrowRight,
  Check,
  Copy,
  History,
  FileText,
  User,
  Sliders,
  TrendingUp,
  Brain,
  MessageSquare,
  HelpCircle,
  Compass,
  Zap,
  Target
} from "lucide-react";
import {
  JobRole,
  ResumeListItem,
  MockInterviewQuestion,
  MockInterviewAnswerFeedback,
  MockInterviewEvaluation,
  MockInterviewListItem,
  MockInterviewDetail,
  InterviewCategory
} from "../types";

interface AiMockInterviewViewProps {
  onNavigateToUpload?: () => void;
  onNavigateToRoadmap?: () => void;
}

export const AiMockInterviewView: React.FC<AiMockInterviewViewProps> = ({
  onNavigateToUpload,
  onNavigateToRoadmap
}) => {
  // Main view state
  const [activeTab, setActiveTab] = useState<"session" | "history">("session");
  const [sessionStage, setSessionStage] = useState<"setup" | "interviewing" | "evaluated">("setup");

  // Selection & Config state
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [customJobTitle, setCustomJobTitle] = useState<string>("Software Engineer");
  const [candidateName, setCandidateName] = useState<string>("Candidate");
  const [experienceLevel, setExperienceLevel] = useState<string>("Mid-Level");
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Active Interview state
  const [currentInterviewId, setCurrentInterviewId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<MockInterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answersMap, setAnswersMap] = useState<Record<number, MockInterviewAnswerFeedback>>({});
  const [currentAnswerText, setCurrentAnswerText] = useState<string>("");
  const [answerMode, setAnswerMode] = useState<"text" | "voice">("text");

  // Evaluation results
  const [fullEvaluation, setFullEvaluation] = useState<MockInterviewEvaluation | null>(null);

  // History state
  const [historyList, setHistoryList] = useState<MockInterviewListItem[]>([]);
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<MockInterviewDetail | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Loading & Action states
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState<boolean>(false);
  const [isEvaluatingFull, setIsEvaluatingFull] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voice & Speech Synthesis states (Web Speech API)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micSupported, setMicSupported] = useState<boolean>(true);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Load initial data: resumes, target jobs, and history
  useEffect(() => {
    fetchInitialData();
    checkSpeechRecognitionSupport();

    return () => {
      // Clean up speech synthesis and recognition on unmount
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const checkSpeechRecognitionSupport = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicSupported(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      // Load resumes
      const resRes = await fetch("/api/resume/list");
      if (resRes.ok) {
        const data = await resRes.json();
        if (data.data && Array.isArray(data.data.resumes)) {
          setResumes(data.data.resumes);
          if (data.data.resumes.length > 0) {
            setSelectedResumeId(data.data.resumes[0].id);
            if (data.data.resumes[0].candidate_name) {
              setCandidateName(data.data.resumes[0].candidate_name);
            }
          }
        }
      }

      // Load target jobs
      const jobRes = await fetch("/api/jobs/list");
      if (jobRes.ok) {
        const jData = await jobRes.json();
        if (jData.data && Array.isArray(jData.data.jobs)) {
          setJobs(jData.data.jobs);
          if (jData.data.jobs.length > 0) {
            setSelectedJobId(jData.data.jobs[0].id);
            setCustomJobTitle(jData.data.jobs[0].job_title);
          }
        }
      }

      // Load interview history
      fetchHistory();
    } catch (err) {
      console.warn("Could not fetch initial data for mock interview:", err);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/interview/history?limit=20");
      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data.interviews)) {
          setHistoryList(data.data.interviews);
        }
      }
    } catch (err) {
      console.warn("Failed to load interview history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Text-To-Speech (TTS) handler
  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setErrorMessage("Speech synthesis is not supported in this browser environment.");
      return;
    }

    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Speech-To-Text (STT) handler with Web Speech API and text fallback
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicSupported(false);
      setMicError("Microphone speech recognition is not supported in this browser. Please type your answer.");
      return;
    }

    setMicError(null);

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setAnswerMode("voice");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentAnswerText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setMicError("Microphone access was denied. You can continue by typing in the answer box.");
        } else if (event.error === "no-speech") {
          // benign
        } else {
          setMicError(`Microphone notice: ${event.error}. You can also type your answer.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.warn("Could not start speech recognition:", err);
      setIsListening(false);
      setMicError("Could not activate microphone. Please type your answer.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // Start new interview session
  const handleStartInterview = async () => {
    setErrorMessage(null);
    setIsStarting(true);
    stopSpeaking();
    stopListening();

    try {
      const payload: any = {
        experience_level: experienceLevel,
        question_count: questionCount
      };

      if (selectedResumeId) {
        payload.resume_id = selectedResumeId;
      } else {
        payload.candidate_name = candidateName;
      }

      if (selectedJobId) {
        payload.job_id = selectedJobId;
      } else {
        payload.job_title = customJobTitle;
      }

      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to initialize interview.");
      }

      const session = data.data;
      setCurrentInterviewId(session.interview_id);
      setQuestions(session.questions || []);
      setCurrentQuestionIndex(0);
      setAnswersMap({});
      setCurrentAnswerText("");
      setFullEvaluation(null);
      setSessionStage("interviewing");

      // Auto read first question if audio enabled
      if (session.questions && session.questions.length > 0) {
        setTimeout(() => {
          speakText(session.questions[0].question);
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate interview questions.");
    } finally {
      setIsStarting(false);
    }
  };

  // Submit and evaluate answer for current question
  const handleSubmitAnswer = async () => {
    if (!currentInterviewId || !questions[currentQuestionIndex]) return;

    const currentQ = questions[currentQuestionIndex];
    if (!currentAnswerText.trim()) {
      setErrorMessage("Please enter or speak your answer before submitting.");
      return;
    }

    setErrorMessage(null);
    setIsSubmittingAnswer(true);
    stopListening();
    stopSpeaking();

    try {
      const payload = {
        interview_id: currentInterviewId,
        question_id: currentQ.id,
        question_text: currentQ.question,
        category: currentQ.category,
        target_skill: currentQ.target_skill,
        user_answer: currentAnswerText.trim(),
        input_type: answerMode,
        expected_key_points: currentQ.expected_key_points,
        job_title: customJobTitle
      };

      const res = await fetch("/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to record answer evaluation.");
      }

      const feedbackData: MockInterviewAnswerFeedback = {
        question_id: currentQ.id,
        question_text: currentQ.question,
        category: currentQ.category,
        target_skill: currentQ.target_skill,
        user_answer: currentAnswerText.trim(),
        input_type: answerMode,
        score: data.data.score,
        feedback: data.data.feedback,
        strengths: data.data.strengths || [],
        areas_for_improvement: data.data.areas_for_improvement || [],
        sample_improved_answer: data.data.sample_improved_answer || ""
      };

      setAnswersMap((prev) => ({
        ...prev,
        [currentQ.id]: feedbackData
      }));
    } catch (err: any) {
      setErrorMessage(err.message || "Error submitting answer.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Advance to next question
  const handleNextQuestion = () => {
    stopSpeaking();
    stopListening();
    setErrorMessage(null);

    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      const nextQ = questions[nextIdx];
      const existingAnswer = answersMap[nextQ.id];
      setCurrentAnswerText(existingAnswer ? existingAnswer.user_answer : "");
      
      setTimeout(() => {
        speakText(nextQ.question);
      }, 300);
    }
  };

  // Go to previous question
  const handlePrevQuestion = () => {
    stopSpeaking();
    stopListening();
    setErrorMessage(null);

    if (currentQuestionIndex > 0) {
      const prevIdx = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIdx);
      const prevQ = questions[prevIdx];
      const existingAnswer = answersMap[prevQ.id];
      setCurrentAnswerText(existingAnswer ? existingAnswer.user_answer : "");
    }
  };

  // Conclude interview and compute final evaluation
  const handleFinishInterview = async () => {
    if (!currentInterviewId) return;

    setErrorMessage(null);
    setIsEvaluatingFull(true);
    stopSpeaking();
    stopListening();

    try {
      const res = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_id: currentInterviewId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to compute overall interview evaluation.");
      }

      setFullEvaluation(data.data);
      setSessionStage("evaluated");
      fetchHistory();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete evaluation.");
    } finally {
      setIsEvaluatingFull(false);
    }
  };

  // View historical interview detail
  const handleViewHistoryItem = async (interviewId: number) => {
    try {
      const res = await fetch(`/api/interview/${interviewId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setSelectedHistoryDetail(data.data);
        }
      }
    } catch (err) {
      console.warn("Failed to load interview item:", err);
    }
  };

  // Helper formatting & copy
  const handleCopyReport = () => {
    if (!fullEvaluation) return;
    const text = `AI MOCK INTERVIEW EVALUATION REPORT
Job Role: ${customJobTitle}
Overall Score: ${fullEvaluation.overall_score}/100
Readiness Verdict: ${fullEvaluation.readiness_verdict}

CATEGORY BREAKDOWN:
- Technical Competency: ${fullEvaluation.technical_score}/100
- Behavioral & Leadership: ${fullEvaluation.behavioral_score}/100
- HR & Culture Alignment: ${fullEvaluation.hr_score}/100

KEY STRENGTHS:
${fullEvaluation.strengths.map((s) => `• ${s}`).join("\n")}

AREAS FOR IMPROVEMENT:
${fullEvaluation.weaknesses.map((w) => `• ${w}`).join("\n")}

HIRING COMMITTEE FEEDBACK:
${fullEvaluation.feedback}

ACTIONABLE NEXT STEPS:
${fullEvaluation.suggested_improvements.map((i) => `• ${i}`).join("\n")}
`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Category badge colors
  const getCategoryBadge = (cat: InterviewCategory) => {
    switch (cat) {
      case "technical":
        return {
          label: "Technical",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: <Brain className="w-3.5 h-3.5 mr-1" />
        };
      case "behavioral":
        return {
          label: "Behavioral (STAR)",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <Compass className="w-3.5 h-3.5 mr-1" />
        };
      case "hr":
        return {
          label: "HR & Culture",
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          icon: <User className="w-3.5 h-3.5 mr-1" />
        };
      default:
        return {
          label: "General",
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          icon: <MessageSquare className="w-3.5 h-3.5 mr-1" />
        };
    }
  };

  const currentQ = questions[currentQuestionIndex];
  const currentAnswerFeedback = currentQ ? answersMap[currentQ.id] : null;
  const answeredCount = Object.keys(answersMap).length;
  const isAllAnswered = questions.length > 0 && answeredCount === questions.length;

  return (
    <div id="ai-mock-interview-view" className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                AI Mock Interview
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Practice Technical, Behavioral, and HR interviews powered by Google Gemini API & real-time voice synthesis
              </p>
            </div>
          </div>
        </div>

        {/* View switcher tabs */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-session-btn"
            onClick={() => setActiveTab("session")}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "session"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Interactive Interview</span>
          </button>
          <button
            id="tab-history-btn"
            onClick={() => {
              setActiveTab("history");
              fetchHistory();
            }}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "history"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Session History</span>
            {historyList.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                {historyList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 text-sm font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: INTERACTIVE MOCK INTERVIEW SESSION                                */}
      {/* ========================================================================= */}
      {activeTab === "session" && (
        <>
          {/* STAGE 1: SETUP & CONFIGURATION */}
          {sessionStage === "setup" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Parameter Selection Form */}
              <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Configure Interview Parameters</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Select your resume profile and target role to generate realistic, grounded interview questions.
                  </p>
                </div>

                {/* Resume Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Candidate Profile / Resume
                  </label>
                  {resumes.length > 0 ? (
                    <select
                      id="select-resume"
                      value={selectedResumeId || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedResumeId(id);
                        const sel = resumes.find((r) => r.id === id);
                        if (sel && sel.candidate_name) {
                          setCandidateName(sel.candidate_name);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.candidate_name || r.original_filename} (Skills: {r.skills_count})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                      <div className="text-sm text-amber-800">
                        No uploaded resume found. You can enter your name and skills manually, or upload a resume for full context.
                      </div>
                      {onNavigateToUpload && (
                        <button
                          onClick={onNavigateToUpload}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg"
                        >
                          Upload Resume
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Candidate Name Input (if no resume or custom) */}
                {resumes.length === 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Candidate Name</label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                )}

                {/* Job Role Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Target Job Role
                  </label>
                  {jobs.length > 0 ? (
                    <select
                      id="select-job"
                      value={selectedJobId || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedJobId(id);
                        const sel = jobs.find((j) => j.id === id);
                        if (sel) {
                          setCustomJobTitle(sel.job_title);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.job_title} ({j.department || "Engineering"})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customJobTitle}
                      onChange={(e) => setCustomJobTitle(e.target.value)}
                      placeholder="e.g. Senior Frontend Engineer"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  )}
                </div>

                {/* Experience Level & Question Count */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Experience Level</label>
                    <select
                      id="select-experience"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                      <option value="Entry-Level">Entry-Level (0-2 years)</option>
                      <option value="Mid-Level">Mid-Level (3-5 years)</option>
                      <option value="Senior">Senior Engineer (5-8 years)</option>
                      <option value="Staff/Lead">Staff / Principal / Lead (8+ years)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Question Count</label>
                    <select
                      id="select-count"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                      <option value={3}>3 Questions (Quick Practice)</option>
                      <option value={5}>5 Questions (Standard Simulation)</option>
                      <option value={8}>8 Questions (Comprehensive Panel)</option>
                    </select>
                  </div>
                </div>

                {/* Speech Synthesis Settings */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                      <Volume2 className="w-4 h-4 text-blue-600" />
                      <span>Interviewer Voice Speed (TTS)</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                      {speechRate}x
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.25"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    id="start-interview-btn"
                    onClick={handleStartInterview}
                    disabled={isStarting}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {isStarting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Generating Tailored Interview Questions...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-white" />
                        <span>Begin AI Mock Interview</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Interview Highlights & Guide */}
              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center space-x-2.5 text-blue-400 font-semibold text-sm">
                    <Zap className="w-4 h-4" />
                    <span>How AI Interview Works</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Google Gemini synthesizes targeted technical, behavioral, and HR questions based on your actual resume skills and missing requirements for the role.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-start space-x-3 text-xs text-slate-300">
                      <div className="p-1 bg-blue-500/20 text-blue-400 rounded-md mt-0.5">
                        <Brain className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <strong className="text-white">Technical Questions:</strong> Deep dives into hands-on tools, system design, and gap skill verification.
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 text-xs text-slate-300">
                      <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md mt-0.5">
                        <Compass className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <strong className="text-white">Behavioral (STAR):</strong> Evaluates conflict resolution, prioritization under ambiguity, and past impact.
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 text-xs text-slate-300">
                      <div className="p-1 bg-purple-500/20 text-purple-400 rounded-md mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <strong className="text-white">HR & Culture:</strong> Assesses career goals, compensation expectations, and company alignment.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-sm font-semibold text-slate-800">Supported Voice Modes</h3>
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-blue-600" />
                      <span>Audio Speech Synthesis (Listen to questions in real time)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mic className="w-4 h-4 text-emerald-600" />
                      <span>Live Speech Recognition (Speak your answer into microphone)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span>Clean Text Input Fallback (Type answers with word counter)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: ACTIVE INTERVIEW SESSION */}
          {sessionStage === "interviewing" && questions.length > 0 && currentQ && (
            <div className="space-y-6">
              {/* Question Navigation Header & Progress Bar */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    {(() => {
                      const badge = getCategoryBadge(currentQ.category);
                      return (
                        <span className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full border ${badge.bg}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      );
                    })()}
                    <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                      <Target className="w-3 h-3 mr-1 text-slate-500" />
                      Target: {currentQ.target_skill}
                    </span>
                  </div>

                  {/* Progress tracker badges */}
                  <div className="flex items-center space-x-1.5">
                    {questions.map((q, idx) => {
                      const isAnswered = !!answersMap[q.id];
                      const isCurrent = idx === currentQuestionIndex;
                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            stopSpeaking();
                            stopListening();
                            setCurrentQuestionIndex(idx);
                            const ans = answersMap[q.id];
                            setCurrentAnswerText(ans ? ans.user_answer : "");
                          }}
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                            isCurrent
                              ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                              : isAnswered
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {isAnswered ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Main Question & Answer Arena */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left (2 cols): Question Audio & Answer Box */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Question Display Card */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-lg font-semibold text-slate-900 leading-snug">
                        "{currentQ.question}"
                      </p>

                      {/* Text-to-Speech Listen Button */}
                      <button
                        id="tts-play-btn"
                        onClick={() => speakText(currentQ.question)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                          isSpeaking
                            ? "bg-blue-600 text-white animate-pulse"
                            : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        }`}
                      >
                        {isSpeaking ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Hear Question</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Question Context & Rationale */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                      <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Why this question:</span>
                      </div>
                      <p>{currentQ.context_rationale}</p>
                    </div>
                  </div>

                  {/* Candidate Answer Workspace */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-slate-800">Your Answer</h3>
                        {currentAnswerFeedback && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-md">
                            Score: {currentAnswerFeedback.score}/100
                          </span>
                        )}
                      </div>

                      {/* Input Mode Controls: Speech vs Text */}
                      <div className="flex items-center space-x-2">
                        {micSupported ? (
                          <button
                            id="mic-toggle-btn"
                            onClick={() => (isListening ? stopListening() : startListening())}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                              isListening
                                ? "bg-rose-600 text-white animate-pulse shadow-sm"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            }`}
                          >
                            {isListening ? (
                              <>
                                <MicOff className="w-3.5 h-3.5" />
                                <span>Stop Recording</span>
                              </>
                            ) : (
                              <>
                                <Mic className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Voice Input (Speak)</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Text-mode active</span>
                        )}
                      </div>
                    </div>

                    {/* Microphone Notice / Error message */}
                    {micError && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between">
                        <span>{micError}</span>
                        <button onClick={() => setMicError(null)} className="font-bold ml-2">×</button>
                      </div>
                    )}

                    {/* Listening Animation Indicator */}
                    {isListening && (
                      <div className="flex items-center space-x-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                        <span className="font-medium">Listening... Speak clearly into your microphone.</span>
                      </div>
                    )}

                    {/* Text Answer Textarea */}
                    <div className="space-y-2">
                      <textarea
                        id="candidate-answer-textarea"
                        rows={6}
                        value={currentAnswerText}
                        onChange={(e) => setCurrentAnswerText(e.target.value)}
                        placeholder="Type or speak your answer here. Include concrete details, technical methods, or the STAR structure (Situation, Task, Action, Result)..."
                        className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-y leading-relaxed font-sans"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {currentAnswerText.split(/\s+/).filter(Boolean).length} words · {currentAnswerText.length} characters
                        </span>
                        <span className="italic">Press 'Submit & Evaluate Answer' below</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <button
                          onClick={handlePrevQuestion}
                          disabled={currentQuestionIndex === 0}
                          className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Previous</span>
                        </button>
                        <button
                          onClick={handleNextQuestion}
                          disabled={currentQuestionIndex >= questions.length - 1}
                          className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl disabled:opacity-40 transition-colors"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <button
                          id="submit-answer-btn"
                          onClick={handleSubmitAnswer}
                          disabled={isSubmittingAnswer || !currentAnswerText.trim()}
                          className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-all shadow-sm"
                        >
                          {isSubmittingAnswer ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Evaluating Answer...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit & Evaluate Answer</span>
                            </>
                          )}
                        </button>

                        {isAllAnswered && (
                          <button
                            id="finish-interview-btn"
                            onClick={handleFinishInterview}
                            disabled={isEvaluatingFull}
                            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                          >
                            {isEvaluatingFull ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Generating Final Report...</span>
                              </>
                            ) : (
                              <>
                                <Award className="w-3.5 h-3.5" />
                                <span>Complete Interview</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Immediate Answer Feedback Box */}
                  {currentAnswerFeedback && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <h4 className="text-sm font-bold text-slate-900">AI Real-Time Feedback</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500 font-medium">Question Score:</span>
                          <span className="text-sm font-extrabold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-lg">
                            {currentAnswerFeedback.score}/100
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {currentAnswerFeedback.feedback}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/70 space-y-1.5">
                          <span className="text-xs font-bold text-emerald-800 flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Strengths Recognized:
                          </span>
                          <ul className="text-xs text-emerald-700 space-y-1">
                            {currentAnswerFeedback.strengths.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 space-y-1.5">
                          <span className="text-xs font-bold text-amber-800 flex items-center">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            Areas for Enhancement:
                          </span>
                          <ul className="text-xs text-amber-700 space-y-1">
                            {currentAnswerFeedback.areas_for_improvement.map((a, i) => (
                              <li key={i}>• {a}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {currentAnswerFeedback.sample_improved_answer && (
                        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-1">
                          <span className="text-xs font-bold text-blue-900 flex items-center">
                            <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            Exemplary Model Response:
                          </span>
                          <p className="text-xs text-blue-800 italic leading-relaxed">
                            "{currentAnswerFeedback.sample_improved_answer}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right (1 col): Question Tips & Expected Points */}
                <div className="space-y-6">
                  {/* Answering Hints & Tips */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-slate-900">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span>Answering Strategy</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {currentQ.hints_or_tips}
                    </p>
                  </div>

                  {/* Expected Key Criteria */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-slate-900">
                      <Target className="w-4 h-4 text-emerald-600" />
                      <span>Hiring Rubric Criteria</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-600">
                      {currentQ.expected_key_points.map((point, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Session Control Buttons */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Session Control
                    </span>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to exit? Your current progress will be preserved.")) {
                          setSessionStage("setup");
                        }
                      }}
                      className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                    >
                      Exit to Setup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: COMPREHENSIVE EVALUATION REPORT */}
          {sessionStage === "evaluated" && fullEvaluation && (
            <div className="space-y-8 animate-in fade-in duration-400">
              {/* Top Banner with Overall Score */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-8 rounded-3xl shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold mb-2">
                      <Award className="w-3.5 h-3.5" />
                      <span>Interview Complete</span>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">
                      Mock Interview Evaluation Report
                    </h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Role: <strong className="text-white">{customJobTitle}</strong> · Candidate: <strong className="text-white">{candidateName}</strong> · Level: {experienceLevel}
                    </p>
                  </div>

                  {/* Big Score Metric */}
                  <div className="flex items-center space-x-4 bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="text-4xl font-black text-white">
                        {fullEvaluation.overall_score}
                        <span className="text-xl font-medium text-slate-300">/100</span>
                      </div>
                      <span className="text-xs uppercase font-bold tracking-wider text-blue-300">
                        Overall Score
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category 3-Pillar Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-xs font-semibold text-blue-300 flex items-center">
                      <Brain className="w-3.5 h-3.5 mr-1" />
                      Technical Score
                    </span>
                    <div className="text-2xl font-bold text-white">
                      {fullEvaluation.technical_score}/100
                    </div>
                    <p className="text-[11px] text-slate-400">Knowledge depth & problem diagnosis</p>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-xs font-semibold text-emerald-300 flex items-center">
                      <Compass className="w-3.5 h-3.5 mr-1" />
                      Behavioral (STAR)
                    </span>
                    <div className="text-2xl font-bold text-white">
                      {fullEvaluation.behavioral_score}/100
                    </div>
                    <p className="text-[11px] text-slate-400">Collaboration, agility & ownership</p>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-xs font-semibold text-purple-300 flex items-center">
                      <User className="w-3.5 h-3.5 mr-1" />
                      HR & Culture Fit
                    </span>
                    <div className="text-2xl font-bold text-white">
                      {fullEvaluation.hr_score}/100
                    </div>
                    <p className="text-[11px] text-slate-400">Communication & role motivation</p>
                  </div>
                </div>
              </div>

              {/* Hiring Committee Verdict & Summary Feedback */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-bold text-slate-900">Hiring Committee Feedback</h3>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-lg border border-blue-200">
                    Verdict: {fullEvaluation.readiness_verdict}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {fullEvaluation.feedback}
                </p>
              </div>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Key Strengths Displayed</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {fullEvaluation.strengths.map((s, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span>Areas for Practice & Improvement</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {fullEvaluation.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggested Actionable Next Steps Roadmap */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>Actionable Preparation Roadmap</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fullEvaluation.suggested_improvements.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">Action Step</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Question By Question Review Log */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-base font-bold text-slate-900">
                  Question-by-Question Transcript & AI Evaluation
                </h3>
                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    const ans = answersMap[q.id];
                    const badge = getCategoryBadge(q.category);
                    return (
                      <div key={q.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-700">Q{idx + 1}:</span>
                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">({q.target_skill})</span>
                          </div>
                          {ans && (
                            <span className="text-xs font-extrabold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                              Score: {ans.score}/100
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-slate-900">"{q.question}"</p>

                        <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-xs text-slate-700">
                          <strong className="text-slate-900 block mb-1">Candidate Answer:</strong>
                          <p className="italic">{ans ? `"${ans.user_answer}"` : "(No answer recorded)"}</p>
                        </div>

                        {ans && (
                          <div className="text-xs text-slate-600 bg-blue-50/60 p-3 rounded-lg border border-blue-100 space-y-1">
                            <strong className="text-blue-900 block">AI Assessment:</strong>
                            <p>{ans.feedback}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Copy / Start New Session */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <button
                  onClick={handleCopyReport}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Report Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Full Evaluation Report</span>
                    </>
                  )}
                </button>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  {onNavigateToRoadmap && (
                    <button
                      onClick={onNavigateToRoadmap}
                      className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors"
                    >
                      <Brain className="w-4 h-4" />
                      <span>View Learning Roadmap</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSessionStage("setup")}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Practice Another Interview</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SESSION HISTORY & PAST REPORTS                                     */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Saved Interview Sessions</h2>
              <p className="text-sm text-slate-500">
                Review your previous mock interview attempts and performance evaluations stored in SQLite.
              </p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={isLoadingHistory}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
              <span>Refresh History</span>
            </button>
          </div>

          {historyList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No mock interview records yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Complete your first mock interview to view scores, transcripts, and AI hiring feedback here.
              </p>
              <button
                onClick={() => {
                  setActiveTab("session");
                  setSessionStage("setup");
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm"
              >
                Start New Interview
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {historyList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Session #{item.id}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          item.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status === "completed" ? "Completed" : "In Progress"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {item.job_title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Candidate: {item.candidate_name || "Candidate"} · {item.experience_level}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Questions:</span>
                      <span className="font-semibold text-slate-800">
                        {item.answered_questions} / {item.total_questions} answered
                      </span>
                    </div>

                    {item.overall_score > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">Overall Score:</span>
                        <span className="text-sm font-black text-blue-700">
                          {item.overall_score}/100
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleViewHistoryItem(item.id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                      >
                        <span>Review Report</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historical Detail Modal / Viewer */}
          {selectedHistoryDetail && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      Archived Session #{selectedHistoryDetail.id}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {selectedHistoryDetail.job_title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Candidate: {selectedHistoryDetail.candidate_name} · Score: {selectedHistoryDetail.overall_score}/100
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedHistoryDetail(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                {/* Verdict & Scores */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Readiness Verdict:</span>
                    <span className="font-bold text-blue-700">{selectedHistoryDetail.readiness_verdict || "Evaluated"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Technical / Behavioral / HR:</span>
                    <span className="font-bold text-slate-900">
                      {selectedHistoryDetail.technical_score} / {selectedHistoryDetail.behavioral_score} / {selectedHistoryDetail.hr_score}
                    </span>
                  </div>
                </div>

                {/* Feedback */}
                {selectedHistoryDetail.feedback && (
                  <div className="space-y-1 text-xs text-slate-700">
                    <strong className="text-slate-900 block font-semibold">Feedback:</strong>
                    <p className="leading-relaxed">{selectedHistoryDetail.feedback}</p>
                  </div>
                )}

                {/* Questions and Answers */}
                <div className="space-y-4 pt-2">
                  <strong className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    Questions & Answers
                  </strong>
                  {selectedHistoryDetail.questions?.map((q, idx) => {
                    const ans = selectedHistoryDetail.answers?.find((a) => a.question_id === q.id);
                    return (
                      <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="font-bold text-slate-900">
                          Q{idx + 1} [{q.category}]: {q.question}
                        </div>
                        <div className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/80">
                          Answer: {ans ? ans.user_answer : "(Unanswered)"}
                        </div>
                        {ans && ans.score && (
                          <div className="text-blue-700 font-semibold">
                            Score: {ans.score}/100 · {ans.feedback}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => setSelectedHistoryDetail(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Close Review
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
