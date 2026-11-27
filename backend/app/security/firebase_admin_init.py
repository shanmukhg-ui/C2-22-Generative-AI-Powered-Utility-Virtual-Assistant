import os
import json
import logging
from typing import Optional, Any

try:
    import firebase_admin
    from firebase_admin import credentials, auth
    HAS_FIREBASE_ADMIN = True
except ImportError:
    firebase_admin = None
    credentials = None
    auth = None
    HAS_FIREBASE_ADMIN = False

from app.config import settings

logger = logging.getLogger(__name__)

_firebase_app: Optional[Any] = None

def get_firebase_app():
    """
    Initializes or returns the existing Firebase Admin default App.
    Supports:
    1. Service Account JSON file path from FIREBASE_CREDENTIALS_PATH.
    2. Inline Service Account JSON string from FIREBASE_SERVICE_ACCOUNT_JSON.
    3. GOOGLE_APPLICATION_CREDENTIALS env var if explicitly set.
    4. Project ID based initialization for token signature verification.
    """
    global _firebase_app

    if not HAS_FIREBASE_ADMIN:
        logger.warning("firebase_admin package not installed in environment. Running in mock verification mode.")
        return None

    if _firebase_app is not None:
        return _firebase_app

    if len(firebase_admin._apps) > 0:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app

    project_id = settings.FIREBASE_PROJECT_ID or "c2-22-utility-assistant"
    cred = None

    # 1. Path to service account file
    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if cred_path and os.path.isfile(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            logger.info("Initializing Firebase Admin with credentials file: %s", cred_path)
        except Exception as e:
            logger.warning("Failed to load Firebase credentials from file '%s': %s", cred_path, e)

    # 2. Inline JSON string
    if not cred and settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        try:
            cert_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(cert_dict)
            logger.info("Initializing Firebase Admin with inline JSON credentials.")
        except Exception as e:
            logger.warning("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: %s", e)

    # 3. Only check Application Default Credentials if env var is explicitly provided
    if not cred and os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        try:
            cred = credentials.ApplicationDefault()
            logger.info("Initializing Firebase Admin with Application Default Credentials.")
        except Exception as e:
            logger.warning("Failed to load Application Default Credentials: %s", e)
            cred = None

    # 4. Initialize Firebase Admin App
    if cred:
        _firebase_app = firebase_admin.initialize_app(cred, options={"projectId": project_id})
    else:
        logger.info("Initializing Firebase Admin with Project ID: %s", project_id)
        _firebase_app = firebase_admin.initialize_app(options={"projectId": project_id})

    return _firebase_app

def verify_firebase_id_token(token: str, check_revoked: bool = False) -> dict:
    """
    Verifies a Firebase ID token using the Firebase Admin SDK.
    Returns the decoded token claims dict.
    Raises firebase_admin.exceptions.FirebaseError or Exception on failure.
    """
    if not HAS_FIREBASE_ADMIN:
        # Graceful fallback for local test execution
        import base64
        parts = token.split(".")
        if len(parts) >= 2:
            padding = "=" * (4 - len(parts[1]) % 4)
            return json.loads(base64.urlsafe_b64decode(parts[1] + padding))
        return {"uid": token, "email": f"{token.lower()}@utilityai.org"}

    get_firebase_app()
    return auth.verify_id_token(token, check_revoked=check_revoked)
