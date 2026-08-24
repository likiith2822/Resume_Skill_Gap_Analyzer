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

export interface RoadmapResource {
  name: string;
  type: string;
  url: string;
}

export interface PracticalProject {
  name: string;
  description: string;
}

export interface RoadmapWeek {
  week_number: number;
  title: string;
  primary_skill: string;
  secondary_skills?: string[];
  importance: "High" | "Medium" | "Low";
  learning_objectives: string[];
  key_topics: string[];
  practical_project: PracticalProject;
  recommended_resources: RoadmapResource[];
  estimated_hours: number;
}

export interface GeneratedRoadmap {
  job_title: string;
  experience_level: string;
  duration_weeks: number;
  overview: string;
  weekly_plan: RoadmapWeek[];
  strategic_advice: string;
  milestone_checklist: string[];
  model_used: string;
}

export interface RoadmapGenerationInput {
  job_title: string;
  experience_level?: string;
  candidate_skills: string[];
  missing_skills: string[] | Array<{ skill: string; importance?: string; is_priority?: boolean }>;
  duration_weeks?: number;
}

// Curated domain curriculum fallback builder
export function buildFallbackRoadmap(input: RoadmapGenerationInput): GeneratedRoadmap {
  const jobTitle = input.job_title || "Software Engineer";
  const experienceLevel = input.experience_level || "Entry / Mid-Level";
  const durationWeeks = Math.max(2, Math.min(8, input.duration_weeks || 4));

  const missingList: string[] = Array.isArray(input.missing_skills)
    ? input.missing_skills.map(s => typeof s === "string" ? s : s.skill)
    : [];

  const defaultSkillsByJob: Record<string, string[]> = {
    "Software Engineer": ["Data Structures", "Algorithms", "SQL", "REST APIs", "CI/CD", "System Design"],
    "Data Scientist": ["Python", "SQL", "Pandas", "Statistical Modeling", "Scikit-Learn", "Machine Learning"],
    "AI Engineer": ["PyTorch", "Natural Language Processing", "Transformers", "Large Language Models", "RAG", "Vector Databases"],
    "Full Stack Developer": ["React", "TypeScript", "Node.js", "Express", "PostgreSQL", "Docker"],
    "ML Engineer": ["Machine Learning", "Deep Learning", "PyTorch", "MLOps", "Model Deployment", "Docker"],
    "Cloud Engineer": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux"]
  };

  const pool = missingList.length > 0 ? missingList : (defaultSkillsByJob[jobTitle] || ["Python", "SQL", "REST APIs", "Git"]);
  const weeks: RoadmapWeek[] = [];

  for (let i = 0; i < durationWeeks; i++) {
    const primarySkill = pool[i % pool.length] || `Core ${jobTitle} Architecture`;
    const weekNum = i + 1;

    weeks.push({
      week_number: weekNum,
      title: `Week ${weekNum} → ${primarySkill}`,
      primary_skill: primarySkill,
      secondary_skills: pool.filter((_, idx) => idx !== i % pool.length).slice(0, 2),
      importance: i < 2 ? "High" : "Medium",
      learning_objectives: [
        `Master foundational and advanced paradigms of ${primarySkill}.`,
        `Apply ${primarySkill} in real-world scenarios tailored for ${jobTitle} roles.`,
        `Implement best practices, unit testing, and design patterns for ${primarySkill}.`,
        `Build a production-grade portfolio project showcasing mastery in ${primarySkill}.`
      ],
      key_topics: [
        `${primarySkill} Syntax & Core Principles`,
        `${primarySkill} Integration & Data Flow`,
        `Performance Optimization & Error Handling`,
        `Automated Testing & Deployment Guidelines`
      ],
      practical_project: {
        name: `${primarySkill} Production Mini-Project`,
        description: `Build a standalone modular repository demonstrating ${primarySkill} fundamentals, clean code architecture, and automated tests.`
      },
      recommended_resources: [
        {
          name: `${primarySkill} Official Documentation`,
          type: "Official Docs",
          url: "https://devdocs.io/"
        },
        {
          name: `${primarySkill} Interactive Guided Pathways`,
          type: "Interactive Guide",
          url: "https://www.freecodecamp.org/"
        },
        {
          name: `${primarySkill} Hands-On GitHub Starter Templates`,
          type: "Open Source Code",
          url: "https://github.com/"
        }
      ],
      estimated_hours: 10 + (i * 2)
    });
  }

  return {
    job_title: jobTitle,
    experience_level: experienceLevel,
    duration_weeks: durationWeeks,
    overview: `Structured ${durationWeeks}-week career acceleration roadmap tailored for ${jobTitle} (${experienceLevel}). Focuses on closing critical skill gaps in ${pool.slice(0, 3).join(", ")}.`,
    weekly_plan: weeks,
    strategic_advice: `Dedicate 8-12 hours per week. Spend 30% of your time on conceptual understanding and 70% on coding practical projects to showcase on your GitHub resume portfolio.`,
    milestone_checklist: weeks.map(w => `${w.title}: Complete ${w.practical_project.name}`),
    model_used: "curated_curriculum_engine"
  };
}

