from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user, pwd_context
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("")
async def get_users(role: str = None, current_user=Depends(get_current_user)):
    if current_user["role"] not in ("owner", "superadmin"):
        raise HTTPException(status_code=403, detail="Only owners can view users")

    # Superadmins can see everyone; owners only see users they created
    # or users assigned to their properties
    if current_user["role"] == "superadmin":
        query = {}
    else:
        # Get all property IDs owned by this owner
        owner_properties = await db.properties.find(
            {"owner_id": current_user["id"]}, {"id": 1}
        ).to_list(1000)
        owner_property_ids = [p["id"] for p in owner_properties]

        query = {
            "$and": [
                {"id": {"$ne": current_user["id"]}},  # exclude self
                {
                    "$or": [
                        {"created_by": current_user["id"]},
                        {"property_id": {"$in": owner_property_ids}},
                    ]
                },
            ]
        }

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
    if current_user["role"] not in ("owner", "superadmin"):
        raise HTTPException(status_code=403, detail="Only owners can update users")

    # Verify the target user belongs to this owner (unless superadmin)
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user["role"] == "owner":
        owner_properties = await db.properties.find(
            {"owner_id": current_user["id"]}, {"id": 1}
        ).to_list(1000)
        owner_property_ids = [p["id"] for p in owner_properties]
        is_own_user = (
            target_user.get("created_by") == current_user["id"]
            or target_user.get("property_id") in owner_property_ids
        )
        if not is_own_user:
            raise HTTPException(status_code=403, detail="You can only manage users under your properties")

    update_data = {}
    for key in ["name", "role", "property_id", "phone", "is_active"]:
        if key in body:
            update_data[key] = body[key]
    if "password" in body and body["password"]:
        update_data["password_hash"] = pwd_context.hash(body["password"])
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    return await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})


@router.put("/{user_id}/deactivate")
async def deactivate_user(user_id: str, current_user=Depends(get_current_user)):
    """Deactivate a user instead of deleting. Deletion is not allowed."""
    if current_user["role"] not in ("owner", "superadmin"):
        raise HTTPException(status_code=403, detail="Only owners can deactivate users")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify ownership (unless superadmin)
    if current_user["role"] == "owner":
        owner_properties = await db.properties.find(
            {"owner_id": current_user["id"]}, {"id": 1}
        ).to_list(1000)
        owner_property_ids = [p["id"] for p in owner_properties]
        is_own_user = (
            target_user.get("created_by") == current_user["id"]
            or target_user.get("property_id") in owner_property_ids
        )
        if not is_own_user:
            raise HTTPException(status_code=403, detail="You can only manage users under your properties")

    new_status = not target_user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    return {"message": f"User {'activated' if new_status else 'deactivated'}", "is_active": new_status}


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
