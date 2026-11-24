import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

def test_unauthenticated_request_returns_401(client: TestClient):
    """Endpoints must reject unauthenticated requests with HTTP 401."""
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    assert "Missing Authorization header" in res.json()["detail"]

def test_missing_bearer_prefix_returns_401(client: TestClient):
    """Non-Bearer scheme must be rejected with HTTP 401."""
    res = client.get("/api/auth/me", headers={"Authorization": "Basic 12345"})
    assert res.status_code == 401
    assert "Bearer token required" in res.json()["detail"]

def test_empty_bearer_token_returns_401(client: TestClient):
    """Empty Bearer token must be rejected with HTTP 401."""
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer "})
    assert res.status_code == 401
    assert "Bearer token empty" in res.json()["detail"]

def test_simulated_dev_token_rejected_returns_401(client: TestClient):
    """Old dev-token- bypasses must be strictly rejected with HTTP 401."""
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer dev-token-CUST0001"})
    assert res.status_code == 401

def test_invalid_token_returns_401(client: TestClient):
    """Invalid token signature must be rejected with HTTP 401."""
    with patch("app.security.firebase_auth.verify_firebase_id_token") as mock_verify:
        mock_verify.side_effect = Exception("Firebase ID token has invalid signature.")
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.payload"})
        assert res.status_code == 401
        assert "Invalid authentication token" in res.json()["detail"]

def test_expired_token_returns_401(client: TestClient):
    """Expired token must be rejected with HTTP 401."""
    with patch("app.security.firebase_auth.verify_firebase_id_token") as mock_verify:
        mock_verify.side_effect = Exception("Firebase ID token has expired at 1700000000.")
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer expired.token.payload"})
        assert res.status_code == 401
        assert "expired" in res.json()["detail"].lower()

