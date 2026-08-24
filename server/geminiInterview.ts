import { GoogleGenAI, Type } from "@google/genai";
import { execSync } from "child_process";

// Lazy-initialized Gemini Client instance
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}

export type QuestionCategory = "technical" | "behavioral" | "hr";

export interface InterviewQuestion {
  id: number;
  category: QuestionCategory;
  target_skill: string;
  question: string;
  context_rationale: string;
  hints_or_tips: string;
  expected_key_points: string[];
}

export interface InterviewAnswerRecord {
  question_id: number;
  question_text: string;
  category: QuestionCategory;
  target_skill: string;
  user_answer: string;
  input_type: "text" | "voice";
  score: number;
  feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
  sample_improved_answer: string;
  answered_at?: string;
}

export interface GeneratedQuestionsResult {
  job_title: string;
  candidate_name: string;
  experience_level: string;
  questions: InterviewQuestion[];
  model_used: string;
}

export interface SingleAnswerEvaluationResult {
  question_id: number;
  score: number;
  strengths: string[];
  areas_for_improvement: string[];
  feedback: string;
  sample_improved_answer: string;
  model_used: string;
}

export interface FullInterviewEvaluationResult {
  interview_id: number;
  overall_score: number;
  technical_score: number;
  behavioral_score: number;
  hr_score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  suggested_improvements: string[];
  readiness_verdict: string;
  model_used: string;
}

function callWithTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Python CLI runner helper for SQLite Interview operations
function runPythonInterviewCli(action: string, payload: any): any {
  const inputJson = JSON.stringify(payload).replace(/'/g, "'\\''");
  const cmd = `python3 backend/interview_cli.py ${action} '${inputJson}'`;
  try {
    const output = execSync(cmd, { encoding: "utf-8", timeout: 20000 });
    const parsed = JSON.parse(output.trim());
    return parsed;
  } catch (err: any) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.trim());
      } catch {}
    }
    throw new Error(`Interview CLI execution failed: ${err.message}`);
  }
}

/**
 * Generates tailored interview questions based on:
 * - Selected job role
 * - Candidate resume skills
 * - Missing skills (gap analysis)
 * - Experience level and background
 * Covers Technical, Behavioral, and HR categories.
 */
export async function generateMockInterviewQuestions(payload: {
  job_title: string;
  candidate_name?: string;
  resume_skills?: string[];
  missing_skills?: string[];
  experience_level?: string;
  experience_summary?: string;
  question_count?: number;
}): Promise<GeneratedQuestionsResult> {
  const jobTitle = payload.job_title || "Software Engineer";
  const candidateName = payload.candidate_name || "Candidate";
  const resumeSkills = (payload.resume_skills && payload.resume_skills.length > 0)
    ? payload.resume_skills
    : ["Python", "SQL", "Git", "Problem Solving"];
  const missingSkills = (payload.missing_skills && payload.missing_skills.length > 0)
    ? payload.missing_skills
    : ["System Design", "Docker", "REST APIs"];
  const experienceLevel = payload.experience_level || "Mid-Level";
  const totalCount = Math.min(Math.max(payload.question_count || 5, 3), 8);

  const client = getGeminiClient();

  if (client) {
    try {
      const prompt = `You are a Principal Technical Recruiter and Senior Engineering Interviewer conducting an AI Mock Interview.
Generate exactly ${totalCount} tailored, realistic interview questions for:

Candidate Name: ${candidateName}
Target Job Role: ${jobTitle}
Experience Level: ${experienceLevel}
Verified Resume Skills: ${resumeSkills.join(", ")}
Identified Skill Gaps (Missing Skills to probe): ${missingSkills.join(", ")}
Background Summary: ${payload.experience_summary || "Software engineering candidate with project and industry background."}

REQUIREMENTS:
1. Question Balance:
   - Must include Technical questions probing both the candidate's existing strengths AND their identified missing skill gaps.
   - Must include Behavioral questions applying the STAR framework (Situation, Task, Action, Result) based on teamwork, deadlines, or production incidents.
   - Must include HR questions assessing culture alignment, career trajectory, motivation, and professional expectations.
2. Questions must be concrete, realistic, and directly relevant to ${jobTitle}.
3. Provide helpful answering tips (STAR method, system design principles, etc.) and expected key points for each question.

Return ONLY a JSON object matching this exact schema:
{
  "questions": [
    {
      "id": 1,
      "category": "technical",
      "target_skill": "string",
      "question": "string",
      "context_rationale": "string explaining why this is asked based on resume or gap",
      "hints_or_tips": "string with advice on how to structure the response",
      "expected_key_points": ["point 1", "point 2", "point 3"]
    }
  ]
}`;

      const response = await client.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    category: { type: Type.STRING, enum: ["technical", "behavioral", "hr"] },
                    target_skill: { type: Type.STRING },
                    question: { type: Type.STRING },
                    context_rationale: { type: Type.STRING },
                    hints_or_tips: { type: Type.STRING },
                    expected_key_points: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["id", "category", "target_skill", "question", "context_rationale", "hints_or_tips", "expected_key_points"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          const validatedQuestions: InterviewQuestion[] = parsed.questions.map((q: any, idx: number) => ({
            id: idx + 1,
            category: (["technical", "behavioral", "hr"].includes(q.category) ? q.category : "technical") as QuestionCategory,
            target_skill: q.target_skill || resumeSkills[idx % resumeSkills.length] || "General Engineering",
            question: q.question || `Describe your experience with ${jobTitle} workflows.`,
            context_rationale: q.context_rationale || `Assesses core competencies for ${jobTitle}.`,
            hints_or_tips: q.hints_or_tips || "Structure your answer with clear context, your specific role, and measurable outcomes.",
            expected_key_points: Array.isArray(q.expected_key_points) ? q.expected_key_points : ["Core concept explanation", "Real-world trade-offs", "Production safety"]
          }));

          return {
            job_title: jobTitle,
            candidate_name: candidateName,
            experience_level: experienceLevel,
            questions: validatedQuestions,
            model_used: "gemini-3.7-flash"
          };
        }
      }
    } catch (err: any) {
      console.warn("Gemini question generation error, falling back to rule-based generator:", err.message);
    }
  }

  // High quality deterministic fallback questions
  return generateFallbackQuestions(jobTitle, candidateName, experienceLevel, resumeSkills, missingSkills, totalCount);
}

