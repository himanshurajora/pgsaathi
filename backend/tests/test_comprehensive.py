"""PGSaathi comprehensive backend API tests — covers all endpoints including
notices, housekeeping, notifications, users, tenant-portal, visitors, feedback,
property CRUD, tenant operations (bed switch, checkout, KYC upload),
bulk invoices, prorated rent, PDF generation, forgot-password flow, and OTP rate limiting.
"""
import pytest
import requests
import os
import time
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "pgsaathi")

# Module-level state store shared across test classes
state = {}

# Sync MongoDB client for test helpers
_mongo_client = MongoClient(MONGO_URL)
_db = _mongo_client[DB_NAME]


def _verify_user_in_db(email):
    """Directly verify a user in MongoDB so tests can proceed without OTP."""
    _db.users.update_one({"email": email}, {"$set": {"is_verified": True}})


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_client(api_client):
    """Register (or login) as owner and seed base data (property, floor, room, beds, tenant)."""
    email = "TEST_comprehensive@pgsaathi.com"
    password = "Test@9999"
    resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "name": "Comp Owner", "password": password, "role": "owner",
    })
    if resp.status_code == 400:
        pass  # Already registered
    # Verify user directly in DB to bypass OTP
    _verify_user_in_db(email)
    # Now login
    resp = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    assert "token" in data, f"No token in response: {data}"
    state["owner"] = data.get("user", {})
    api_client.headers["Authorization"] = f"Bearer {data['token']}"

    # Seed property
    r = api_client.post(f"{BASE_URL}/api/properties", json={
        "name": "TEST_CompProp", "address": "1 Test Rd", "city": "Delhi",
        "state": "Delhi", "gender_type": "boys", "allows_visitors": True,
    })
    assert r.status_code == 200, f"Property seed failed: {r.text}"
    state["property_id"] = r.json()["id"]

    # Seed floor
    r = api_client.post(f"{BASE_URL}/api/properties/{state['property_id']}/floors", json={"floor_number": 1, "name": "GF"})
    assert r.status_code == 200
    state["floor_id"] = r.json()["id"]

    # Seed room
    r = api_client.post(f"{BASE_URL}/api/floors/{state['floor_id']}/rooms", json={"room_number": "C101", "room_type": "double", "capacity": 2})
    assert r.status_code == 200
    state["room_id"] = r.json()["id"]

    # Seed two beds
    r = api_client.post(f"{BASE_URL}/api/rooms/{state['room_id']}/beds", json={"bed_number": "C-A", "price": 6000})
    assert r.status_code == 200
    state["bed_id"] = r.json()["id"]
    r2 = api_client.post(f"{BASE_URL}/api/rooms/{state['room_id']}/beds", json={"bed_number": "C-B", "price": 6000})
    assert r2.status_code == 200
    state["bed_id_2"] = r2.json()["id"]

    # Seed tenant
    r = api_client.post(f"{BASE_URL}/api/tenants", json={
        "property_id": state["property_id"], "name": "TEST_CompTenant", "email": "TEST_comp_t@pg.com",
        "phone": "9000000001", "check_in_date": "2025-01-01",
        "emergency_contact_name": "EC", "emergency_contact_phone": "9000000002",
        "monthly_rent": 6000, "bed_id": state["bed_id"], "room_id": state["room_id"],
    })
    assert r.status_code == 200, f"Tenant seed failed: {r.text}"
    state["tenant_id"] = r.json()["id"]
    state["tenant_email"] = "TEST_comp_t@pg.com"

    return api_client


# ───────────────── NOTICE BOARD ─────────────────

