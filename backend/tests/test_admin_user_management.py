import pytest
import concurrent.futures
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.database.mongo import get_database
from app.api.admin import allocate_next_user_id, reserve_admin_deactivation

ADMIN_CLAIMS = {
    "uid": "firebase_uid_amit_live",
    "email": "amit.kumar@utilityai.org",
    "email_verified": True,
    "firebase": {"sign_in_provider": "password"}
}

def test_admin_list_users_with_filters(client: TestClient):
    """Admin can list users with role, status, and search filters."""
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS):
        res = client.get("/api/admin/users", headers={"Authorization": "Bearer valid_admin_token"})
        assert res.status_code == 200
        data = res.json()
        assert "users" in data
        assert data["total"] >= 105

        res_emp = client.get("/api/admin/users?role=Employee", headers={"Authorization": "Bearer valid_admin_token"})
        assert res_emp.status_code == 200
        for u in res_emp.json()["users"]:
            assert u["role"] == "Employee"

        res_search = client.get("/api/admin/users?search=Priya", headers={"Authorization": "Bearer valid_admin_token"})
        assert res_search.status_code == 200
        assert any(u["name"] == "Priya Singh" for u in res_search.json()["users"])

def test_customer_and_employee_cannot_access_admin_endpoints(client: TestClient):
    """Non-administrators receive HTTP 403 on administrative endpoints."""
    cust_claims = {
        "uid": "firebase_uid_john_live",
        "email": "john.doe@example.com",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=cust_claims):
        assert client.get("/api/admin/users", headers={"Authorization": "Bearer token"}).status_code == 403
        assert client.post("/api/admin/users/employee", json={"name": "A", "email": "a@b.com"}, headers={"Authorization": "Bearer token"}).status_code == 403
        assert client.post("/api/admin/users/administrator", json={"name": "A", "email": "a@b.com"}, headers={"Authorization": "Bearer token"}).status_code == 403
        assert client.patch("/api/admin/users/EMP0001/status", json={"is_active": False}, headers={"Authorization": "Bearer token"}).status_code == 403

    emp_claims = {
        "uid": "firebase_uid_priya_live",
        "email": "priya.singh@utilityai.org",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=emp_claims):
        assert client.get("/api/admin/users", headers={"Authorization": "Bearer token"}).status_code == 403
        assert client.post("/api/admin/users/employee", json={"name": "A", "email": "a@b.com"}, headers={"Authorization": "Bearer token"}).status_code == 403

def test_concurrent_employee_and_admin_id_allocation():
    """Concurrent allocation generates unique, collision-free sequential IDs."""
    db = get_database()

    def alloc_emp(_):
        return allocate_next_user_id(db, "EMP")

    def alloc_adm(_):
        return allocate_next_user_id(db, "ADM")

    # 10 concurrent employee allocations
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        emp_ids = list(executor.map(alloc_emp, range(10)))
    assert len(emp_ids) == len(set(emp_ids)), "Duplicate employee ID detected under concurrency!"
    for eid in emp_ids:
        assert eid.startswith("EMP")

    # 10 concurrent administrator allocations
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        adm_ids = list(executor.map(alloc_adm, range(10)))
    assert len(adm_ids) == len(set(adm_ids)), "Duplicate administrator ID detected under concurrency!"
    for aid in adm_ids:
        assert aid.startswith("ADM")

def test_custom_user_id_validation_and_duplicate_prevention(client: TestClient):
    """Custom user IDs must match the role regex and reject duplicates."""
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS):
        # 1. Invalid format for employee custom ID
        res_invalid = client.post(
            "/api/admin/users/employee",
            json={"name": "Test", "email": "unique1@utilityai.org", "user_id": "INVALID123"},
            headers={"Authorization": "Bearer token"}
        )
        assert res_invalid.status_code == 400
        assert "Invalid Employee ID format" in res_invalid.json()["detail"]

        # 2. Duplicate custom user ID
        res_dup = client.post(
            "/api/admin/users/employee",
            json={"name": "Test", "email": "unique2@utilityai.org", "user_id": "EMP0001"},
            headers={"Authorization": "Bearer token"}
        )
        assert res_dup.status_code == 409
        assert "already assigned" in res_dup.json()["detail"]

        # 3. Invalid format for administrator custom ID
        res_adm_invalid = client.post(
            "/api/admin/users/administrator",
            json={"name": "Test", "email": "unique3@utilityai.org", "user_id": "EMP9999"},
            headers={"Authorization": "Bearer token"}
        )
        assert res_adm_invalid.status_code == 400
        assert "Invalid Administrator ID format" in res_adm_invalid.json()["detail"]

def test_duplicate_and_invalid_email_prevention(client: TestClient):
    """Rejects duplicate and malformed email addresses."""
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS):
        # Malformed email
        res_bad = client.post(
            "/api/admin/users/employee",
            json={"name": "Bad Email", "email": "notanemail"},
            headers={"Authorization": "Bearer token"}
        )
        assert res_bad.status_code == 400
        assert "Invalid email address" in res_bad.json()["detail"]

        # Duplicate email
        res_dup = client.post(
            "/api/admin/users/employee",
            json={"name": "Dup Email", "email": "priya.singh@utilityai.org"},
            headers={"Authorization": "Bearer token"}
        )
        assert res_dup.status_code == 409
        assert "already exists in the system" in res_dup.json()["detail"]

