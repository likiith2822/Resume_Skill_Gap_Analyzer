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

export type QuizDifficulty = "easy" | "medium" | "hard";

export interface GeneratedQuizQuestion {
  id: number;
  skill: string;
  difficulty: QuizDifficulty;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  concept_tested: string;
  model_used: string;
}

export interface QuizQuestionPromptParams {
  job_role: string;
  target_skill: string;
  difficulty: QuizDifficulty;
  question_number: number;
  total_questions: number;
  previous_questions?: string[];
  missing_skills?: string[];
  priority_skills?: string[];
}

export interface QuizWeakArea {
  skill: string;
  reason: string;
  missed_count: number;
  difficulty_level: string;
  recommended_action: string;
}

export interface QuizStrongArea {
  skill: string;
  mastery_level: string;
  correct_count: number;
  highest_difficulty_cleared: string;
}

export interface QuizRecommendedTopic {
  topic: string;
  skill: string;
  importance: "High" | "Medium" | "Low";
  estimated_study_time: string;
  description: string;
  recommended_practice: string;
}

export interface QuizSummaryAnalysisResult {
  score: number;
  total: number;
  score_percentage: number;
  weak_areas: QuizWeakArea[];
  strong_areas: QuizStrongArea[];
  recommended_topics: QuizRecommendedTopic[];
  summary_notes: string;
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

// Python CLI runner helper for SQLite Quiz operations
export function runPythonQuizCli(action: string, payload: any): any {
  const inputJson = JSON.stringify(payload).replace(/'/g, "'\\''");
  const cmd = `python3 backend/quiz_cli.py ${action} '${inputJson}'`;
  try {
    const output = execSync(cmd, { encoding: "utf-8", timeout: 20000 });
    const parsed = JSON.parse(output.trim());
    return parsed;
  } catch (execErr: any) {
    if (execErr.stdout) {
      try {
        return JSON.parse(execErr.stdout.trim());
      } catch {}
    }
    return {
      success: false,
      error: { code: "CLI_ERROR", message: execErr.message || "Failed to execute quiz CLI script." }
    };
  }
}

// Curated domain fallback questions catalog
const FALLBACK_QUESTION_BANK: Record<string, Record<QuizDifficulty, Array<{
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  concept_tested: string;
}>>> = {
  "Python": {
    "easy": [
      {
        question: "In Python, what is the output of `type([1, 2, 3])`?",
        options: ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'set'>"],
        correct_answer: "<class 'list'>",
        explanation: "Square brackets define a built-in Python `list` object. Arrays in Python require the `array` module or NumPy.",
        concept_tested: "Core Data Types"
      },
      {
        question: "Which keyword is used to define an anonymous inline function in Python?",
        options: ["lambda", "def", "func", "inline"],
        correct_answer: "lambda",
        explanation: "The `lambda` keyword defines anonymous single-expression functions in Python, whereas `def` defines standard named functions.",
        concept_tested: "Lambda Functions"
      }
    ],
    "medium": [
      {
        question: "What is the primary difference between `is` and `==` in Python?",
        options: [
          "`is` checks memory identity (same object address), while `==` checks value equality.",
          "`is` checks value equality, while `==` checks memory identity.",
          "`is` is only used for numerical comparisons, while `==` is for strings.",
          "There is no difference; they are syntactic aliases."
        ],
        correct_answer: "`is` checks memory identity (same object address), while `==` checks value equality.",
        explanation: "`==` evaluates whether the values of two objects are equivalent using `__eq__`, whereas `is` checks whether two variables point to the exact same memory location (`id(a) == id(b)`).",
        concept_tested: "Identity vs Equality"
      },
      {
        question: "What happens when you pass a mutable object like a list as a default argument in a Python function definition `def append_to(element, target=[])`?",
        options: [
          "The default list is created once at function definition time and persists across subsequent calls.",
          "A fresh new empty list is instantiated on every function invocation.",
          "Python raises a `SyntaxError` at compilation time.",
          "The list is garbage collected immediately upon function return."
        ],
        correct_answer: "The default list is created once at function definition time and persists across subsequent calls.",
        explanation: "Default parameter values are evaluated once when the function definition is executed, meaning mutable defaults will retain modifications across calls.",
        concept_tested: "Mutable Default Arguments"
      }
    ],
    "hard": [
      {
        question: "In Python's asyncio event loop, how does `asyncio.gather(*tasks)` handle an exception raised by one task when `return_exceptions=False`?",
        options: [
          "It immediately propagates the first exception to the caller, while other tasks continue running in the background.",
          "It automatically cancels all other pending tasks and suppresses the exception.",
          "It aggregates all exceptions into an `ExceptionGroup` and waits for all tasks to finish.",
          "It restarts the failed task up to 3 times before failing."
        ],
        correct_answer: "It immediately propagates the first exception to the caller, while other tasks continue running in the background.",
        explanation: "When `return_exceptions=False` (default), the first raised exception is immediately propagated to the `await asyncio.gather()` caller, but the other tasks are NOT automatically cancelled.",
        concept_tested: "Asyncio Concurrency Error Handling"
      },
      {
        question: "How does Python's GIL (Global Interpreter Lock) impact CPU-bound multithreaded programs in CPython?",
        options: [
          "It restricts execution of Python bytecode to a single OS thread at a time, preventing multi-core speedup for CPU-bound tasks.",
          "It accelerates CPU-bound tasks by automatically vectorizing loops across SIMD registers.",
          "It prevents any multithreading from running in Python.",
          "It causes race conditions on all memory accesses without mutexes."
        ],
        correct_answer: "It restricts execution of Python bytecode to a single OS thread at a time, preventing multi-core speedup for CPU-bound tasks.",
        explanation: "The GIL ensures memory safety in CPython by permitting only one native thread to hold the Python interpreter lock and execute bytecode at any single instant.",
        concept_tested: "CPython GIL & Concurrency"
      }
    ]
  },
  "SQL": {
    "easy": [
      {
        question: "Which SQL clause is used to filter rows returned by a `SELECT` statement?",
        options: ["WHERE", "ORDER BY", "GROUP BY", "LIMIT"],
        correct_answer: "WHERE",
        explanation: "The `WHERE` clause specifies predicates to filter rows before any grouping or sorting occurs.",
        concept_tested: "Basic Filtering"
      }
    ],
    "medium": [
      {
        question: "What is the key difference between `WHERE` and `HAVING` clauses in SQL?",
        options: [
          "`WHERE` filters individual rows before aggregation; `HAVING` filters grouped rows after aggregation.",
          "`HAVING` filters individual rows before aggregation; `WHERE` filters grouped rows.",
          "`WHERE` is only used with subqueries, while `HAVING` is for joins.",
          "`HAVING` can only be used with primary keys."
        ],
        correct_answer: "`WHERE` filters individual rows before aggregation; `HAVING` filters grouped rows after aggregation.",
        explanation: "`WHERE` filters input rows prior to `GROUP BY`. `HAVING` operates on the aggregate result sets produced by aggregate functions (e.g. `COUNT()`, `SUM()`).",
        concept_tested: "Aggregation & Group Filtering"
      }
    ],
    "hard": [
      {
        question: "In SQL window functions, what is the difference between `RANK()` and `DENSE_RANK()` when duplicate values occur?",
        options: [
          "`RANK()` leaves gaps in rank numbering after ties (e.g. 1, 2, 2, 4), while `DENSE_RANK()` leaves no gaps (e.g. 1, 2, 2, 3).",
          "`DENSE_RANK()` leaves gaps in rank numbering, while `RANK()` does not.",
          "`RANK()` sorts ascending while `DENSE_RANK()` sorts descending.",
          "`DENSE_RANK()` can only be used with partitioned integer columns."
        ],
        correct_answer: "`RANK()` leaves gaps in rank numbering after ties (e.g. 1, 2, 2, 4), while `DENSE_RANK()` leaves no gaps (e.g. 1, 2, 2, 3).",
        explanation: "`RANK()` computes the rank based on row count offset resulting in gap jumps, whereas `DENSE_RANK()` assigns consecutive integer ranks without gaps.",
        concept_tested: "SQL Window Functions"
      }
    ]
  },
  "React": {
    "easy": [
      {
        question: "What React hook is primarily used to manage local component state?",
        options: ["useState", "useEffect", "useContext", "useReducer"],
        correct_answer: "useState",
        explanation: "`useState` declares a state variable and setter function to track and re-render local component state.",
        concept_tested: "React State Management"
      }
    ],
    "medium": [
      {
        question: "Why should you pass a callback function to `setState(prev => prev + 1)` instead of passing a raw value `setState(count + 1)` when updates depend on prior state?",
        options: [
          "State updates in React are batched and asynchronous, so the callback guarantees access to the latest state value.",
          "It forces React to bypass the virtual DOM comparison.",
          "Passing a callback prevents the component from re-rendering.",
          "Raw state updates are deprecated in React 18."
        ],
        correct_answer: "State updates in React are batched and asynchronous, so the callback guarantees access to the latest state value.",
        explanation: "Because React batches state updates for performance, the updater function `prev => ...` ensures you compute against the up-to-date queued state rather than a stale closure.",
        concept_tested: "Batched State Updates & Functional Setters"
      }
    ],
    "hard": [
      {
        question: "What is the primary purpose of `useSyncExternalStore` introduced in React 18?",
        options: [
          "To safely subscribe to external mutable stores and prevent tearing during concurrent rendering.",
          "To synchronize local component state with server-side SQLite databases.",
          "To memoize expensive mathematical computations across render cycles.",
          "To replace Redux in client-side state management."
        ],
        correct_answer: "To safely subscribe to external mutable stores and prevent tearing during concurrent rendering.",
        explanation: "`useSyncExternalStore` is a specialized hook recommended for library authors to subscribe to non-React external data sources synchronously to avoid visual tearing during concurrent transitions.",
        concept_tested: "Concurrent React & External Stores"
      }
    ]
  }
};

export function getFallbackQuestion(skill: string, difficulty: QuizDifficulty, questionIndex: number): GeneratedQuizQuestion {
  // Normalize skill key
  const normalizedSkill = Object.keys(FALLBACK_QUESTION_BANK).find(
    k => k.toLowerCase() === skill.toLowerCase()
  ) || "Python";

  const skillQuestions = FALLBACK_QUESTION_BANK[normalizedSkill] || FALLBACK_QUESTION_BANK["Python"];
  const list = skillQuestions[difficulty] || skillQuestions["medium"] || skillQuestions["easy"];
  const selected = list[questionIndex % list.length];

  return {
    id: questionIndex + 1,
    skill: skill || normalizedSkill,
    difficulty,
    question: selected.question,
    options: selected.options,
    correct_answer: selected.correct_answer,
    explanation: selected.explanation,
    concept_tested: selected.concept_tested,
    model_used: "domain-fallback-curriculum"
  };
}

/**
 * Generates an adaptive quiz question using Gemini API (gemini-3.7-flash) tailored to user skills and difficulty.
 */
export async function generateAdaptiveQuizQuestion(params: QuizQuestionPromptParams): Promise<GeneratedQuizQuestion> {
  const {
    job_role,
    target_skill,
    difficulty,
    question_number,
    total_questions,
    previous_questions = [],
    missing_skills = [],
    priority_skills = []
  } = params;

  const ai = getGeminiClient();
  if (!ai) {
    console.warn("[Adaptive Quiz]: GEMINI_API_KEY is not configured or offline. Serving curated domain fallback question.");
    return getFallbackQuestion(target_skill, difficulty, question_number - 1);
  }

  const difficultyGuidelines = {
    easy: "Focus on fundamental definitions, syntax, core concepts, and standard library behaviors. Clear, unambiguous options.",
    medium: "Focus on practical application, edge cases, common pitfalls, idiomatic patterns, and performance considerations. Plausible distractors.",
    hard: "Focus on deep architectural mechanics, concurrency/memory trade-offs, internal implementation details, complex troubleshooting, or optimization bottlenecks."
  };

  const systemInstruction = `You are a technical knowledge evaluation specialist crafting adaptive technical multiple-choice questions for software engineering, data science, and AI roles.
Your task is to generate ONE precise, high-quality multiple-choice question testing the specified skill and difficulty level.
Strictly adhere to:
1. Exactly 4 distinct, plausible options.
2. The correct_answer MUST match one of the 4 options verbatim.
3. Provide a clear, educational explanation explaining WHY the correct option is right and WHY the distractors are wrong.
4. Test real conceptual understanding or practical code behavior rather than trivia.
5. Avoid questions identical to: ${JSON.stringify(previous_questions.slice(-5))}`;

  const prompt = `Generate an adaptive quiz question for a candidate interviewing for the role of "${job_role}".
- Target Skill to test: "${target_skill}"
- Difficulty Level: "${difficulty}" (${difficultyGuidelines[difficulty]})
- Question Number: ${question_number} of ${total_questions}
- Candidate Missing Skills Context: ${missing_skills.join(", ") || "General role skills"}
- Priority Skills Context: ${priority_skills.join(", ") || "Core competencies"}

Return valid JSON with:
{
  "question": "The question text or code scenario",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correct_answer": "Exact text of the correct option",
  "explanation": "Detailed explanation of the correct answer and why others are incorrect",
  "concept_tested": "Specific sub-concept or topic tested"
}`;

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "The multiple choice question text." },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of exactly 4 multiple choice options."
              },
              correct_answer: { type: Type.STRING, description: "The exact matching text of the correct option." },
              explanation: { type: Type.STRING, description: "Detailed explanation of the solution." },
              concept_tested: { type: Type.STRING, description: "The specific sub-concept tested." }
            },
            required: ["question", "options", "correct_answer", "explanation", "concept_tested"]
          },
          temperature: 0.3
        }
      }),
      14000
    );

    const text = response.text ? response.text.trim() : "";
    const parsed = JSON.parse(text);

    if (
      parsed &&
      parsed.question &&
      Array.isArray(parsed.options) &&
      parsed.options.length >= 4 &&
      parsed.correct_answer
    ) {
      // Ensure correct_answer is in options
      if (!parsed.options.includes(parsed.correct_answer)) {
        parsed.options[0] = parsed.correct_answer;
      }

      return {
        id: question_number,
        skill: target_skill,
        difficulty,
        question: parsed.question,
        options: parsed.options.slice(0, 4),
        correct_answer: parsed.correct_answer,
        explanation: parsed.explanation || "Correct answer based on technical specifications.",
        concept_tested: parsed.concept_tested || target_skill,
        model_used: "gemini-3.7-flash"
      };
    }
  } catch (err: any) {
    console.error("[Adaptive Quiz Gemini Error]:", err.message || err);
  }

  // Graceful fallback
  return getFallbackQuestion(target_skill, difficulty, question_number - 1);
}

