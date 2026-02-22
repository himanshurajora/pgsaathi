import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Plus, Building2, MapPin, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const GENDER_COLORS = {
  boys: "bg-blue-100 text-blue-700",
  girls: "bg-pink-100 text-pink-700",
  "co-living": "bg-purple-100 text-purple-700",
};

const PropertyForm = ({ initial, onSave, onClose, t }) => {
  const [form, setForm] = useState(initial || { name: "", address: "", city: "", state: "", gender_type: "boys", house_rules: "", contact_phone: "", allows_visitors: true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full h-11 px-3.5 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">{t("prop.name")} *</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} placeholder="Sunrise PG" />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">{t("prop.address")} *</label>
        <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inp} placeholder="123 Main Street, Area" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">{t("prop.city")} *</label>
          <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">{t("prop.state")} *</label>
          <input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">{t("prop.gender")} *</label>
          <select value={form.gender_type} onChange={(e) => setForm({ ...form, gender_type: e.target.value })} className={`${inp} appearance-none bg-white`}>
            <option value="boys">{t("prop.gender.boys")}</option>
            <option value="girls">{t("prop.gender.girls")}</option>
            <option value="co-living">{t("prop.gender.co_living")}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Contact Phone</label>
          <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inp} placeholder="+91 98765..." />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">{t("prop.rules")}</label>
        <textarea value={form.house_rules} onChange={(e) => setForm({ ...form, house_rules: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm resize-none" placeholder="No smoking, guests allowed until 10pm..." />
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
        <input type="checkbox" checked={form.allows_visitors !== false} onChange={(e) => setForm({ ...form, allows_visitors: e.target.checked })} className="w-4 h-4 rounded border-stone-300 accent-amber-600" />
        Allow visitors (tenants can request visitor passes)
      </label>
      <div className="flex gap-2.5 pt-1">
        <button type="button" onClick={onClose} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50">{t("common.cancel")}</button>
        <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
          {saving ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </form>
  );
};

const Properties = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [propertyStats, setPropertyStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editProp, setEditProp] = useState(null);

  const fetchProperties = async () => {
    try {
      const res = await API.get("/properties");
      setProperties(res.data);
      // Fetch stats for each
      const statsResults = await Promise.allSettled(res.data.map((p) => API.get(`/properties/${p.id}/stats`)));
      const statsMap = {};
      res.data.forEach((p, i) => {
        if (statsResults[i].status === "fulfilled") statsMap[p.id] = statsResults[i].value.data;
      });
      setPropertyStats(statsMap);
    } catch {
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  const handleCreate = async (form) => {
    await API.post("/properties", form);
    toast.success("Property added!");
    setShowAdd(false);
    fetchProperties();
  };

  const handleUpdate = async (form) => {
    await API.put(`/properties/${editProp.id}`, form);
    toast.success("Property updated!");
    setEditProp(null);
    fetchProperties();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this property? This cannot be undone.")) return;
    await API.delete(`/properties/${id}`);
    toast.success("Property deleted");
    fetchProperties();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{t("prop.title")}</h1>
          <p className="text-stone-500 text-sm">{properties.length} {properties.length === 1 ? "property" : "properties"}</p>
        </div>
        {user?.role === "owner" && (
          <button onClick={() => setShowAdd(true)} data-testid="add-property-btn" className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md">
            <Plus size={15} strokeWidth={2.5} />{t("prop.add")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <Building2 size={48} className="text-stone-200 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-base font-semibold text-stone-900 mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>No properties yet</h3>
          <p className="text-stone-400 text-sm mb-5">Add your first property to get started.</p>
          <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors">
            {t("prop.add")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map((prop) => {
            const stats = propertyStats[prop.id] || {};
            return (
              <div key={prop.id} className="bg-white rounded-xl border border-stone-200 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 overflow-hidden" data-testid={`property-card-${prop.id}`}>
                <Link to={`/properties/${prop.id}`} className="block p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                        <Building2 size={18} className="text-amber-600" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>{prop.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-stone-400" />
                          <span className="text-xs text-stone-400">{prop.city}, {prop.state}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${GENDER_COLORS[prop.gender_type] || "bg-stone-100 text-stone-600"}`}>
                      {prop.gender_type}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mb-3 line-clamp-1">{prop.address}</p>
                  {prop.allows_visitors === false && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 mb-2">No Visitors</span>}
                  <div className="flex items-center gap-4 pt-3 border-t border-stone-100">
                    <div className="text-center">
                      <p className="text-base font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{stats.total_beds || 0}</p>
                      <p className="text-[10px] text-stone-400">{t("prop.beds")}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-lime-700" style={{ fontFamily: "Manrope, sans-serif" }}>{stats.available_beds || 0}</p>
                      <p className="text-[10px] text-stone-400">{t("prop.available")}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-amber-600" style={{ fontFamily: "Manrope, sans-serif" }}>{stats.occupancy_rate || 0}%</p>
                      <p className="text-[10px] text-stone-400">Occupancy</p>
                    </div>
                    <ChevronRight size={15} className="text-stone-300 ml-auto" />
                  </div>
                </Link>
                {user?.role === "owner" && (
                  <div className="px-5 pb-3 flex gap-2 border-t border-stone-100 pt-2">
                    <button onClick={() => setEditProp(prop)} className="flex items-center gap-1 text-xs text-stone-500 hover:text-amber-600 transition-colors px-2 py-1 rounded hover:bg-amber-50">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(prop.id)} className="flex items-center gap-1 text-xs text-stone-500 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>{t("prop.add")}</DialogTitle></DialogHeader>
          <PropertyForm t={t} onSave={handleCreate} onClose={() => setShowAdd(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProp} onOpenChange={() => setEditProp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Edit Property</DialogTitle></DialogHeader>
          {editProp && <PropertyForm t={t} initial={editProp} onSave={handleUpdate} onClose={() => setEditProp(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Properties;
