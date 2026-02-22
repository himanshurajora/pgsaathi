from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from database import db
from auth_utils import get_current_user, pwd_context
from models import TenantCreate, TenantUpdate, BedAllocation
from datetime import datetime, timezone, timedelta
import uuid
import os
import shutil
import random
import string
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv
import resend

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@pgsaathi.online")

router = APIRouter()
UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "kyc"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_OTP_PER_DAY = 3


# === Tenant Onboarding Helpers ===

async def _check_otp_rate_limit(email: str):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    count = await db.otp_codes.count_documents({"email": email, "created_at": {"$gte": today_start}})
    if count >= MAX_OTP_PER_DAY:
        raise HTTPException(status_code=429, detail=f"OTP limit reached. Maximum {MAX_OTP_PER_DAY} OTPs per day.")
    return count


async def _send_otp_email(email: str, otp: str, name: str):
    try:
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: #D97706; border-radius: 12px; padding: 10px 16px;">
                    <span style="color: white; font-weight: bold; font-size: 20px;">PG</span>
                </div>
                <h2 style="margin: 12px 0 4px; color: #1C1917;">PGSaathi</h2>
            </div>
            <p style="color: #44403C; font-size: 15px;">Hi {name},</p>
            <p style="color: #44403C; font-size: 15px;">Your verification code is:</p>
            <div style="background: #FEF3C7; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #92400E;">{otp}</span>
            </div>
            <p style="color: #78716C; font-size: 13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
            <hr style="border: none; border-top: 1px solid #E7E5E4; margin: 24px 0;" />
            <p style="color: #A8A29E; font-size: 11px; text-align: center;">PGSaathi - Hostel & PG Management</p>
        </div>
        """
        params = {"from": SENDER_EMAIL, "to": [email], "subject": f"PGSaathi - Your verification code: {otp}", "html": html}
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"OTP email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")
        return False


async def _create_and_send_tenant_otp(email: str, name: str):
    await _check_otp_rate_limit(email)
    otp = str(random.randint(100000, 999999))
    await db.otp_codes.insert_one({
        "email": email, "otp": otp, "purpose": "tenant_verification",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    sent = await _send_otp_email(email, otp, name)
    return otp, sent


async def _create_tenant_account(tenant_data: dict, property_name: str):
    """Create a user account for the tenant with a temporary password and send credentials via email."""
    email = tenant_data["email"]
    name = tenant_data["name"]
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": name,
        "password_hash": pwd_context.hash(temp_password),
        "role": "tenant",
        "property_id": tenant_data.get("property_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
        "is_verified": True,
        "must_change_password": True,
    }
    await db.users.insert_one(user)
    await _send_tenant_welcome_email(email, name, temp_password, property_name)
    return user["id"], temp_password


async def _send_tenant_welcome_email(email: str, name: str, temp_password: str, property_name: str):
    """Send welcome email to tenant with their login credentials."""
    try:
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: #D97706; border-radius: 12px; padding: 10px 16px;">
                    <span style="color: white; font-weight: bold; font-size: 20px;">PG</span>
                </div>
                <h2 style="margin: 12px 0 4px; color: #1C1917;">PGSaathi</h2>
            </div>
            <h2 style="color: #1C1917; margin-bottom: 8px;">Welcome, {name}! 🎉</h2>
            <p style="color: #44403C; font-size: 15px;">
                You are now an official tenant of <strong>{property_name}</strong>.
            </p>
            <p style="color: #44403C; font-size: 15px;">
                Your account has been created on PGSaathi. Use the credentials below to log in:
            </p>
            <div style="background: #FEF3C7; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px; color: #92400E; font-size: 14px;"><strong>Email:</strong> {email}</p>
                <p style="margin: 0 0 8px; color: #92400E; font-size: 14px;"><strong>Temporary Password:</strong></p>
                <div style="background: white; border: 2px dashed #D97706; border-radius: 8px; padding: 12px; text-align: center;">
                    <span style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #D97706;">{temp_password}</span>
                </div>
            </div>
            <div style="background: #FEE2E2; border-radius: 8px; padding: 12px; margin: 16px 0;">
                <p style="color: #991B1B; font-size: 13px; margin: 0;">
                    ⚠️ Please change your password after your first login for security.
                </p>
            </div>
            <p style="color: #44403C; font-size: 15px;">
                Log in at: <a href="https://pgsaathi.online" style="color: #D97706; font-weight: bold;">pgsaathi.online</a>
            </p>
            <hr style="border: none; border-top: 1px solid #E7E5E4; margin: 24px 0;" />
            <p style="color: #A8A29E; font-size: 11px; text-align: center;">PGSaathi - Hostel & PG Management</p>
        </div>
        """
        params = {
            "from": SENDER_EMAIL, "to": [email],
            "subject": f"Welcome to {property_name} - Your PGSaathi Login Credentials", "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Welcome email sent to tenant {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email to {email}: {e}")
        return False


# === Tenant Onboarding Endpoints ===

