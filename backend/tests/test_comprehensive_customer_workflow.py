"""
Comprehensive Customer Workflow Test Suite for TechBharat Project C2-22.
Directly verifies all 27 requirements from Section 9:
1-5: Authentication
6-12: Service requests
13-15: Complaints
16-21: AI Assistant
22-27: Profile and Dashboard
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.database.mongo import get_database, DatabaseManager

# Fixture to initialize and seed database once
@pytest.fixture(autouse=True)
def setup_db():
    mgr = DatabaseManager()
    mgr.seed_data()
    yield

# Helper to mock token claims
def mock_token(uid: str, email: str, name: str = "Test User", role: str = "Customer", email_verified: bool = True):
    return {
        "uid": uid,
        "email": email,
        "name": name,
        "email_verified": email_verified,
        "firebase": {"sign_in_provider": "password"}
    }

# =========================================================================
# SECTION 9: 1-5 AUTHENTICATION
# =========================================================================

def test_req_1_valid_firebase_customer_token_accepted(client: TestClient):
    """1. Valid Firebase customer token is accepted."""
    claims = mock_token("fb_valid_cust_1", "valid.cust1@example.com", "Valid Customer 1")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid_token_1"})
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "valid.cust1@example.com"
        assert data["role"] == "Customer"
        assert data["user_id"].startswith("CUST")

def test_req_2_invalid_token_is_rejected(client: TestClient):
    """2. Invalid token is rejected."""
    with patch("app.security.firebase_auth.verify_firebase_id_token", side_effect=Exception("Invalid signature")):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer bad_token"})
        assert res.status_code == 401
        assert "invalid" in res.json()["detail"].lower()

def test_req_3_missing_token_is_rejected(client: TestClient):
    """3. Missing token is rejected."""
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    assert "Missing Authorization header" in res.json()["detail"]

def test_req_4_customer_uid_maps_to_correct_customer(client: TestClient):
    """4. Customer UID maps to the correct application customer."""
    claims = mock_token("fb_fixed_uid_map", "map.customer@example.com", "Mapped Customer")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        res1 = client.get("/api/auth/me", headers={"Authorization": "Bearer token_map"})
        assert res1.status_code == 200
        assigned_user_id = res1.json()["user_id"]

        # Call again with same UID -> must return exact same user_id
        res2 = client.get("/api/auth/me", headers={"Authorization": "Bearer token_map"})
        assert res2.status_code == 200
        assert res2.json()["user_id"] == assigned_user_id

def test_req_5_existing_employee_admin_authentication_continues_working(client: TestClient):
    """5. Existing employee/admin authentication continues working."""
    # Seeded Priya Singh (EMP0001 - Employee)
    emp_claims = mock_token("firebase_uid_priya_live", "priya.singh@utilityai.org", "Priya Singh", email_verified=True)
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=emp_claims):
        emp_res = client.get("/api/auth/me", headers={"Authorization": "Bearer emp_tok"})
        assert emp_res.status_code == 200
        assert emp_res.json()["user_id"] == "EMP0001"
        assert emp_res.json()["role"] == "Employee"

    # Seeded Amit Kumar (ADM0001 - Administrator)
    adm_claims = mock_token("firebase_uid_amit_live", "amit.kumar@utilityai.org", "Amit Kumar", email_verified=True)
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=adm_claims):
        adm_res = client.get("/api/auth/me", headers={"Authorization": "Bearer adm_tok"})
        assert adm_res.status_code == 200
        assert adm_res.json()["user_id"] == "ADM0001"
        assert adm_res.json()["role"] == "Administrator"

# =========================================================================
# SECTION 9: 6-12 SERVICE REQUESTS
# =========================================================================

def test_req_6_7_8_customer_can_create_request_with_valid_id_and_ownership(client: TestClient):
    """
    6. Customer can create a service request.
    7. A valid request ID is generated.
    8. The request is associated with the authenticated customer.
    """
    claims = mock_token("fb_sr_creator_1", "sr.creator@example.com", "SR Creator")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        # 1. Get user profile
        me = client.get("/api/auth/me", headers={"Authorization": "Bearer sr_tok"}).json()
        cust_id = me["user_id"]

        # 2. Create service request
        payload = {
            "utility": "Electricity",
            "request_type": "New Connection",
            "priority": "High",
            "service_location": "Municipal Ward 4, Tech Zone",
            "description": "Urgent power meter installation required for new residence.",
            "latitude": 17.4482,
            "longitude": 78.3845
        }
        res = client.post("/api/requests", json=payload, headers={"Authorization": "Bearer sr_tok"})
        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        req_id = data["request_id"]
        assert req_id.startswith("SR")

        # 3. Verify request is persisted and associated with authenticated customer
        db = get_database()
        doc = db.service_requests.find_one({"request_id": req_id})
        assert doc is not None
        assert doc["customer_id"] == cust_id
        assert doc["utility"] == "Electricity"
        assert doc["status"] == "Submitted"

def test_req_9_customer_can_retrieve_own_request(client: TestClient):
    """9. Customer can retrieve their own request."""
    claims = mock_token("fb_sr_retriever", "sr.retriever@example.com", "SR Retriever")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        # Create a request
        payload = {
            "utility": "Water",
            "request_type": "Pipeline Inspection",
            "priority": "Medium",
            "description": "Low pressure line check"
        }
        create_res = client.post("/api/requests", json=payload, headers={"Authorization": "Bearer tok"})
        req_id = create_res.json()["request_id"]

        # Retrieve individual request
        get_res = client.get(f"/api/requests/{req_id}", headers={"Authorization": "Bearer tok"})
        assert get_res.status_code == 200
        assert get_res.json()["request_id"] == req_id
        assert get_res.json()["utility"] == "Water"

def test_req_10_customer_cannot_retrieve_another_customers_request(client: TestClient):
    """10. Customer cannot retrieve another customer's request."""
    # SR000110 belongs to CUST0001 (John Doe)
    claims_other = mock_token("fb_attacker_cust", "attacker@example.com", "Attacker Cust")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims_other):
        res = client.get("/api/requests/SR000110", headers={"Authorization": "Bearer tok_att"})
        assert res.status_code == 403
        assert "RBAC Security Violation" in res.json()["detail"]

