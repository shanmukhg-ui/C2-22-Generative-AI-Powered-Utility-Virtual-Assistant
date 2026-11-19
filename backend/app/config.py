import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

class Settings:
    PROJECT_NAME: str = "TechBharat AI CoE - Project C2-22: Utility Virtual Assistant"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # DEMO_MODE flag: Controls mock providers and zero-external-account execution
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")

    # AI / LLM Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY") or os.getenv("OPENROUTER_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL") or os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
    OPENAI_EMBEDDING_MODEL: str = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

    # Security & Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "utilityai-techbharat-c222-demo-secret-key-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours

    # MongoDB Configuration
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "utility_virtual_assistant")
    USE_MOCK_MONGO: bool = os.getenv("USE_MOCK_MONGO", "true").lower() in ("true", "1", "yes")

    # Firebase Auth
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "techbharat-c222-utility")

    # Directories
    CHROMA_PERSIST_DIRECTORY: str = os.getenv("CHROMA_PERSIST_DIRECTORY", str(BASE_DIR / "chroma_db"))
    DATASETS_DIR: Path = BASE_DIR.parent / "datasets"
    KB_PUBLIC_DIR: Path = BASE_DIR.parent / "knowledge_base" / "public"
    KB_INTERNAL_DIR: Path = BASE_DIR.parent / "knowledge_base" / "internal"

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

settings = Settings()

# Automatically enable DEMO_MODE if OpenAI Key is absent
if not settings.OPENAI_API_KEY:
    settings.DEMO_MODE = True
