import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "RCY Recovery Manager"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/recovery_manager.db")
    
    # Storage (Cloudinary + Local Fallback)
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")
    LOCAL_STORAGE_DIR: str = str(BASE_DIR / "uploads")
    
    # AI / LLM Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Security, Auth & Tenancy
    REQUIRE_AUTH: bool = False
    SECRET_KEY: str = ""
    AGENT_API_KEY: str = ""
    ALLOWED_ORGS: str = "org_demo_alpha,org_demo_bravo"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    def __init__(self, **values):
        super().__init__(**values)
        if self.REQUIRE_AUTH:
            if not self.AGENT_API_KEY:
                raise RuntimeError("AGENT_API_KEY environment variable is required when REQUIRE_AUTH=true")

    @property
    def allowed_orgs_set(self) -> set:
        return {org.strip() for org in self.ALLOWED_ORGS.split(",") if org.strip()}
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)