@router.post("/send-otp")
async def send_tenant_otp(body: dict, current_user=Depends(get_current_user)):
    """Owner sends OTP to tenant's email before adding them."""
    email = body.get("email")
    name = body.get("name", "")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already registered. The tenant may already have an account.")
    otp, sent = await _create_and_send_tenant_otp(email, name)
    return {"message": "OTP sent to tenant's email", "email_sent": sent}


@router.post("/verify-otp")
async def verify_tenant_otp(body: dict, current_user=Depends(get_current_user)):
    """Owner verifies the OTP that was sent to tenant's email."""
    email = body.get("email")
    otp = body.get("otp")
    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")
    record = await db.otp_codes.find_one({"email": email, "otp": otp, "purpose": "tenant_verification"})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    created = datetime.fromisoformat(record["created_at"])
    if (datetime.now(timezone.utc) - created).total_seconds() > 300:
        await db.otp_codes.delete_many({"email": email, "purpose": "tenant_verification"})
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    await db.otp_codes.delete_many({"email": email, "purpose": "tenant_verification"})
    return {"message": "Tenant email verified successfully", "verified": True}


@router.get("")
async def get_tenants(property_id: str = None, current_user=Depends(get_current_user)):
    query = {}
    if property_id:
        query["property_id"] = property_id
    elif current_user["role"] == "owner":
        props = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(1000)
        property_ids = [p["id"] for p in props]
        query["property_id"] = {"$in": property_ids}
    elif current_user.get("property_id"):
        query["property_id"] = current_user["property_id"]
    tenants = await db.tenants.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return tenants


