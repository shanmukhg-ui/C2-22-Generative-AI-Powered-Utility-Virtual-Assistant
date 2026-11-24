import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.schemas.settings import UserPreferencesSchema
from app.services.settings_service import SettingsService
from app.database.mongo import get_database

def test_settings_schema_phone_default_is_empty():
    """Verify that UserPreferencesSchema defaults phone to empty string."""
    prefs = UserPreferencesSchema()
    assert prefs.phone == ""
    assert prefs.phone != "+91 98765 43210"

def test_settings_service_user_initialization_has_empty_phone():
    """Verify SettingsService initializes new user preferences with empty phone."""
    user_id = "TEST_USER_EMPTY_PHONE_01"
    prefs = SettingsService.get_user_settings(user_id)
    assert prefs["phone"] == ""
    assert prefs["phone"] != "+91 98765 43210"

def test_settings_service_preserves_existing_phone():
    """Updating unrelated preferences must not overwrite a customer's phone number."""
    user_id = "TEST_USER_PRESERVE_PHONE_02"
    # First set phone
    SettingsService.update_user_settings(user_id, {"phone": "+91 99999 11111"})
    # Now update theme only
    updated = SettingsService.update_user_settings(user_id, {"theme": "dark"})
    assert updated["theme"] == "dark"
    assert updated["phone"] == "+91 99999 11111"

def test_customer_cannot_view_other_customer_service_requests(client: TestClient):
    """Customer A and Customer B have isolated service requests."""
    db = get_database()
    token_claims_a = {
        "uid": "firebase_customer_a_uid_iso",
        "email": "customer_a_iso@example.com",
        "name": "Customer A",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    token_claims_b = {
        "uid": "firebase_customer_b_uid_iso",
        "email": "customer_b_iso@example.com",
        "name": "Customer B",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }

    # 1. Customer A creates a request
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims_a):
        create_res = client.post(
            "/api/requests",
            headers={"Authorization": "Bearer token_a"},
            json={
                "utility": "Electricity",
                "request_type": "New Connection",
                "priority": "High",
                "description": "Urgent power meter connection for Customer A"
            }
        )
        assert create_res.status_code == 201
        created_data = create_res.json()
        req_id = created_data["request_id"]

        # Customer A queries their requests -> should see it
        list_a = client.get("/api/requests", headers={"Authorization": "Bearer token_a"})
        assert list_a.status_code == 200
        req_ids_a = [r["request_id"] for r in list_a.json()["records"]]
        assert req_id in req_ids_a

    # 2. Customer B queries /api/requests -> must NOT see Customer A's request
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims_b):
        list_b = client.get("/api/requests", headers={"Authorization": "Bearer token_b"})
        assert list_b.status_code == 200
        req_ids_b = [r["request_id"] for r in list_b.json()["records"]]
        assert req_id not in req_ids_b

        # 3. Customer B attempts direct GET on Customer A's ticket -> must be 403 Forbidden
        direct_res = client.get(f"/api/requests/{req_id}", headers={"Authorization": "Bearer token_b"})
        assert direct_res.status_code == 403
        assert "cannot access records" in direct_res.json()["detail"] or "RBAC" in direct_res.json()["detail"]

def test_customer_cannot_spoof_customer_id_on_create(client: TestClient):
    """When a customer submits a request with someone else's customer_id, it is overridden."""
    db = get_database()
    token_claims = {
        "uid": "firebase_customer_spoof_uid",
        "email": "spoof.test@example.com",
        "name": "Spoof Tester",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        # Attempt to create ticket claiming to be CUST0001 (John Doe)
        res = client.post(
            "/api/requests",
            headers={"Authorization": "Bearer valid_token"},
            json={
                "customer_id": "CUST0001",
                "utility": "Electricity",
                "request_type": "New Connection",
                "priority": "Medium",
                "description": "Spoof test ticket"
            }
        )
        assert res.status_code == 201
        req_id = res.json()["request_id"]
        doc = db.service_requests.find_one({"request_id": req_id})
        assert doc is not None
        assigned_id = doc["customer_id"]
        # The assigned customer_id must NOT be CUST0001; it must be the authenticated user's ID
        assert assigned_id != "CUST0001"
        assert assigned_id.startswith("CUST")

def test_customer_cannot_view_other_customer_complaints(client: TestClient):
    """Complaints list is strictly scoped to the authenticated customer."""
    token_claims_a = {
        "uid": "firebase_complaint_user_a_iso",
        "email": "complaint_a_iso@example.com",
        "name": "User A Complaints",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    token_claims_b = {
        "uid": "firebase_complaint_user_b_iso",
        "email": "complaint_b_iso@example.com",
        "name": "User B Complaints",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }

    # User A creates a complaint
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims_a):
        create_res = client.post(
            "/api/complaints",
            headers={"Authorization": "Bearer token_a"},
            json={
                "utility": "Electricity",
                "category": "Billing Dispute",
                "priority": "Medium",
                "description": "Excessive bill received for October"
            }
        )
        assert create_res.status_code == 201
        complaint_id = create_res.json()["complaint_id"]

    # User B lists complaints -> must NOT see User A's complaint
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims_b):
        list_b = client.get("/api/complaints", headers={"Authorization": "Bearer token_b"})
        assert list_b.status_code == 200
        comp_ids_b = [c["complaint_id"] for c in list_b.json()["records"]]
        assert complaint_id not in comp_ids_b

def test_demo_personas_and_seeded_records_preserved(client: TestClient):
    """Seeded demo personas John Doe, Priya Singh, and Amit Kumar remain intact and functional."""
    demo_accounts = [
        {"email": "john.doe@example.com", "expected_role": "Customer", "expected_user_id": "CUST0001", "uid": "firebase_uid_john_live"},
        {"email": "priya.singh@utilityai.org", "expected_role": "Employee", "expected_user_id": "EMP0001", "uid": "firebase_uid_priya_live"},
        {"email": "amit.kumar@utilityai.org", "expected_role": "Administrator", "expected_user_id": "ADM0001", "uid": "firebase_uid_amit_live"},
    ]

    for demo in demo_accounts:
        token_claims = {
            "uid": demo["uid"],
            "email": demo["email"],
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"}
        }
        with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
            res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid_token"})
            assert res.status_code == 200
            data = res.json()
            assert data["email"] == demo["email"]
            assert data["role"] == demo["expected_role"]
            assert data["user_id"] == demo["expected_user_id"]
