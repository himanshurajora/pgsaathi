from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import get_current_user
from models import PropertyCreate, PropertyUpdate, FloorCreate, FloorUpdate, RoomCreate, RoomUpdate, BedCreate, BedUpdate
from datetime import datetime, timezone
import uuid

properties_router = APIRouter()
floors_router = APIRouter()
rooms_router = APIRouter()
beds_router = APIRouter()


# =========== PROPERTIES ===========

@properties_router.get("")
async def get_properties(current_user=Depends(get_current_user)):
    if current_user["role"] == "owner":
        props = await db.properties.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    elif current_user.get("property_id"):
        prop = await db.properties.find_one({"id": current_user["property_id"]}, {"_id": 0})
        props = [prop] if prop else []
    else:
        props = []
    return props


@properties_router.post("")
async def create_property(data: PropertyCreate, current_user=Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only owners can create properties")
    prop = {
        "id": str(uuid.uuid4()),
        "owner_id": current_user["id"],
        "name": data.name,
        "address": data.address,
        "city": data.city,
        "state": data.state,
        "gender_type": data.gender_type,
        "house_rules": data.house_rules or "",
        "contact_phone": data.contact_phone or "",
        "allows_visitors": data.allows_visitors if hasattr(data, 'allows_visitors') else True,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.properties.insert_one(prop)
    prop.pop("_id", None)
    return prop


@properties_router.get("/{property_id}")
async def get_property(property_id: str, current_user=Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


@properties_router.put("/{property_id}")
async def update_property(property_id: str, data: PropertyUpdate, current_user=Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.properties.update_one({"id": property_id}, {"$set": update_data})
    return await db.properties.find_one({"id": property_id}, {"_id": 0})


@properties_router.delete("/{property_id}")
async def delete_property(property_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only owners can delete properties")
    await db.properties.delete_one({"id": property_id})
    return {"message": "Property deleted"}


@properties_router.get("/{property_id}/floors")
async def get_property_floors(property_id: str, current_user=Depends(get_current_user)):
    floors = await db.floors.find({"property_id": property_id}, {"_id": 0}).sort("floor_number", 1).to_list(100)
    return floors


@properties_router.post("/{property_id}/floors")
async def create_floor(property_id: str, data: FloorCreate, current_user=Depends(get_current_user)):
    floor = {
        "id": str(uuid.uuid4()),
        "property_id": property_id,
        "floor_number": data.floor_number,
        "name": data.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.floors.insert_one(floor)
    floor.pop("_id", None)
    return floor


@properties_router.get("/{property_id}/stats")
async def get_property_stats(property_id: str, current_user=Depends(get_current_user)):
    total_beds = await db.beds.count_documents({"property_id": property_id})
    occupied_beds = await db.beds.count_documents({"property_id": property_id, "status": "occupied"})
    total_tenants = await db.tenants.count_documents({"property_id": property_id, "status": "active"})
    total_rooms = await db.rooms.count_documents({"property_id": property_id})
    return {
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "available_beds": total_beds - occupied_beds,
        "total_tenants": total_tenants,
        "total_rooms": total_rooms,
        "occupancy_rate": round((occupied_beds / total_beds * 100) if total_beds > 0 else 0, 1),
    }


# =========== FLOORS ===========

@floors_router.put("/{floor_id}")
async def update_floor(floor_id: str, data: FloorUpdate, current_user=Depends(get_current_user)):
    floor = await db.floors.find_one({"id": floor_id})
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.floors.update_one({"id": floor_id}, {"$set": update_data})
    return await db.floors.find_one({"id": floor_id}, {"_id": 0})


@floors_router.delete("/{floor_id}")
async def delete_floor(floor_id: str, current_user=Depends(get_current_user)):
    await db.floors.delete_one({"id": floor_id})
    return {"message": "Floor deleted"}


@floors_router.get("/{floor_id}/rooms")
async def get_floor_rooms(floor_id: str, current_user=Depends(get_current_user)):
    rooms = await db.rooms.find({"floor_id": floor_id}, {"_id": 0}).to_list(100)
    return rooms


@floors_router.post("/{floor_id}/rooms")
async def create_room(floor_id: str, data: RoomCreate, current_user=Depends(get_current_user)):
    floor = await db.floors.find_one({"id": floor_id})
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    room = {
        "id": str(uuid.uuid4()),
        "property_id": floor["property_id"],
        "floor_id": floor_id,
        "room_number": data.room_number,
        "room_type": data.room_type,
        "capacity": data.capacity,
        "amenities": data.amenities or [],
        "status": "available",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.rooms.insert_one(room)
    room.pop("_id", None)
    return room


# =========== ROOMS ===========

@rooms_router.get("/{room_id}")
async def get_room(room_id: str, current_user=Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@rooms_router.put("/{room_id}")
async def update_room(room_id: str, data: RoomUpdate, current_user=Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.rooms.update_one({"id": room_id}, {"$set": update_data})
    return await db.rooms.find_one({"id": room_id}, {"_id": 0})


@rooms_router.delete("/{room_id}")
async def delete_room(room_id: str, current_user=Depends(get_current_user)):
    await db.rooms.delete_one({"id": room_id})
    return {"message": "Room deleted"}


@rooms_router.get("/{room_id}/beds")
async def get_room_beds(room_id: str, current_user=Depends(get_current_user)):
    beds = await db.beds.find({"room_id": room_id}, {"_id": 0}).to_list(100)
    return beds


@rooms_router.post("/{room_id}/beds")
async def create_bed(room_id: str, data: BedCreate, current_user=Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    bed = {
        "id": str(uuid.uuid4()),
        "property_id": room["property_id"],
        "floor_id": room["floor_id"],
        "room_id": room_id,
        "bed_number": data.bed_number,
        "price": data.price,
        "status": "available",
        "tenant_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.beds.insert_one(bed)
    bed.pop("_id", None)
    return bed


# =========== BEDS ===========

@beds_router.get("/{bed_id}")
async def get_bed(bed_id: str, current_user=Depends(get_current_user)):
    bed = await db.beds.find_one({"id": bed_id}, {"_id": 0})
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    return bed


@beds_router.put("/{bed_id}")
async def update_bed(bed_id: str, data: BedUpdate, current_user=Depends(get_current_user)):
    bed = await db.beds.find_one({"id": bed_id})
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.beds.update_one({"id": bed_id}, {"$set": update_data})
    return await db.beds.find_one({"id": bed_id}, {"_id": 0})


@beds_router.delete("/{bed_id}")
async def delete_bed(bed_id: str, current_user=Depends(get_current_user)):
    await db.beds.delete_one({"id": bed_id})
    return {"message": "Bed deleted"}