def test_req_11_customer_cannot_spoof_another_customers_id(client: TestClient):
    """11. Customer cannot spoof another customer's ID."""
    claims = mock_token("fb_spoofer_cust", "spoofer@example.com", "Spoofer Cust")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        me = client.get("/api/auth/me", headers={"Authorization": "Bearer tok_spf"}).json()
        real_user_id = me["user_id"]

        # Attempt to create request on behalf of John Doe (CUST0001)
        payload = {
            "customer_id": "CUST0001",
            "utility": "Gas",
            "request_type": "Leakage Repair",
            "description": "Spoofed ticket test"
        }
        res = client.post("/api/requests", json=payload, headers={"Authorization": "Bearer tok_spf"})
        assert res.status_code == 201
        created_id = res.json()["request_id"]

        # Verify backend enforced caller's actual identity, not CUST0001
        db = get_database()
        doc = db.service_requests.find_one({"request_id": created_id})
        assert doc["customer_id"] == real_user_id
        assert doc["customer_id"] != "CUST0001"

def test_req_12_employee_admin_request_permissions_continue_working(client: TestClient):
    """12. Employee/admin request permissions continue working."""
    emp_claims = mock_token("firebase_uid_priya_live", "priya.singh@utilityai.org", "Priya Singh", email_verified=True)
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=emp_claims):
        # Employee can view SR000110 even though it belongs to CUST0001
        res = client.get("/api/requests/SR000110", headers={"Authorization": "Bearer emp_tok"})
        assert res.status_code == 200
        assert res.json()["request_id"] == "SR000110"

