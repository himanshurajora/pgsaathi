from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("")
async def get_tasks(property_id: str = None, status: str = None, task_type: str = None, current_user=Depends(get_current_user)):
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
    if task_type:
        query["task_type"] = task_type
    return await db.housekeeping.find(query, {"_id": 0}).sort("scheduled_date", -1).to_list(1000)


@router.post("")
async def create_task(body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] == "tenant":
        raise HTTPException(status_code=403, detail="Tenants cannot create housekeeping tasks")
    task = {
        "id": str(uuid.uuid4()),
        "property_id": body["property_id"],
        "task_type": body.get("task_type", "cleaning"),
        "title": body["title"],
        "description": body.get("description", ""),
        "assigned_to": body.get("assigned_to", ""),
        "room_id": body.get("room_id"),
        "floor_id": body.get("floor_id"),
        "scheduled_date": body.get("scheduled_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "recurrence": body.get("recurrence", "once"),
        "status": "pending",
        "priority": body.get("priority", "medium"),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    await db.housekeeping.insert_one(task)
    task.pop("_id", None)
    return task


@router.put("/{task_id}")
async def update_task(task_id: str, body: dict, current_user=Depends(get_current_user)):
    update_data = {}
    for key in ["title", "description", "assigned_to", "scheduled_date", "recurrence", "status", "priority"]:
        if key in body:
            update_data[key] = body[key]
    if update_data.get("status") == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.housekeeping.update_one({"id": task_id}, {"$set": update_data})
    return await db.housekeeping.find_one({"id": task_id}, {"_id": 0})


@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user=Depends(get_current_user)):
    await db.housekeeping.delete_one({"id": task_id})
    return {"message": "Task deleted"}
