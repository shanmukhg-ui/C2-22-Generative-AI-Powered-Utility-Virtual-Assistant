from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
import time
import re
from datetime import datetime
from pydantic import BaseModel
from pymongo import ReturnDocument
from app.security.firebase_auth import get_current_user, require_verified_user
from app.schemas.requests import UserProfileUpdate
from app.schemas.responses import UserResponse
from app.database.mongo import get_database

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = None

class PersonaRequest(BaseModel):
    persona_id: str

@router.post("/login")
async def login(payload: LoginRequest):
    """
    Direct native citizen and employee login without Firebase dependencies.
    """
    db = get_database()
    email = payload.email.strip().lower()
    user = db.users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
    
    if not user:
        # Auto-provision new citizen
        seq_doc = db.counters.find_one_and_update(
            {"_id": "customer_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        user_id = f"CUST{int(seq_doc.get('seq', 1)):04d}"
        disp_name = email.split("@")[0].replace(".", " ").title()
        user = {
            "user_id": user_id,
            "firebase_uid": f"usr_{user_id.lower()}",
            "name": disp_name,
            "email": email,
            "role": "Customer",
            "city": "Vizag",
            "department": "Citizen",
            "email_verified": True,
            "is_active": True,
            "status": "Active",
            "created_at": datetime.now().isoformat()
        }
        db.users.insert_one(user)

    if "_id" in user:
        del user["_id"]
    return {
        "success": True,
        "token": user["user_id"],
        "user": user
    }

@router.post("/register")
async def register(payload: RegisterRequest):
    """
    Direct citizen registration without external Firebase dependencies.
    """
    db = get_database()
    email = payload.email.strip().lower()
    name = payload.name.strip()
    user = db.users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
    
    if not user:
        seq_doc = db.counters.find_one_and_update(
            {"_id": "customer_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        user_id = f"CUST{int(seq_doc.get('seq', 1)):04d}"
        user = {
            "user_id": user_id,
            "firebase_uid": f"usr_{user_id.lower()}",
            "name": name,
            "email": email,
            "role": "Customer",
            "city": "Vizag",
            "department": "Citizen",
            "email_verified": True,
            "is_active": True,
            "status": "Active",
            "created_at": datetime.now().isoformat()
        }
        db.users.insert_one(user)

    if "_id" in user:
        del user["_id"]
    return {
        "success": True,
        "token": user["user_id"],
        "user": user
    }

@router.post("/persona")
async def switch_persona_api(payload: PersonaRequest):
    """
    Instant 1-click persona switching (John Doe, Priya Singh, Amit Kumar).
    """
    db = get_database()
    persona_id = payload.persona_id.strip()
    user = db.users.find_one({"user_id": persona_id})
    
    if not user:
        presets = {
            "CUST0001": {"name": "John Doe", "email": "john.doe@example.com", "role": "Customer", "city": "Riverside", "department": "Customer"},
            "EMP0001": {"name": "Priya Singh", "email": "priya.singh@utilityai.org", "role": "Employee", "city": "Green Park", "department": "Operations"},
            "ADM0001": {"name": "Amit Kumar", "email": "amit.kumar@utilityai.org", "role": "Administrator", "city": "Central Office", "department": "Administrator"},
            "CUST0010": {"name": "Priya Patel", "email": "customer0010@example.test", "role": "Customer", "city": "North Sector", "department": "Customer"}
        }
        preset = presets.get(persona_id, {"name": persona_id, "email": f"{persona_id.lower()}@utilityai.org", "role": "Customer", "city": "Vizag", "department": "Citizen"})
        user = {
            "user_id": persona_id,
            "firebase_uid": f"usr_{persona_id.lower()}",
            **preset,
            "email_verified": True,
            "is_active": True,
            "status": "Active",
            "created_at": datetime.now().isoformat()
        }
        db.users.update_one({"user_id": persona_id}, {"$set": user}, upsert=True)

    if "_id" in user:
        del user["_id"]
    return {
        "success": True,
        "token": user["user_id"],
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the currently authenticated user with their verified role from MongoDB.
    """
    return UserResponse(
        user_id=current_user["user_id"],
        firebase_uid=current_user.get("firebase_uid", current_user["user_id"]),
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
        email_verified=current_user.get("email_verified", True),
        is_active=current_user.get("is_active", True),
        status=current_user.get("status", "Active"),
        created_at=current_user.get("created_at")
    )

@router.put("/profile")
async def update_profile(payload: UserProfileUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Updates the authenticated user's profile details and persists directly to MongoDB Atlas.
    """
    db = get_database()
    user_id = current_user["user_id"]
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    update_data.pop("role", None)
    update_data.pop("user_id", None)
    update_data.pop("firebase_uid", None)
    update_data.pop("is_active", None)
    update_data.pop("status", None)

    if update_data:
        db.users.update_one({"user_id": user_id}, {"$set": update_data})
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