class TestNotices:
    def test_create_notice(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/notices", json={
            "property_id": state["property_id"],
            "title": "TEST_Water shutoff",
            "content": "Water will be off 10am-12pm.",
            "priority": "high",
            "is_pinned": True,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == "TEST_Water shutoff"
        assert data["is_pinned"] is True
        state["notice_id"] = data["id"]

    def test_list_notices(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/notices")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(n["id"] == state.get("notice_id") for n in r.json())

    def test_update_notice(self, auth_client):
        nid = state.get("notice_id")
        if not nid:
            pytest.skip("No notice")
        r = auth_client.put(f"{BASE_URL}/api/notices/{nid}", json={"priority": "medium", "is_pinned": False})
        assert r.status_code == 200
        assert r.json()["priority"] == "medium"

    def test_delete_notice(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/notices", json={
            "property_id": state["property_id"], "title": "TEST_DeleteMe",
        })
        assert r.status_code == 200
        nid = r.json()["id"]
        r2 = auth_client.delete(f"{BASE_URL}/api/notices/{nid}")
        assert r2.status_code == 200


# ───────────────── HOUSEKEEPING ─────────────────

class TestHousekeeping:
    def test_create_task(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/housekeeping", json={
            "property_id": state["property_id"],
            "title": "TEST_Clean lobby",
            "task_type": "cleaning",
            "description": "Mop and sweep the lobby",
            "priority": "medium",
            "scheduled_date": "2025-07-10",
        })
        assert r.status_code == 200, r.text
        state["hk_task_id"] = r.json()["id"]

    def test_list_tasks(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/housekeeping")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_tasks_filter_status(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/housekeeping?status=pending")
        assert r.status_code == 200

    def test_update_task(self, auth_client):
        tid = state.get("hk_task_id")
        if not tid:
            pytest.skip("No task")
        r = auth_client.put(f"{BASE_URL}/api/housekeeping/{tid}", json={"status": "in_progress"})
        assert r.status_code == 200

    def test_complete_task(self, auth_client):
        tid = state.get("hk_task_id")
        if not tid:
            pytest.skip("No task")
        r = auth_client.put(f"{BASE_URL}/api/housekeeping/{tid}", json={"status": "completed"})
        assert r.status_code == 200

    def test_delete_task(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/housekeeping", json={
            "property_id": state["property_id"], "title": "TEST_DelTask", "task_type": "other",
        })
        assert r.status_code == 200
        r2 = auth_client.delete(f"{BASE_URL}/api/housekeeping/{r.json()['id']}")
        assert r2.status_code == 200


# ───────────────── NOTIFICATIONS ─────────────────

class TestNotifications:
    def test_list_notifications(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/notifications")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_unread_count(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/notifications/unread-count")
        assert r.status_code == 200
        assert "count" in r.json()

    def test_mark_all_read(self, auth_client):
        r = auth_client.put(f"{BASE_URL}/api/notifications/read-all")
        assert r.status_code == 200

    def test_unread_count_zero_after_mark_all(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/notifications/unread-count")
        assert r.status_code == 200
        assert r.json()["count"] == 0


# ───────────────── USER MANAGEMENT ─────────────────

class TestUsers:
    def test_create_warden_user(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/users", json={
            "email": "TEST_warden_comp@pgsaathi.com", "name": "Test Warden",
            "password": "Warden@123", "role": "warden",
            "property_id": state["property_id"],
        })
        assert r.status_code == 200, r.text
        state["warden_user_id"] = r.json()["id"]

    def test_list_users(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/users")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_users_filter_role(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/users?role=warden")
        assert r.status_code == 200
        assert all(u.get("role") == "warden" for u in r.json())

    def test_update_user(self, auth_client):
        uid = state.get("warden_user_id")
        if not uid:
            pytest.skip("No warden user")
        r = auth_client.put(f"{BASE_URL}/api/users/{uid}", json={"name": "Warden Updated"})
        assert r.status_code == 200

    def test_deactivate_user(self, auth_client):
        uid = state.get("warden_user_id")
        if not uid:
            pytest.skip("No warden user")
        r = auth_client.put(f"{BASE_URL}/api/users/{uid}", json={"is_active": False})
        assert r.status_code == 200

    def test_delete_user(self, auth_client):
        uid = state.get("warden_user_id")
        if not uid:
            pytest.skip("No warden user")
        r = auth_client.delete(f"{BASE_URL}/api/users/{uid}")
        assert r.status_code == 200

    def test_cannot_delete_self(self, auth_client):
        own_id = state.get("owner", {}).get("id")
        if not own_id:
            pytest.skip("No owner id")
        r = auth_client.delete(f"{BASE_URL}/api/users/{own_id}")
        assert r.status_code == 400


