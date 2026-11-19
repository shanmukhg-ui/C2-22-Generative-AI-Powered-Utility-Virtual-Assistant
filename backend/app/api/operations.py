from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from app.security.firebase_auth import get_current_user, require_role
from app.security.rbac import UserRole
from app.schemas.requests import SummarizeRequest
from app.agents.tools import AgentTools
from app.agents.router import AgentQueryRouter
from app.database.mongo import get_database

router = APIRouter(prefix="/operations", tags=["Operations"])

@router.get("/logs", response_model=Dict[str, Any])
async def get_operational_logs(
    utility: Optional[str] = Query(None),
    incident_type: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
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

    return {"logs": logs}

@router.post("/summarize", response_model=Dict[str, Any])
async def summarize_operations(
    payload: SummarizeRequest,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.EMPLOYEE, UserRole.ADMINISTRATOR]))
):
    """
    Summarizes daily operational issues, critical outages, and crew deployments using Generative AI.
    """
    result = AgentQueryRouter.route_and_execute(
        query="Summarize today's issues and outages",
        user_id=current_user["user_id"],
        role=current_user["role"]
    )
    return result