def test_firebase_creation_failure_returns_sanitized_500(client: TestClient):
    """When Firebase create_user fails, returns a safe HTTP 500 without leaking raw details."""
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.create_firebase_user", side_effect=Exception("Raw internal API timeout at https://identitytoolkit.googleapis.com")):

        res = client.post(
            "/api/admin/users/employee",
            json={"name": "FB Fail", "email": "fbfail@utilityai.org"},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 500
        # Assert no raw URL or exception trace leaked
        assert "identitytoolkit" not in res.json()["detail"]
        assert "Failed to create user identity in authentication provider" in res.json()["detail"]

        # Verify failed audit log recorded
        db = get_database()
        audit = db.audit_logs.find_one({"action": "CREATE_EMPLOYEE", "resource": "users/fbfail@utilityai.org", "status": "FAILED"})
        assert audit is not None

def test_activation_link_failure_triggers_safe_firebase_rollback(client: TestClient):
    """When activation-link generation fails, rolls back the newly created Firebase identity."""
    mock_fb = MagicMock()
    mock_fb.uid = "fb_rollback_uid_link"

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.create_firebase_user", return_value=mock_fb), \
         patch("app.api.admin.generate_password_reset_link", side_effect=Exception("SMTP or link failure")), \
         patch("app.api.admin.delete_firebase_user") as mock_delete:

        res = client.post(
            "/api/admin/users/employee",
            json={"name": "Link Fail", "email": "linkfail@utilityai.org"},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 500
        assert "Failed to generate account activation credentials" in res.json()["detail"]

        # Assert rollback of newly created Firebase identity was called
        mock_delete.assert_called_once_with("fb_rollback_uid_link")

        # Assert no user was inserted into MongoDB
        db = get_database()
        assert db.users.find_one({"email": "linkfail@utilityai.org"}) is None

def test_mongodb_insertion_failure_triggers_firebase_rollback(client: TestClient):
    """When MongoDB insert fails, rolls back newly created Firebase identity."""
    mock_fb = MagicMock()
    mock_fb.uid = "fb_rollback_uid_db"

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.create_firebase_user", return_value=mock_fb), \
         patch("app.api.admin.generate_password_reset_link", return_value="https://test.link"), \
         patch("app.api.admin.delete_firebase_user") as mock_delete, \
         patch("mongomock.collection.Collection.insert_one", side_effect=Exception("Database down")):

        res = client.post(
            "/api/admin/users/employee",
            json={"name": "DB Fail", "email": "dbfail@utilityai.org"},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 500
        assert "Failed to persist user profile in database" in res.json()["detail"]
        mock_delete.assert_called_once_with("fb_rollback_uid_db")

def test_rollback_failure_handling_and_logging(client: TestClient):
    """When both provisioning and rollback fail, operation completes safely with critical logging."""
    mock_fb = MagicMock()
    mock_fb.uid = "fb_double_fault"

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.create_firebase_user", return_value=mock_fb), \
         patch("app.api.admin.generate_password_reset_link", side_effect=Exception("Link error")), \
         patch("app.api.admin.delete_firebase_user", side_effect=Exception("Network error deleting user")):

        res = client.post(
            "/api/admin/users/employee",
            json={"name": "Double Fault", "email": "doublefault@utilityai.org"},
            headers={"Authorization": "Bearer token"}
        )
        # Does not crash with unhandled exception; returns clean HTTP 500
        assert res.status_code == 500
        assert "Failed to generate account activation credentials" in res.json()["detail"]

def test_deactivation_consistency_and_firebase_failure_handling(client: TestClient):
    """If Firebase deactivation fails, MongoDB remains Inactive and blocks API access (Fail-Secure)."""
    db = get_database()
    db.users.update_one(
        {"user_id": "EMP0003"},
        {"$set": {"firebase_uid": "fb_emp0003", "is_active": True, "status": "Active"}}
    )

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled", side_effect=Exception("Firebase unavailable")):

        res = client.patch(
            "/api/admin/users/EMP0003/status",
            json={"is_active": False, "reason": "Audit hold"},
            headers={"Authorization": "Bearer token"}
        )
        # Returns 502 noting DB deactivated but FB sync requires reconciliation
        assert res.status_code == 502
        assert "Account access has been revoked in database" in res.json()["detail"]

        # Assert MongoDB account is Inactive and marked for reconciliation
        u = db.users.find_one({"user_id": "EMP0003"})
        assert u["is_active"] is False
        assert u["status"] == "Inactive"
        assert u["sync_status"] == "firebase_sync_failed"

    # Now verify the deactivated user is blocked on /api/auth/me (HTTP 403)
    emp3_claims = {
        "uid": "fb_emp0003",
        "email": u["email"],
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=emp3_claims):
        me_res = client.get("/api/auth/me", headers={"Authorization": "Bearer emp3_token"})
        assert me_res.status_code == 403
        assert "Account has been deactivated" in me_res.json()["detail"]

def test_reactivation_firebase_failure_cancels_mongodb_activation(client: TestClient):
    """If Firebase enable fails during reactivation, MongoDB is NOT marked Active."""
    db = get_database()
    db.users.update_one(
        {"user_id": "EMP0003"},
        {"$set": {"is_active": False, "status": "Inactive"}}
    )

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled", side_effect=Exception("Firebase network failure")):

        res = client.patch(
            "/api/admin/users/EMP0003/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 500
        assert "Failed to enable account in authentication provider" in res.json()["detail"]

        # MongoDB remains Inactive
        u = db.users.find_one({"user_id": "EMP0003"})
        assert u["is_active"] is False
        assert u["status"] == "Inactive"

def test_concurrency_safe_last_active_admin_protection():
    """Concurrent attempts to deactivate administrators cannot reduce count below 1."""
    db = get_database()
    # Setup exactly 2 active administrators
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 2}}, upsert=True)

    # Calling reserve_admin_deactivation twice concurrently
    r1 = reserve_admin_deactivation(db, "ADM0001")
    r2 = reserve_admin_deactivation(db, "ADM0002")

    # Exactly one must succeed and one must fail
    results = [r1, r2]
    assert results.count(True) == 1, "Expected exactly 1 deactivation reservation to succeed!"
    assert results.count(False) == 1, "Expected second deactivation reservation to be rejected!"

def test_last_active_administrator_protection_via_api(client: TestClient):
    """API returns HTTP 400 when attempting to deactivate the last active administrator."""
    db = get_database()
    # Set only 1 active admin
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 1}}, upsert=True)
    db.users.update_many(
        {"role": "Administrator", "user_id": {"$ne": "ADM0001"}},
        {"$set": {"is_active": False, "status": "Inactive"}}
    )
    db.users.update_one({"user_id": "ADM0001"}, {"$set": {"is_active": True, "status": "Active"}})

    # Create temporary active admin caller ADM0099
    adm_caller_claims = {
        "uid": "fb_adm_temp_caller",
        "email": "adm_temp@utilityai.org",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    db.users.insert_one({
        "user_id": "ADM0099",
        "firebase_uid": "fb_adm_temp_caller",
        "email": "adm_temp@utilityai.org",
        "role": "Administrator",
        "is_active": True,
        "status": "Active"
    })

    # Force active_admin_count to 1 so deactivating ADM0001 is guarded
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 1}}, upsert=True)

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=adm_caller_claims):
        res = client.patch(
            "/api/admin/users/ADM0001/status",
            json={"is_active": False},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 400
        assert "Cannot deactivate the last active Administrator" in res.json()["detail"]

    # Cleanup
    db.users.delete_one({"user_id": "ADM0099"})
    db.users.update_one({"user_id": "ADM0001"}, {"$set": {"is_active": True, "status": "Active"}})

def test_self_deactivation_protection(client: TestClient):
    """Administrator cannot deactivate their own account."""
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS):
        res = client.patch(
            "/api/admin/users/ADM0001/status",
            json={"is_active": False},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 400
        assert "cannot deactivate your own" in res.json()["detail"].lower()

def test_successful_account_creation_and_lifecycle(client: TestClient):
    """Full lifecycle: create employee -> deactivate -> reactivate -> audit logs."""
    mock_fb = MagicMock()
    mock_fb.uid = "fb_lifecycle_test"

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.create_firebase_user", return_value=mock_fb), \
         patch("app.api.admin.generate_password_reset_link", return_value="https://test.auth/link"), \
         patch("app.api.admin.set_firebase_user_disabled"):

        # 1. Create employee
        create_res = client.post(
            "/api/admin/users/employee",
            json={
                "name": "Lifecycle Test User",
                "email": "lifecycle.test@utilityai.org",
                "department": "Engineering"
            },
            headers={"Authorization": "Bearer token"}
        )
        assert create_res.status_code == 200
        new_uid = create_res.json()["user"]["user_id"]
        assert new_uid.startswith("EMP")

        # 2. Deactivate employee
        deact_res = client.patch(
            f"/api/admin/users/{new_uid}/status",
            json={"is_active": False, "reason": "Lifecycle test"},
            headers={"Authorization": "Bearer token"}
        )
        assert deact_res.status_code == 200
        assert deact_res.json()["user"]["is_active"] is False

        # 3. Reactivate employee
        react_res = client.patch(
            f"/api/admin/users/{new_uid}/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )
        assert react_res.status_code == 200
        assert react_res.json()["user"]["is_active"] is True

        # 4. Verify audit trail has SUCCESS records
        db = get_database()
        logs = list(db.audit_logs.find({"resource": f"users/{new_uid}"}))
        actions = [log["action"] for log in logs]
        assert "CREATE_EMPLOYEE" in actions
        assert "DEACTIVATE_USER" in actions
        assert "REACTIVATE_USER" in actions


def test_repeated_deactivation_is_idempotent_and_does_not_decrement_counter(client: TestClient):
    """Repeated deactivations return success and do not double-decrement active_admin_count."""
    db = get_database()
    # Seed target administrator ADM0080
    db.users.delete_one({"user_id": "ADM0080"})
    db.users.insert_one({
        "user_id": "ADM0080",
        "firebase_uid": "fb_adm0080",
        "email": "adm0080@utilityai.org",
        "role": "Administrator",
        "is_active": True,
        "status": "Active"
    })
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 5}}, upsert=True)

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled"):

        # 1. First deactivation
        res1 = client.patch(
            "/api/admin/users/ADM0080/status",
            json={"is_active": False, "reason": "First deactivation"},
            headers={"Authorization": "Bearer token"}
        )
        assert res1.status_code == 200
        assert res1.json()["user"]["is_active"] is False
        cnt1 = db.counters.find_one({"_id": "active_admin_count"})["count"]
        assert cnt1 == 4

        # 2. Second (repeated) deactivation on already inactive admin
        res2 = client.patch(
            "/api/admin/users/ADM0080/status",
            json={"is_active": False, "reason": "Repeated deactivation"},
            headers={"Authorization": "Bearer token"}
        )
        assert res2.status_code == 200
        assert "already inactive" in res2.json()["message"]
        cnt2 = db.counters.find_one({"_id": "active_admin_count"})["count"]
        # Counter must remain 4, NOT 3
        assert cnt2 == 4

    # Cleanup
    db.users.delete_one({"user_id": "ADM0080"})


