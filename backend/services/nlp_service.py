"""
NLP Service for Resume Skill Gap Analyzer.
Powered by spaCy, NLTK, and Python.

Implements:
1. Text cleaning (Unicode normalization, whitespace stripping, special syntax preservation)
2. Tokenization (spaCy Doc / NLTK word_tokenize with n-grams)
3. Stop-word removal (NLTK stopwords + spaCy is_stop with tech-term exceptions)
4. Lemmatization (spaCy lemma_ / NLTK WordNetLemmatizer with POS tagging)
5. Skill Extraction & Canonical Normalization (Dictionary-based + Regex boundary + Noun chunks)
"""

import os
import re
import string
import unicodedata
from typing import Dict, List, Set, Any, Tuple, Optional
from collections import Counter

# Core NLP libraries with graceful fallbacks
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk.stem import WordNetLemmatizer
    from nltk import pos_tag
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

# Ensure NLTK resources are available if nltk is installed
NLTK_STOPWORDS = set()
if NLTK_AVAILABLE:
    try:
        _ = stopwords.words('english')
        NLTK_STOPWORDS = set(stopwords.words('english'))
    except Exception:
        try:
            nltk.download('stopwords', quiet=True)
            nltk.download('punkt', quiet=True)
            nltk.download('punkt_tab', quiet=True)
            nltk.download('wordnet', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
            nltk.download('averaged_perceptron_tagger_eng', quiet=True)
            NLTK_STOPWORDS = set(stopwords.words('english'))
        except Exception:
            pass

if not NLTK_STOPWORDS:
    NLTK_STOPWORDS = {
        "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours",
        "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers",
        "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
        "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are",
        "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does",
        "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until",
        "while", "of", "at", "by", "for", "with", "about", "against", "between", "into",
        "through", "during", "before", "after", "above", "below", "to", "from", "up", "down",
        "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here",
        "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
        "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
        "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"
    }

# Load spaCy English pipeline if available
nlp = None
if SPACY_AVAILABLE:
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        try:
            import spacy.cli
            spacy.cli.download("en_core_web_sm")
            nlp = spacy.load("en_core_web_sm")
        except Exception:
            nlp = None

lemmatizer = None
if NLTK_AVAILABLE:
    try:
        lemmatizer = WordNetLemmatizer()
    except Exception:
        pass


# ==============================================================================
# Comprehensive Skill Taxonomy and Canonical Normalization Dataset
# ==============================================================================

SKILL_TAXONOMY: Dict[str, Dict[str, Any]] = {
    # --------------------------------------------------------------------------
    # 1. Programming Languages
    # --------------------------------------------------------------------------
    "Python": {
        "category": "Programming Languages",
        "aliases": ["python", "python3", "python2", "py", "python programming"]
    },
    "JavaScript": {
        "category": "Programming Languages",
        "aliases": ["javascript", "js", "ecmascript", "es6", "es6+", "vanilla js"]
    },
    "TypeScript": {
        "category": "Programming Languages",
        "aliases": ["typescript", "ts"]
    },
    "Java": {
        "category": "Programming Languages",
        "aliases": ["java", "core java", "java 8", "java 11", "java 17", "java 21", "j2ee"]
    },
    "C": {
        "category": "Programming Languages",
        "aliases": ["c language", "c programming", "ansi c"]
    },
    "C++": {
        "category": "Programming Languages",
        "aliases": ["c++", "cpp", "c plus plus", "c++11", "c++14", "c++17", "c++20"]
    },
    "C#": {
        "category": "Programming Languages",
        "aliases": ["c#", "csharp", "c sharp", "c#.net"]
    },
    "Go": {
        "category": "Programming Languages",
        "aliases": ["go", "golang", "go programming"]
    },
    "Rust": {
        "category": "Programming Languages",
        "aliases": ["rust", "rustlang", "rust-lang"]
    },
    "Ruby": {
        "category": "Programming Languages",
        "aliases": ["ruby", "ruby-lang"]
    },
    "PHP": {
        "category": "Programming Languages",
        "aliases": ["php", "php7", "php8"]
    },
    "Swift": {
        "category": "Programming Languages",
        "aliases": ["swift", "swiftui", "swift 5"]
    },
    "Kotlin": {
        "category": "Programming Languages",
        "aliases": ["kotlin", "kotlin/jvm", "kotlin multiplatform"]
    },
    "R": {
        "category": "Programming Languages",
        "aliases": ["r language", "r programming", "r-lang"]
    },
    "Scala": {
        "category": "Programming Languages",
        "aliases": ["scala"]
    },
    "Dart": {
        "category": "Programming Languages",
        "aliases": ["dart", "dartlang"]
    },
    "SQL": {
        "category": "Programming Languages",
        "aliases": ["sql", "structured query language", "t-sql", "pl/sql", "plsql"]
    },
    "HTML5": {
        "category": "Programming Languages",
        "aliases": ["html", "html5", "xhtml"]
    },
    "CSS3": {
        "category": "Programming Languages",
        "aliases": ["css", "css3", "cascading style sheets"]
    },
    "Shell / Bash": {
        "category": "Programming Languages",
        "aliases": ["bash", "shell", "sh", "zsh", "powershell", "shell scripting", "bash scripting"]
    },
    "MATLAB": {
        "category": "Programming Languages",
        "aliases": ["matlab"]
    },
    "Solidity": {
        "category": "Programming Languages",
        "aliases": ["solidity", "smart contracts"]
    },

    # --------------------------------------------------------------------------
    # 2. Frameworks & Libraries
    # --------------------------------------------------------------------------
    "React": {
        "category": "Frameworks & Libraries",
        "aliases": ["react", "react.js", "reactjs", "react js", "react native"]
    },
    "Node.js": {
        "category": "Frameworks & Libraries",
        "aliases": ["node.js", "nodejs", "node js", "node"]
    },
    "Express.js": {
        "category": "Frameworks & Libraries",
        "aliases": ["express", "express.js", "expressjs", "express js"]
    },
    "Next.js": {
        "category": "Frameworks & Libraries",
        "aliases": ["next.js", "nextjs", "next js"]
    },
    "Vue.js": {
        "category": "Frameworks & Libraries",
        "aliases": ["vue", "vue.js", "vuejs", "vue 3", "vuex", "pinia"]
    },
    "Angular": {
        "category": "Frameworks & Libraries",
        "aliases": ["angular", "angularjs", "angular 2+", "angular.js"]
    },
    "Django": {
        "category": "Frameworks & Libraries",
        "aliases": ["django", "django rest framework", "drf"]
    },
    "Flask": {
        "category": "Frameworks & Libraries",
        "aliases": ["flask", "flask-restful", "flask-sqlalchemy"]
    },
    "FastAPI": {
        "category": "Frameworks & Libraries",
        "aliases": ["fastapi", "fast-api", "fast api"]
    },
    "Spring Boot": {
        "category": "Frameworks & Libraries",
        "aliases": ["spring", "spring boot", "springboot", "spring framework", "spring mvc", "spring cloud"]
    },
    ".NET / ASP.NET": {
        "category": "Frameworks & Libraries",
        "aliases": [".net", "asp.net", "dotnet", ".net core", "asp.net core", "entity framework", "ado.net"]
    },
    "Ruby on Rails": {
        "category": "Frameworks & Libraries",
        "aliases": ["ruby on rails", "rails", "ror"]
    },
    "Laravel": {
        "category": "Frameworks & Libraries",
        "aliases": ["laravel"]
    },
    "PyTorch": {
        "category": "Frameworks & Libraries",
        "aliases": ["pytorch", "torch", "libtorch"]
    },
    "TensorFlow": {
        "category": "Frameworks & Libraries",
        "aliases": ["tensorflow", "tf", "tf2", "tensorflow 2"]
    },
    "Keras": {
        "category": "Frameworks & Libraries",
        "aliases": ["keras"]
    },
    "Scikit-Learn": {
        "category": "Frameworks & Libraries",
        "aliases": ["scikit-learn", "scikit learn", "sklearn"]
    },
    "Pandas": {
        "category": "Frameworks & Libraries",
        "aliases": ["pandas"]
    },
    "NumPy": {
        "category": "Frameworks & Libraries",
        "aliases": ["numpy"]
    },
    "Tailwind CSS": {
        "category": "Frameworks & Libraries",
        "aliases": ["tailwind", "tailwindcss", "tailwind css"]
    },
    "Bootstrap": {
        "category": "Frameworks & Libraries",
        "aliases": ["bootstrap", "bootstrap 5", "bootstrap 4"]
    },
    "Redux": {
        "category": "Frameworks & Libraries",
        "aliases": ["redux", "redux toolkit", "rtk", "redux-thunk", "redux-saga"]
    },
    "GraphQL": {
        "category": "Frameworks & Libraries",
        "aliases": ["graphql", "apollo", "apollo client", "apollo server"]
    },
    "Flutter": {
        "category": "Frameworks & Libraries",
        "aliases": ["flutter"]
    },
    "Svelte": {
        "category": "Frameworks & Libraries",
        "aliases": ["svelte", "sveltekit"]
    },

    # --------------------------------------------------------------------------
    # 3. Databases & Storage
    # --------------------------------------------------------------------------
    "PostgreSQL": {
        "category": "Databases & Storage",
        "aliases": ["postgresql", "postgres", "psql", "postgre sql"]
    },
    "MySQL": {
        "category": "Databases & Storage",
        "aliases": ["mysql", "mariadb"]
    },
    "SQLite": {
        "category": "Databases & Storage",
        "aliases": ["sqlite", "sqlite3"]
    },
    "MongoDB": {
        "category": "Databases & Storage",
        "aliases": ["mongodb", "mongo", "mongoose"]
    },
    "Redis": {
        "category": "Databases & Storage",
        "aliases": ["redis", "redis cache", "upstash"]
    },
    "Elasticsearch": {
        "category": "Databases & Storage",
        "aliases": ["elasticsearch", "elastic search", "elk stack", "opensearch"]
    },
    "Firebase Firestore": {
        "category": "Databases & Storage",
        "aliases": ["firestore", "firebase", "firebase realtime database", "firebase auth"]
    },
    "Cassandra": {
        "category": "Databases & Storage",
        "aliases": ["cassandra", "apache cassandra"]
    },
    "DynamoDB": {
        "category": "Databases & Storage",
        "aliases": ["dynamodb", "aws dynamodb", "dynamo db"]
    },
    "Oracle DB": {
        "category": "Databases & Storage",
        "aliases": ["oracle database", "oracle db", "oracle sql"]
    },
    "Neo4j": {
        "category": "Databases & Storage",
        "aliases": ["neo4j", "graph database", "cypher"]
    },
    "Supabase": {
        "category": "Databases & Storage",
        "aliases": ["supabase"]
    },
    "Snowflake": {
        "category": "Databases & Storage",
        "aliases": ["snowflake", "snowflake data warehouse"]
    },

    # --------------------------------------------------------------------------
    # 4. Cloud & DevOps
    # --------------------------------------------------------------------------
    "AWS": {
        "category": "Cloud & DevOps",
        "aliases": ["aws", "amazon web services", "aws ec2", "aws s3", "aws lambda", "aws ecs", "aws eks", "aws cloudformation"]
    },
    "Google Cloud Platform (GCP)": {
        "category": "Cloud & DevOps",
        "aliases": ["gcp", "google cloud", "google cloud platform", "cloud run", "gke", "google compute engine", "bigquery"]
    },
    "Microsoft Azure": {
        "category": "Cloud & DevOps",
        "aliases": ["azure", "microsoft azure", "azure devops", "azure functions", "azure blob storage", "aks"]
    },
    "Docker": {
        "category": "Cloud & DevOps",
        "aliases": ["docker", "docker compose", "dockerfile", "containerization", "docker swarm"]
    },
    "Kubernetes": {
        "category": "Cloud & DevOps",
        "aliases": ["kubernetes", "k8s", "helm", "kubectl", "minikube"]
    },
    "CI/CD": {
        "category": "Cloud & DevOps",
        "aliases": ["ci/cd", "cicd", "ci cd", "continuous integration", "continuous deployment", "continuous delivery"]
    },
    "GitHub Actions": {
        "category": "Cloud & DevOps",
        "aliases": ["github actions", "github action workflows", "gh actions"]
    },
    "GitLab CI": {
        "category": "Cloud & DevOps",
        "aliases": ["gitlab ci", "gitlab ci/cd", "gitlab pipelines"]
    },
    "Jenkins": {
        "category": "Cloud & DevOps",
        "aliases": ["jenkins", "jenkinsfile", "jenkins pipelines"]
    },
    "Terraform": {
        "category": "Cloud & DevOps",
        "aliases": ["terraform", "iac", "infrastructure as code", "opentofu"]
    },
    "Ansible": {
        "category": "Cloud & DevOps",
        "aliases": ["ansible", "ansible playbooks"]
    },
    "Linux": {
        "category": "Cloud & DevOps",
        "aliases": ["linux", "ubuntu", "debian", "centos", "redhat", "rhel", "alpine linux", "unix"]
    },
    "Nginx": {
        "category": "Cloud & DevOps",
        "aliases": ["nginx", "reverse proxy"]
    },
    "Apache": {
        "category": "Cloud & DevOps",
        "aliases": ["apache", "apache http server", "apache2"]
    },
    "Prometheus & Grafana": {
        "category": "Cloud & DevOps",
        "aliases": ["prometheus", "grafana", "observability", "metrics", "monitoring"]
    },
    "Serverless": {
        "category": "Cloud & DevOps",
        "aliases": ["serverless", "aws lambda", "cloud functions", "faas"]
    },

    # --------------------------------------------------------------------------
    # 5. AI / ML & Data Science
    # --------------------------------------------------------------------------
    "Machine Learning": {
        "category": "AI/ML Technologies",
        "aliases": ["machine learning", "ml", "supervised learning", "unsupervised learning", "ml algorithms"]
    },
    "Deep Learning": {
        "category": "AI/ML Technologies",
        "aliases": ["deep learning", "dl", "neural networks", "cnn", "rnn", "lstm", "artificial neural networks"]
    },
    "Natural Language Processing (NLP)": {
        "category": "AI/ML Technologies",
        "aliases": ["nlp", "natural language processing", "text mining", "text processing", "sentiment analysis", "named entity recognition", "ner", "topic modeling"]
    },
    "Computer Vision": {
        "category": "AI/ML Technologies",
        "aliases": ["computer vision", "cv", "image processing", "object detection", "yolo", "opencv", "segmentation"]
    },
    "Large Language Models (LLMs)": {
        "category": "AI/ML Technologies",
        "aliases": ["llm", "llms", "large language models", "generative ai", "genai", "prompt engineering", "few-shot learning"]
    },
    "Transformers": {
        "category": "AI/ML Technologies",
        "aliases": ["transformers", "bert", "gpt", "hugging face", "huggingface", "roberta", "t5", "sentence-transformers"]
    },
    "RAG (Retrieval-Augmented Generation)": {
        "category": "AI/ML Technologies",
        "aliases": ["rag", "retrieval augmented generation", "retrieval-augmented generation", "vector embeddings", "vector database", "faiss", "pinecone", "chromadb", "weaviate", "qdrant"]
    },
    "spaCy": {
        "category": "AI/ML Technologies",
        "aliases": ["spacy", "spacy nlp"]
    },
    "NLTK": {
        "category": "AI/ML Technologies",
        "aliases": ["nltk", "natural language toolkit"]
    },
    "LangChain": {
        "category": "AI/ML Technologies",
        "aliases": ["langchain", "llamaindex", "llama index", "langgraph"]
    },
    "Data Analysis": {
        "category": "AI/ML Technologies",
        "aliases": ["data analysis", "exploratory data analysis", "eda", "data analytics", "data mining"]
    },
    "Data Visualization": {
        "category": "AI/ML Technologies",
        "aliases": ["data visualization", "matplotlib", "seaborn", "plotly", "tableau", "power bi", "d3.js"]
    },
    "MLOps": {
        "category": "AI/ML Technologies",
        "aliases": ["mlops", "mlflow", "kubeflow", "model deployment", "model monitoring", "weights & biases", "wandb"]
    },
    "Feature Engineering": {
        "category": "AI/ML Technologies",
        "aliases": ["feature engineering", "data preprocessing", "data cleaning", "dimensionality reduction", "pca"]
    },

    # --------------------------------------------------------------------------
    # 6. Development Tools & Architectures
    # --------------------------------------------------------------------------
    "Git": {
        "category": "Development Tools",
        "aliases": ["git", "version control", "vcs"]
    },
    "GitHub": {
        "category": "Development Tools",
        "aliases": ["github"]
    },
    "GitLab": {
        "category": "Development Tools",
        "aliases": ["gitlab"]
    },
    "REST APIs": {
        "category": "Development Tools",
        "aliases": ["rest", "rest api", "rest apis", "restful api", "restful apis", "restful web services"]
    },
    "Microservices": {
        "category": "Development Tools",
        "aliases": ["microservices", "microservice architecture", "distributed systems"]
    },
    "WebSockets": {
        "category": "Development Tools",
        "aliases": ["websockets", "websocket", "socket.io"]
    },
    "gRPC": {
        "category": "Development Tools",
        "aliases": ["grpc", "protobuf", "protocol buffers"]
    },
    "Postman": {
        "category": "Development Tools",
        "aliases": ["postman", "insomnia", "api testing"]
    },
    "Swagger / OpenAPI": {
        "category": "Development Tools",
        "aliases": ["swagger", "openapi", "api documentation"]
    },
    "Kafka": {
        "category": "Development Tools",
        "aliases": ["kafka", "apache kafka", "message queue", "rabbitmq", "event-driven architecture"]
    },
    "OAuth & JWT": {
        "category": "Development Tools",
        "aliases": ["oauth", "oauth2", "oauth 2.0", "jwt", "json web token", "authentication", "sso"]
    },
    "Data Structures & Algorithms": {
        "category": "Development Tools",
        "aliases": ["data structures", "algorithms", "dsa", "leetcode", "time complexity", "space complexity"]
    },
    "Object-Oriented Programming": {
        "category": "Development Tools",
        "aliases": ["object-oriented programming", "oop", "oops", "design patterns", "solid principles"]
    },
    "Test-Driven Development (TDD)": {
        "category": "Development Tools",
        "aliases": ["tdd", "unit testing", "jest", "pytest", "mocha", "chai", "cypress", "selenium", "integration testing"]
    },

    # --------------------------------------------------------------------------
    # 7. Soft Skills & Methodologies
    # --------------------------------------------------------------------------
    "Agile / Scrum": {
        "category": "Soft Skills",
        "aliases": ["agile", "scrum", "sprint planning", "kanban", "daily standups", "jira", "confluence"]
    },
    "Communication": {
        "category": "Soft Skills",
        "aliases": ["communication", "technical communication", "verbal communication", "written communication", "presentation skills"]
    },
    "Teamwork & Collaboration": {
        "category": "Soft Skills",
        "aliases": ["teamwork", "collaboration", "cross-functional collaboration", "pair programming", "peer reviews", "code reviews"]
    },
    "Problem Solving": {
        "category": "Soft Skills",
        "aliases": ["problem solving", "troubleshooting", "debugging", "root cause analysis", "analytical problem solving"]
    },
    "Leadership & Mentorship": {
        "category": "Soft Skills",
        "aliases": ["leadership", "mentorship", "mentoring", "team lead", "technical leadership", "coaching"]
    },
    "Critical Thinking": {
        "category": "Soft Skills",
        "aliases": ["critical thinking", "analytical skills", "decision making"]
    },
    "Time Management": {
        "category": "Soft Skills",
        "aliases": ["time management", "multitasking", "prioritization", "deadline management"]
    },
    "Adaptability": {
        "category": "Soft Skills",
        "aliases": ["adaptability", "fast learner", "quick learner", "continuous learning", "growth mindset"]
    },
    "Project Management": {
        "category": "Soft Skills",
        "aliases": ["project management", "sdlc", "software development lifecycle", "stakeholder management"]
    }
}


# Precompute lookup dictionaries for fast, O(1) alias normalization
ALIAS_TO_CANONICAL: Dict[str, Tuple[str, str]] = {}
ALL_CANONICAL_NAMES: Dict[str, str] = {}

for canonical, meta in SKILL_TAXONOMY.items():
    cat = meta["category"]
    ALL_CANONICAL_NAMES[canonical.lower()] = canonical
    ALIAS_TO_CANONICAL[canonical.lower()] = (canonical, cat)
    for alias in meta.get("aliases", []):
        ALIAS_TO_CANONICAL[alias.lower()] = (canonical, cat)


# Custom stopwords that won't conflict with programming terms (like C, R, Go)
DOMAIN_PRESERVED_TOKENS = {"c", "r", "go", "it", "ai", "ml", "dl", "nlp", "ui", "ux", "db", "os"}


class NLPService:
    """
    Production-grade NLP pipeline for resume text cleaning, tokenization,
    stop-word filtering, lemmatization, and canonical skill extraction.
    """

    def __init__(self):
        self.nlp = nlp
        self.lemmatizer = lemmatizer
        self.stopwords = NLTK_STOPWORDS
        self.taxonomy = SKILL_TAXONOMY
        self.alias_map = ALIAS_TO_CANONICAL

    # --------------------------------------------------------------------------
    # 1. Text Cleaning
    # --------------------------------------------------------------------------
    def clean_text(self, text: str) -> str:
        """
        Normalize text while preserving technical syntaxes:
        - Normalize unicode accents / characters (NFKD)
        - Replace bullet point glyphs with standard spaces/newlines
        - Protect special programming terms (C++, C#, .NET, Node.js, CI/CD, etc.)
        - Strip non-printable control characters
        - Normalize multiple whitespace and tabs
        """
        if not text:
            return ""

        # Normalize unicode characters
        text = unicodedata.normalize('NFKD', text)

        # Replace non-standard bullets & dashes
        text = re.sub(r'[\u2022\u2023\u25E6\u2043\u2219\u25CB\u25CF\u25A0\u25AA\u00B7\u2013\u2014]', ' ', text)

        # Remove null bytes and non-printable control characters (except newline, tab, carriage return)
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)

        # Replace carriage returns
        text = text.replace('\r\n', '\n').replace('\r', '\n')

        # Clean URLs and emails by keeping them recognizable or normalizing
        # Replace multiple spaces with a single space while keeping line structures
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            cleaned_line = re.sub(r'[ \t]+', ' ', line).strip()
            if cleaned_line:
                cleaned_lines.append(cleaned_line)

        cleaned_text = '\n'.join(cleaned_lines)
        return cleaned_text

    # --------------------------------------------------------------------------
    # 2. Tokenization
    # --------------------------------------------------------------------------
    def tokenize(self, text: str) -> List[str]:
        """
        Extract token stream handling programming terms with punctuation (e.g. C++, Node.js, CI/CD, .NET).
        """
        if not text:
            return []

        if self.nlp:
            try:
                doc = self.nlp(text)
                return [token.text for token in doc if token.text.strip()]
            except Exception:
                pass

        if NLTK_AVAILABLE:
            try:
                return [t for t in word_tokenize(text) if t.strip()]
            except Exception:
                pass

        # Regex fallback tokenizer preserving C++, C#, .NET, CI/CD
        pattern = r'[A-Za-z0-9_\+#\.\-]+|[^\s\w]'
        tokens = re.findall(pattern, text)
        return [t.strip() for t in tokens if t.strip()]

    # --------------------------------------------------------------------------
    # 3. Stop-word Removal
    # --------------------------------------------------------------------------
    def remove_stopwords(self, tokens: List[str]) -> List[str]:
        """
        Remove stop-words while preserving technical terminology tokens (e.g., C, R, Go).
        """
        filtered_tokens = []
        for token in tokens:
            lower_token = token.lower()
            if lower_token in DOMAIN_PRESERVED_TOKENS:
                filtered_tokens.append(token)
            elif lower_token in self.stopwords:
                continue
            elif len(lower_token) == 1 and lower_token in string.punctuation:
                continue
            else:
                filtered_tokens.append(token)
        return filtered_tokens

    # --------------------------------------------------------------------------
    # 4. POS Tagging and Lemmatization
    # --------------------------------------------------------------------------
    def lemmatize(self, text_or_tokens) -> List[Dict[str, str]]:
        """
        Produce base root lemmas and POS tags using spaCy or NLTK or rule-based fallback.
        """
        if isinstance(text_or_tokens, list):
            sample_text = " ".join(text_or_tokens)
        else:
            sample_text = str(text_or_tokens)

        if self.nlp:
            try:
                doc = self.nlp(sample_text[:15000]) # Cap to avoid overhead on massive docs
                lemmatized_results = []
                for token in doc:
                    if not token.text.strip() or token.is_punct or token.is_space:
                        continue

                    lemmatized_results.append({
                        "word": token.text,
                        "lemma": token.lemma_.lower() if token.lemma_ != "-PRON-" else token.text.lower(),
                        "pos": token.pos_,
                        "tag": token.tag_,
                        "is_stop": token.is_stop and (token.text.lower() not in DOMAIN_PRESERVED_TOKENS)
                    })
                if lemmatized_results:
                    return lemmatized_results
            except Exception:
                pass

        # Fallback using NLTK or regex
        tokens = self.tokenize(sample_text[:15000])
        lemmatized_results = []
        for t in tokens:
            if not t or t in string.punctuation:
                continue
            lower_t = t.lower()
            lemma = lower_t
            if self.lemmatizer:
                try:
                    lemma = self.lemmatizer.lemmatize(lower_t)
                except Exception:
                    pass
            elif lower_t.endswith("ing") and len(lower_t) > 5:
                lemma = lower_t[:-3]
            elif lower_t.endswith("ed") and len(lower_t) > 4:
                lemma = lower_t[:-2]
            elif lower_t.endswith("s") and len(lower_t) > 3 and not lower_t.endswith("ss"):
                lemma = lower_t[:-1]

            pos_tag_val = "NOUN" if lower_t[0].isupper() else "VERB" if lower_t.endswith(("ing", "ed")) else "PROPN"
            lemmatized_results.append({
                "word": t,
                "lemma": lemma,
                "pos": pos_tag_val,
                "tag": pos_tag_val,
                "is_stop": lower_t in self.stopwords and (lower_t not in DOMAIN_PRESERVED_TOKENS)
            })

        return lemmatized_results

    # --------------------------------------------------------------------------
    # 5. Skill Normalization & Extraction
    # --------------------------------------------------------------------------
    def normalize_skill(self, raw_skill_name: str) -> Optional[Dict[str, str]]:
        """
        Normalize variations such as 'python', 'PYTHON', 'Python3', 'react.js'
        into canonical representation: 'Python', 'React'.
        """
        if not raw_skill_name:
            return None

        cleaned = raw_skill_name.strip().lower()
        cleaned = re.sub(r'[\(\)\[\],;:]', '', cleaned).strip()

        if cleaned in self.alias_map:
            canonical, category = self.alias_map[cleaned]
            return {
                "canonical": canonical,
                "category": category,
                "original": raw_skill_name
            }

        # Check with punctuation stripped
        no_punct = re.sub(r'[^a-zA-Z0-9\+#]', '', cleaned)
        if no_punct in self.alias_map:
            canonical, category = self.alias_map[no_punct]
            return {
                "canonical": canonical,
                "category": category,
                "original": raw_skill_name
            }

        return None

    def extract_skills(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive skill extraction using:
        1. Multi-word phrase & n-gram matching
        2. Exact token matching with word-boundary awareness
        3. spaCy noun chunks & entity scanning
        4. Canonical normalization and category clustering
        """
        if not text:
            return {
                "total_skills_count": 0,
                "all_skills": [],
                "extracted_skills": [],
                "categorized_skills": {},
                "category_counts": {},
                "top_skills": []
            }

        cleaned = self.clean_text(text)
        lower_text = " " + cleaned.lower() + " "
        # Replace common delimiters with spaces for sliding windows
        normalized_text = re.sub(r'[\r\n\t,;|\/•·\(\)\[\]]', ' ', lower_text)
        normalized_text = re.sub(r'[ ]+', ' ', normalized_text)

        extracted_map: Dict[str, Dict[str, Any]] = {}

        # 1. Check all taxonomy aliases in sorted order (longer aliases first to match multi-word phrases)
        sorted_aliases = sorted(self.alias_map.keys(), key=lambda x: len(x), reverse=True)

        for alias in sorted_aliases:
            canonical, category = self.alias_map[alias]

            # Build regex with boundary checking
            # Special handling for single chars like 'c' or 'r' or terms with symbols like 'c++', 'c#', '.net'
            if alias in {"c", "r", "go", "it"}:
                # Stricter word boundary
                pattern = r'(?<![a-zA-Z0-9_\+#\.\-])' + re.escape(alias) + r'(?![a-zA-Z0-9_\+#\.\-])'
            elif alias in {"c++", "c#", ".net", "ci/cd"}:
                pattern = r'(?<![a-zA-Z0-9])' + re.escape(alias) + r'(?![a-zA-Z0-9])'
            else:
                pattern = r'\b' + re.escape(alias) + r'\b'

            matches = list(re.finditer(pattern, lower_text, re.IGNORECASE))
            if matches:
                occurrences = len(matches)
                matched_forms = list({m.group(0) for m in matches})

                if canonical not in extracted_map:
                    extracted_map[canonical] = {
                        "skill": canonical,
                        "category": category,
                        "occurrences": occurrences,
                        "confidence": 1.0,
                        "matched_as": matched_forms,
                        "aliases_found": [alias]
                    }
                else:
                    # Update occurrences and matched forms
                    extracted_map[canonical]["occurrences"] += occurrences
                    for mf in matched_forms:
                        if mf not in extracted_map[canonical]["matched_as"]:
                            extracted_map[canonical]["matched_as"].append(mf)
                    if alias not in extracted_map[canonical]["aliases_found"]:
                        extracted_map[canonical]["aliases_found"].append(alias)

        # 2. Extract noun chunks using spaCy to discover potential domain compound skills
        try:
            doc = self.nlp(cleaned[:8000])
            for chunk in doc.noun_chunks:
                chunk_clean = chunk.text.strip().lower()
                norm = self.normalize_skill(chunk_clean)
                if norm:
                    canonical = norm["canonical"]
                    category = norm["category"]
                    if canonical not in extracted_map:
                        extracted_map[canonical] = {
                            "skill": canonical,
                            "category": category,
                            "occurrences": 1,
                            "confidence": 0.95,
                            "matched_as": [chunk.text],
                            "aliases_found": [chunk_clean]
                        }
        except Exception:
            pass

        # Sort extracted skills by occurrences descending, then alphabetically
        extracted_skills_list = sorted(
            list(extracted_map.values()),
            key=lambda x: (-x["occurrences"], x["skill"])
        )

        # Build categorized collections
        categorized: Dict[str, List[str]] = {}
        category_counts: Dict[str, int] = {}

        for item in extracted_skills_list:
            cat = item["category"]
            if cat not in categorized:
                categorized[cat] = []
                category_counts[cat] = 0
            categorized[cat].append(item["skill"])
            category_counts[cat] += 1

        all_skills = [item["skill"] for item in extracted_skills_list]

        return {
            "total_skills_count": len(extracted_skills_list),
            "all_skills": all_skills,
            "extracted_skills": extracted_skills_list,
            "categorized_skills": categorized,
            "category_counts": category_counts,
            "top_skills": all_skills[:10]
        }

    # --------------------------------------------------------------------------
    # End-to-end Pipeline Execution
    # --------------------------------------------------------------------------
    def process_text_pipeline(self, raw_text: str, basic_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute full 5-stage NLP pipeline and return complete analysis payload:
        1. Cleaned text
        2. Tokenized words & raw counts
        3. Filtered non-stopword tokens
        4. Lemmatized and POS-tagged representation
        5. Extracted categorized skills with normalization mapping
        """
        if not raw_text:
            raw_text = ""

        # Step 1: Cleaning
        cleaned_text = self.clean_text(raw_text)

        # Step 2: Tokenization
        raw_tokens = self.tokenize(cleaned_text)

        # Step 3: Stop-word filtering
        filtered_tokens = self.remove_stopwords(raw_tokens)
        stopwords_removed_count = max(0, len(raw_tokens) - len(filtered_tokens))

        # Step 4: Lemmatization & POS Tagging
        lemmas_pos = self.lemmatize(cleaned_text)
        pos_distribution = Counter([item["pos"] for item in lemmas_pos])

        # Step 5: Skill Extraction
        skills_result = self.extract_skills(raw_text)

        # Basic text and lexical metrics
        words = re.findall(r'\b[a-zA-Z0-9_\+#\.\-]+\b', cleaned_text)
        word_count = len(words)
        char_count = len(cleaned_text)
        unique_words = len(set(w.lower() for w in words))
        lexical_diversity = round((unique_words / word_count), 3) if word_count > 0 else 0.0

        # Construct basic resume / text info
        info = basic_info or {}
        if "word_count" not in info:
            info["word_count"] = word_count
        if "char_count" not in info:
            info["char_count"] = char_count
        if "tokens_count" not in info:
            info["tokens_count"] = len(raw_tokens)
        if "lexical_diversity" not in info:
            info["lexical_diversity"] = lexical_diversity

        return {
            "success": True,
            "basic_info": info,
            "nlp_pipeline": {
                "stage_1_text_cleaning": {
                    "raw_character_count": len(raw_text),
                    "cleaned_character_count": char_count,
                    "cleaned_text_preview": cleaned_text[:300] + ("..." if len(cleaned_text) > 300 else ""),
                },
                "stage_2_tokenization": {
                    "total_tokens": len(raw_tokens),
                    "tokens_sample": raw_tokens[:25]
                },
                "stage_3_stopword_removal": {
                    "stopwords_removed_count": stopwords_removed_count,
                    "filtered_tokens_count": len(filtered_tokens),
                    "filtered_sample": filtered_tokens[:25]
                },
                "stage_4_lemmatization_and_pos": {
                    "total_lemmatized": len(lemmas_pos),
                    "pos_distribution": dict(pos_distribution),
                    "sample_lemmas": lemmas_pos[:15]
                },
                "stage_5_skill_extraction": {
                    "total_extracted": skills_result["total_skills_count"],
                    "categories_count": len(skills_result["categorized_skills"]),
                    "category_breakdown": skills_result["category_counts"]
                }
            },
            "cleaned_text": cleaned_text,
            "skills": skills_result,
            "extracted_skills": skills_result["extracted_skills"],
            "categorized_skills": skills_result["categorized_skills"]
        }


# Singleton instance for reusable fast access
nlp_service = NLPService()


if __name__ == "__main__":
    test_sample = """
    ALEX RIVERS
    alex.rivers@college.edu | San Francisco, CA
    Full-Stack & Machine Learning Software Engineer. Experienced in Python, TypeScript, React.js,
    FastAPI, PostgreSQL, Redis, Docker, Kubernetes, and AWS ECS. Built machine learning models
    with PyTorch, spaCy, and Sentence-Transformers. Practiced in Agile, CI/CD, and Microservices.
    """
    print("Testing NLP Service on sample text...")
    res = nlp_service.process_text_pipeline(test_sample)
    print(f"Total skills extracted: {res['skills']['total_skills_count']}")
    print("Categorized Skills:")
    for cat, skl in res["categorized_skills"].items():
        print(f"  [{cat}]: {', '.join(skl)}")
