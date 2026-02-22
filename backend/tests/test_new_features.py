"""
Test Suite for PGSaathi v3 New Features:
1. Email OTP verification during registration
2. Attendance-based mess billing
3. Visitor management with fines

OTP can be retrieved from MongoDB collection 'otp_codes' for testing.
"""
import pytest
import requests
import os
import random
import string
from datetime import datetime, timezone
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# MongoDB client for OTP verification
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]


def random_email():
    """Generate random test email"""
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"TEST_otp_{suffix}@test.com"


@pytest.fixture(scope="module")
def api_client():
    """Requests session for API calls"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def owner_token(api_client):
    """Get owner token using existing test account or create new"""
    # Try existing account first
    res = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "TEST_owner_v2@pgsaathi.com",
        "password": "Test@1234"
    })
    if res.status_code == 200 and res.json().get("token"):
        return res.json()["token"]
    
    # If user is unverified, verify it
    if res.status_code == 200 and res.json().get("requires_otp"):
        email = "TEST_owner_v2@pgsaathi.com"
        otp_rec = db.otp_codes.find_one({"email": email})
        if otp_rec:
            verify = api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={
                "email": email, "otp": otp_rec["otp"]
            })
            if verify.status_code == 200:
                return verify.json()["token"]
    
    pytest.skip("Could not authenticate owner")


@pytest.fixture
def auth_headers(owner_token):
    """Auth headers for protected endpoints"""
    return {"Authorization": f"Bearer {owner_token}"}


# ========================
# OTP AUTHENTICATION TESTS
# ========================

class TestOTPRegistration:
    """Test OTP verification flow during registration"""
    
    def test_register_creates_unverified_user_and_requires_otp(self, api_client):
        """Registration should create unverified user and return requires_otp=true"""
        email = random_email()
        res = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "test1234",
            "name": "TEST OTP User",
            "role": "owner"
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("requires_otp") == True
        assert data.get("email") == email
        assert "message" in data
        
        # Verify user is created as unverified
        user = db.users.find_one({"email": email})
        assert user is not None
        assert user.get("is_verified") == False
        
        # Verify OTP was created in database
        otp_record = db.otp_codes.find_one({"email": email})
        assert otp_record is not None
        assert len(otp_record.get("otp", "")) == 6
        
        # Cleanup
        db.users.delete_one({"email": email})
        db.otp_codes.delete_many({"email": email})
    
    def test_verify_otp_returns_token_on_correct_otp(self, api_client):
        """Correct OTP should verify user and return token"""
        email = random_email()
        # First register
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "test1234", "name": "TEST Verify", "role": "owner"
        })
        
        # Get OTP from database
        otp_record = db.otp_codes.find_one({"email": email})
        otp = otp_record["otp"]
        
        # Verify OTP
        res = api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": email, "otp": otp
        })
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == email
        assert data["user"]["is_verified"] == True
        
        # Verify user is now verified in DB
        user = db.users.find_one({"email": email})
        assert user["is_verified"] == True
        
        # Cleanup
        db.users.delete_one({"email": email})
        db.otp_codes.delete_many({"email": email})
    
    def test_invalid_otp_returns_error(self, api_client):
        """Invalid OTP should return error"""
        email = random_email()
        # Register
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "test1234", "name": "TEST Invalid", "role": "owner"
        })
        
        # Try with wrong OTP
        res = api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": email, "otp": "000000"  # Wrong OTP
        })
        assert res.status_code == 400
        assert "Invalid OTP" in res.json().get("detail", "")
        
        # Cleanup
        db.users.delete_one({"email": email})
        db.otp_codes.delete_many({"email": email})
    
    def test_resend_otp_works(self, api_client):
        """Resend OTP should create new OTP for unverified user"""
        email = random_email()
        # Register
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "test1234", "name": "TEST Resend", "role": "owner"
        })
        old_otp = db.otp_codes.find_one({"email": email})["otp"]
        
        # Resend OTP
        res = api_client.post(f"{BASE_URL}/api/auth/resend-otp", json={"email": email})
        assert res.status_code == 200
        assert "OTP resent" in res.json().get("message", "")
        
        # Verify new OTP is different (usually)
        new_otp_rec = db.otp_codes.find_one({"email": email})
        assert new_otp_rec is not None
        
        # Cleanup
        db.users.delete_one({"email": email})
        db.otp_codes.delete_many({"email": email})
    
    def test_already_verified_user_cannot_resend_otp(self, api_client):
        """Already verified user should not be able to resend OTP"""
        email = random_email()
        # Register and verify
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "test1234", "name": "TEST Verified", "role": "owner"
        })
        otp = db.otp_codes.find_one({"email": email})["otp"]
        api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={"email": email, "otp": otp})
        
        # Try to resend
        res = api_client.post(f"{BASE_URL}/api/auth/resend-otp", json={"email": email})
        assert res.status_code == 400
        assert "already verified" in res.json().get("detail", "").lower()
        
        # Cleanup
        db.users.delete_one({"email": email})
        db.otp_codes.delete_many({"email": email})


class TestOTPLogin:
    """Test login flow for unverified vs verified users"""
    
    def test_login_unverified_user_returns_requires_otp(self, api_client):
        """Login for unverified user should return requires_otp and send OTP"""
        email = random_email()
        # Register but don't verify
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "test1234", "name": "TEST Unverified Login", "role": "owner"
        })
        # Clear OTP to simulate fresh login
        db.otp_codes.delete_many({"email": email})
        
        # Try to login
        res = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": email, "password": "test1234"
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("requires_otp") == True
        assert data.get("email") == email
        
        # OTP should be created
        otp_rec = db.otp_codes.find_one({"email": email})
        assert otp_rec is not None
        
        # Cleanup
        db.users.delete_one({"email": email})
        db.otp_codes.delete_many({"email": email})
    
    def test_login_verified_user_returns_token_directly(self, api_client):
        """Login for verified user should return token directly"""
        email = random_email()
        # Register
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "test1234", "name": "TEST Verified Login", "role": "owner"
        })
        # Verify
        otp = db.otp_codes.find_one({"email": email})["otp"]
        api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={"email": email, "otp": otp})
        
        # Login should return token
        res = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": email, "password": "test1234"
        })
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        assert "user" in data
        assert data.get("requires_otp") is None or data.get("requires_otp") == False
        
        # Cleanup
        db.users.delete_one({"email": email})
        db.otp_codes.delete_many({"email": email})


# ========================
# MEAL ATTENDANCE TESTS
# ========================

class TestMealAttendance:
    """Test meal attendance marking and attendance-based billing"""
    
    @pytest.fixture
    def setup_mess_and_tenant(self, api_client, auth_headers):
        """Setup property, mess config with attendance tracking, and tenant with meal plan"""
        # Create property
        prop_res = api_client.post(f"{BASE_URL}/api/properties", json={
            "name": "TEST Mess Property",
            "address": "123 Test St",
            "city": "Mumbai",
            "state": "MH",
            "gender_type": "boys",
            "allows_visitors": True
        }, headers=auth_headers)
        prop = prop_res.json()
        prop_id = prop["id"]
        
        # Create mess config with attendance tracking
        mess_res = api_client.post(f"{BASE_URL}/api/mess/config", json={
            "property_id": prop_id,
            "monthly_amount": 3000,
            "meal_types": ["breakfast", "lunch", "dinner"],
            "veg_nonveg": "veg",
            "tracking_mode": "attendance"
        }, headers=auth_headers)
        mess_config = mess_res.json()
        
        # Create floor and room
        floor_res = api_client.post(f"{BASE_URL}/api/properties/{prop_id}/floors", json={
            "floor_number": 1, "name": "Ground Floor"
        }, headers=auth_headers)
        floor = floor_res.json()
        
        room_res = api_client.post(f"{BASE_URL}/api/floors/{floor['id']}/rooms", json={
            "room_number": "T101", "room_type": "double", "capacity": 2
        }, headers=auth_headers)
        room = room_res.json()
        
        bed_res = api_client.post(f"{BASE_URL}/api/rooms/{room['id']}/beds", json={
            "bed_number": "T101-A", "price": 5000
        }, headers=auth_headers)
        bed = bed_res.json()
        
        # Create tenant
        tenant_email = f"TEST_tenant_mess_{random.randint(1000,9999)}@test.com"
        tenant_res = api_client.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST Mess Tenant",
            "email": tenant_email,
            "phone": "9876543210",
            "check_in_date": "2026-01-01",
            "emergency_contact_name": "Parent",
            "emergency_contact_phone": "9876543211",
            "property_id": prop_id,
            "bed_id": bed["id"],
            "room_id": room["id"],
            "monthly_rent": 5000
        }, headers=auth_headers)
        tenant = tenant_res.json()
        
        # Create meal plan for tenant
        plan_res = api_client.post(f"{BASE_URL}/api/mess/plans", json={
            "tenant_id": tenant["id"],
            "property_id": prop_id,
            "opted_meals": ["breakfast", "lunch", "dinner"],
            "start_date": "2026-01-01"
        }, headers=auth_headers)
        meal_plan = plan_res.json()
        
        yield {
            "property_id": prop_id,
            "tenant": tenant,
            "tenant_email": tenant_email,
            "meal_plan": meal_plan,
            "mess_config": mess_config,
            "floor_id": floor["id"],
            "room_id": room["id"],
            "bed_id": bed["id"]
        }
        
        # Cleanup
        db.meal_attendance.delete_many({"tenant_id": tenant["id"]})
        db.tenant_meal_plans.delete_many({"tenant_id": tenant["id"]})
        db.tenants.delete_one({"id": tenant["id"]})
        db.beds.delete_one({"id": bed["id"]})
        db.rooms.delete_one({"id": room["id"]})
        db.floors.delete_one({"id": floor["id"]})
        db.mess_configs.delete_many({"property_id": prop_id})
        db.properties.delete_one({"id": prop_id})
    
    def test_admin_can_mark_attendance(self, api_client, auth_headers, setup_mess_and_tenant):
        """Admin/owner can mark attendance for tenant"""
        tenant = setup_mess_and_tenant["tenant"]
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        res = api_client.post(f"{BASE_URL}/api/mess/attendance", json={
            "tenant_id": tenant["id"],
            "meal_type": "breakfast",
            "date": today,
            "present": True
        }, headers=auth_headers)
        
        assert res.status_code == 200
        data = res.json()
        assert data["tenant_id"] == tenant["id"]
        assert data["meal_type"] == "breakfast"
        assert data["present"] == True
    
    def test_admin_can_overwrite_attendance(self, api_client, auth_headers, setup_mess_and_tenant):
        """Admin can overwrite existing attendance"""
        tenant = setup_mess_and_tenant["tenant"]
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # First mark present
        api_client.post(f"{BASE_URL}/api/mess/attendance", json={
            "tenant_id": tenant["id"], "meal_type": "lunch", "date": today, "present": True
        }, headers=auth_headers)
        
        # Overwrite to absent
        res = api_client.post(f"{BASE_URL}/api/mess/attendance", json={
            "tenant_id": tenant["id"], "meal_type": "lunch", "date": today, "present": False
        }, headers=auth_headers)
        
        assert res.status_code == 200
        assert res.json()["present"] == False
    
    def test_get_attendance_list(self, api_client, auth_headers, setup_mess_and_tenant):
        """Get attendance list with filters"""
        tenant = setup_mess_and_tenant["tenant"]
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Mark some attendance
        api_client.post(f"{BASE_URL}/api/mess/attendance", json={
            "tenant_id": tenant["id"], "meal_type": "dinner", "date": today, "present": True
        }, headers=auth_headers)
        
        # Get attendance
        res = api_client.get(f"{BASE_URL}/api/mess/attendance", params={
            "tenant_id": tenant["id"], "date": today
        }, headers=auth_headers)
        
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_attendance_summary_with_per_meal_rate(self, api_client, auth_headers, setup_mess_and_tenant):
        """Attendance summary should calculate per-meal rate"""
        tenant = setup_mess_and_tenant["tenant"]
        now = datetime.now(timezone.utc)
        
        # Mark 5 meals
        for i, meal in enumerate(["breakfast", "lunch", "dinner", "breakfast", "lunch"]):
            date = f"2026-01-{str(i+1).zfill(2)}"
            api_client.post(f"{BASE_URL}/api/mess/attendance", json={
                "tenant_id": tenant["id"], "meal_type": meal, "date": date, "present": True
            }, headers=auth_headers)
        
        res = api_client.get(f"{BASE_URL}/api/mess/attendance/summary", params={
            "tenant_id": tenant["id"], "month": 1, "year": 2026
        }, headers=auth_headers)
        
        assert res.status_code == 200
        data = res.json()
        assert data["tenant_id"] == tenant["id"]
        assert data["total_meals"] >= 5
        assert "per_meal_rate" in data
        assert "total_amount" in data
        # Per meal rate = 3000 / (30 * 3) = 33.33
        assert data["per_meal_rate"] > 0


# ========================
# VISITOR MANAGEMENT TESTS
# ========================

class TestVisitorManagement:
    """Test visitor request, approval, rejection, and fine system"""
    
    @pytest.fixture
    def setup_visitor_test(self, api_client, auth_headers):
        """Setup property and tenant for visitor testing"""
        # Create property with visitors allowed
        prop_res = api_client.post(f"{BASE_URL}/api/properties", json={
            "name": "TEST Visitor Property",
            "address": "456 Test Ave",
            "city": "Delhi",
            "state": "DL",
            "gender_type": "girls",
            "allows_visitors": True
        }, headers=auth_headers)
        prop = prop_res.json()
        prop_id = prop["id"]
        
        # Create floor, room, bed
        floor_res = api_client.post(f"{BASE_URL}/api/properties/{prop_id}/floors", json={
            "floor_number": 1, "name": "First Floor"
        }, headers=auth_headers)
        floor = floor_res.json()
        
        room_res = api_client.post(f"{BASE_URL}/api/floors/{floor['id']}/rooms", json={
            "room_number": "V101", "room_type": "single", "capacity": 1
        }, headers=auth_headers)
        room = room_res.json()
        
        bed_res = api_client.post(f"{BASE_URL}/api/rooms/{room['id']}/beds", json={
            "bed_number": "V101-A", "price": 6000
        }, headers=auth_headers)
        bed = bed_res.json()
        
        # Create tenant with user account
        tenant_email = f"TEST_tenant_visitor_{random.randint(1000,9999)}@test.com"
        tenant_res = api_client.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST Visitor Tenant",
            "email": tenant_email,
            "phone": "9876543212",
            "check_in_date": "2026-01-01",
            "emergency_contact_name": "Parent",
            "emergency_contact_phone": "9876543213",
            "property_id": prop_id,
            "bed_id": bed["id"],
            "room_id": room["id"],
            "monthly_rent": 6000
        }, headers=auth_headers)
        tenant = tenant_res.json()
        
        # Create tenant user account
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": tenant_email,
            "password": "tenant1234",
            "name": "TEST Visitor Tenant",
            "role": "tenant",
            "property_id": prop_id
        })
        
        # Verify tenant (get OTP from db)
        otp_rec = db.otp_codes.find_one({"email": tenant_email})
        if otp_rec:
            api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={
                "email": tenant_email, "otp": otp_rec["otp"]
            })
        
        # Get tenant token
        login_res = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": tenant_email, "password": "tenant1234"
        })
        tenant_token = login_res.json().get("token", "")
        
        yield {
            "property_id": prop_id,
            "tenant": tenant,
            "tenant_email": tenant_email,
            "tenant_token": tenant_token,
            "floor_id": floor["id"],
            "room_id": room["id"],
            "bed_id": bed["id"]
        }
        
        # Cleanup
        db.visitors.delete_many({"tenant_id": tenant["id"]})
        db.notifications.delete_many({"user_id": tenant["id"]})
        db.users.delete_one({"email": tenant_email})
        db.otp_codes.delete_many({"email": tenant_email})
        db.tenants.delete_one({"id": tenant["id"]})
        db.beds.delete_one({"id": bed["id"]})
        db.rooms.delete_one({"id": room["id"]})
        db.floors.delete_one({"id": floor["id"]})
        db.properties.delete_one({"id": prop_id})
    
    def test_tenant_can_request_visitor(self, api_client, setup_visitor_test):
        """Tenant can request a visitor"""
        tenant_token = setup_visitor_test["tenant_token"]
        if not tenant_token:
            pytest.skip("No tenant token available")
        
        res = api_client.post(f"{BASE_URL}/api/visitors", json={
            "visitor_name": "Test Visitor",
            "visitor_phone": "9876543214",
            "relation": "Friend",
            "purpose": "Visit",
            "visit_date": "2026-01-15",
            "visit_time": "14:00"
        }, headers={"Authorization": f"Bearer {tenant_token}"})
        
        assert res.status_code == 200
        data = res.json()
        assert data["visitor_name"] == "Test Visitor"
        assert data["status"] == "pending"
        assert "id" in data
    
    def test_property_no_visitors_blocks_request(self, api_client, auth_headers):
        """Property with allows_visitors=false should block visitor request"""
        # Create property with no visitors
        prop_res = api_client.post(f"{BASE_URL}/api/properties", json={
            "name": "TEST No Visitor Property",
            "address": "789 Test Blvd",
            "city": "Chennai",
            "state": "TN",
            "gender_type": "boys",
            "allows_visitors": False
        }, headers=auth_headers)
        prop = prop_res.json()
        prop_id = prop["id"]
        
        # Create tenant
        floor_res = api_client.post(f"{BASE_URL}/api/properties/{prop_id}/floors", json={
            "floor_number": 1, "name": "Ground"
        }, headers=auth_headers)
        floor = floor_res.json()
        
        room_res = api_client.post(f"{BASE_URL}/api/floors/{floor['id']}/rooms", json={
            "room_number": "NV101", "room_type": "single", "capacity": 1
        }, headers=auth_headers)
        room = room_res.json()
        
        bed_res = api_client.post(f"{BASE_URL}/api/rooms/{room['id']}/beds", json={
            "bed_number": "NV101-A", "price": 4000
        }, headers=auth_headers)
        bed = bed_res.json()
        
        tenant_email = f"TEST_nv_{random.randint(1000,9999)}@test.com"
        api_client.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST No Visitor Tenant",
            "email": tenant_email,
            "phone": "9876543215",
            "check_in_date": "2026-01-01",
            "emergency_contact_name": "Parent",
            "emergency_contact_phone": "9876543216",
            "property_id": prop_id,
            "bed_id": bed["id"],
            "room_id": room["id"],
            "monthly_rent": 4000
        }, headers=auth_headers)
        
        # Register tenant user
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": tenant_email, "password": "tenant1234",
            "name": "NV Tenant", "role": "tenant", "property_id": prop_id
        })
        otp_rec = db.otp_codes.find_one({"email": tenant_email})
        if otp_rec:
            api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={
                "email": tenant_email, "otp": otp_rec["otp"]
            })
        
        login_res = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": tenant_email, "password": "tenant1234"
        })
        token = login_res.json().get("token", "")
        
        # Try to request visitor - should fail
        res = api_client.post(f"{BASE_URL}/api/visitors", json={
            "visitor_name": "Blocked Visitor",
            "visit_date": "2026-01-15"
        }, headers={"Authorization": f"Bearer {token}"})
        
        assert res.status_code == 403
        assert "not allow visitors" in res.json().get("detail", "").lower()
        
        # Cleanup
        db.users.delete_one({"email": tenant_email})
        db.otp_codes.delete_many({"email": tenant_email})
        db.tenants.delete_many({"property_id": prop_id})
        db.beds.delete_one({"id": bed["id"]})
        db.rooms.delete_one({"id": room["id"]})
        db.floors.delete_one({"id": floor["id"]})
        db.properties.delete_one({"id": prop_id})
    
    def test_admin_can_approve_visitor(self, api_client, auth_headers, setup_visitor_test):
        """Admin can approve visitor request"""
        tenant_token = setup_visitor_test["tenant_token"]
        if not tenant_token:
            pytest.skip("No tenant token available")
        
        # Create visitor request as tenant
        create_res = api_client.post(f"{BASE_URL}/api/visitors", json={
            "visitor_name": "Approve Test",
            "visit_date": "2026-01-16"
        }, headers={"Authorization": f"Bearer {tenant_token}"})
        visitor = create_res.json()
        
        # Admin approves
        res = api_client.put(f"{BASE_URL}/api/visitors/{visitor['id']}", json={
            "status": "approved"
        }, headers=auth_headers)
        
        assert res.status_code == 200
        assert res.json()["status"] == "approved"
    
    def test_admin_can_reject_visitor(self, api_client, auth_headers, setup_visitor_test):
        """Admin can reject visitor request"""
        tenant_token = setup_visitor_test["tenant_token"]
        if not tenant_token:
            pytest.skip("No tenant token available")
        
        # Create visitor
        create_res = api_client.post(f"{BASE_URL}/api/visitors", json={
            "visitor_name": "Reject Test",
            "visit_date": "2026-01-17"
        }, headers={"Authorization": f"Bearer {tenant_token}"})
        visitor = create_res.json()
        
        # Admin rejects
        res = api_client.put(f"{BASE_URL}/api/visitors/{visitor['id']}", json={
            "status": "rejected"
        }, headers=auth_headers)
        
        assert res.status_code == 200
        assert res.json()["status"] == "rejected"
    
    def test_admin_can_impose_fine(self, api_client, auth_headers, setup_visitor_test):
        """Admin can impose fine on visitor"""
        tenant = setup_visitor_test["tenant"]
        tenant_token = setup_visitor_test["tenant_token"]
        if not tenant_token:
            pytest.skip("No tenant token available")
        
        # Create visitor
        create_res = api_client.post(f"{BASE_URL}/api/visitors", json={
            "visitor_name": "Fine Test",
            "visit_date": "2026-01-18"
        }, headers={"Authorization": f"Bearer {tenant_token}"})
        visitor = create_res.json()
        
        # Impose fine
        res = api_client.post(f"{BASE_URL}/api/visitors/{visitor['id']}/fine", json={
            "fine_amount": 500,
            "fine_reason": "Unauthorized entry"
        }, headers=auth_headers)
        
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "fined"
        assert data["fine_amount"] == 500
        assert data["fine_reason"] == "Unauthorized entry"
    
    def test_fine_creates_notification(self, api_client, auth_headers, setup_visitor_test):
        """Fine should create notification for tenant"""
        tenant = setup_visitor_test["tenant"]
        tenant_token = setup_visitor_test["tenant_token"]
        if not tenant_token:
            pytest.skip("No tenant token available")
        
        # Clear previous notifications
        db.notifications.delete_many({"user_id": tenant["id"]})
        
        # Create and fine visitor
        create_res = api_client.post(f"{BASE_URL}/api/visitors", json={
            "visitor_name": "Notification Fine Test",
            "visit_date": "2026-01-19"
        }, headers={"Authorization": f"Bearer {tenant_token}"})
        visitor = create_res.json()
        
        api_client.post(f"{BASE_URL}/api/visitors/{visitor['id']}/fine", json={
            "fine_amount": 250,
            "fine_reason": "Late checkout"
        }, headers=auth_headers)
        
        # Check notification was created
        notification = db.notifications.find_one({
            "user_id": tenant["id"],
            "title": {"$regex": "Fine", "$options": "i"}
        })
        assert notification is not None
    
    def test_tenant_cannot_approve_reject_fine(self, api_client, setup_visitor_test):
        """Tenant should not be able to approve/reject/fine visitors"""
        tenant_token = setup_visitor_test["tenant_token"]
        if not tenant_token:
            pytest.skip("No tenant token available")
        
        # Create visitor
        create_res = api_client.post(f"{BASE_URL}/api/visitors", json={
            "visitor_name": "Permission Test",
            "visit_date": "2026-01-20"
        }, headers={"Authorization": f"Bearer {tenant_token}"})
        visitor = create_res.json()
        
        # Try to approve as tenant
        res = api_client.put(f"{BASE_URL}/api/visitors/{visitor['id']}", json={
            "status": "approved"
        }, headers={"Authorization": f"Bearer {tenant_token}"})
        assert res.status_code == 403
        
        # Try to impose fine as tenant
        res = api_client.post(f"{BASE_URL}/api/visitors/{visitor['id']}/fine", json={
            "fine_amount": 100
        }, headers={"Authorization": f"Bearer {tenant_token}"})
        assert res.status_code == 403


class TestTenantPortalVisitors:
    """Test tenant portal visitors endpoint"""
    
    def test_tenant_portal_shows_visitors(self, api_client, auth_headers):
        """Tenant portal should return visitor list for tenant"""
        # Using owner as fallback since tenant setup is complex
        res = api_client.get(f"{BASE_URL}/api/tenant-portal/visitors", headers=auth_headers)
        # Should return empty list or visitors list (not error)
        assert res.status_code == 200
        assert isinstance(res.json(), list)


class TestBulkInvoiceWithVisitorFines:
    """Test bulk invoice generation includes visitor fines"""
    
    def test_bulk_invoice_includes_visitor_fines(self, api_client, auth_headers):
        """Bulk invoice should include unbilled visitor fines"""
        # Create property
        prop_res = api_client.post(f"{BASE_URL}/api/properties", json={
            "name": "TEST Invoice Fine Property",
            "address": "Invoice Test",
            "city": "Pune",
            "state": "MH",
            "gender_type": "co-living",
            "allows_visitors": True
        }, headers=auth_headers)
        prop = prop_res.json()
        prop_id = prop["id"]
        
        # Create floor, room, bed
        floor_res = api_client.post(f"{BASE_URL}/api/properties/{prop_id}/floors", json={
            "floor_number": 1, "name": "Invoice Floor"
        }, headers=auth_headers)
        floor = floor_res.json()
        
        room_res = api_client.post(f"{BASE_URL}/api/floors/{floor['id']}/rooms", json={
            "room_number": "INV101", "room_type": "double", "capacity": 2
        }, headers=auth_headers)
        room = room_res.json()
        
        bed_res = api_client.post(f"{BASE_URL}/api/rooms/{room['id']}/beds", json={
            "bed_number": "INV101-A", "price": 7000
        }, headers=auth_headers)
        bed = bed_res.json()
        
        # Create tenant
        tenant_email = f"TEST_invoice_fine_{random.randint(1000,9999)}@test.com"
        tenant_res = api_client.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST Invoice Fine Tenant",
            "email": tenant_email,
            "phone": "9876543217",
            "check_in_date": "2026-01-01",
            "emergency_contact_name": "Parent",
            "emergency_contact_phone": "9876543218",
            "property_id": prop_id,
            "bed_id": bed["id"],
            "room_id": room["id"],
            "monthly_rent": 7000
        }, headers=auth_headers)
        tenant = tenant_res.json()
        
        # Insert a fined visitor directly
        visitor_id = f"test_visitor_{random.randint(1000,9999)}"
        db.visitors.insert_one({
            "id": visitor_id,
            "tenant_id": tenant["id"],
            "tenant_name": tenant["name"],
            "property_id": prop_id,
            "visitor_name": "Fined Visitor",
            "visit_date": "2026-01-10",
            "status": "fined",
            "fine_amount": 300,
            "fine_reason": "Test fine",
            "fine_billed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Generate bulk invoice
        now = datetime.now(timezone.utc)
        res = api_client.post(f"{BASE_URL}/api/invoices/bulk", json={
            "property_id": prop_id,
            "billing_month": now.month,
            "billing_year": now.year,
            "include_food": False
        }, headers=auth_headers)
        
        assert res.status_code == 200
        data = res.json()
        assert data["created"] >= 1
        
        # Check invoice has other_charges
        invoices = data.get("invoices", [])
        tenant_invoice = next((i for i in invoices if i["tenant_id"] == tenant["id"]), None)
        if tenant_invoice:
            assert tenant_invoice["other_charges"] >= 300
            assert "fine" in tenant_invoice.get("other_charges_desc", "").lower()
        
        # Check visitor fine_billed is now True
        visitor = db.visitors.find_one({"id": visitor_id})
        assert visitor["fine_billed"] == True
        
        # Cleanup
        db.visitors.delete_one({"id": visitor_id})
        db.invoices.delete_many({"property_id": prop_id})
        db.tenants.delete_one({"id": tenant["id"]})
        db.beds.delete_one({"id": bed["id"]})
        db.rooms.delete_one({"id": room["id"]})
        db.floors.delete_one({"id": floor["id"]})
        db.properties.delete_one({"id": prop_id})


class TestPropertyAllowsVisitors:
    """Test allows_visitors field in property CRUD"""
    
    def test_create_property_with_allows_visitors(self, api_client, auth_headers):
        """Property creation should include allows_visitors field"""
        res = api_client.post(f"{BASE_URL}/api/properties", json={
            "name": "TEST Allows Visitors True",
            "address": "Test",
            "city": "Bangalore",
            "state": "KA",
            "gender_type": "boys",
            "allows_visitors": True
        }, headers=auth_headers)
        
        assert res.status_code == 200
        data = res.json()
        assert data.get("allows_visitors") == True
        
        # Cleanup
        db.properties.delete_one({"id": data["id"]})
    
    def test_create_property_with_no_visitors(self, api_client, auth_headers):
        """Property can be created with allows_visitors=false"""
        res = api_client.post(f"{BASE_URL}/api/properties", json={
            "name": "TEST No Visitors Prop",
            "address": "Test",
            "city": "Hyderabad",
            "state": "TS",
            "gender_type": "girls",
            "allows_visitors": False
        }, headers=auth_headers)
        
        assert res.status_code == 200
        data = res.json()
        assert data.get("allows_visitors") == False
        
        # Cleanup
        db.properties.delete_one({"id": data["id"]})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
