from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("/dashboard")
async def tenant_dashboard(current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
    if not tenant:
        return {
            "tenant": None,
            "bed_info": None,
            "room_info": None,
            "property_info": None,
            "pending_dues": 0,
            "open_complaints": 0,
            "meal_plan": None,
            "recent_invoices": [],
            "recent_notices": [],
        }
    bed_info = None
    room_info = None
    property_info = None
    if tenant.get("bed_id"):
        bed_info = await db.beds.find_one({"id": tenant["bed_id"]}, {"_id": 0})
    if tenant.get("room_id"):
        room_info = await db.rooms.find_one({"id": tenant["room_id"]}, {"_id": 0})
    if tenant.get("property_id"):
        property_info = await db.properties.find_one({"id": tenant["property_id"]}, {"_id": 0})
    invoices = await db.invoices.find({"tenant_id": tenant["id"]}, {"_id": 0}).sort("created_at", -1).to_list(10)
    pending_dues = sum(inv.get("due_amount", 0) for inv in invoices if inv.get("status") != "paid")
    open_complaints = await db.complaints.count_documents(
        {"tenant_id": current_user["id"], "status": {"$in": ["open", "in_progress"]}}
    )
    meal_plan = await db.tenant_meal_plans.find_one(
        {"tenant_id": tenant["id"], "is_active": True}, {"_id": 0}
    )
    notices = []
    if tenant.get("property_id"):
        notices = await db.notices.find(
            {"property_id": tenant["property_id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(5)
    return {
        "tenant": tenant,
        "bed_info": bed_info,
        "room_info": room_info,
        "property_info": property_info,
        "pending_dues": pending_dues,
        "open_complaints": open_complaints,
        "meal_plan": meal_plan,
        "recent_invoices": invoices,
        "recent_notices": notices,
    }


@router.get("/invoices")
async def tenant_invoices(current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
    if not tenant:
        return []
    return await db.invoices.find({"tenant_id": tenant["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@router.get("/payments")
async def tenant_payments(current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
    if not tenant:
        return []
    return await db.payments.find({"tenant_id": tenant["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@router.get("/complaints")
async def tenant_complaints(current_user=Depends(get_current_user)):
    return await db.complaints.find(
        {"tenant_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)


@router.post("/complaints")
async def tenant_create_complaint(body: dict, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
    property_id = body.get("property_id") or (tenant["property_id"] if tenant else "")
    complaint = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["id"],
        "tenant_name": current_user.get("name", ""),
        "property_id": property_id,
        "category": body.get("category", "other"),
        "title": body["title"],
        "description": body.get("description", ""),
        "priority": body.get("priority", "medium"),
        "status": "open",
        "assigned_to": None,
        "resolution_notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
    }
    await db.complaints.insert_one(complaint)
    complaint.pop("_id", None)
    return complaint


@router.get("/meal-plan")
async def tenant_meal_plan(current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
    if not tenant:
        return None
    plan = await db.tenant_meal_plans.find_one(
        {"tenant_id": tenant["id"], "is_active": True}, {"_id": 0}
    )
    config = None
    if tenant.get("property_id"):
        config = await db.mess_configs.find_one(
            {"property_id": tenant["property_id"], "is_active": True}, {"_id": 0}
        )
    return {"plan": plan, "config": config}


@router.get("/notices")
async def tenant_notices(current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
    if not tenant or not tenant.get("property_id"):
        return []
    return await db.notices.find(
        {"property_id": tenant["property_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
