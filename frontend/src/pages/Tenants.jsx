import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Plus, Search, Users, Bed, CheckCircle, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const KYC_BADGES = { pending: "bg-amber-100 text-amber-700", verified: "bg-lime-100 text-lime-700", rejected: "bg-red-100 text-red-700" };
const STATUS_BADGES = { active: "bg-lime-100 text-lime-700", pending: "bg-amber-100 text-amber-700", checked_out: "bg-stone-100 text-stone-600" };

const Tenants = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showAllocate, setShowAllocate] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", check_in_date: "", emergency_contact_name: "",
    emergency_contact_phone: "", security_deposit: "", monthly_rent: "", property_id: "",
    bed_id: "", room_id: "",
  });
  const [allBeds, setAllBeds] = useState([]);
  const [onboardingBeds, setOnboardingBeds] = useState([]);
  const [allocateData, setAllocateData] = useState({ bed_id: "", room_id: "" });
  const [saving, setSaving] = useState(false);
  const [noRoomWarning, setNoRoomWarning] = useState(false);

  const fetchAll = async () => {
    try {
      const [tenRes, propRes] = await Promise.all([API.get("/tenants"), API.get("/properties")]);
      setTenants(tenRes.data);
      setProperties(propRes.data);
      if (form.property_id === "" && propRes.data.length > 0) {
        setForm((f) => ({ ...f, property_id: propRes.data[0].id }));
        fetchBedsForProperty(propRes.data[0].id);
      }
    } catch { toast.error("Failed to load tenants"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchBedsForProperty = async (propertyId) => {
    if (!propertyId) { setOnboardingBeds([]); return; }
    try {
      const res = await API.get(`/properties/${propertyId}/floors`);
      const beds = [];
      for (const floor of res.data) {
        const roomsRes = await API.get(`/floors/${floor.id}/rooms`);
        for (const room of roomsRes.data) {
          const bedsRes = await API.get(`/rooms/${room.id}/beds`);
          bedsRes.data.filter((b) => b.status === "available").forEach((b) =>
            beds.push({ ...b, room_number: room.room_number, room_id: room.id })
          );
        }
      }
      setOnboardingBeds(beds);
      setNoRoomWarning(beds.length === 0);
    } catch { setOnboardingBeds([]); }
  };

  const handlePropertyChange = (propId) => {
    setForm((f) => ({ ...f, property_id: propId, bed_id: "", room_id: "" }));
    fetchBedsForProperty(propId);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        security_deposit: +form.security_deposit || 0,
        monthly_rent: +form.monthly_rent || 0,
        bed_id: form.bed_id || null,
        room_id: form.room_id || null,
      };
      await API.post("/tenants", payload);
      toast.success("Tenant added!");
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", check_in_date: "", emergency_contact_name: "", emergency_contact_phone: "", security_deposit: "", monthly_rent: "", property_id: properties[0]?.id || "", bed_id: "", room_id: "" });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to add tenant"); }
    finally { setSaving(false); }
  };

  const handleKYC = async (id, status) => {
    await API.put(`/tenants/${id}/kyc`, { kyc_status: status });
    toast.success(`KYC ${status}`);
    fetchAll();
  };

  const openAllocate = async (tenant) => {
    setShowAllocate(tenant);
    try {
      const res = await API.get(`/properties/${tenant.property_id}/floors`);
      const beds = [];
      for (const floor of res.data) {
        const roomsRes = await API.get(`/floors/${floor.id}/rooms`);
        for (const room of roomsRes.data) {
          const bedsRes = await API.get(`/rooms/${room.id}/beds`);
          bedsRes.data.filter((b) => b.status === "available").forEach((b) => beds.push({ ...b, room_number: room.room_number, room_id: room.id }));
        }
      }
      setAllBeds(beds);
    } catch { toast.error("Failed to load beds"); }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    await API.post(`/tenants/${showAllocate.id}/allocate-bed`, allocateData);
    toast.success("Bed allocated!");
    setShowAllocate(null);
    fetchAll();
  };

  const filtered = tenants.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.phone.includes(search) || t.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{t("tenant.title")}</h1>
          <p className="text-stone-500 text-sm">{tenants.filter((t) => t.status === "active").length} active tenants</p>
        </div>
        <button onClick={() => { setShowAdd(true); if (properties[0]) fetchBedsForProperty(properties[0].id); }} data-testid="add-tenant-btn" className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md">
          <Plus size={15} strokeWidth={2.5} />{t("tenant.add")}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search")} className="w-full h-10 pl-9 pr-4 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm" />
        </div>
        <div className="flex gap-1.5">
          {["all", "active", "pending", "checked_out"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? "bg-amber-600 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-amber-300"}`}>
              {s === "all" ? t("common.all") : t(`tenant.status.${s}`) || s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
          <Users size={40} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-stone-400 text-sm">No tenants found</p>
        </div>
      ) : (
        <div className="space-y-5 mt-4">
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 pb-2 text-xs font-semibold text-stone-400 uppercase tracking-wide">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-2">Check-In</div>
            <div className="col-span-2">KYC</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Actions</div>
          </div>
          {filtered.map((tenant) => (
            <div key={tenant.id} data-testid={`tenant-row-${tenant.id}`} className="bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-300 transition-colors">
              <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-700 font-semibold text-xs">{tenant.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <Link to={`/tenants/${tenant.id}`} className="font-medium text-stone-900 text-sm hover:text-amber-600 transition-colors" data-testid={`tenant-link-${tenant.id}`}>{tenant.name}</Link>
                    <p className="text-xs text-stone-400 truncate">{tenant.email}</p>
                  </div>
                </div>
                <div className="col-span-2 text-sm text-stone-600">{tenant.phone}</div>
                <div className="col-span-2 text-xs text-stone-500">{tenant.check_in_date?.slice(0, 10)}</div>
                <div className="col-span-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${KYC_BADGES[tenant.kyc_status] || "bg-stone-100 text-stone-600"}`}>
                    {t(`tenant.kyc.${tenant.kyc_status}`) || tenant.kyc_status}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[tenant.status] || "bg-stone-100 text-stone-600"}`}>
                    {t(`tenant.status.${tenant.status}`) || tenant.status}
                  </span>
                </div>
                <div className="col-span-2 flex gap-1">
                  <Link to={`/tenants/${tenant.id}`} className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700" title="View"><Eye size={14} /></Link>
                  {tenant.kyc_status === "pending" && (
                    <button onClick={() => handleKYC(tenant.id, "verified")} title="Verify KYC" className="p-1.5 hover:bg-lime-50 rounded text-stone-400 hover:text-lime-600"><CheckCircle size={14} /></button>
                  )}
                  {!tenant.bed_id && tenant.status === "active" && (
                    <button onClick={() => openAllocate(tenant)} title="Allocate Bed" className="p-1.5 hover:bg-amber-50 rounded text-stone-400 hover:text-amber-600"><Bed size={14} /></button>
                  )}
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-amber-700 font-semibold text-sm">{tenant.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <Link to={`/tenants/${tenant.id}`} className="font-semibold text-stone-900 text-sm hover:text-amber-600">{tenant.name}</Link>
                      <p className="text-xs text-stone-400">{tenant.phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_BADGES[tenant.status]}`}>{tenant.status}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${KYC_BADGES[tenant.kyc_status]}`}>{tenant.kyc_status}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Link to={`/tenants/${tenant.id}`} className="flex-1 py-1.5 text-xs bg-stone-50 text-stone-700 rounded-lg font-medium hover:bg-stone-100 text-center">View Details</Link>
                  {!tenant.bed_id && tenant.status === "active" && <button onClick={() => openAllocate(tenant)} className="flex-1 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100">Allocate Bed</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Tenant Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>{t("tenant.add")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("tenant.name")} *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("tenant.email")} *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("tenant.phone")} *</label>
                <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} placeholder="+91 98765..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("tenant.check_in")} *</label>
                <input type="date" required value={form.check_in_date} onChange={(e) => setForm({ ...form, check_in_date: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("common.property")} *</label>
                <select value={form.property_id} onChange={(e) => handlePropertyChange(e.target.value)} className={`${inp} appearance-none bg-white`}>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Room/Bed Assignment at Onboarding */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">Assign Room & Bed (Optional)</label>
                {noRoomWarning && (
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mb-2" data-testid="no-rooms-warning">
                    <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">No available rooms/beds in this property. Add rooms/beds first or skip assignment.</p>
                  </div>
                )}
                {onboardingBeds.length > 0 && (
                  <select value={form.bed_id} onChange={(e) => { const bed = onboardingBeds.find((b) => b.id === e.target.value); setForm({ ...form, bed_id: e.target.value, room_id: bed?.room_id || "" }); }} className={`${inp} appearance-none bg-white`} data-testid="onboarding-bed-select">
                    <option value="">-- Skip (assign later) --</option>
                    {onboardingBeds.map((b) => <option key={b.id} value={b.id}>Room {b.room_number} - Bed {b.bed_number} ({t("common.inr")}{b.price}/mo)</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("tenant.emergency")} *</label>
                <input required value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("tenant.emergency_phone")} *</label>
                <input required value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("tenant.deposit")}</label>
                <input type="number" min="0" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: e.target.value })} className={inp} placeholder="5000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("tenant.rent")}</label>
                <input type="number" min="0" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} className={inp} placeholder="5000" />
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? t("common.loading") : t("common.save")}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Allocate Bed Dialog */}
      <Dialog open={!!showAllocate} onOpenChange={() => setShowAllocate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Allocate Bed - {showAllocate?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleAllocate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Select Available Bed</label>
              {allBeds.length === 0 ? (
                <p className="text-sm text-stone-400 py-3 text-center">No available beds in this property</p>
              ) : (
                <select required value={allocateData.bed_id} onChange={(e) => { const bed = allBeds.find((b) => b.id === e.target.value); setAllocateData({ bed_id: e.target.value, room_id: bed?.room_id || "" }); }} className={`${inp} appearance-none bg-white`}>
                  <option value="">-- Select bed --</option>
                  {allBeds.map((b) => <option key={b.id} value={b.id}>Room {b.room_number} - Bed {b.bed_number} ({t("common.inr")}{b.price}/mo)</option>)}
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAllocate(null)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" disabled={!allocateData.bed_id} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">Allocate</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tenants;
