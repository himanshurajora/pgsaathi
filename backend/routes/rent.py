from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from models import InvoiceCreate, InvoiceUpdate, PaymentCreate
from datetime import datetime, timezone
import uuid

invoices_router = APIRouter()
payments_router = APIRouter()


# =========== INVOICES ===========

@invoices_router.get("")
async def get_invoices(property_id: str = None, tenant_id: str = None, current_user=Depends(get_current_user)):
    query = {}
    if property_id:
        query["property_id"] = property_id
    elif current_user["role"] == "owner":
        props = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(1000)
        query["property_id"] = {"$in": [p["id"] for p in props]}
    elif current_user.get("property_id"):
        query["property_id"] = current_user["property_id"]
    if tenant_id:
        query["tenant_id"] = tenant_id
    return await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@invoices_router.post("")
async def create_invoice(data: InvoiceCreate, current_user=Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": data.tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    existing = await db.invoices.find_one({
        "tenant_id": data.tenant_id,
        "billing_month": data.billing_month,
        "billing_year": data.billing_year,
    })
    if existing:
        raise HTTPException(status_code=400, detail="Invoice already exists for this period")
    total = (data.rent_amount + (data.food_amount or 0) + (data.other_charges or 0) + (data.previous_balance or 0))
    invoice_num = f"INV-{datetime.now(timezone.utc).strftime('%Y%m')}-{str(uuid.uuid4())[:6].upper()}"
    invoice = {
        "id": str(uuid.uuid4()),
        "invoice_number": invoice_num,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant.get("name", ""),
        "property_id": data.property_id,
        "billing_month": data.billing_month,
        "billing_year": data.billing_year,
        "rent_amount": data.rent_amount,
        "food_amount": data.food_amount or 0,
        "other_charges": data.other_charges or 0,
        "other_charges_desc": data.other_charges_desc or "",
        "previous_balance": data.previous_balance or 0,
        "total_amount": total,
        "paid_amount": 0,
        "due_amount": total,
        "status": "pending",
        "due_date": data.due_date or "",
        "notes": data.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.invoices.insert_one(invoice)
    invoice.pop("_id", None)
    return invoice


@invoices_router.get("/{invoice_id}")
async def get_invoice(invoice_id: str, current_user=Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@invoices_router.put("/{invoice_id}")
async def update_invoice(invoice_id: str, data: InvoiceUpdate, current_user=Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    rent = update_data.get("rent_amount", invoice.get("rent_amount", 0))
    food = update_data.get("food_amount", invoice.get("food_amount", 0))
    other = update_data.get("other_charges", invoice.get("other_charges", 0))
    prev_bal = update_data.get("previous_balance", invoice.get("previous_balance", 0))
    total = rent + food + other + prev_bal
    paid = invoice.get("paid_amount", 0)
    update_data["total_amount"] = total
    update_data["due_amount"] = max(0, total - paid)
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})


@invoices_router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user=Depends(get_current_user)):
    await db.invoices.delete_one({"id": invoice_id})
    return {"message": "Invoice deleted"}


# =========== PAYMENTS ===========

@payments_router.get("")
async def get_payments(property_id: str = None, tenant_id: str = None, current_user=Depends(get_current_user)):
    query = {}
    if property_id:
        query["property_id"] = property_id
    if tenant_id:
        query["tenant_id"] = tenant_id
    return await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@payments_router.post("")
async def record_payment(data: PaymentCreate, current_user=Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": data.invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    receipt_num = f"RCP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    payment = {
        "id": str(uuid.uuid4()),
        "receipt_number": receipt_num,
        "invoice_id": data.invoice_id,
        "tenant_id": data.tenant_id,
        "property_id": data.property_id,
        "amount": data.amount,
        "payment_date": data.payment_date,
        "payment_mode": data.payment_mode,
        "notes": data.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "recorded_by": current_user["id"],
    }
    await db.payments.insert_one(payment)
    new_paid = invoice.get("paid_amount", 0) + data.amount
    new_due = max(0, invoice.get("total_amount", 0) - new_paid)
    new_status = "paid" if new_due <= 0 else "partial"
    await db.invoices.update_one(
        {"id": data.invoice_id},
        {"$set": {"paid_amount": new_paid, "due_amount": new_due, "status": new_status}},
    )
    payment.pop("_id", None)
    return payment
