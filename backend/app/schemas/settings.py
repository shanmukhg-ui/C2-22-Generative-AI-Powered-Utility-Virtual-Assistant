from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class UserPreferencesSchema(BaseModel):
    theme: str = Field(default="light", description="light | dark | system")
    density: str = Field(default="comfortable", description="comfortable | compact")
    default_landing_page: str = Field(default="dashboard")
    preferred_language: str = Field(default="English")
    phone: str = Field(default="")
    email_notifications: bool = Field(default=True)
    in_app_alerts: bool = Field(default=True)
    critical_outage_alerts: bool = Field(default=True)
    daily_summary_ready_alerts: bool = Field(default=True)
    ingestion_alerts: bool = Field(default=True)
    security_alerts: bool = Field(default=True)
    response_length: str = Field(default="detailed", description="concise | detailed")
    show_citations: bool = Field(default=True)
    save_conversation_history: bool = Field(default=True)
    default_region_filter: str = Field(default="All Wards")
    default_severity_filter: str = Field(default="All Severities")
    default_summary_time_range: str = Field(default="Today")

class SystemSettingsSchema(BaseModel):
    version: int = Field(default=1)
    chat_model: str = Field(default="google/gemini-2.5-flash")
    embedding_model: str = Field(default="text-embedding-3-small")
    top_k: int = Field(default=5, ge=1, le=10)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    chunk_size: int = Field(default=800, ge=100, le=2000)
    chunk_overlap: int = Field(default=100, ge=0, le=500)
    safe_fallback_message: str = Field(
        default="I couldn't find this in the approved utility documents. Please contact support."
    )
    allowed_file_types: List[str] = Field(default=["application/pdf"])
    max_upload_size_bytes: int = Field(default=10485760) # 10MB
    default_visibility: str = Field(default="public")
    enable_self_signup: bool = Field(default=True)
    default_role_for_new_users: str = Field(default="Customer")
    session_timeout_minutes: int = Field(default=60)
    rate_limit_per_minute: int = Field(default=60)
    demo_mode: bool = Field(default=True)
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None

class IntegrationHealthSchema(BaseModel):
    name: str
    status: str
    demo_mode: bool
    configured: bool
    details: Optional[str] = None

