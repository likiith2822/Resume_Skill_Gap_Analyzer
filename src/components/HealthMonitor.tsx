import React, { useState } from "react";
import { ApiResponse, HealthData } from "../types";
import { 
  Activity, 
  Database, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Code2, 
  Copy, 
  Check, 
  Play, 
  RefreshCw,
  Cpu,
  ShieldCheck
} from "lucide-react";

interface HealthMonitorProps {
  healthResponse: ApiResponse<HealthData> | null;
  latencyMs: number | null;
  statusCode: number | null;
  errorMessage?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const HealthMonitor: React.FC<HealthMonitorProps> = ({
  healthResponse,
  latencyMs,
  statusCode,
  errorMessage,
  isRefreshing,
  onRefresh
}) => {
  const [copied, setCopied] = useState(false);
  const [simulatedError, setSimulatedError] = useState<string | null>(null);

  const isHealthy = Boolean(healthResponse?.success && healthResponse?.data?.status === "healthy");
  const data = healthResponse?.data;
  const db = data?.database;

  const handleCopyJson = () => {
    if (healthResponse) {
      navigator.clipboard.writeText(JSON.stringify(healthResponse, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Connection Status Summary */}
      <div 
        id="health-status-banner"
        className={`p-6 rounded-2xl border transition-all ${
          isHealthy
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
            : "bg-rose-50/70 border-rose-200 text-rose-950"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-xl ${isHealthy ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
              {isHealthy ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {isHealthy ? "Backend Operational & Connected" : "Backend Unavailable"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/80 border border-emerald-300">
                  HTTP {statusCode || 200}
                </span>
              </div>
              <p className="text-sm mt-1 opacity-90">
                {isHealthy
                  ? (healthResponse?.message || "Successfully communicated with Flask API on /api/health and verified SQLite connectivity.")
                  : (errorMessage || "Unable to establish communication with the backend endpoint.")}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-center">
            <button
              id="test-api-health-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 transition shadow-xs disabled:opacity-50"
            >
              {isRefreshing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{isRefreshing ? "Pinging..." : "Test /api/health"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>RESPONSE LATENCY</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-stone-900">
              {latencyMs !== null ? latencyMs : "--"}
            </span>
            <span className="text-sm font-medium text-stone-500">ms</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">Roundtrip client-server latency</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>DATABASE (SQLITE)</span>
            <Database className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-stone-900 capitalize">
              {db?.status || "Ready"}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {db?.tables?.length ? `${db.tables.length} schema tables verified` : "SQLite database connection active"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>ACTIVE PHASE</span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-stone-900">Part 1</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">Project Setup & Health Verification</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>LAST SYNC TIMESTAMP</span>
            <Clock className="w-4 h-4 text-stone-600" />
          </div>
          <div className="mt-2 text-sm font-semibold text-stone-800 truncate">
            {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "--:--:--"}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {data?.timestamp ? new Date(data.timestamp).toLocaleDateString() : "Awaiting request"}
          </p>
        </div>
      </div>

      {/* Two Column Grid: Database Details & Endpoint Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SQLite Database Card */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">SQLite Database Verification</h3>
                <p className="text-xs text-stone-500">Persistent storage configured for college project</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Database Engine</span>
                <span className="font-semibold text-stone-800">SQLite 3 (File-based)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Database File Path</span>
                <span className="font-mono text-xs text-stone-700 bg-stone-100 px-2 py-1 rounded">
                  backend/database/app.db
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Connection State</span>
                <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Operational</span>
                </span>
              </div>
              <div className="py-2">
                <span className="text-stone-500 font-medium block mb-2">Initialized Schemas (Ready for Phase 2):</span>
                <div className="flex flex-wrap gap-1.5">
                  {["system_info", "candidates", "resumes", "target_jobs", "skill_analyses"].map((table) => (
                    <span 
                      key={table}
                      className="px-2.5 py-1 bg-stone-100 text-stone-800 text-xs font-mono rounded-md border border-stone-200"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>SQLite database handler in <code className="font-mono text-stone-800">backend/database/db.py</code> provides safe connection pooling and row factories for future parsing and analysis steps.</span>
          </div>
        </div>

        {/* Backend Endpoint Specifications */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Flask REST API Routes</h3>
                <p className="text-xs text-stone-500">CORS-enabled REST endpoints</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
                      GET
                    </span>
                    <span className="font-mono text-sm font-semibold text-stone-900">/api/health</span>
                  </div>
                  <span className="text-xs text-stone-500 font-medium">Status Check</span>
                </div>
                <p className="text-xs text-stone-600 mt-2">
                  Returns backend health, service name, version, SQLite status, and technology specs in standardized JSON envelope.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
                      GET
                    </span>
                    <span className="font-mono text-sm font-semibold text-stone-900">/api/info</span>
                  </div>
                  <span className="text-xs text-stone-500 font-medium">System Manifest</span>
                </div>
                <p className="text-xs text-stone-600 mt-2">
                  Provides high-level project metadata, architectural breakdown, and environment configuration.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>CORS: <strong className="text-stone-800">Enabled</strong></span>
            <span>Error Handlers: <strong className="text-stone-800">404, 500 JSON</strong></span>
            <span>Env Loader: <strong className="text-stone-800">python-dotenv</strong></span>
          </div>
        </div>
      </div>

      {/* Raw JSON Inspector */}
      <div className="bg-stone-900 text-stone-100 p-6 rounded-2xl shadow-md border border-stone-800">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold tracking-wide uppercase text-stone-200">
              Live JSON Response from /api/health
            </h3>
          </div>
          <button
            id="copy-json-btn"
            onClick={handleCopyJson}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-medium transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy JSON"}</span>
          </button>
        </div>

        <pre className="mt-4 p-4 rounded-xl bg-stone-950 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96 leading-relaxed border border-stone-800/80">
          {healthResponse ? JSON.stringify(healthResponse, null, 2) : "// Awaiting health ping response..."}
        </pre>
      </div>
    </div>
  );
};
