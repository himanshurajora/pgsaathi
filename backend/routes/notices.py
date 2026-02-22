from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("")
async def get_notices(property_id: str = None, current_user=Depends(get_current_user)):
    query = {}
    if property_id:
        query["property_id"] = property_id
    elif current_user["role"] == "owner":
        props = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(1000)
        query["property_id"] = {"$in": [p["id"] for p in props]}
    elif current_user.get("property_id"):
        query["property_id"] = current_user["property_id"]
    notices = await db.notices.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notices


@router.post("")
async def create_notice(body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] == "tenant":
        raise HTTPException(status_code=403, detail="Tenants cannot create notices")
    notice = {
        "id": str(uuid.uuid4()),
        "property_id": body.get("property_id", ""),
        "title": body["title"],
        "content": body.get("content", ""),
        "priority": body.get("priority", "normal"),
        "is_pinned": body.get("is_pinned", False),
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": body.get("expires_at"),
    }
    await db.notices.insert_one(notice)
    notice.pop("_id", None)
    return notice


@router.put("/{notice_id}")
async def update_notice(notice_id: str, body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] == "tenant":
        raise HTTPException(status_code=403, detail="Tenants cannot update notices")
    update_data = {}
    for key in ["title", "content", "priority", "is_pinned", "expires_at"]:
        if key in body:
            update_data[key] = body[key]
    if update_data:
        await db.notices.update_one({"id": notice_id}, {"$set": update_data})
    return await db.notices.find_one({"id": notice_id}, {"_id": 0})


@router.delete("/{notice_id}")
async def delete_notice(notice_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] == "tenant":
        raise HTTPException(status_code=403, detail="Tenants cannot delete notices")
    await db.notices.delete_one({"id": notice_id})
    return {"message": "Notice deleted"}
