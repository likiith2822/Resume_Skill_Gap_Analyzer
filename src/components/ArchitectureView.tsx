import React, { useState } from "react";
import { 
  Folder, 
  FolderOpen, 
  FolderTree,
  FileCode, 
  FileText, 
  Database, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ChevronRight,
  ChevronDown
} from "lucide-react";

interface TreeNode {
  name: string;
  type: "folder" | "file";
  desc: string;
  phase: "Part 1 (Current)" | "Future Phase";
  status: "Created & Verified" | "Scaffolded / Staged";
  children?: TreeNode[];
}

const PROJECT_TREE: TreeNode = {
  name: "Resume-Skill-Gap-Analyzer",
  type: "folder",
  desc: "Root project directory containing full-stack client, server, and ML assets.",
  phase: "Part 1 (Current)",
  status: "Created & Verified",
  children: [
    {
      name: "frontend",
      type: "folder",
      desc: "React.js single-page application with navigation, live health check, and API services.",
      phase: "Part 1 (Current)",
      status: "Created & Verified",
      children: [
        { name: "src/App.tsx", type: "file", desc: "Main React application container and navigation state router", phase: "Part 1 (Current)", status: "Created & Verified" },
        { name: "src/services/api.ts", type: "file", desc: "API service layer for communicating with backend REST endpoints", phase: "Part 1 (Current)", status: "Created & Verified" },
        { name: "src/components/", type: "folder", desc: "Modular UI components for monitoring, architecture, and diagnostics", phase: "Part 1 (Current)", status: "Created & Verified" },
        { name: "src/types.ts", type: "file", desc: "Global TypeScript interfaces for health payloads and system models", phase: "Part 1 (Current)", status: "Created & Verified" }
      ]
    },
    {
      name: "backend",
      type: "folder",
      desc: "Python Flask application directory with modular blueprints, routes, database, and utilities.",
      phase: "Part 1 (Current)",
      status: "Created & Verified",
      children: [
        { name: "app.py", type: "file", desc: "Main Flask application entry point with CORS, env loader, and error handlers (404/500)", phase: "Part 1 (Current)", status: "Created & Verified" },
        { 
          name: "routes/", 
          type: "folder", 
          desc: "Flask Blueprints. (Part 2: auth.py and health.py; Future: resume_routes.py, analyze_routes.py)", 
          phase: "Part 1 (Current)", 
          status: "Created & Verified",
          children: [
            { name: "auth.py", type: "file", desc: "POST /register, POST /login, POST /logout, GET /me endpoints with Werkzeug hashing", phase: "Part 1 (Current)", status: "Created & Verified" },
            { name: "health.py", type: "file", desc: "Health check route returning system status and SQLite health JSON", phase: "Part 1 (Current)", status: "Created & Verified" },
            { name: "__init__.py", type: "file", desc: "Blueprint exports", phase: "Part 1 (Current)", status: "Created & Verified" }
          ]
        },
        { 
          name: "database/", 
          type: "folder", 
          desc: "SQLite connection manager and schema initialization scripts", 
          phase: "Part 1 (Current)", 
          status: "Created & Verified",
          children: [
            { name: "db.py", type: "file", desc: "SQLite connection pool, row factory, and health ping function", phase: "Part 1 (Current)", status: "Created & Verified" },
            { name: "init_db.py", type: "file", desc: "Schema setup script creating users, resumes, jobs, and analysis tables", phase: "Part 1 (Current)", status: "Created & Verified" },
            { name: "app.db", type: "file", desc: "SQLite database file holding verified relational data", phase: "Part 1 (Current)", status: "Created & Verified" }
          ]
        },
        { 
          name: "models/", 
          type: "folder", 
          desc: "Data models and dataclasses for users, candidates, resumes, target jobs, and skill gap records", 
          phase: "Part 1 (Current)", 
          status: "Created & Verified",
          children: [
            { name: "user.py", type: "file", desc: "UserModel dataclass for user authentication and serialization", phase: "Part 1 (Current)", status: "Created & Verified" },
            { name: "schema.py", type: "file", desc: "Dataclasses for CandidateModel, ResumeModel, TargetJobModel, SkillAnalysisModel", phase: "Part 1 (Current)", status: "Created & Verified" }
          ]
        },
        { 
          name: "services/", 
          type: "folder", 
          desc: "Business logic modules (Part 2: auth_service.py; Future: resume parser, similarity matcher)", 
          phase: "Part 1 (Current)", 
          status: "Created & Verified",
          children: [
            { name: "auth_service.py", type: "file", desc: "Registration validation, Werkzeug password hashing, and session management", phase: "Part 1 (Current)", status: "Created & Verified" }
          ]
        },
        { 
          name: "utils/", 
          type: "folder", 
          desc: "Standardized response helpers (success_response, error_response) and sanitizers", 
          phase: "Part 1 (Current)", 
          status: "Created & Verified",
          children: [
            { name: "helpers.py", type: "file", desc: "Standard JSON envelope responses and error formatting", phase: "Part 1 (Current)", status: "Created & Verified" }
          ]
        },
        { 
          name: "ai/", 
          type: "folder", 
          desc: "AI integration module staged for Gemini API and semantic similarity in upcoming phases", 
          phase: "Part 1 (Current)", 
          status: "Scaffolded / Staged" 
        },
        { 
          name: "static/", 
          type: "folder", 
          desc: "Static web assets and client bundles", 
          phase: "Part 1 (Current)", 
          status: "Scaffolded / Staged" 
        },
        { 
          name: "uploads/", 
          type: "folder", 
          desc: "Secure storage for candidate resume documents (PDF, DOCX)", 
          phase: "Part 1 (Current)", 
          status: "Scaffolded / Staged" 
        }
      ]
    },
    {
      name: "dataset",
      type: "folder",
      desc: "Storage for skills taxonomies, standard job descriptions, and benchmark datasets",
      phase: "Part 1 (Current)",
      status: "Created & Verified",
      children: [
        { name: "sample_job_roles.json", type: "file", desc: "Sample role profiles (Full Stack, AI/ML, Data Analyst) for future matching", phase: "Part 1 (Current)", status: "Created & Verified" }
      ]
    },
    {
      name: "models",
      type: "folder",
      desc: "Pre-trained Sentence Transformers embeddings and scikit-learn models cache",
      phase: "Part 1 (Current)",
      status: "Scaffolded / Staged"
    },
    {
      name: "requirements.txt",
      type: "file",
      desc: "Python dependencies specification (Flask, PyMuPDF, python-docx, spaCy, NLTK, sentence-transformers, google-genai, scikit-learn)",
      phase: "Part 1 (Current)",
      status: "Created & Verified"
    },
    {
      name: ".env.example",
      type: "file",
      desc: "Comprehensive template for environment variables (DATABASE_URL, FLASK_PORT, GEMINI_API_KEY, GITHUB_TOKEN)",
      phase: "Part 1 (Current)",
      status: "Created & Verified"
    },
    {
      name: "README.md",
      type: "file",
      desc: "Full documentation covering architecture, setup guides, API reference, SQLite verification, and Render deployment",
      phase: "Part 1 (Current)",
      status: "Created & Verified"
    }
  ]
};

