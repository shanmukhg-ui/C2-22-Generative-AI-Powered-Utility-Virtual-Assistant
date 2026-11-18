from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from app.config import settings
from app.database.mongo import DatabaseManager
from app.rag.vector_store import KnowledgeVectorStore
from app.api import (
    auth_router, chat_router, requests_router,
    complaints_router, operations_router, knowledge_router,
    admin_router, settings_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed Database & Initialize Vector Store
    print("=" * 60)
    print("Initializing TechBharat Project C2-22 Backend Services...")
    db_mgr = DatabaseManager()
    db_mgr.seed_data()
    KnowledgeVectorStore.get_instance()
    print("Backend initialization complete. FastAPI ready.")
    print("=" * 60)
    yield
    print("Shutting down backend services.")

app = FastAPI(
    title="TechBharat AI CoE - Project C2-22: Utility Virtual Assistant",
    description="Generative AI-Powered Virtual Assistant featuring Grounded RAG, Role-Based Access Control, Service & Complaint Tracking, and Operational Summarization.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(requests_router, prefix="/api")
app.include_router(complaints_router, prefix="/api")
app.include_router(operations_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "project": "C2-22", "architecture": "FastAPI + MongoDB + RAG + OpenRouter"}

# Serve Frontend SPA if built
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.isdir(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    index_html = os.path.join(frontend_dist, "index.html")

    @app.get("/")
    def serve_index():
        if os.path.isfile(index_html):
            return FileResponse(index_html)
        return {"project": "TechBharat AI CoE - C2-22", "status": "Online"}

    # Direct client-side routes for SPA navigation
    for spa_path in [
        "/chat", "/customer-dash", "/employee-dash", "/admin-dash",
        "/requests", "/complaints", "/operations", "/knowledge",
        "/audit", "/audit-logs", "/login", "/landing", "/settings",
        "/profile", "/users"
    ]:
        def make_handler():
            return lambda: FileResponse(index_html)
        app.add_api_route(spa_path, make_handler(), methods=["GET"], include_in_schema=False)
else:
    @app.get("/")
    def read_root():
        return {
            "project": "TechBharat AI CoE - Cohort #2",
            "code": "Project C2-22",
            "title": "Generative AI-Powered Utility Virtual Assistant",
            "authors": ["Gollavilli Shanmukh Vardhan Sai", "PANAM VICTOR KOMAL"],
            "status": "Online",
            "documentation": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