/**
 * Generates comprehensive quiz results analysis (Weak Areas, Strong Areas, Recommended Topics) using Gemini.
 */
export async function generateQuizSummaryWithGemini(params: {
  job_role: string;
  score: number;
  total_questions: number;
  answers_data: any[];
  missing_skills?: string[];
  priority_skills?: string[];
}): Promise<QuizSummaryAnalysisResult> {
  const { job_role, score, total_questions, answers_data, missing_skills = [], priority_skills = [] } = params;
  const score_pct = total_questions > 0 ? Math.round((score / total_questions) * 1000) / 10 : 0;

  const ai = getGeminiClient();

  // Deterministic fallback generator
  const buildDeterministicSummary = (): QuizSummaryAnalysisResult => {
    const skillStats: Record<string, { correct: number; total: number; difficulties: string[]; questions: string[] }> = {};
    for (const ans of answers_data) {
      const s = ans.skill || "General";
      if (!skillStats[s]) {
        skillStats[s] = { correct: 0, total: 0, difficulties: [], questions: [] };
      }
      skillStats[s].total += 1;
      if (ans.is_correct) skillStats[s].correct += 1;
      skillStats[s].difficulties.push(ans.difficulty || "medium");
      skillStats[s].questions.push(ans.question);
    }

    const weak_areas: QuizWeakArea[] = [];
    const strong_areas: QuizStrongArea[] = [];

    for (const [skill, stats] of Object.entries(skillStats)) {
      if (stats.correct < stats.total) {
        weak_areas.push({
          skill,
          reason: `Missed ${stats.total - stats.correct} of ${stats.total} question(s) tested.`,
          missed_count: stats.total - stats.correct,
          difficulty_level: stats.difficulties[stats.difficulties.length - 1] || "medium",
          recommended_action: `Review core syntax patterns and common failure modes in ${skill}.`
        });
      } else if (stats.correct > 0) {
        const hasHard = stats.difficulties.includes("hard");
        const hasMedium = stats.difficulties.includes("medium");
        strong_areas.push({
          skill,
          mastery_level: hasHard ? "Advanced Mastery" : (hasMedium ? "Solid Proficiency" : "Foundational"),
          correct_count: stats.correct,
          highest_difficulty_cleared: hasHard ? "Hard" : (hasMedium ? "Medium" : "Easy")
        });
      }
    }

    const recommended_topics: QuizRecommendedTopic[] = weak_areas.slice(0, 4).map(w => ({
      topic: `${w.skill} Architecture & Core Paradigms`,
      skill: w.skill,
      importance: "High",
      estimated_study_time: "2-3 hours",
      description: `Targeted review of ${w.skill} focusing on algorithmic application and architectural patterns.`,
      recommended_practice: `Build a small test project or implement 2-3 focused coding exercises in ${w.skill}.`
    }));

    if (recommended_topics.length === 0 && missing_skills.length > 0) {
      recommended_topics.push({
        topic: `Next-Level Expansion: ${missing_skills[0]}`,
        skill: missing_skills[0],
        importance: "Medium",
        estimated_study_time: "3-5 hours",
        description: `Expand your technical breadth in ${missing_skills[0]} to maximize job match score.`,
        recommended_practice: `Review best practices and write prototype implementations.`
      });
    }

    const summary_notes = score_pct >= 80
      ? `Outstanding technical proficiency demonstrated across ${job_role} domains. Continue refining advanced edge cases.`
      : score_pct >= 50
      ? `Good conceptual foundation for ${job_role}. Focus study efforts on identified weak areas to strengthen technical confidence.`
      : `Identified key conceptual gaps in ${job_role} requirements. Follow the recommended learning roadmap to build core mastery.`;

    return {
      score,
      total: total_questions,
      score_percentage: score_pct,
      weak_areas,
      strong_areas,
      recommended_topics,
      summary_notes,
      model_used: "deterministic-analytics"
    };
  };

  if (!ai) {
    return buildDeterministicSummary();
  }

  const prompt = `Analyze this candidate's performance on an adaptive technical quiz for "${job_role}".
- Total Score: ${score} / ${total_questions} (${score_pct}%)
- Answers Log:
${JSON.stringify(answers_data.map(a => ({
  skill: a.skill,
  difficulty: a.difficulty,
  is_correct: a.is_correct,
  user_answer: a.user_answer,
  correct_answer: a.correct_answer,
  question: a.question
})), null, 2)}
- Candidate Missing Skills: ${missing_skills.join(", ") || "None"}
- Priority Skills: ${priority_skills.join(", ") || "None"}

Provide structured evaluation with:
1. weak_areas: Array of skills where the user struggled, reasons, missed counts, and specific actions.
2. strong_areas: Array of skills where the user excelled with mastery level and highest difficulty cleared.
3. recommended_topics: Array of high-priority study topics with estimated study time, deep dive descriptions, and practical exercises.
4. summary_notes: A concise executive summary of performance and actionable advice.`;

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a senior technical hiring and engineering manager providing actionable technical evaluation and study recommendations.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              weak_areas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    missed_count: { type: Type.INTEGER },
                    difficulty_level: { type: Type.STRING },
                    recommended_action: { type: Type.STRING }
                  },
                  required: ["skill", "reason", "missed_count", "recommended_action"]
                }
              },
              strong_areas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING },
                    mastery_level: { type: Type.STRING },
                    correct_count: { type: Type.INTEGER },
                    highest_difficulty_cleared: { type: Type.STRING }
                  },
                  required: ["skill", "mastery_level", "correct_count"]
                }
              },
              recommended_topics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    skill: { type: Type.STRING },
                    importance: { type: Type.STRING },
                    estimated_study_time: { type: Type.STRING },
                    description: { type: Type.STRING },
                    recommended_practice: { type: Type.STRING }
                  },
                  required: ["topic", "skill", "importance", "description"]
                }
              },
              summary_notes: { type: Type.STRING }
            },
            required: ["weak_areas", "strong_areas", "recommended_topics", "summary_notes"]
          },
          temperature: 0.2
        }
      }),
      15000
    );

    const text = response.text ? response.text.trim() : "";
    const parsed = JSON.parse(text);

    return {
      score,
      total: total_questions,
      score_percentage: score_pct,
      weak_areas: parsed.weak_areas || [],
      strong_areas: parsed.strong_areas || [],
      recommended_topics: parsed.recommended_topics || [],
      summary_notes: parsed.summary_notes || "",
      model_used: "gemini-3.7-flash"
    };
  } catch (err: any) {
    console.error("[Adaptive Quiz Summary Error]:", err.message || err);
    return buildDeterministicSummary();
  }
}
