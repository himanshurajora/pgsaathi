from fastapi import FastAPI, APIRouter, Depends, HTTPException
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import uuid
import os
import logging
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="PGSaathi API", version="1.0.0")
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
    return {"message": "PGSaathi API running", "version": "1.0.0"}


@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
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
    }
    await db.users.insert_one(user)
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    user_resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_resp}


@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not pwd_context.verify(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    user_resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_resp}


@api_router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user


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

app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    from database import client
    client.close()