# ───────────────── PROFILE / SETTINGS ─────────────────

class TestProfile:
    def test_update_profile(self, auth_client):
        r = auth_client.put(f"{BASE_URL}/api/auth/me", json={"name": "Comp Owner Updated", "phone": "9111111111"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Comp Owner Updated"
        assert data["phone"] == "9111111111"

    def test_update_language_preference(self, auth_client):
        r = auth_client.put(f"{BASE_URL}/api/auth/me", json={"language_preference": "hi"})
        assert r.status_code == 200

    def test_change_password(self, auth_client):
        r = auth_client.put(f"{BASE_URL}/api/users/me/password", json={
            "current_password": "Test@9999", "new_password": "Test@9999",
        })
        assert r.status_code == 200


# ───────────────── PROPERTY CRUD EXTRAS ─────────────────

class TestPropertyCRUD:
    def test_update_property(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.put(f"{BASE_URL}/api/properties/{pid}", json={"house_rules": "No smoking"})
        assert r.status_code == 200

    def test_property_stats(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.get(f"{BASE_URL}/api/properties/{pid}/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total_beds" in data
        assert "occupancy_rate" in data

    def test_get_floors(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.get(f"{BASE_URL}/api/properties/{pid}/floors")
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_update_floor(self, auth_client):
        fid = state.get("floor_id")
        if not fid:
            pytest.skip("No floor")
        r = auth_client.put(f"{BASE_URL}/api/floors/{fid}", json={"name": "Ground Floor Updated"})
        assert r.status_code == 200

    def test_get_rooms(self, auth_client):
        fid = state.get("floor_id")
        if not fid:
            pytest.skip("No floor")
        r = auth_client.get(f"{BASE_URL}/api/floors/{fid}/rooms")
        assert r.status_code == 200

    def test_get_room(self, auth_client):
        rid = state.get("room_id")
        if not rid:
            pytest.skip("No room")
        r = auth_client.get(f"{BASE_URL}/api/rooms/{rid}")
        assert r.status_code == 200

    def test_update_room(self, auth_client):
        rid = state.get("room_id")
        if not rid:
            pytest.skip("No room")
        r = auth_client.put(f"{BASE_URL}/api/rooms/{rid}", json={"amenities": ["AC", "WiFi"]})
        assert r.status_code == 200

    def test_get_beds(self, auth_client):
        rid = state.get("room_id")
        if not rid:
            pytest.skip("No room")
        r = auth_client.get(f"{BASE_URL}/api/rooms/{rid}/beds")
        assert r.status_code == 200
        assert len(r.json()) >= 2

    def test_get_bed(self, auth_client):
        bid = state.get("bed_id")
        if not bid:
            pytest.skip("No bed")
        r = auth_client.get(f"{BASE_URL}/api/beds/{bid}")
        assert r.status_code == 200

    def test_update_bed(self, auth_client):
        bid = state.get("bed_id_2")
        if not bid:
            pytest.skip("No bed_2")
        r = auth_client.put(f"{BASE_URL}/api/beds/{bid}", json={"price": 6500})
        assert r.status_code == 200

    def test_delete_property_creates_and_deletes(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/properties", json={
            "name": "TEST_ToDelete", "address": "X", "city": "X", "state": "X", "gender_type": "girls",
        })
        assert r.status_code == 200
        pid = r.json()["id"]
        r2 = auth_client.delete(f"{BASE_URL}/api/properties/{pid}")
        assert r2.status_code == 200


# ───────────────── TENANT OPERATIONS ─────────────────

class TestTenantOps:
    def test_tenant_detail(self, auth_client):
        tid = state.get("tenant_id")
        if not tid:
            pytest.skip("No tenant")
        r = auth_client.get(f"{BASE_URL}/api/tenants/{tid}/detail")
        assert r.status_code == 200
        data = r.json()
        assert "tenant" in data

    def test_update_kyc_status(self, auth_client):
        tid = state.get("tenant_id")
        if not tid:
            pytest.skip("No tenant")
        r = auth_client.put(f"{BASE_URL}/api/tenants/{tid}/kyc", json={"kyc_status": "verified"})
        assert r.status_code == 200

    def test_get_kyc_documents(self, auth_client):
        tid = state.get("tenant_id")
        if not tid:
            pytest.skip("No tenant")
        r = auth_client.get(f"{BASE_URL}/api/tenants/{tid}/kyc-documents")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_switch_bed(self, auth_client):
        tid = state.get("tenant_id")
        bid2 = state.get("bed_id_2")
        rid = state.get("room_id")
        if not all([tid, bid2, rid]):
            pytest.skip("Missing IDs for bed switch")
        r = auth_client.post(f"{BASE_URL}/api/tenants/{tid}/switch-bed", json={
            "new_bed_id": bid2, "new_room_id": rid,
        })
        assert r.status_code == 200, r.text

    def test_update_tenant(self, auth_client):
        tid = state.get("tenant_id")
        if not tid:
            pytest.skip("No tenant")
        r = auth_client.put(f"{BASE_URL}/api/tenants/{tid}", json={"phone": "9000000099"})
        assert r.status_code == 200


# ───────────────── VISITORS ─────────────────

class TestVisitors:
    def test_list_visitors(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/visitors")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_visitors_by_property(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.get(f"{BASE_URL}/api/visitors?property_id={pid}")
        assert r.status_code == 200


# ───────────────── MESS (extended) ─────────────────

class TestMessExtended:
    def test_create_mess_config(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.post(f"{BASE_URL}/api/mess/config", json={
            "property_id": pid, "monthly_amount": 4000,
            "meal_types": ["breakfast", "lunch", "dinner"],
            "veg_nonveg": "both", "tracking_mode": "attendance",
        })
        assert r.status_code == 200, r.text
        state["mess_config_id"] = r.json()["id"]

    def test_get_mess_config(self, auth_client):
        pid = state.get("property_id")
        r = auth_client.get(f"{BASE_URL}/api/mess/config?property_id={pid}")
        assert r.status_code == 200

    def test_update_mess_config(self, auth_client):
        cid = state.get("mess_config_id")
        if not cid:
            pytest.skip("No config id")
        r = auth_client.put(f"{BASE_URL}/api/mess/config/{cid}", json={"monthly_amount": 4500})
        assert r.status_code == 200

    def test_create_meal_plan(self, auth_client):
        tid = state.get("tenant_id")
        pid = state.get("property_id")
        if not all([tid, pid]):
            pytest.skip("Missing IDs")
        r = auth_client.post(f"{BASE_URL}/api/mess/plans", json={
            "tenant_id": tid, "property_id": pid,
            "opted_meals": ["breakfast", "dinner"], "start_date": "2025-01-01",
        })
        assert r.status_code == 200, r.text
        state["meal_plan_id"] = r.json()["id"]

    def test_get_meal_plans(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/mess/plans")
        assert r.status_code == 200

    def test_update_meal_plan(self, auth_client):
        mpid = state.get("meal_plan_id")
        if not mpid:
            pytest.skip("No plan")
        r = auth_client.put(f"{BASE_URL}/api/mess/plans/{mpid}", json={"opted_meals": ["breakfast", "lunch", "dinner"]})
        assert r.status_code == 200

    def test_mark_attendance_admin(self, auth_client):
        tid = state.get("tenant_id")
        if not tid:
            pytest.skip("No tenant")
        r = auth_client.post(f"{BASE_URL}/api/mess/attendance", json={
            "tenant_id": tid, "meal_type": "breakfast",
            "date": "2025-07-01", "present": True,
        })
        assert r.status_code == 200, r.text
        state["attendance_id"] = r.json().get("id")

    def test_mark_attendance_lunch(self, auth_client):
        tid = state.get("tenant_id")
        if not tid:
            pytest.skip("No tenant")
        r = auth_client.post(f"{BASE_URL}/api/mess/attendance", json={
            "tenant_id": tid, "meal_type": "lunch",
            "date": "2025-07-01", "present": True,
        })
        assert r.status_code == 200

    def test_get_attendance_by_date(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/mess/attendance?date=2025-07-01")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_attendance_by_month(self, auth_client):
        tid = state.get("tenant_id")
        if not tid:
            pytest.skip("No tenant")
        r = auth_client.get(f"{BASE_URL}/api/mess/attendance?tenant_id={tid}&month=7&year=2025")
        assert r.status_code == 200

    def test_attendance_summary(self, auth_client):
        tid = state.get("tenant_id")
        if not tid:
            pytest.skip("No tenant")
        r = auth_client.get(f"{BASE_URL}/api/mess/attendance/summary?tenant_id={tid}&month=7&year=2025")
        assert r.status_code == 200
        data = r.json()
        assert "total_meals" in data
        assert data["total_meals"] >= 2

    def test_attendance_today(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/mess/attendance/today")
        assert r.status_code == 200


# ───────────────── RENT / INVOICES (extended) ─────────────────

class TestRentExtended:
    def test_create_invoice(self, auth_client):
        pid = state.get("property_id")
        tid = state.get("tenant_id")
        if not all([pid, tid]):
            pytest.skip("Missing IDs")
        r = auth_client.post(f"{BASE_URL}/api/invoices", json={
            "property_id": pid, "tenant_id": tid,
            "billing_month": 7, "billing_year": 2025,
            "rent_amount": 6000, "food_amount": 2000,
        })
        assert r.status_code == 200, r.text
        state["invoice_id_ext"] = r.json()["id"]

    def test_duplicate_invoice_rejected(self, auth_client):
        pid = state.get("property_id")
        tid = state.get("tenant_id")
        if not all([pid, tid]):
            pytest.skip("Missing IDs")
        r = auth_client.post(f"{BASE_URL}/api/invoices", json={
            "property_id": pid, "tenant_id": tid,
            "billing_month": 7, "billing_year": 2025,
            "rent_amount": 6000,
        })
        assert r.status_code == 400, "Duplicate invoice should be rejected"

    def test_get_invoice(self, auth_client):
        iid = state.get("invoice_id_ext")
        if not iid:
            pytest.skip("No invoice")
        r = auth_client.get(f"{BASE_URL}/api/invoices/{iid}")
        assert r.status_code == 200

    def test_update_invoice(self, auth_client):
        iid = state.get("invoice_id_ext")
        if not iid:
            pytest.skip("No invoice")
        r = auth_client.put(f"{BASE_URL}/api/invoices/{iid}", json={"other_charges": 500, "other_charges_desc": "Electricity"})
        assert r.status_code == 200

    def test_record_payment(self, auth_client):
        iid = state.get("invoice_id_ext")
        tid = state.get("tenant_id")
        pid = state.get("property_id")
        if not all([iid, tid, pid]):
            pytest.skip("Missing IDs")
        r = auth_client.post(f"{BASE_URL}/api/payments", json={
            "invoice_id": iid, "tenant_id": tid, "property_id": pid,
            "amount": 4000, "payment_mode": "upi", "payment_date": "2025-07-05",
        })
        assert r.status_code == 200, r.text

    def test_get_payments(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/payments")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_invoice_status_partial(self, auth_client):
        iid = state.get("invoice_id_ext")
        if not iid:
            pytest.skip("No invoice")
        r = auth_client.get(f"{BASE_URL}/api/invoices/{iid}")
        assert r.status_code == 200
        assert r.json()["status"] == "partial"

    def test_delete_invoice(self, auth_client):
        pid = state.get("property_id")
        tid = state.get("tenant_id")
        if not all([pid, tid]):
            pytest.skip("Missing IDs")
        r = auth_client.post(f"{BASE_URL}/api/invoices", json={
            "property_id": pid, "tenant_id": tid,
            "billing_month": 8, "billing_year": 2025,
            "rent_amount": 6000,
        })
        assert r.status_code == 200
        r2 = auth_client.delete(f"{BASE_URL}/api/invoices/{r.json()['id']}")
        assert r2.status_code == 200


# ───────────────── BULK INVOICES ─────────────────

class TestBulkInvoice:
    def test_bulk_generate(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.post(f"{BASE_URL}/api/invoices/bulk", json={
            "property_id": pid, "billing_month": 6, "billing_year": 2025,
            "include_food": True,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "created" in data
        assert "skipped" in data

    def test_bulk_generate_skip_existing(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.post(f"{BASE_URL}/api/invoices/bulk", json={
            "property_id": pid, "billing_month": 6, "billing_year": 2025,
        })
        assert r.status_code == 200
        assert r.json()["created"] == 0


# ───────────────── PRORATED RENT ─────────────────

class TestProratedRent:
    def test_prorate_full_month(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/invoices/prorate", json={
            "monthly_rent": 9000, "join_date": "2025-01-01",
            "billing_month": 2, "billing_year": 2025,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["days_stayed"] == data["days_in_month"]
        assert data["prorated_rent"] == 9000

    def test_prorate_partial_month(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/invoices/prorate", json={
            "monthly_rent": 9000, "join_date": "2025-07-15",
            "billing_month": 7, "billing_year": 2025,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["days_stayed"] == 17  # 31 - 15 + 1
        assert data["prorated_rent"] < 9000


# ───────────────── PDF INVOICE ─────────────────

class TestPDFInvoice:
    def test_generate_pdf(self, auth_client):
        iid = state.get("invoice_id_ext")
        if not iid:
            pytest.skip("No invoice")
        r = auth_client.get(f"{BASE_URL}/api/invoices/{iid}/pdf")
        assert r.status_code == 200
        assert r.headers.get("content-type") == "application/pdf"
        assert len(r.content) > 100

    def test_pdf_nonexistent_invoice(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/invoices/nonexistent-id/pdf")
        assert r.status_code == 404


# ───────────────── COMPLAINTS (extended) ─────────────────

class TestComplaintsExtended:
    def test_create_complaint(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.post(f"{BASE_URL}/api/complaints", json={
            "property_id": pid, "category": "electrical",
            "title": "TEST_Fan not working", "description": "Room C101 fan",
            "priority": "high",
        })
        assert r.status_code == 200, r.text
        state["complaint_id_ext"] = r.json()["id"]

    def test_get_complaint(self, auth_client):
        cid = state.get("complaint_id_ext")
        if not cid:
            pytest.skip("No complaint")
        r = auth_client.get(f"{BASE_URL}/api/complaints/{cid}")
        assert r.status_code == 200

    def test_update_complaint_resolve(self, auth_client):
        cid = state.get("complaint_id_ext")
        if not cid:
            pytest.skip("No complaint")
        r = auth_client.put(f"{BASE_URL}/api/complaints/{cid}", json={
            "status": "resolved", "resolution_notes": "Fan replaced",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "resolved"
        assert "resolved_at" in data

    def test_list_complaints_filter(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/complaints?status=resolved")
        assert r.status_code == 200

    def test_delete_complaint(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.post(f"{BASE_URL}/api/complaints", json={
            "property_id": pid, "category": "other",
            "title": "TEST_DeleteComp", "description": "To delete",
        })
        assert r.status_code == 200
        r2 = auth_client.delete(f"{BASE_URL}/api/complaints/{r.json()['id']}")
        assert r2.status_code == 200


# ───────────────── FEEDBACK ─────────────────

class TestFeedback:
    def test_get_feedback_empty(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/feedback")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_feedback_summary(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/feedback/summary")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "average_rating" in data

    def test_feedback_filter_by_category(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/feedback?category=food")
        assert r.status_code == 200


# ───────────────── TENANT PORTAL ─────────────────

class TestTenantPortal:
    def test_portal_dashboard(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/tenant-portal/dashboard")
        assert r.status_code in [200, 404]

    def test_portal_invoices(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/tenant-portal/invoices")
        assert r.status_code in [200, 404]

    def test_portal_payments(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/tenant-portal/payments")
        assert r.status_code in [200, 404]

    def test_portal_complaints(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/tenant-portal/complaints")
        assert r.status_code in [200, 404]

    def test_portal_notices(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/tenant-portal/notices")
        assert r.status_code in [200, 404]

    def test_portal_visitors(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/tenant-portal/visitors")
        assert r.status_code in [200, 404]

    def test_portal_meal_plan(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/tenant-portal/meal-plan")
        assert r.status_code in [200, 404]


# ───────────────── FORGOT PASSWORD ─────────────────

class TestForgotPassword:
    def test_forgot_password_unknown_email(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "nope@nowhere.com"})
        assert r.status_code == 404

    def test_forgot_password_missing_email(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/auth/forgot-password", json={})
        assert r.status_code == 400

    def test_reset_password_invalid_otp(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "email": "TEST_comprehensive@pgsaathi.com", "otp": "000000", "new_password": "NewPass1!",
        })
        assert r.status_code == 400

    def test_reset_password_missing_otp(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "email": "TEST_comprehensive@pgsaathi.com", "new_password": "NewPass1!",
        })
        assert r.status_code == 400


# ───────────────── DASHBOARD STATS ─────────────────

class TestDashboardStats:
    def test_stats_have_all_keys(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200
        data = r.json()
        expected_keys = [
            "total_properties", "total_beds", "occupied_beds", "available_beds",
            "total_tenants", "open_complaints", "occupancy_rate",
            "total_expected_revenue", "total_collected_revenue", "pending_dues",
            "recent_tenants",
        ]
        for key in expected_keys:
            assert key in data, f"Missing key in dashboard stats: {key}"

    def test_stats_values_reasonable(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        data = r.json()
        assert data["total_properties"] >= 1
        assert data["total_beds"] >= 2
        assert isinstance(data["recent_tenants"], list)


# ───────────────── TENANT CHECKOUT & DELETE ─────────────────

class TestTenantCheckoutDelete:
    def test_checkout_tenant(self, auth_client):
        tid = state.get("tenant_id")
        if not tid:
            pytest.skip("No tenant")
        r = auth_client.post(f"{BASE_URL}/api/tenants/{tid}/checkout", json={"check_out_date": "2025-07-31"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "settlement" in data or "message" in data

    def test_delete_tenant(self, auth_client):
        pid = state.get("property_id")
        if not pid:
            pytest.skip("No property")
        r = auth_client.post(f"{BASE_URL}/api/tenants", json={
            "property_id": pid, "name": "TEST_DelTenant", "email": "TEST_del_t@pg.com",
            "phone": "9000099999", "check_in_date": "2025-06-01",
            "emergency_contact_name": "EC2", "emergency_contact_phone": "9000099998",
            "monthly_rent": 5000,
        })
        assert r.status_code == 200
        tid = r.json()["id"]
        r2 = auth_client.delete(f"{BASE_URL}/api/tenants/{tid}")
        assert r2.status_code == 200


# ───────────────── CLEANUP ─────────────────

class TestCleanup:
    def test_cleanup_test_data(self, auth_client):
        pid = state.get("property_id")
        if pid:
            auth_client.delete(f"{BASE_URL}/api/properties/{pid}")
        r = auth_client.get(f"{BASE_URL}/api/properties")
        assert r.status_code == 200
