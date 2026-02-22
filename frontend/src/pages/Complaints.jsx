import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Plus, MessageSquare, AlertTriangle, Zap, Droplets, Utensils, Shield, Search, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const CATEGORY_ICONS = { electrical: Zap, plumbing: Droplets, cleaning: MessageSquare, food: Utensils, security: Shield, other: AlertTriangle };
const CATEGORY_COLORS = { electrical: "text-yellow-600 bg-yellow-50", plumbing: "text-blue-600 bg-blue-50", cleaning: "text-green-600 bg-green-50", food: "text-orange-600 bg-orange-50", security: "text-red-600 bg-red-50", other: "text-stone-600 bg-stone-50" };
const STATUS_STYLES = { open: "bg-red-100 text-red-700", in_progress: "bg-amber-100 text-amber-700", resolved: "bg-lime-100 text-lime-700", closed: "bg-stone-100 text-stone-500" };
const PRIORITY_STYLES = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-stone-100 text-stone-600" };

const Complaints = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [updateId, setUpdateId] = useState(null);
  const [form, setForm] = useState({ property_id: "", category: "other", title: "", description: "", priority: "medium" });
  const [updateForm, setUpdateForm] = useState({ status: "in_progress", resolution_notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [compRes, propRes] = await Promise.all([API.get("/complaints"), API.get("/properties")]);
      setComplaints(compRes.data);
      setProperties(propRes.data);
      if (propRes.data.length > 0) setForm((f) => ({ ...f, property_id: f.property_id || propRes.data[0].id }));
    } catch { toast.error("Failed to load complaints"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/complaints", form);
      toast.success("Complaint raised!");
      setShowAdd(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await API.put(`/complaints/${updateId}`, updateForm);
    toast.success("Complaint updated!");
    setUpdateId(null);
    fetchAll();
  };

  const quickUpdate = async (id, status) => {
    await API.put(`/complaints/${id}`, { status });
    toast.success(`Marked as ${status.replace("_", " ")}`);
    fetchAll();
  };

  const filtered = complaints.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.tenant_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{t("complaint.title")}</h1>
          <p className="text-stone-500 text-sm">{complaints.filter((c) => c.status === "open").length} open complaints</p>
        </div>
        <button onClick={() => setShowAdd(true)} data-testid="add-complaint-btn" className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all">
          <Plus size={15} strokeWidth={2.5} />{t("complaint.add")}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search complaints..." className="w-full h-10 pl-9 pr-4 border border-stone-200 focus:border-amber-600 rounded-lg outline-none text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-amber-600 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-amber-300"}`}>
              {s === "all" ? "All" : t(`complaint.status.${s}`) || s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
          <MessageSquare size={40} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-stone-400 text-sm">No complaints found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const CatIcon = CATEGORY_ICONS[c.category] || AlertTriangle;
            const catColor = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.other;
            return (
              <div key={c.id} data-testid={`complaint-card-${c.id}`} className="bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${catColor}`}>
                      <CatIcon size={16} strokeWidth={1.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>{c.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_STYLES[c.status] || "bg-stone-100 text-stone-600"}`}>{t(`complaint.status.${c.status}`) || c.status}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${PRIORITY_STYLES[c.priority] || "bg-stone-100 text-stone-600"}`}>{c.priority}</span>
                      </div>
                      <p className="text-xs text-stone-500 mb-1">{c.description}</p>
                      <p className="text-xs text-stone-400">By {c.tenant_name} · {c.created_at?.slice(0, 10)} · <span className="capitalize">{c.category}</span></p>
                      {c.resolution_notes && <p className="text-xs text-lime-700 mt-1 bg-lime-50 p-2 rounded">Resolution: {c.resolution_notes}</p>}
                      {/* SLA Tracking */}
                      {c.status !== "closed" && c.status !== "resolved" && c.created_at && (() => {
                        const created = new Date(c.created_at);
                        const now = new Date();
                        const hours = Math.round((now - created) / (1000 * 60 * 60));
                        const slaLimit = c.priority === "high" ? 24 : c.priority === "medium" ? 48 : 72;
                        const breached = hours > slaLimit;
                        return (
                          <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold ${breached ? "text-red-600" : "text-stone-400"}`} data-testid={`sla-${c.id}`}>
                            <span>{breached ? "SLA BREACHED" : "SLA OK"}</span>
                            <span>({hours}h / {slaLimit}h limit)</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                {user?.role !== "tenant" && c.status !== "closed" && (
                  <div className="flex gap-2 mt-3 pt-2.5 border-t border-stone-100">
                    {c.status === "open" && (
                      <button onClick={() => quickUpdate(c.id, "in_progress")} className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100">Mark In Progress</button>
                    )}
                    {(c.status === "open" || c.status === "in_progress") && (
                      <button onClick={() => { setUpdateId(c.id); setUpdateForm({ status: "resolved", resolution_notes: "" }); }} className="px-3 py-1.5 text-xs bg-lime-50 text-lime-700 rounded-lg font-medium hover:bg-lime-100">Resolve</button>
                    )}
                    {c.status === "resolved" && (
                      <button onClick={() => quickUpdate(c.id, "closed")} className="px-3 py-1.5 text-xs bg-stone-100 text-stone-600 rounded-lg font-medium hover:bg-stone-200">Close</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Complaint Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>{t("complaint.add")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("common.property")} *</label>
              <select required value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className={`${inp} appearance-none bg-white`}>
                <option value="">-- Select property --</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("complaint.category")} *</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  {["electrical", "plumbing", "cleaning", "food", "security", "other"].map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("complaint.priority")}</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="low">{t("complaint.priority.low")}</option>
                  <option value="medium">{t("complaint.priority.medium")}</option>
                  <option value="high">{t("complaint.priority.high")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("complaint.complaint_title")} *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} placeholder="Brief title of the issue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("complaint.description")} *</label>
              <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm resize-none" placeholder="Detailed description..." />
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? t("common.loading") : t("common.save")}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update/Resolve Dialog */}
      <Dialog open={!!updateId} onOpenChange={() => setUpdateId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Update Complaint</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("common.status")}</label>
              <select value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })} className={`${inp} appearance-none bg-white`}>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("complaint.notes")}</label>
              <textarea value={updateForm.resolution_notes} onChange={(e) => setUpdateForm({ ...updateForm, resolution_notes: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm resize-none" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setUpdateId(null)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">{t("common.save")}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Complaints;
