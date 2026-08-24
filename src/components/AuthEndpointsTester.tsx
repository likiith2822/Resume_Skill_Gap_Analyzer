import React, { useState } from "react";
import { 
  Play, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  RefreshCw,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { getStoredToken } from "../services/api";

type EndpointType = "register" | "login" | "logout" | "me";

export const AuthEndpointsTester: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointType>("me");
  const [requestPayload, setRequestPayload] = useState<string>(
    JSON.stringify({ name: "Jane Developer", email: "jane@college.edu", password: "Password123!" }, null, 2)
  );
  const [responseOutput, setResponseOutput] = useState<{
    status: number;
    statusText: string;
    body: any;
    durationMs: number;
    headers: Record<string, string>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const endpointConfigs: Record<EndpointType, { method: string; path: string; defaultBody: any; desc: string }> = {
    register: {
      method: "POST",
      path: "/api/auth/register",
      defaultBody: {
        name: "Test Candidate",
        email: "candidate@college.edu",
        password: "Password123!"
      },
      desc: "Registers a new user record in SQLite with Werkzeug password hashing."
    },
    login: {
      method: "POST",
      path: "/api/auth/login",
      defaultBody: {
        email: "student@college.edu",
        password: "Password123!"
      },
      desc: "Validates credentials against Werkzeug password hash and returns JWT session token."
    },
    logout: {
      method: "POST",
      path: "/api/auth/logout",
      defaultBody: {},
      desc: "Invalidates authentication cookie and session state."
    },
    me: {
      method: "GET",
      path: "/api/auth/me",
      defaultBody: null,
      desc: "Verifies current session and returns authenticated user profile from SQLite."
    }
  };

  const handleSelectEndpoint = (ep: EndpointType) => {
    setSelectedEndpoint(ep);
    const cfg = endpointConfigs[ep];
    if (cfg.defaultBody !== null) {
      setRequestPayload(JSON.stringify(cfg.defaultBody, null, 2));
    } else {
      setRequestPayload("");
    }
    setResponseOutput(null);
  };

  const handleExecuteRequest = async () => {
    setIsLoading(true);
    setResponseOutput(null);
    const cfg = endpointConfigs[selectedEndpoint];
    const startTime = performance.now();

    const headers: Record<string, string> = {
      "Accept": "application/json"
    };

    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method: cfg.method,
      headers
    };

    if (cfg.method !== "GET" && requestPayload.trim()) {
      headers["Content-Type"] = "application/json";
      options.body = requestPayload;
    }

    try {
      const resp = await fetch(cfg.path, options);
      const durationMs = Math.round(performance.now() - startTime);
      let body: any = null;
      try {
        body = await resp.json();
      } catch {
        body = { error: "Non-JSON response received" };
      }

      const resHeaders: Record<string, string> = {};
      resp.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      setResponseOutput({
        status: resp.status,
        statusText: resp.statusText,
        body,
        durationMs,
        headers: resHeaders
      });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      setResponseOutput({
        status: 500,
        statusText: "Client Network Error",
        body: { error: err.message },
        durationMs,
        headers: {}
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (responseOutput) {
      navigator.clipboard.writeText(JSON.stringify(responseOutput.body, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-stone-900" />
              <h2 className="text-lg font-bold text-stone-900">
                Interactive Authentication API Tester
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Test and inspect the live Flask / SQLite REST authentication endpoints in real-time.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg border border-stone-200">
              Active Token: {getStoredToken() ? "Present (Bearer)" : "None"}
            </span>
          </div>
        </div>

        {/* Endpoint Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
          {(Object.keys(endpointConfigs) as EndpointType[]).map((ep) => {
            const cfg = endpointConfigs[ep];
            const isSelected = selectedEndpoint === ep;
            return (
              <button
                key={ep}
                onClick={() => handleSelectEndpoint(ep)}
                className={`p-3 rounded-xl border text-left transition ${
                  isSelected 
                    ? "bg-stone-900 text-white border-stone-900 shadow-xs" 
                    : "bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    cfg.method === "GET" 
                      ? isSelected ? "bg-emerald-800 text-emerald-100" : "bg-emerald-100 text-emerald-800"
                      : isSelected ? "bg-amber-700 text-amber-100" : "bg-amber-100 text-amber-800"
                  }`}>
                    {cfg.method}
                  </span>
                  <span className="text-xs font-mono">{ep}</span>
                </div>
                <div className="text-xs font-mono truncate mt-1.5 opacity-90">
                  {cfg.path}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-600 flex items-center justify-between">
          <span>{endpointConfigs[selectedEndpoint].desc}</span>
        </div>
      </div>

      {/* Request & Response Split Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  endpointConfigs[selectedEndpoint].method === "GET"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {endpointConfigs[selectedEndpoint].method}
                </span>
                <span className="text-xs font-mono font-semibold text-stone-800">
                  {endpointConfigs[selectedEndpoint].path}
                </span>
              </div>
              <span className="text-[11px] text-stone-500 font-mono">JSON Body</span>
            </div>

            {endpointConfigs[selectedEndpoint].method === "GET" ? (
              <div className="p-8 text-center border border-dashed border-stone-200 rounded-xl bg-stone-50 text-stone-500 text-xs">
                GET request contains no body payload. Token header will be sent automatically.
              </div>
            ) : (
              <textarea
                value={requestPayload}
                onChange={(e) => setRequestPayload(e.target.value)}
                rows={9}
                className="w-full font-mono text-xs p-3 rounded-xl border border-stone-200 bg-stone-900 text-amber-300 focus:outline-none focus:ring-2 focus:ring-stone-800"
                placeholder="{}"
              />
            )}
          </div>

          <button
            id="execute-api-test-btn"
            onClick={handleExecuteRequest}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs flex items-center justify-center space-x-2 transition shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-amber-400" />
            )}
            <span>{isLoading ? "Executing Request..." : "Send Request"}</span>
          </button>
        </div>

        {/* Response Panel */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-stone-900">Live Response</span>
                {responseOutput && (
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                    responseOutput.status >= 200 && responseOutput.status < 300
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-rose-100 text-rose-800 border border-rose-200"
                  }`}>
                    HTTP {responseOutput.status} {responseOutput.statusText} ({responseOutput.durationMs}ms)
                  </span>
                )}
              </div>
              {responseOutput && (
                <button
                  onClick={handleCopyJson}
                  className="text-xs text-stone-500 hover:text-stone-800 flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy JSON"}</span>
                </button>
              )}
            </div>

            <pre className="w-full h-56 font-mono text-xs p-3 rounded-xl border border-stone-200 bg-stone-950 text-emerald-400 overflow-auto">
              {responseOutput 
                ? JSON.stringify(responseOutput.body, null, 2) 
                : "// Click 'Send Request' to inspect live server response."}
            </pre>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-500">
            Authentication token is stored securely in both HTTP-only cookies and local Bearer storage.
          </div>
        </div>
      </div>
    </div>
  );
};