# =========================================================================
# SECTION 9: 13-15 COMPLAINTS
# =========================================================================

def test_req_13_14_customer_can_create_and_retrieve_own_complaints(client: TestClient):
    """
    13. Customer can create a complaint.
    14. Customer can retrieve their own complaints.
    """
    claims = mock_token("fb_cmp_user_1", "cmp.user@example.com", "Complaint User")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        # 1. Create complaint
        payload = {
            "utility": "Electricity",
            "category": "Billing Dispute",
            "priority": "Medium",
            "description": "Charged tariff slab 3 instead of residential slab 1"
        }
        res = client.post("/api/complaints", json=payload, headers={"Authorization": "Bearer cmp_tok"})
        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        cmp_id = data["complaint_id"]
        assert cmp_id.startswith("CMP")

        # 2. List own complaints
        list_res = client.get("/api/complaints", headers={"Authorization": "Bearer cmp_tok"})
        assert list_res.status_code == 200
        records = list_res.json()["records"]
        assert any(c["complaint_id"] == cmp_id for c in records)

        # 3. Retrieve single complaint
        get_res = client.get(f"/api/complaints/{cmp_id}", headers={"Authorization": "Bearer cmp_tok"})
        assert get_res.status_code == 200
        assert get_res.json()["complaint_id"] == cmp_id

def test_req_15_customer_cannot_retrieve_another_customers_complaints(client: TestClient):
    """15. Customer cannot retrieve another customer's complaints."""
    # Seed complaint CMP000001 belongs to CUST0001
    claims_other = mock_token("fb_cmp_intruder", "intruder@example.com", "Intruder Cust")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims_other):
        res = client.get("/api/complaints/CMP000001", headers={"Authorization": "Bearer int_tok"})
        assert res.status_code == 403
        assert "RBAC Security Violation" in res.json()["detail"]

# =========================================================================
# SECTION 9: 16-21 AI ASSISTANT
# =========================================================================

def test_req_16_customer_can_ask_general_utility_question(client: TestClient):
    """16. Customer can ask a general utility question."""
    claims = mock_token("fb_chat_cust_1", "chat.cust1@example.com", "Chat Cust 1")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        payload = {"message": "How do I file a utility complaint or grievance?"}
        res = client.post("/api/chat", json=payload, headers={"Authorization": "Bearer chat_tok"})
        assert res.status_code == 200
        data = res.json()
        assert "reply" in data
        assert "file" in data["reply"].lower() or "complaint" in data["reply"].lower()
        assert data["security_alert"] is False

def test_req_17_customer_can_retrieve_own_request_status_in_chat(client: TestClient):
    """17. Customer can retrieve their own service request status."""
    # Test with CUST0001 (John Doe), who owns SR000110
    claims_john = mock_token("firebase_uid_john_live", "john.doe@example.com", "John Doe", email_verified=True)
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims_john):
        payload = {"message": "Check my service request status (SR000110)"}
        res = client.post("/api/chat", json=payload, headers={"Authorization": "Bearer john_tok"})
        assert res.status_code == 200
        data = res.json()
        assert "SR000110" in data["reply"]
        assert data["security_alert"] is False
        assert data["intent"] == "SERVICE_REQUEST_LOOKUP"

def test_req_18_customer_can_retrieve_own_complaint_information_in_chat(client: TestClient):
    """18. Customer can retrieve their own complaint information."""
    # CUST0001 owns CMP000097
    claims_john = mock_token("firebase_uid_john_live", "john.doe@example.com", "John Doe", email_verified=True)
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims_john):
        payload = {"message": "What is the status of my complaint CMP000097?"}
        res = client.post("/api/chat", json=payload, headers={"Authorization": "Bearer john_tok"})
        assert res.status_code == 200
        data = res.json()
        assert "CMP000097" in data["reply"]
        assert data["security_alert"] is False

