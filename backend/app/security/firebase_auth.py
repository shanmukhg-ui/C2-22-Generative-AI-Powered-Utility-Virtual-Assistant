import logging
import re
import time
from typing import Optional, Dict, Any, List
from fastapi import Header, HTTPException, status, Depends
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from app.database.mongo import get_database
from app.security.rbac import UserRole, RBACManager
from app.security.firebase_admin_init import verify_firebase_id_token

logger = logging.getLogger(__name__)

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Retrieves the verified user profile from MongoDB based on active persona / user identifier.
    Supports:
    1. Direct User ID tokens: 'Bearer CUST0001', 'Bearer EMP0001', 'Bearer ADM0001'
    2. Email-based tokens: 'Bearer john.doe@example.com'
    3. Firebase ID tokens (backward compatible fallback)
    4. Default fallback to CUST0001 (John Doe) if no header is present
    """
    db = get_database()
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    
    user = None
    if token:
        # 1. Direct lookup by user_id
        user = db.users.find_one({"user_id": token})
        if not user:
            # 2. Lookup by email
            user = db.users.find_one({"email": {"$regex": f"^{re.escape(token)}$", "$options": "i"}})
        if not user:
            # 3. Lookup by firebase_uid
            user = db.users.find_one({"firebase_uid": token})
        if not user and (token.startswith("eyJ") or "." in token):
            # 4. Fallback for JWT / Firebase token format
            try:
                decoded = verify_firebase_id_token(token)
                uid = decoded.get("uid")
                email = (decoded.get("email") or "").strip().lower()
                if uid:
                    user = db.users.find_one({"firebase_uid": uid})
                if not user and email:
                    user = db.users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
            except Exception:
                pass

    if not user:
        # Default active persona: John Doe (Customer)
        user = db.users.find_one({"user_id": "CUST0001"})
        if not user:
            user = db.users.find_one({"role": UserRole.CUSTOMER.value})

    if not user:
        # Fallback seeded dictionary
        return {
            "user_id": "CUST0001",
            "firebase_uid": "cust0001",
            "name": "John Doe",
            "email": "john.doe@example.com",
            "role": UserRole.CUSTOMER.value,
            "city": "Riverside",
            "department": "Customer",
            "is_active": True,
            "status": "Active",
            "email_verified": True
        }

    return {
        "user_id": user.get("user_id", "CUST0001"),
        "firebase_uid": user.get("firebase_uid", user.get("user_id", "CUST0001")),
        "name": user.get("name", "User"),
        "email": user.get("email", "user@utilityai.org"),
        "role": user.get("role", UserRole.CUSTOMER.value),
        "city": user.get("city"),
        "department": user.get("department"),
        "phone": user.get("phone"),
        "dob": user.get("dob"),
        "photo_url": user.get("photo_url"),
        "gender": user.get("gender"),
        "address": user.get("address"),
        "meter_number": user.get("meter_number"),
        "emergency_contact": user.get("emergency_contact"),
        "preferred_language": user.get("preferred_language", "English"),
        "notifications": user.get("notifications", {"sms": False, "email": True, "whatsapp": False}),
        "email_verified": True,
        "is_active": True,
        "status": "Active",
        "created_at": user.get("created_at")
    }

async def require_verified_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns the current user without blocking with email verification requirements.
    """
    return current_user

def require_role(allowed_roles: List[UserRole]):
    """
    Enforces RBAC role authorization on authenticated users.
    """
    def dependency(current_user: Dict[str, Any] = Depends(get_current_user)):
        RBACManager.enforce_role(current_user["role"], allowed_roles)
        return current_user
    return dependency
