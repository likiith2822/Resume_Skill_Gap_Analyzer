import { ApiResponse, AuthResponseData, HealthData, User } from "../types";

const API_BASE_URL = "/api";

export function getStoredToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setStoredToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

export function clearStoredToken(): void {
  localStorage.removeItem("auth_token");
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  const token = getStoredToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchHealthCheck(): Promise<{
  data: ApiResponse<HealthData> | null;
  latencyMs: number;
  error?: string;
  statusCode?: number;
}> {
  const startTime = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      }
    });
    const latencyMs = Math.round(performance.now() - startTime);
    const json = await response.json();
    return {
      data: json,
      latencyMs,
      statusCode: response.status
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      data: null,
      latencyMs,
      error: err.message || "Failed to reach backend",
      statusCode: 500
    };
  }
}

export async function registerApi(payload: { name: string; email: string; password: string }): Promise<ApiResponse<AuthResponseData>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (response.ok && json.data?.token) {
      setStoredToken(json.data.token);
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: err.message || "Network error during registration"
      }
    };
  }
}

export async function loginApi(payload: { email: string; password: string }): Promise<ApiResponse<AuthResponseData>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (response.ok && json.data?.token) {
      setStoredToken(json.data.token);
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: err.message || "Network error during login"
      }
    };
  }
}

export async function logoutApi(): Promise<ApiResponse<{ logged_out: boolean }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    clearStoredToken();
    const json = await response.json();
    return json;
  } catch (err: any) {
    clearStoredToken();
    return {
      success: true,
      data: { logged_out: true }
    };
  }
}

export async function getCurrentUserApi(): Promise<ApiResponse<{ user: User }>> {
  const token = getStoredToken();
  if (!token) {
    return {
      success: false,
      error: { code: "NO_TOKEN", message: "No session token stored" }
    };
  }
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    const json = await response.json();
    if (!response.ok) {
      clearStoredToken();
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: { code: "NETWORK_ERROR", message: err.message || "Failed to verify session" }
    };
  }
}

export async function fetchDatabaseUsersApi(): Promise<ApiResponse<{ users: User[]; count: number }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "NETWORK_ERROR", message: err.message }
    };
  }
}

// ================= Resume Upload & Parsing APIs (Part 3) =================

export async function uploadResumeApi(file: File): Promise<ApiResponse<{
  resume_id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  parsed_data: any;
  summary: any;
}>> {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append("resume", file);

  const headers: Record<string, string> = {
    "Accept": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
      method: "POST",
      headers,
      body: formData
    });
    const json = await response.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: "UPLOAD_NETWORK_ERROR",
        message: err.message || "Failed to upload resume file to server."
      }
    };
  }
}

export async function fetchResumesListApi(): Promise<ApiResponse<{
  resumes: any[];
  total: number;
}>> {
  try {
    const response = await fetch(`${API_BASE_URL}/resumes`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: "FETCH_FAILED",
        message: err.message || "Failed to retrieve uploaded resumes list."
      }
    };
  }
}

export async function fetchResumeByIdApi(resumeId: number): Promise<ApiResponse<{
  resume: any;
}>> {
  try {
    const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: "FETCH_FAILED",
        message: err.message || `Failed to fetch resume details for ID ${resumeId}.`
      }
    };
  }
}

export async function deleteResumeByIdApi(resumeId: number): Promise<ApiResponse<{
  deleted_id: number;
}>> {
  try {
    const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: "DELETE_FAILED",
        message: err.message || `Failed to delete resume ID ${resumeId}.`
      }
    };
  }
}

export async function fetchSystemInfo(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/info`);
    return await res.json();
  } catch (e: any) {
    return { error: e.message };
  }
}

// ================= Part 4: NLP and Skill Extraction APIs =================

export async function extractSkillsApi(payload: {
  resume_id?: number;
  text?: string;
  filename?: string;
}): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/extract-skills`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "NLP_NETWORK_ERROR", message: err.message || "Failed to execute NLP skill extraction." }
    };
  }
}

export async function fetchSkillsTaxonomyApi(): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/skills/taxonomy`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "TAXONOMY_FETCH_ERROR", message: err.message }
    };
  }
}

export async function normalizeSkillsApi(skills: string[]): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/normalize`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ skills })
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "NORMALIZE_ERROR", message: err.message }
    };
  }
}

export async function fetchExtractedSkillsForResumeApi(resumeId: number): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/skills/extracted/${resumeId}`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "FETCH_SKILLS_ERROR", message: err.message }
    };
  }
}

// ================= Part 5: Job Roles and Semantic Matching APIs =================

export async function fetchJobsListApi(): Promise<ApiResponse<{ jobs: any[]; total: number }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "FETCH_JOBS_ERROR", message: err.message || "Failed to retrieve job roles from SQLite." }
    };
  }
}

export async function fetchJobByIdApi(jobId: number): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "FETCH_JOB_ERROR", message: err.message || `Failed to fetch job role ${jobId}.` }
    };
  }
}

export async function matchSkillsApi(payload: {
  job_id?: number;
  job_title?: string;
  resume_id?: number;
  skills?: string[];
  text?: string;
}): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/match`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "MATCHING_ERROR", message: err.message || "Failed to run semantic skill matching." }
    };
  }
}

export async function runMatchingBenchmarkApi(): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/match/benchmark`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "BENCHMARK_ERROR", message: err.message || "Failed to run multi-role matching benchmark." }
    };
  }
}

// ================= Part 12: Dashboard Overview API =================

export async function fetchDashboardOverviewApi(): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: { code: "DASHBOARD_ERROR", message: err.message || "Failed to load dashboard overview data." }
    };
  }
}

