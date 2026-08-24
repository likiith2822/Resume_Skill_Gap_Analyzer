import React, { useState } from "react";
import { 
  Terminal, 
  Copy, 
  Check, 
  Play, 
  Server, 
  Code2, 
  Database, 
  Cloud,
  CheckCircle2
} from "lucide-react";

export const RunInstructionsView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCommand = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: "1. Install Python Backend Dependencies",
      desc: "Install all required Python packages into a virtual environment using the created requirements.txt.",
      cmd: "python3 -m venv venv\nsource venv/bin/activate  # On Windows: venv\\Scripts\\activate\npip install -r requirements.txt",
      icon: <Server className="w-5 h-5 text-emerald-600" />
    },
    {
      title: "2. Initialize SQLite Database Schema",
      desc: "Run the initialization script to create backend/database/app.db with all required candidate, resume, and analysis tables.",
      cmd: "python3 backend/database/init_db.py",
      icon: <Database className="w-5 h-5 text-blue-600" />
    },
    {
      title: "3. Start the Flask Backend Server",
      desc: "Launch the Flask development server on port 5000 with CORS and environment configuration.",
      cmd: "export FLASK_APP=backend/app.py\nexport FLASK_ENV=development\npython3 backend/app.py",
      icon: <Play className="w-5 h-5 text-amber-600" />
    },
    {
      title: "4. Start the React Frontend Application",
      desc: "Install frontend dependencies and start Vite dev server on port 3000.",
      cmd: "npm install\nnpm run dev",
      icon: <Code2 className="w-5 h-5 text-sky-600" />
    },
    {
      title: "5. Test the Health Verification Endpoint",
      desc: "Verify that the backend is running and SQLite is connected by pinging /api/health.",
      cmd: "curl -X GET http://localhost:5000/api/health",
      icon: <Terminal className="w-5 h-5 text-stone-700" />
    },
    {
      title: "6. Render Cloud Deployment Instructions",
      desc: "Deploy the full-stack project to Render as a Web Service.",
      cmd: "# Build Command:\npip install -r requirements.txt && npm install && npm run build\n\n# Start Command (Gunicorn / Flask):\ngunicorn backend.app:app --bind 0.0.0.0:$PORT",
      icon: <Cloud className="w-5 h-5 text-cyan-600" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-stone-900 rounded-xl text-amber-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">How to Run the Project</h2>
            <p className="text-sm text-stone-600 mt-0.5">
              Step-by-step instructions for local execution, database initialization, and deployment.
            </p>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.title}
            className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-stone-50 border border-stone-200">
                  {step.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">{step.title}</h3>
                  <p className="text-xs text-stone-600 mt-0.5">{step.desc}</p>
                </div>
              </div>

              <button
                onClick={() => copyCommand(step.cmd, index)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition shrink-0"
              >
                {copiedIndex === index ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 bg-stone-950 text-stone-100 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-stone-800">
              <pre className="text-emerald-400 leading-relaxed whitespace-pre-wrap">{step.cmd}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
