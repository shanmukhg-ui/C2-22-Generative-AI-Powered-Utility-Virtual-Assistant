import logging
import re
import time
import uuid
import threading
import concurrent.futures
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.security.firebase_auth import require_role
from app.security.rbac import UserRole
from app.database.mongo import get_database
from app.schemas.requests import AdminCreateUserRequest, AdminUserStatusUpdate
from app.schemas.responses import AdminCreateUserResponse
from app.security.firebase_admin_init import (
    create_firebase_user,
    generate_password_reset_link,
    delete_firebase_user,
    set_firebase_user_disabled,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Administration & Governance"])

# Regex formats for role-specific custom user IDs
EMPLOYEE_ID_REGEX = r"^EMP[0-9]{4,8}$"
ADMIN_ID_REGEX = r"^ADM[0-9]{4,8}$"
EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

# Distributed Transition Lease & Bounded Firebase Operation Constants
FIREBASE_REQUEST_TIMEOUT_SECONDS = 5.0      # Bounded timeout per HTTP request attempt
FIREBASE_MAX_RETRIES = 3                   # Max retry attempts for external identity synchronization
MAX_FIREBASE_OPERATION_SECONDS = 16.0       # Bounded total deadline across all retries + backoffs (15.3s max)
TRANSITION_LOCK_TTL_SECONDS = 30           # Lease TTL: 30s > 16s max operation + 14s safety buffer
LEASE_RENEWAL_INTERVAL_SECONDS = 5.0       # Background heartbeat lease renewal interval
LEASE_MIN_REMAINING_FOR_OP = 6.0           # Pre-operation remaining TTL threshold before dispatching Firebase call


def record_audit_log(
    db,
    user_id: str,
    role: str,
    action: str,
    resource: str,
    details: str,
    status_str: str = "SUCCESS"
) -> None:
    """
    Safely writes an audit log entry.
    Catches and logs any database failure so that audit log persistence issues
    never crash an ongoing operation or leave it in an ambiguous state.
    Never logs passwords, tokens, or activation links.
    """
    try:
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        db.audit_logs.insert_one({
            "audit_id": f"AUD_{int(time.time()*1000)}",
            "user_id": user_id,
            "role": role,
            "action": action,
            "timestamp": now_iso,
            "resource": resource,
            "details": details,
            "status": status_str
        })
    except Exception as e:
        logger.error(
            "AUDIT LOG FAILURE: Could not record audit log [%s] for user %s on %s: %s",
            action, user_id, resource, e
        )


def ensure_counter_initialized(db, prefix: str) -> None:
    """
    Safely and atomically ensures that db.counters for the given prefix (e.g. 'emp', 'adm')
    is initialized to at least the highest numerical sequence found in existing user records.
    Never decreases or overwrites an existing counter with a lower value.
    If the counter document already exists, avoids scanning db.users on every request.
    """
    counter_id = f"{prefix.lower()}_id"
    existing = db.counters.find_one({"_id": counter_id})
    if existing is not None and "seq" in existing:
        return

    cursor = db.users.find({"user_id": {"$regex": f"^{prefix}\\d+"}}, {"user_id": 1})
    max_num = 0
    for u in cursor:
        uid = u.get("user_id", "")
        num_str = uid[len(prefix):]
        if num_str.isdigit():
            max_num = max(max_num, int(num_str))

    db.counters.update_one(
        {"_id": counter_id},
        {"$setOnInsert": {"seq": max_num}},
        upsert=True
    )
    if max_num > 0:
        db.counters.update_one(
            {"_id": counter_id},
            {"$max": {"seq": max_num}}
        )


def allocate_next_user_id(db, prefix: str) -> str:
    """
    Atomically allocates the next sequential unique user ID (e.g. EMP0005, ADM0002).
    Uses atomic MongoDB $inc on the counter document.
    Concurrency-safe: distinct callers always receive strictly monotonically increasing IDs.
    """
    counter_id = f"{prefix.lower()}_id"
    ensure_counter_initialized(db, prefix)

    seq_doc = db.counters.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    seq = seq_doc.get("seq", 1)
    return f"{prefix}{str(seq).zfill(4)}"


def ensure_active_admin_count_initialized(db) -> int:
    """
    Ensures db.counters contains 'active_admin_count' reflecting the true
    number of currently active administrators in db.users.
    Uses atomic $setOnInsert to prevent race conditions during initialization.
    """
    admin_counter = db.counters.find_one({"_id": "active_admin_count"})
    if admin_counter is None:
        real_count = db.users.count_documents({
            "role": UserRole.ADMINISTRATOR.value,
            "is_active": {"$ne": False},
            "status": {"$ne": "Inactive"}
        })
        db.counters.update_one(
            {"_id": "active_admin_count"},
            {"$setOnInsert": {"count": real_count}},
            upsert=True
        )
        admin_counter = db.counters.find_one({"_id": "active_admin_count"})
    return admin_counter.get("count", 0) if admin_counter else 0


def reserve_admin_deactivation(db, target_user_id: str) -> bool:
    """
    Atomically attempts to decrement active_admin_count ONLY if count > 1.
    Concurrency-safe: prevents two concurrent deactivations from reducing the active
    administrator count below 1.
    """
    ensure_active_admin_count_initialized(db)

    res = db.counters.find_one_and_update(
        {"_id": "active_admin_count", "count": {"$gt": 1}},
        {"$inc": {"count": -1}},
        return_document=ReturnDocument.AFTER
    )
    return res is not None



def release_admin_deactivation_reservation(db) -> None:
    """
    Rolls back the atomic decrement on active_admin_count if deactivation failed.
    """
    db.counters.update_one(
        {"_id": "active_admin_count"},
        {"$inc": {"count": 1}},
        upsert=True
    )


@router.get("/users", response_model=Dict[str, Any])
async def list_users(
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    role: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """
    Returns registered users across all roles with filtering by role, status, and search query.
    Restricted to Administrator.
    """
    db = get_database()
    query: Dict[str, Any] = {}

    if role and role != "ALL":
        query["role"] = role

    if status_filter and status_filter != "ALL":
        if status_filter.lower() == "active":
            query["$or"] = [{"is_active": True}, {"is_active": {"$exists": False}}, {"status": "Active"}]
        elif status_filter.lower() == "inactive":
            query["$or"] = [{"is_active": False}, {"status": "Inactive"}]
        else:
            query["status"] = status_filter

    if search:
        s = search.strip()
        search_regex = {"$regex": re.escape(s), "$options": "i"}
        search_or = [
            {"name": search_regex},
            {"email": search_regex},
            {"user_id": search_regex},
            {"department": search_regex},
            {"city": search_regex}
        ]
        if "$or" in query:
            query = {"$and": [{"$or": query.pop("$or")}, {"$or": search_or}]}
        else:
            query["$or"] = search_or

    total = db.users.count_documents(query)
    users = list(db.users.find(query, {"_id": 0}).skip(skip).limit(limit))

    for u in users:
        if "is_active" not in u:
            u["is_active"] = (u.get("status") != "Inactive")
        if "status" not in u:
            u["status"] = "Active" if u.get("is_active") else "Inactive"

    return {
        "total": total,
        "users": users
    }


def _execute_provisioning_workflow(
    db,
    payload: AdminCreateUserRequest,
    target_role: UserRole,
    prefix: str,
    id_regex: str,
    id_format_error: str,
    default_department: str,
    audit_action: str,
    current_user: Dict[str, Any]
) -> AdminCreateUserResponse:
    """
    Core atomic provisioning workflow for Employee and Administrator accounts.
    1. Validates normalized email format and uniqueness in MongoDB.
    2. Validates custom ID format and uniqueness (or allocates sequential ID atomically).
    3. Provisions Firebase Authentication identity.
    4. Generates password-reset/activation link.
       - If link generation fails, rolls back newly created Firebase identity.
    5. Inserts user profile into MongoDB Atlas.
       - If MongoDB insert fails, rolls back newly created Firebase identity.
    6. Logs audit trail entry (recording both successes and failures).
    7. Returns sanitized response without leaking raw exceptions.
    """
    clean_email = payload.email.strip().lower()
    if not re.match(EMAIL_REGEX, clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format."
        )

    # 1. Check duplicate normalized email in MongoDB
    if db.users.find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}}):
        record_audit_log(
            db, current_user["user_id"], current_user["role"],
            audit_action, f"users/{clean_email}",
            f"Rejected: User with email '{clean_email}' already exists in database.",
            "FAILED"
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{clean_email}' already exists in the system."
        )

    # 2. Custom User ID validation or atomic allocation
    if payload.user_id:
        custom_id = payload.user_id.strip()
        if not re.match(id_regex, custom_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=id_format_error
            )
        if db.users.find_one({"user_id": custom_id}):
            record_audit_log(
                db, current_user["user_id"], current_user["role"],
                audit_action, f"users/{custom_id}",
                f"Rejected: User ID '{custom_id}' is already assigned.",
                "FAILED"
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User ID '{custom_id}' is already assigned."
            )
        new_user_id = custom_id
    else:
        new_user_id = allocate_next_user_id(db, prefix)

    # 3. Provision Firebase Authentication user identity
    created_firebase_uid: Optional[str] = None
    try:
        fb_user = create_firebase_user(
            email=clean_email,
            display_name=payload.name.strip(),
            phone=payload.phone.strip() if payload.phone else None,
            password=payload.password if payload.password else None
        )
        created_firebase_uid = getattr(fb_user, "uid", f"fb_uid_{new_user_id.lower()}")
    except Exception as fb_err:
        err_str = str(fb_err).lower()
        logger.error("Failed to provision Firebase user for '%s': %s", clean_email, fb_err)
        if "already exists" in err_str or "already-exists" in err_str:
            record_audit_log(
                db, current_user["user_id"], current_user["role"],
                audit_action, f"users/{clean_email}",
                f"Rejected: Email '{clean_email}' already exists in authentication provider.",
                "FAILED"
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An identity with this email address already exists in the authentication system."
            )
        record_audit_log(
            db, current_user["user_id"], current_user["role"],
            audit_action, f"users/{clean_email}",
            "Failed to create user identity in authentication provider.",
            "FAILED"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user identity in authentication provider. Please try again."
        )

    # 4. Generate password-reset / activation link
    activation_link: Optional[str] = None
    try:
        activation_link = generate_password_reset_link(clean_email)
        if not activation_link:
            raise RuntimeError("Authentication provider did not return an activation link.")
    except Exception as link_err:
        logger.error("Failed to generate activation link for '%s': %s", clean_email, link_err)
        # Rollback newly created Firebase user identity
        rollback_success = False
        try:
            delete_firebase_user(created_firebase_uid)
            rollback_success = True
            logger.info("Successfully rolled back Firebase UID %s after link failure", created_firebase_uid)
        except Exception as rb_err:
            logger.critical(
                "CRITICAL RECONCILIATION FAILURE: Could not roll back Firebase UID %s after activation link failure. Manual cleanup required: %s",
                created_firebase_uid, rb_err
            )
        record_audit_log(
            db, current_user["user_id"], current_user["role"],
            audit_action, f"users/{clean_email}",
            f"Failed activation link generation. Rollback: {'SUCCESS' if rollback_success else 'FAILED'}",
            "FAILED"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate account activation credentials. User provisioning was cancelled."
        )

    # 5. Insert into MongoDB Atlas (with retry on collision if auto-generated)
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    user_doc = {
        "user_id": new_user_id,
        "firebase_uid": created_firebase_uid,
        "name": payload.name.strip(),
        "email": clean_email,
        "role": target_role.value,
        "department": payload.department.strip() if payload.department else default_department,
        "city": payload.city.strip() if payload.city else "Visakhapatnam",
        "phone": payload.phone.strip() if payload.phone else None,
        "dob": None,
        "photo_url": None,
        "gender": None,
        "address": None,
        "meter_number": None,
        "emergency_contact": None,
        "preferred_language": "English",
        "notifications": {"sms": False, "email": True, "whatsapp": False},
        "is_active": True,
        "status": "Active",
        "sync_status": "synced",
        "created_at": now_iso,
        "created_by": current_user["user_id"]
    }

    inserted = False
    attempts = 0
    while not inserted and attempts < 3:
        attempts += 1
        try:
            db.users.insert_one(user_doc)
            inserted = True
        except DuplicateKeyError:
            if payload.user_id:
                # Custom ID collided
                break
            # Auto-generated ID collision: allocate next sequence and retry
            new_user_id = allocate_next_user_id(db, prefix)
            user_doc["user_id"] = new_user_id
        except Exception as db_err:
            logger.error("Failed to insert user profile %s: %s", new_user_id, db_err)
            break

    if not inserted:
        # Atomic rollback of newly created Firebase identity
        rollback_success = False
        try:
            delete_firebase_user(created_firebase_uid)
            rollback_success = True
            logger.info("Successfully rolled back Firebase UID %s after database insert failure", created_firebase_uid)
        except Exception as rb_err:
            logger.critical(
                "CRITICAL RECONCILIATION FAILURE: Could not roll back Firebase UID %s after DB insert failure. Manual cleanup required: %s",
                created_firebase_uid, rb_err
            )
        record_audit_log(
            db, current_user["user_id"], current_user["role"],
            audit_action, f"users/{new_user_id}",
            f"Failed database insertion. Rollback: {'SUCCESS' if rollback_success else 'FAILED'}",
            "FAILED"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist user profile in database. User provisioning was cancelled."
        )

    # 6. If administrator, increment active_admin_count in db.counters
    if target_role == UserRole.ADMINISTRATOR:
        ensure_active_admin_count_initialized(db)
        counter_updated = False
        try:
            res = db.counters.update_one(
                {"_id": "active_admin_count"},
                {"$inc": {"count": 1}},
                upsert=True
            )
            counter_updated = (res.acknowledged if hasattr(res, 'acknowledged') else True)
        except Exception as cnt_err:
            logger.error("Failed to increment active_admin_count for %s: %s", new_user_id, cnt_err)
            counter_updated = False

        if not counter_updated:
            # Atomic rollback of database record and Firebase identity
            try:
                db.users.delete_one({"user_id": new_user_id})
            except Exception as rm_err:
                logger.critical("CRITICAL: Failed to delete user record %s after counter update failure: %s", new_user_id, rm_err)
            try:
                delete_firebase_user(created_firebase_uid)
            except Exception as fb_rm_err:
                logger.critical("CRITICAL: Failed to delete Firebase user %s after counter update failure: %s", created_firebase_uid, fb_rm_err)
            record_audit_log(
                db, current_user["user_id"], current_user["role"],
                audit_action, f"users/{new_user_id}",
                "Failed active administrator tracking. Provisioning was cancelled and rolled back.",
                "FAILED"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update administrative state. User provisioning was cancelled."
            )

    # 7. Record successful audit log
    record_audit_log(
        db, current_user["user_id"], current_user["role"],
        audit_action, f"users/{new_user_id}",
        f"Provisioned {target_role.value.lower()} {new_user_id} ({clean_email}) in {user_doc['department']}",
        "SUCCESS"
    )

    sanitized = {k: v for k, v in user_doc.items() if k != "_id"}
    role_name = "Employee" if target_role == UserRole.EMPLOYEE else "Administrator"
    return AdminCreateUserResponse(
        success=True,
        message=f"{role_name} {payload.name} ({new_user_id}) provisioned successfully.",
        user=sanitized,
        activation_link=activation_link,
        email_delivery="not_configured"
    )


