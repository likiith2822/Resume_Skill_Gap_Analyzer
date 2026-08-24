export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponseData {
  user: User;
  token?: string;
}

export interface DatabaseHealth {
  status: string;
  type: string;
  path?: string;
  sizeBytes?: number;
  healthy: boolean;
  tables?: string[];
  error?: string;
}

export interface TechnologyStackInfo {
  frontend?: string[];
  backend?: string;
  database?: string;
  auth?: string;
  resume_parsing?: string[];
  nlp?: string[];
  semantic_similarity?: string;
  ai?: string;
  github?: string;
  ml?: string;
  charts?: string;
  deployment?: string;
  [key: string]: any;
}

export interface HealthData {
  status: string;
  service: string;
  version: string;
  phase: string;
  timestamp: string;
  database: DatabaseHealth;
  environment: string;
  technologies: TechnologyStackInfo;
  endpoints?: Array<{ method: string; path: string; description: string }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
}

export interface SkillsData {
  total_skills_count: number;
  all_skills: string[];
  categories: Record<string, string[]>;
}

export interface EducationEntry {
  degree?: string;
  institution?: string;
  year?: string;
  gpa?: string;
  details?: string[];
}

export interface ExperienceEntry {
  role?: string;
  company?: string;
  duration?: string;
  bullets: string[];
}

export interface ProjectEntry {
  title?: string;
  technologies?: string[];
  link?: string;
  bullets: string[];
}

export interface CertificationEntry {
  name: string;
  issuer?: string;
  year?: string;
}

export interface ParsedResumeData {
  file_name: string;
  file_type: "PDF" | "DOCX" | string;
  extractor: string;
  page_count: number;
  word_count: number;
  char_count: number;
  contact: ContactInfo;
  summary?: string;
  skills: SkillsData;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  raw_text: string;
}

export interface ResumeListItem {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  candidate_name: string;
  candidate_email: string;
  skills_count: number;
  top_skills: string[];
  education_count: number;
  experience_count: number;
}

export interface ResumeDetail {
  id: number;
  user_id: number;
  candidate_id?: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  raw_text: string;
  parsed_data: ParsedResumeData;
}

// Part 4: NLP and Skill Extraction Types
export interface ExtractedSkillItem {
  skill: string;
  category: string;
  confidence: number;
  occurrences: number;
  matched_as: string[];
  aliases_found?: string[];
}

export interface LemmaToken {
  word: string;
  lemma: string;
  pos: string;
  tag: string;
  is_stop: boolean;
}

export interface NlpPipelineData {
  stage_1_text_cleaning: {
    raw_character_count: number;
    cleaned_character_count: number;
    cleaned_text_preview: string;
  };
  stage_2_tokenization: {
    total_tokens: number;
    tokens_sample: string[];
  };
  stage_3_stopword_removal: {
    stopwords_removed_count: number;
    filtered_tokens_count: number;
    filtered_sample: string[];
  };
  stage_4_lemmatization_and_pos: {
    total_lemmatized: number;
    pos_distribution: Record<string, number>;
    sample_lemmas: LemmaToken[];
  };
  stage_5_skill_extraction: {
    total_extracted: number;
    categories_count: number;
    category_breakdown: Record<string, number>;
  };
}

export interface NlpAnalysisResultData {
  resume_id?: number;
  basic_info: {
    filename?: string;
    file_type?: string;
    file_size?: number;
    uploaded_at?: string;
    candidate_name?: string;
    candidate_email?: string;
    candidate_phone?: string;
    github?: string;
    linkedin?: string;
    word_count?: number;
    char_count?: number;
    tokens_count?: number;
    lexical_diversity?: number;
  };
  cleaned_text: string;
  nlp_pipeline: NlpPipelineData;
  skills_summary: {
    total_extracted: number;
    categories_count: number;
    category_breakdown: Record<string, number>;
    top_skills: string[];
  };
  extracted_skills: ExtractedSkillItem[];
  categorized_skills: Record<string, string[]>;
}

export interface SkillNormalizationItem {
  original: string;
  canonical: string;
  category: string;
  matched: boolean;
}

export interface TaxonomyCategoryItem {
  name: string;
  aliases: string[];
}

export interface SkillTaxonomyData {
  categories: Record<string, TaxonomyCategoryItem[]>;
  total_canonical_skills: number;
  total_aliases?: number;
  category_names: string[];
}

export interface SampleTestResult {
  role: string;
  total_skills: number;
  category_counts: Record<string, number>;
  top_skills: string[];
  token_count: number;
  stopwords_removed: number;
}

