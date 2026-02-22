from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("")
async def get_feedback(property_id: str = None, category: str = None, current_user=Depends(get_current_user)):
    query = {}
    if current_user["role"] == "tenant":
        tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
        if tenant:
            query["tenant_id"] = tenant["id"]
    else:
        if property_id:
            query["property_id"] = property_id
        elif current_user["role"] == "owner":
            props = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(1000)
            query["property_id"] = {"$in": [p["id"] for p in props]}
        elif current_user.get("property_id"):
            query["property_id"] = current_user["property_id"]
    if category:
        query["category"] = category
    return await db.feedback.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("")
async def create_feedback(body: dict, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"email": current_user["email"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=400, detail="Tenant profile not found")
    category = body.get("category", "general")
    if category not in ("food", "cleanliness", "maintenance", "staff", "general"):
        raise HTTPException(status_code=400, detail="Invalid category")
    rating = body.get("rating")
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    feedback = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant["id"],
        "tenant_name": tenant.get("name", ""),
        "property_id": tenant.get("property_id", ""),
        "category": category,
        "rating": rating,
        "comment": body.get("comment", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.feedback.insert_one(feedback)
    feedback.pop("_id", None)
    return feedback


@router.get("/summary")
async def feedback_summary(property_id: str = None, current_user=Depends(get_current_user)):
    query = {}
    if property_id:
        query["property_id"] = property_id
    elif current_user["role"] == "owner":
        props = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(1000)
        query["property_id"] = {"$in": [p["id"] for p in props]}
    elif current_user.get("property_id"):
        query["property_id"] = current_user["property_id"]
    all_feedback = await db.feedback.find(query, {"_id": 0}).to_list(5000)
    if not all_feedback:
        return {"total": 0, "average_rating": 0, "category_averages": {}, "recent": []}
    total = len(all_feedback)
    avg = round(sum(f["rating"] for f in all_feedback) / total, 1)
    categories = {}
    for f in all_feedback:
        cat = f.get("category", "general")
        if cat not in categories:
            categories[cat] = {"sum": 0, "count": 0}
        categories[cat]["sum"] += f["rating"]
        categories[cat]["count"] += 1
    cat_avgs = {k: round(v["sum"] / v["count"], 1) for k, v in categories.items()}
    recent = sorted(all_feedback, key=lambda x: x.get("created_at", ""), reverse=True)[:10]
    return {"total": total, "average_rating": avg, "category_averages": cat_avgs, "recent": recent}


@router.delete("/{feedback_id}")
async def delete_feedback(feedback_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] == "tenant":
        raise HTTPException(status_code=403, detail="Only admin can delete feedback")
    await db.feedback.delete_one({"id": feedback_id})
    return {"message": "Feedback deleted"}