@router.post("/users/employee", response_model=AdminCreateUserResponse)
async def create_employee(
    payload: AdminCreateUserRequest,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """
    Administrator provisions a new operations staff (Employee) account.
    - Concurrency-safe atomic EMP sequence generation.
    - Custom ID validation (format: EMP followed by 4-8 digits).
    - Unified Firebase creation and activation-link workflow with safe rollback.
    - Audit logging of successes and failures.
    """
    db = get_database()
    return _execute_provisioning_workflow(
        db=db,
        payload=payload,
        target_role=UserRole.EMPLOYEE,
        prefix="EMP",
        id_regex=EMPLOYEE_ID_REGEX,
        id_format_error="Invalid Employee ID format. Custom ID must start with 'EMP' followed by 4 to 8 digits (e.g. EMP0005).",
        default_department="Operations",
        audit_action="CREATE_EMPLOYEE",
        current_user=current_user
    )


@router.post("/users/administrator", response_model=AdminCreateUserResponse)
async def create_administrator(
    payload: AdminCreateUserRequest,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """
    Existing Administrator provisions a new system Administrator account.
    - Concurrency-safe atomic ADM sequence generation.
    - Custom ID validation (format: ADM followed by 4-8 digits).
    - Unified Firebase creation and activation-link workflow with safe rollback.
    - Atomically updates active_admin_count.
    - Audit logging of successes and failures.
    """
    db = get_database()
    return _execute_provisioning_workflow(
        db=db,
        payload=payload,
        target_role=UserRole.ADMINISTRATOR,
        prefix="ADM",
        id_regex=ADMIN_ID_REGEX,
        id_format_error="Invalid Administrator ID format. Custom ID must start with 'ADM' followed by 4 to 8 digits (e.g. ADM0002).",
        default_department="IT Administration",
        audit_action="CREATE_ADMINISTRATOR",
        current_user=current_user
    )


class DistributedTransitionLease:
    """
    Manages a distributed, atomic transition lease in MongoDB for an account lifecycle transition.
    - Distributed Coordination: Coordinates transitions across multiple backend processes via MongoDB.
    - Periodic Heartbeat Renewal: Automatically renews the lease in the background while an operation is active.
    - Strict Lease Verification: Validates remaining lease TTL and lease ownership before AND after every Firebase call.
    - Stale Worker Fencing: Marks worker as stale immediately upon lease loss; prevents subsequent Firebase/DB operations.
    - Safe Rollback Guard: Verifies unexpired lease ownership before executing any Firebase rollback, preventing
      stale workers from overwriting newer authoritative transitions.
    - Stale Lease Recovery: Expired leases can only be claimed after the maximum bounded Firebase operation
      duration + safety buffer has elapsed, ensuring older requests are fully dead before takeover.
    """
    def __init__(self, db, user_id: str, target_state: str, current_user_id: str, ttl: int = TRANSITION_LOCK_TTL_SECONDS):
        self.db = db
        self.user_id = user_id
        self.target_state = target_state
        self.current_user_id = current_user_id
        self.ttl = ttl
        self.lock_id = f"TLOCK_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        self.expires_at = 0.0
        self.acquired = False
        self.is_stale = False
        self._stop_heartbeat = threading.Event()
        self._heartbeat_thread: Optional[threading.Thread] = None

    def acquire(self, is_deactivation: bool, reason: Optional[str] = None) -> bool:
        """
        Atomically attempts to acquire the transition lease in MongoDB.
        On deactivation, sets is_active=False immediately in the same atomic operation (Fail-Secure).
        """
        now = time.time()
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self.expires_at = now + self.ttl

        if is_deactivation:
            acquire_filter = {
                "user_id": self.user_id,
                "is_active": {"$ne": False},
                "status": {"$ne": "Inactive"},
                "$or": [
                    {"transition_lock_id": None},
                    {"transition_lock_id": {"$exists": False}},
                    {"transition_lock_expires_at": {"$lte": now}}
                ]
            }
            acquire_update: Dict[str, Any] = {
                "$set": {
                    "transition_lock_id": self.lock_id,
                    "transition_lock_expires_at": self.expires_at,
                    "transition_target": "Inactive",
                    "is_active": False,
                    "status": "Inactive",
                    "sync_status": "transitioning",
                    "updated_at": now_iso,
                    "updated_by": self.current_user_id
                }
            }
            if reason:
                acquire_update["$set"]["deactivated_reason"] = reason
        else:
            acquire_filter = {
                "user_id": self.user_id,
                "$or": [
                    {"is_active": False},
                    {"status": "Inactive"}
                ],
                "$and": [
                    {
                        "$or": [
                            {"transition_lock_id": None},
                            {"transition_lock_id": {"$exists": False}},
                            {"transition_lock_expires_at": {"$lte": now}}
                        ]
                    }
                ]
            }
            acquire_update = {
                "$set": {
                    "transition_lock_id": self.lock_id,
                    "transition_lock_expires_at": self.expires_at,
                    "transition_target": "Active",
                    "sync_status": "transitioning"
                }
            }

        try:
            doc = self.db.users.find_one_and_update(
                acquire_filter,
                acquire_update,
                return_document=ReturnDocument.AFTER
            )
            if doc is not None:
                self.acquired = True
                self._start_heartbeat()
                return True
            return False
        except Exception as e:
            logger.error("Failed to acquire transition lease for user %s: %s", self.user_id, e)
            return False

    def renew(self) -> bool:
        """
        Atomically renews the lease in MongoDB if and only if:
        1. This worker still owns transition_lock_id == self.lock_id.
        2. The lease in MongoDB has NOT already expired.
        """
        if self.is_stale or not self.acquired:
            return False

        now = time.time()
        new_expires_at = now + self.ttl

        renew_filter = {
            "user_id": self.user_id,
            "transition_lock_id": self.lock_id,
            "transition_lock_expires_at": {"$gt": now}
        }
        renew_update = {
            "$set": {
                "transition_lock_expires_at": new_expires_at
            }
        }

        try:
            res = self.db.users.update_one(renew_filter, renew_update)
            if res.matched_count > 0:
                self.expires_at = new_expires_at
                return True
            else:
                self.is_stale = True
                logger.warning(
                    "Transition lease renewal failed for user %s (lock_id=%s). Worker marked STALE.",
                    self.user_id, self.lock_id
                )
                return False
        except Exception as e:
            self.is_stale = True
            logger.error("Error during lease renewal for user %s: %s. Worker marked STALE.", self.user_id, e)
            return False

    def ensure_valid_for_operation(self, min_remaining: float = LEASE_MIN_REMAINING_FOR_OP) -> bool:
        """
        Pre-flight check before initiating any external Firebase operation.
        Verifies lease ownership and ensures remaining TTL exceeds min_remaining.
        If remaining TTL is too short, attempts an immediate synchronous renewal.
        """
        if self.is_stale or not self.acquired:
            return False

        now = time.time()
        remaining = self.expires_at - now
        if remaining < min_remaining:
            if not self.renew():
                return False

        # Verify in database that ownership is genuinely intact and unexpired
        curr = self.db.users.find_one(
            {
                "user_id": self.user_id,
                "transition_lock_id": self.lock_id,
                "transition_lock_expires_at": {"$gt": time.time()}
            },
            {"_id": 1}
        )
        if curr is None:
            self.is_stale = True
            logger.warning(
                "Pre-operation ownership check failed for user %s (lock_id=%s). Worker is STALE.",
                self.user_id, self.lock_id
            )
            return False

        return True

    def verify_ownership(self) -> bool:
        """
        Post-flight verification after a Firebase operation completes.
        Verifies that this worker still holds the valid, unexpired lease.
        """
        if self.is_stale or not self.acquired:
            return False

        now = time.time()
        curr = self.db.users.find_one(
            {
                "user_id": self.user_id,
                "transition_lock_id": self.lock_id,
                "transition_lock_expires_at": {"$gt": now}
            },
            {"_id": 1}
        )
        if curr is None:
            self.is_stale = True
            logger.critical(
                "CRITICAL: Post-operation ownership verification failed for user %s (lock_id=%s). Lease was lost!",
                self.user_id, self.lock_id
            )
            return False

        return True

    def release(self, sync_status: str = "synced") -> bool:
        """
        Releases the transition lease cleanly, setting sync_status and clearing lock fields,
        only if this worker still owns the lease.
        """
        self._stop_heartbeat_sync()
        if not self.acquired:
            return False

        try:
            res = self.db.users.update_one(
                {"user_id": self.user_id, "transition_lock_id": self.lock_id},
                {
                    "$unset": {
                        "transition_lock_id": "",
                        "transition_lock_expires_at": "",
                        "transition_target": ""
                    },
                    "$set": {"sync_status": sync_status}
                }
            )
            return res.matched_count > 0
        except Exception as e:
            logger.error("Error releasing transition lease for user %s: %s", self.user_id, e)
            return False

    def _start_heartbeat(self):
        """Starts background periodic lease renewal."""
        def _loop():
            while not self._stop_heartbeat.wait(timeout=LEASE_RENEWAL_INTERVAL_SECONDS):
                if self.is_stale:
                    break
                if not self.renew():
                    break

        self._heartbeat_thread = threading.Thread(target=_loop, daemon=True)
        self._heartbeat_thread.start()

    def _stop_heartbeat_sync(self):
        """Stops the background renewal heartbeat cleanly."""
        self._stop_heartbeat.set()
        if self._heartbeat_thread and self._heartbeat_thread.is_alive():
            self._heartbeat_thread.join(timeout=1.0)


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    payload: AdminUserStatusUpdate,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """
    Administrator activates or deactivates a user account.
    - Concurrency-safe: Prevents deactivating the last active Administrator account.
    - Security guard: Prevents deactivating oneself.
    - Distributed transition serialization: Claims an atomic per-user transition lease in MongoDB,
      returning HTTP 409 Conflict if another operation is actively transitioning the same user.
    - Dynamic lease renewal: Automatically renews the lease in the background while external operations run.
    - Stale worker fencing: Verifies lease ownership before and after every Firebase call, preventing stale workers
      from performing delayed mutations or overwriting newer transitions.
    - Enforces safe operation order:
      * Deactivation: Locks document and cuts off API access in MongoDB first (Fail-Secure),
        then disables Firebase with bounded retries, then releases transition lease.
      * Reactivation: Claims transition lease first, enables Firebase, marks MongoDB Active,
        increments active_admin_count with explicit rollback on failure, then releases transition lease.
    - Records comprehensive audit trail for successes, partial failures, and critical reconciliation events.
    """
    db = get_database()
    target_user = db.users.find_one({"user_id": user_id})
    if not target_user:
        record_audit_log(
            db, current_user["user_id"], current_user["role"],
            "UPDATE_USER_STATUS", f"users/{user_id}",
            f"Failed: User account '{user_id}' not found.",
            "FAILED"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User account '{user_id}' not found."
        )

    now = time.time()
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    is_currently_active = target_user.get("is_active") is not False and target_user.get("status") != "Inactive"
    target_is_admin = target_user.get("role") == UserRole.ADMINISTRATOR.value
    fb_uid = target_user.get("firebase_uid")

    # ==========================
    # CASE 1: DEACTIVATION FLOW
    # ==========================
    if not payload.is_active:
        # Guard 1: Cannot deactivate yourself
        if current_user.get("user_id") == user_id:
            record_audit_log(
                db, current_user["user_id"], current_user["role"],
                "DEACTIVATE_USER", f"users/{user_id}",
                "Rejected: Self-deactivation attempt by Administrator.",
                "FAILED"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own administrative account."
            )

        # Guard 2: If target is already inactive, check for concurrent in-flight transition
        if not is_currently_active:
            if target_user.get("transition_lock_id") and target_user.get("transition_lock_expires_at", 0) > now:
                record_audit_log(
                    db, current_user["user_id"], current_user["role"],
                    "DEACTIVATE_USER", f"users/{user_id}",
                    f"Conflict: Account status transition is already in progress for user '{user_id}'.",
                    "FAILED"
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An account status transition is already in progress for user '{user_id}'. Please retry shortly."
                )
            record_audit_log(
                db, current_user["user_id"], current_user["role"],
                "DEACTIVATE_USER", f"users/{user_id}",
                f"Idempotent: User {user_id} is already inactive.",
                "SUCCESS"
            )
            updated_user = db.users.find_one({"user_id": user_id}, {"_id": 0})
            return {
                "success": True,
                "message": f"User {user_id} is already inactive.",
                "user": updated_user
            }

        # Guard 3: Concurrency-safe protection against deactivating the last active administrator
        admin_reserved = False
        if target_is_admin:
            admin_reserved = reserve_admin_deactivation(db, user_id)
            if not admin_reserved:
                record_audit_log(
                    db, current_user["user_id"], current_user["role"],
                    "DEACTIVATE_USER", f"users/{user_id}",
                    "Rejected: Attempt to deactivate the last active Administrator.",
                    "FAILED"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the last active Administrator account."
                )

        # Step A: Atomically acquire transition lease and set MongoDB status to Inactive (Fail-Secure)
        lease = DistributedTransitionLease(db, user_id, "Inactive", current_user["user_id"])
        acquired = lease.acquire(is_deactivation=True, reason=payload.reason)
        if not acquired:
            if admin_reserved:
                release_admin_deactivation_reservation(db)
            curr = db.users.find_one({"user_id": user_id})
            if curr and curr.get("transition_lock_id") and curr.get("transition_lock_expires_at", 0) > time.time():
                record_audit_log(
                    db, current_user["user_id"], current_user["role"],
                    "DEACTIVATE_USER", f"users/{user_id}",
                    f"Conflict: Account status transition is already in progress for user '{user_id}'.",
                    "FAILED"
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An account status transition is already in progress for user '{user_id}'. Please retry shortly."
                )
            # Already deactivated
            curr_sanitized = db.users.find_one({"user_id": user_id}, {"_id": 0})
            return {
                "success": True,
                "message": f"User {user_id} account status updated to Inactive.",
                "user": curr_sanitized
            }

        # Step B: Synchronize disabled status to Firebase Authentication with bounded retries and pre/post lease checks
        fb_sync_success = False
        start_fb_time = time.time()
        if fb_uid:
            for attempt in range(1, FIREBASE_MAX_RETRIES + 1):
                # Enforce bounded total operation deadline
                if time.time() - start_fb_time > MAX_FIREBASE_OPERATION_SECONDS:
                    logger.warning("Total Firebase operation deadline exceeded for user %s", user_id)
                    break

                # Pre-operation lease ownership & remaining TTL verification
                if not lease.ensure_valid_for_operation(min_remaining=LEASE_MIN_REMAINING_FOR_OP):
                    logger.critical("Aborting Firebase disable for %s: lease ownership lost or expired before call.", user_id)
                    break

                try:
                    set_firebase_user_disabled(fb_uid, disabled=True)
                    # Post-operation lease ownership verification
                    if lease.verify_ownership():
                        fb_sync_success = True
                        break
                    else:
                        logger.critical("Firebase disable succeeded for %s but lease ownership was LOST. Stale worker aborting.", user_id)
                        break
                except Exception as fb_err:
                    logger.warning("Attempt %d/%d: Failed to disable Firebase user %s: %s", attempt, FIREBASE_MAX_RETRIES, fb_uid, fb_err)
                    time.sleep(0.05 * attempt)

            if fb_sync_success:
                lease.release(sync_status="synced")
            else:
                if not lease.is_stale:
                    lease.release(sync_status="firebase_sync_failed")
                logger.critical(
                    "CRITICAL RECONCILIATION: User %s (Firebase UID %s) deactivated in database, but Firebase disable synchronization failed or lease was lost.",
                    user_id, fb_uid
                )
                record_audit_log(
                    db, current_user["user_id"], current_user["role"],
                    "DEACTIVATE_USER", f"users/{user_id}",
                    "Deactivated in database, but authentication provider synchronization failed.",
                    "PARTIAL_SYNC"
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Account access has been revoked in database, but failed to synchronize disabled status to authentication provider. Administrator reconciliation is required."
                )
        else:
            lease.release(sync_status="synced")

        record_audit_log(
            db, current_user["user_id"], current_user["role"],
            "DEACTIVATE_USER", f"users/{user_id}",
            f"Deactivated user {user_id} ({target_user.get('email')})" + (f". Reason: {payload.reason}" if payload.reason else ""),
            "SUCCESS"
        )
        updated_user = db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {
            "success": True,
            "message": f"User {user_id} account status updated to Inactive.",
            "user": updated_user
        }

    # ==========================
    # CASE 2: REACTIVATION FLOW
    # ==========================
    else:
        # Guard: If target is already active, check for concurrent in-flight transition
        if is_currently_active:
            if target_user.get("transition_lock_id") and target_user.get("transition_lock_expires_at", 0) > now:
                record_audit_log(
                    db, current_user["user_id"], current_user["role"],
                    "REACTIVATE_USER", f"users/{user_id}",
                    f"Conflict: Account status transition is already in progress for user '{user_id}'.",
                    "FAILED"
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An account status transition is already in progress for user '{user_id}'. Please retry shortly."
                )
            record_audit_log(
                db, current_user["user_id"], current_user["role"],
                "REACTIVATE_USER", f"users/{user_id}",
                f"Idempotent: User {user_id} is already active.",
                "SUCCESS"
            )
            updated_user = db.users.find_one({"user_id": user_id}, {"_id": 0})
            return {
                "success": True,
                "message": f"User {user_id} is already active.",
                "user": updated_user
            }

        # Step 1: Claim transition lease atomically in MongoDB
        lease = DistributedTransitionLease(db, user_id, "Active", current_user["user_id"])
        acquired = lease.acquire(is_deactivation=False)
        if not acquired:
            curr = db.users.find_one({"user_id": user_id})
            if curr and curr.get("transition_lock_id") and curr.get("transition_lock_expires_at", 0) > time.time():
                record_audit_log(
                    db, current_user["user_id"], current_user["role"],
                    "REACTIVATE_USER", f"users/{user_id}",
                    f"Conflict: Account status transition is already in progress for user '{user_id}'.",
                    "FAILED"
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An account status transition is already in progress for user '{user_id}'. Please retry shortly."
                )
            # Already active
            curr_sanitized = db.users.find_one({"user_id": user_id}, {"_id": 0})
            return {
                "success": True,
                "message": f"User {user_id} is already active.",
                "user": curr_sanitized
            }

        # Step 2: Enable in Firebase Authentication first with bounded retries and pre/post lease checks
        fb_sync_success = False
        start_fb_time = time.time()
        if fb_uid:
            for attempt in range(1, FIREBASE_MAX_RETRIES + 1):
                if time.time() - start_fb_time > MAX_FIREBASE_OPERATION_SECONDS:
                    logger.warning("Total Firebase operation deadline exceeded during reactivation for %s", user_id)
                    break

                if not lease.ensure_valid_for_operation(min_remaining=LEASE_MIN_REMAINING_FOR_OP):
                    logger.critical("Aborting Firebase enable for %s: lease ownership lost or expired before call.", user_id)
                    break

                try:
                    set_firebase_user_disabled(fb_uid, disabled=False)
                    if lease.verify_ownership():
                        fb_sync_success = True
                        break
                    else:
                        logger.critical("Firebase enable succeeded for %s but lease ownership was LOST. Stale worker aborting.", user_id)
                        break
                except Exception as fb_err:
                    logger.warning("Attempt %d/%d: Failed to enable Firebase user %s: %s", attempt, FIREBASE_MAX_RETRIES, fb_uid, fb_err)
                    time.sleep(0.05 * attempt)

            if not fb_sync_success:
                if not lease.is_stale:
                    lease.release(sync_status="firebase_sync_failed")
                record_audit_log(
                    db, current_user["user_id"], current_user["role"],
                    "REACTIVATE_USER", f"users/{user_id}",
                    "Failed to enable identity in authentication provider.",
                    "FAILED"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to enable account in authentication provider. Reactivation was cancelled."
                )

        # Step 3: Update MongoDB status to Active
        if not lease.ensure_valid_for_operation():
            logger.critical("Cannot activate user %s in MongoDB: lease lost or expired.", user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to complete account activation: lease ownership was lost."
            )

        update_fields = {
            "is_active": True,
            "status": "Active",
            "sync_status": "transitioning",
            "deactivated_reason": None,
            "updated_at": now_iso,
            "updated_by": current_user["user_id"]
        }
        try:
            db_res = db.users.update_one(
                {"user_id": user_id, "transition_lock_id": lease.lock_id},
                {"$set": update_fields}
            )
            if db_res.matched_count == 0:
                raise RuntimeError(f"User {user_id} transition lease was not found during activation update.")
        except Exception as db_err:
            if fb_uid and lease.verify_ownership():
                try:
                    set_firebase_user_disabled(fb_uid, disabled=True)
                except Exception as rb_err:
                    logger.critical("CRITICAL: Failed to re-disable Firebase user %s after DB error: %s", fb_uid, rb_err)
            lease.release(sync_status="failed")
            logger.error("Failed to update status to Active in MongoDB for %s: %s", user_id, db_err)
            record_audit_log(
                db, current_user["user_id"], current_user["role"],
                "REACTIVATE_USER", f"users/{user_id}",
                "Failed database status update to Active.",
                "FAILED"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update account status in database. Reactivation was cancelled."
            )

        # Step 4: Administrator Counter Tracking with Safe Rollback
        if target_is_admin:
            ensure_active_admin_count_initialized(db)
            counter_updated = False
            for attempt in range(1, 4):
                try:
                    c_res = db.counters.update_one(
                        {"_id": "active_admin_count"},
                        {"$inc": {"count": 1}},
                        upsert=True
                    )
                    if getattr(c_res, "acknowledged", True):
                        counter_updated = True
                        break
                except Exception as cnt_err:
                    logger.warning("Attempt %d/3: Failed to increment active_admin_count for %s: %s", attempt, user_id, cnt_err)
                    time.sleep(0.05 * attempt)

            if not counter_updated:
                # Counter update failed: execute safe rollback
                db_rollback_success = False
                fb_rollback_success = False

                # 1. Verify lease ownership in MongoDB before initiating rollback
                if lease.verify_ownership():
                    try:
                        rb_res = db.users.update_one(
                            {"user_id": user_id, "transition_lock_id": lease.lock_id},
                            {
                                "$set": {
                                    "is_active": False,
                                    "status": "Inactive",
                                    "sync_status": "counter_sync_failed",
                                    "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                    "updated_by": current_user["user_id"]
                                },
                                "$unset": {
                                    "transition_lock_id": "",
                                    "transition_lock_expires_at": "",
                                    "transition_target": ""
                                }
                            }
                        )
                        db_rollback_success = (rb_res.matched_count > 0)
                    except Exception as db_rb_err:
                        logger.error("Failed to rollback MongoDB status to Inactive for %s: %s", user_id, db_rb_err)

                    # 2. ONLY rollback Firebase if MongoDB rollback succeeded AND we still owned the lease!
                    if db_rollback_success and fb_uid:
                        try:
                            set_firebase_user_disabled(fb_uid, disabled=True)
                            fb_rollback_success = True
                        except Exception as fb_rb_err:
                            logger.critical("CRITICAL: Failed to re-disable Firebase user %s after counter failure: %s", fb_uid, fb_rb_err)
                    elif not fb_uid:
                        fb_rollback_success = True
                else:
                    # Lease was already lost/expired! DO NOT mutate Firebase blindly!
                    logger.critical(
                        "CRITICAL RECONCILIATION: Worker lost transition lease during counter failure for user %s (Firebase UID %s). "
                        "Firebase rollback skipped to prevent overwriting authoritative state. Manual reconciliation required.",
                        user_id, fb_uid
                    )

                if not db_rollback_success or not fb_rollback_success:
                    logger.critical(
                        "CRITICAL RECONCILIATION: Active admin counter increment failed for user %s (Firebase UID %s). "
                        "Rollback status: MongoDB=%s, Firebase=%s. Manual administrator reconciliation required.",
                        user_id, fb_uid,
                        "SUCCESS" if db_rollback_success else "FAILED",
                        "SUCCESS" if fb_rollback_success else "FAILED"
                    )

                record_audit_log(
                    db, current_user["user_id"], current_user["role"],
                    "REACTIVATE_USER", f"users/{user_id}",
                    f"Failed active admin counter tracking. Rollback: MongoDB={'SUCCESS' if db_rollback_success else 'FAILED'}, Firebase={'SUCCESS' if fb_rollback_success else 'FAILED'}",
                    "FAILED" if (db_rollback_success and fb_rollback_success) else "PARTIAL_SYNC"
                )

                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update administrative state. Reactivation was cancelled."
                )

        # Step 5: Transition Complete - release lease and mark synced
        lease.release(sync_status="synced")

        record_audit_log(
            db, current_user["user_id"], current_user["role"],
            "REACTIVATE_USER", f"users/{user_id}",
            f"Reactivated user {user_id} ({target_user.get('email')})",
            "SUCCESS"
        )
        updated_user = db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {
            "success": True,
            "message": f"User {user_id} account status updated to Active.",
            "user": updated_user
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