// Generate Roadmap via Google Gemini API
export async function generateGeminiRoadmap(input: RoadmapGenerationInput): Promise<GeneratedRoadmap> {
  const client = getGeminiClient();
  
  if (!client) {
    return buildFallbackRoadmap(input);
  }

  const jobTitle = input.job_title || "Software Engineer";
  const experienceLevel = input.experience_level || "Entry / Mid-Level";
  const durationWeeks = Math.max(2, Math.min(8, input.duration_weeks || 4));

  const missingFormatted = Array.isArray(input.missing_skills)
    ? input.missing_skills.map(s => typeof s === "string" ? s : `${s.skill} (Importance: ${s.importance || "High"})`).join(", ")
    : "None specified";

  const candidateFormatted = (input.candidate_skills || []).join(", ") || "None specified";

  const prompt = `You are a Principal Technical Career Mentor and Senior Engineering Director.
Generate a structured, personalized ${durationWeeks}-week technical learning roadmap to help a candidate bridge their skill gaps and qualify for a ${jobTitle} role.

Candidate Profile:
- Target Job Role: ${jobTitle}
- Experience Level: ${experienceLevel}
- Existing / Matched Candidate Skills: ${candidateFormatted}
- Missing / Skill Gaps to Bridge (Ordered by Importance): ${missingFormatted}
- Roadmap Duration: ${durationWeeks} Weeks

Requirements:
1. Distribute the missing skills logically across ${durationWeeks} weeks (Week 1, Week 2, Week 3, Week 4, etc.).
2. High-importance and foundational missing skills MUST be scheduled in earlier weeks (e.g. Week 1 → Python, Week 2 → SQL, Week 3 → Flask, Week 4 → Machine Learning).
3. For each week, provide:
   - week_number (integer: 1 to ${durationWeeks})
   - title (e.g. "Week 1 → Python", "Week 2 → SQL", "Week 3 → Flask", "Week 4 → Machine Learning")
   - primary_skill (the main skill being mastered this week)
   - secondary_skills (1-2 related supporting tools or concepts)
   - importance ("High" | "Medium" | "Low")
   - learning_objectives (array of 3-4 concrete, actionable goals)
   - key_topics (array of 3-5 specific technical concepts)
   - practical_project (object with 'name' and 'description' of a concrete hands-on project to build)
   - recommended_resources (array of objects with 'name', 'type', and valid 'url')
   - estimated_hours (estimated study and coding hours: 8 to 15)
4. Include an 'overview', 'strategic_advice', and 'milestone_checklist' (array of strings).

Provide your response in strictly compliant JSON adhering to the specified schema.`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            job_title: { type: Type.STRING },
            experience_level: { type: Type.STRING },
            duration_weeks: { type: Type.INTEGER },
            overview: { type: Type.STRING },
            weekly_plan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week_number: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  primary_skill: { type: Type.STRING },
                  secondary_skills: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  importance: { type: Type.STRING },
                  learning_objectives: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  key_topics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  practical_project: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING }
                    },
                    required: ["name", "description"]
                  },
                  recommended_resources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        url: { type: Type.STRING }
                      },
                      required: ["name", "type", "url"]
                    }
                  },
                  estimated_hours: { type: Type.INTEGER }
                },
                required: [
                  "week_number",
                  "title",
                  "primary_skill",
                  "importance",
                  "learning_objectives",
                  "key_topics",
                  "practical_project",
                  "recommended_resources",
                  "estimated_hours"
                ]
              }
            },
            strategic_advice: { type: Type.STRING },
            milestone_checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: [
            "job_title",
            "experience_level",
            "duration_weeks",
            "overview",
            "weekly_plan",
            "strategic_advice",
            "milestone_checklist"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response returned by Gemini API.");
    }

    const parsed = JSON.parse(text);
    return {
      job_title: parsed.job_title || jobTitle,
      experience_level: parsed.experience_level || experienceLevel,
      duration_weeks: parsed.duration_weeks || durationWeeks,
      overview: parsed.overview || `Personalized learning roadmap for ${jobTitle}.`,
      weekly_plan: parsed.weekly_plan || [],
      strategic_advice: parsed.strategic_advice || "Focus on consistent practice.",
      milestone_checklist: parsed.milestone_checklist || [],
      model_used: "gemini-3.7-flash"
    };
  } catch (err: any) {
    console.warn(`[Gemini API Error] Falling back to curriculum engine: ${err.message}`);
    const fallback = buildFallbackRoadmap(input);
    return {
      ...fallback,
      model_used: `gemini_fallback (${err.message?.slice(0, 80) || "error"})`
    };
  }
}

