from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from models import TenantCreate, TenantUpdate, BedAllocation
from datetime import datetime, timezone
import uuid

router = APIRouter()


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
        "status": "active",
        "bed_id": None,
        "room_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
    }
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


@router.delete("/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.get("bed_id"):
        await db.beds.update_one({"id": tenant["bed_id"]}, {"$set": {"status": "available", "tenant_id": None}})
    await db.tenants.delete_one({"id": tenant_id})
    return {"message": "Tenant deleted"}
