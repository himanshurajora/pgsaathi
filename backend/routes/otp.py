from fastapi import APIRouter, HTTPException
from database import db
from pydantic import BaseModel, EmailStr
from email_utils import send_otp_email
from datetime import datetime, timezone, timedelta
import random
import string

router = APIRouter()


class SendOTPRequest(BaseModel):
    email: EmailStr
    name: str


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


@router.post("/send")
async def send_otp(request: SendOTPRequest):
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.otps.update_one(
        {"email": request.email},
        {"$set": {"email": request.email, "otp": otp, "expires_at": expires_at.isoformat(), "verified": False, "attempts": 0}},
        upsert=True,
    )

    email_sent = send_otp_email(request.email, otp, request.name)

    response = {"message": "OTP sent successfully", "email_sent": email_sent}
    if not email_sent:
        response["dev_otp"] = otp
        response["dev_note"] = "SMTP not configured. Use this OTP for testing."

    return response


@router.post("/verify")
async def verify_otp(request: VerifyOTPRequest):
    record = await db.otps.find_one({"email": request.email})
    if not record:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")

    expires_at = datetime.fromisoformat(record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.otps.delete_one({"email": request.email})
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

    if record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new OTP.")

    if record["otp"] != request.otp:
        await db.otps.update_one({"email": request.email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    await db.otps.update_one({"email": request.email}, {"$set": {"verified": True}})
    return {"message": "Email verified successfully", "verified": True}