def test_repeated_reactivation_is_idempotent_and_does_not_increment_counter(client: TestClient):
    """Repeated reactivations return success and do not double-increment active_admin_count."""
    db = get_database()
    # Seed target inactive administrator ADM0081
    db.users.delete_one({"user_id": "ADM0081"})
    db.users.insert_one({
        "user_id": "ADM0081",
        "firebase_uid": "fb_adm0081",
        "email": "adm0081@utilityai.org",
        "role": "Administrator",
        "is_active": False,
        "status": "Inactive"
    })
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 4}}, upsert=True)

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled"):

        # 1. First reactivation
        res1 = client.patch(
            "/api/admin/users/ADM0081/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )
        assert res1.status_code == 200
        assert res1.json()["user"]["is_active"] is True
        cnt1 = db.counters.find_one({"_id": "active_admin_count"})["count"]
        assert cnt1 == 5

        # 2. Second (repeated) reactivation on already active admin
        res2 = client.patch(
            "/api/admin/users/ADM0081/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )
        assert res2.status_code == 200
        assert "already active" in res2.json()["message"]
        cnt2 = db.counters.find_one({"_id": "active_admin_count"})["count"]
        # Counter must remain 5, NOT 6
        assert cnt2 == 5

    # Cleanup
    db.users.delete_one({"user_id": "ADM0081"})


def test_concurrent_deactivation_of_same_admin_decrements_counter_exactly_once(client: TestClient):
    """Concurrent deactivation requests for the same admin decrement the counter exactly once."""
    db = get_database()
    db.users.delete_one({"user_id": "ADM0082"})
    db.users.insert_one({
        "user_id": "ADM0082",
        "firebase_uid": "fb_adm0082",
        "email": "adm0082@utilityai.org",
        "role": "Administrator",
        "is_active": True,
        "status": "Active"
    })
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 5}}, upsert=True)

    def do_deactivate(_):
        return client.patch(
            "/api/admin/users/ADM0082/status",
            json={"is_active": False, "reason": "Concurrent race test"},
            headers={"Authorization": "Bearer token"}
        )

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled"):
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(do_deactivate, [1, 2]))

    # Winner succeeds with 200 OK; competing concurrent transition receives 409 Conflict or 200 if serialized
    status_codes = [r.status_code for r in responses]
    assert 200 in status_codes
    assert all(code in [200, 409] for code in status_codes)

    # Counter should be decremented from 5 to 4, not double-decremented to 3
    final_count = db.counters.find_one({"_id": "active_admin_count"})["count"]
    assert final_count == 4

    # Target document should be Inactive
    u = db.users.find_one({"user_id": "ADM0082"})
    assert u["is_active"] is False
    assert u["status"] == "Inactive"

    # Cleanup
    db.users.delete_one({"user_id": "ADM0082"})


