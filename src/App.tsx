import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { ResumeUploadPage } from "./components/ResumeUploadPage";
import { NlpExtractionView } from "./components/NlpExtractionView";
import { SemanticMatchingView } from "./components/SemanticMatchingView";
import { GitHubPortfolioProfiler } from "./components/GitHubPortfolioProfiler";
import { AtsResumeRewriterView } from "./components/AtsResumeRewriterView";
import { AiMockInterviewView } from "./components/AiMockInterviewView";
import { MarketSalaryPredictorView } from "./components/MarketSalaryPredictorView";
import { AdaptiveKnowledgeQuizView } from "./components/AdaptiveKnowledgeQuizView";
import { SkillGapRoadmapView } from "./components/SkillGapRoadmapView";
import { ResumeEndpointsTester } from "./components/ResumeEndpointsTester";
import { UserDashboard } from "./components/UserDashboard";
import { AuthEndpointsTester } from "./components/AuthEndpointsTester";
import { HealthMonitor } from "./components/HealthMonitor";
import { ArchitectureView } from "./components/ArchitectureView";
import { TechStackView } from "./components/TechStackView";
import { RunInstructionsView } from "./components/RunInstructionsView";
import { fetchHealthCheck } from "./services/api";
import { ApiResponse, HealthData, NavTab, AuthView } from "./types";
import { 
  ShieldCheck, 
  Terminal, 
  Layers, 
  Activity, 
  Sparkles,
  Database,
  RefreshCw,
  Target,
  Github
} from "lucide-react";

function MainAppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>("login");
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [healthResponse, setHealthResponse] = useState<ApiResponse<HealthData> | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadHealthStatus = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMessage(undefined);
    try {
      const result = await fetchHealthCheck();
      setHealthResponse(result.data);
      setLatencyMs(result.latencyMs);
      setStatusCode(result.statusCode ?? null);
      if (result.error) {
        setErrorMessage(result.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reach backend");
      setStatusCode(500);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHealthStatus();
  }, [loadHealthStatus]);

  const isConnected = Boolean(
    healthResponse?.success && healthResponse?.data?.status === "healthy"
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3 bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm font-semibold text-stone-800">Checking authentication session...</p>
          <span className="text-xs text-stone-500 font-mono">Verifying with SQLite Database</span>
        </div>
      </div>
    );
  }

  // Unauthenticated user -> redirect to Login / Register
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100/80 text-stone-900 flex flex-col font-sans antialiased">
        {/* Simple top status header */}
        <header className="border-b border-stone-200 bg-white py-3 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center text-amber-400 font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-stone-900">Resume Skill Gap Analyzer</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-stone-500">• Part 2: Database & Auth</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>SQLite Backend Operational</span>
            </span>
          </div>
        </header>

        <main className="flex-1">
          {authView === "login" ? (
            <LoginPage onSwitchToRegister={() => setAuthView("register")} />
          ) : (
            <RegisterPage onSwitchToLogin={() => setAuthView("login")} />
          )}
        </main>

        <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">
          Resume Skill Gap Analyzer • College Project Part 2: SQLite & Werkzeug Auth
        </footer>
      </div>
    );
  }

  // Authenticated user -> Access full application
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-200 selection:text-slate-900">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isConnected={isConnected}
        latencyMs={latencyMs}
        onRefreshHealth={loadHealthStatus}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <UserDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === "adaptive_quiz" && (
          <AdaptiveKnowledgeQuizView
            onNavigateToRoadmap={() => setActiveTab("gap_roadmap")}
            onNavigateToInterview={() => setActiveTab("mock_interview")}
          />
        )}

        {activeTab === "salary_predictor" && (
          <MarketSalaryPredictorView
            onNavigateToUpload={() => setActiveTab("upload")}
            onNavigateToMatching={() => setActiveTab("matching")}
          />
        )}

        {activeTab === "mock_interview" && (
          <AiMockInterviewView
            onNavigateToUpload={() => setActiveTab("upload")}
            onNavigateToRoadmap={() => setActiveTab("gap_roadmap")}
          />
        )}

        {activeTab === "ats_rewriter" && (
          <AtsResumeRewriterView
            onNavigateToUpload={() => setActiveTab("upload")}
            onNavigateToMatching={() => setActiveTab("matching")}
          />
        )}

        {activeTab === "github" && <GitHubPortfolioProfiler />}

        {activeTab === "gap_roadmap" && (
          <SkillGapRoadmapView
            onNavigateToUpload={() => setActiveTab("upload")}
            onNavigateToMatching={() => setActiveTab("matching")}
          />
        )}

        {activeTab === "matching" && (
          <SemanticMatchingView 
            onNavigateToUpload={() => setActiveTab("upload")} 
            onNavigateToNlp={() => setActiveTab("nlp")} 
          />
        )}

        {activeTab === "nlp" && (
          <NlpExtractionView onNavigateToUpload={() => setActiveTab("upload")} />
        )}

        {activeTab === "upload" && (
          <ResumeUploadPage onNavigateToMatching={() => setActiveTab("matching")} />
        )}

        {activeTab === "authtest" && (
          <div className="space-y-8">
            <ResumeEndpointsTester />
            <div className="border-t border-slate-200 pt-8">
              <AuthEndpointsTester />
            </div>
          </div>
        )}

        {activeTab === "health" && (
          <HealthMonitor
            healthResponse={healthResponse}
            latencyMs={latencyMs}
            statusCode={statusCode}
            errorMessage={errorMessage}
            isRefreshing={isRefreshing}
            onRefresh={loadHealthStatus}
          />
        )}

        {activeTab === "architecture" && <ArchitectureView />}

        {activeTab === "techstack" && <TechStackView />}

        {activeTab === "guide" && <RunInstructionsView />}
      </main>

      {/* Footer / System Status Bar */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800">Resume Skill Gap Analyzer</span>
            <span>•</span>
            <span className="text-blue-700 font-medium">Part 12: Main Executive Dashboard</span>
            <span>•</span>
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">v1.12.0</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>React.js • Chart.js Engine • White / Blue / Gray UI • Cross-Module SQLite Aggregation</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">Active User: {user?.email}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