function generateFallbackQuestions(
  jobTitle: string,
  candidateName: string,
  experienceLevel: string,
  resumeSkills: string[],
  missingSkills: string[],
  totalCount: number
): GeneratedQuestionsResult {
  const primaryResumeSkill = resumeSkills[0] || "Python";
  const secondaryResumeSkill = resumeSkills[1] || "Database Optimization";
  const primaryGapSkill = missingSkills[0] || "System Architecture & Scalability";

  const allPossibleQuestions: InterviewQuestion[] = [
    {
      id: 1,
      category: "technical",
      target_skill: primaryResumeSkill,
      question: `In your recent projects utilizing ${primaryResumeSkill}, what was the most complex technical challenge you resolved, and how did you diagnose the root cause?`,
      context_rationale: `Directly verifies hands-on mastery of ${primaryResumeSkill} listed as a core strength on your resume.`,
      hints_or_tips: `Discuss the specific architecture, debugging tools utilized (e.g. profilers, logs), and benchmark results.`,
      expected_key_points: [
        `Clear definition of the technical bottleneck or bug in ${primaryResumeSkill}`,
        `Step-by-step diagnostic and debugging methodology`,
        `Quantified improvement or latency reduction achieved`
      ]
    },
    {
      id: 2,
      category: "technical",
      target_skill: primaryGapSkill,
      question: `As a ${jobTitle}, how would you approach designing a resilient service or architecture using ${primaryGapSkill}? Walk us through your design decisions and trade-offs.`,
      context_rationale: `Probes your foundational understanding of ${primaryGapSkill}, identified as a key target requirement for this role.`,
      hints_or_tips: `Acknowledge where you have applied similar concepts, outline high-level component diagrams, and explain error-handling patterns.`,
      expected_key_points: [
        `High-level architecture and data flow decomposition`,
        `Handling concurrency, error recovery, and data consistency`,
        `Evaluation of trade-offs between complexity and scalability`
      ]
    },
    {
      id: 3,
      category: "behavioral",
      target_skill: "Cross-Functional Collaboration & Conflict",
      question: `Tell me about a time when you strongly disagreed with a team member or stakeholder regarding a technical approach or deadline. How did you resolve it?`,
      context_rationale: `Assesses interpersonal communication, constructive debate, and commitment to project goals under pressure.`,
      hints_or_tips: `Use the STAR format (Situation, Task, Action, Result). Focus on objective data, active listening, and the ultimate business outcome.`,
      expected_key_points: [
        `Clear description of the disagreement without blaming individuals`,
        `Collaborative methods used to evaluate options objectively (benchmarks, prototypes)`,
        `Positive resolution and alignment achieved for the team`
      ]
    },
    {
      id: 4,
      category: "behavioral",
      target_skill: "Prioritization & Ambiguity",
      question: `Describe a situation where project requirements shifted abruptly mid-sprint or where you had to deliver with limited specifications. What steps did you take?`,
      context_rationale: `Evaluates agility, problem-solving in ambiguous environments, and proactive communication.`,
      hints_or_tips: `Highlight how you established baseline requirements, prioritized critical path items, and kept stakeholders informed.`,
      expected_key_points: [
        `Rapid triage of critical requirements vs nice-to-haves`,
        `Direct stakeholder communication and expectation management`,
        `Successful delivery of working MVP within acceptable timeline`
      ]
    },
    {
      id: 5,
      category: "hr",
      target_skill: "Career Growth & Culture Fit",
      question: `What motivated you to pursue the ${jobTitle} role, and what specific technical or leadership milestones do you want to accomplish in the next 1-2 years?`,
      context_rationale: `Gauges cultural alignment, intrinsic motivation, and long-term career intentionality.`,
      hints_or_tips: `Connect your past technical trajectory directly with this role's opportunities and articulate concrete learning goals.`,
      expected_key_points: [
        `Genuine enthusiasm and informed understanding of the ${jobTitle} domain`,
        `Clear roadmap for expanding technical depth and mentoring contributions`,
        `Alignment between personal growth objectives and company milestones`
      ]
    }
  ];

  return {
    job_title: jobTitle,
    candidate_name: candidateName,
    experience_level: experienceLevel,
    questions: allPossibleQuestions.slice(0, totalCount),
    model_used: "gemini_fallback (deterministic)"
  };
}

