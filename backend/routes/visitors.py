from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("")
async def get_visitors(property_id: str = None, status: str = None, current_user=Depends(get_current_user)):
    query = {}
    if property_id:
        query["property_id"] = property_id
    elif current_user["role"] == "tenant":
        tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
        if tenant and tenant.get("property_id"):
            query["property_id"] = tenant["property_id"]
            query["tenant_id"] = tenant["id"]
    elif current_user["role"] == "owner":
        props = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(1000)
        query["property_id"] = {"$in": [p["id"] for p in props]}
    elif current_user.get("property_id"):
        query["property_id"] = current_user["property_id"]
    if status:
        query["status"] = status
    return await db.visitors.find(query, {"_id": 0}).sort("visit_date", -1).to_list(500)


@router.post("")
async def request_visitor(body: dict, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=400, detail="Tenant profile not found")
    prop = await db.properties.find_one({"id": tenant.get("property_id")}, {"_id": 0})
    if not prop or not prop.get("allows_visitors", True):
        raise HTTPException(status_code=403, detail="This property does not allow visitors")
    visitor = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant["id"],
        "tenant_name": tenant.get("name", ""),
        "property_id": tenant.get("property_id", ""),
        "room_id": tenant.get("room_id"),
        "visitor_name": body["visitor_name"],
        "visitor_phone": body.get("visitor_phone", ""),
        "relation": body.get("relation", ""),
        "purpose": body.get("purpose", ""),
        "visit_date": body["visit_date"],
        "visit_time": body.get("visit_time", ""),
        "expected_duration": body.get("expected_duration", ""),
        "status": "pending",
        "fine_amount": 0,
        "fine_reason": "",
        "approved_by": None,
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.visitors.insert_one(visitor)
    visitor.pop("_id", None)
    return visitor


@router.put("/{visitor_id}")
async def update_visitor(visitor_id: str, body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] == "tenant":
        raise HTTPException(status_code=403, detail="Only admin/warden can update visitor status")
    update = {}
    if "status" in body:
        update["status"] = body["status"]
        if body["status"] in ("approved", "rejected"):
            update["approved_by"] = current_user["id"]
    if "notes" in body:
        update["notes"] = body["notes"]
    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.visitors.update_one({"id": visitor_id}, {"$set": update})
    return await db.visitors.find_one({"id": visitor_id}, {"_id": 0})


@router.post("/{visitor_id}/fine")
async def impose_fine(visitor_id: str, body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] == "tenant":
        raise HTTPException(status_code=403, detail="Only admin/warden can impose fines")
    visitor = await db.visitors.find_one({"id": visitor_id}, {"_id": 0})
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor record not found")
    fine_amount = body.get("fine_amount", 0)
    fine_reason = body.get("fine_reason", "Unauthorized visitor")
    await db.visitors.update_one(
        {"id": visitor_id},
        {"$set": {
            "fine_amount": fine_amount,
            "fine_reason": fine_reason,
            "status": "fined",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    from routes.notifications import create_notification
    await create_notification(
        user_id=visitor["tenant_id"],
        title="Visitor Fine Imposed",
        message=f"A fine of INR {fine_amount} has been imposed. Reason: {fine_reason}",
        notif_type="warning",
    )
    return await db.visitors.find_one({"id": visitor_id}, {"_id": 0})


@router.delete("/{visitor_id}")
async def delete_visitor(visitor_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] == "tenant":
        raise HTTPException(status_code=403, detail="Only admin/warden can delete visitor records")
    await db.visitors.delete_one({"id": visitor_id})
    return {"message": "Visitor record deleted"}
