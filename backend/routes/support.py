from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter()

SUPPORT_EMAIL = "contact@pgsaathi.online"


@router.get("/info")
async def get_support_info(current_user=Depends(get_current_user)):
    """Return support contact info."""
    return {"email": SUPPORT_EMAIL}


# --- Product Feedback ---

@router.get("/product-feedback")
async def list_product_feedback(current_user=Depends(get_current_user)):
    """List product feedback. Owners/wardens see all; tenants see their own."""
    query = {}
    if current_user["role"] == "tenant":
        query["user_id"] = current_user["id"]
    items = await db.product_feedback.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@router.post("/product-feedback")
async def create_product_feedback(body: dict, current_user=Depends(get_current_user)):
    """Submit product feedback about PGSaathi itself."""
    rating = body.get("rating")
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    comment = body.get("comment", "").strip()
    if not comment:
        raise HTTPException(status_code=400, detail="Comment is required")
    category = body.get("category", "general")
    if category not in ("ui", "features", "performance", "billing", "general"):
        raise HTTPException(status_code=400, detail="Invalid category")

    entry = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user.get("name", ""),
        "user_email": current_user.get("email", ""),
        "user_role": current_user.get("role", ""),
        "category": category,
        "rating": rating,
        "comment": comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.product_feedback.insert_one(entry)
    entry.pop("_id", None)
    return entry


# --- Questions / Support Tickets ---

@router.get("/questions")
async def list_questions(current_user=Depends(get_current_user)):
    """List support questions. Owners/wardens see all; tenants see their own."""
    query = {}
    if current_user["role"] == "tenant":
        query["user_id"] = current_user["id"]
    items = await db.support_questions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@router.post("/questions")
async def create_question(body: dict, current_user=Depends(get_current_user)):
    """Submit a support question."""
    subject = body.get("subject", "").strip()
    message = body.get("message", "").strip()
    if not subject:
        raise HTTPException(status_code=400, detail="Subject is required")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    entry = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user.get("name", ""),
        "user_email": current_user.get("email", ""),
        "user_role": current_user.get("role", ""),
        "subject": subject,
        "message": message,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.support_questions.insert_one(entry)
    entry.pop("_id", None)
    return entry
