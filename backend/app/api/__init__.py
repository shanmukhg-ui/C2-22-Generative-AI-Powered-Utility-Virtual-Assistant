from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.requests import router as requests_router
from app.api.complaints import router as complaints_router
from app.api.operations import router as operations_router
from app.api.knowledge import router as knowledge_router
from app.api.admin import router as admin_router
from app.api.settings import router as settings_router

__all__ = [
    "auth_router", "chat_router", "requests_router",
    "complaints_router", "operations_router", "knowledge_router",
    "admin_router", "settings_router"
]
