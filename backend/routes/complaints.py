from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from models import ComplaintCreate, ComplaintUpdate
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("")
async def get_complaints(property_id: str = None, status: str = None, current_user=Depends(get_current_user)):
    query = {}
    if property_id:
        query["property_id"] = property_id
    elif current_user["role"] == "owner":
        props = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(1000)
        query["property_id"] = {"$in": [p["id"] for p in props]}
    elif current_user.get("property_id"):
        query["property_id"] = current_user["property_id"]
    if status:
        query["status"] = status
    return await db.complaints.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.post("")
async def create_complaint(data: ComplaintCreate, current_user=Depends(get_current_user)):
    complaint = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["id"],
        "tenant_name": current_user.get("name", ""),
        "property_id": data.property_id,
        "category": data.category,
        "title": data.title,
        "description": data.description,
        "priority": data.priority,
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


@router.get("/{complaint_id}")
async def get_complaint(complaint_id: str, current_user=Depends(get_current_user)):
    complaint = await db.complaints.find_one({"id": complaint_id}, {"_id": 0})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.put("/{complaint_id}")
async def update_complaint(complaint_id: str, data: ComplaintUpdate, current_user=Depends(get_current_user)):
    complaint = await db.complaints.find_one({"id": complaint_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update_data.get("status") in ("resolved", "closed"):
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    await db.complaints.update_one({"id": complaint_id}, {"$set": update_data})
    return await db.complaints.find_one({"id": complaint_id}, {"_id": 0})


@router.delete("/{complaint_id}")
async def delete_complaint(complaint_id: str, current_user=Depends(get_current_user)):
    await db.complaints.delete_one({"id": complaint_id})
    return {"message": "Complaint deleted"}
