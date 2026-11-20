import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

def test_customer_cannot_access_admin_users(client: TestClient):
    """Customer role must receive HTTP 403 Forbidden on Administrator-only endpoints."""
    token_claims = {
        "uid": "firebase_uid_cust2_live",
        "email": "customer0002@example.test",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/admin/users", headers={"Authorization": "Bearer valid_token"})
        assert res.status_code == 403
        assert "Access denied by RBAC policy" in res.json()["detail"]

def test_employee_cannot_access_admin_users(client: TestClient):
    """Employee role must receive HTTP 403 Forbidden on Administrator-only endpoints."""
    token_claims = {
        "uid": "firebase_uid_priya_live",
        "email": "priya.singh@utilityai.org",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/admin/users", headers={"Authorization": "Bearer valid_token"})
        assert res.status_code == 403
        assert "Access denied by RBAC policy" in res.json()["detail"]

def test_administrator_can_access_admin_users(client: TestClient):
    """Administrator role must receive HTTP 200 OK on Administrator-only endpoints."""
    token_claims = {
        "uid": "firebase_uid_amit_live",
        "email": "amit.kumar@utilityai.org",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.get("/api/admin/users", headers={"Authorization": "Bearer valid_token"})
        assert res.status_code == 200
        assert "users" in res.json()

def test_customer_cannot_access_other_customers_ticket(client: TestClient):
    """Customer CUST0001 cannot view ticket SR000001 belonging to CUST0010 (data isolation)."""
    token_claims = {
        "uid": "firebase_uid_john_live",
        "email": "john.doe@example.com",  # CUST0001
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        # SR000001 belongs to CUST0010
        res = client.get("/api/requests/SR000001", headers={"Authorization": "Bearer valid_token"})
        assert res.status_code == 403
        assert "RBAC Security Violation" in res.json()["detail"]

def test_customer_cannot_update_technician_dispatch(client: TestClient):
    """Customer cannot dispatch or modify technician telemetry."""
    token_claims = {
        "uid": "firebase_uid_john_live",
        "email": "john.doe@example.com",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"}
    }
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=token_claims):
        res = client.patch(
            "/api/requests/SR000001/dispatch",
            json={"technician_status": "Completed"},
            headers={"Authorization": "Bearer valid_token"}
        )
        assert res.status_code == 403
