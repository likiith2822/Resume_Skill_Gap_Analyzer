import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { execSync } from "child_process";
import { 
  generateGeminiRoadmap, 
  saveRoadmapToDb, 
  getRoadmapByIdFromDb, 
  getRecentRoadmapsFromDb 
} from "./server/geminiRoadmap.js";
import {
  generateGeminiAtsRewrite,
  generateGeminiCoverLetter,
  calculateAtsMetricsViaCli,
  saveAtsRewriteToDb,
  getAtsRewriteByIdFromDb,
  getRecentAtsRewritesFromDb,
  saveCoverLetterToDb,
  getCoverLetterByIdFromDb,
  getRecentCoverLettersFromDb
} from "./server/geminiAts.js";
import {
  generateMockInterviewQuestions,
  evaluateSingleAnswer,
  evaluateFullMockInterview,
  createInterviewInDb,
  recordAnswerInDb,
  saveEvaluationInDb,
  getInterviewByIdFromDb,
  getRecentInterviewsFromDb
} from "./server/geminiInterview.js";
import {
  generateAdaptiveQuizQuestion,
  generateQuizSummaryWithGemini,
  runPythonQuizCli,
  QuizDifficulty
} from "./server/geminiQuiz.js";

const JWT_SECRET = process.env.SECRET_KEY || "resume-skill-gap-analyzer-super-secret-key-2026";
const UPLOAD_DIR = path.join(process.cwd(), "backend", "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file size limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf" || ext === ".docx") {
      cb(null, true);
    } else {
      cb(new Error("UNSUPPORTED_FILE_TYPE: Only PDF (.pdf) and DOCX (.docx) documents are permitted."));
    }
  }
});

interface AuthUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

function parseJsonFromOutput(outputStr: string): any {
  if (!outputStr || typeof outputStr !== "string") {
    throw new Error("Empty command output");
  }
  const trimmed = outputStr.trim();
  try {
    return JSON.parse(trimmed);
  } catch (initialErr) {
    // If output contains extra logs/warnings before or after the JSON block, extract the JSON portion
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const candidate = trimmed.substring(firstBrace, lastBrace + 1);
        return JSON.parse(candidate);
      } catch {}
    }
    const firstBracket = trimmed.indexOf("[");
    const lastBracket = trimmed.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        const candidate = trimmed.substring(firstBracket, lastBracket + 1);
        return JSON.parse(candidate);
      } catch {}
    }
    throw initialErr;
  }
}

