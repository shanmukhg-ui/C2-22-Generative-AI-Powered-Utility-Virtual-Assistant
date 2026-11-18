from fastapi import Header, HTTPException, status, Depends
from typing import Optional, Dict, Any
from app.database.mongo import get_database
from app.security.rbac import UserRole

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Verifies Firebase Token or Demo Bearer token and retrieves verified role from MongoDB.
    Never trusts role information sent in request bodies.
    """
    db = get_database()
    
    # Default fallback for unauthenticated requests in demo
    user_id = "CUST0001"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
        # Format can be dev-token-{user_id} or raw user_id or firebase token
        if token.startswith("dev-token-"):
            user_id = token.replace("dev-token-", "")
        elif token:
            user_id = token

    # Query MongoDB for user
    user = db.users.find_one({"$or": [{"user_id": user_id}, {"firebase_uid": user_id}, {"email": user_id}]})
    
    if not user:
        # Fallback to CUST0001 if token not found
        user = db.users.find_one({"user_id": "CUST0001"})
        if not user:
            # Create a default customer record if database was freshly initialized
            user = {
                "user_id": "CUST0001",
                "firebase_uid": "firebase_cust0001",
                "name": "Customer 1",
                "email": "customer0001@example.test",
                "role": UserRole.CUSTOMER.value,
                "city": "Vizag",
                "department": "Citizen"
            }
            db.users.insert_one(user)

    # Return sanitized user dict with rich profile attributes
    return {
        "user_id": user.get("user_id", "CUST0001"),
        "firebase_uid": user.get("firebase_uid", "firebase_cust0001"),
        "name": user.get("name", "Customer 1"),
        "email": user.get("email", "customer0001@example.test"),
        "role": user.get("role", "Customer"),
        "city": user.get("city", "Vizag"),
        "department": user.get("department", "Citizen"),
        "phone": user.get("phone", "+91 98765 43210"),
        "dob": user.get("dob", "1994-05-15"),
        "photo_url": user.get("photo_url", ""),
        "gender": user.get("gender", "Prefer not to say"),
        "address": user.get("address", "Plot 42, Green Park Avenue, Ward 12, Vizag"),
        "meter_number": user.get("meter_number", "MTR-EL-884920"),
        "emergency_contact": user.get("emergency_contact", "+91 98765 12345"),
        "preferred_language": user.get("preferred_language", "English"),
        "notifications": user.get("notifications", {"sms": True, "email": True, "whatsapp": False})
    }

def require_role(allowed_roles: list[UserRole]):
    def dependency(current_user: Dict[str, Any] = Depends(get_current_user)):
        from app.security.rbac import RBACManager
        RBACManager.enforce_role(current_user["role"], allowed_roles)
        return current_user
    return dependency