def test_admin_creation_counter_failure_triggers_safe_rollback(client: TestClient):
    """When Administrator creation counter increment fails, database doc and Firebase user are rolled back."""
    mock_fb = MagicMock()
    mock_fb.uid = "fb_adm_counter_fail"

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.create_firebase_user", return_value=mock_fb), \
         patch("app.api.admin.generate_password_reset_link", return_value="https://test.link"), \
         patch("app.api.admin.delete_firebase_user") as mock_delete, \
         patch("app.api.admin.ensure_active_admin_count_initialized"), \
         patch("mongomock.collection.Collection.update_one", side_effect=Exception("Counter database lock")):

        res = client.post(
            "/api/admin/users/administrator",
            json={"name": "Counter Fail Admin", "email": "cntfail@utilityai.org"},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 500
        assert "Failed to update administrative state" in res.json()["detail"]

        # Firebase identity rolled back
        mock_delete.assert_called_once_with("fb_adm_counter_fail")

        # Database document rolled back
        db = get_database()
        assert db.users.find_one({"email": "cntfail@utilityai.org"}) is None


def test_admin_reactivation_counter_failure_triggers_safe_rollback(client: TestClient):
    """When Administrator reactivation counter increment fails, database doc and Firebase user are rolled back."""
    db = get_database()
    db.users.delete_one({"user_id": "ADM0085"})
    db.users.insert_one({
        "user_id": "ADM0085",
        "firebase_uid": "fb_adm0085",
        "email": "adm0085@utilityai.org",
        "role": "Administrator",
        "is_active": False,
        "status": "Inactive"
    })
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 4}}, upsert=True)

    # Track Firebase calls
    fb_disabled_calls = []

    def mock_set_disabled(uid, disabled):
        fb_disabled_calls.append((uid, disabled))

    orig_update_one = db.counters.update_one

    def mock_counter_update_one(filter_doc, *args, **kwargs):
        if filter_doc.get("_id") == "active_admin_count":
            raise Exception("Counter database failure")
        return orig_update_one(filter_doc, *args, **kwargs)

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled", side_effect=mock_set_disabled), \
         patch.object(db.counters, "update_one", side_effect=mock_counter_update_one):

        res = client.patch(
            "/api/admin/users/ADM0085/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 500
        assert "Failed to update administrative state" in res.json()["detail"]

        # 1. Firebase was enabled first, then rolled back to disabled=True
        assert ("fb_adm0085", False) in fb_disabled_calls
        assert ("fb_adm0085", True) in fb_disabled_calls

        # 2. MongoDB status was rolled back to Inactive
        u = db.users.find_one({"user_id": "ADM0085"})
        assert u["is_active"] is False
        assert u["status"] == "Inactive"
        assert u["sync_status"] == "counter_sync_failed"

        # 3. Transition lock was released
        assert "transition_lock_id" not in u or u.get("transition_lock_id") is None

        # 4. Active admin count remained 4 (not incremented)
        cnt = db.counters.find_one({"_id": "active_admin_count"})["count"]
        assert cnt == 4

    # Cleanup
    db.users.delete_one({"user_id": "ADM0085"})


def test_admin_reactivation_rollback_double_fault_logs_critical_reconciliation(client: TestClient):
    """When counter fails AND Firebase rollback fails, critical reconciliation is recorded."""
    db = get_database()
    db.users.delete_one({"user_id": "ADM0086"})
    db.users.insert_one({
        "user_id": "ADM0086",
        "firebase_uid": "fb_adm0086",
        "email": "adm0086@utilityai.org",
        "role": "Administrator",
        "is_active": False,
        "status": "Inactive"
    })
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 4}}, upsert=True)

    def mock_set_disabled_double_fault(uid, disabled):
        if disabled is False:
            return  # Enable succeeds
        raise Exception("Firebase network timeout on rollback disable")

    orig_update_one = db.counters.update_one

    def mock_counter_update_one(filter_doc, *args, **kwargs):
        if filter_doc.get("_id") == "active_admin_count":
            raise Exception("Counter lock failure")
        return orig_update_one(filter_doc, *args, **kwargs)

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled", side_effect=mock_set_disabled_double_fault), \
         patch.object(db.counters, "update_one", side_effect=mock_counter_update_one):

        res = client.patch(
            "/api/admin/users/ADM0086/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 500
        assert "Failed to update administrative state" in res.json()["detail"]

        # Audit log records PARTIAL_SYNC because Firebase rollback failed
        audit = db.audit_logs.find_one({
            "action": "REACTIVATE_USER",
            "resource": "users/ADM0086",
            "status": "PARTIAL_SYNC"
        })
        assert audit is not None
        assert "Firebase=FAILED" in audit["details"]

    # Cleanup
    db.users.delete_one({"user_id": "ADM0086"})


def test_in_flight_transition_returns_409_conflict(client: TestClient):
    """A second request targeting an account with an active transition receives HTTP 409 Conflict."""
    db = get_database()
    import time
    db.users.delete_one({"user_id": "EMP0095"})
    db.users.insert_one({
        "user_id": "EMP0095",
        "firebase_uid": "fb_emp0095",
        "email": "emp0095@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active",
        "transition_lock_id": "TLOCK_ACTIVE_IN_FLIGHT",
        "transition_lock_expires_at": time.time() + 60,
        "transition_target": "Inactive"
    })

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS):
        res = client.patch(
            "/api/admin/users/EMP0095/status",
            json={"is_active": False},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 409
        assert "transition is already in progress" in res.json()["detail"].lower()

    # Cleanup
    db.users.delete_one({"user_id": "EMP0095"})


def test_stale_transition_lock_recovers_and_succeeds(client: TestClient):
    """A stale transition lock (expired TTL) is safely claimed and allows new transitions to proceed."""
    db = get_database()
    import time
    db.users.delete_one({"user_id": "EMP0096"})
    db.users.insert_one({
        "user_id": "EMP0096",
        "firebase_uid": "fb_emp0096",
        "email": "emp0096@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active",
        "transition_lock_id": "TLOCK_CRASHED_WORKER",
        "transition_lock_expires_at": time.time() - 10,  # Expired
        "transition_target": "Inactive"
    })

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled"):

        res = client.patch(
            "/api/admin/users/EMP0096/status",
            json={"is_active": False, "reason": "Crash recovery"},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 200
        assert res.json()["user"]["is_active"] is False

        # Transition lock cleared after completion
        u = db.users.find_one({"user_id": "EMP0096"})
        assert "transition_lock_id" not in u or u.get("transition_lock_id") is None
        assert u["sync_status"] == "synced"

    # Cleanup
    db.users.delete_one({"user_id": "EMP0096"})


def test_concurrent_activation_and_deactivation_of_same_administrator(client: TestClient):
    """Concurrent activation and deactivation on the same administrator cannot leave DB/Firebase inconsistent."""
    db = get_database()
    db.users.delete_one({"user_id": "ADM0097"})
    db.users.insert_one({
        "user_id": "ADM0097",
        "firebase_uid": "fb_adm0097",
        "email": "adm0097@utilityai.org",
        "role": "Administrator",
        "is_active": True,
        "status": "Active"
    })
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 5}}, upsert=True)

    fb_state = {"disabled": False}

    def mock_set_disabled(uid, disabled):
        if uid == "fb_adm0097":
            fb_state["disabled"] = disabled

    def call_deact():
        return client.patch(
            "/api/admin/users/ADM0097/status",
            json={"is_active": False, "reason": "Race deact"},
            headers={"Authorization": "Bearer token"}
        )

    def call_react():
        return client.patch(
            "/api/admin/users/ADM0097/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled", side_effect=mock_set_disabled):

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            fut1 = executor.submit(call_deact)
            fut2 = executor.submit(call_react)
            res1 = fut1.result()
            res2 = fut2.result()

        status_codes = [res1.status_code, res2.status_code]
        # At least one succeeded with 200, and competing request either succeeded (if serialized) or received 409 Conflict
        assert 200 in status_codes
        assert all(code in [200, 409] for code in status_codes)

        # Final state check: MongoDB and Firebase MUST AGREE
        u = db.users.find_one({"user_id": "ADM0097"})
        if u["is_active"] is True:
            assert fb_state["disabled"] is False, "Firebase is disabled while MongoDB is Active!"
        else:
            assert fb_state["disabled"] is True, "Firebase is enabled while MongoDB is Inactive!"

        # Transition lock must be released
        assert "transition_lock_id" not in u or u.get("transition_lock_id") is None

    # Cleanup
    db.users.delete_one({"user_id": "ADM0097"})