function runPythonAuth(action: string, payload: any): { status: number; body: any } {
  try {
    const inputJson = JSON.stringify(payload).replace(/'/g, "'\\''");
    const cmd = `python3 backend/auth_cli.py ${action} '${inputJson}'`;
    try {
      const output = execSync(cmd, { encoding: "utf-8", timeout: 10000 });
      const parsed = parseJsonFromOutput(output);
      return { status: 200, body: parsed };
    } catch (execErr: any) {
      if (execErr.stdout) {
        try {
          const parsed = parseJsonFromOutput(execErr.stdout);
          const code = parsed.error?.code === "DUPLICATE_EMAIL" ? 409 :
                       parsed.error?.code === "INVALID_CREDENTIALS" ? 401 :
                       parsed.error?.code === "USER_NOT_FOUND" ? 404 : 400;
          return { status: code, body: parsed };
        } catch {
          // ignore
        }
      }
      return {
        status: 500,
        body: { success: false, error: { code: "SERVER_ERROR", message: execErr.message } }
      };
    }
  } catch (e: any) {
    return {
      status: 500,
      body: { success: false, error: { code: "INTERNAL_ERROR", message: e.message } }
    };
  }
}

function runPythonResume(action: string, payload: any): { status: number; body: any } {
  try {
    const inputJson = JSON.stringify(payload).replace(/'/g, "'\\''");
    const cmd = `python3 backend/resume_cli.py ${action} '${inputJson}'`;
    try {
      const output = execSync(cmd, { encoding: "utf-8", timeout: 25000 });
      const parsed = parseJsonFromOutput(output);
      return { status: 200, body: parsed };
    } catch (execErr: any) {
      if (execErr.stdout) {
        try {
          const parsed = parseJsonFromOutput(execErr.stdout);
          const code = parsed.error?.code === "RESUME_NOT_FOUND" ? 404 :
                       parsed.error?.code === "UNAUTHORIZED" ? 403 : 400;
          return { status: code, body: parsed };
        } catch {
          // ignore
        }
      }
      return {
        status: 500,
        body: { success: false, error: { code: "PARSER_ERROR", message: execErr.message } }
      };
    }
  } catch (e: any) {
    return {
      status: 500,
      body: { success: false, error: { code: "INTERNAL_ERROR", message: e.message } }
    };
  }
}

function runPythonNlp(action: string, payload: any): { status: number; body: any } {
  try {
    const inputJson = JSON.stringify(payload).replace(/'/g, "'\\''");
    const cmd = `python3 backend/nlp_cli.py ${action} '${inputJson}'`;
    try {
      const output = execSync(cmd, { encoding: "utf-8", timeout: 35000 });
      const parsed = parseJsonFromOutput(output);
      return { status: 200, body: parsed };
    } catch (execErr: any) {
      if (execErr.stdout) {
        try {
          const parsed = parseJsonFromOutput(execErr.stdout);
          const code = parsed.error?.code === "RESUME_NOT_FOUND" ? 404 :
                       parsed.error?.code === "EMPTY_TEXT" ? 400 : 400;
          return { status: code, body: parsed };
        } catch {
          // ignore
        }
      }
      return {
        status: 500,
        body: { success: false, error: { code: "NLP_ERROR", message: execErr.message } }
      };
    }
  } catch (e: any) {
    return {
      status: 500,
      body: { success: false, error: { code: "INTERNAL_ERROR", message: e.message } }
    };
  }
}

function runPythonMatching(action: string, payload: any): { status: number; body: any } {
  try {
    const inputJson = JSON.stringify(payload).replace(/'/g, "'\\''");
    const cmd = `python3 backend/matching_cli.py ${action} '${inputJson}'`;
    try {
      const output = execSync(cmd, { encoding: "utf-8", timeout: 45000 });
      const parsed = parseJsonFromOutput(output);
      return { status: 200, body: parsed };
    } catch (execErr: any) {
      if (execErr.stdout) {
        try {
          const parsed = parseJsonFromOutput(execErr.stdout);
          const code = parsed.error?.code === "JOB_NOT_FOUND" ? 404 :
                       parsed.error?.code === "NO_JOB_FOUND" ? 400 : 400;
          return { status: code, body: parsed };
        } catch {
          // ignore
        }
      }
      return {
        status: 500,
        body: { success: false, error: { code: "MATCHING_ERROR", message: execErr.message } }
      };
    }
  } catch (e: any) {
    return {
      status: 500,
      body: { success: false, error: { code: "INTERNAL_ERROR", message: e.message } }
    };
  }
}

// Magic bytes security checker
function validateFileMagicBytes(filePath: string, ext: string): boolean {
  try {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    if (ext === ".pdf") {
      // PDF must start with '%PDF-' (0x25 0x50 0x44 0x46)
      return buffer.slice(0, 4).toString("ascii") === "%PDF";
    }
    if (ext === ".docx") {
      // DOCX is a zip package starting with 'PK\x03\x04' (0x50 0x4B 0x03 0x04)
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    }
    return false;
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Database status checker
  function checkDatabaseHealth() {
    const dbPath = path.join(process.cwd(), "backend", "database", "app.db");
    const exists = fs.existsSync(dbPath);
    try {
      if (exists) {
        const stats = fs.statSync(dbPath);
        return {
          status: "connected",
          type: "SQLite 3",
          path: dbPath,
          sizeBytes: stats.size,
          healthy: true,
          tables: ["users", "system_info", "candidates", "resumes", "target_jobs", "skill_analyses", "learning_roadmaps", "github_profiles"]
        };
      }
    } catch (e: any) {
      return {
        status: "warning",
        type: "SQLite 3",
        path: dbPath,
        healthy: false,
        error: e.message
      };
    }
    return {
      status: "initialized",
      type: "SQLite 3",
      path: dbPath,
      healthy: true,
      tables: ["users", "system_info", "candidates", "resumes", "target_jobs", "skill_analyses", "learning_roadmaps", "github_profiles"]
    };
  }

  // Auth Middleware
  function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    let token: string | undefined;

    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required. Please log in to access this resource."
        },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userRes = runPythonAuth("get_user", { user_id: decoded.sub || decoded.id });
      if (userRes.status === 200 && userRes.body.data?.user) {
        req.user = userRes.body.data.user;
        next();
      } else {
        return res.status(401).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User account not found or deactivated."
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Session expired or invalid token. Please log in again."
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // 1. Health API
  app.get("/api/health", (_req, res) => {
    const dbHealth = checkDatabaseHealth();
    res.status(200).json({
      success: true,
      message: "Resume Skill Gap Analyzer Backend is operational",
      data: {
        status: "healthy",
        service: "Resume Skill Gap Analyzer Backend",
        version: "1.0.0",
        phase: "Part 3 - Resume Upload and Parsing",
        timestamp: new Date().toISOString(),
        database: dbHealth,
        environment: process.env.NODE_ENV || "development",
        technologies: {
          frontend: ["React.js 19", "HTML5", "CSS3 / Tailwind CSS", "JavaScript / TypeScript", "Lucide Icons", "Motion"],
          backend: "Python Flask 3.0+ (Werkzeug Password Hashing)",
          database: "SQLite 3 (users, system_info, resumes, target_jobs, skill_analyses)",
          auth: "Werkzeug PBKDF2:SHA256 & JWT Sessions",
          resume_parsing: ["PyMuPDF (fitz)", "python-docx"],
          nlp: ["spaCy", "NLTK"],
          semantic_similarity: "Sentence Transformers (all-MiniLM-L6-v2)",
          ai: "Google Gemini API (@google/genai)",
          github: "GitHub REST API",
          ml: "Scikit-learn",
          charts: "Chart.js",
          deployment: "Render"
        },
        endpoints: [
          { method: "GET", path: "/api/health", description: "Health verification and system status check" },
          { method: "POST", path: "/api/auth/register", description: "Register new user with Werkzeug password hash" },
          { method: "POST", path: "/api/auth/login", description: "Authenticate user credentials and issue session token" },
          { method: "POST", path: "/api/auth/logout", description: "Clear authentication cookie and invalidate session" },
          { method: "GET", path: "/api/auth/me", description: "Protected endpoint retrieving authenticated user profile" },
          { method: "POST", path: "/api/resumes/upload", description: "Upload PDF/DOCX resume, extract text via PyMuPDF/python-docx, parse entities and skills" },
          { method: "GET", path: "/api/resumes", description: "Retrieve all parsed resumes for the authenticated user" },
          { method: "GET", path: "/api/resumes/:id", description: "Retrieve full details, parsed sections, and raw text of a specific resume" },
          { method: "DELETE", path: "/api/resumes/:id", description: "Delete a resume and associated upload file from SQLite" }
        ]
      },
      timestamp: new Date().toISOString()
    });
  });

  // 2. Authentication Endpoints
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body || {};
    const result = runPythonAuth("register", { name, email, password });

    if (result.status === 200 || result.status === 201) {
      const user = result.body.data.user;
      const token = jwt.sign(
        { sub: user.id, id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(201).json({
        success: true,
        message: "User registered successfully.",
        data: {
          user,
          token
        },
        timestamp: new Date().toISOString()
      });
    }

    return res.status(result.status || 400).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    const result = runPythonAuth("login", { email, password });

    if (result.status === 200) {
      const user = result.body.data.user;
      const token = jwt.sign(
        { sub: user.id, id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        data: {
          user,
          token
        },
        timestamp: new Date().toISOString()
      });
    }

    return res.status(result.status || 401).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("auth_token");
    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
      data: { logged_out: true },
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/auth/me", authenticateToken, (req: AuthenticatedRequest, res) => {
    return res.status(200).json({
      success: true,
      message: "Authenticated user session verified.",
      data: {
        user: req.user
      },
      timestamp: new Date().toISOString()
    });
  });

  // Diagnostic endpoint to list users in DB
  app.get("/api/auth/users", authenticateToken, (_req, res) => {
    const result = runPythonAuth("list_users", {});
    return res.status(result.status).json(result.body);
  });

  // 3. Resume Upload & Parsing Endpoints (Part 3: Resume Upload and Parsing)
  app.post("/api/resumes/upload", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    upload.single("resume")(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              error: {
                code: "FILE_TOO_LARGE",
                message: "File size exceeds the 10MB limit. Please upload a smaller document."
              },
              timestamp: new Date().toISOString()
            });
          }
          return res.status(400).json({
            success: false,
            error: {
              code: "UPLOAD_ERROR",
              message: err.message
            },
            timestamp: new Date().toISOString()
          });
        }
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_FILE",
            message: err.message || "Invalid file uploaded."
          },
          timestamp: new Date().toISOString()
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_FILE_UPLOADED",
            message: "No resume file was attached in the request form data (key: 'resume')."
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check empty / 0-byte file
      if (file.size <= 0) {
        try {
          fs.unlinkSync(file.path);
        } catch {}
        return res.status(400).json({
          success: false,
          error: {
            code: "EMPTY_FILE",
            message: "The uploaded file is empty (0 bytes). Please upload a valid resume."
          },
          timestamp: new Date().toISOString()
        });
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== ".pdf" && ext !== ".docx") {
        try {
          fs.unlinkSync(file.path);
        } catch {}
        return res.status(400).json({
          success: false,
          error: {
            code: "UNSUPPORTED_FORMAT",
            message: `Unsupported file format '${ext}'. Allowed formats: .pdf and .docx.`
          },
          timestamp: new Date().toISOString()
        });
      }

      // Security check: Validate Magic Bytes (prevent executable renaming)
      const isValidMagic = validateFileMagicBytes(file.path, ext);
      if (!isValidMagic) {
        try {
          fs.unlinkSync(file.path);
        } catch {}
        return res.status(400).json({
          success: false,
          error: {
            code: "CORRUPT_OR_MALICIOUS_FILE",
            message: "File signature verification failed. The file contents do not match genuine PDF/DOCX structure."
          },
          timestamp: new Date().toISOString()
        });
      }

      // Run Python resume parsing engine
      const user = req.user!;
      const parseResult = runPythonResume("parse_and_save", {
        file_path: file.path,
        original_filename: file.originalname,
        stored_filename: file.filename,
        user_id: user.id,
        file_size: file.size,
        file_type: ext.replace(".", "").toUpperCase()
      });

      if (parseResult.status === 200 && parseResult.body.success) {
        return res.status(201).json({
          success: true,
          message: `Resume '${file.originalname}' successfully uploaded and parsed.`,
          data: parseResult.body.data,
          timestamp: new Date().toISOString()
        });
      }

      // If parsing failed, clean up file
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {}

      return res.status(parseResult.status || 400).json({
        success: false,
        error: parseResult.body?.error || {
          code: "PARSING_FAILED",
          message: "Failed to extract text or entities from uploaded resume."
        },
        timestamp: new Date().toISOString()
      });
    });
  });

  // List all resumes for current user
  app.get("/api/resumes", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const result = runPythonResume("list_resumes", { user_id: user.id });
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // Get specific resume by ID
  app.get("/api/resumes/:id", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const resumeId = parseInt(req.params.id, 10);
    if (isNaN(resumeId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Resume ID must be a valid integer."
        },
        timestamp: new Date().toISOString()
      });
    }

    const user = req.user!;
    const result = runPythonResume("get_resume", {
      resume_id: resumeId,
      user_id: user.id
    });

    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // Delete resume by ID
  app.delete("/api/resumes/:id", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const resumeId = parseInt(req.params.id, 10);
    if (isNaN(resumeId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Resume ID must be a valid integer."
        },
        timestamp: new Date().toISOString()
      });
    }

    const user = req.user!;
    const result = runPythonResume("delete_resume", {
      resume_id: resumeId,
      user_id: user.id
    });

    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // Part 4: NLP and Skill Extraction Endpoints
  // ============================================================================

  // Extract skills from resume or raw text using spaCy & NLTK
  app.post("/api/analysis/extract-skills", (req: Request, res: Response) => {
    // Optional token extraction if user is logged in
    let userId: number | undefined = undefined;
    const authHeader = req.headers["authorization"];
    const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
        userId = decoded.id;
      } catch {}
    }

    const { resume_id, text, filename } = req.body || {};

    if (!resume_id && (!text || !text.trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_INPUT",
          message: "Please provide either 'resume_id' or 'text' for NLP skill extraction."
        },
        timestamp: new Date().toISOString()
      });
    }

    const nlpResult = runPythonNlp("extract_skills", {
      resume_id: resume_id ? parseInt(resume_id, 10) : undefined,
      text: text || "",
      filename: filename || "",
      user_id: userId
    });

    return res.status(nlpResult.status).json({
      ...nlpResult.body,
      timestamp: new Date().toISOString()
    });
  });

  // Get full skill taxonomy dataset and categories
  app.get("/api/analysis/skills/taxonomy", (_req: Request, res: Response) => {
    const result = runPythonNlp("get_taxonomy", {});
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // Normalize single or multiple skill strings into canonical taxonomy representation
  app.post("/api/analysis/normalize", (req: Request, res: Response) => {
    const { skills, skill } = req.body || {};
    const skillsToNormalize = skills || (skill ? [skill] : []);
    const result = runPythonNlp("normalize_skills", { skills: skillsToNormalize });
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // Run NLP extraction validation across multiple sample resumes
  app.post("/api/analysis/test-samples", (_req: Request, res: Response) => {
    const result = runPythonNlp("test_samples", {});
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // Get extracted skills stored in SQLite for a specific resume
  app.get("/api/analysis/skills/extracted/:resume_id", (req: Request, res: Response) => {
    const resumeId = parseInt(req.params.resume_id, 10);
    if (isNaN(resumeId)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "Resume ID must be a valid integer." },
        timestamp: new Date().toISOString()
      });
    }

    const result = runPythonNlp("extract_skills", { resume_id: resumeId });
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // Part 5: Job Roles and Semantic Matching Endpoints
  // ============================================================================

  // Get all target job roles from SQLite
  app.get("/api/jobs", (_req: Request, res: Response) => {
    const result = runPythonMatching("get_jobs", {});
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // Get specific job role by ID
  app.get("/api/jobs/:id", (req: Request, res: Response) => {
    const jobId = parseInt(req.params.id, 10);
    if (isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "Job ID must be a valid integer." },
        timestamp: new Date().toISOString()
      });
    }

    const result = runPythonMatching("get_job", { job_id: jobId });
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // Perform Semantic Skill Matching using Sentence Transformers (all-MiniLM-L6-v2)
  app.post("/api/analysis/match", (req: Request, res: Response) => {
    const { job_id, job_title, resume_id, skills, text } = req.body || {};

    if (!job_id && !job_title) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_JOB_ROLE",
          message: "Please provide 'job_id' or 'job_title' to perform semantic skill matching."
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = runPythonMatching("match_skills", {
      job_id: job_id ? parseInt(job_id, 10) : undefined,
      job_title: job_title || undefined,
      resume_id: resume_id ? parseInt(resume_id, 10) : undefined,
      skills: Array.isArray(skills) ? skills : undefined,
      text: typeof text === "string" ? text : undefined
    });

    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // Run benchmark comparison across multiple candidates and job roles
  app.post("/api/analysis/match/benchmark", (_req: Request, res: Response) => {
    const result = runPythonMatching("test_multi", {});
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // Part 6: Skill Gap Analysis & Gemini Personalized Learning Roadmap
  // ============================================================================

  // Detailed Skill Gap Calculation (Matched, Missing, Recommended, Match %, Priority Skills)
  app.post("/api/analysis/gap", (req: Request, res: Response) => {
    const { job_id, job_title, resume_id, skills, text } = req.body || {};

    if (!job_id && !job_title) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_JOB_ROLE",
          message: "Please provide 'job_id' or 'job_title' to calculate skill gap analysis."
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = runPythonMatching("skill_gap", {
      job_id: job_id ? parseInt(job_id, 10) : undefined,
      job_title: job_title || undefined,
      resume_id: resume_id ? parseInt(resume_id, 10) : undefined,
      skills: Array.isArray(skills) ? skills : undefined,
      text: typeof text === "string" ? text : undefined
    });

    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // Generate Personalized Learning Roadmap using Google Gemini API & SQLite
  app.post("/api/roadmap/generate", async (req: Request, res: Response) => {
    try {
      // Optional authenticated user id
      let userId: number | undefined = undefined;
      const authHeader = req.headers["authorization"];
      const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
          userId = decoded.id;
        } catch {}
      }

      const { 
        job_id, 
        job_title, 
        resume_id, 
        skills, 
        missing_skills, 
        experience_level, 
        duration_weeks 
      } = req.body || {};

      let effectiveJobTitle = job_title || "";
      let targetJobId = job_id ? parseInt(job_id, 10) : undefined;
      let candidateSkills: string[] = Array.isArray(skills) ? skills : [];
      let gapData: any = null;

      // 1. If missing_skills are not explicitly provided, calculate skill gap first
      if ((!missing_skills || missing_skills.length === 0) || !effectiveJobTitle) {
        const gapResult = runPythonMatching("skill_gap", {
          job_id: targetJobId,
          job_title: effectiveJobTitle || undefined,
          resume_id: resume_id ? parseInt(resume_id, 10) : undefined,
          skills: candidateSkills.length > 0 ? candidateSkills : undefined
        });

        if (gapResult.status === 200 && gapResult.body?.data) {
          gapData = gapResult.body.data;
          effectiveJobTitle = gapData.job?.job_title || effectiveJobTitle || "Software Engineer";
          targetJobId = gapData.job?.id || targetJobId;
        }
      }

      const effectiveExpLevel = experience_level || gapData?.job?.experience_level || "Entry / Mid-Level";
      const missingSkillsPayload = gapData?.missing_skills || missing_skills || [];
      const matchedSkillsPayload = gapData?.matched_skills || [];
      const recommendedSkillsPayload = gapData?.recommended_skills || [];
      const prioritySkillsPayload = gapData?.priority_skills || null;
      const matchPct = gapData?.skill_match_percentage ?? null;

      // 2. Call Google Gemini API (with fallback engine)
      const generatedPlan = await generateGeminiRoadmap({
        job_title: effectiveJobTitle || "Software Engineer",
        experience_level: effectiveExpLevel,
        candidate_skills: candidateSkills,
        missing_skills: missingSkillsPayload,
        duration_weeks: duration_weeks || 4
      });

      // 3. Persist Roadmap in SQLite Database
      let savedRoadmapId: number | null = null;
      try {
        savedRoadmapId = await saveRoadmapToDb({
          user_id: userId || null,
          resume_id: resume_id ? parseInt(resume_id, 10) : null,
          target_job_id: targetJobId || null,
          job_title: effectiveJobTitle || "Software Engineer",
          experience_level: effectiveExpLevel,
          match_percentage: matchPct,
          matched_skills: matchedSkillsPayload,
          missing_skills: missingSkillsPayload,
          recommended_skills: recommendedSkillsPayload,
          priority_skills: prioritySkillsPayload,
          duration_weeks: generatedPlan.duration_weeks,
          weekly_plan: generatedPlan.weekly_plan,
          overview: generatedPlan.overview,
          advice: generatedPlan.strategic_advice,
          model_used: generatedPlan.model_used
        });
      } catch (dbErr: any) {
        console.warn("[Database] Could not persist roadmap to SQLite:", dbErr.message);
      }

      return res.status(201).json({
        success: true,
        message: `Personalized ${generatedPlan.duration_weeks}-week learning roadmap generated successfully.`,
        data: {
          id: savedRoadmapId,
          job_title: effectiveJobTitle,
          experience_level: effectiveExpLevel,
          duration_weeks: generatedPlan.duration_weeks,
          match_percentage: matchPct,
          skill_gap: gapData,
          overview: generatedPlan.overview,
          weekly_plan: generatedPlan.weekly_plan,
          strategic_advice: generatedPlan.strategic_advice,
          milestone_checklist: generatedPlan.milestone_checklist,
          model_used: generatedPlan.model_used,
          created_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[Roadmap API Error]", err);
      return res.status(500).json({
        success: false,
        error: {
          code: "ROADMAP_GENERATION_FAILED",
          message: err.message || "Failed to generate learning roadmap."
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get specific generated roadmap by ID from SQLite
  app.get("/api/roadmap/:id", async (req: Request, res: Response) => {
    const roadmapId = parseInt(req.params.id, 10);
    if (isNaN(roadmapId)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "Roadmap ID must be a valid integer." },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const roadmap = await getRoadmapByIdFromDb(roadmapId);
      if (!roadmap) {
        return res.status(404).json({
          success: false,
          error: { code: "ROADMAP_NOT_FOUND", message: `Learning roadmap with ID ${roadmapId} not found in database.` },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: `Roadmap #${roadmapId} for '${roadmap.job_title}' retrieved successfully.`,
        data: roadmap,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "DB_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // List recent generated roadmaps from SQLite
  app.get("/api/roadmaps", async (req: Request, res: Response) => {
    try {
      let userId: number | undefined = undefined;
      const authHeader = req.headers["authorization"];
      const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
          userId = decoded.id;
        } catch {}
      }

      const roadmaps = await getRecentRoadmapsFromDb(20, userId);
      return res.status(200).json({
        success: true,
        message: `Retrieved ${roadmaps.length} recent roadmaps from SQLite.`,
        data: {
          roadmaps,
          total: roadmaps.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "DB_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // ============================================================================
  // Part 7: GitHub Portfolio Profiler (GitHub REST API + SQLite)
  // ============================================================================

  function runPythonGitHub(action: string, payload: any): { status: number; body: any } {
    const inputJson = JSON.stringify(payload).replace(/'/g, "'\\''");
    const cmd = `python3 backend/github_cli.py ${action} '${inputJson}'`;
    try {
      const output = execSync(cmd, { encoding: "utf-8", timeout: 25000 });
      const parsed = parseJsonFromOutput(output);
      const status = parsed.success ? 200 : (parsed.error?.status || 400);
      return { status, body: parsed };
    } catch (err: any) {
      if (err.stdout) {
        try {
          const parsed = parseJsonFromOutput(err.stdout);
          const status = parsed.success ? 200 : (parsed.error?.status || 400);
          return { status, body: parsed };
        } catch {}
      }
      return {
        status: 500,
        body: {
          success: false,
          error: {
            code: "GITHUB_ANALYSIS_FAILED",
            message: err.message || "Failed to analyze GitHub portfolio."
          }
        }
      };
    }
  }

  // POST /api/github/analyze - Analyze a GitHub profile by username or URL
  app.post("/api/github/analyze", (req: Request, res: Response) => {
    let userId: number | undefined = undefined;
    const authHeader = req.headers["authorization"];
    const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
        userId = decoded.id;
      } catch {}
    }

    const { username, profile_url, url } = req.body || {};
    const targetIdentifier = username || profile_url || url;

    if (!targetIdentifier || typeof targetIdentifier !== "string" || !targetIdentifier.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_USERNAME",
          message: "Please provide a GitHub profile URL (e.g. https://github.com/username) or username."
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = runPythonGitHub("analyze_github", {
      username: targetIdentifier.trim(),
      user_id: userId || null
    });

    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/github/:id - Retrieve analyzed profile by SQLite record ID
  app.get("/api/github/:id", (req: Request, res: Response) => {
    const profileId = parseInt(req.params.id, 10);
    if (isNaN(profileId)) {
      // If it's non-numeric, try looking up by username
      const result = runPythonGitHub("get_github_by_username", { username: req.params.id });
      return res.status(result.status).json({
        ...result.body,
        timestamp: new Date().toISOString()
      });
    }

    const result = runPythonGitHub("get_github_by_id", { id: profileId });
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/github/user/:username - Retrieve analyzed profile by username
  app.get("/api/github/user/:username", (req: Request, res: Response) => {
    const username = req.params.username;
    const result = runPythonGitHub("get_github_by_username", { username });
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/github/profiles - List recent analyzed GitHub profiles
  app.get("/api/github/profiles", (req: Request, res: Response) => {
    let userId: number | undefined = undefined;
    const authHeader = req.headers["authorization"];
    const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
        userId = decoded.id;
      } catch {}
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = runPythonGitHub("list_github_profiles", { limit, user_id: userId });
    return res.status(result.status).json({
      ...result.body,
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // Part 8: ATS Resume Rewriter and Cover Letter Generator (Google Gemini API)
  // ============================================================================

  // POST /api/ats/calculate-score - Calculate ATS Score and 4-dimension breakdown
  app.post("/api/ats/calculate-score", (req: Request, res: Response) => {
    try {
      const { resume_id, resume_text, candidate_skills, job_id, job_title, required_skills, parsed_data } = req.body || {};
      const result = calculateAtsMetricsViaCli({
        resume_id: resume_id ? parseInt(resume_id, 10) : undefined,
        resume_text,
        candidate_skills,
        job_id: job_id ? parseInt(job_id, 10) : undefined,
        job_title,
        required_skills,
        parsed_data
      });
      return res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "ATS_CALCULATION_FAILED", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/ats/rewrite - Re-write resume for ATS compatibility and compute ATS score
  app.post("/api/ats/rewrite", async (req: Request, res: Response) => {
    try {
      let userId: number | undefined = undefined;
      const authHeader = req.headers["authorization"];
      const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
          userId = decoded.id;
        } catch {}
      }

      const {
        resume_id,
        resume_text,
        candidate_name,
        job_id,
        job_title,
        required_skills,
        missing_skills,
        candidate_skills,
        parsed_data
      } = req.body || {};

      let effectiveResumeText = resume_text || "";
      let effectiveCandidateName = candidate_name || "Candidate";
      let effectiveJobTitle = job_title || "Software Engineer";
      let effectiveRequiredSkills: string[] = Array.isArray(required_skills) ? required_skills : [];
      let effectiveMissingSkills: string[] = Array.isArray(missing_skills) ? missing_skills : [];
      let effectiveCandidateSkills: string[] = Array.isArray(candidate_skills) ? candidate_skills : [];
      let effectiveParsedData = parsed_data || null;

      // Pull resume data from DB if resume_id is provided
      if (resume_id) {
        const resumeRes = runPythonResume("get_resume", { id: parseInt(resume_id, 10) });
        if (resumeRes.status === 200 && resumeRes.body?.data) {
          const rData = resumeRes.body.data;
          effectiveResumeText = effectiveResumeText || rData.raw_text || "";
          effectiveParsedData = effectiveParsedData || rData.parsed_data;
          effectiveCandidateName = effectiveCandidateName === "Candidate" ? (rData.parsed_data?.contact?.name || rData.original_filename?.replace(/\.[^/.]+$/, "") || "Candidate") : effectiveCandidateName;
          if (effectiveCandidateSkills.length === 0 && rData.parsed_data?.skills?.all_skills) {
            effectiveCandidateSkills = rData.parsed_data.skills.all_skills;
          }
        }
      }

      // Pull job data if job_id is provided
      if (job_id) {
        const jobRes = runPythonMatching("get_job", { id: parseInt(job_id, 10) });
        if (jobRes.status === 200 && jobRes.body?.data) {
          const jData = jobRes.body.data;
          effectiveJobTitle = jData.job_title || effectiveJobTitle;
          if (effectiveRequiredSkills.length === 0 && jData.required_skills) {
            effectiveRequiredSkills = jData.required_skills;
          }
        }
      }

      // Calculate ATS Score & 4-dimension breakdown
      const metricsRes = calculateAtsMetricsViaCli({
        resume_id: resume_id ? parseInt(resume_id, 10) : undefined,
        resume_text: effectiveResumeText,
        candidate_skills: effectiveCandidateSkills,
        job_id: job_id ? parseInt(job_id, 10) : undefined,
        job_title: effectiveJobTitle,
        required_skills: effectiveRequiredSkills,
        parsed_data: effectiveParsedData
      });

      const metricsData = metricsRes.data || {};
      const atsScore = metricsData.ats_score ?? 78;
      const scoreBreakdown = metricsData.score_breakdown ?? {};

      // If missing skills were not passed, use missing keywords from metrics
      if (effectiveMissingSkills.length === 0 && scoreBreakdown.keyword_coverage?.missing_keywords) {
        effectiveMissingSkills = scoreBreakdown.keyword_coverage.missing_keywords;
      }

      // Generate ATS rewrite using Gemini API
      const rewriteResult = await generateGeminiAtsRewrite({
        resume_text: effectiveResumeText || "Software Engineer with experience in Python, SQL, REST APIs and Git.",
        candidate_name: effectiveCandidateName,
        job_title: effectiveJobTitle,
        required_skills: effectiveRequiredSkills.length > 0 ? effectiveRequiredSkills : ["Python", "SQL", "Git", "REST APIs"],
        missing_skills: effectiveMissingSkills,
        parsed_data: effectiveParsedData
      });

      // Persist in SQLite
      let savedId: number | null = null;
      try {
        savedId = await saveAtsRewriteToDb({
          user_id: userId || null,
          resume_id: resume_id ? parseInt(resume_id, 10) : null,
          target_job_id: job_id ? parseInt(job_id, 10) : null,
          job_title: effectiveJobTitle,
          candidate_name: rewriteResult.candidate_name || effectiveCandidateName,
          ats_score: atsScore,
          score_breakdown: scoreBreakdown,
          professional_summary: rewriteResult.professional_summary,
          improved_bullet_points: rewriteResult.improved_bullet_points,
          relevant_keywords: rewriteResult.relevant_keywords,
          ats_resume_content: rewriteResult.ats_resume_content,
          suggestions_audit: rewriteResult.suggestions_audit,
          model_used: rewriteResult.model_used
        });
      } catch (dbErr: any) {
        console.warn("[Database] Could not persist ATS rewrite to SQLite:", dbErr.message);
      }

      return res.status(200).json({
        success: true,
        message: `ATS Resume Rewrite generated for '${effectiveJobTitle}'. ATS Score: ${atsScore}/100.`,
        data: {
          id: savedId,
          job_title: effectiveJobTitle,
          candidate_name: rewriteResult.candidate_name || effectiveCandidateName,
          ats_score: atsScore,
          ats_score_label: `ATS Score: ${atsScore}/100`,
          score_breakdown: scoreBreakdown,
          professional_summary: rewriteResult.professional_summary,
          improved_bullet_points: rewriteResult.improved_bullet_points,
          relevant_keywords: rewriteResult.relevant_keywords,
          ats_resume_content: rewriteResult.ats_resume_content,
          suggestions_audit: rewriteResult.suggestions_audit,
          model_used: rewriteResult.model_used,
          created_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[ATS Rewrite API Error]", err);
      return res.status(500).json({
        success: false,
        error: {
          code: "ATS_REWRITE_FAILED",
          message: err.message || "Failed to generate ATS resume rewrite."
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/ats/:id - Retrieve specific ATS rewrite from SQLite
  app.get("/api/ats/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "ATS Rewrite ID must be an integer." },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const rewrite = await getAtsRewriteByIdFromDb(id);
      if (!rewrite) {
        return res.status(404).json({
          success: false,
          error: { code: "REWRITE_NOT_FOUND", message: `ATS Rewrite #${id} not found.` },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: `ATS rewrite #${id} retrieved.`,
        data: rewrite,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "DB_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/ats/history - Retrieve recent ATS rewrites
  app.get("/api/ats/history", async (req: Request, res: Response) => {
    try {
      let userId: number | undefined = undefined;
      const authHeader = req.headers["authorization"];
      const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
          userId = decoded.id;
        } catch {}
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const rewrites = await getRecentAtsRewritesFromDb(limit, userId);
      return res.status(200).json({
        success: true,
        message: `Retrieved ${rewrites.length} recent ATS rewrites.`,
        data: {
          rewrites,
          total: rewrites.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "DB_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/cover-letter/generate - Generate customized cover letter using Gemini API
  app.post("/api/cover-letter/generate", async (req: Request, res: Response) => {
    try {
      let userId: number | undefined = undefined;
      const authHeader = req.headers["authorization"];
      const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
          userId = decoded.id;
        } catch {}
      }

      const {
        resume_id,
        resume_text,
        candidate_name,
        candidate_email,
        candidate_phone,
        job_id,
        job_title,
        company_name,
        recipient_name,
        tone,
        relevant_skills
      } = req.body || {};

      let effectiveResumeText = resume_text || "";
      let effectiveCandidateName = candidate_name || "Candidate";
      let effectiveCandidateEmail = candidate_email || "";
      let effectiveCandidatePhone = candidate_phone || "";
      let effectiveJobTitle = job_title || "Software Engineer";
      let effectiveCompanyName = company_name || "Target Organization";
      let effectiveRecipientName = recipient_name || "Hiring Manager";
      let effectiveTone = tone || "Professional & Confident";
      let effectiveSkills: string[] = Array.isArray(relevant_skills) ? relevant_skills : [];

      if (resume_id) {
        const resumeRes = runPythonResume("get_resume", { id: parseInt(resume_id, 10) });
        if (resumeRes.status === 200 && resumeRes.body?.data) {
          const rData = resumeRes.body.data;
          effectiveResumeText = effectiveResumeText || rData.raw_text || "";
          if (effectiveCandidateName === "Candidate") {
            effectiveCandidateName = rData.parsed_data?.contact?.name || rData.original_filename?.replace(/\.[^/.]+$/, "") || "Candidate";
          }
          effectiveCandidateEmail = effectiveCandidateEmail || rData.parsed_data?.contact?.email || "";
          effectiveCandidatePhone = effectiveCandidatePhone || rData.parsed_data?.contact?.phone || "";
          if (effectiveSkills.length === 0 && rData.parsed_data?.skills?.all_skills) {
            effectiveSkills = rData.parsed_data.skills.all_skills.slice(0, 5);
          }
        }
      }

      if (job_id) {
        const jobRes = runPythonMatching("get_job", { id: parseInt(job_id, 10) });
        if (jobRes.status === 200 && jobRes.body?.data) {
          const jData = jobRes.body.data;
          effectiveJobTitle = jData.job_title || effectiveJobTitle;
          if (effectiveSkills.length === 0 && jData.required_skills) {
            effectiveSkills = jData.required_skills.slice(0, 5);
          }
        }
      }

      const letterResult = await generateGeminiCoverLetter({
        candidate_name: effectiveCandidateName,
        candidate_email: effectiveCandidateEmail,
        candidate_phone: effectiveCandidatePhone,
        job_title: effectiveJobTitle,
        company_name: effectiveCompanyName,
        recipient_name: effectiveRecipientName,
        tone: effectiveTone,
        relevant_skills: effectiveSkills,
        resume_text: effectiveResumeText
      });

      let savedId: number | null = null;
      try {
        savedId = await saveCoverLetterToDb({
          user_id: userId || null,
          resume_id: resume_id ? parseInt(resume_id, 10) : null,
          target_job_id: job_id ? parseInt(job_id, 10) : null,
          job_title: effectiveJobTitle,
          candidate_name: letterResult.candidate_name,
          company_name: letterResult.company_name,
          recipient_name: letterResult.recipient_name,
          tone: letterResult.tone,
          cover_letter_text: letterResult.cover_letter_text,
          key_highlights: letterResult.key_highlights,
          model_used: letterResult.model_used
        });
      } catch (dbErr: any) {
        console.warn("[Database] Could not persist cover letter to SQLite:", dbErr.message);
      }

      return res.status(200).json({
        success: true,
        message: `Cover letter generated for '${effectiveJobTitle}' at '${effectiveCompanyName}'.`,
        data: {
          id: savedId,
          job_title: effectiveJobTitle,
          candidate_name: letterResult.candidate_name,
          company_name: letterResult.company_name,
          recipient_name: letterResult.recipient_name,
          tone: letterResult.tone,
          cover_letter_text: letterResult.cover_letter_text,
          key_highlights: letterResult.key_highlights,
          model_used: letterResult.model_used,
          created_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[Cover Letter API Error]", err);
      return res.status(500).json({
        success: false,
        error: {
          code: "COVER_LETTER_FAILED",
          message: err.message || "Failed to generate cover letter."
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/cover-letter/:id - Retrieve specific cover letter from SQLite
  app.get("/api/cover-letter/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "Cover letter ID must be an integer." },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const letter = await getCoverLetterByIdFromDb(id);
      if (!letter) {
        return res.status(404).json({
          success: false,
          error: { code: "LETTER_NOT_FOUND", message: `Cover letter #${id} not found.` },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: `Cover letter #${id} retrieved.`,
        data: letter,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "DB_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/cover-letter/history - Retrieve recent cover letters
  app.get("/api/cover-letter/history", async (req: Request, res: Response) => {
    try {
      let userId: number | undefined = undefined;
      const authHeader = req.headers["authorization"];
      const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
          userId = decoded.id;
        } catch {}
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const letters = await getRecentCoverLettersFromDb(limit, userId);
      return res.status(200).json({
        success: true,
        message: `Retrieved ${letters.length} recent cover letters.`,
        data: {
          cover_letters: letters,
          total: letters.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "DB_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // =========================================================================
  // PART 9: AI MOCK INTERVIEW ENDPOINTS (Google Gemini API & SQLite)
  // =========================================================================

  // POST /api/interview/start - Generate tailored questions & initialize session
  app.post("/api/interview/start", async (req: Request, res: Response) => {
    try {
      const {
        resume_id,
        job_id,
        job_title: customJobTitle,
        candidate_name: customCandidateName,
        resume_skills: customResumeSkills,
        missing_skills: customMissingSkills,
        experience_level = "Mid-Level",
        question_count = 5
      } = req.body;

      let userId: number | undefined = undefined;
      const authHeader = req.headers["authorization"];
      const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
          userId = decoded.id;
        } catch {}
      }

      let jobTitle = customJobTitle || "Software Engineer";
      let candidateName = customCandidateName || "Candidate";
      let candidateSkills: string[] = customResumeSkills || [];
      let missingSkills: string[] = customMissingSkills || [];
      let experienceSummary = "";

      // Lookup resume if resume_id is provided
      if (resume_id) {
        const resumeResult = runPythonResume("get", { id: resume_id });
        if (resumeResult.status === 200 && resumeResult.body.data) {
          const rData = resumeResult.body.data;
          if (rData.parsed_data?.contact?.name) {
            candidateName = rData.parsed_data.contact.name;
          }
          if (rData.parsed_data?.skills?.skills_by_category) {
            const allExtractedSkills: string[] = [];
            Object.values(rData.parsed_data.skills.skills_by_category).forEach((list: any) => {
              if (Array.isArray(list)) allExtractedSkills.push(...list);
            });
            if (allExtractedSkills.length > 0 && candidateSkills.length === 0) {
              candidateSkills = Array.from(new Set(allExtractedSkills));
            }
          }
          if (rData.parsed_data?.experience && Array.isArray(rData.parsed_data.experience)) {
            experienceSummary = rData.parsed_data.experience.map((e: any) => `${e.title || "Role"} at ${e.company || "Company"}: ${(e.responsibilities || []).join(", ")}`).join(" | ");
          }
        }
      }

      // Lookup target job if job_id is provided
      if (job_id) {
        const jobResult = runPythonMatching("get_job", { id: job_id });
        if (jobResult.status === 200 && jobResult.body.data?.job) {
          const jData = jobResult.body.data.job;
          jobTitle = jData.job_title;
          const requiredSkills: string[] = jData.required_skills || [];
          if (candidateSkills.length > 0) {
            const candLower = new Set(candidateSkills.map(s => s.toLowerCase()));
            missingSkills = requiredSkills.filter(req => !candLower.has(req.toLowerCase()));
          } else {
            missingSkills = requiredSkills.slice(0, 3);
          }
        }
      }

      // Generate questions using Google Gemini API
      const questionsResult = await generateMockInterviewQuestions({
        job_title: jobTitle,
        candidate_name: candidateName,
        resume_skills: candidateSkills,
        missing_skills: missingSkills,
        experience_level,
        experience_summary: experienceSummary,
        question_count: Math.min(Math.max(Number(question_count) || 5, 3), 8)
      });

      // Save initial interview record to SQLite
      const dbResult = createInterviewInDb({
        user_id: userId,
        resume_id: resume_id ? Number(resume_id) : null,
        target_job_id: job_id ? Number(job_id) : null,
        job_title: jobTitle,
        candidate_name: candidateName,
        experience_level,
        total_questions: questionsResult.questions.length,
        questions_data: questionsResult.questions,
        model_used: questionsResult.model_used
      });

      return res.status(201).json({
        success: true,
        message: `AI Mock Interview created with ${questionsResult.questions.length} questions for '${jobTitle}'.`,
        data: {
          interview_id: dbResult.interview_id,
          job_title: jobTitle,
          candidate_name: candidateName,
          experience_level,
          total_questions: questionsResult.questions.length,
          questions: questionsResult.questions,
          model_used: questionsResult.model_used,
          created_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[Interview Start API Error]", err);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERVIEW_START_FAILED",
          message: err.message || "Failed to start AI mock interview."
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/interview/answer - Submit and evaluate an individual answer
  app.post("/api/interview/answer", async (req: Request, res: Response) => {
    try {
      const {
        interview_id,
        question_id,
        question_text,
        category = "technical",
        target_skill = "Technical",
        user_answer = "",
        input_type = "text",
        expected_key_points = [],
        job_title = "Software Engineer"
      } = req.body;

      if (!interview_id) {
        return res.status(400).json({
          success: false,
          error: { code: "MISSING_INTERVIEW_ID", message: "interview_id is required." },
          timestamp: new Date().toISOString()
        });
      }

      // Evaluate individual answer with Gemini
      const evalResult = await evaluateSingleAnswer({
        question_text,
        category,
        target_skill,
        user_answer,
        expected_key_points,
        job_title
      });

      // Record answer into SQLite
      const dbResult = recordAnswerInDb({
        interview_id: Number(interview_id),
        question_id: Number(question_id) || 1,
        question_text,
        category,
        target_skill,
        user_answer,
        input_type: input_type === "voice" ? "voice" : "text",
        score: evalResult.score,
        feedback: evalResult.feedback,
        strengths: evalResult.strengths,
        areas_for_improvement: evalResult.areas_for_improvement,
        sample_improved_answer: evalResult.sample_improved_answer
      });

      if (!dbResult.success) {
        return res.status(404).json({
          success: false,
          error: { code: "INTERVIEW_NOT_FOUND", message: dbResult.error },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: `Answer recorded for question #${question_id}. Score: ${evalResult.score}/100.`,
        data: {
          interview_id: Number(interview_id),
          question_id: Number(question_id),
          score: evalResult.score,
          feedback: evalResult.feedback,
          strengths: evalResult.strengths,
          areas_for_improvement: evalResult.areas_for_improvement,
          sample_improved_answer: evalResult.sample_improved_answer,
          answered_questions: dbResult.answered_questions,
          total_questions: dbResult.total_questions
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[Interview Answer API Error]", err);
      return res.status(500).json({
        success: false,
        error: {
          code: "ANSWER_EVAL_FAILED",
          message: err.message || "Failed to evaluate interview answer."
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/interview/evaluate - Final evaluation of the completed interview
  app.post("/api/interview/evaluate", async (req: Request, res: Response) => {
    try {
      const { interview_id } = req.body;

      if (!interview_id) {
        return res.status(400).json({
          success: false,
          error: { code: "MISSING_INTERVIEW_ID", message: "interview_id is required." },
          timestamp: new Date().toISOString()
        });
      }

      // Fetch interview from SQLite
      const interviewRecord = getInterviewByIdFromDb(Number(interview_id));
      if (!interviewRecord.success || !interviewRecord.interview) {
        return res.status(404).json({
          success: false,
          error: { code: "INTERVIEW_NOT_FOUND", message: `Interview #${interview_id} not found.` },
          timestamp: new Date().toISOString()
        });
      }

      const interview = interviewRecord.interview;
      const answers = interview.answers || [];

      // Evaluate full interview via Gemini
      const fullEval = await evaluateFullMockInterview({
        interview_id: Number(interview_id),
        job_title: interview.job_title,
        candidate_name: interview.candidate_name,
        experience_level: interview.experience_level,
        answers
      });

      // Save evaluation in SQLite
      saveEvaluationInDb(fullEval);

      return res.status(200).json({
        success: true,
        message: `Interview #${interview_id} evaluated. Overall Score: ${fullEval.overall_score}/100.`,
        data: fullEval,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[Interview Evaluate API Error]", err);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERVIEW_EVAL_FAILED",
          message: err.message || "Failed to evaluate completed interview."
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/interview/history - Retrieve list of past mock interviews
  app.get("/api/interview/history", async (req: Request, res: Response) => {
    try {
      let userId: number | undefined = undefined;
      const authHeader = req.headers["authorization"];
      const token = req.cookies?.auth_token || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
          userId = decoded.id;
        } catch {}
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const listResult = getRecentInterviewsFromDb(userId, limit);

      return res.status(200).json({
        success: true,
        message: `Retrieved ${listResult.interviews?.length || 0} mock interview records.`,
        data: {
          interviews: listResult.interviews || [],
          total: listResult.interviews?.length || 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "DB_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/interview/:id - Retrieve specific interview details
  app.get("/api/interview/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "Interview ID must be an integer." },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const result = getInterviewByIdFromDb(id);
      if (!result.success || !result.interview) {
        return res.status(404).json({
          success: false,
          error: { code: "INTERVIEW_NOT_FOUND", message: `Interview #${id} not found.` },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: `Interview #${id} retrieved.`,
        data: result.interview,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "DB_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // Helper for Python Salary CLI
  function runPythonSalaryCli(action: string, payload: any = {}): any {
    const inputJson = JSON.stringify(payload).replace(/'/g, "'\\''");
    const cmd = `python3 backend/salary_cli.py ${action} '${inputJson}'`;
    try {
      const output = execSync(cmd, { encoding: "utf-8", timeout: 20000 });
      const trimmed = output.trim();
      const jsonStart = trimmed.indexOf("{");
      if (jsonStart !== -1) {
        return JSON.parse(trimmed.slice(jsonStart));
      }
      return JSON.parse(trimmed);
    } catch (err: any) {
      console.error(`[Python Salary CLI Error - ${action}]:`, err.message);
      throw new Error(`Salary CLI Error: ${err.message}`);
    }
  }

  // ==========================================
  // PART 10: MARKET SALARY PREDICTOR (SCIKIT-LEARN)
  // ==========================================

  // POST /api/salary/predict - Predict salary range using Scikit-learn regression
  app.post("/api/salary/predict", async (req: Request, res: Response) => {
    try {
      let {
        job_role,
        experience_years,
        education_level,
        skills,
        resume_id,
        target_job_id
      } = req.body;

      // Extract user from auth token if available
      let userId: number | null = null;
      const token = req.cookies?.auth_token;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.user_id || decoded.id || null;
        } catch {}
      }

      // If resume_id is provided and fields are missing, attempt auto-enrichment
      if (resume_id && (!skills || skills.length === 0 || !job_role)) {
        try {
          const resumeResult = runPythonResume("get", { id: resume_id });
          if (resumeResult.status === 200 && resumeResult.body.data) {
            const rData = resumeResult.body.data;
            if (!job_role && rData.parsed_data?.experience?.[0]?.title) {
              job_role = rData.parsed_data.experience[0].title;
            }
            if ((!skills || skills.length === 0) && rData.parsed_data?.skills?.skills_by_category) {
              const extSkills: string[] = [];
              Object.values(rData.parsed_data.skills.skills_by_category).forEach((list: any) => {
                if (Array.isArray(list)) extSkills.push(...list);
              });
              if (extSkills.length > 0) {
                skills = Array.from(new Set(extSkills));
              }
            }
          }
        } catch {}
      }

      // If target_job_id is provided and skills are empty, auto-supplement
      if (target_job_id && (!skills || skills.length === 0 || !job_role)) {
        try {
          const jobResult = runPythonMatching("get_job", { id: target_job_id });
          if (jobResult.status === 200 && jobResult.body.data?.job) {
            const jData = jobResult.body.data.job;
            if (!job_role) job_role = jData.job_title;
            if (!skills || skills.length === 0) skills = jData.required_skills;
          }
        } catch {}
      }

      const payload = {
        job_role: job_role || "Software Engineer",
        experience_years: parseFloat(experience_years ?? 3.0),
        education_level: education_level || "Bachelor's Degree",
        skills: Array.isArray(skills) ? skills : [],
        resume_id: resume_id ? parseInt(resume_id, 10) : null,
        target_job_id: target_job_id ? parseInt(target_job_id, 10) : null,
        user_id: userId
      };

      const result = runPythonSalaryCli("predict", payload);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || { code: "PREDICTION_FAILED", message: "Failed to predict market salary." },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[POST /api/salary/predict Error]:", err);
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/salary/history - Retrieve previous salary prediction history
  app.get("/api/salary/history", async (req: Request, res: Response) => {
    try {
      let userId: number | null = null;
      const token = req.cookies?.auth_token;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.user_id || decoded.id || null;
        } catch {}
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const result = runPythonSalaryCli("list_predictions", { limit, user_id: userId });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/salary/metadata - Retrieve available roles, education tiers, and model meta
  app.get("/api/salary/metadata", async (_req: Request, res: Response) => {
    try {
      const result = runPythonSalaryCli("get_metadata", {});
      return res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/salary/train - Admin trigger to retrain Scikit-learn regression model
  app.post("/api/salary/train", async (_req: Request, res: Response) => {
    try {
      const result = runPythonSalaryCli("train_model", {});
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "TRAIN_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/salary/:id - Retrieve specific prediction by ID
  app.get("/api/salary/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "Prediction ID must be an integer." },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const result = runPythonSalaryCli("get_prediction", { id });
      if (!result.success || !result.data) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Salary prediction #${id} not found.` },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // ==========================================
  // PART 11: ADAPTIVE KNOWLEDGE QUIZ ENDPOINTS
  // ==========================================

  // POST /api/quiz/start - Start a new adaptive knowledge quiz session
  app.post("/api/quiz/start", async (req: Request, res: Response) => {
    try {
      let {
        user_id,
        resume_id,
        target_job_id,
        job_role,
        missing_skills,
        priority_skills,
        total_questions = 5,
        initial_difficulty = "medium"
      } = req.body;

      // Extract user ID from token if authenticated
      if (!user_id && req.cookies?.auth_token) {
        try {
          const decoded = jwt.verify(req.cookies.auth_token, JWT_SECRET) as any;
          user_id = decoded.user_id || decoded.id || null;
        } catch {}
      }

      // If missing_skills or priority_skills are not supplied, fetch from resume / job
      if ((!missing_skills || missing_skills.length === 0) && resume_id) {
        try {
          const rRes = runPythonResume("get_resume", { id: resume_id });
          if (rRes.status === 200 && rRes.body.data?.resume) {
            const pData = rRes.body.data.resume.parsed_data;
            if (pData?.skills?.all_skills) {
              // Get candidate skills
            }
          }
        } catch {}
      }

      if (target_job_id && (!job_role || !priority_skills || priority_skills.length === 0)) {
        try {
          const jobRes = runPythonMatching("get_job", { id: target_job_id });
          if (jobRes.status === 200 && jobRes.body.data?.job) {
            const jData = jobRes.body.data.job;
            if (!job_role) job_role = jData.job_title;
            if (!priority_skills || priority_skills.length === 0) priority_skills = jData.priority_skills || jData.required_skills;
          }
        } catch {}
      }

      const role = job_role || "Software Engineer";
      const totalQ = Math.max(3, Math.min(10, parseInt(total_questions, 10) || 5));
      const initDiff: QuizDifficulty = (["easy", "medium", "hard"].includes(initial_difficulty) ? initial_difficulty : "medium") as QuizDifficulty;

      const missingArr: string[] = Array.isArray(missing_skills) ? missing_skills : [];
      const priorityArr: string[] = Array.isArray(priority_skills) ? priority_skills : [];

      const candidateSkills = [
        ...missingArr,
        ...priorityArr,
        ...(role.includes("Data") ? ["Python", "SQL", "Pandas", "Scikit-Learn"] :
           role.includes("AI") || role.includes("ML") ? ["Python", "PyTorch", "Deep Learning", "Transformers"] :
           role.includes("Full Stack") ? ["React", "TypeScript", "Node.js", "REST APIs"] :
           ["Data Structures", "Algorithms", "Python", "SQL", "Git"])
      ];

      const firstTargetSkill = candidateSkills[0] || "Python";

      // Generate first question via Gemini or curated domain bank
      const firstQuestion = await generateAdaptiveQuizQuestion({
        job_role: role,
        target_skill: firstTargetSkill,
        difficulty: initDiff,
        question_number: 1,
        total_questions: totalQ,
        previous_questions: [],
        missing_skills: missingArr,
        priority_skills: priorityArr
      });

      // Save initial attempt to SQLite
      const startResult = runPythonQuizCli("start_quiz", {
        user_id: user_id ? parseInt(user_id, 10) : null,
        resume_id: resume_id ? parseInt(resume_id, 10) : null,
        target_job_id: target_job_id ? parseInt(target_job_id, 10) : null,
        job_role: role,
        missing_skills: missingArr,
        priority_skills: priorityArr,
        total_questions: totalQ,
        initial_difficulty: initDiff,
        first_question: firstQuestion,
        model_used: firstQuestion.model_used || "gemini-3.7-flash"
      });

      if (!startResult.success) {
        return res.status(500).json({
          success: false,
          error: startResult.error || { code: "START_FAILED", message: "Failed to initialize quiz in database." },
          timestamp: new Date().toISOString()
        });
      }

      // Return sanitized question (omit correct_answer and explanation to client)
      return res.status(200).json({
        success: true,
        message: "Adaptive Knowledge Quiz started successfully.",
        data: {
          session_id: startResult.quiz_id,
          job_role: role,
          total_questions: totalQ,
          current_difficulty: initDiff,
          question_number: 1,
          question: {
            id: firstQuestion.id,
            skill: firstQuestion.skill,
            difficulty: firstQuestion.difficulty,
            question: firstQuestion.question,
            options: firstQuestion.options,
            concept_tested: firstQuestion.concept_tested
          },
          target_skills: candidateSkills.slice(0, 8),
          missing_skills: missingArr,
          priority_skills: priorityArr
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[POST /api/quiz/start Error]:", err);
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/quiz/answer - Submit answer, evaluate correctness, adapt difficulty, generate/fetch next question or finalize
  app.post("/api/quiz/answer", async (req: Request, res: Response) => {
    try {
      const { session_id, question_id, selected_option, time_taken_seconds = 0 } = req.body;

      if (!session_id || question_id === undefined || !selected_option) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_PARAMS", message: "session_id, question_id, and selected_option are required." },
          timestamp: new Date().toISOString()
        });
      }

      // Fetch active session from SQLite
      const getRes = runPythonQuizCli("get_quiz", { id: session_id });
      if (!getRes.success || !getRes.quiz) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Quiz session #${session_id} not found.` },
          timestamp: new Date().toISOString()
        });
      }

      const quiz = getRes.quiz;
      if (quiz.status === "completed") {
        return res.status(400).json({
          success: false,
          error: { code: "ALREADY_COMPLETED", message: "This quiz session has already concluded." },
          timestamp: new Date().toISOString()
        });
      }

      const questionsData: any[] = Array.isArray(quiz.questions_data) ? quiz.questions_data : [];
      const currentIdx = quiz.current_question_index;
      const totalQ = quiz.total_questions;

      // Identify targeted question
      let targetQ = questionsData.find((q: any) => q.id === question_id);
      if (!targetQ && currentIdx < questionsData.length) {
        targetQ = questionsData[currentIdx];
      }

      if (!targetQ) {
        return res.status(400).json({
          success: false,
          error: { code: "QUESTION_NOT_FOUND", message: `Question #${question_id} not found in quiz session.` },
          timestamp: new Date().toISOString()
        });
      }

      const correctAnswer = targetQ.correct_answer || "";
      const isCorrect = (selected_option.trim() === correctAnswer.trim());
      const explanation = targetQ.explanation || (isCorrect ? "Correct answer!" : `The correct answer is: ${correctAnswer}`);
      const currentDifficulty = (targetQ.difficulty || quiz.current_difficulty || "medium") as QuizDifficulty;

      // ADAPTIVE BEHAVIOR DIFFICULTY TRANSITION:
      // Correct -> increase difficulty (easy -> medium, medium -> hard, hard -> hard)
      // Incorrect -> decrease difficulty (hard -> medium, medium -> easy, easy -> easy)
      let nextDifficulty: QuizDifficulty = currentDifficulty;
      if (isCorrect) {
        if (currentDifficulty === "easy") nextDifficulty = "medium";
        else if (currentDifficulty === "medium") nextDifficulty = "hard";
        else nextDifficulty = "hard";
      } else {
        if (currentDifficulty === "hard") nextDifficulty = "medium";
        else if (currentDifficulty === "medium") nextDifficulty = "easy";
        else nextDifficulty = "easy";
      }

      const nextQuestionNumber = currentIdx + 2; // current question is currentIdx + 1

      if (nextQuestionNumber <= totalQ) {
        // Quiz has more questions: generate next question with adaptive difficulty
        const missingArr: string[] = Array.isArray(quiz.missing_skills) ? quiz.missing_skills : [];
        const priorityArr: string[] = Array.isArray(quiz.priority_skills) ? quiz.priority_skills : [];
        const candidateSkills = [
          ...missingArr,
          ...priorityArr,
          ...(quiz.job_role.includes("Data") ? ["Python", "SQL", "Pandas", "Scikit-Learn"] :
             quiz.job_role.includes("AI") || quiz.job_role.includes("ML") ? ["Python", "PyTorch", "Deep Learning", "Transformers"] :
             quiz.job_role.includes("Full Stack") ? ["React", "TypeScript", "Node.js", "REST APIs"] :
             ["Data Structures", "Algorithms", "Python", "SQL", "Git"])
        ];

        const nextSkill = candidateSkills[(currentIdx + 1) % candidateSkills.length] || "Python";
        const previousQuestions = questionsData.map((q: any) => q.question);

        const nextQuestion = await generateAdaptiveQuizQuestion({
          job_role: quiz.job_role,
          target_skill: nextSkill,
          difficulty: nextDifficulty,
          question_number: nextQuestionNumber,
          total_questions: totalQ,
          previous_questions: previousQuestions,
          missing_skills: missingArr,
          priority_skills: priorityArr
        });

        // Record answer and append next question in SQLite
        const recResult = runPythonQuizCli("record_answer", {
          quiz_id: session_id,
          question_id: targetQ.id,
          selected_option,
          is_correct: isCorrect,
          correct_answer: correctAnswer,
          explanation,
          next_difficulty: nextDifficulty,
          next_question: nextQuestion,
          time_taken_seconds
        });

        return res.status(200).json({
          success: true,
          message: isCorrect ? "Correct answer! Difficulty adjusted upwards." : "Incorrect. Adjusting difficulty to reinforce fundamentals.",
          data: {
            session_id,
            is_correct: isCorrect,
            selected_option,
            correct_answer: correctAnswer,
            explanation,
            current_score: recResult.score,
            score_percentage: recResult.score_percentage,
            question_number: currentIdx + 1,
            total_questions: totalQ,
            next_difficulty: nextDifficulty,
            is_completed: false,
            next_question: {
              id: nextQuestion.id,
              skill: nextQuestion.skill,
              difficulty: nextQuestion.difficulty,
              question: nextQuestion.question,
              options: nextQuestion.options,
              concept_tested: nextQuestion.concept_tested
            }
          },
          timestamp: new Date().toISOString()
        });
      } else {
        // Last question answered! Finalize quiz and synthesize analytics
        const recResult = runPythonQuizCli("record_answer", {
          quiz_id: session_id,
          question_id: targetQ.id,
          selected_option,
          is_correct: isCorrect,
          correct_answer: correctAnswer,
          explanation,
          next_difficulty: nextDifficulty,
          next_question: null,
          time_taken_seconds
        });

        // Fetch all answers for summary synthesis
        const updatedQuizRes = runPythonQuizCli("get_quiz", { id: session_id });
        const allAnswers = updatedQuizRes.quiz?.answers_data || [];

        // Synthesize results using Gemini
        const summaryAnalysis = await generateQuizSummaryWithGemini({
          job_role: quiz.job_role,
          score: recResult.score,
          total_questions: totalQ,
          answers_data: allAnswers,
          missing_skills: quiz.missing_skills,
          priority_skills: quiz.priority_skills
        });

        // Finish quiz in SQLite
        const finishRes = runPythonQuizCli("finish_quiz", {
          quiz_id: session_id,
          weak_areas: summaryAnalysis.weak_areas,
          strong_areas: summaryAnalysis.strong_areas,
          recommended_topics: summaryAnalysis.recommended_topics,
          summary_notes: summaryAnalysis.summary_notes
        });

        return res.status(200).json({
          success: true,
          message: "Quiz completed! Full results and study recommendations generated.",
          data: {
            session_id,
            is_correct: isCorrect,
            selected_option,
            correct_answer: correctAnswer,
            explanation,
            current_score: recResult.score,
            total_questions: totalQ,
            is_completed: true,
            next_question: null,
            final_results: finishRes.quiz
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error("[POST /api/quiz/answer Error]:", err);
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/quiz/finish - Conclude quiz attempt early and compute results
  app.post("/api/quiz/finish", async (req: Request, res: Response) => {
    try {
      const { session_id } = req.body;
      if (!session_id) {
        return res.status(400).json({
          success: false,
          error: { code: "MISSING_SESSION_ID", message: "session_id is required." },
          timestamp: new Date().toISOString()
        });
      }

      const getRes = runPythonQuizCli("get_quiz", { id: session_id });
      if (!getRes.success || !getRes.quiz) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Quiz session #${session_id} not found.` },
          timestamp: new Date().toISOString()
        });
      }

      const quiz = getRes.quiz;
      const allAnswers = quiz.answers_data || [];
      const score = quiz.score || 0;
      const totalQ = Math.max(allAnswers.length, quiz.total_questions || 1);

      // Synthesize results
      const summaryAnalysis = await generateQuizSummaryWithGemini({
        job_role: quiz.job_role,
        score,
        total_questions: totalQ,
        answers_data: allAnswers,
        missing_skills: quiz.missing_skills,
        priority_skills: quiz.priority_skills
      });

      const finishRes = runPythonQuizCli("finish_quiz", {
        quiz_id: session_id,
        weak_areas: summaryAnalysis.weak_areas,
        strong_areas: summaryAnalysis.strong_areas,
        recommended_topics: summaryAnalysis.recommended_topics,
        summary_notes: summaryAnalysis.summary_notes
      });

      return res.status(200).json({
        success: true,
        message: "Quiz session concluded successfully.",
        data: finishRes.quiz,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/quiz/history - Retrieve list of past quiz attempts
  app.get("/api/quiz/history", async (req: Request, res: Response) => {
    try {
      let userId: number | null = null;
      if (req.cookies?.auth_token) {
        try {
          const decoded = jwt.verify(req.cookies.auth_token, JWT_SECRET) as any;
          userId = decoded.user_id || decoded.id || null;
        } catch {}
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const result = runPythonQuizCli("get_history", { user_id: userId, limit });

      return res.status(200).json({
        success: true,
        data: result.history || [],
        count: result.count || 0,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/quiz/:id - Retrieve single quiz attempt by ID
  app.get("/api/quiz/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "Quiz ID must be an integer." },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const result = runPythonQuizCli("get_quiz", { id });
      if (!result.success || !result.quiz) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Quiz #${id} not found.` },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        data: result.quiz,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // DELETE /api/quiz/:id - Delete quiz attempt
  app.delete("/api/quiz/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "Quiz ID must be an integer." },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const result = runPythonQuizCli("delete_quiz", { id });
      return res.status(200).json({
        success: true,
        message: result.message || `Quiz #${id} deleted.`,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/dashboard/overview - Aggregated Part 12 Dashboard data
  app.get("/api/dashboard/overview", async (req: Request, res: Response) => {
    try {
      let userId: number | null = null;
      if (req.cookies?.auth_token) {
        try {
          const decoded = jwt.verify(req.cookies.auth_token, JWT_SECRET) as any;
          userId = decoded.user_id || decoded.id || null;
        } catch {}
      }

      const inputPayload = JSON.stringify({ user_id: userId }).replace(/'/g, "'\\''");
      const cmd = `python3 backend/dashboard_cli.py get_overview '${inputPayload}'`;
      const output = execSync(cmd, { encoding: "utf-8", timeout: 25000 });
      const parsed = parseJsonFromOutput(output);

      return res.status(200).json({
        success: true,
        data: parsed.data,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[GET /api/dashboard/overview Error]:", err);
      return res.status(500).json({
        success: false,
        error: { code: "DASHBOARD_FETCH_ERROR", message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/interview/tts - Helper to test pyttsx3 or get speech synthesis info
  app.post("/api/interview/tts", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      const cmd = `python3 backend/interview_cli.py tts_synthesize '${JSON.stringify({ text: text || "Welcome to your mock interview." }).replace(/'/g, "'\\''")}'`;
      const output = execSync(cmd, { encoding: "utf-8", timeout: 10000 });
      const parsed = parseJsonFromOutput(output);
      return res.status(200).json({
        success: true,
        data: parsed,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(200).json({
        success: true,
        data: {
          engine: "web_speech_api",
          message: "Frontend Web Speech API synthesis is active and primary."
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Resume Skill Gap Analyzer] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
