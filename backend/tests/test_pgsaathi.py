"""PGSaathi backend API tests - auth, properties, tenants, complaints, mess, reports"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_data(api_client):
    # Register a test owner
    resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": "TEST_owner@pgsaathi.com",
        "name": "Test Owner",
        "password": "Test@1234",
        "role": "owner"
    })
    if resp.status_code == 400:
        # Already registered, login
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_owner@pgsaathi.com",
            "password": "Test@1234"
        })
    assert resp.status_code == 200
    data = resp.json()
    return data

@pytest.fixture(scope="module")
def auth_client(api_client, auth_data):
    api_client.headers.update({"Authorization": f"Bearer {auth_data['token']}"})
    return api_client

# ===== AUTH TESTS =====

class TestAuth:
    def test_register_duplicate_email(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "TEST_owner@pgsaathi.com",
            "name": "Dup",
            "password": "Test@1234",
            "role": "owner"
        })
        assert resp.status_code == 400

    def test_login_invalid(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_owner@pgsaathi.com",
            "password": "wrongpass"
        })
        assert resp.status_code == 401

    def test_login_success(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_owner@pgsaathi.com",
            "password": "Test@1234"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "user" in data

    def test_get_me(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "TEST_owner@pgsaathi.com"

# ===== DASHBOARD TESTS =====

class TestDashboard:
    def test_dashboard_stats(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_properties" in data
        assert "total_tenants" in data

# ===== PROPERTY TESTS =====

@pytest.fixture(scope="module")
def test_property(auth_client):
    resp = auth_client.post(f"{BASE_URL}/api/properties", json={
        "name": "TEST_Property One",
        "address": "123 Test Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "gender_type": "mixed"
    })
    assert resp.status_code == 200
    return resp.json()

class TestProperties:
    def test_get_properties(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/properties")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_property(self, test_property):
        assert test_property["name"] == "TEST_Property One"
        assert "id" in test_property

    def test_get_property(self, auth_client, test_property):
        resp = auth_client.get(f"{BASE_URL}/api/properties/{test_property['id']}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "TEST_Property One"

    def test_create_floor(self, auth_client, test_property):
        resp = auth_client.post(f"{BASE_URL}/api/properties/{test_property['id']}/floors", json={
            "floor_number": 1,
            "name": "Ground Floor"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["floor_number"] == 1
        # Store floor id for further tests
        pytest.floor_id = data["id"]

    def test_create_room(self, auth_client):
        resp = auth_client.post(f"{BASE_URL}/api/floors/{pytest.floor_id}/rooms", json={
            "room_number": "101",
            "room_type": "single",
            "capacity": 1
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["room_number"] == "101"
        pytest.room_id = data["id"]

    def test_create_bed(self, auth_client):
        resp = auth_client.post(f"{BASE_URL}/api/rooms/{pytest.room_id}/beds", json={
            "bed_number": "A",
            "price": 5000
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["bed_number"] == "A"
        pytest.bed_id = data["id"]

# ===== TENANT TESTS =====

@pytest.fixture(scope="module")
def test_tenant(auth_client, test_property):
    resp = auth_client.post(f"{BASE_URL}/api/tenants", json={
        "property_id": test_property["id"],
        "name": "TEST_Tenant One",
        "email": "TEST_tenant@test.com",
        "phone": "9876543210",
        "check_in_date": "2025-01-01",
        "emergency_contact_name": "Contact",
        "emergency_contact_phone": "9876543211",
        "monthly_rent": 5000
    })
    assert resp.status_code == 200
    return resp.json()

class TestTenants:
    def test_get_tenants(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/tenants")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_tenant(self, test_tenant):
        assert test_tenant["name"] == "TEST_Tenant One"
        assert test_tenant["kyc_status"] == "pending"

    def test_get_tenant(self, auth_client, test_tenant):
        resp = auth_client.get(f"{BASE_URL}/api/tenants/{test_tenant['id']}")
        assert resp.status_code == 200

    def test_update_kyc(self, auth_client, test_tenant):
        resp = auth_client.put(f"{BASE_URL}/api/tenants/{test_tenant['id']}/kyc", json={"kyc_status": "verified"})
        assert resp.status_code == 200

# ===== COMPLAINTS TESTS =====

class TestComplaints:
    def test_create_complaint(self, auth_client, test_property, test_tenant):
        resp = auth_client.post(f"{BASE_URL}/api/complaints", json={
            "property_id": test_property["id"],
            "tenant_id": test_tenant["id"],
            "category": "maintenance",
            "title": "TEST_Leaky faucet",
            "description": "Water leaking from kitchen faucet"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "TEST_Leaky faucet"
        pytest.complaint_id = data["id"]

    def test_get_complaints(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/complaints")
        assert resp.status_code == 200

    def test_update_complaint_status(self, auth_client):
        resp = auth_client.put(f"{BASE_URL}/api/complaints/{pytest.complaint_id}", json={"status": "in_progress"})
        assert resp.status_code == 200

# ===== MESS TESTS =====

class TestMess:
    def test_get_mess_config(self, auth_client, test_property):
        resp = auth_client.get(f"{BASE_URL}/api/mess/config/{test_property['id']}")
        # 200 or 404 (not configured yet)
        assert resp.status_code in [200, 404]

    def test_create_mess_config(self, auth_client, test_property):
        resp = auth_client.post(f"{BASE_URL}/api/mess/config", json={
            "property_id": test_property["id"],
            "is_active": True,
            "monthly_charge": 3000,
            "breakfast_time": "8:00 AM",
            "lunch_time": "1:00 PM",
            "dinner_time": "8:00 PM"
        })
        assert resp.status_code == 200

# ===== INVOICE TESTS =====

class TestRent:
    def test_create_invoice(self, auth_client, test_property, test_tenant):
        resp = auth_client.post(f"{BASE_URL}/api/invoices", json={
            "property_id": test_property["id"],
            "tenant_id": test_tenant["id"],
            "billing_month": 1,
            "billing_year": 2025,
            "rent_amount": 5000,
            "total_amount": 5000
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_amount"] == 5000
        pytest.invoice_id = data["id"]

    def test_get_invoices(self, auth_client):
        resp = auth_client.get(f"{BASE_URL}/api/invoices")
        assert resp.status_code == 200

    def test_record_payment(self, auth_client, test_tenant):
        resp = auth_client.post(f"{BASE_URL}/api/payments", json={
            "invoice_id": pytest.invoice_id,
            "tenant_id": test_tenant["id"],
            "amount": 5000,
            "payment_method": "cash",
            "payment_date": "2025-01-15"
        })
        assert resp.status_code == 200
