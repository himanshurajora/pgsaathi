"""
Seed a superadmin user in the database.
Usage: python create_superadmin.py

This will create or update a superadmin account with:
  email: admin@pgsaathi.online
  password: SuperAdmin@2026

You can change these below before running.
"""
import asyncio
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
from database import db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SUPERADMIN_EMAIL = "admin@pgsaathi.online"
SUPERADMIN_PASSWORD = "SuperAdmin@2026"
SUPERADMIN_NAME = "Super Admin"


async def main():
    existing = await db.users.find_one({"email": SUPERADMIN_EMAIL})
    if existing:
        await db.users.update_one(
            {"email": SUPERADMIN_EMAIL},
            {"$set": {"role": "superadmin", "is_verified": True, "is_active": True}}
        )
        print(f"Updated existing user '{SUPERADMIN_EMAIL}' to superadmin role.")
    else:
        user = {
            "id": str(uuid.uuid4()),
            "email": SUPERADMIN_EMAIL,
            "name": SUPERADMIN_NAME,
            "password_hash": pwd_context.hash(SUPERADMIN_PASSWORD),
            "role": "superadmin",
            "property_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True,
            "is_verified": True,
        }
        await db.users.insert_one(user)
        print(f"Created superadmin user: {SUPERADMIN_EMAIL}")

    print(f"\nLogin credentials:")
    print(f"  Email:    {SUPERADMIN_EMAIL}")
    print(f"  Password: {SUPERADMIN_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
