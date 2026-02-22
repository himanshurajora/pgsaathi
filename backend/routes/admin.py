from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from datetime import datetime, timezone

router = APIRouter()


def require_superadmin(current_user: dict):
    """Check if the user is a superadmin."""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


@router.get("/stats")
async def admin_stats(current_user=Depends(get_current_user)):
    """Get platform-wide stats: total users, owners, properties, tenants."""
    require_superadmin(current_user)

    total_users = await db.users.count_documents({})
    total_owners = await db.users.count_documents({"role": "owner"})
    total_wardens = await db.users.count_documents({"role": "warden"})
    total_tenants_users = await db.users.count_documents({"role": "tenant"})
    total_properties = await db.properties.count_documents({})
    total_tenants = await db.tenants.count_documents({"status": "active"})
    total_feedback = await db.product_feedback.count_documents({})
    total_questions = await db.support_questions.count_documents({})
    open_questions = await db.support_questions.count_documents({"status": "open"})

    return {
        "total_users": total_users,
        "total_owners": total_owners,
        "total_wardens": total_wardens,
        "total_tenants_users": total_tenants_users,
        "total_properties": total_properties,
        "total_active_tenants": total_tenants,
        "total_product_feedback": total_feedback,
        "total_support_questions": total_questions,
        "open_support_questions": open_questions,
    }


@router.get("/owners")
async def list_owners(current_user=Depends(get_current_user)):
    """List all property owners with their property count."""
    require_superadmin(current_user)

    owners = await db.users.find(
        {"role": "owner"},
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).to_list(5000)

    # Enrich with property count
    for owner in owners:
        prop_count = await db.properties.count_documents({"owner_id": owner["id"]})
        owner["property_count"] = prop_count

    return owners


@router.put("/owners/{owner_id}/ban")
async def ban_owner(owner_id: str, current_user=Depends(get_current_user)):
    """Ban a property owner (set is_active to False)."""
    require_superadmin(current_user)

    owner = await db.users.find_one({"id": owner_id, "role": "owner"})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    if owner_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")

    await db.users.update_one(
        {"id": owner_id},
        {"$set": {"is_active": False, "banned_at": datetime.now(timezone.utc).isoformat(), "banned_by": current_user["id"]}}
    )
    return {"message": f"Owner {owner.get('name', '')} has been banned"}


@router.put("/owners/{owner_id}/unban")
async def unban_owner(owner_id: str, current_user=Depends(get_current_user)):
    """Unban a property owner (set is_active to True)."""
    require_superadmin(current_user)

    owner = await db.users.find_one({"id": owner_id, "role": "owner"})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    await db.users.update_one(
        {"id": owner_id},
        {"$set": {"is_active": True}, "$unset": {"banned_at": "", "banned_by": ""}}
    )
    return {"message": f"Owner {owner.get('name', '')} has been unbanned"}


@router.get("/product-feedback")
async def all_product_feedback(current_user=Depends(get_current_user)):
    """Get all product feedback across all users."""
    require_superadmin(current_user)
    return await db.product_feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)


@router.get("/support-questions")
async def all_support_questions(current_user=Depends(get_current_user)):
    """Get all support questions across all users."""
    require_superadmin(current_user)
    return await db.support_questions.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)


@router.put("/support-questions/{question_id}/resolve")
async def resolve_question(question_id: str, current_user=Depends(get_current_user)):
    """Mark a support question as resolved."""
    require_superadmin(current_user)
    result = await db.support_questions.update_one(
        {"id": question_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc).isoformat(), "resolved_by": current_user["id"]}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question marked as resolved"}