def test_req_19_customer_cannot_retrieve_another_customers_information_in_chat(client: TestClient):
    """19. Customer cannot retrieve another customer's information."""
    # Another customer queries SR000110 belonging to CUST0001
    claims_other = mock_token("fb_other_cust_99", "other99@example.com", "Other Cust 99")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims_other):
        payload = {"message": "Check my service request status (SR000110)"}
        res = client.post("/api/chat", json=payload, headers={"Authorization": "Bearer other_tok"})
        assert res.status_code == 200
        data = res.json()
        assert data["security_alert"] is True
        assert "Access Restricted by RBAC" in data["reply"]
        assert "SR000110" in data["reply"]

def test_req_20_customer_cannot_access_staff_only_operational_summaries(client: TestClient):
    """20. Customer cannot access staff-only operational summaries."""
    claims = mock_token("fb_citizen_user", "citizen@example.com", "Citizen User")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        # 1. Direct REST endpoint gives strict 403 Forbidden
        res_api = client.post("/api/operations/summarize", json={"role": "Employee"}, headers={"Authorization": "Bearer tok"})
        assert res_api.status_code == 403

        # 2. In chat, AI assistant restricts operational telemetry with security alert
        res_chat = client.post("/api/chat", json={"message": "Summarize today's operations"}, headers={"Authorization": "Bearer tok"})
        assert res_chat.status_code == 200
        data = res_chat.json()
        assert data["security_alert"] is True
        assert "Access Restricted by RBAC" in data["reply"]
        assert "restricted to **Utility Employees**" in data["reply"]

def test_req_21_authorized_employees_admins_can_use_permitted_staff_functionality(client: TestClient):
    """21. Authorized employees/admins can use permitted staff functionality."""
    emp_claims = mock_token("firebase_uid_priya_live", "priya.singh@utilityai.org", "Priya Singh", email_verified=True)
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=emp_claims):
        # 1. Staff chat query returns full operational telemetry summary
        res_chat = client.post("/api/chat", json={"message": "Summarize today's operations"}, headers={"Authorization": "Bearer emp_tok"})
        assert res_chat.status_code == 200
        data = res_chat.json()
        assert data["intent"] == "EMPLOYEE_OPS_SUMMARY"
        assert "Daily Operational Telemetry Summary" in data["reply"]
        assert data["security_alert"] is False

        # 2. Staff REST operations summary returns 200
        res_api = client.post("/api/operations/summarize", json={"role": "Employee"}, headers={"Authorization": "Bearer emp_tok"})
        assert res_api.status_code == 200

# =========================================================================
# SECTION 9: 22-27 PROFILE AND DASHBOARD
# =========================================================================

def test_req_22_23_new_customer_profile_preserves_registration_info_no_fake_defaults(client: TestClient):
    """
    22. New customer profile contains no fabricated personal information.
    23. Registration name and email are preserved.
    """
    claims = mock_token("fb_fresh_citizen", "victorkomal.2@gmail.com", "Victor Komal")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer fresh_tok"})
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Victor Komal"
        assert data["email"] == "victorkomal.2@gmail.com"
        assert data["phone"] is None
        assert data["emergency_contact"] is None
        assert data["meter_number"] is None
        assert data["address"] is None
        assert data["dob"] is None

def test_req_24_optional_profile_fields_can_remain_empty(client: TestClient):
    """24. Optional profile fields can remain empty."""
    claims = mock_token("fb_partial_update", "partial@example.com", "Partial User")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        # Partial update with only preferred_language
        update_res = client.put("/api/auth/profile", json={"preferred_language": "Telugu"}, headers={"Authorization": "Bearer part_tok"})
        assert update_res.status_code == 200

        me_res = client.get("/api/auth/me", headers={"Authorization": "Bearer part_tok"})
        assert me_res.status_code == 200
        data = me_res.json()
        assert data["preferred_language"] == "Telugu"
        assert data["phone"] is None
        assert data["emergency_contact"] is None