@router.post("")
async def create_tenant(data: TenantCreate, current_user=Depends(get_current_user)):
    # Check if email was verified via OTP (look for verified status)
    if not data.email_verified:
        raise HTTPException(status_code=400, detail="Tenant email must be verified via OTP before adding")

    tenant = {
        "id": str(uuid.uuid4()),
        "property_id": data.property_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "check_in_date": data.check_in_date,
        "check_out_date": None,
        "emergency_contact_name": data.emergency_contact_name,
        "emergency_contact_phone": data.emergency_contact_phone,
        "security_deposit": data.security_deposit or 0,
        "monthly_rent": data.monthly_rent or 0,
        "kyc_status": "pending",
        "kyc_documents": [],
        "status": "active",
        "bed_id": data.bed_id,
        "room_id": data.room_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
    }
    if data.bed_id and data.room_id:
        bed = await db.beds.find_one({"id": data.bed_id})
        if bed and bed.get("status") == "occupied":
            raise HTTPException(status_code=400, detail="Selected bed is already occupied")
        if bed:
            await db.beds.update_one({"id": data.bed_id}, {"$set": {"status": "occupied", "tenant_id": tenant["id"]}})
            if not tenant["monthly_rent"]:
                tenant["monthly_rent"] = bed.get("price", 0)

    # Create tenant user account with temporary password
    property_info = await db.properties.find_one({"id": data.property_id}, {"_id": 0})
    property_name = property_info.get("name", "your PG") if property_info else "your PG"
    user_id, temp_password = await _create_tenant_account(
        {"email": data.email, "name": data.name, "property_id": data.property_id},
        property_name
    )
    tenant["user_id"] = user_id

    await db.tenants.insert_one(tenant)
    tenant.pop("_id", None)
    return tenant


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: str, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.put("/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.tenants.update_one({"id": tenant_id}, {"$set": update_data})
    return await db.tenants.find_one({"id": tenant_id}, {"_id": 0})


@router.post("/{tenant_id}/allocate-bed")
async def allocate_bed(tenant_id: str, data: BedAllocation, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    bed = await db.beds.find_one({"id": data.bed_id})
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    if bed.get("status") == "occupied":
        raise HTTPException(status_code=400, detail="Bed is already occupied")
    if tenant.get("bed_id"):
        await db.beds.update_one({"id": tenant["bed_id"]}, {"$set": {"status": "available", "tenant_id": None}})
    await db.beds.update_one({"id": data.bed_id}, {"$set": {"status": "occupied", "tenant_id": tenant_id}})
    update = {"bed_id": data.bed_id, "room_id": data.room_id}
    if not tenant.get("monthly_rent"):
        update["monthly_rent"] = bed.get("price", 0)
    await db.tenants.update_one({"id": tenant_id}, {"$set": update})
    return await db.tenants.find_one({"id": tenant_id}, {"_id": 0})


@router.post("/{tenant_id}/release-bed")
async def release_bed(tenant_id: str, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.get("bed_id"):
        await db.beds.update_one({"id": tenant["bed_id"]}, {"$set": {"status": "available", "tenant_id": None}})
        await db.tenants.update_one({"id": tenant_id}, {"$set": {"bed_id": None, "room_id": None}})
    return {"message": "Bed released successfully"}


@router.put("/{tenant_id}/kyc")
async def update_kyc(tenant_id: str, body: dict, current_user=Depends(get_current_user)):
    kyc_status = body.get("kyc_status")
    if kyc_status not in ["pending", "verified", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid KYC status")
    await db.tenants.update_one({"id": tenant_id}, {"$set": {"kyc_status": kyc_status}})
    return {"message": f"KYC status updated to {kyc_status}"}


@router.post("/{tenant_id}/upload-kyc")
async def upload_kyc_document(tenant_id: str, file: UploadFile = File(...), current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in ("jpg", "jpeg", "png", "pdf", "webp"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use JPG, PNG, PDF, or WebP.")
    doc_id = str(uuid.uuid4())[:8]
    filename = f"{tenant_id}_{doc_id}.{ext}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    doc_entry = {
        "id": doc_id,
        "filename": filename,
        "original_name": file.filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": current_user["id"],
    }
    await db.tenants.update_one({"id": tenant_id}, {"$push": {"kyc_documents": doc_entry}})
    return {"message": "Document uploaded", "document": doc_entry}


@router.get("/{tenant_id}/kyc-documents")
async def get_kyc_documents(tenant_id: str, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant.get("kyc_documents", [])


@router.get("/{tenant_id}/kyc-file/{filename}")
async def serve_kyc_file(tenant_id: str, filename: str, current_user=Depends(get_current_user)):
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)


@router.post("/{tenant_id}/checkout")
async def checkout_tenant(tenant_id: str, body: dict, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.get("status") == "checked_out":
        raise HTTPException(status_code=400, detail="Tenant already checked out")
    checkout_date = body.get("check_out_date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    pending_invoices = await db.invoices.find(
        {"tenant_id": tenant_id, "status": {"$in": ["pending", "partial"]}}, {"_id": 0}
    ).to_list(100)
    total_pending = sum(inv.get("due_amount", 0) for inv in pending_invoices)
    security_deposit = tenant.get("security_deposit", 0)
    settlement = {
        "pending_dues": total_pending,
        "security_deposit": security_deposit,
        "net_amount": total_pending - security_deposit,
    }
    if tenant.get("bed_id"):
        await db.beds.update_one({"id": tenant["bed_id"]}, {"$set": {"status": "available", "tenant_id": None}})
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"status": "checked_out", "check_out_date": checkout_date, "bed_id": None, "room_id": None}},
    )
    return {"message": "Tenant checked out", "settlement": settlement, "check_out_date": checkout_date}


@router.get("/{tenant_id}/detail")
async def get_tenant_detail(tenant_id: str, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    bed_info = None
    room_info = None
    property_info = None
    if tenant.get("bed_id"):
        bed_info = await db.beds.find_one({"id": tenant["bed_id"]}, {"_id": 0})
    if tenant.get("room_id"):
        room_info = await db.rooms.find_one({"id": tenant["room_id"]}, {"_id": 0})
    if tenant.get("property_id"):
        property_info = await db.properties.find_one({"id": tenant["property_id"]}, {"_id": 0})
    invoices = await db.invoices.find({"tenant_id": tenant_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    payments = await db.payments.find({"tenant_id": tenant_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    complaints = await db.complaints.find({"tenant_id": tenant_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    meal_plan = await db.tenant_meal_plans.find_one({"tenant_id": tenant_id, "is_active": True}, {"_id": 0})
    return {
        "tenant": tenant,
        "bed_info": bed_info,
        "room_info": room_info,
        "property_info": property_info,
        "invoices": invoices,
        "payments": payments,
        "complaints": complaints,
        "meal_plan": meal_plan,
    }


@router.post("/{tenant_id}/switch-bed")
async def switch_bed(tenant_id: str, body: dict, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    new_bed_id = body.get("new_bed_id")
    new_room_id = body.get("new_room_id")
    new_bed = await db.beds.find_one({"id": new_bed_id})
    if not new_bed:
        raise HTTPException(status_code=404, detail="New bed not found")
    if new_bed.get("status") == "occupied":
        raise HTTPException(status_code=400, detail="New bed is already occupied")
    old_bed_id = tenant.get("bed_id")
    old_room_id = tenant.get("room_id")
    if old_bed_id:
        await db.beds.update_one({"id": old_bed_id}, {"$set": {"status": "available", "tenant_id": None}})
    await db.beds.update_one({"id": new_bed_id}, {"$set": {"status": "occupied", "tenant_id": tenant_id}})
    await db.tenants.update_one({"id": tenant_id}, {"$set": {"bed_id": new_bed_id, "room_id": new_room_id}})
    audit = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "action": "bed_switch",
        "old_bed_id": old_bed_id,
        "old_room_id": old_room_id,
        "new_bed_id": new_bed_id,
        "new_room_id": new_room_id,
        "performed_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.audit_logs.insert_one(audit)
    return await db.tenants.find_one({"id": tenant_id}, {"_id": 0})


@router.delete("/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.get("bed_id"):
        await db.beds.update_one({"id": tenant["bed_id"]}, {"$set": {"status": "available", "tenant_id": None}})
    await db.tenants.delete_one({"id": tenant_id})
    return {"message": "Tenant deleted"}
