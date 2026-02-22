"""PGSaathi backend API tests - auth, properties, tenants, complaints, mess, rent"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Module-level state store
state = {}


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_client(api_client):
    # Register or login
    resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": "TEST_owner2@pgsaathi.com",
        "name": "Test Owner",
        "password": "Test@1234",
        "role": "owner"
    })
    if resp.status_code == 400:
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_owner2@pgsaathi.com",
            "password": "Test@1234"
        })
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    data = resp.json()
    state["user"] = data["user"]
    api_client.headers.update({"Authorization": f"Bearer {data['token']}"})
    return api_client


# ===== AUTH TESTS =====

class TestAuth:
    def test_register_duplicate_email(self, api_client):
        # Try to register the same email again
        resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "TEST_owner2@pgsaathi.com",
            "name": "Dup",
            "password": "Test@1234",
            "role": "owner"
        })
        assert resp.status_code == 400, f"Expected 400 for duplicate email, got {resp.status_code}: {resp.text}"

    def test_login_invalid(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_owner2@pgsaathi.com",
            "password": "wrongpass"
        })
        assert resp.status_code == 401

    def test_login_success(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_owner2@pgsaathi.com",
            "password": "Test@1234"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["email"] == "TEST_owner2@pgsaathi.com"

    def test_get_me(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == "TEST_owner2@pgsaathi.com"

    def test_unauthorized_without_token(self, api_client):
        # Remove auth header temporarily
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        resp = session.get(f"{BASE_URL}/api/properties")
        assert resp.status_code == 401


# ===== DASHBOARD =====

class TestDashboard:
    def test_dashboard_stats(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.json()
        for key in ["total_properties", "total_tenants", "open_complaints"]:
            assert key in data, f"Missing key: {key}"


# ===== PROPERTIES =====

class TestProperties:
    def test_create_property(self, auth_client):
        resp = auth_client.post(f"{BASE_URL}/api/properties", json={
            "name": "TEST_Property Alpha",
            "address": "123 Test Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "gender_type": "boys"
        })
        assert resp.status_code == 200, f"Create property failed: {resp.text}"
        data = resp.json()
        assert data["name"] == "TEST_Property Alpha"
        state["property_id"] = data["id"]

    def test_get_properties(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/properties")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) > 0

    def test_get_property(self, auth_client):
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property created")
        resp = auth_client.get(f"{BASE_URL}/api/properties/{prop_id}")
        assert resp.status_code == 200

    def test_create_floor(self, auth_client):
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property created")
        resp = auth_client.post(f"{BASE_URL}/api/properties/{prop_id}/floors", json={
            "floor_number": 1,
            "name": "Ground Floor"
        })
        assert resp.status_code == 200
        state["floor_id"] = resp.json()["id"]

    def test_create_room(self, auth_client):
        floor_id = state.get("floor_id")
        if not floor_id:
            pytest.skip("No floor created")
        resp = auth_client.post(f"{BASE_URL}/api/floors/{floor_id}/rooms", json={
            "room_number": "101",
            "room_type": "single",
            "capacity": 1
        })
        assert resp.status_code == 200
        state["room_id"] = resp.json()["id"]

    def test_create_bed(self, auth_client):
        room_id = state.get("room_id")
        if not room_id:
            pytest.skip("No room created")
        resp = auth_client.post(f"{BASE_URL}/api/rooms/{room_id}/beds", json={
            "bed_number": "A",
            "price": 5000
        })
        assert resp.status_code == 200
        state["bed_id"] = resp.json()["id"]

    def test_property_stats(self, auth_client):
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property")
        resp = auth_client.get(f"{BASE_URL}/api/properties/{prop_id}/stats")
        assert resp.status_code == 200


# ===== TENANTS =====

class TestTenants:
    def test_create_tenant(self, auth_client):
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property")
        resp = auth_client.post(f"{BASE_URL}/api/tenants", json={
            "property_id": prop_id,
            "name": "TEST_Tenant Raj",
            "email": "TEST_raj@tenant.com",
            "phone": "9876543210",
            "check_in_date": "2025-01-01",
            "emergency_contact_name": "Emergency Contact",
            "emergency_contact_phone": "9876543211",
            "monthly_rent": 5000
        })
        assert resp.status_code == 200, f"Create tenant failed: {resp.text}"
        data = resp.json()
        assert data["name"] == "TEST_Tenant Raj"
        assert data["kyc_status"] == "pending"
        state["tenant_id"] = data["id"]

    def test_get_tenants(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/tenants")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_tenant(self, auth_client):
        t_id = state.get("tenant_id")
        if not t_id:
            pytest.skip("No tenant")
        resp = auth_client.get(f"{BASE_URL}/api/tenants/{t_id}")
        assert resp.status_code == 200

    def test_update_kyc(self, auth_client):
        t_id = state.get("tenant_id")
        if not t_id:
            pytest.skip("No tenant")
        resp = auth_client.put(f"{BASE_URL}/api/tenants/{t_id}/kyc", json={"kyc_status": "verified"})
        assert resp.status_code == 200

    def test_allocate_bed(self, auth_client):
        t_id = state.get("tenant_id")
        bed_id = state.get("bed_id")
        room_id = state.get("room_id")
        if not all([t_id, bed_id, room_id]):
            pytest.skip("Missing required IDs")
        resp = auth_client.post(f"{BASE_URL}/api/tenants/{t_id}/allocate-bed", json={
            "bed_id": bed_id,
            "room_id": room_id
        })
        assert resp.status_code == 200


# ===== COMPLAINTS =====

class TestComplaints:
    def test_create_complaint(self, auth_client):
        prop_id = state.get("property_id")
        t_id = state.get("tenant_id")
        if not all([prop_id, t_id]):
            pytest.skip("Missing IDs")
        resp = auth_client.post(f"{BASE_URL}/api/complaints", json={
            "property_id": prop_id,
            "tenant_id": t_id,
            "category": "plumbing",
            "title": "TEST_Leaky faucet",
            "description": "Water leaking"
        })
        assert resp.status_code == 200
        state["complaint_id"] = resp.json()["id"]

    def test_get_complaints(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/complaints")
        assert resp.status_code == 200

    def test_update_complaint_status(self, auth_client):
        c_id = state.get("complaint_id")
        if not c_id:
            pytest.skip("No complaint")
        resp = auth_client.put(f"{BASE_URL}/api/complaints/{c_id}", json={"status": "in_progress"})
        assert resp.status_code == 200


# ===== MESS =====

class TestMess:
    def test_create_mess_config(self, auth_client):
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property")
        resp = auth_client.post(f"{BASE_URL}/api/mess/config", json={
            "property_id": prop_id,
            "monthly_amount": 3000,
            "meal_types": ["breakfast", "dinner"],
            "veg_nonveg": "veg",
            "tracking_mode": "fixed"
        })
        assert resp.status_code in [200, 201], f"Mess config failed: {resp.text}"
        state["mess_config_id"] = resp.json().get("id")

    def test_get_mess_config(self, auth_client):
        prop_id = state.get("property_id")
        if not prop_id:
            pytest.skip("No property")
        resp = auth_client.get(f"{BASE_URL}/api/mess/config?property_id={prop_id}")
        assert resp.status_code == 200


# ===== RENT / INVOICES =====

class TestRent:
    def test_create_invoice(self, auth_client):
        prop_id = state.get("property_id")
        t_id = state.get("tenant_id")
        if not all([prop_id, t_id]):
            pytest.skip("Missing IDs")
        resp = auth_client.post(f"{BASE_URL}/api/invoices", json={
            "property_id": prop_id,
            "tenant_id": t_id,
            "billing_month": 1,
            "billing_year": 2025,
            "rent_amount": 5000,
            "total_amount": 5000
        })
        assert resp.status_code == 200, f"Create invoice failed: {resp.text}"
        state["invoice_id"] = resp.json()["id"]

    def test_get_invoices(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/invoices")
        assert resp.status_code == 200

    def test_record_payment(self, auth_client):
        inv_id = state.get("invoice_id")
        t_id = state.get("tenant_id")
        if not all([inv_id, t_id]):
            pytest.skip("Missing IDs")
        resp = auth_client.post(f"{BASE_URL}/api/payments", json={
            "invoice_id": inv_id,
            "tenant_id": t_id,
            "property_id": state.get("property_id"),
            "amount": 5000,
            "payment_mode": "cash",
            "payment_date": "2025-01-15"
        })
        assert resp.status_code == 200
