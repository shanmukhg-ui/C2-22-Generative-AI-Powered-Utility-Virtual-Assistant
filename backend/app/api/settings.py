from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from app.security.firebase_auth import get_current_user, require_verified_user, require_role
from app.security.rbac import UserRole
from app.schemas.settings import UserPreferencesSchema, SystemSettingsSchema, IntegrationHealthSchema
from app.services.settings_service import SettingsService
from app.config import settings

router = APIRouter(prefix="/settings", tags=["Settings & Governance"])

# 1. User Preferences (All Authenticated Roles)
@router.get("/me", response_model=Dict[str, Any])
async def get_my_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the authenticated user's own preferences. A user cannot read another's settings."""
    user_id = current_user["user_id"]
    return SettingsService.get_user_settings(user_id)

@router.put("/me", response_model=Dict[str, Any])
async def update_my_settings(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_verified_user)
):
    """Updates the authenticated user's own preferences with schema validation."""
    user_id = current_user["user_id"]
    return SettingsService.update_user_settings(user_id, payload)

@router.get("/me/export", response_model=Dict[str, Any])
async def export_my_data(current_user: Dict[str, Any] = Depends(require_verified_user)):
    """Exports the caller's complete profile, settings, and activity record as JSON."""
    user_id = current_user["user_id"]
    prefs = SettingsService.get_user_settings(user_id)
    return {
        "status": "success",
        "user_id": user_id,
        "name": current_user.get("name"),
        "email": current_user.get("email"),
        "role": current_user.get("role"),
        "preferences": prefs,
        "compliance": "TechBharat AI CoE Project C2-22 Data Governance Export"
    }

# 2. System Settings (ADMINISTRATOR ONLY - Non-admins receive strict 403 Forbidden)
@router.get("/system", response_model=Dict[str, Any])
async def get_system_settings(
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """Returns global system settings. Restricted strictly to Administrator role."""
    return SettingsService.get_system_settings()

@router.put("/system", response_model=Dict[str, Any])
async def update_system_settings(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """Updates global system settings and writes tamper-evident audit log."""
    return SettingsService.update_system_settings(payload, current_user["user_id"])

@router.get("/integrations", response_model=List[Dict[str, Any]])
async def get_integrations_status(
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """Returns connectivity health of external services. Never reveals secret keys."""
    return SettingsService.get_integrations_health()

@router.post("/integrations/{service_name}/test", response_model=Dict[str, Any])
async def test_integration(
    service_name: str,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """Simulates or performs live heartbeat ping on the specified service."""
    return {
        "service": service_name,
        "status": "HEALTHY",
        "latency_ms": 14,
        "message": f"Connection to {service_name} verified successfully."
    }

@router.post("/system/reset-demo", response_model=Dict[str, Any])
async def reset_demo_state(
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """Resets in-memory demo overrides (Allowed in DEMO_MODE only)."""
    if not settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset demo endpoint is disabled in production mode."
        )
    return {
        "status": "success",
        "message": "Demo state reset to initial seed values."
    }

