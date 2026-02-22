from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("")
async def get_notifications(current_user=Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    notifs = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notifs


@router.get("/unread-count")
async def get_unread_count(current_user=Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": current_user["id"], "is_read": False})
    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_read(notification_id: str, current_user=Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Marked as read"}


@router.put("/read-all")
async def mark_all_read(current_user=Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "All marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, current_user=Depends(get_current_user)):
    await db.notifications.delete_one({"id": notification_id, "user_id": current_user["id"]})
    return {"message": "Notification deleted"}


async def create_notification(user_id: str, title: str, message: str, notif_type: str = "info", link: str = ""):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "link": link,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notif)
    return notif