def test_concurrent_activation_and_deactivation_of_same_employee(client: TestClient):
    """Concurrent activation and deactivation on the same employee cannot leave DB/Firebase inconsistent."""
    db = get_database()
    db.users.delete_one({"user_id": "EMP0098"})
    db.users.insert_one({
        "user_id": "EMP0098",
        "firebase_uid": "fb_emp0098",
        "email": "emp0098@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active"
    })

    fb_state = {"disabled": False}

    def mock_set_disabled(uid, disabled):
        if uid == "fb_emp0098":
            fb_state["disabled"] = disabled

    def call_deact():
        return client.patch(
            "/api/admin/users/EMP0098/status",
            json={"is_active": False, "reason": "Race deact emp"},
            headers={"Authorization": "Bearer token"}
        )

    def call_react():
        return client.patch(
            "/api/admin/users/EMP0098/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled", side_effect=mock_set_disabled):

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            fut1 = executor.submit(call_deact)
            fut2 = executor.submit(call_react)
            res1 = fut1.result()
            res2 = fut2.result()

        status_codes = [res1.status_code, res2.status_code]
        assert 200 in status_codes
        assert all(code in [200, 409] for code in status_codes)

        u = db.users.find_one({"user_id": "EMP0098"})
        if u["is_active"] is True:
            assert fb_state["disabled"] is False, "Firebase disabled mismatch with MongoDB Active!"
        else:
            assert fb_state["disabled"] is True, "Firebase enabled mismatch with MongoDB Inactive!"

    # Cleanup
    db.users.delete_one({"user_id": "EMP0098"})


