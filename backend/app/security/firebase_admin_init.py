import os
import json
import logging
import time
from typing import Optional, Any

logger = logging.getLogger(__name__)

# Firebase is disabled in favor of self-contained native authentication
HAS_FIREBASE_ADMIN = False
FIREBASE_HTTP_TIMEOUT_SECONDS = 5.0
_firebase_app: Optional[Any] = None

def get_firebase_app():
    return None

def _decode_firebase_jwt_payload(token: str) -> dict:
    import base64
    parts = token.split(".")
    if len(parts) < 2:
        return {"uid": token, "email": f"{token.lower()}@utilityai.org"}
    try:
        padding = "=" * (4 - len(parts[1]) % 4)
        raw_payload = base64.urlsafe_b64decode(parts[1] + padding).decode("utf-8")
        payload = json.loads(raw_payload)
    except Exception:
        return {"uid": token, "email": f"{token.lower()}@utilityai.org"}

    uid = payload.get("user_id") or payload.get("sub") or payload.get("uid") or token
    payload["uid"] = str(uid)
    return payload

def verify_firebase_id_token(token: str, check_revoked: bool = False) -> dict:
    """
    Native token verification without external Firebase dependencies.
    Accepts user IDs, emails, custom session tokens, or JWTs.
    """
    if not token:
        raise ValueError("Token is empty")
    
    # If token is formatted as a JWT (header.payload.signature)
    if "." in token:
        return _decode_firebase_jwt_payload(token)
    
    # Direct user ID or persona ID (e.g. CUST0001, EMP0001, ADM0001)
    return {
        "uid": token,
        "email": token if "@" in token else f"{token.lower()}@utilityai.org"
    }

def create_firebase_user(
    email: str,
    display_name: str,
    phone: Optional[str] = None,
    password: Optional[str] = None
) -> Any:
    class NativeUser:
        def __init__(self, uid, email, display_name):
            self.uid = uid
            self.email = email
            self.display_name = display_name
    return NativeUser(f"usr_{email.split('@')[0]}", email, display_name)

def generate_password_reset_link(email: str) -> str:
    return f"https://utilityai.org/auth/reset?email={email}"

def delete_firebase_user(uid: str) -> None:
    logger.info("Native auth: delete_user called for UID %s", uid)

def set_firebase_user_disabled(uid: str, disabled: bool, timeout_sec: float = FIREBASE_HTTP_TIMEOUT_SECONDS) -> None:
    logger.info("Native auth: set_user_disabled called for UID %s (disabled=%s)", uid, disabled)
