from fastapi import APIRouter, Depends
from typing import Dict, Any
import time
from datetime import datetime
from app.security.firebase_auth import get_current_user, require_verified_user
from app.schemas.requests import UserProfileUpdate
from app.schemas.responses import UserResponse
from app.database.mongo import get_database

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the currently authenticated user with their verified role from MongoDB.
    """
    return UserResponse(
        user_id=current_user["user_id"],
        firebase_uid=current_user["firebase_uid"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        city=current_user.get("city", "Vizag"),
        department=current_user.get("department", "Citizen"),
        phone=current_user.get("phone"),
        dob=current_user.get("dob"),
        photo_url=current_user.get("photo_url"),
        gender=current_user.get("gender"),
        address=current_user.get("address"),
        meter_number=current_user.get("meter_number"),
        emergency_contact=current_user.get("emergency_contact"),
        preferred_language=current_user.get("preferred_language", "English"),
        notifications=current_user.get("notifications"),
        email_verified=current_user.get("email_verified", True)
    )

@router.put("/profile")
async def update_profile(payload: UserProfileUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Updates the authenticated user's profile details and persists directly to MongoDB Atlas.
    """
    db = get_database()
    user_id = current_user["user_id"]
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    
    if update_data:
        db.users.update_one({"user_id": user_id}, {"$set": update_data})
        
        # Write to audit_logs
        db.audit_logs.insert_one({
            "audit_id": f"AUD_PRF_{int(time.time() * 1000)}",
            "user_id": user_id,
            "role": current_user["role"],
            "action": "PROFILE_UPDATE",
            "timestamp": datetime.now().isoformat(),
            "resource": f"users/{user_id}",
            "details": f"Updated profile fields: {list(update_data.keys())}",
            "status": "SUCCESS"
        })

    updated = db.users.find_one({"user_id": user_id}) or current_user
    if "_id" in updated:
        del updated["_id"]
    return {"success": True, "user": updated, "message": "Profile updated successfully in MongoDB Atlas"}

