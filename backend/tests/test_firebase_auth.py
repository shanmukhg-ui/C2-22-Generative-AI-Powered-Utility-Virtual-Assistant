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

def test_unverified_email_blocked_from_protected_service(client: TestClient):
    """Unverified email/password accounts must be blocked from protected service endpoints."""
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

        # Protected operational endpoints reject with 403 Forbidden
        req_res = client.get("/api/requests", headers={"Authorization": "Bearer valid_token"})
        assert req_res.status_code == 403
        assert "Email address must be verified" in req_res.json()["detail"]

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