const TreeItem: React.FC<{ node: TreeNode; depth?: number }> = ({ node, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = node.type === "folder";

  return (
    <div className="text-sm">
      <div 
        onClick={() => isFolder && setIsOpen(!isOpen)}
        className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
          isFolder ? "cursor-pointer hover:bg-stone-100" : "hover:bg-stone-50"
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          {isFolder ? (
            <>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              )}
              {isOpen ? (
                <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-600 shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-4" />
              <FileCode className="w-4 h-4 text-stone-500 shrink-0" />
            </>
          )}

          <span className={`font-mono text-xs ${isFolder ? "font-bold text-stone-900" : "text-stone-800"} truncate`}>
            {node.name}
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0 ml-4">
          <span className="text-xs text-stone-500 hidden md:inline truncate max-w-xs">
            {node.desc}
          </span>
          <span 
            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
              node.status === "Created & Verified"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-stone-100 text-stone-600 border border-stone-200"
            }`}
          >
            {node.status}
          </span>
        </div>
      </div>

      {isFolder && isOpen && node.children && (
        <div>
          {node.children.map((child, idx) => (
            <TreeItem key={`${child.name}-${idx}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-stone-900">Project Directory Scaffold</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                100% Staged According to Specification
              </span>
            </div>
            <p className="text-sm text-stone-600 mt-1 max-w-3xl">
              The project structure strictly follows the mandatory hierarchy specified for the college project.
              Part 1 establishes the root directories, Flask backend architecture, SQLite connection manager, and React frontend.
            </p>
          </div>
        </div>

        {/* Phase Scope Discipline Card */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-stone-100">
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
            <div className="flex items-center space-x-2 font-bold text-sm text-emerald-900 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Part 1 Scope (Implemented Now)</span>
            </div>
            <ul className="text-xs space-y-1.5 text-emerald-800 list-disc list-inside">
              <li>Complete directory tree matching exact specification</li>
              <li>Flask application with <code className="font-mono">/api/health</code> endpoint and CORS</li>
              <li>SQLite database setup with schema initialization (<code className="font-mono">app.db</code>)</li>
              <li>Environment variable loader with <code className="font-mono">.env.example</code></li>
              <li>React navigation, API service folder, and live connection page</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 text-stone-800">
            <div className="flex items-center space-x-2 font-bold text-sm text-stone-900 mb-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Future Phases (Explicitly Staged)</span>
            </div>
            <ul className="text-xs space-y-1.5 text-stone-600 list-disc list-inside">
              <li>Phase 2: Resume parsing with PyMuPDF & python-docx</li>
              <li>Phase 3: NLP skill extraction with spaCy and NLTK</li>
              <li>Phase 4: Semantic similarity matching via Sentence Transformers (<code className="font-mono">all-MiniLM-L6-v2</code>)</li>
              <li>Phase 5: Gemini AI skill gap recommendations & GitHub repo analyzer</li>
              <li>Phase 6: Salary prediction ML & interactive Chart.js analytics</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Interactive Directory Explorer */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4">
          <div className="flex items-center space-x-2">
            <FolderTree className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-stone-900">Interactive Hierarchy Tree</h3>
          </div>
          <span className="text-xs text-stone-500 font-mono">Click folders to expand / collapse</span>
        </div>

        <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/80">
          <TreeItem node={PROJECT_TREE} />
        </div>
      </div>
    </div>
  );
};
