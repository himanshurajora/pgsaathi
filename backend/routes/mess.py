from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from models import MessConfigCreate, MessConfigUpdate, TenantMealPlanCreate, TenantMealPlanUpdate
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("/config")
async def get_mess_configs(property_id: str = None, current_user=Depends(get_current_user)):
    query = {}
    if property_id:
        query["property_id"] = property_id
    elif current_user["role"] == "owner":
        props = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(1000)
        query["property_id"] = {"$in": [p["id"] for p in props]}
    elif current_user.get("property_id"):
        query["property_id"] = current_user["property_id"]
    return await db.mess_configs.find(query, {"_id": 0}).to_list(100)


@router.post("/config")
async def create_mess_config(data: MessConfigCreate, current_user=Depends(get_current_user)):
    await db.mess_configs.update_many({"property_id": data.property_id}, {"$set": {"is_active": False}})
    config = {
        "id": str(uuid.uuid4()),
        "property_id": data.property_id,
        "monthly_amount": data.monthly_amount,
        "meal_types": data.meal_types,
        "veg_nonveg": data.veg_nonveg,
        "tracking_mode": data.tracking_mode,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.mess_configs.insert_one(config)
    config.pop("_id", None)
    return config


@router.put("/config/{config_id}")
async def update_mess_config(config_id: str, data: MessConfigUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.mess_configs.update_one({"id": config_id}, {"$set": update_data})
    return await db.mess_configs.find_one({"id": config_id}, {"_id": 0})


@router.get("/plans")
async def get_meal_plans(property_id: str = None, tenant_id: str = None, current_user=Depends(get_current_user)):
    query = {}
    if property_id:
        query["property_id"] = property_id
    if tenant_id:
        query["tenant_id"] = tenant_id
    return await db.tenant_meal_plans.find(query, {"_id": 0}).to_list(1000)


@router.post("/plans")
async def create_meal_plan(data: TenantMealPlanCreate, current_user=Depends(get_current_user)):
    plan = {
        "id": str(uuid.uuid4()),
        "tenant_id": data.tenant_id,
        "property_id": data.property_id,
        "opted_meals": data.opted_meals,
        "is_active": True,
        "start_date": data.start_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tenant_meal_plans.insert_one(plan)
    plan.pop("_id", None)
    return plan


@router.put("/plans/{plan_id}")
async def update_meal_plan(plan_id: str, data: TenantMealPlanUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.tenant_meal_plans.update_one({"id": plan_id}, {"$set": update_data})
    return await db.tenant_meal_plans.find_one({"id": plan_id}, {"_id": 0})


# === MEAL ATTENDANCE ===

@router.post("/attendance")
async def mark_attendance(body: dict, current_user=Depends(get_current_user)):
    tenant_id = body.get("tenant_id")
    meal_type = body.get("meal_type")
    date = body.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    is_tenant = current_user["role"] == "tenant"
    if is_tenant:
        tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
        if not tenant:
            raise HTTPException(status_code=400, detail="Tenant profile not found")
        tenant_id = tenant["id"]
        existing = await db.meal_attendance.find_one({
            "tenant_id": tenant_id, "meal_type": meal_type, "date": date,
        })
        if existing:
            raise HTTPException(status_code=400, detail="Attendance already marked for this meal today")
    elif not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")
    plan = await db.tenant_meal_plans.find_one({"tenant_id": tenant_id, "is_active": True}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=400, detail="No active meal plan for this tenant")
    if meal_type not in (plan.get("opted_meals") or []):
        raise HTTPException(status_code=400, detail=f"Tenant is not registered for {meal_type}")
    existing = await db.meal_attendance.find_one({
        "tenant_id": tenant_id, "meal_type": meal_type, "date": date,
    })
    if existing:
        if is_tenant:
            raise HTTPException(status_code=400, detail="Already marked")
        await db.meal_attendance.update_one(
            {"id": existing["id"]},
            {"$set": {"present": body.get("present", True), "marked_by": current_user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        updated = await db.meal_attendance.find_one({"id": existing["id"]}, {"_id": 0})
        return updated
    record = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "property_id": plan.get("property_id", ""),
        "meal_type": meal_type,
        "date": date,
        "present": body.get("present", True),
        "marked_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.meal_attendance.insert_one(record)
    record.pop("_id", None)
    return record


@router.get("/attendance")
async def get_attendance(tenant_id: str = None, date: str = None, month: int = None, year: int = None, current_user=Depends(get_current_user)):
    query = {}
    if current_user["role"] == "tenant":
        tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
        if tenant:
            query["tenant_id"] = tenant["id"]
    elif tenant_id:
        query["tenant_id"] = tenant_id
    if date:
        query["date"] = date
    elif month and year:
        query["date"] = {"$regex": f"^{year}-{str(month).zfill(2)}"}
    return await db.meal_attendance.find(query, {"_id": 0}).sort("date", -1).to_list(2000)


@router.get("/attendance/today")
async def get_today_attendance(current_user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if current_user["role"] == "tenant":
        tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
        if not tenant:
            return {"plan": None, "attendance": [], "config": None}
        plan = await db.tenant_meal_plans.find_one({"tenant_id": tenant["id"], "is_active": True}, {"_id": 0})
        attendance = await db.meal_attendance.find({"tenant_id": tenant["id"], "date": today}, {"_id": 0}).to_list(10)
        config = None
        if tenant.get("property_id"):
            config = await db.mess_configs.find_one({"property_id": tenant["property_id"], "is_active": True}, {"_id": 0})
        return {"plan": plan, "attendance": attendance, "config": config}
    return {"plan": None, "attendance": [], "config": None}


@router.get("/attendance/summary")
async def attendance_summary(tenant_id: str, month: int, year: int, current_user=Depends(get_current_user)):
    date_prefix = f"{year}-{str(month).zfill(2)}"
    records = await db.meal_attendance.find(
        {"tenant_id": tenant_id, "date": {"$regex": f"^{date_prefix}"}, "present": True},
        {"_id": 0},
    ).to_list(500)
    meal_counts = {}
    for r in records:
        mt = r.get("meal_type", "")
        meal_counts[mt] = meal_counts.get(mt, 0) + 1
    total_meals = sum(meal_counts.values())
    plan = await db.tenant_meal_plans.find_one({"tenant_id": tenant_id, "is_active": True}, {"_id": 0})
    config = None
    per_meal_rate = 0
    if plan and plan.get("property_id"):
        config = await db.mess_configs.find_one(
            {"property_id": plan["property_id"], "is_active": True}, {"_id": 0}
        )
        if config and config.get("tracking_mode") == "attendance":
            total_meal_types = len(config.get("meal_types", ["breakfast", "lunch", "dinner"]))
            monthly_amount = config.get("monthly_amount", 0)
            per_meal_rate = round(monthly_amount / (30 * total_meal_types), 2) if total_meal_types > 0 else 0
    total_amount = round(total_meals * per_meal_rate, 2)
    return {
        "tenant_id": tenant_id,
        "month": month,
        "year": year,
        "meal_counts": meal_counts,
        "total_meals": total_meals,
        "per_meal_rate": per_meal_rate,
        "total_amount": total_amount,
    }