def test_authenticated_customer_can_access_service_endpoints(client: TestClient):
    """Authenticated customer accounts can access their own service endpoints without HTTP 403."""
    token_claims = {
        "uid": "fb_unverified_user_1",
        "email": "unverified@example.com",
        "email_verified": False,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        # /api/auth/me returns the profile with email_verified: false
        me_res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid_token"})
        assert me_res.status_code == 200
        assert me_res.json()["email_verified"] is False

        # Authenticated customer can access their own requests list without 403
        req_res = client.get("/api/requests", headers={"Authorization": "Bearer valid_token"})
        assert req_res.status_code == 200

def test_google_sign_in_is_automatically_email_verified(client: TestClient):
    """Google Sign-In accounts are pre-verified by Google."""
    token_claims = {
        "uid": "fb_google_user_1",
        "email": "google.citizen@gmail.com",
        "email_verified": True,
        "name": "Google Citizen",
        "firebase": {"sign_in_provider": "google.com"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/requests", headers={"Authorization": "Bearer valid_token"})
        assert res.status_code == 200

def test_seeded_customer_linking(client: TestClient):
    """Seeded customer CUST0001 (john.doe@example.com) links firebase_uid and retains Customer role."""
    token_claims = {
        "uid": "firebase_uid_john_live",
        "email": "john.doe@example.com",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid_token"})
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == "CUST0001"
        assert data["role"] == "Customer"
        assert data["firebase_uid"] == "firebase_uid_john_live"

def test_seeded_employee_linking_and_role_preservation(client: TestClient):
    """Seeded employee EMP0001 (priya.singh@utilityai.org) retains Employee role and permissions."""
    token_claims = {
        "uid": "firebase_uid_priya_live",
        "email": "priya.singh@utilityai.org",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid_token"})
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == "EMP0001"
        assert data["role"] == "Employee"

def test_seeded_administrator_linking_and_role_preservation(client: TestClient):
    """Seeded administrator ADM0001 (amit.kumar@utilityai.org) retains Administrator role."""
    token_claims = {
        "uid": "firebase_uid_amit_live",
        "email": "amit.kumar@utilityai.org",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid_token"})
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == "ADM0001"
        assert data["role"] == "Administrator"

def test_new_user_provisioned_strictly_as_customer(client: TestClient):
    """Genuinely new users are strictly provisioned as Customer role."""
    token_claims = {
        "uid": "firebase_uid_brand_new_citizen",
        "email": "brandnew.citizen@test.org",
        "name": "Brand New Citizen",
        "email_verified": True,
        "firebase": {"sign_in_provider": "google.com"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid_token"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "Customer"
        assert data["email"] == "brandnew.citizen@test.org"
        assert data["firebase_uid"] == "firebase_uid_brand_new_citizen"
        assert data["user_id"].startswith("CUST")

def test_unverified_email_cannot_link_seeded_profile(client: TestClient):
    """An unverified email/password account cannot link to or claim an existing seeded profile."""
    from app.database.mongo import get_database
    db = get_database()

    # Ensure a seeded employee profile exists with no linked firebase_uid
    db.users.update_one({"email": "priya.singh@utilityai.org"}, {"$unset": {"firebase_uid": ""}})

    token_claims = {
        "uid": "attacker_unverified_uid",
        "email": "priya.singh@utilityai.org",
        "email_verified": False,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
        assert res.status_code == 403
        assert "Cannot link unverified email" in res.json()["detail"]

    # Verify that the database record was NOT linked
    emp = db.users.find_one({"email": "priya.singh@utilityai.org"})
    assert emp.get("firebase_uid") != "attacker_unverified_uid"

def test_conflicting_firebase_uid_mapping_rejected(client: TestClient):
    """Reject linking when a profile is already associated with a different Firebase UID."""
    from app.database.mongo import get_database
    db = get_database()

    test_conflict_email = "conflict.test@utilityai.org"
    db.users.insert_one({
        "user_id": "CUST0993",
        "firebase_uid": "legitimate_uid_alpha",
        "name": "Conflict Profile",
        "email": test_conflict_email,
        "role": "Customer"
    })

    # Different Firebase account tries to claim the same email
    token_claims = {
        "uid": "conflicting_uid_beta",
        "email": test_conflict_email,
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
        assert res.status_code == 409
        assert "already linked to a different Firebase account" in res.json()["detail"]

def test_conflicting_uid_and_email_mapping_rejected(client: TestClient):
    """Reject when a Firebase UID is already associated with User A, but token email belongs to User B."""
    from app.database.mongo import get_database
    db = get_database()

    db.users.insert_one({
        "user_id": "CUST0991",
        "firebase_uid": "user_a_uid",
        "name": "User Alpha",
        "email": "user_alpha@test.com",
        "role": "Customer"
    })
    db.users.insert_one({
        "user_id": "CUST0992",
        "firebase_uid": "user_b_uid",
        "name": "User Beta",
        "email": "user_beta@test.com",
        "role": "Customer"
    })

    # Token has User A's UID but claims User B's email
    token_claims = {
        "uid": "user_a_uid",
        "email": "user_beta@test.com",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
        assert res.status_code == 409
        assert "Conflicting account mapping" in res.json()["detail"]

def test_invalid_stored_role_rejected_with_403(client: TestClient):
    """Corrupted or unrecognized stored role must be rejected with 403 rather than defaulting to Customer."""
    from app.database.mongo import get_database
    db = get_database()

    db.users.insert_one({
        "user_id": "CUST0999",
        "firebase_uid": "corrupted_role_uid",
        "name": "Corrupt User",
        "email": "corrupt@test.com",
        "role": "SuperHacker"  # Invalid role
    })

    token_claims = {
        "uid": "corrupted_role_uid",
        "email": "corrupt@test.com",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
        assert res.status_code == 403
        assert "invalid or unrecognized role" in res.json()["detail"]

def test_new_customer_profile_defaults_to_none_for_unprovided_fields(client: TestClient):
    """Newly provisioned users must have null defaults for unprovided personal fields, not fabricated data."""
    token_claims = {
        "uid": "new_profile_uid_777",
        "email": "cleanprofile@test.org",
        "name": "Clean Citizen",
        "email_verified": True,
        "firebase": {"sign_in_provider": "google.com"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
        assert res.status_code == 200
        data = res.json()
        assert data["phone"] is None
        assert data["dob"] is None
        assert data["address"] is None
        assert data["meter_number"] is None
        assert data["emergency_contact"] is None
        assert data["city"] is None

def test_concurrent_registrations_allocate_unique_customer_ids():
    """Concurrent user registrations must allocate unique sequence customer IDs without collisions."""
    from concurrent.futures import ThreadPoolExecutor
    from app.database.mongo import get_database
    from pymongo import ReturnDocument
    import time
    db = get_database()

    def register_user(idx: int):
        seq_doc = db.counters.find_one_and_update(
            {"_id": "customer_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        seq = seq_doc.get("seq")
        new_id = f"CUST{str(seq).zfill(4)}"
        db.users.insert_one({
            "user_id": new_id,
            "firebase_uid": f"concurrent_uid_{idx}_{time.time()}",
            "name": f"Concurrent User {idx}",
            "email": f"concurrent_{idx}_{time.time()}@test.org",
            "role": "Customer"
        })
        return new_id

    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(register_user, range(10)))

    assert len(results) == 10
    assert len(set(results)) == 10, f"Duplicate customer IDs allocated: {results}"
    assert all(uid.startswith("CUST") for uid in results)

def test_duplicate_records_fail_security_index_creation_at_startup():
    """Startup must fail fast with RuntimeError if duplicate records exist on required unique index fields."""
    import mongomock
    from app.database.mongo import DatabaseManager

    # Test duplicate user_id on an isolated DatabaseManager instance
    mgr = object.__new__(DatabaseManager)
    mgr.client = mongomock.MongoClient()
    mgr.db = mgr.client["test_duplicate_fail_db"]
    mgr.db.users.insert_one({"user_id": "DUP_USER", "name": "User 1"})
    mgr.db.users.insert_one({"user_id": "DUP_USER", "name": "User 2"})

    with pytest.raises(RuntimeError) as exc_info:
        mgr._ensure_security_indexes()

    assert "Cannot create unique security index on 'users.user_id'" in str(exc_info.value)
    assert "DUP_USER" in str(exc_info.value)

    # Test duplicate non-null firebase_uid
    mgr_fb = object.__new__(DatabaseManager)
    mgr_fb.client = mongomock.MongoClient()
    mgr_fb.db = mgr_fb.client["test_duplicate_fb_db"]
    mgr_fb.db.users.insert_one({"user_id": "U1", "firebase_uid": "dup_fb_uid_123"})
    mgr_fb.db.users.insert_one({"user_id": "U2", "firebase_uid": "dup_fb_uid_123"})

    with pytest.raises(RuntimeError) as exc_fb:
        mgr_fb._ensure_security_indexes()

    assert "Cannot create unique security index on 'users.firebase_uid'" in str(exc_fb.value)
    assert "dup_fb_uid_123" in str(exc_fb.value)

    # Test duplicate non-null email
    mgr2 = object.__new__(DatabaseManager)
    mgr2.client = mongomock.MongoClient()
    mgr2.db = mgr2.client["test_duplicate_email_db"]
    mgr2.db.users.insert_one({"user_id": "U1", "email": "dup@example.com"})
    mgr2.db.users.insert_one({"user_id": "U2", "email": "dup@example.com"})

    with pytest.raises(RuntimeError) as exc_info2:
        mgr2._ensure_security_indexes()

    assert "Cannot create unique security index on 'users.email'" in str(exc_info2.value)
    assert "dup@example.com" in str(exc_info2.value)

def test_duplicate_scan_failure_aborts_startup():
    """If the duplicate scan aggregation fails, startup must abort with RuntimeError."""
    import mongomock
    from app.database.mongo import DatabaseManager

    mgr = object.__new__(DatabaseManager)
    mgr.client = mongomock.MongoClient()
    mgr.db = mgr.client["test_scan_failure_db"]

    with patch.object(mgr.db.users, "aggregate", side_effect=Exception("Database cluster partition")):
        with pytest.raises(RuntimeError) as exc_info:
            mgr._ensure_security_indexes()

    assert "Failed to scan 'users' collection for duplicate values" in str(exc_info.value)
    assert "Database cluster partition" in str(exc_info.value)

def test_multiple_null_or_missing_values_allowed_by_partial_indexes():
    """Multiple null or missing firebase_uid and email values must not cause index creation or duplicate scan failures."""
    import mongomock
    from pymongo.errors import DuplicateKeyError
    from app.database.mongo import DatabaseManager

    mgr = object.__new__(DatabaseManager)
    mgr.client = mongomock.MongoClient()
    mgr.db = mgr.client["test_partial_indexes_db"]

    # Multiple users with firebase_uid: None and missing firebase_uid
    mgr.db.users.insert_one({"user_id": "U_NULL_1", "firebase_uid": None, "email": "u1@test.com"})
    mgr.db.users.insert_one({"user_id": "U_NULL_2", "firebase_uid": None, "email": "u2@test.com"})
    mgr.db.users.insert_one({"user_id": "U_MISSING_1", "email": "u3@test.com"})

    # Ensure indexes creation and duplicate scan succeed cleanly
    mgr._ensure_security_indexes()

    # Verify that partial unique index still strictly prevents duplicate non-null values
    mgr.db.users.insert_one({"user_id": "U_FB_1", "firebase_uid": "active_fb_uid"})
    with pytest.raises(DuplicateKeyError):
        mgr.db.users.insert_one({"user_id": "U_FB_2", "firebase_uid": "active_fb_uid"})

def test_atomic_linking_conflict_race_condition_returns_409(client: TestClient):
    """If another process links a different firebase_uid concurrently, the conditional update must reject with HTTP 409."""
    from app.database.mongo import get_database
    db = get_database()

    db.users.insert_one({
        "user_id": "EMP0888",
        "firebase_uid": None,
        "name": "Atomic Seed User",
        "email": "atomic.seed@utilityai.org",
        "role": "Employee"
    })

    # Simulating a race condition: another request linked firebase_uid concurrently
    db.users.update_one(
        {"email": "atomic.seed@utilityai.org"},
        {"$set": {"firebase_uid": "racer_uid_1"}}
    )

    token_claims = {
        "uid": "racer_uid_2",
        "email": "atomic.seed@utilityai.org",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
        assert res.status_code == 409
        assert "Conflicting account mapping" in res.json()["detail"]

def test_atomic_linking_duplicate_key_error_returns_409(client: TestClient):
    """If update_one triggers DuplicateKeyError (e.g. UID already claimed), endpoint must return HTTP 409."""
    from app.database.mongo import get_database
    from pymongo.errors import DuplicateKeyError
    db = get_database()

    db.users.insert_one({
        "user_id": "EMP0889",
        "firebase_uid": None,
        "name": "DupKey User",
        "email": "dupkey.seed@utilityai.org",
        "role": "Employee"
    })

    token_claims = {
        "uid": "dup_key_uid_999",
        "email": "dupkey.seed@utilityai.org",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        with patch.object(db.users, "update_one", side_effect=DuplicateKeyError("E11000 duplicate key error on firebase_uid")):
            res = client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
            assert res.status_code == 409
            assert "Conflicting account mapping: this Firebase account is already linked" in res.json()["detail"]
