import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import { ChevronRight, Plus, Bed, Building2, Users, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const BedDot = ({ bed }) => {
  const colors = { available: "bg-lime-500", occupied: "bg-red-500", maintenance: "bg-stone-400" };
  const titles = { available: `${bed.bed_number} - Available - ₹${bed.price}/mo`, occupied: `${bed.bed_number} - Occupied`, maintenance: `${bed.bed_number} - Maintenance` };
  return (
    <div title={titles[bed.status] || bed.bed_number} className={`w-8 h-8 rounded-lg ${colors[bed.status] || "bg-stone-200"} flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity`}>
      <span className="text-white text-[9px] font-bold">{bed.bed_number}</span>
    </div>
  );
};

const PropertyDetail = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const [property, setProperty] = useState(null);
  const [floors, setFloors] = useState([]);
  const [expandedFloors, setExpandedFloors] = useState({});
  const [floorRooms, setFloorRooms] = useState({});
  const [roomBeds, setRoomBeds] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(null);
  const [showAddBed, setShowAddBed] = useState(null);
  const [floorForm, setFloorForm] = useState({ floor_number: 1, name: "Ground Floor" });
  const [roomForm, setRoomForm] = useState({ room_number: "", room_type: "double", capacity: 2, amenities: [] });
  const [bedForm, setBedForm] = useState({ bed_number: "", price: 0 });

  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  useEffect(() => {
    Promise.all([
      API.get(`/properties/${id}`),
      API.get(`/properties/${id}/floors`),
      API.get(`/properties/${id}/stats`),
    ]).then(([propRes, floorsRes, statsRes]) => {
      setProperty(propRes.data);
      setFloors(floorsRes.data);
      setStats(statsRes.data);
    }).catch(() => toast.error("Failed to load property"))
      .finally(() => setLoading(false));
  }, [id]);

  const loadFloorRooms = async (floorId) => {
    if (floorRooms[floorId]) return;
    const res = await API.get(`/floors/${floorId}/rooms`);
    setFloorRooms((prev) => ({ ...prev, [floorId]: res.data }));
  };

  const loadRoomBeds = async (roomId) => {
    if (roomBeds[roomId]) return;
    const res = await API.get(`/rooms/${roomId}/beds`);
    setRoomBeds((prev) => ({ ...prev, [roomId]: res.data }));
  };

  const toggleFloor = async (floorId) => {
    const isOpen = expandedFloors[floorId];
    if (!isOpen) await loadFloorRooms(floorId);
    setExpandedFloors((prev) => ({ ...prev, [floorId]: !isOpen }));
  };

  const toggleRoomBeds = async (roomId) => {
    await loadRoomBeds(roomId);
    setExpandedFloors((prev) => ({ ...prev, [`room_${roomId}`]: !prev[`room_${roomId}`] }));
  };

  const addFloor = async (e) => {
    e.preventDefault();
    await API.post(`/properties/${id}/floors`, floorForm);
    toast.success("Floor added!");
    setShowAddFloor(false);
    const res = await API.get(`/properties/${id}/floors`);
    setFloors(res.data);
  };

  const addRoom = async (e) => {
    e.preventDefault();
    await API.post(`/floors/${showAddRoom}/rooms`, roomForm);
    toast.success("Room added!");
    setShowAddRoom(null);
    setFloorRooms((prev) => ({ ...prev, [showAddRoom]: undefined }));
    await loadFloorRooms(showAddRoom);
  };

  const addBed = async (e) => {
    e.preventDefault();
    await API.post(`/rooms/${showAddBed}/beds`, bedForm);
    toast.success("Bed added!");
    setShowAddBed(null);
    setRoomBeds((prev) => ({ ...prev, [showAddBed]: undefined }));
    await loadRoomBeds(showAddBed);
    const statsRes = await API.get(`/properties/${id}/stats`);
    setStats(statsRes.data);
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!property) return <div className="text-stone-500">Property not found</div>;

  const genderColors = { boys: "bg-blue-100 text-blue-700", girls: "bg-pink-100 text-pink-700", "co-living": "bg-purple-100 text-purple-700" };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link to="/properties" className="hover:text-amber-600 transition-colors">{t("prop.title")}</Link>
        <ChevronRight size={14} />
        <span className="text-stone-900 font-medium">{property.name}</span>
      </div>

      {/* Property header */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={22} className="text-amber-600" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{property.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${genderColors[property.gender_type] || "bg-stone-100 text-stone-600"}`}>{property.gender_type}</span>
              </div>
              <p className="text-sm text-stone-500 mt-0.5">{property.address}, {property.city}, {property.state}</p>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div><p className="text-xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{stats.total_beds || 0}</p><p className="text-xs text-stone-400">{t("prop.beds")}</p></div>
            <div><p className="text-xl font-bold text-lime-700" style={{ fontFamily: "Manrope, sans-serif" }}>{stats.available_beds || 0}</p><p className="text-xs text-stone-400">{t("prop.available")}</p></div>
            <div><p className="text-xl font-bold text-amber-600" style={{ fontFamily: "Manrope, sans-serif" }}>{stats.total_tenants || 0}</p><p className="text-xs text-stone-400">Tenants</p></div>
          </div>
        </div>
      </div>

      {/* Floors section */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>Floors & Rooms</h2>
        <button onClick={() => setShowAddFloor(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
          <Plus size={13} strokeWidth={2.5} />{t("prop.add_floor")}
        </button>
      </div>

      {/* Bed legend */}
      <div className="flex items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-lime-500 inline-block" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Occupied</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-stone-400 inline-block" />Maintenance</span>
      </div>

      {floors.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <p className="text-stone-400 text-sm mb-3">No floors added yet</p>
          <button onClick={() => setShowAddFloor(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">{t("prop.add_floor")}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {floors.map((floor) => (
            <div key={floor.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <button onClick={() => toggleFloor(floor.id)} className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                    <span className="text-amber-700 font-bold text-xs">{floor.floor_number}</span>
                  </div>
                  <span className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>{floor.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAddRoom(floor.id); }}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                  >
                    <Plus size={11} strokeWidth={2.5} />{t("prop.add_room")}
                  </button>
                  {expandedFloors[floor.id] ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                </div>
              </button>

              {expandedFloors[floor.id] && (
                <div className="border-t border-stone-100 p-4 space-y-3">
                  {!floorRooms[floor.id] || floorRooms[floor.id].length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-2">No rooms in this floor</p>
                  ) : (
                    floorRooms[floor.id].map((room) => (
                      <div key={room.id} className="border border-stone-100 rounded-lg overflow-hidden">
                        <button onClick={() => toggleRoomBeds(room.id)} className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <Bed size={14} className="text-stone-500" strokeWidth={1.5} />
                            <span className="text-sm font-medium text-stone-700">Room {room.room_number}</span>
                            <span className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[10px] text-stone-500 capitalize">{room.room_type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${room.status === "available" ? "text-lime-700 bg-lime-50" : room.status === "maintenance" ? "text-stone-500 bg-stone-100" : "text-amber-700 bg-amber-50"}`}>{room.status}</span>
                            <button onClick={(e) => { e.stopPropagation(); setShowAddBed(room.id); }} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50">
                              <Plus size={11} strokeWidth={2.5} />Bed
                            </button>
                            {expandedFloors[`room_${room.id}`] ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
                          </div>
                        </button>
                        {expandedFloors[`room_${room.id}`] && (
                          <div className="p-3 bg-white">
                            {!roomBeds[room.id] || roomBeds[room.id].length === 0 ? (
                              <p className="text-xs text-stone-400 text-center py-1">No beds added yet</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {roomBeds[room.id].map((bed) => <BedDot key={bed.id} bed={bed} />)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Floor Dialog */}
      <Dialog open={showAddFloor} onOpenChange={setShowAddFloor}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>{t("prop.add_floor")}</DialogTitle></DialogHeader>
          <form onSubmit={addFloor} className="space-y-3">
            <div><label className="block text-xs font-medium text-stone-600 mb-1">Floor Number</label>
              <input type="number" required value={floorForm.floor_number} onChange={(e) => setFloorForm({ ...floorForm, floor_number: +e.target.value })} className={inp} /></div>
            <div><label className="block text-xs font-medium text-stone-600 mb-1">Floor Name</label>
              <input required value={floorForm.name} onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })} className={inp} placeholder="Ground Floor" /></div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddFloor(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50">{t("common.cancel")}</button>
              <button type="submit" className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">{t("common.save")}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Room Dialog */}
      <Dialog open={!!showAddRoom} onOpenChange={() => setShowAddRoom(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>{t("prop.add_room")}</DialogTitle></DialogHeader>
          <form onSubmit={addRoom} className="space-y-3">
            <div><label className="block text-xs font-medium text-stone-600 mb-1">Room Number *</label>
              <input required value={roomForm.room_number} onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })} className={inp} placeholder="101" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-stone-600 mb-1">Type</label>
                <select value={roomForm.room_type} onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="triple">Triple</option>
                  <option value="dormitory">Dormitory</option>
                </select></div>
              <div><label className="block text-xs font-medium text-stone-600 mb-1">Capacity (Beds)</label>
                <input type="number" min={1} required value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: +e.target.value })} className={inp} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddRoom(null)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">{t("common.save")}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Bed Dialog */}
      <Dialog open={!!showAddBed} onOpenChange={() => setShowAddBed(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>{t("prop.add_bed")}</DialogTitle></DialogHeader>
          <form onSubmit={addBed} className="space-y-3">
            <div><label className="block text-xs font-medium text-stone-600 mb-1">Bed Number / Label *</label>
              <input required value={bedForm.bed_number} onChange={(e) => setBedForm({ ...bedForm, bed_number: e.target.value })} className={inp} placeholder="A1, B2..." /></div>
            <div><label className="block text-xs font-medium text-stone-600 mb-1">Monthly Price (₹) *</label>
              <input type="number" min={0} required value={bedForm.price} onChange={(e) => setBedForm({ ...bedForm, price: +e.target.value })} className={inp} placeholder="5000" /></div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddBed(null)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">{t("common.save")}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyDetail;
