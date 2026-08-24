import React, { useState } from "react";
import { NavTab } from "../types";
import { useAuth } from "../context/AuthContext";
import { 
  Activity, 
  FolderTree, 
  Layers, 
  Terminal, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw, 
  Sparkles, 
  LayoutDashboard, 
  LogOut, 
  Code2, 
  Brain, 
  Target,
  Github,
  Compass,
  FileCheck,
  Mic,
  TrendingUp,
  UploadCloud,
  ChevronDown,
  Wrench,
  HelpCircle,
  BookOpen
} from "lucide-react";

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isConnected: boolean | null;
  latencyMs: number | null;
  onRefreshHealth: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  isConnected,
  latencyMs,
  onRefreshHealth,
  isRefreshing
}) => {
  const { user, logout } = useAuth();
  const [showDevMenu, setShowDevMenu] = useState(false);

  // Friendly, simple, step-by-step main tabs for any student or user
  const mainTabs: Array<{ id: NavTab; label: string; step?: string; icon: React.ReactNode; badge?: string }> = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4 text-blue-600" /> },
    { id: "upload", step: "1", label: "Upload Resume", icon: <UploadCloud className="w-4 h-4 text-indigo-600" /> },
    { id: "matching", step: "2", label: "Skill Match & Gaps", icon: <Target className="w-4 h-4 text-emerald-600" /> },
    { id: "gap_roadmap", step: "3", label: "Study Roadmap", icon: <Compass className="w-4 h-4 text-blue-600" /> },
    { id: "mock_interview", step: "4", label: "AI Interview", icon: <Mic className="w-4 h-4 text-rose-600" /> },
    { id: "salary_predictor", step: "5", label: "Salary Check", icon: <TrendingUp className="w-4 h-4 text-amber-600" /> },
    { id: "adaptive_quiz", step: "6", label: "Skill Quiz", icon: <Brain className="w-4 h-4 text-purple-600" /> },
    { id: "ats_rewriter", step: "7", label: "ATS Resume Fixer", icon: <FileCheck className="w-4 h-4 text-teal-600" /> },
    { id: "github", step: "8", label: "GitHub Projects", icon: <Github className="w-4 h-4 text-slate-800" /> },
  ];

  // Advanced technical & developer inspection tabs
  const devTabs: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: "nlp", label: "Deep NLP Parser Details", icon: <Brain className="w-4 h-4 text-indigo-500" /> },
    { id: "authtest", label: "API & Security Tester", icon: <Code2 className="w-4 h-4 text-blue-500" /> },
    { id: "health", label: "Server Health Monitor", icon: <Activity className="w-4 h-4 text-emerald-500" /> },
    { id: "architecture", label: "System Architecture", icon: <FolderTree className="w-4 h-4 text-slate-600" /> },
    { id: "techstack", label: "Tech Stack Specs", icon: <Layers className="w-4 h-4 text-slate-600" /> },
    { id: "guide", label: "Deployment & Run Guide", icon: <Terminal className="w-4 h-4 text-amber-600" /> },
  ];

  const isDevTabActive = devTabs.some(t => t.id === activeTab);

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Friendly Tagline */}
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => onSelectTab("dashboard")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  Resume Skill Gap Analyzer
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                  AI Career Coach
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Check resume skills • Find missing knowledge • Practice interviews • Grow career
              </p>
            </div>
          </div>

          {/* User Profile and Backend Status */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {user && (
              <div className="flex items-center space-x-2 pl-2.5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight max-w-[120px] truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-none truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
                <button
                  id="navbar-logout-btn"
                  onClick={logout}
                  title="Sign out of account"
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Connection Status Badge */}
            <div 
              id="backend-connection-badge"
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isConnected === true
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : isConnected === false
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-stone-100 text-stone-700 border-stone-200"
              }`}
            >
              {isConnected === true ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold hidden sm:inline">System Live</span>
                  {latencyMs !== null && (
                    <span className="text-emerald-600 opacity-80 text-[11px]">({latencyMs}ms)</span>
                  )}
                </>
              ) : isConnected === false ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="font-semibold">Offline</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-500 shrink-0" />
                  <span>Connecting...</span>
                </>
              )}
            </div>

            <button
              id="refresh-health-btn"
              onClick={onRefreshHealth}
              disabled={isRefreshing}
              title="Refresh connection status"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-slate-800" : ""}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-1 pb-2">
          {/* Main User Steps */}
          <nav className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
            {mainTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => {
                    setShowDevMenu(false);
                    onSelectTab(tab.id);
                  }}
                  className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab.step && (
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      isActive ? "bg-white text-blue-700" : "bg-slate-200 text-slate-700"
                    }`}>
                      {tab.step}
                    </span>
                  )}
                  {!tab.step && tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Technical / Developer Tools Dropdown */}
          <div className="relative shrink-0 ml-2">
            <button
              id="dev-tools-menu-btn"
              onClick={() => setShowDevMenu(!showDevMenu)}
              className={`flex items-center space-x-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition ${
                isDevTabActive
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Technical Tools</span>
              <span className="sm:hidden">Dev</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDevMenu ? "rotate-180" : ""}`} />
            </button>

            {showDevMenu && (
              <div 
                className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                onMouseLeave={() => setShowDevMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Developer & Inspection Tools
                </div>
                {devTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onSelectTab(tab.id);
                        setShowDevMenu(false);
                      }}
                      className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs font-medium transition ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

