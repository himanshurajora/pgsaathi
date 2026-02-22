from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["owner", "warden", "tenant"] = "owner"
    property_id: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PropertyCreate(BaseModel):
    name: str
    address: str
    city: str
    state: str
    gender_type: Literal["boys", "girls", "co-living"]
    house_rules: Optional[str] = ""
    contact_phone: Optional[str] = ""


class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gender_type: Optional[str] = None
    house_rules: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None


class FloorCreate(BaseModel):
    floor_number: int
    name: str


class FloorUpdate(BaseModel):
    name: Optional[str] = None
    floor_number: Optional[int] = None


class RoomCreate(BaseModel):
    room_number: str
    room_type: Literal["single", "double", "triple", "dormitory"]
    capacity: int
    amenities: Optional[List[str]] = []


class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    room_type: Optional[str] = None
    status: Optional[Literal["available", "full", "maintenance"]] = None
    capacity: Optional[int] = None
    amenities: Optional[List[str]] = None


class BedCreate(BaseModel):
    bed_number: str
    price: float


class BedUpdate(BaseModel):
    bed_number: Optional[str] = None
    price: Optional[float] = None
    status: Optional[Literal["available", "occupied", "maintenance"]] = None


class TenantCreate(BaseModel):
    name: str
    email: str
    phone: str
    check_in_date: str
    emergency_contact_name: str
    emergency_contact_phone: str
    security_deposit: Optional[float] = 0
    monthly_rent: Optional[float] = 0
    property_id: str
    bed_id: Optional[str] = None
    room_id: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    check_out_date: Optional[str] = None
    kyc_status: Optional[Literal["pending", "verified", "rejected"]] = None
    status: Optional[Literal["active", "checked_out", "pending"]] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class BedAllocation(BaseModel):
    bed_id: str
    room_id: str


class InvoiceCreate(BaseModel):
    tenant_id: str
    property_id: str
    billing_month: int
    billing_year: int
    rent_amount: float
    food_amount: Optional[float] = 0
    other_charges: Optional[float] = 0
    other_charges_desc: Optional[str] = ""
    previous_balance: Optional[float] = 0
    due_date: Optional[str] = None
    notes: Optional[str] = ""


class InvoiceUpdate(BaseModel):
    rent_amount: Optional[float] = None
    food_amount: Optional[float] = None
    other_charges: Optional[float] = None
    other_charges_desc: Optional[str] = None
    previous_balance: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class PaymentCreate(BaseModel):
    invoice_id: str
    tenant_id: str
    property_id: str
    amount: float
    payment_date: str
    payment_mode: Literal["cash", "upi", "bank_transfer", "cheque", "other"]
    notes: Optional[str] = ""


class ComplaintCreate(BaseModel):
    property_id: str
    category: Literal["electrical", "plumbing", "cleaning", "food", "security", "other"]
    title: str
    description: str
    priority: Literal["low", "medium", "high"] = "medium"


class ComplaintUpdate(BaseModel):
    status: Optional[Literal["open", "in_progress", "resolved", "closed"]] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    priority: Optional[str] = None


class MessConfigCreate(BaseModel):
    property_id: str
    monthly_amount: float
    meal_types: List[str]
    veg_nonveg: Literal["veg", "non-veg", "both"]
    tracking_mode: Literal["fixed", "attendance"] = "fixed"


class MessConfigUpdate(BaseModel):
    monthly_amount: Optional[float] = None
    meal_types: Optional[List[str]] = None
    veg_nonveg: Optional[str] = None
    tracking_mode: Optional[str] = None
    is_active: Optional[bool] = None


class TenantMealPlanCreate(BaseModel):
    tenant_id: str
    property_id: str
    opted_meals: List[str]
    start_date: str


class TenantMealPlanUpdate(BaseModel):
    is_active: Optional[bool] = None
    opted_meals: Optional[List[str]] = None
