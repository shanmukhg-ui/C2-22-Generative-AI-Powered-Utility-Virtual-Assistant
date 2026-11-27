from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from app.security.firebase_auth import get_current_user, require_role, require_verified_user
from app.security.rbac import UserRole
from app.schemas.requests import SummarizeRequest
from app.agents.tools import AgentTools
from app.agents.router import AgentQueryRouter
from app.database.mongo import get_database
from app.services.stats_service import StatsService

router = APIRouter(prefix="/operations", tags=["Operations"])

@router.get("/stats", response_model=Dict[str, Any])
async def get_operational_stats(
    current_user: Dict[str, Any] = Depends(require_verified_user)
):
    """
    Single source of truth statistics endpoint: Synchronized KPIs for dashboards,
    the AI summary generator, and the chatbot.
    """
    return StatsService.get_all_stats()

@router.get("/logs", response_model=Dict[str, Any])
async def get_operational_logs(
    utility: Optional[str] = Query(None),
    incident_type: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.CUSTOMER, UserRole.EMPLOYEE, UserRole.ADMINISTRATOR]))
):
    """
    Returns operational logs and public outage notices.
    """
    db = get_database()
    query: Dict[str, Any] = {}

    if utility:
        query["utility"] = utility
    if incident_type:
        query["incident_type"] = incident_type
    if area:
        query["affected_area"] = {"$regex": area, "$options": "i"}
    if severity:
        query["severity"] = severity

    logs = list(db.operational_logs.find(query).sort("timestamp", -1).limit(limit))
    for l in logs:
        if "_id" in l:
            del l["_id"]

    return {"logs": logs, "total": len(logs)}

@router.post("/summarize", response_model=Dict[str, Any])
async def summarize_operations(
    payload: SummarizeRequest,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.EMPLOYEE, UserRole.ADMINISTRATOR]))
):
    """
    Summarizes daily operational issues, critical outages, and crew deployments using Generative AI.
    Grounds the summary on live aggregate query results from StatsService.
    """
    result = AgentQueryRouter.route_and_execute(
        query=f"Summarize today's operations for date {payload.date or 'today'}",
        user_id=current_user["user_id"],
        role=current_user["role"]
    )
    return result