def test_req_25_26_new_customer_dashboard_zero_records_then_appears_after_creation(client: TestClient):
    """
    25. New customer dashboard shows zero requests and complaints.
    26. Real requests and complaints appear after creation.
    """
    claims = mock_token("fb_dash_tester", "dash.tester@example.com", "Dashboard Tester")
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=claims):
        # 1. Initial empty dashboard state
        reqs_init = client.get("/api/requests", headers={"Authorization": "Bearer dash_tok"}).json()
        cmps_init = client.get("/api/complaints", headers={"Authorization": "Bearer dash_tok"}).json()
        assert reqs_init["total"] == 0
        assert len(reqs_init["records"]) == 0
        assert cmps_init["total"] == 0
        assert len(cmps_init["records"]) == 0

        # AI Assistant also reports 0 requests cleanly without fake SR10245 fallback
        chat_reqs = client.post("/api/chat", json={"message": "track my request"}, headers={"Authorization": "Bearer dash_tok"}).json()
        assert "no active service requests registered" in chat_reqs["reply"]
        assert "SR10245" not in chat_reqs["reply"]

        # 2. Create one real request and one real complaint
        client.post("/api/requests", json={
            "utility": "Electricity",
            "request_type": "New Meter",
            "description": "Real new connection"
        }, headers={"Authorization": "Bearer dash_tok"})

        client.post("/api/complaints", json={
            "utility": "Electricity",
            "category": "Voltage Fluctuation",
            "description": "Real complaint"
        }, headers={"Authorization": "Bearer dash_tok"})

        # 3. Post-creation dashboard state
        reqs_after = client.get("/api/requests", headers={"Authorization": "Bearer dash_tok"}).json()
        cmps_after = client.get("/api/complaints", headers={"Authorization": "Bearer dash_tok"}).json()
        assert reqs_after["total"] == 1
        assert len(reqs_after["records"]) == 1
        assert cmps_after["total"] == 1
        assert len(cmps_after["records"]) == 1

def test_req_27_existing_demo_accounts_continue_functioning(client: TestClient):
    """27. Existing demo accounts continue functioning."""
    # 1. John Doe (Customer - CUST0001)
    john_claims = mock_token("firebase_uid_john_live", "john.doe@example.com", "John Doe", email_verified=True)
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=john_claims):
        john_me = client.get("/api/auth/me", headers={"Authorization": "Bearer j_tok"}).json()
        assert john_me["user_id"] == "CUST0001"
        assert john_me["role"] == "Customer"
        john_reqs = client.get("/api/requests", headers={"Authorization": "Bearer j_tok"}).json()
        assert john_reqs["total"] > 0

    # 2. Priya Singh (Employee - EMP0001)
    priya_claims = mock_token("firebase_uid_priya_live", "priya.singh@utilityai.org", "Priya Singh", email_verified=True)
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=priya_claims):
        priya_me = client.get("/api/auth/me", headers={"Authorization": "Bearer p_tok"}).json()
        assert priya_me["user_id"] == "EMP0001"
        assert priya_me["role"] == "Employee"

    # 3. Amit Kumar (Administrator - ADM0001)
    amit_claims = mock_token("firebase_uid_amit_live", "amit.kumar@utilityai.org", "Amit Kumar", email_verified=True)
    with patch("app.security.firebase_auth.verify_firebase_id_token", return_value=amit_claims):
        amit_me = client.get("/api/auth/me", headers={"Authorization": "Bearer a_tok"}).json()
        assert amit_me["user_id"] == "ADM0001"
        assert amit_me["role"] == "Administrator"
        adm_users = client.get("/api/admin/users", headers={"Authorization": "Bearer a_tok"})
        assert adm_users.status_code == 200
