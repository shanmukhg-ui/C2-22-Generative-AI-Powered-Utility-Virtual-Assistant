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
    Verifies Firebase ID token from the Authorization header and links/retrieves
    the verified user profile from MongoDB.
    
    Security Guarantees:
    - Rejects unauthenticated requests with HTTP 401 Unauthorized.
    - Zero dev-token or simulated bypasses accepted.
    - Roles are strictly enforced by MongoDB on the backend; never trusted from frontend.
    - Links existing seeded profiles (e.g. EMP0001, ADM0001, CUST0001, CUST0010) safely on verified email match.
    - Auto-provisions genuinely new users exclusively as Customer role.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme. Bearer token required.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = authorization[7:].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Bearer token empty.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 1. Cryptographically verify Firebase ID token using Firebase Admin SDK
    try:
        decoded_token = verify_firebase_id_token(token)
    except Exception as e:
        err_msg = str(e).lower()
        if "expired" in err_msg:
            detail = "Authentication token has expired. Please log in again."
        elif "revoked" in err_msg:
            detail = "Authentication token has been revoked."
        else:
            detail = f"Invalid authentication token: {str(e)}"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )

    firebase_uid = decoded_token.get("uid")
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: missing Firebase UID claim.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    raw_email = decoded_token.get("email") or ""
    email = raw_email.strip().lower()
    
    # Check email verification: Google accounts are pre-verified by provider
    sign_in_provider = decoded_token.get("firebase", {}).get("sign_in_provider", "")
    is_google = sign_in_provider == "google.com"
    email_verified = bool(decoded_token.get("email_verified", False)) or is_google

    db = get_database()
    user = None

    # 2. Check for existing mapping by Firebase UID
    user_by_uid = db.users.find_one({"firebase_uid": firebase_uid})

    if user_by_uid:
        # UID is already linked. Reject if token's verified email maps to a different user record
        if email:
            user_by_email = db.users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
            if user_by_email and str(user_by_email.get("_id")) != str(user_by_uid.get("_id")):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Conflicting account mapping: this email is associated with a different user account.",
                    headers={"WWW-Authenticate": "Bearer"}
                )
        user = user_by_uid

    # 3. If not found by UID, check if this verified email matches an existing account (safe linking)
    elif email:
        user_by_email = db.users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
        if user_by_email:
            # Explicitly require email_verified == True before linking by email
            if not email_verified:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot link unverified email address to existing profile. Please verify your email first.",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            # Atomic conditional update: only link if firebase_uid is absent, null, or already matches current UID
            try:
                update_result = db.users.update_one(
                    {
                        "_id": user_by_email["_id"],
                        "$or": [
                            {"firebase_uid": {"$exists": False}},
                            {"firebase_uid": None},
                            {"firebase_uid": firebase_uid}
                        ]
                    },
                    {"$set": {"firebase_uid": firebase_uid}}
                )
            except DuplicateKeyError as e:
                logger.warning(
                    "DuplicateKeyError during Firebase UID linking for user %s: %s",
                    user_by_email.get("user_id"), e
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Conflicting account mapping: this Firebase account is already linked to another profile.",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            # If matched_count == 0, the profile is already linked to a different Firebase UID (or raced)
            if update_result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Conflicting account mapping: this profile is already linked to a different Firebase account.",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            user_by_email["firebase_uid"] = firebase_uid
            user = user_by_email

    # 4. If genuinely new user, auto-provision strictly with Customer role using atomic sequence
    if not user:
        display_name = decoded_token.get("name")
        if not display_name and email:
            display_name = email.split("@")[0].replace(".", " ").title()
        if not display_name:
            display_name = "New Citizen"

        inserted = False
        attempts = 0
        while not inserted and attempts < 5:
            attempts += 1
            # Atomic sequence allocation from counters collection
            seq_doc = db.counters.find_one_and_update(
                {"_id": "customer_id"},
                {"$inc": {"seq": 1}},
                upsert=True,
                return_document=ReturnDocument.AFTER
            )
            seq = seq_doc.get("seq", 101)
            new_user_id = f"CUST{str(seq).zfill(4)}"

            new_user_doc = {
                "user_id": new_user_id,
                "firebase_uid": firebase_uid,
                "name": display_name,
                "email": email or f"{new_user_id.lower()}@utilityai.org",
                "role": UserRole.CUSTOMER.value,  # Strictly Customer role for all self-registrations
                "city": None,
                "department": "Citizen",
                "phone": decoded_token.get("phone_number") or None,
                "dob": None,
                "photo_url": decoded_token.get("picture") or None,
                "gender": None,
                "address": None,
                "meter_number": None,
                "emergency_contact": None,
                "preferred_language": "English",
                "notifications": {"sms": False, "email": True, "whatsapp": False},
                "is_active": True,
                "status": "Active",
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

            try:
                db.users.insert_one(new_user_doc)
                user = new_user_doc
                inserted = True
            except DuplicateKeyError:
                # Concurrent registration with same firebase_uid
                concurrent_user = db.users.find_one({"firebase_uid": firebase_uid})
                if concurrent_user:
                    user = concurrent_user
                    inserted = True
                    break
                logger.warning("Duplicate key collision on user_id '%s'. Retrying atomic allocation...", new_user_id)

    # 5. Check account activation status (block deactivated accounts)
    if user.get("is_active") is False or user.get("status") == "Inactive" or user.get("transition_target") == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact your system administrator.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 6. Validate stored user_id and role integrity (zero silent fallbacks)
    user_id = user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User account record is missing a valid user_id identifier."
        )

    stored_role = user.get("role")
    valid_roles = [r.value for r in UserRole]
    if not stored_role or stored_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account has invalid or unrecognized role '{stored_role}'. Please contact system administrator."
        )

    return {
        "user_id": user_id,
        "firebase_uid": user.get("firebase_uid", firebase_uid),
        "name": user.get("name", "User"),
        "email": user.get("email", email),
        "role": stored_role,
        "city": user.get("city"),
        "department": user.get("department"),
        "phone": user.get("phone"),
        "dob": user.get("dob"),
        "photo_url": user.get("photo_url") or decoded_token.get("picture"),
        "gender": user.get("gender"),
        "address": user.get("address"),
        "meter_number": user.get("meter_number"),
        "emergency_contact": user.get("emergency_contact"),
        "preferred_language": user.get("preferred_language", "English"),
        "notifications": user.get("notifications", {"sms": False, "email": True, "whatsapp": False}),
        "email_verified": email_verified,
        "is_active": user.get("is_active", True) if user.get("status") != "Inactive" else False,
        "status": user.get("status", "Active" if user.get("is_active", True) else "Inactive"),
        "created_at": user.get("created_at")
    }

async def require_verified_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Enforces email verification for privileged/staff operations.
    Authenticated Customer accounts and demo mode environments are permitted
    to perform citizen self-service workflows without blocking HTTP 403.
    """
    from app.config import settings
    if settings.DEMO_MODE or current_user.get("role") == UserRole.CUSTOMER.value:
        return current_user

    if not current_user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Email address must be verified before accessing utility services. Please check your inbox for the verification link."
        )
    return current_user

def require_role(allowed_roles: List[UserRole]):
    """
    Enforces RBAC role authorization on authenticated users.
    """
    def dependency(current_user: Dict[str, Any] = Depends(get_current_user)):
        RBACManager.enforce_role(current_user["role"], allowed_roles)
        return current_user
    return dependency
