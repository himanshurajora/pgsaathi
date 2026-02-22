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