/**
 * Evaluates a single question answer in real-time.
 */
export async function evaluateSingleAnswer(payload: {
  question_text: string;
  category: QuestionCategory;
  target_skill: string;
  user_answer: string;
  expected_key_points?: string[];
  job_title?: string;
}): Promise<SingleAnswerEvaluationResult> {
  const answerText = (payload.user_answer || "").trim();
  const client = getGeminiClient();

  if (!answerText) {
    return {
      question_id: 1,
      score: 0,
      strengths: [],
      areas_for_improvement: ["No answer provided."],
      feedback: "Please provide an answer using either text input or microphone speech-to-text.",
      sample_improved_answer: "A comprehensive answer should address the core question and provide specific technical context.",
      model_used: "local_eval"
    };
  }

  if (client) {
    try {
      const prompt = `You are a Senior Technical Interview Evaluator evaluating a candidate's answer.

Question: "${payload.question_text}"
Category: ${payload.category}
Target Skill: ${payload.target_skill}
Target Job Title: ${payload.job_title || "Software Engineer"}
Expected Key Points: ${(payload.expected_key_points || []).join(", ")}

Candidate's Answer:
"${answerText}"

Evaluate the answer objectively on a scale of 0-100 based on:
1. Relevance to the specific question asked.
2. Technical depth / STAR methodology completeness.
3. Clarity, structure, and inclusion of concrete examples or metrics.

Return ONLY a JSON object:
{
  "score": 85,
  "strengths": ["Clear explanation of...", "Demonstrated practical knowledge of..."],
  "areas_for_improvement": ["Could quantify the latency impact...", "Consider mentioning..."],
  "feedback": "Concise 2-sentence summary feedback on the answer.",
  "sample_improved_answer": "An exemplary, polished 2-4 sentence response hitting all key criteria."
}`;

      const response = await client.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              areas_for_improvement: { type: Type.ARRAY, items: { type: Type.STRING } },
              feedback: { type: Type.STRING },
              sample_improved_answer: { type: Type.STRING }
            },
            required: ["score", "strengths", "areas_for_improvement", "feedback", "sample_improved_answer"]
          }
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        return {
          question_id: 1,
          score: Math.min(Math.max(parsed.score || 70, 0), 100),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Clear articulation of concept"],
          areas_for_improvement: Array.isArray(parsed.areas_for_improvement) ? parsed.areas_for_improvement : ["Add specific metrics"],
          feedback: parsed.feedback || "Good foundation with relevant details.",
          sample_improved_answer: parsed.sample_improved_answer || "Sample structured answer addressing all criteria.",
          model_used: "gemini-3.7-flash"
        };
      }
    } catch (err: any) {
      console.warn("Gemini single answer evaluation error, falling back:", err.message);
    }
  }

  // Fallback single evaluation
  const wordCount = answerText.split(/\s+/).filter(Boolean).length;
  let score = 65;
  if (wordCount > 60) score = 85;
  else if (wordCount > 30) score = 75;
  else if (wordCount < 10) score = 40;

  return {
    question_id: 1,
    score,
    strengths: [
      `Directly addressed the topic of ${payload.target_skill}`,
      `Demonstrated basic understanding of relevant engineering concepts`
    ],
    areas_for_improvement: [
      `Incorporate measurable results and metrics (e.g. latency, scale, team velocity)`,
      `Structure the response more explicitly around the STAR/CAR methodology`
    ],
    feedback: `The response demonstrates a foundational grasp of ${payload.target_skill}. Expanding on concrete production trade-offs will elevate your rating.`,
    sample_improved_answer: `In my previous project involving ${payload.target_skill}, I identified a performance bottleneck, implemented optimized data caching, and validated a 35% throughput increase in production.`,
    model_used: "gemini_fallback (heuristic)"
  };
}

