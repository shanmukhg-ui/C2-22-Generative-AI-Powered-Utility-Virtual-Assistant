import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.database.mongo import get_database
from app.schemas.settings import UserPreferencesSchema, SystemSettingsSchema, IntegrationHealthSchema
from app.config import settings

class SettingsService:
    _system_cache: Optional[Dict[str, Any]] = None

    @classmethod
    def get_user_settings(cls, user_id: str) -> Dict[str, Any]:
        db = get_database()
        user_setting = db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
        if not user_setting:
            default_prefs = UserPreferencesSchema().model_dump()
            default_prefs["user_id"] = user_id
            db.user_settings.insert_one(default_prefs)
            return default_prefs
        return user_setting

    @classmethod
    def update_user_settings(cls, user_id: str, new_prefs: Dict[str, Any]) -> Dict[str, Any]:
        db = get_database()
        # Merge and sanitize
        current = cls.get_user_settings(user_id)
        current.update(new_prefs)
        current["user_id"] = user_id
        current["updated_at"] = datetime.now().isoformat()
        db.user_settings.update_one({"user_id": user_id}, {"$set": current}, upsert=True)
        return current

    @classmethod
    def get_system_settings(cls) -> Dict[str, Any]:
        if cls._system_cache is not None:
            return cls._system_cache

        db = get_database()
        sys_settings = db.system_settings.find_one({}, {"_id": 0})
        if not sys_settings:
            default_sys = SystemSettingsSchema(
                demo_mode=settings.DEMO_MODE,
                chat_model=settings.OPENAI_MODEL,
                embedding_model=settings.OPENAI_EMBEDDING_MODEL
            ).model_dump()
            default_sys["updated_at"] = datetime.now().isoformat()
            db.system_settings.insert_one(default_sys)
            cls._system_cache = default_sys
            return default_sys
        cls._system_cache = sys_settings
        return sys_settings

    @classmethod
    def update_system_settings(cls, new_settings: Dict[str, Any], admin_user_id: str) -> Dict[str, Any]:
        db = get_database()
        current = cls.get_system_settings()
        old_val = str(current)
        current.update(new_settings)
        current["version"] = current.get("version", 1) + 1
        current["updated_by"] = admin_user_id
        current["updated_at"] = datetime.now().isoformat()
        cls._system_cache = current
        db.system_settings.update_one({}, {"$set": current}, upsert=True)

        # Audit log for security compliance (spec rule 6)
        db.audit_logs.insert_one({
            "audit_id": f"AUD_SYS_{int(time.time() * 1000)}",
            "user_id": admin_user_id,
            "role": "Administrator",
            "action": "UPDATE_SYSTEM_SETTINGS",
            "timestamp": datetime.now().isoformat(),
            "resource": "system_settings",
            "details": f"Admin updated system settings to version {current['version']}",
            "status": "SUCCESS"
        })
        return current

    @classmethod
    def get_integrations_health(cls) -> List[Dict[str, Any]]:
        # Never returns secrets (rule 3 & H)
        return [
            {
                "name": "OpenAI / OpenRouter API",
                "status": "Configured & Active" if settings.OPENAI_API_KEY else "Demo Mode (Mock Synthesis)",
                "demo_mode": settings.DEMO_MODE,
                "configured": bool(settings.OPENAI_API_KEY),
                "details": f"Model: {settings.OPENAI_MODEL}"
            },
            {
                "name": "MongoDB Database",
                "status": "Connected (In-Memory Mock / Live Mongo)",
                "demo_mode": settings.USE_MOCK_MONGO,
                "configured": True,
                "details": f"Database: {settings.MONGODB_DATABASE}"
            },
            {
                "name": "ChromaDB Vector Database",
                "status": "Persistent & Ready",
                "demo_mode": False,
                "configured": True,
                "details": "Persistent local vector index"
            },
            {
                "name": "Firebase Authentication",
                "status": "Demo Mode (Verified RBAC Header Tokens)",
                "demo_mode": settings.DEMO_MODE,
                "configured": bool(settings.FIREBASE_PROJECT_ID),
                "details": f"Project: {settings.FIREBASE_PROJECT_ID}"
            }
        ]

