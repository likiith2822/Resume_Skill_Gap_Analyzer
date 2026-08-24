import React from "react";
import { 
  Code, 
  Database, 
  FileText, 
  BrainCircuit, 
  Sparkles, 
  Github, 
  BarChart3, 
  Cloud, 
  Layers, 
  CheckCircle2, 
  Cpu
} from "lucide-react";

interface TechItem {
  name: string;
  category: string;
  role: string;
  packageSpec: string;
  icon: React.ReactNode;
  version: string;
  mandatory: boolean;
}

const TECH_STACK: TechItem[] = [
  {
    name: "React.js",
    category: "Frontend",
    role: "Single-Page Application client with reactive state, modular components, and fast rendering",
    packageSpec: "react ^19.0.1 / react-dom",
    icon: <Code className="w-5 h-5 text-sky-500" />,
    version: "19.0.1",
    mandatory: true
  },
  {
    name: "HTML5 & CSS3 / Tailwind",
    category: "Frontend",
    role: "Modern semantic markup, responsive design, and tailored utility-first design system",
    packageSpec: "@tailwindcss/vite ^4.1.14",
    icon: <Layers className="w-5 h-5 text-amber-500" />,
    version: "HTML5 / CSS3",
    mandatory: true
  },
  {
    name: "Python Flask",
    category: "Backend",
    role: "Lightweight WSGI web server framework with blueprints, CORS, and REST API controllers",
    packageSpec: "flask >= 3.0.0, flask-cors >= 4.0.0",
    icon: <Cpu className="w-5 h-5 text-emerald-600" />,
    version: "3.0+",
    mandatory: true
  },
  {
    name: "SQLite 3",
    category: "Database",
    role: "Embedded zero-configuration SQL database storing candidate resumes, jobs, and skill gap records",
    packageSpec: "sqlite3 (Python standard library / app.db)",
    icon: <Database className="w-5 h-5 text-blue-600" />,
    version: "3.x",
    mandatory: true
  },
  {
    name: "PyMuPDF (fitz) & python-docx",
    category: "Resume Parsing",
    role: "High-accuracy text extraction from PDF and Word DOCX candidate resumes",
    packageSpec: "PyMuPDF >= 1.23.0, python-docx >= 1.1.0",
    icon: <FileText className="w-5 h-5 text-rose-500" />,
    version: "PyMuPDF 1.23+, docx 1.1+",
    mandatory: true
  },
  {
    name: "spaCy & NLTK",
    category: "NLP & Tokenization",
    role: "Entity extraction, tokenization, lemmatization, and skill phrase recognition",
    packageSpec: "spacy >= 3.7.0, nltk >= 3.8.1",
    icon: <BrainCircuit className="w-5 h-5 text-purple-600" />,
    version: "spaCy 3.7+, NLTK 3.8+",
    mandatory: true
  },
  {
    name: "Sentence Transformers",
    category: "Semantic Similarity",
    role: "Deep vector embeddings for semantic skill matching using model: all-MiniLM-L6-v2",
    packageSpec: "sentence-transformers >= 2.3.0 (all-MiniLM-L6-v2)",
    icon: <Cpu className="w-5 h-5 text-indigo-600" />,
    version: "all-MiniLM-L6-v2",
    mandatory: true
  },
  {
    name: "Google Gemini API",
    category: "Generative AI",
    role: "Intelligent career path recommendations, resume refinement suggestions, and personalized learning roadmaps",
    packageSpec: "google-genai / @google/genai",
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    version: "Gemini 2.5/3",
    mandatory: true
  },
  {
    name: "GitHub REST API",
    category: "Candidate Verification",
    role: "Fetches public repository languages, stars, commit frequencies, and project skill verification",
    packageSpec: "requests >= 2.31.0 / GitHub API v3",
    icon: <Github className="w-5 h-5 text-stone-800" />,
    version: "REST v3",
    mandatory: true
  },
  {
    name: "Scikit-learn",
    category: "Machine Learning (Part 10)",
    role: "RandomForestRegressor for market salary prediction, DictVectorizer feature pipelines, and model serialization in models/salary_model.joblib",
    packageSpec: "scikit-learn >= 1.4.0, joblib >= 1.4.0",
    icon: <BrainCircuit className="w-5 h-5 text-teal-600" />,
    version: "1.9.0",
    mandatory: true
  },
  {
    name: "Chart.js",
    category: "Data Visualization",
    role: "Radar charts, bar graphs, and visual gap distribution analytics",
    packageSpec: "chart.js / react-chartjs-2",
    icon: <BarChart3 className="w-5 h-5 text-orange-500" />,
    version: "4.x",
    mandatory: true
  },
  {
    name: "Render",
    category: "Deployment",
    role: "Cloud hosting platform for containerized Flask backend and production React SPA",
    packageSpec: "render.yaml / Web Service + Static Site",
    icon: <Cloud className="w-5 h-5 text-cyan-600" />,
    version: "Production Target",
    mandatory: true
  }
];

export const TechStackView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-700 border border-amber-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Mandatory Technology Stack Specification</h2>
            <p className="text-sm text-stone-600 mt-0.5">
              Standardized stack requirements for the Resume Skill Gap Analyzer college project.
            </p>
          </div>
        </div>
      </div>

      {/* Tech Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TECH_STACK.map((tech) => (
          <div 
            key={tech.name}
            className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between hover:border-stone-300 transition"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  {tech.icon}
                </div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mandatory</span>
                </span>
              </div>

              <div className="mt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  {tech.category}
                </span>
                <h3 className="text-base font-bold text-stone-900 mt-0.5">{tech.name}</h3>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  {tech.role}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100">
              <div className="text-[11px] font-mono text-stone-600 bg-stone-50 px-2 py-1 rounded border border-stone-200 truncate">
                {tech.packageSpec}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
