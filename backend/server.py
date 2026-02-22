from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import uuid
import os
import io
import logging
import random
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from database import db
from models import UserCreate, UserLogin
from auth_utils import create_access_token, get_current_user, pwd_context
from routes.properties import properties_router, floors_router, rooms_router, beds_router
from routes.tenants import router as tenants_router
from routes.rent import invoices_router, payments_router
from routes.complaints import router as complaints_router
from routes.mess import router as mess_router
from routes.notifications import router as notifications_router
from routes.notices import router as notices_router
from routes.housekeeping import router as housekeeping_router
from routes.users import router as users_router
from routes.tenant_portal import router as tenant_portal_router
from routes.visitors import router as visitors_router
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

app = FastAPI(title="PGSaathi API", version="3.0.0")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@api_router.get("/")
async def root():
    return {"message": "PGSaathi API running", "version": "3.0.0"}


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
        params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": f"PGSaathi - Your verification code: {otp}",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"OTP email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")
        return False


@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        if existing.get("is_verified") is False:
            otp = str(random.randint(100000, 999999))
            await db.otp_codes.delete_many({"email": user_data.email})
            await db.otp_codes.insert_one({
                "email": user_data.email,
                "otp": otp,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            await _send_otp_email(user_data.email, otp, existing.get("name", ""))
            return {"message": "OTP resent. Please verify your email.", "requires_otp": True, "email": user_data.email}
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": pwd_context.hash(user_data.password),
        "role": user_data.role,
        "property_id": user_data.property_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
        "is_verified": False,
    }
    await db.users.insert_one(user)
    otp = str(random.randint(100000, 999999))
    await db.otp_codes.insert_one({
        "email": user_data.email,
        "otp": otp,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    sent = await _send_otp_email(user_data.email, otp, user_data.name)
    return {"message": "Account created. Please verify your email.", "requires_otp": True, "email": user_data.email, "email_sent": sent}


@api_router.post("/auth/verify-otp")
async def verify_otp(body: dict):
    email = body.get("email")
    otp = body.get("otp")
    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")
    record = await db.otp_codes.find_one({"email": email, "otp": otp})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    created = datetime.fromisoformat(record["created_at"])
    if (datetime.now(timezone.utc) - created).total_seconds() > 300:
        await db.otp_codes.delete_many({"email": email})
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    await db.users.update_one({"email": email}, {"$set": {"is_verified": True}})
    await db.otp_codes.delete_many({"email": email})
    user = await db.users.find_one({"email": email})
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    user_resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_resp, "message": "Email verified successfully"}


@api_router.post("/auth/resend-otp")
async def resend_otp(body: dict):
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="No account found")
    if user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    otp = str(random.randint(100000, 999999))
    await db.otp_codes.delete_many({"email": email})
    await db.otp_codes.insert_one({
        "email": email,
        "otp": otp,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    sent = await _send_otp_email(email, otp, user.get("name", ""))
    return {"message": "OTP resent", "email_sent": sent}


@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not pwd_context.verify(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("is_verified") is False:
        otp = str(random.randint(100000, 999999))
        await db.otp_codes.delete_many({"email": credentials.email})
        await db.otp_codes.insert_one({
            "email": credentials.email,
            "otp": otp,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await _send_otp_email(credentials.email, otp, user.get("name", ""))
        return {"requires_otp": True, "email": credentials.email, "message": "Please verify your email first. OTP sent."}
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    user_resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_resp}


@api_router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user


@api_router.put("/auth/me")
async def update_me(body: dict, current_user=Depends(get_current_user)):
    update_data = {}
    for key in ["name", "phone", "language_preference"]:
        if key in body:
            update_data[key] = body[key]
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    return await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password_hash": 0})


@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user=Depends(get_current_user)):
    if current_user["role"] == "owner":
        properties = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    elif current_user.get("property_id"):
        prop = await db.properties.find_one({"id": current_user["property_id"]}, {"_id": 0})
        properties = [prop] if prop else []
    else:
        properties = []

    property_ids = [p["id"] for p in properties]

    if not property_ids:
        return {
            "total_properties": 0,
            "total_beds": 0,
            "occupied_beds": 0,
            "available_beds": 0,
            "total_tenants": 0,
            "open_complaints": 0,
            "occupancy_rate": 0,
            "total_expected_revenue": 0,
            "total_collected_revenue": 0,
            "pending_dues": 0,
            "recent_tenants": [],
        }

    total_beds = await db.beds.count_documents({"property_id": {"$in": property_ids}})
    occupied_beds = await db.beds.count_documents({"property_id": {"$in": property_ids}, "status": "occupied"})
    total_tenants = await db.tenants.count_documents({"property_id": {"$in": property_ids}, "status": "active"})
    open_complaints = await db.complaints.count_documents(
        {"property_id": {"$in": property_ids}, "status": {"$in": ["open", "in_progress"]}}
    )
    now = datetime.now(timezone.utc)
    invoices = await db.invoices.find(
        {"property_id": {"$in": property_ids}, "billing_month": now.month, "billing_year": now.year},
        {"_id": 0},
    ).to_list(1000)
    total_expected = sum(inv.get("total_amount", 0) for inv in invoices)
    total_collected = sum(inv.get("paid_amount", 0) for inv in invoices)
    occupancy_rate = round((occupied_beds / total_beds * 100) if total_beds > 0 else 0, 1)
    recent_tenants = await db.tenants.find(
        {"property_id": {"$in": property_ids}}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)

    return {
        "total_properties": len(properties),
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "available_beds": total_beds - occupied_beds,
        "total_tenants": total_tenants,
        "open_complaints": open_complaints,
        "occupancy_rate": occupancy_rate,
        "total_expected_revenue": total_expected,
        "total_collected_revenue": total_collected,
        "pending_dues": total_expected - total_collected,
        "recent_tenants": recent_tenants,
    }


# === Bulk Invoice Generation ===
@api_router.post("/invoices/bulk")
async def bulk_generate_invoices(body: dict, current_user=Depends(get_current_user)):
    property_id = body.get("property_id")
    billing_month = body.get("billing_month", datetime.now(timezone.utc).month)
    billing_year = body.get("billing_year", datetime.now(timezone.utc).year)
    include_food = body.get("include_food", False)
    tenants = await db.tenants.find(
        {"property_id": property_id, "status": "active"}, {"_id": 0}
    ).to_list(1000)
    mess_config = None
    if include_food:
        mess_config = await db.mess_configs.find_one(
            {"property_id": property_id, "is_active": True}, {"_id": 0}
        )
    created = []
    skipped = []
    for tenant in tenants:
        existing = await db.invoices.find_one({
            "tenant_id": tenant["id"],
            "billing_month": billing_month,
            "billing_year": billing_year,
        })
        if existing:
            skipped.append(tenant["name"])
            continue
        food_amount = 0
        if include_food and mess_config:
            plan = await db.tenant_meal_plans.find_one(
                {"tenant_id": tenant["id"], "is_active": True}, {"_id": 0}
            )
            if plan:
                if mess_config.get("tracking_mode") == "attendance":
                    date_prefix = f"{billing_year}-{str(billing_month).zfill(2)}"
                    att_count = await db.meal_attendance.count_documents(
                        {"tenant_id": tenant["id"], "date": {"$regex": f"^{date_prefix}"}, "present": True}
                    )
                    total_meal_types = len(mess_config.get("meal_types", ["breakfast", "lunch", "dinner"]))
                    per_meal_rate = round(mess_config.get("monthly_amount", 0) / (30 * total_meal_types), 2) if total_meal_types > 0 else 0
                    food_amount = round(att_count * per_meal_rate, 2)
                else:
                    food_amount = mess_config.get("monthly_amount", 0)
        visitor_fines = await db.visitors.find(
            {"tenant_id": tenant["id"], "status": "fined", "fine_billed": {"$ne": True}},
            {"_id": 0},
        ).to_list(100)
        other_charges = sum(v.get("fine_amount", 0) for v in visitor_fines)
        other_desc = ""
        if visitor_fines:
            other_desc = f"Visitor fines ({len(visitor_fines)})"
            for v in visitor_fines:
                await db.visitors.update_one({"id": v["id"]}, {"$set": {"fine_billed": True}})
        rent = tenant.get("monthly_rent", 0)
        total = rent + food_amount + other_charges
        invoice_num = f"INV-{billing_year}{str(billing_month).zfill(2)}-{str(uuid.uuid4())[:6].upper()}"
        invoice = {
            "id": str(uuid.uuid4()),
            "invoice_number": invoice_num,
            "tenant_id": tenant["id"],
            "tenant_name": tenant.get("name", ""),
            "property_id": property_id,
            "billing_month": billing_month,
            "billing_year": billing_year,
            "rent_amount": rent,
            "food_amount": food_amount,
            "other_charges": other_charges,
            "other_charges_desc": other_desc,
            "previous_balance": 0,
            "total_amount": total,
            "paid_amount": 0,
            "due_amount": total,
            "status": "pending",
            "due_date": "",
            "notes": "Auto-generated",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.invoices.insert_one(invoice)
        invoice.pop("_id", None)
        created.append(invoice)
    return {"created": len(created), "skipped": len(skipped), "skipped_names": skipped, "invoices": created}


# === Prorated Rent Calculation ===
@api_router.post("/invoices/prorate")
async def calculate_prorated_rent(body: dict, current_user=Depends(get_current_user)):
    monthly_rent = body.get("monthly_rent", 0)
    join_date_str = body.get("join_date")
    billing_month = body.get("billing_month", datetime.now(timezone.utc).month)
    billing_year = body.get("billing_year", datetime.now(timezone.utc).year)
    import calendar
    days_in_month = calendar.monthrange(billing_year, billing_month)[1]
    join_date = datetime.strptime(join_date_str, "%Y-%m-%d")
    if join_date.month == billing_month and join_date.year == billing_year:
        days_stayed = days_in_month - join_date.day + 1
    else:
        days_stayed = days_in_month
    daily_rate = monthly_rent / days_in_month
    prorated = round(daily_rate * days_stayed, 2)
    return {
        "monthly_rent": monthly_rent,
        "days_in_month": days_in_month,
        "days_stayed": days_stayed,
        "daily_rate": round(daily_rate, 2),
        "prorated_rent": prorated,
    }


# === PDF Invoice Generation ===
@api_router.get("/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf(invoice_id: str, current_user=Depends(get_current_user)):
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    tenant = await db.tenants.find_one({"id": invoice.get("tenant_id")}, {"_id": 0})
    prop = await db.properties.find_one({"id": invoice.get("property_id")}, {"_id": 0})
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    elements = []
    elements.append(Paragraph(f"<b>PGSaathi - Invoice</b>", styles["Title"]))
    elements.append(Spacer(1, 10))
    if prop:
        elements.append(Paragraph(f"{prop.get('name', '')} - {prop.get('address', '')}, {prop.get('city', '')}", styles["Normal"]))
    elements.append(Spacer(1, 15))
    elements.append(Paragraph(f"<b>Invoice #:</b> {invoice.get('invoice_number', '')}", styles["Normal"]))
    MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    month_name = MONTHS[invoice.get("billing_month", 1) - 1]
    elements.append(Paragraph(f"<b>Period:</b> {month_name} {invoice.get('billing_year', '')}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Tenant:</b> {invoice.get('tenant_name', '')}", styles["Normal"]))
    if tenant:
        elements.append(Paragraph(f"<b>Phone:</b> {tenant.get('phone', '')}", styles["Normal"]))
    elements.append(Spacer(1, 20))
    data = [["Description", "Amount (INR)"]]
    data.append(["Rent", f"{invoice.get('rent_amount', 0):,.2f}"])
    if invoice.get("food_amount", 0) > 0:
        data.append(["Food/Mess", f"{invoice.get('food_amount', 0):,.2f}"])
    if invoice.get("other_charges", 0) > 0:
        desc = invoice.get("other_charges_desc") or "Other"
        data.append([desc, f"{invoice.get('other_charges', 0):,.2f}"])
    if invoice.get("previous_balance", 0) > 0:
        data.append(["Previous Balance", f"{invoice.get('previous_balance', 0):,.2f}"])
    data.append(["Total", f"{invoice.get('total_amount', 0):,.2f}"])
    data.append(["Paid", f"{invoice.get('paid_amount', 0):,.2f}"])
    data.append(["Balance Due", f"{invoice.get('due_amount', 0):,.2f}"])
    table = Table(data, colWidths=[350, 150])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D97706")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E7E5E4")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#FEF3C7")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    status_text = invoice.get("status", "pending").upper()
    elements.append(Paragraph(f"<b>Status:</b> {status_text}", styles["Normal"]))
    if invoice.get("notes"):
        elements.append(Paragraph(f"<b>Notes:</b> {invoice.get('notes')}", styles["Normal"]))
    doc.build(elements)
    buf.seek(0)
    filename = f"Invoice_{invoice.get('invoice_number', 'N-A')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


# === Password Reset (self-service without email) ===
@api_router.post("/auth/reset-password")
async def reset_password(body: dict):
    email = body.get("email")
    new_password = body.get("new_password")
    if not email or not new_password:
        raise HTTPException(status_code=400, detail="Email and new_password are required")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")
    new_hash = pwd_context.hash(new_password)
    await db.users.update_one({"email": email}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password has been reset successfully"}


# Include all routers
api_router.include_router(properties_router, prefix="/properties", tags=["properties"])
api_router.include_router(floors_router, prefix="/floors", tags=["floors"])
api_router.include_router(rooms_router, prefix="/rooms", tags=["rooms"])
api_router.include_router(beds_router, prefix="/beds", tags=["beds"])
api_router.include_router(tenants_router, prefix="/tenants", tags=["tenants"])
api_router.include_router(invoices_router, prefix="/invoices", tags=["invoices"])
api_router.include_router(payments_router, prefix="/payments", tags=["payments"])
api_router.include_router(complaints_router, prefix="/complaints", tags=["complaints"])
api_router.include_router(mess_router, prefix="/mess", tags=["mess"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(notices_router, prefix="/notices", tags=["notices"])
api_router.include_router(housekeeping_router, prefix="/housekeeping", tags=["housekeeping"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(tenant_portal_router, prefix="/tenant-portal", tags=["tenant-portal"])
api_router.include_router(visitors_router, prefix="/visitors", tags=["visitors"])

app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    from database import client
    client.close()