// Part 5: Job Roles & Semantic Matching Types
export interface JobRole {
  id: number;
  job_title: string;
  category: string;
  description: string;
  experience_level?: string;
  required_skills: string[];
  priority_skills: string[];
  total_required_skills?: number;
  total_priority_skills?: number;
  created_at?: string;
}

export interface MatchedSkillItem {
  skill: string;
  best_candidate_match: string | null;
  similarity: number;
  match_percentage: number;
  match_type: "exact" | "high_semantic" | "partial_semantic" | "missing";
  is_priority: boolean;
}

export interface SemanticMatchResult {
  job: JobRole;
  overall_match_percentage: number;
  match_level: "Strong Match" | "Moderate Match" | "Growth Match" | "Low Match" | "No Match";
  matched_count: number;
  missing_count: number;
  matched_skills: MatchedSkillItem[];
  missing_skills: MatchedSkillItem[];
  priority_skills_summary: {
    total_priority: number;
    matched_priority: number;
    missing_priority: number;
    priority_match_percentage: number;
    priority_skills: string[];
  };
  candidate_summary?: {
    total_extracted_skills: number;
    candidate_skills: string[];
  };
  semantic_model: {
    name: string;
    model_id: string;
    embedding_dim: number;
  };
}

// Part 6: Skill Gap & Gemini Learning Roadmap Types
export interface EnrichedMatchedSkill {
  skill: string;
  best_candidate_match: string | null;
  similarity: number;
  match_percentage: number;
  match_type: string;
  status: string;
  badge_color: string;
  is_priority: boolean;
  importance: string;
}

export interface EnrichedMissingSkill {
  skill: string;
  best_candidate_match: string | null;
  similarity: number;
  is_priority: boolean;
  importance: "High" | "Medium" | "Low";
  importance_weight: number;
  reason: string;
  gap_severity: string;
}

export interface RecommendedSkillItem {
  rank: number;
  skill: string;
  importance: string;
  is_priority: boolean;
  estimated_effort: string;
  recommendation_reason: string;
}

export interface PrioritySkillSummary {
  total_priority_skills: number;
  matched_priority_count: number;
  missing_priority_count: number;
  priority_match_percentage: number;
  matched_priority_skills: string[];
  missing_priority_skills: string[];
  status: string;
}

export interface SkillGapAnalysisData {
  job: {
    id: number;
    job_title: string;
    category: string;
    experience_level: string;
    total_required_skills: number;
  };
  skill_match_percentage: number;
  matched_skills: EnrichedMatchedSkill[];
  missing_skills: EnrichedMissingSkill[];
  recommended_skills: RecommendedSkillItem[];
  priority_skills: PrioritySkillSummary;
  total_matched: number;
  total_missing: number;
  total_required: number;
  total_candidate_skills: number;
}

export interface RoadmapResourceItem {
  name: string;
  type: string;
  url: string;
}

export interface RoadmapWeekItem {
  week_number: number;
  title: string;
  primary_skill: string;
  secondary_skills?: string[];
  importance: "High" | "Medium" | "Low";
  learning_objectives: string[];
  key_topics: string[];
  practical_project: {
    name: string;
    description: string;
  };
  recommended_resources: RoadmapResourceItem[];
  estimated_hours: number;
}

export interface LearningRoadmapData {
  id?: number;
  job_title: string;
  experience_level: string;
  duration_weeks: number;
  match_percentage?: number | null;
  overview: string;
  weekly_plan: RoadmapWeekItem[];
  strategic_advice: string;
  milestone_checklist: string[];
  model_used: string;
  created_at?: string;
}

// Part 7: GitHub Portfolio Profiler Types
export interface GitHubLanguageItem {
  language: string;
  repo_count: number;
  percentage: number;
}

export interface GitHubTopProject {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  open_issues: number;
  homepage?: string | null;
  is_fork: boolean;
  topics: string[];
  updated_at?: string;
  pushed_at?: string;
}

export interface GitHubDimensionScore {
  score: number;
  max: number;
  feedback: string;
  [key: string]: any;
}

export interface GitHubScoreBreakdown {
  project_count: GitHubDimensionScore & { original_repos: number; total_repos: number };
  language_diversity: GitHubDimensionScore & { distinct_languages: number };
  repository_activity: GitHubDimensionScore & { days_since_last_push: number | null; pushed_in_last_30_days: number };
  community_impact: GitHubDimensionScore & { total_stars: number; total_forks: number; followers: number };
  project_quality: GitHubDimensionScore & { documented_repos: number; tagged_repos: number };
  tier: string;
  tier_badge: "emerald" | "teal" | "amber" | "blue" | string;
}