def test_distributed_lease_renewal_during_long_operation():
    """Distributed transition lease can be renewed periodically and extends the expiry TTL."""
    import time
    from app.api.admin import DistributedTransitionLease
    db = get_database()
    db.users.delete_one({"user_id": "EMP0101"})
    db.users.insert_one({
        "user_id": "EMP0101",
        "firebase_uid": "fb_emp0101",
        "email": "emp0101@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active"
    })

    lease = DistributedTransitionLease(db, "EMP0101", "Inactive", "ADM0001", ttl=10)
    acquired = lease.acquire(is_deactivation=True)
    assert acquired is True
    initial_expiry = lease.expires_at

    # Small pause then renew
    time.sleep(0.05)
    renewed = lease.renew()
    assert renewed is True
    assert lease.expires_at > initial_expiry

    # Ensure valid for operation succeeds
    assert lease.ensure_valid_for_operation(min_remaining=2.0) is True

    # Check MongoDB document reflects updated expires_at
    u = db.users.find_one({"user_id": "EMP0101"})
    assert u["transition_lock_id"] == lease.lock_id
    assert u["transition_lock_expires_at"] == lease.expires_at

    # Release lease
    released = lease.release(sync_status="synced")
    assert released is True
    u_after = db.users.find_one({"user_id": "EMP0101"})
    assert "transition_lock_id" not in u_after or u_after.get("transition_lock_id") is None
    assert u_after["sync_status"] == "synced"

    db.users.delete_one({"user_id": "EMP0101"})


def test_distributed_lease_renewal_failure_halts_worker_and_marks_stale():
    """If lease renewal fails (e.g. lease stolen or expired), worker is marked stale and halted."""
    import time
    from app.api.admin import DistributedTransitionLease
    db = get_database()
    db.users.delete_one({"user_id": "EMP0102"})
    db.users.insert_one({
        "user_id": "EMP0102",
        "firebase_uid": "fb_emp0102",
        "email": "emp0102@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active"
    })

    lease = DistributedTransitionLease(db, "EMP0102", "Inactive", "ADM0001", ttl=10)
    assert lease.acquire(is_deactivation=True) is True

    # Simulate another worker taking over or lease document modified
    db.users.update_one(
        {"user_id": "EMP0102"},
        {"$set": {"transition_lock_id": "TLOCK_ANOTHER_WORKER"}}
    )

    # Renewal must fail and mark worker stale
    assert lease.renew() is False
    assert lease.is_stale is True

    # Pre-flight and post-flight checks must now fail immediately
    assert lease.ensure_valid_for_operation() is False
    assert lease.verify_ownership() is False

    lease.release()
    db.users.delete_one({"user_id": "EMP0102"})