// Python CLI runner helper for SQLite Roadmap operations
function runPythonRoadmapCli(action: string, payload: any): any {
  const inputJson = JSON.stringify(payload).replace(/'/g, "'\\''");
  const cmd = `python3 backend/roadmap_cli.py ${action} '${inputJson}'`;
  try {
    const output = execSync(cmd, { encoding: "utf-8", timeout: 15000 });
    const parsed = JSON.parse(output.trim());
    return parsed;
  } catch (err: any) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.trim());
      } catch {}
    }
    throw new Error(`Roadmap CLI execution failed: ${err.message}`);
  }
}

export function saveRoadmapToDb(data: {
  user_id?: number | null;
  resume_id?: number | null;
  target_job_id?: number | null;
  job_title: string;
  experience_level: string;
  match_percentage?: number | null;
  matched_skills?: any;
  missing_skills: any;
  recommended_skills?: any;
  priority_skills?: any;
  duration_weeks: number;
  weekly_plan: any;
  overview?: string;
  advice?: string;
  model_used?: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const res = runPythonRoadmapCli("save_roadmap", data);
      if (res.success && res.data?.id) {
        resolve(res.data.id);
      } else {
        reject(new Error(res.error?.message || "Failed to save roadmap"));
      }
    } catch (e) {
      reject(e);
    }
  });
}

export function getRoadmapByIdFromDb(id: number): Promise<any | null> {
  return new Promise((resolve, reject) => {
    try {
      const res = runPythonRoadmapCli("get_roadmap", { id });
      if (res.success && res.data) {
        resolve(res.data);
      } else if (res.error?.code === "ROADMAP_NOT_FOUND") {
        resolve(null);
      } else {
        reject(new Error(res.error?.message || "Failed to fetch roadmap"));
      }
    } catch (e) {
      reject(e);
    }
  });
}

export function getRecentRoadmapsFromDb(limit: number = 20, userId?: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const res = runPythonRoadmapCli("list_roadmaps", { limit, user_id: userId });
      if (res.success && res.data?.roadmaps) {
        resolve(res.data.roadmaps);
      } else {
        resolve([]);
      }
    } catch (e) {
      reject(e);
    }
  });
}
