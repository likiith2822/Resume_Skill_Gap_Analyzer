import React, { useState, useEffect, useRef } from "react";
import { 
  uploadResumeApi, 
  fetchResumesListApi, 
  fetchResumeByIdApi, 
  deleteResumeByIdApi 
} from "../services/api";
import { ParsedResumeData, ResumeListItem, ResumeDetail } from "../types";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Briefcase, 
  GraduationCap, 
  FolderGit2, 
  Award, 
  Mail, 
  Phone, 
  Globe, 
  Github, 
  Linkedin, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Clock, 
  FileCode, 
  Copy, 
  Check, 
  Search, 
  Eye, 
  ShieldCheck, 
  FileWarning,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink
} from "lucide-react";

interface ResumeUploadPageProps {
  onNavigateToMatching?: () => void;
}

export function ResumeUploadPage({ onNavigateToMatching }: ResumeUploadPageProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [currentResumeId, setCurrentResumeId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedRawText, setCopiedRawText] = useState(false);

  // Active view tab inside parsed view
  const [detailTab, setDetailTab] = useState<"skills" | "experience" | "education" | "projects" | "certifications" | "raw">("skills");
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<string>("All");
  const [rawTextFilter, setRawTextFilter] = useState<string>("");

  // Resumes Library list
  const [resumesList, setResumesList] = useState<ResumeListItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load uploaded resumes on mount
  const loadResumesLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await fetchResumesListApi();
      if (res.success && res.data?.resumes && res.data.resumes.length > 0) {
        setResumesList(res.data.resumes);
        // If no parsed data loaded yet, load the latest one if available
        if (!parsedData && !selectedFile) {
          loadSpecificResume(res.data.resumes[0].id);
        }
      } else {
        // Automatically load default demo student resume for smooth initial experience
        if (!parsedData) {
          loadSyntheticDemo("fullstack");
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch resumes library", err);
      if (!parsedData) {
        loadSyntheticDemo("fullstack");
      }
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    loadResumesLibrary();
  }, []);

  const loadSpecificResume = async (id: number) => {
    setSelectedLibraryId(id);
    setErrorMessage(null);
    try {
      const res = await fetchResumeByIdApi(id);
      if (res.success && res.data?.resume) {
        const r = res.data.resume;
        setCurrentResumeId(r.id);
        setParsedData(r.parsed_data);
      } else {
        setErrorMessage(res.error?.message || "Failed to load resume details.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error loading resume details.");
    }
  };

  // Instant synthetic loader for zero-friction demoing (especially great for 10th std / high school students!)
  const loadSyntheticDemo = (persona: "fullstack" | "ai" | "devops") => {
    setErrorMessage(null);
    setIsUploading(true);
    setUploadStep(2);
    setUploadProgress(60);

    setTimeout(() => {
      if (persona === "fullstack") {
        setParsedData({
          file_type: "pdf",
          file_size_bytes: 48200,
          extractor: "PyMuPDF (fitz) + NLP Pipeline",
          contact: {
            name: "Alex Chen",
            email: "student@college.edu",
            phone: "+1 (555) 234-5678",
            github: "https://github.com/alexchen-dev",
            linkedin: "https://linkedin.com/in/alexchen-tech",
            location: "San Francisco, CA"
          },
          skills: {
            total_count: 24,
            all_skills: [
              "Python", "JavaScript", "TypeScript", "React.js", "Node.js", 
              "Express.js", "PostgreSQL", "SQLite", "HTML5", "CSS3 / Tailwind CSS",
              "REST APIs", "Git & GitHub", "Docker", "Jest", "CI/CD Basics",
              "FastAPI", "MongoDB", "Redux Toolkit", "Linux", "SQLAlchemy",
              "Agile / Scrum", "Data Structures", "Algorithms", "Vite"
            ],
            categories: {
              "Programming Languages": ["Python", "JavaScript", "TypeScript", "SQL", "HTML5", "CSS3"],
              "Web Frameworks": ["React.js", "Node.js", "Express.js", "FastAPI", "Redux Toolkit"],
              "Databases & Storage": ["PostgreSQL", "SQLite", "MongoDB", "SQLAlchemy"],
              "Cloud & DevOps": ["Docker", "Git & GitHub", "CI/CD Basics", "Linux"],
              "Testing & Tools": ["Jest", "REST APIs", "Vite", "Agile / Scrum"]
            }
          },
          experience: [
            {
              role: "Software Engineering Intern",
              company: "TechNova Solutions",
              duration: "May 2025 - Aug 2025 (4 months)",
              bullets: [
                "Built responsive full-stack features using React, TypeScript, and Node.js REST API endpoints.",
                "Engineered fast database queries on PostgreSQL, reducing page loading time by 32%.",
                "Containerized development services with Docker and setup GitHub Actions CI/CD workflows."
              ]
            },
            {
              role: "Junior Web Developer & Student Mentor",
              company: "University Tech Lab",
              duration: "Sep 2024 - Apr 2025 (8 months)",
              bullets: [
                "Developed internal student portal components with React and Tailwind CSS.",
                "Mentored 25+ first-year computer science students in Python algorithms and Git version control."
              ]
            }
          ],
          education: [
            {
              degree: "B.S. in Computer Science (Junior Year)",
              institution: "State University of Technology",
              year: "2023 - 2027 (Expected)",
              details: "GPA: 3.85 / 4.0 • Dean's Honor List • Focus in Web Systems & Software Design"
            }
          ],
          projects: [
            {
              name: "SkillSync AI Job Matcher",
              tech_stack: ["React", "TypeScript", "Python FastAPI", "SQLite"],
              description: "Engineered NLP text similarity search engine matching student resumes to job descriptions."
            },
            {
              name: "Real-Time Collaborative Code Editor",
              tech_stack: ["Node.js", "WebSockets", "React", "Docker"],
              description: "Built multi-user markdown and code editor supporting concurrent typing with 40ms sync latency."
            }
          ],
          certifications: [
            "Meta Certified Front-End Developer",
            "AWS Certified Cloud Practitioner"
          ],
          raw_text: "ALEX CHEN\nstudent@college.edu | +1 (555) 234-5678 | github.com/alexchen-dev\n\nEDUCATION\nB.S. Computer Science - State University (2023-2027, GPA: 3.85)\n\nTECHNICAL SKILLS\nLanguages: Python, JavaScript, TypeScript, SQL, HTML5, CSS3\nFrameworks: React.js, Node.js, Express, FastAPI\nDatabases: PostgreSQL, SQLite, MongoDB\nTools & Cloud: Docker, Git, Linux, CI/CD, Vite\n\nEXPERIENCE\nSoftware Engineering Intern - TechNova (May 2025 - Aug 2025)\n- Built full-stack features in React and Node.js\n- Optimized database query response times by 32%\n- Containerized dev environments using Docker"
        });
      } else if (persona === "ai") {
        setParsedData({
          file_type: "pdf",
          file_size_bytes: 52100,
          extractor: "PyMuPDF (fitz) + NLP Pipeline",
          contact: {
            name: "Maya Lin",
            email: "maya.lin@student.ai",
            phone: "+1 (555) 987-6543",
            github: "https://github.com/mayalin-ai",
            linkedin: "https://linkedin.com/in/mayalin",
            location: "Seattle, WA"
          },
          skills: {
            total_count: 22,
            all_skills: [
              "Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "NumPy",
              "NLP", "Hugging Face", "Transformers", "SQL", "OpenCV", "Matplotlib",
              "Seaborn", "LangChain", "Vector Databases", "Git", "Jupyter", "FastAPI"
            ],
            categories: {
              "AI & Machine Learning": ["PyTorch", "TensorFlow", "Scikit-Learn", "Hugging Face", "Transformers", "LangChain", "NLP"],
              "Data Analysis": ["Pandas", "NumPy", "Matplotlib", "Seaborn", "SQL"],
              "Engineering & APIs": ["Python", "FastAPI", "Vector Databases", "Git", "Jupyter"]
            }
          },
          experience: [
            {
              role: "Machine Learning Research Intern",
              company: "Cognitive AI Labs",
              duration: "Jun 2025 - Aug 2025",
              bullets: [
                "Trained transformer fine-tuning models on text classification datasets achieving 94.2% F1 score.",
                "Built semantic search index using Sentence Transformers and FAISS vector embeddings."
              ]
            }
          ],
          education: [
            {
              degree: "B.S. in Artificial Intelligence & Data Science",
              institution: "Institute of Technology",
              year: "2024 - 2028",
              details: "Coursework: Machine Learning, Deep Neural Networks, Natural Language Processing"
            }
          ],
          projects: [
            {
              name: "Medical Question Answering Assistant",
              tech_stack: ["Python", "PyTorch", "Hugging Face", "Streamlit"],
              description: "Developed RAG question answering pipeline over medical literature."
            }
          ],
          certifications: ["DeepLearning.AI TensorFlow Developer", "Google Cloud ML Engineer"],
          raw_text: "MAYA LIN\nmaya.lin@student.ai | Seattle, WA\nSKILLS: Python, PyTorch, TensorFlow, Scikit-Learn, Pandas, NumPy, NLP, Transformers, Hugging Face, FastAPI, SQL"
        });
      } else {
        setParsedData({
          file_type: "docx",
          file_size_bytes: 41000,
          extractor: "python-docx + NLP Pipeline",
          contact: {
            name: "Jordan Smith",
            email: "jordan.smith@cloud.net",
            phone: "+1 (555) 456-7890",
            github: "https://github.com/jordansmith-cloud",
            linkedin: "https://linkedin.com/in/jordansmith",
            location: "Austin, TX"
          },
          skills: {
            total_count: 20,
            all_skills: [
              "Docker", "Kubernetes", "AWS (EC2, S3, RDS, Lambda)", "Terraform", "CI/CD (GitHub Actions)",
              "Linux / Bash", "Python", "Go (Golang)", "Prometheus", "Grafana", "Nginx", "Git"
            ],
            categories: {
              "Cloud Platforms": ["AWS (EC2, S3, RDS, Lambda)", "Google Cloud Platform"],
              "DevOps & Containers": ["Docker", "Kubernetes", "Terraform", "CI/CD (GitHub Actions)", "Nginx"],
              "Monitoring & Scripting": ["Linux / Bash", "Python", "Prometheus", "Grafana", "Git"]
            }
          },
          experience: [
            {
              role: "Cloud DevOps Associate",
              company: "CloudScale Infra",
              duration: "Jan 2025 - Present",
              bullets: [
                "Managed Kubernetes clusters and automated infrastructure deployment using Terraform.",
                "Constructed zero-downtime CI/CD deployment pipelines on GitHub Actions."
              ]
            }
          ],
          education: [
            {
              degree: "B.S. in Computer Systems Engineering",
              institution: "Texas Engineering College",
              year: "2023 - 2027",
              details: "Focus in Cloud Architecture, Networking, and Cyber Infrastructure"
            }
          ],
          projects: [
            {
              name: "Automated Multi-Cloud Cluster Provisioner",
              tech_stack: ["Terraform", "AWS", "Kubernetes", "Bash"],
              description: "Open source IaC script generating secure VPC and Kubernetes node pools in under 8 minutes."
            }
          ],
          certifications: ["AWS Certified Solutions Architect Associate", "CKA (Certified Kubernetes Administrator)"],
          raw_text: "JORDAN SMITH\njordan.smith@cloud.net\nSKILLS: Docker, Kubernetes, AWS, Terraform, CI/CD, Linux, Python, Go, Prometheus, Grafana"
        });
      }

      setUploadStep(4);
      setUploadProgress(100);
      setIsUploading(false);
    }, 450);
  };

  const handleDeleteResume = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this parsed resume from SQLite?")) {
      return;
    }

    try {
      const res = await deleteResumeByIdApi(id);
      if (res.success) {
        setResumesList((prev) => prev.filter((item) => item.id !== id));
        if (currentResumeId === id) {
          setParsedData(null);
          setCurrentResumeId(null);
        }
      } else {
        setErrorMessage(res.error?.message || "Failed to delete resume.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete resume.");
    }
  };

  // Handle Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMessage(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setErrorMessage(`Unsupported file format '.${ext}'. Please upload a PDF (.pdf) or Word document (.docx).`);
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 10MB.`);
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setErrorMessage("The selected file is empty (0 bytes). Please select a valid resume document.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Upload handler with staged status steps
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStep(1);
    setUploadProgress(20);
    setErrorMessage(null);

    // Staged visual transitions
    const t1 = setTimeout(() => {
      setUploadStep(2);
      setUploadProgress(50);
    }, 400);

    const t2 = setTimeout(() => {
      setUploadStep(3);
      setUploadProgress(80);
    }, 900);

    try {
      const res = await uploadResumeApi(selectedFile);
      clearTimeout(t1);
      clearTimeout(t2);

      if (res.success && res.data) {
        setUploadStep(4);
        setUploadProgress(100);
        setCurrentResumeId(res.data.resume_id);
        setParsedData(res.data.parsed_data);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        await loadResumesLibrary();
      } else {
        setErrorMessage(res.error?.message || "Resume upload and extraction failed.");
        setUploadStep(0);
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setErrorMessage(err.message || "An unexpected error occurred during upload.");
      setUploadStep(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Sample Loaders for Quick Interactive Evaluation
  const loadDemoSample = async (type: "pdf" | "docx") => {
    setErrorMessage(null);
    setIsUploading(true);
    setUploadStep(1);
    setUploadProgress(30);

    try {
      // Create a sample synthetic resume blob and file
      let sampleText = "";
      let filename = "";
      
      if (type === "pdf") {
        filename = "Jane_Doe_FullStack_Resume.pdf";
      } else {
        filename = "Michael_Zhang_CloudArchitect.docx";
      }

      // Fetch sample from backend sample files or generate real file upload
      // Since we already generated samples on backend, let's upload sample content
      const sampleBlob = new Blob([
        type === "pdf" ? "%PDF-1.4\n% Sample resume binary structure\n" : "PK\x03\x04\x14\x00\x00\x00\x08\x00 Sample docx binary\n"
      ], { type: type === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      
      // Let's create an actual File object with synthetic valid resume content
      // We will use existing backend parsed records or upload sample
      const res = await fetchResumesListApi();
      if (res.success && res.data?.resumes && res.data.resumes.length > 0) {
        // Find matching type
        const match = res.data.resumes.find(r => r.file_type.toLowerCase() === type);
        if (match) {
          await loadSpecificResume(match.id);
          setUploadStep(4);
          setUploadProgress(100);
          setIsUploading(false);
          return;
        }
      }

      // If no sample in DB, instruct user to pick file or upload
      setErrorMessage(`Sample ${type.toUpperCase()} parsed. You can also drag-and-drop any standard student PDF/DOCX resume.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load sample.");
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = () => {
    if (!parsedData?.raw_text) return;
    navigator.clipboard.writeText(parsedData.raw_text);
    setCopiedRawText(true);
    setTimeout(() => setCopiedRawText(false), 2000);
  };

  // Filter skills based on category
  const activeCategories = parsedData?.skills?.categories ? Object.keys(parsedData.skills.categories) : [];
  const displayedSkills = parsedData?.skills
    ? skillCategoryFilter === "All"
      ? parsedData.skills.all_skills
      : parsedData.skills.categories[skillCategoryFilter] || []
    : [];

  // Filter raw text
  const filteredRawTextLines = parsedData?.raw_text
    ? parsedData.raw_text
        .split("\n")
        .filter((l) => (rawTextFilter ? l.toLowerCase().includes(rawTextFilter.toLowerCase()) : true))
    : [];

  return (
    <div className="space-y-8 animate-fade-in" id="resume-upload-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
              Part 3: Resume Extraction & Parsing
            </span>
            <span className="text-xs text-stone-400 font-mono">PyMuPDF • python-docx • SQLite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1">
            Resume Upload & NLP Parsing
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Upload candidate resumes in <strong>PDF</strong> or <strong>DOCX</strong> format. Our backend pipeline extracts raw text, structures contact information, categorizes technical competencies, and indexes profiles.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadResumesLibrary}
            disabled={isLoadingLibrary}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLibrary ? "animate-spin" : ""}`} />
            <span>Refresh SQLite DB</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Upload Zone + Stored Resumes Drawer on the Left, Parsed Results Stage on the Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload Dropzone & Library (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upload Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-amber-600" />
                <span>Upload New Resume</span>
              </h2>
              <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                Max 10 MB
              </span>
            </div>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? "border-amber-500 bg-amber-50/60 scale-[1.01]"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50/40"
                  : "border-stone-300 hover:border-amber-400 hover:bg-stone-50/80"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
                id="resume-file-input"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-xs text-stone-500 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.name.split(".").pop()?.toUpperCase()}
                    </p>
                  </div>
                  <span className="text-xs text-emerald-700 font-medium">Ready to parse & extract</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      Drag and drop your resume file here
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Supports PDF (.pdf) or Word (.docx) documents
                    </p>
                  </div>
                  <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-md">
                    Browse Local File
                  </span>
                </div>
              )}
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Upload Validation Notice</p>
                  <p className="mt-0.5 text-red-700">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Upload Action Button & Status Bar */}
            <div className="mt-5 space-y-3">
              {isUploading ? (
                <div className="space-y-2 bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between text-xs text-stone-700">
                    <span className="font-semibold flex items-center space-x-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      {uploadStep === 1 && "Verifying magic byte signatures & permissions..."}
                      {uploadStep === 2 && "Extracting text streams via PyMuPDF / python-docx..."}
                      {uploadStep === 3 && "Running NLP entity classification & skills extractor..."}
                      {uploadStep === 4 && "Finalizing SQLite record persistence..."}
                    </span>
                    <span className="font-mono font-bold text-amber-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile}
                  id="btn-upload-parse"
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all ${
                    selectedFile
                      ? "bg-amber-500 hover:bg-amber-600 text-stone-950 cursor-pointer shadow-amber-500/20"
                      : "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Parse & Extract Resume</span>
                </button>
              )}

              {/* Quick Sample Helpers for effortless 1-click testing */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-700">⚡ 1-Click Sample Student Resumes:</p>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">Instant Preview</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Don't have a resume file on hand? Click any student profile below to test all features instantly:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => loadSyntheticDemo("fullstack")}
                    className="p-2 rounded-xl bg-blue-50/80 hover:bg-blue-100 border border-blue-200 text-left transition"
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-blue-900">
                      <span>💻 Full Stack</span>
                    </div>
                    <p className="text-[10px] text-blue-700 mt-0.5">Alex Chen (React, Node, SQL)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadSyntheticDemo("ai")}
                    className="p-2 rounded-xl bg-purple-50/80 hover:bg-purple-100 border border-purple-200 text-left transition"
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-purple-900">
                      <span>🤖 AI & Data</span>
                    </div>
                    <p className="text-[10px] text-purple-700 mt-0.5">Maya Lin (Python, PyTorch)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadSyntheticDemo("devops")}
                    className="p-2 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 text-left transition"
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-emerald-900">
                      <span>☁️ Cloud DevOps</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-0.5">Jordan Smith (Docker, AWS)</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SQLite Resumes Library Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-stone-700" />
                <span>Uploaded Resumes Library</span>
              </h2>
              <span className="text-xs font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-semibold">
                {resumesList.length} in SQLite
              </span>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Switch between parsed resumes stored in your persistent database table.
            </p>

            {resumesList.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                <FileWarning className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-stone-700">No resumes stored yet</p>
                <p className="text-xs text-stone-500 mt-0.5">Upload a PDF or DOCX file to see extraction results.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {resumesList.map((item) => {
                  const isSelected = item.id === currentResumeId;
                  const isPdf = item.file_type.toUpperCase() === "PDF";

                  return (
                    <div
                      key={item.id}
                      onClick={() => loadSpecificResume(item.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-50/60 border-amber-400 shadow-xs"
                          : "bg-stone-50/60 hover:bg-stone-100/80 border-stone-200"
                      }`}
                    >
                      <div className="flex items-start space-x-3 overflow-hidden">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                            isPdf ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {item.file_type.toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-900 truncate">
                            {item.candidate_name || item.original_filename}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate">
                            {item.candidate_email || item.original_filename}
                          </p>
                          <div className="flex items-center space-x-2 mt-1 text-[10px] text-stone-500">
                            <span className="font-semibold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded">
                              {item.skills_count} skills
                            </span>
                            <span>•</span>
                            <span>{new Date(item.uploaded_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => handleDeleteResume(item.id, e)}
                          title="Delete from SQLite database"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className={`w-4 h-4 ${isSelected ? "text-amber-600" : "text-stone-400"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Parsed Resume Output Viewer (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {parsedData ? (
            <>
              {/* Step 1 Completion & Direct Action Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-white shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-blue-100">
                        Step 1 Complete
                      </span>
                      <span className="text-xs text-blue-100">
                        • {parsedData.skills?.total_count || 0} Skills Extracted
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      Ready to check your job fit?
                    </h3>
                  </div>
                </div>

                {onNavigateToMatching && (
                  <button
                    id="goto-matching-btn"
                    onClick={onNavigateToMatching}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white hover:bg-blue-50 text-blue-900 font-bold px-4 py-2.5 rounded-xl shadow-xs transition transform hover:scale-[1.02] shrink-0 text-sm"
                  >
                    <span>Next: Match With Jobs</span>
                    <ChevronRight className="w-4 h-4 text-blue-700" />
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                {/* Header: Candidate Info & Parser Meta */}
              <div className="p-6 bg-stone-900 text-white">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-stone-950 uppercase tracking-wider">
                        {parsedData.file_type} Parsed
                      </span>
                      <span className="text-xs text-stone-400 font-mono">
                        Engine: {parsedData.extractor}
                      </span>
                    </div>

                    <h2 className="text-2xl font-extrabold tracking-tight mt-2 text-white">
                      {parsedData.contact?.name || "Extracted Candidate"}
                    </h2>

                    {/* Contact Badges */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-stone-300">
                      {parsedData.contact?.email && (
                        <div className="flex items-center space-x-1.5 bg-stone-800/90 px-2.5 py-1 rounded-md">
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          <span>{parsedData.contact.email}</span>
                        </div>
                      )}

                      {parsedData.contact?.phone && (
                        <div className="flex items-center space-x-1.5 bg-stone-800/90 px-2.5 py-1 rounded-md">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{parsedData.contact.phone}</span>
                        </div>
                      )}

                      {parsedData.contact?.github && (
                        <a
                          href={parsedData.contact.github}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1.5 bg-stone-800/90 px-2.5 py-1 rounded-md hover:text-amber-300 transition-colors"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">GitHub</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}

                      {parsedData.contact?.linkedin && (
                        <a
                          href={parsedData.contact.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1.5 bg-stone-800/90 px-2.5 py-1 rounded-md hover:text-amber-300 transition-colors"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">LinkedIn</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-center bg-stone-800/80 p-3 rounded-xl border border-stone-700 shrink-0">
                    <div className="p-1">
                      <span className="block text-xl font-extrabold text-amber-400 font-mono">
                        {parsedData.skills?.total_skills_count || 0}
                      </span>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold">Skills Identified</span>
                    </div>
                    <div className="p-1">
                      <span className="block text-xl font-extrabold text-emerald-400 font-mono">
                        {parsedData.word_count || 0}
                      </span>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold">Total Words</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="border-b border-stone-200 bg-stone-50 px-4 flex items-center space-x-2 overflow-x-auto">
                <button
                  onClick={() => setDetailTab("skills")}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 shrink-0 ${
                    detailTab === "skills"
                      ? "border-amber-500 text-stone-900 bg-white shadow-xs"
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Skills Categorization ({parsedData.skills?.total_skills_count || 0})</span>
                </button>

                <button
                  onClick={() => setDetailTab("experience")}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 shrink-0 ${
                    detailTab === "experience"
                      ? "border-amber-500 text-stone-900 bg-white shadow-xs"
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 text-stone-600" />
                  <span>Experience ({parsedData.experience?.length || 0})</span>
                </button>

                <button
                  onClick={() => setDetailTab("education")}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 shrink-0 ${
                    detailTab === "education"
                      ? "border-amber-500 text-stone-900 bg-white shadow-xs"
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-stone-600" />
                  <span>Education ({parsedData.education?.length || 0})</span>
                </button>

                <button
                  onClick={() => setDetailTab("projects")}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 shrink-0 ${
                    detailTab === "projects"
                      ? "border-amber-500 text-stone-900 bg-white shadow-xs"
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-stone-600" />
                  <span>Projects ({parsedData.projects?.length || 0})</span>
                </button>

                <button
                  onClick={() => setDetailTab("certifications")}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 shrink-0 ${
                    detailTab === "certifications"
                      ? "border-amber-500 text-stone-900 bg-white shadow-xs"
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-stone-600" />
                  <span>Certifications ({parsedData.certifications?.length || 0})</span>
                </button>

                <button
                  onClick={() => setDetailTab("raw")}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 shrink-0 ${
                    detailTab === "raw"
                      ? "border-amber-500 text-stone-900 bg-white shadow-xs"
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-stone-600" />
                  <span>Extracted Text</span>
                </button>
              </div>

              {/* Tab Stage Content */}
              <div className="p-6">
                {/* 1. Skills Tab */}
                {detailTab === "skills" && (
                  <div className="space-y-5">
                    {/* Category Filter Pills */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5 pb-3 border-b border-stone-100">
                      <span className="text-xs font-semibold text-stone-500 mr-1 flex items-center space-x-1">
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Filter:</span>
                      </span>
                      <button
                        onClick={() => setSkillCategoryFilter("All")}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          skillCategoryFilter === "All"
                            ? "bg-stone-900 text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        All ({parsedData.skills?.total_skills_count || 0})
                      </button>
                      {activeCategories.map((category) => {
                        const count = parsedData.skills.categories[category]?.length || 0;
                        return (
                          <button
                            key={category}
                            onClick={() => setSkillCategoryFilter(category)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              skillCategoryFilter === category
                                ? "bg-amber-500 text-stone-950 font-bold"
                                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                            }`}
                          >
                            {category} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Skills Badge Cloud */}
                    {displayedSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {displayedSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs hover:bg-amber-100 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3 text-amber-600 mr-1.5 shrink-0" />
                            <span>{skill}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 italic py-4">No skills found in this category filter.</p>
                    )}

                    {/* Breakdown by Category Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                      {activeCategories.map((category) => (
                        <div key={category} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50">
                          <p className="text-xs font-bold text-stone-900 mb-2 flex items-center justify-between">
                            <span>{category}</span>
                            <span className="text-[10px] font-mono bg-stone-200/70 text-stone-700 px-1.5 py-0.2 rounded font-semibold">
                              {parsedData.skills.categories[category]?.length} items
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {parsedData.skills.categories[category]?.map((s, i) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-white text-stone-700 border border-stone-200 font-mono">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Experience Tab */}
                {detailTab === "experience" && (
                  <div className="space-y-4">
                    {parsedData.experience && parsedData.experience.length > 0 ? (
                      parsedData.experience.map((exp, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/40 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div>
                              <h3 className="text-sm font-bold text-stone-900">{exp.role}</h3>
                              <p className="text-xs font-semibold text-stone-600">{exp.company}</p>
                            </div>
                            {exp.duration && (
                              <span className="text-xs font-mono text-stone-500 bg-white px-2.5 py-1 rounded-md border border-stone-200 self-start">
                                <Clock className="w-3 h-3 inline mr-1 text-stone-400" />
                                {exp.duration}
                              </span>
                            )}
                          </div>

                          {exp.bullets && exp.bullets.length > 0 && (
                            <ul className="mt-2 space-y-1.5 text-xs text-stone-700 pl-4 list-disc">
                              {exp.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="leading-relaxed">{b}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-stone-500 text-xs">
                        No distinct work experience section identified.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Education Tab */}
                {detailTab === "education" && (
                  <div className="space-y-4">
                    {parsedData.education && parsedData.education.length > 0 ? (
                      parsedData.education.map((edu, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/40 space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div>
                              <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                                <GraduationCap className="w-4 h-4 text-amber-600" />
                                <span>{edu.degree}</span>
                              </h3>
                              <p className="text-xs font-medium text-stone-600">{edu.institution}</p>
                            </div>
                            <div className="flex items-center space-x-2 text-xs font-mono">
                              {edu.year && (
                                <span className="bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-600">
                                  {edu.year}
                                </span>
                              )}
                              {edu.gpa && (
                                <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                                  {edu.gpa}
                                </span>
                              )}
                            </div>
                          </div>

                          {edu.details && edu.details.length > 1 && (
                            <div className="pt-2 text-xs text-stone-600 space-y-1">
                              {edu.details.slice(1).map((d, dIdx) => (
                                <p key={dIdx} className="text-stone-500 leading-relaxed">• {d}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-stone-500 text-xs">
                        No distinct education section identified.
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Projects Tab */}
                {detailTab === "projects" && (
                  <div className="space-y-4">
                    {parsedData.projects && parsedData.projects.length > 0 ? (
                      parsedData.projects.map((proj, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/40 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                              <FolderGit2 className="w-4 h-4 text-stone-700" />
                              <span>{proj.title}</span>
                            </h3>
                            {proj.link && (
                              <a
                                href={proj.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-amber-700 hover:underline flex items-center space-x-1 font-mono"
                              >
                                <span>Project Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {proj.technologies.map((t, tIdx) => (
                                <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-800 font-mono font-medium">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {proj.bullets && proj.bullets.length > 0 && (
                            <ul className="mt-2 space-y-1.5 text-xs text-stone-700 pl-4 list-disc">
                              {proj.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="leading-relaxed">{b}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-stone-500 text-xs">
                        No distinct projects section identified.
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Certifications Tab */}
                {detailTab === "certifications" && (
                  <div className="space-y-3">
                    {parsedData.certifications && parsedData.certifications.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {parsedData.certifications.map((cert, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                              <Award className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-stone-900">{cert.name}</p>
                              <div className="flex items-center space-x-2 mt-1 text-[11px] text-stone-500 font-mono">
                                <span className="text-stone-700 font-semibold">{cert.issuer}</span>
                                {cert.year && <span>• {cert.year}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-stone-500 text-xs">
                        No certifications extracted.
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Extracted Raw Text Inspector Tab */}
                {detailTab === "raw" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                        <input
                          type="text"
                          value={rawTextFilter}
                          onChange={(e) => setRawTextFilter(e.target.value)}
                          placeholder="Search keywords in raw text..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <button
                        onClick={copyToClipboard}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors border border-stone-300 shrink-0"
                      >
                        {copiedRawText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Raw Text</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-stone-900 text-stone-100 p-4 rounded-xl font-mono text-xs max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap selection:bg-amber-500 selection:text-stone-950">
                      {filteredRawTextLines.length > 0
                        ? filteredRawTextLines.join("\n")
                        : "No text matching search filter."}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">No Resume Selected</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1.5">
                Upload a candidate resume (PDF or DOCX) on the left or select an existing resume from the SQLite database to inspect parsed competencies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
