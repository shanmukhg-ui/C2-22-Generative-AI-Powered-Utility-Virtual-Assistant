import os
import json
import logging
import concurrent.futures
from typing import Optional, Any
import firebase_admin
from firebase_admin import credentials, auth
from app.config import settings

logger = logging.getLogger(__name__)

FIREBASE_HTTP_TIMEOUT_SECONDS = 5.0

_firebase_app: Optional[firebase_admin.App] = None

def get_firebase_app() -> firebase_admin.App:
    """
    Initializes or returns the existing Firebase Admin default App.
    Supports:
    1. Service Account JSON file path from FIREBASE_CREDENTIALS_PATH.
    2. Inline Service Account JSON string from FIREBASE_SERVICE_ACCOUNT_JSON.
    3. GOOGLE_APPLICATION_CREDENTIALS env var if explicitly set.
    4. Project ID based initialization for token signature verification.
    """
    global _firebase_app

    if _firebase_app is not None:
        return _firebase_app

    if len(firebase_admin._apps) > 0:
        _firebase_app = firebase_admin.get_app()
        if hasattr(_firebase_app, "options"):
            _firebase_app.options.setdefault("httpTimeout", FIREBASE_HTTP_TIMEOUT_SECONDS)
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

    # 4. Initialize Firebase Admin App with bounded HTTP request timeout
    app_options = {"projectId": project_id, "httpTimeout": FIREBASE_HTTP_TIMEOUT_SECONDS}
    if cred:
        _firebase_app = firebase_admin.initialize_app(cred, options=app_options)
    else:
        logger.info("Initializing Firebase Admin with Project ID: %s (httpTimeout: %ss)", project_id, FIREBASE_HTTP_TIMEOUT_SECONDS)
        _firebase_app = firebase_admin.initialize_app(options=app_options)

    return _firebase_app

def verify_firebase_id_token(token: str, check_revoked: bool = False) -> dict:
    """
    Verifies a Firebase ID token using the Firebase Admin SDK.
    Returns the decoded token claims dict.
    Raises firebase_admin.exceptions.FirebaseError or Exception on failure.
    """
    get_firebase_app()
    return auth.verify_id_token(token, check_revoked=check_revoked)

def create_firebase_user(
    email: str,
    display_name: str,
    phone: Optional[str] = None,
    password: Optional[str] = None
) -> Any:
    """
    Creates a new user identity in Firebase Authentication using Firebase Admin SDK.
    Raises Exception on failure so callers can catch and handle specific errors.
    """
    get_firebase_app()
    kwargs: dict = {
        "email": email,
        "display_name": display_name,
        "email_verified": False,
    }
    if phone and phone.startswith("+"):
        kwargs["phone_number"] = phone
    if password:
        kwargs["password"] = password
    return auth.create_user(**kwargs)

def generate_password_reset_link(email: str) -> str:
    """
    Generates a password-reset/activation link for the given user email using Firebase Admin SDK.
    Raises Exception on failure so that callers can manage atomic provisioning workflows.
    """
    get_firebase_app()
    return auth.generate_password_reset_link(email)

def delete_firebase_user(uid: str) -> None:
    """
    Deletes a user identity from Firebase Authentication by UID (used for provisioning rollback).
    Raises Exception on failure so that callers can explicitly log critical reconciliation events.
    """
    get_firebase_app()
    auth.delete_user(uid)

def set_firebase_user_disabled(uid: str, disabled: bool, timeout_sec: float = FIREBASE_HTTP_TIMEOUT_SECONDS) -> None:
    """
    Enables or disables a Firebase Authentication user identity with explicit bounded timeout.
    The underlying Firebase Admin SDK HttpClient enforces genuine transport-level socket timeouts
    (connection and read) via app.options['httpTimeout'], while an outer thread pool provides
    a non-blocking watchdog timeout.
    Raises TimeoutError or Exception on failure so that callers can retry or handle reconciliation.
    """
    get_firebase_app()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    try:
        future = executor.submit(auth.update_user, uid, disabled=disabled)
        future.result(timeout=timeout_sec)
    except concurrent.futures.TimeoutError:
        raise TimeoutError(f"Firebase update_user operation timed out after {timeout_sec}s for UID '{uid}'")
    finally:
        executor.shutdown(wait=False, cancel_futures=True)
