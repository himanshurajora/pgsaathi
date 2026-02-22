from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user, pwd_context
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("")
async def get_users(role: str = None, current_user=Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only owners can view users")
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users


@router.post("")
async def create_user(body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only owners can create users")
    existing = await db.users.find_one({"email": body["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": body["email"],
        "name": body["name"],
        "password_hash": pwd_context.hash(body["password"]),
        "role": body.get("role", "warden"),
        "property_id": body.get("property_id"),
        "phone": body.get("phone", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
    }
    await db.users.insert_one(user)
    user.pop("_id", None)
    user.pop("password_hash", None)
    return user


@router.put("/{user_id}")
async def update_user(user_id: str, body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only owners can update users")
    update_data = {}
    for key in ["name", "role", "property_id", "phone", "is_active"]:
        if key in body:
            update_data[key] = body[key]
    if "password" in body and body["password"]:
        update_data["password_hash"] = pwd_context.hash(body["password"])
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    return await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})


@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only owners can delete users")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted"}


@router.put("/me/password")
async def change_password(body: dict, current_user=Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not pwd_context.verify(body.get("current_password", ""), user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_hash = pwd_context.hash(body["new_password"])
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password changed successfully"}
