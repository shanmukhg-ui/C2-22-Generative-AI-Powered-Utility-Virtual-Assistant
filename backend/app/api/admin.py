from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List
from app.security.firebase_auth import require_role
from app.security.rbac import UserRole
from app.database.mongo import get_database

router = APIRouter(prefix="/admin", tags=["Administration & Governance"])

@router.get("/users", response_model=Dict[str, Any])
async def list_users(
    limit: int = Query(100, ge=1, le=200),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """
    Returns registered users across all roles. Restricted to Administrator.
    """
    db = get_database()
    total = db.users.count_documents({})
    users = list(db.users.find({}, {"_id": 0}).limit(limit))
    return {
        "total": total,
        "users": users
    }

@router.get("/audit-logs", response_model=Dict[str, Any])
async def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """
    Returns system audit logs. Restricted to Administrator.
    """
    db = get_database()
    total = db.audit_logs.count_documents({})
    logs = list(db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return {
        "total": total,
        "logs": logs
    }
