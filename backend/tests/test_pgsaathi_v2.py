"""PGSaathi backend API tests - v2: Extended tests for all new features
Covers: auth, properties, tenants, KYC, bed switch, checkout, invoices, bulk invoice, 
prorated rent, PDF gen, payments, complaints, notices, housekeeping, notifications, 
users, tenant-portal, password reset
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Module-level state store
state = {}


@pytest.fixture(scope="module")
def api_client():
    """Unauthenticated API client"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_client(api_client):
    """Authenticated API client as owner"""
    # Try to register, fallback to login if exists
    resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": "TEST_owner_v2@pgsaathi.com",
        "name": "Test Owner V2",
        "password": "Test@1234",
        "role": "owner"
    })
    if resp.status_code == 400:  # Already exists
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_owner_v2@pgsaathi.com",
            "password": "Test@1234"
        })
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    data = resp.json()
    state["user"] = data["user"]
    state["token"] = data["token"]
    api_client.headers.update({"Authorization": f"Bearer {data['token']}"})
    return api_client


# ===== AUTH TESTS =====

class TestAuth:
    """Authentication tests"""
    
    def test_register_owner(self, api_client):
        """Test owner registration"""
        unique_email = f"TEST_regowner_{uuid.uuid4().hex[:6]}@test.com"
        resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "New Owner",
            "password": "Test@1234",
            "role": "owner"
        })
        assert resp.status_code == 200, f"Register failed: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["role"] == "owner"

    def test_login_success(self, auth_client):
        """Test successful login - auth_client fixture already logs in"""
        # auth_client fixture handles login, verify we have a token
        assert state.get("token") is not None
        assert state.get("user") is not None
        assert state["user"]["email"] == "TEST_owner_v2@pgsaathi.com"

    def test_login_invalid_password(self, api_client):
        """Test login with wrong password"""
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_owner_v2@pgsaathi.com",
            "password": "wrongpassword"
        })
        assert resp.status_code == 401

    def test_auth_protected_without_token(self, api_client):
        """Test protected routes return 401/403 without token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        resp = session.get(f"{BASE_URL}/api/properties")
        assert resp.status_code in [401, 403]

    def test_get_me(self, auth_client):
        """Test /auth/me endpoint"""
        resp = auth_client.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == "TEST_owner_v2@pgsaathi.com"

    def test_password_reset(self, api_client):
        """Test password reset endpoint"""
        # First create a user to reset
        unique_email = f"TEST_resetuser_{uuid.uuid4().hex[:6]}@test.com"
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "Reset User",
            "password": "OldPass123",
            "role": "owner"
        })
        # Reset password
        resp = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "email": unique_email,
            "new_password": "NewPass456"
        })
        assert resp.status_code == 200, f"Password reset failed: {resp.text}"
        # Verify can login with new password
        login_resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "NewPass456"
        })
        assert login_resp.status_code == 200


# ===== DASHBOARD STATS =====

class TestDashboardStats:
    """Dashboard stats endpoint tests"""
    
    def test_dashboard_stats(self, auth_client):
        """Test dashboard stats returns expected fields"""
        resp = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.json()
        required_fields = ["total_properties", "total_beds", "occupied_beds", "available_beds",
                          "total_tenants", "open_complaints", "occupancy_rate",
                          "total_expected_revenue", "total_collected_revenue", "pending_dues"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"


# ===== PROPERTIES HIERARCHY =====

class TestPropertiesHierarchy:
    """Property -> Floor -> Room -> Bed hierarchy tests"""
    
    def test_create_property(self, auth_client):
        """Create property"""
        resp = auth_client.post(f"{BASE_URL}/api/properties", json={
            "name": f"TEST_Property_{uuid.uuid4().hex[:6]}",
            "address": "123 Test Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "gender_type": "boys"
        })
        assert resp.status_code == 200, f"Create property failed: {resp.text}"
        data = resp.json()
        assert "id" in data
        state["property_id"] = data["id"]
        state["property_name"] = data["name"]

    def test_get_properties(self, auth_client):
        """Get all properties"""
        resp = auth_client.get(f"{BASE_URL}/api/properties")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) > 0

    def test_get_single_property(self, auth_client):
        """Get single property by ID"""
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property created")
        resp = auth_client.get(f"{BASE_URL}/api/properties/{prop_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == prop_id

    def test_create_floor(self, auth_client):
        """Create floor under property"""
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property created")
        resp = auth_client.post(f"{BASE_URL}/api/properties/{prop_id}/floors", json={
            "floor_number": 1,
            "name": "Ground Floor"
        })
        assert resp.status_code == 200, f"Create floor failed: {resp.text}"
        data = resp.json()
        assert data["property_id"] == prop_id
        state["floor_id"] = data["id"]

    def test_get_property_floors(self, auth_client):
        """Get floors for a property"""
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property created")
        resp = auth_client.get(f"{BASE_URL}/api/properties/{prop_id}/floors")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_room(self, auth_client):
        """Create room under floor"""
        floor_id = state.get("floor_id")
        if not floor_id:
            pytest.skip("No floor created")
        resp = auth_client.post(f"{BASE_URL}/api/floors/{floor_id}/rooms", json={
            "room_number": "101",
            "room_type": "single",
            "capacity": 2
        })
        assert resp.status_code == 200, f"Create room failed: {resp.text}"
        data = resp.json()
        assert data["floor_id"] == floor_id
        state["room_id"] = data["id"]

    def test_get_floor_rooms(self, auth_client):
        """Get rooms for a floor"""
        floor_id = state.get("floor_id")
        if not floor_id:
            pytest.skip("No floor created")
        resp = auth_client.get(f"{BASE_URL}/api/floors/{floor_id}/rooms")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_bed(self, auth_client):
        """Create bed under room"""
        room_id = state.get("room_id")
        if not room_id:
            pytest.skip("No room created")
        resp = auth_client.post(f"{BASE_URL}/api/rooms/{room_id}/beds", json={
            "bed_number": "A",
            "price": 5000
        })
        assert resp.status_code == 200, f"Create bed failed: {resp.text}"
        data = resp.json()
        assert data["room_id"] == room_id
        assert data["price"] == 5000
        assert data["status"] == "available"
        state["bed_id"] = data["id"]

    def test_create_second_bed(self, auth_client):
        """Create second bed for switch test later"""
        room_id = state.get("room_id")
        if not room_id:
            pytest.skip("No room created")
        resp = auth_client.post(f"{BASE_URL}/api/rooms/{room_id}/beds", json={
            "bed_number": "B",
            "price": 5500
        })
        assert resp.status_code == 200
        state["bed_id_2"] = resp.json()["id"]

    def test_get_room_beds(self, auth_client):
        """Get beds for a room"""
        room_id = state.get("room_id")
        if not room_id:
            pytest.skip("No room created")
        resp = auth_client.get(f"{BASE_URL}/api/rooms/{room_id}/beds")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_property_stats(self, auth_client):
        """Get property stats"""
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property")
        resp = auth_client.get(f"{BASE_URL}/api/properties/{prop_id}/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_beds" in data
        assert "available_beds" in data


# ===== TENANT LIFECYCLE =====

class TestTenantLifecycle:
    """Tenant creation, KYC, bed allocation, switch, checkout"""
    
    def test_create_tenant_with_room_assignment(self, auth_client):
        """Create tenant with bed/room assignment at onboarding"""
        prop_id = state.get("property_id")
        bed_id = state.get("bed_id")
        room_id = state.get("room_id")
        if not all([prop_id, bed_id, room_id]):
            pytest.skip("Missing property/bed/room")
        resp = auth_client.post(f"{BASE_URL}/api/tenants", json={
            "property_id": prop_id,
            "name": f"TEST_Tenant_{uuid.uuid4().hex[:6]}",
            "email": f"TEST_tenant_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "9876543210",
            "check_in_date": "2025-01-15",
            "emergency_contact_name": "Emergency Contact",
            "emergency_contact_phone": "9876543211",
            "monthly_rent": 5000,
            "security_deposit": 10000,
            "bed_id": bed_id,
            "room_id": room_id
        })
        assert resp.status_code == 200, f"Create tenant failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "active"
        assert data["kyc_status"] == "pending"
        assert data["bed_id"] == bed_id
        assert data["room_id"] == room_id
        state["tenant_id"] = data["id"]
        state["tenant_email"] = data["email"]

    def test_get_tenants(self, auth_client):
        """Get all tenants"""
        resp = auth_client.get(f"{BASE_URL}/api/tenants")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_single_tenant(self, auth_client):
        """Get single tenant"""
        t_id = state.get("tenant_id")
        if not t_id:
            pytest.skip("No tenant")
        resp = auth_client.get(f"{BASE_URL}/api/tenants/{t_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == t_id

    def test_get_tenant_detail(self, auth_client):
        """Get tenant detail with all aggregated info"""
        t_id = state.get("tenant_id")
        if not t_id:
            pytest.skip("No tenant")
        resp = auth_client.get(f"{BASE_URL}/api/tenants/{t_id}/detail")
        assert resp.status_code == 200, f"Get tenant detail failed: {resp.text}"
        data = resp.json()
        assert "tenant" in data
        assert "bed_info" in data
        assert "room_info" in data
        assert "property_info" in data
        assert "invoices" in data
        assert "payments" in data
        assert "complaints" in data

    def test_get_kyc_documents_empty(self, auth_client):
        """Get KYC documents - should be empty initially"""
        t_id = state.get("tenant_id")
        if not t_id:
            pytest.skip("No tenant")
        resp = auth_client.get(f"{BASE_URL}/api/tenants/{t_id}/kyc-documents")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_verify_kyc(self, auth_client):
        """Verify KYC status"""
        t_id = state.get("tenant_id")
        if not t_id:
            pytest.skip("No tenant")
        resp = auth_client.put(f"{BASE_URL}/api/tenants/{t_id}/kyc", json={"kyc_status": "verified"})
        assert resp.status_code == 200
        # Verify status changed
        tenant_resp = auth_client.get(f"{BASE_URL}/api/tenants/{t_id}")
        assert tenant_resp.json()["kyc_status"] == "verified"

    def test_reject_kyc(self, auth_client):
        """Reject KYC status"""
        t_id = state.get("tenant_id")
        if not t_id:
            pytest.skip("No tenant")
        resp = auth_client.put(f"{BASE_URL}/api/tenants/{t_id}/kyc", json={"kyc_status": "rejected"})
        assert resp.status_code == 200

    def test_switch_bed(self, auth_client):
        """Switch tenant to another bed"""
        t_id = state.get("tenant_id")
        bed_id_2 = state.get("bed_id_2")
        room_id = state.get("room_id")
        if not all([t_id, bed_id_2, room_id]):
            pytest.skip("Missing tenant/bed")
        resp = auth_client.post(f"{BASE_URL}/api/tenants/{t_id}/switch-bed", json={
            "new_bed_id": bed_id_2,
            "new_room_id": room_id
        })
        assert resp.status_code == 200, f"Switch bed failed: {resp.text}"
        data = resp.json()
        assert data["bed_id"] == bed_id_2


# ===== INVOICES & PAYMENTS =====

class TestInvoicesPayments:
    """Invoice creation, bulk generation, prorated rent, PDF, payments"""
    
    def test_create_invoice(self, auth_client):
        """Create single invoice"""
        prop_id = state.get("property_id")
        t_id = state.get("tenant_id")
        if not all([prop_id, t_id]):
            pytest.skip("Missing IDs")
        resp = auth_client.post(f"{BASE_URL}/api/invoices", json={
            "property_id": prop_id,
            "tenant_id": t_id,
            "billing_month": 1,
            "billing_year": 2026,
            "rent_amount": 5000,
            "food_amount": 0,
            "other_charges": 500,
            "other_charges_desc": "Electricity",
            "due_date": "2026-01-10"
        })
        assert resp.status_code == 200, f"Create invoice failed: {resp.text}"
        data = resp.json()
        assert data["tenant_id"] == t_id
        assert data["total_amount"] == 5500  # 5000 + 500
        assert data["status"] == "pending"
        state["invoice_id"] = data["id"]

    def test_get_invoices(self, auth_client):
        """Get all invoices"""
        resp = auth_client.get(f"{BASE_URL}/api/invoices")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_single_invoice(self, auth_client):
        """Get single invoice"""
        inv_id = state.get("invoice_id")
        if not inv_id:
            pytest.skip("No invoice")
        resp = auth_client.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == inv_id

    def test_bulk_generate_invoices(self, auth_client):
        """Bulk generate invoices for property"""
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property")
        resp = auth_client.post(f"{BASE_URL}/api/invoices/bulk", json={
            "property_id": prop_id,
            "billing_month": 2,
            "billing_year": 2026,
            "include_food": False
        })
        assert resp.status_code == 200, f"Bulk invoice failed: {resp.text}"
        data = resp.json()
        assert "created" in data
        assert "skipped" in data

    def test_prorated_rent_calculation(self, auth_client):
        """Calculate prorated rent"""
        resp = auth_client.post(f"{BASE_URL}/api/invoices/prorate", json={
            "monthly_rent": 6000,
            "join_date": "2026-01-15",
            "billing_month": 1,
            "billing_year": 2026
        })
        assert resp.status_code == 200, f"Prorate calc failed: {resp.text}"
        data = resp.json()
        assert "prorated_rent" in data
        assert "days_stayed" in data
        assert "daily_rate" in data
        # From Jan 15 to Jan 31 = 17 days
        assert data["days_stayed"] == 17

    def test_pdf_invoice_generation(self, auth_client):
        """Generate PDF invoice"""
        inv_id = state.get("invoice_id")
        if not inv_id:
            pytest.skip("No invoice")
        resp = auth_client.get(f"{BASE_URL}/api/invoices/{inv_id}/pdf")
        assert resp.status_code == 200, f"PDF gen failed: {resp.text}"
        assert resp.headers.get("content-type") == "application/pdf"

    def test_record_payment(self, auth_client):
        """Record payment for invoice"""
        inv_id = state.get("invoice_id")
        t_id = state.get("tenant_id")
        prop_id = state.get("property_id")
        if not all([inv_id, t_id, prop_id]):
            pytest.skip("Missing IDs")
        resp = auth_client.post(f"{BASE_URL}/api/payments", json={
            "invoice_id": inv_id,
            "tenant_id": t_id,
            "property_id": prop_id,
            "amount": 2500,
            "payment_mode": "upi",
            "payment_date": "2026-01-05"
        })
        assert resp.status_code == 200, f"Record payment failed: {resp.text}"
        data = resp.json()
        assert data["amount"] == 2500
        state["payment_id"] = data["id"]
        # Verify invoice updated to partial
        inv_resp = auth_client.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert inv_resp.json()["status"] == "partial"
        assert inv_resp.json()["paid_amount"] == 2500

    def test_get_payments(self, auth_client):
        """Get all payments"""
        resp = auth_client.get(f"{BASE_URL}/api/payments")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ===== COMPLAINTS =====

class TestComplaints:
    """Complaint CRUD with SLA tracking"""
    
    def test_create_complaint(self, auth_client):
        """Create complaint"""
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property")
        resp = auth_client.post(f"{BASE_URL}/api/complaints", json={
            "property_id": prop_id,
            "category": "plumbing",
            "title": "TEST_Leaky faucet",
            "description": "Water leaking in bathroom",
            "priority": "high"
        })
        assert resp.status_code == 200, f"Create complaint failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "open"
        assert data["priority"] == "high"
        state["complaint_id"] = data["id"]

    def test_get_complaints(self, auth_client):
        """Get all complaints"""
        resp = auth_client.get(f"{BASE_URL}/api/complaints")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_single_complaint(self, auth_client):
        """Get single complaint"""
        c_id = state.get("complaint_id")
        if not c_id:
            pytest.skip("No complaint")
        resp = auth_client.get(f"{BASE_URL}/api/complaints/{c_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == c_id

    def test_update_complaint_status(self, auth_client):
        """Update complaint to in_progress"""
        c_id = state.get("complaint_id")
        if not c_id:
            pytest.skip("No complaint")
        resp = auth_client.put(f"{BASE_URL}/api/complaints/{c_id}", json={
            "status": "in_progress",
            "assigned_to": "John Maintenance"
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

    def test_resolve_complaint(self, auth_client):
        """Resolve complaint"""
        c_id = state.get("complaint_id")
        if not c_id:
            pytest.skip("No complaint")
        resp = auth_client.put(f"{BASE_URL}/api/complaints/{c_id}", json={
            "status": "resolved",
            "resolution_notes": "Fixed the faucet washer"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "resolved"
        assert data["resolved_at"] is not None


# ===== NOTICES =====

class TestNotices:
    """Notice board CRUD"""
    
    def test_create_notice(self, auth_client):
        """Create notice"""
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property")
        resp = auth_client.post(f"{BASE_URL}/api/notices", json={
            "property_id": prop_id,
            "title": "TEST_Water maintenance",
            "content": "Water supply will be interrupted from 10am to 2pm tomorrow",
            "priority": "urgent",
            "is_pinned": True
        })
        assert resp.status_code == 200, f"Create notice failed: {resp.text}"
        data = resp.json()
        assert data["title"] == "TEST_Water maintenance"
        assert data["is_pinned"] == True
        state["notice_id"] = data["id"]

    def test_get_notices(self, auth_client):
        """Get all notices"""
        resp = auth_client.get(f"{BASE_URL}/api/notices")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_update_notice(self, auth_client):
        """Update notice"""
        n_id = state.get("notice_id")
        if not n_id:
            pytest.skip("No notice")
        resp = auth_client.put(f"{BASE_URL}/api/notices/{n_id}", json={
            "content": "Water supply updated - 10am to 12pm only",
            "is_pinned": False
        })
        assert resp.status_code == 200
        assert resp.json()["is_pinned"] == False

    def test_delete_notice(self, auth_client):
        """Delete notice"""
        n_id = state.get("notice_id")
        if not n_id:
            pytest.skip("No notice")
        resp = auth_client.delete(f"{BASE_URL}/api/notices/{n_id}")
        assert resp.status_code == 200


# ===== HOUSEKEEPING =====

class TestHousekeeping:
    """Housekeeping task CRUD"""
    
    def test_create_housekeeping_task(self, auth_client):
        """Create housekeeping task"""
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property")
        resp = auth_client.post(f"{BASE_URL}/api/housekeeping", json={
            "property_id": prop_id,
            "task_type": "cleaning",
            "title": "TEST_Common area cleaning",
            "description": "Deep clean lobby and stairs",
            "assigned_to": "Housekeeping Staff",
            "scheduled_date": "2026-01-20",
            "recurrence": "weekly",
            "priority": "high"
        })
        assert resp.status_code == 200, f"Create task failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "pending"
        assert data["recurrence"] == "weekly"
        state["task_id"] = data["id"]

    def test_get_housekeeping_tasks(self, auth_client):
        """Get all housekeeping tasks"""
        resp = auth_client.get(f"{BASE_URL}/api/housekeeping")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_update_task_status(self, auth_client):
        """Update task to completed"""
        task_id = state.get("task_id")
        if not task_id:
            pytest.skip("No task")
        resp = auth_client.put(f"{BASE_URL}/api/housekeeping/{task_id}", json={
            "status": "completed"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert data["completed_at"] is not None

    def test_delete_task(self, auth_client):
        """Delete housekeeping task"""
        task_id = state.get("task_id")
        if not task_id:
            pytest.skip("No task")
        resp = auth_client.delete(f"{BASE_URL}/api/housekeeping/{task_id}")
        assert resp.status_code == 200


# ===== NOTIFICATIONS =====

class TestNotifications:
    """Notification system tests"""
    
    def test_get_notifications(self, auth_client):
        """Get notifications for current user"""
        resp = auth_client.get(f"{BASE_URL}/api/notifications")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_unread_count(self, auth_client):
        """Get unread notification count"""
        resp = auth_client.get(f"{BASE_URL}/api/notifications/unread-count")
        assert resp.status_code == 200
        assert "count" in resp.json()

    def test_mark_all_read(self, auth_client):
        """Mark all notifications as read"""
        resp = auth_client.put(f"{BASE_URL}/api/notifications/read-all")
        assert resp.status_code == 200


# ===== USER MANAGEMENT =====

class TestUserManagement:
    """User CRUD - owner only"""
    
    def test_get_users(self, auth_client):
        """Get all users (owner only)"""
        resp = auth_client.get(f"{BASE_URL}/api/users")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_user(self, auth_client):
        """Create new user (warden)"""
        unique_email = f"TEST_warden_{uuid.uuid4().hex[:6]}@test.com"
        prop_id = state.get("property_id")
        resp = auth_client.post(f"{BASE_URL}/api/users", json={
            "name": "Test Warden",
            "email": unique_email,
            "password": "Warden@123",
            "role": "warden",
            "property_id": prop_id,
            "phone": "9876543212"
        })
        assert resp.status_code == 200, f"Create user failed: {resp.text}"
        data = resp.json()
        assert data["role"] == "warden"
        assert data["email"] == unique_email
        assert "password_hash" not in data  # Should not expose password hash
        state["warden_user_id"] = data["id"]

    def test_update_user(self, auth_client):
        """Update user"""
        user_id = state.get("warden_user_id")
        if not user_id:
            pytest.skip("No warden user")
        resp = auth_client.put(f"{BASE_URL}/api/users/{user_id}", json={
            "name": "Updated Warden Name",
            "phone": "9876543299"
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Warden Name"

    def test_password_change(self, auth_client):
        """Test password change for current user"""
        resp = auth_client.put(f"{BASE_URL}/api/users/me/password", json={
            "current_password": "Test@1234",
            "new_password": "Test@5678"
        })
        assert resp.status_code == 200
        # Change it back to not break other tests
        auth_client.put(f"{BASE_URL}/api/users/me/password", json={
            "current_password": "Test@5678",
            "new_password": "Test@1234"
        })

    def test_delete_user(self, auth_client):
        """Delete user"""
        user_id = state.get("warden_user_id")
        if not user_id:
            pytest.skip("No warden user")
        resp = auth_client.delete(f"{BASE_URL}/api/users/{user_id}")
        assert resp.status_code == 200


# ===== TENANT PORTAL =====

class TestTenantPortal:
    """Tenant self-service portal endpoints"""
    
    def test_tenant_dashboard(self, auth_client):
        """Test tenant portal dashboard"""
        resp = auth_client.get(f"{BASE_URL}/api/tenant-portal/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        # Should return structure even if user isn't a tenant
        assert "tenant" in data
        assert "pending_dues" in data
        assert "open_complaints" in data

    def test_tenant_invoices(self, auth_client):
        """Test tenant portal invoices"""
        resp = auth_client.get(f"{BASE_URL}/api/tenant-portal/invoices")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_tenant_payments(self, auth_client):
        """Test tenant portal payments"""
        resp = auth_client.get(f"{BASE_URL}/api/tenant-portal/payments")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_tenant_complaints(self, auth_client):
        """Test tenant portal complaints list"""
        resp = auth_client.get(f"{BASE_URL}/api/tenant-portal/complaints")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_tenant_create_complaint(self, auth_client):
        """Test tenant portal create complaint"""
        resp = auth_client.post(f"{BASE_URL}/api/tenant-portal/complaints", json={
            "category": "food",
            "title": "TEST_Food quality issue",
            "description": "Quality has been poor this week",
            "priority": "medium"
        })
        assert resp.status_code == 200, f"Tenant complaint failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "open"

    def test_tenant_notices(self, auth_client):
        """Test tenant portal notices"""
        resp = auth_client.get(f"{BASE_URL}/api/tenant-portal/notices")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_tenant_meal_plan(self, auth_client):
        """Test tenant portal meal plan"""
        resp = auth_client.get(f"{BASE_URL}/api/tenant-portal/meal-plan")
        assert resp.status_code == 200


# ===== TENANT CHECKOUT =====

class TestTenantCheckout:
    """Tenant checkout flow - must be last tenant test"""
    
    def test_checkout_tenant(self, auth_client):
        """Checkout tenant and release bed"""
        t_id = state.get("tenant_id")
        if not t_id:
            pytest.skip("No tenant")
        resp = auth_client.post(f"{BASE_URL}/api/tenants/{t_id}/checkout", json={
            "check_out_date": "2026-01-31"
        })
        assert resp.status_code == 200, f"Checkout failed: {resp.text}"
        data = resp.json()
        assert "settlement" in data
        assert "pending_dues" in data["settlement"]
        assert "security_deposit" in data["settlement"]
        # Verify tenant status
        tenant_resp = auth_client.get(f"{BASE_URL}/api/tenants/{t_id}")
        assert tenant_resp.json()["status"] == "checked_out"
        assert tenant_resp.json()["bed_id"] is None


# ===== CLEANUP =====

class TestCleanup:
    """Cleanup test data - runs last"""
    
    def test_delete_complaint(self, auth_client):
        """Delete test complaint"""
        c_id = state.get("complaint_id")
        if c_id:
            auth_client.delete(f"{BASE_URL}/api/complaints/{c_id}")

    def test_delete_invoice(self, auth_client):
        """Delete test invoice"""
        inv_id = state.get("invoice_id")
        if inv_id:
            auth_client.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_delete_tenant(self, auth_client):
        """Delete test tenant"""
        t_id = state.get("tenant_id")
        if t_id:
            auth_client.delete(f"{BASE_URL}/api/tenants/{t_id}")