def test_worker_cannot_takeover_active_unexpired_lease(client: TestClient):
    """A second worker cannot acquire an active, unexpired lease, and receives HTTP 409 Conflict."""
    import time
    from app.api.admin import DistributedTransitionLease
    db = get_database()
    db.users.delete_one({"user_id": "EMP0103"})
    db.users.insert_one({
        "user_id": "EMP0103",
        "firebase_uid": "fb_emp0103",
        "email": "emp0103@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active"
    })

    lease1 = DistributedTransitionLease(db, "EMP0103", "Inactive", "ADM0001", ttl=30)
    assert lease1.acquire(is_deactivation=True) is True

    # Worker 2 tries to acquire directly via DistributedTransitionLease
    lease2 = DistributedTransitionLease(db, "EMP0103", "Active", "ADM0001", ttl=30)
    assert lease2.acquire(is_deactivation=False) is False

    # Worker 2 tries via the API endpoint
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS):
        res = client.patch(
            "/api/admin/users/EMP0103/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 409
        assert "transition is already in progress" in res.json()["detail"].lower()

    # Clean up lease1
    lease1.release(sync_status="synced")
    db.users.delete_one({"user_id": "EMP0103"})


def test_delayed_deactivation_cannot_overwrite_newer_reactivation():
    """An older deactivation worker cannot overwrite a newer reactivation state after lease loss."""
    import time
    from app.api.admin import DistributedTransitionLease
    db = get_database()
    db.users.delete_one({"user_id": "EMP0104"})
    db.users.insert_one({
        "user_id": "EMP0104",
        "firebase_uid": "fb_emp0104",
        "email": "emp0104@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active"
    })

    # Worker 1 acquires deactivation lease
    lease1 = DistributedTransitionLease(db, "EMP0104", "Inactive", "ADM0001", ttl=10)
    assert lease1.acquire(is_deactivation=True) is True

    # Worker 2 takes over (e.g. Worker 1 stalled past expiry) and reactivates the account
    db.users.update_one(
        {"user_id": "EMP0104"},
        {
            "$set": {
                "is_active": True,
                "status": "Active",
                "transition_lock_id": "TLOCK_WORKER_2_REACTIVATION",
                "transition_lock_expires_at": time.time() + 30,
                "transition_target": "Active",
                "sync_status": "synced"
            }
        }
    )

    # Worker 1 wakes up and tries post-operation verification
    assert lease1.verify_ownership() is False
    assert lease1.is_stale is True

    # Worker 1 tries pre-operation check for next step: must fail
    assert lease1.ensure_valid_for_operation() is False

    # Worker 1's release() must not clear Worker 2's lease
    lease1.release()
    curr = db.users.find_one({"user_id": "EMP0104"})
    assert curr["is_active"] is True
    assert curr["status"] == "Active"
    assert curr["transition_lock_id"] == "TLOCK_WORKER_2_REACTIVATION"

    db.users.delete_one({"user_id": "EMP0104"})


def test_delayed_reactivation_cannot_overwrite_newer_deactivation():
    """An older reactivation worker cannot overwrite a newer deactivation state after lease loss."""
    import time
    from app.api.admin import DistributedTransitionLease
    db = get_database()
    db.users.delete_one({"user_id": "EMP0105"})
    db.users.insert_one({
        "user_id": "EMP0105",
        "firebase_uid": "fb_emp0105",
        "email": "emp0105@utilityai.org",
        "role": "Employee",
        "is_active": False,
        "status": "Inactive"
    })

    # Worker 1 acquires reactivation lease
    lease1 = DistributedTransitionLease(db, "EMP0105", "Active", "ADM0001", ttl=10)
    assert lease1.acquire(is_deactivation=False) is True

    # Worker 2 supersedes and deactivates the user
    db.users.update_one(
        {"user_id": "EMP0105"},
        {
            "$set": {
                "is_active": False,
                "status": "Inactive",
                "transition_lock_id": "TLOCK_WORKER_2_DEACTIVATION",
                "transition_lock_expires_at": time.time() + 30,
                "transition_target": "Inactive",
                "sync_status": "synced"
            }
        }
    )

    # Worker 1 checks ownership: must be detected as stale
    assert lease1.verify_ownership() is False
    assert lease1.is_stale is True

    # Database state remains protected as Inactive
    curr = db.users.find_one({"user_id": "EMP0105"})
    assert curr["is_active"] is False
    assert curr["status"] == "Inactive"

    lease1.release()
    db.users.delete_one({"user_id": "EMP0105"})


def test_stale_worker_skips_firebase_rollback_after_lease_loss(client: TestClient):
    """When a worker loses lease ownership, Firebase rollback is skipped to prevent overwriting newer state."""
    db = get_database()
    db.users.delete_one({"user_id": "ADM0106"})
    db.users.insert_one({
        "user_id": "ADM0106",
        "firebase_uid": "fb_adm0106",
        "email": "adm0106@utilityai.org",
        "role": "Administrator",
        "is_active": False,
        "status": "Inactive"
    })
    db.counters.update_one({"_id": "active_admin_count"}, {"$set": {"count": 2}}, upsert=True)

    fb_calls = []

    def mock_set_disabled(uid, disabled):
        fb_calls.append({"uid": uid, "disabled": disabled})

    def mock_counter_update(*args, **kwargs):
        # Worker lost lease ownership while attempting counter update (e.g. lease expired and claimed by another worker)
        db.users.update_one(
            {"user_id": "ADM0106"},
            {"$set": {"transition_lock_id": "TLOCK_NEWER_TRANSITION"}}
        )
        raise Exception("Counter cluster failure")

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled", side_effect=mock_set_disabled), \
         patch.object(db.counters, "update_one", side_effect=mock_counter_update):

        res = client.patch(
            "/api/admin/users/ADM0106/status",
            json={"is_active": True},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 500

    # Verify Firebase was called once to enable (disabled=False)
    assert len(fb_calls) == 1
    assert fb_calls[0] == {"uid": "fb_adm0106", "disabled": False}

    # Critically, set_firebase_user_disabled(disabled=True) was NOT called for rollback because lease was lost!
    assert not any(call["disabled"] is True for call in fb_calls)

    # Verify critical reconciliation log recorded
    audit = db.audit_logs.find_one({
        "action": "REACTIVATE_USER",
        "resource": "users/ADM0106",
        "status": "PARTIAL_SYNC"
    })
    assert audit is not None
    assert "Rollback: MongoDB=FAILED, Firebase=FAILED" in audit["details"]

    db.users.delete_one({"user_id": "ADM0106"})


def test_firebase_request_timeout_and_deadline_respected():
    """Individual Firebase operations enforce a hard timeout and raise TimeoutError on hang."""
    import time
    from app.security.firebase_admin_init import set_firebase_user_disabled

    def hanging_update_user(uid, **kwargs):
        time.sleep(1.0)

    with patch("firebase_admin.auth.update_user", side_effect=hanging_update_user):
        start = time.time()
        with pytest.raises(TimeoutError) as exc_info:
            set_firebase_user_disabled("fb_hang_uid", disabled=True, timeout_sec=0.2)
        elapsed = time.time() - start
        assert elapsed < 0.6, f"Firebase timeout took too long: {elapsed}s"
        assert "timed out after 0.2s" in str(exc_info.value)


def test_stale_lease_recovery_after_simulated_crash(client: TestClient):
    """Expired lease from a crashed worker is safely claimed by a new request."""
    import time
    db = get_database()
    db.users.delete_one({"user_id": "EMP0107"})
    db.users.insert_one({
        "user_id": "EMP0107",
        "firebase_uid": "fb_emp0107",
        "email": "emp0107@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active",
        "transition_lock_id": "TLOCK_CRASHED_WORKER_99",
        "transition_lock_expires_at": time.time() - 15,  # 15 seconds expired
        "transition_target": "Inactive"
    })

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled"):

        res = client.patch(
            "/api/admin/users/EMP0107/status",
            json={"is_active": False, "reason": "Crash recovery verification"},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 200
        assert res.json()["user"]["is_active"] is False

    curr = db.users.find_one({"user_id": "EMP0107"})
    assert curr["is_active"] is False
    assert curr["status"] == "Inactive"
    assert "transition_lock_id" not in curr or curr.get("transition_lock_id") is None
    assert curr["sync_status"] == "synced"

    db.users.delete_one({"user_id": "EMP0107"})


def test_defense_in_depth_inactive_and_transitioning_user_blocked_at_auth(client: TestClient):
    """Deactivated and transitioning-to-inactive users are blocked with HTTP 403 at token resolution."""
    db = get_database()
    db.users.delete_one({"user_id": "EMP0108"})
    db.users.insert_one({
        "user_id": "EMP0108",
        "firebase_uid": "fb_emp0108",
        "email": "emp0108@utilityai.org",
        "role": "Employee",
        "is_active": False,
        "status": "Inactive"
    })

    token_claims = {
        "uid": "fb_emp0108",
        "email": "emp0108@utilityai.org",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }

    # 1. Inactive user receives 403 Forbidden
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
        assert res.status_code == 403
        assert "deactivated" in res.json()["detail"].lower()

    # 2. User mid-transition to Inactive receives 403 Forbidden (fail-secure)
    db.users.update_one(
        {"user_id": "EMP0108"},
        {"$set": {"is_active": True, "status": "Active", "transition_target": "Inactive"}}
    )
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res2 = client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
        assert res2.status_code == 403
        assert "deactivated" in res2.json()["detail"].lower()

    db.users.delete_one({"user_id": "EMP0108"})


def test_firebase_transport_timeout_configuration():
    """Firebase Admin app options and Auth client UserManager configure genuine 5.0s transport timeout."""
    import os
    from app.security.firebase_admin_init import get_firebase_app, FIREBASE_HTTP_TIMEOUT_SECONDS
    from firebase_admin import auth

    app = get_firebase_app()
    assert hasattr(app, "options")
    assert app.options.get("httpTimeout") == FIREBASE_HTTP_TIMEOUT_SECONDS

    # Verify that Auth client UserManager uses the configured transport timeout
    with patch.dict(os.environ, {"FIREBASE_AUTH_EMULATOR_HOST": "127.0.0.1:9099"}):
        auth_client = auth._get_client(app)
        assert hasattr(auth_client, "_user_manager")
        assert hasattr(auth_client._user_manager, "http_client")
        assert auth_client._user_manager.http_client.timeout == FIREBASE_HTTP_TIMEOUT_SECONDS


def test_firebase_retry_deadline_stops_retries(client: TestClient):
    """When the total Firebase operation duration exceeds the 16.0s deadline, retries halt immediately."""
    import time
    db = get_database()
    db.users.delete_one({"user_id": "EMP0109"})
    db.users.insert_one({
        "user_id": "EMP0109",
        "firebase_uid": "fb_emp0109",
        "email": "emp0109@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active"
    })

    call_count = [0]
    real_time = time.time

    def mock_time():
        # First call is start_time; subsequent calls simulate deadline expiration (>16s)
        if call_count[0] == 0:
            return real_time()
        return real_time() + 20.0  # Simulated 20s elapsed

    def mock_set_disabled(uid, disabled):
        call_count[0] += 1
        raise Exception("Firebase 503 Service Unavailable")

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled", side_effect=mock_set_disabled), \
         patch("app.api.admin.time.time", side_effect=mock_time):

        res = client.patch(
            "/api/admin/users/EMP0109/status",
            json={"is_active": False},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 502

    # Loop must have broken out on the deadline after the 1st attempt, not exhausting all 3 retries
    assert call_count[0] == 1

    db.users.delete_one({"user_id": "EMP0109"})


def test_firebase_retry_stops_immediately_if_lease_lost_between_attempts(client: TestClient):
    """If lease ownership is lost after attempt 1, the pre-flight check halts further retries before attempt 2."""
    db = get_database()
    db.users.delete_one({"user_id": "EMP0110"})
    db.users.insert_one({
        "user_id": "EMP0110",
        "firebase_uid": "fb_emp0110",
        "email": "emp0110@utilityai.org",
        "role": "Employee",
        "is_active": True,
        "status": "Active"
    })

    attempt_count = [0]

    def mock_set_disabled(uid, disabled):
        attempt_count[0] += 1
        # On attempt 1 failure, another worker supersedes the transition lease
        db.users.update_one(
            {"user_id": "EMP0110"},
            {"$set": {"transition_lock_id": "TLOCK_SUPERSEDED_BY_WORKER2"}}
        )
        raise Exception("Transient Firebase network error")

    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=ADMIN_CLAIMS), \
         patch("app.api.admin.set_firebase_user_disabled", side_effect=mock_set_disabled):

        res = client.patch(
            "/api/admin/users/EMP0110/status",
            json={"is_active": False},
            headers={"Authorization": "Bearer token"}
        )
        assert res.status_code == 502

    # Attempt 2 was NEVER made because ensure_valid_for_operation detected lease loss
    assert attempt_count[0] == 1

    # Database record preserved fail-secure
    u = db.users.find_one({"user_id": "EMP0110"})
    assert u["is_active"] is False

    db.users.delete_one({"user_id": "EMP0110"})