/**
 * Evaluates the entire completed mock interview session and returns:
 * - Overall Interview Score (0-100)
 * - Category Scores (Technical, Behavioral, HR)
 * - Strengths
 * - Weaknesses
 * - Feedback
 * - Suggested Improvements
 * - Readiness Verdict
 */
export async function evaluateFullMockInterview(payload: {
  interview_id: number;
  job_title: string;
  candidate_name?: string;
  experience_level?: string;
  answers: InterviewAnswerRecord[];
}): Promise<FullInterviewEvaluationResult> {
  const { interview_id, job_title, answers } = payload;
  const candidateName = payload.candidate_name || "Candidate";
  const experienceLevel = payload.experience_level || "Mid-Level";

  const client = getGeminiClient();

  if (client && answers.length > 0) {
    try {
      const answersSummary = answers.map((a, i) => `
Question ${i + 1} [${a.category.toUpperCase()} - Skill: ${a.target_skill}]: "${a.question_text}"
Candidate Answer: "${a.user_answer}"
Individual Answer Score: ${a.score}/100
`).join("\n");

      const prompt = `You are the Lead Hiring Committee Chair conducting the final evaluation for an AI Mock Interview.

Candidate: ${candidateName}
Target Job Role: ${job_title}
Experience Level: ${experienceLevel}
Session Transcripts & Answers:
${answersSummary}

Evaluate the entire interview and generate:
1. Overall Interview Score (0-100)
2. Technical Score (0-100)
3. Behavioral Score (0-100)
4. HR & Cultural Alignment Score (0-100)
5. Key Strengths (3-5 bullet points)
6. Key Weaknesses / Gaps (2-4 bullet points)
7. Comprehensive Feedback Summary (2-3 detailed paragraphs)
8. Suggested Improvements & Next Steps (3-5 concrete action items)
9. Readiness Verdict (e.g. "Strong Hire Candidate (Ready)", "Solid Candidate (Minor Practice Needed)", "Foundational (Requires Deep Study)")

Return ONLY a JSON object matching this schema:
{
  "overall_score": 82,
  "technical_score": 80,
  "behavioral_score": 85,
  "hr_score": 84,
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "feedback": "...",
  "suggested_improvements": ["...", "..."],
  "readiness_verdict": "..."
}`;

      const response = await client.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overall_score: { type: Type.INTEGER },
              technical_score: { type: Type.INTEGER },
              behavioral_score: { type: Type.INTEGER },
              hr_score: { type: Type.INTEGER },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              feedback: { type: Type.STRING },
              suggested_improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              readiness_verdict: { type: Type.STRING }
            },
            required: [
              "overall_score",
              "technical_score",
              "behavioral_score",
              "hr_score",
              "strengths",
              "weaknesses",
              "feedback",
              "suggested_improvements",
              "readiness_verdict"
            ]
          }
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        return {
          interview_id,
          overall_score: Math.min(Math.max(parsed.overall_score || 75, 0), 100),
          technical_score: Math.min(Math.max(parsed.technical_score || 75, 0), 100),
          behavioral_score: Math.min(Math.max(parsed.behavioral_score || 75, 0), 100),
          hr_score: Math.min(Math.max(parsed.hr_score || 75, 0), 100),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Strong fundamentals", "Clear communication"],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ["Could provide more production metrics"],
          feedback: parsed.feedback || "Overall solid performance across technical and behavioral questions.",
          suggested_improvements: Array.isArray(parsed.suggested_improvements) ? parsed.suggested_improvements : ["Practice STAR structured examples", "Deepen system scalability concepts"],
          readiness_verdict: parsed.readiness_verdict || "Solid Candidate (Minor Practice Needed)",
          model_used: "gemini-3.7-flash"
        };
      }
    } catch (err: any) {
      console.warn("Gemini full interview evaluation error, falling back:", err.message);
    }
  }

  // Fallback Full Evaluation
  const techAnswers = answers.filter(a => a.category === "technical");
  const behAnswers = answers.filter(a => a.category === "behavioral");
  const hrAnswers = answers.filter(a => a.category === "hr");

  const avg = (arr: InterviewAnswerRecord[]) => arr.length ? Math.round(arr.reduce((s, a) => s + (a.score || 70), 0) / arr.length) : 75;

  const techScore = avg(techAnswers);
  const behScore = avg(behAnswers);
  const hrScore = avg(hrAnswers);
  const overallScore = Math.round((techScore * 0.45) + (behScore * 0.35) + (hrScore * 0.20));

  let verdict = "Solid Candidate (Minor Practice Needed)";
  if (overallScore >= 85) verdict = "Strong Hire Candidate (Ready)";
  else if (overallScore < 65) verdict = "Foundational Candidate (Requires Technical Practice)";

  return {
    interview_id,
    overall_score: overallScore,
    technical_score: techScore,
    behavioral_score: behScore,
    hr_score: hrScore,
    strengths: [
      `Demonstrated coherent understanding of core concepts in ${job_title}`,
      `Structured communication with clear technical terminology`,
      `Demonstrated collaborative mindset in behavioral scenarios`
    ],
    weaknesses: [
      `Could provide more specific numerical metrics to demonstrate impact`,
      `Technical answers could go deeper into failure modes and architectural trade-offs`
    ],
    feedback: `${candidateName} demonstrated a solid foundation for the ${job_title} role (${experienceLevel}). Communication was clear and answers addressed the key points. Incorporating deeper system failure cases and quantitative metrics will further strengthen interview outcomes.`,
    suggested_improvements: [
      `Review production trade-offs and edge case handling for technical questions`,
      `Refine STAR stories with explicit quantification of results (e.g., % latency reduction, timeline savings)`,
      `Practice mock coding and system design whiteboard walkthroughs under timed conditions`
    ],
    readiness_verdict: verdict,
    model_used: "gemini_fallback (heuristic)"
  };
}

// Database helper functions using backend/interview_cli.py
export function createInterviewInDb(payload: {
  user_id?: number | null;
  resume_id?: number | null;
  target_job_id?: number | null;
  job_title: string;
  candidate_name?: string;
  experience_level?: string;
  total_questions?: number;
  questions_data: InterviewQuestion[];
  model_used?: string;
}) {
  return runPythonInterviewCli("create_interview", payload);
}

export function recordAnswerInDb(payload: {
  interview_id: number;
  question_id: number;
  question_text: string;
  category: QuestionCategory;
  target_skill: string;
  user_answer: string;
  input_type: "text" | "voice";
  score: number;
  feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
  sample_improved_answer: string;
}) {
  return runPythonInterviewCli("record_answer", payload);
}

export function saveEvaluationInDb(payload: FullInterviewEvaluationResult) {
  return runPythonInterviewCli("save_evaluation", payload);
}

export function getInterviewByIdFromDb(interviewId: number) {
  return runPythonInterviewCli("get_interview", { id: interviewId });
}

export function getRecentInterviewsFromDb(userId?: number | null, limit: number = 20) {
  return runPythonInterviewCli("list_interviews", { user_id: userId, limit });
}