export interface GitHubActivitySummary {
  total_public_repos: number;
  original_repos: number;
  forked_repos: number;
  total_stars: number;
  total_forks: number;
  days_since_last_push: number | null;
  recent_activity_level: string;
}

export interface GitHubProfileData {
  id?: number;
  username: string;
  profile_url: string;
  avatar_url?: string;
  name: string;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  blog?: string | null;
  twitter_username?: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  account_created_at?: string;
  skill_score: number;
  skill_score_label: string; // e.g. "GitHub Skill Score: 89/100"
  score_breakdown: GitHubScoreBreakdown;
  primary_language: string;
  languages: GitHubLanguageItem[];
  top_projects: GitHubTopProject[];
  activity_summary: GitHubActivitySummary;
  recommendations: string[];
  rate_limit_info?: {
    limit: string;
    remaining: string;
    reset: string;
  };
  created_at?: string;
}

// Part 8: ATS Resume Rewriter & Cover Letter Types
export interface AtsImprovedBullet {
  section_or_role: string;
  original_bullet?: string;
  improved_bullet: string;
  action_verb_used: string;
  keywords_incorporated: string[];
  rationale: string;
  is_factual_adaptation: boolean;
}

export interface AtsRelevantKeywords {
  core_technical_skills: string[];
  frameworks_and_tools: string[];
  domain_concepts: string[];
  soft_and_leadership: string[];
  all_target_keywords: string[];
}

export interface AtsSuggestionsAudit {
  factual_elements_preserved: string[];
  ai_framing_enhancements: string[];
  bridging_recommendations_only: string[];
  disclaimer: string;
}

