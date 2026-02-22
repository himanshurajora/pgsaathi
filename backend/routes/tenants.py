from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from database import db
from auth_utils import get_current_user
from models import TenantCreate, TenantUpdate, BedAllocation
from datetime import datetime, timezone
import uuid
import os
import shutil
from pathlib import Path

router = APIRouter()
UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "kyc"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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