export interface AtsKeywordCoverageScore {
  score: number;
  max: number;
  percentage: number;
  matched_count: number;
  total_required: number;
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface AtsSkillCoverageScore {
  score: number;
  max: number;
  percentage: number;
  feedback: string;
}

export interface AtsSectionCompletenessScore {
  score: number;
  max: number;
  sections_found: string[];
  sections_missing: string[];
}

export interface AtsJobRelevanceScore {
  score: number;
  max: number;
  job_title: string;
}

export interface AtsScoreBreakdown {
  keyword_coverage: AtsKeywordCoverageScore;
  skill_coverage: AtsSkillCoverageScore;
  section_completeness: AtsSectionCompletenessScore;
  job_role_relevance: AtsJobRelevanceScore;
}

export interface AtsRewriteData {
  id?: number;
  job_title: string;
  candidate_name: string;
  ats_score: number;
  ats_score_label: string; // e.g. "ATS Score: 88/100"
  score_breakdown: AtsScoreBreakdown;
  professional_summary: string;
  improved_bullet_points: AtsImprovedBullet[];
  relevant_keywords: AtsRelevantKeywords;
  ats_resume_content: string;
  suggestions_audit: AtsSuggestionsAudit;
  model_used: string;
  created_at?: string;
}

export interface CoverLetterData {
  id?: number;
  job_title: string;
  candidate_name: string;
  company_name: string;
  recipient_name: string;
  tone: string;
  cover_letter_text: string;
  key_highlights: string[];
  model_used: string;
  created_at?: string;
}

// Part 9: AI Mock Interview Types
export type InterviewCategory = "technical" | "behavioral" | "hr";

export interface MockInterviewQuestion {
  id: number;
  category: InterviewCategory;
  target_skill: string;
  question: string;
  context_rationale: string;
  hints_or_tips: string;
  expected_key_points: string[];
}

export interface MockInterviewAnswerFeedback {
  question_id: number;
  question_text: string;
  category: InterviewCategory;
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

export interface MockInterviewEvaluation {
  interview_id?: number;
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

export interface MockInterviewListItem {
  id: number;
  user_id?: number;
  resume_id?: number;
  target_job_id?: number;
  job_title: string;
  candidate_name: string;
  experience_level: string;
  status: "in_progress" | "completed";
  total_questions: number;
  answered_questions: number;
  overall_score: number;
  readiness_verdict?: string;
  created_at: string;
  completed_at?: string;
}

export interface MockInterviewDetail {
  id: number;
  user_id?: number;
  resume_id?: number;
  target_job_id?: number;
  job_title: string;
  candidate_name: string;
  experience_level: string;
  status: "in_progress" | "completed";
  total_questions: number;
  answered_questions: number;
  overall_score: number;
  technical_score: number;
  behavioral_score: number;
  hr_score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  suggested_improvements: string[];
  readiness_verdict: string;
  questions: MockInterviewQuestion[];
  answers: MockInterviewAnswerFeedback[];
  model_used: string;
  created_at: string;
  completed_at?: string;
}

export interface SalaryInsightSkill {
  skill: string;
  estimated_annual_uplift: number;
  impact_tier: "High" | "Medium" | "Standard";
}

export interface SalaryTrajectoryPoint {
  years: number;
  label: string;
  predicted_salary: number;
}

export interface SalaryPercentiles {
  p10: number;
  p25: number;
  p50_median: number;
  p75: number;
  p90: number;
}

export interface SalaryModelMetadata {
  model_type: string;
  r2_score: number;
  mae: number;
  training_samples: number;
}

export interface SalaryInsights {
  experience_tier: string;
  education_level: string;
  skills_count: number;
  top_contributing_skills: SalaryInsightSkill[];
  experience_curve: SalaryTrajectoryPoint[];
  percentiles: SalaryPercentiles;
  model_metadata: SalaryModelMetadata;
}

export interface SalaryPrediction {
  id: number;
  user_id?: number;
  resume_id?: number;
  target_job_id?: number;
  job_role: string;
  experience_years: number;
  education_level: string;
  skills: string[];
  min_salary: number;
  expected_salary: number;
  max_salary: number;
  currency: string;
  insights?: SalaryInsights;
  model_version: string;
  disclaimer: string;
  is_demonstration?: boolean;
  created_at: string;
}

export interface SalaryMetadata {
  popular_roles: string[];
  education_levels: string[];
  skill_catalog: string[];
  model_meta: {
    model_type: string;
    library: string;
    version: string;
    n_estimators: number;
    training_samples: number;
    test_samples: number;
    r2_score: number;
    mae: number;
    rmse: number;
    is_demonstration: boolean;
  };
  disclaimer: string;
  is_demonstration: boolean;
}

export type QuizDifficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  id: number;
  skill: string;
  difficulty: QuizDifficulty;
  question: string;
  options: string[];
  concept_tested?: string;
}

export interface QuizAnswerRecord {
  question_id: number;
  question_index: number;
  skill: string;
  difficulty: QuizDifficulty;
  question: string;
  options: string[];
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  time_taken_seconds?: number;
  answered_at?: string;
}

export interface QuizWeakArea {
  skill: string;
  reason: string;
  missed_count: number;
  difficulty_level?: string;
  recommended_action: string;
}

export interface QuizStrongArea {
  skill: string;
  mastery_level: string;
  correct_count: number;
  highest_difficulty_cleared?: string;
}

export interface QuizRecommendedTopic {
  topic: string;
  skill: string;
  importance: "High" | "Medium" | "Low" | string;
  estimated_study_time: string;
  description: string;
  recommended_practice: string;
}

export interface QuizAttempt {
  id: number;
  user_id?: number;
  resume_id?: number;
  target_job_id?: number;
  job_role: string;
  missing_skills: string[];
  priority_skills: string[];
  status: "in_progress" | "completed";
  current_difficulty: QuizDifficulty;
  total_questions: number;
  current_question_index: number;
  score: number;
  score_percentage: number;
  weak_areas?: QuizWeakArea[];
  strong_areas?: QuizStrongArea[];
  recommended_topics?: QuizRecommendedTopic[];
  questions_data: any[];
  answers_data: QuizAnswerRecord[];
  summary_notes?: string;
  model_used?: string;
  created_at: string;
  completed_at?: string;
}

export interface MainScores {
  resume_score: number;
  skill_match_percentage: number;
  ats_score: number;
  github_score: number;
  interview_score: number;
  quiz_score: number;
  composite_readiness?: number;
}

export interface RecentReportItem {
  id: number;
  report_type: string;
  title: string;
  score: number;
  unit: string;
  created_at: string;
  tab_target: NavTab;
}

export interface DashboardChartData {
  categories: string[];
  candidate_competency: number[];
  job_benchmark: number[];
  skill_gap_breakdown: {
    matched_count_by_domain: Record<string, number>;
    missing_count_by_domain: Record<string, number>;
  };
  score_trajectory: Array<{
    label: string;
    score: number;
    target: number;
  }>;
}

export interface DashboardOverviewData {
  main_scores: MainScores;
  target_job_title: string;
  resume?: any;
  matched_skills: any[];
  missing_skills: any[];
  roadmap: any;
  salary: any;
  github: any;
  interview: any;
  quiz: any;
  recent_reports: RecentReportItem[];
  chart_data: DashboardChartData;
}

export type NavTab = 
  | "dashboard"
  | "adaptive_quiz"
  | "salary_predictor"
  | "mock_interview"
  | "ats_rewriter"
  | "github" 
  | "gap_roadmap" 
  | "matching" 
  | "nlp" 
  | "upload" 
  | "library" 
  | "authtest" 
  | "health" 
  | "architecture" 
  | "techstack" 
  | "guide";

export type AuthView = "login" | "register";




