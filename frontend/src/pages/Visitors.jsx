import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Plus, UserPlus, CheckCircle, XCircle, IndianRupee, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-lime-100 text-lime-700",
  rejected: "bg-red-100 text-red-700",
  fined: "bg-red-100 text-red-700",
};

const Visitors = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showFine, setShowFine] = useState(null);
  const [form, setForm] = useState({ visitor_name: "", visitor_phone: "", relation: "", purpose: "", visit_date: new Date().toISOString().slice(0, 10), visit_time: "", expected_duration: "" });
  const [fineForm, setFineForm] = useState({ fine_amount: "", fine_reason: "Unauthorized visitor" });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const isTenant = user?.role === "tenant";
  const isAdmin = user?.role !== "tenant";

  const fetchVisitors = async () => {
    try {
      const endpoint = isTenant ? "/tenant-portal/visitors" : "/visitors";
      const res = await API.get(endpoint);
      setVisitors(res.data);
    } catch { toast.error("Failed to load visitors"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVisitors(); }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/visitors", form);
      toast.success("Visitor request submitted!");
      setShowAdd(false);
      setForm({ visitor_name: "", visitor_phone: "", relation: "", purpose: "", visit_date: new Date().toISOString().slice(0, 10), visit_time: "", expected_duration: "" });
      fetchVisitors();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to submit request"); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    await API.put(`/visitors/${id}`, { status: "approved" });
    toast.success("Visitor approved");
    fetchVisitors();
  };

  const handleReject = async (id) => {
    await API.put(`/visitors/${id}`, { status: "rejected" });
    toast.success("Visitor rejected");
    fetchVisitors();
  };

  const handleFine = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/visitors/${showFine.id}/fine`, { fine_amount: +fineForm.fine_amount, fine_reason: fineForm.fine_reason });
      toast.success("Fine imposed");
      setShowFine(null);
      setFineForm({ fine_amount: "", fine_reason: "Unauthorized visitor" });
      fetchVisitors();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this visitor record?")) return;
    await API.delete(`/visitors/${id}`);
    toast.success("Deleted");
    fetchVisitors();
  };

  const filtered = visitors.filter((v) => statusFilter === "all" || v.status === statusFilter);
  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  return (
    <div className="space-y-6" data-testid="visitors-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>Visitors</h1>
          <p className="text-stone-500 text-sm">{visitors.filter((v) => v.status === "pending").length} pending requests</p>
        </div>
        {isTenant && (
          <button onClick={() => setShowAdd(true)} data-testid="request-visitor-btn" className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm">
            <Plus size={15} strokeWidth={2.5} />Request Visit
          </button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {["all", "pending", "approved", "rejected", "fined"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? "bg-amber-600 text-white" : "bg-white border border-stone-200 text-stone-600"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
          <UserPlus size={40} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-stone-400 text-sm">No visitor requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <div key={v.id} data-testid={`visitor-${v.id}`} className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-stone-900 text-sm">{v.visitor_name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_STYLES[v.status] || "bg-stone-100"}`}>{v.status}</span>
                    {v.fine_amount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                        Fine: {t("common.inr")}{v.fine_amount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    {v.relation && <span>{v.relation} &middot; </span>}
                    {v.visitor_phone && <span>{v.visitor_phone} &middot; </span>}
                    {v.visit_date}{v.visit_time ? ` at ${v.visit_time}` : ""}
                    {v.expected_duration && <span> &middot; ~{v.expected_duration}</span>}
                  </p>
                  {v.purpose && <p className="text-xs text-stone-400 mt-0.5">Purpose: {v.purpose}</p>}
                  <p className="text-xs text-stone-400 mt-0.5">Requested by: {v.tenant_name} &middot; {v.created_at?.slice(0, 10)}</p>
                  {v.fine_reason && v.status === "fined" && <p className="text-xs text-red-600 mt-1">Fine reason: {v.fine_reason}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    {v.status === "pending" && (
                      <>
                        <button onClick={() => handleApprove(v.id)} title="Approve" data-testid={`approve-visitor-${v.id}`} className="p-1.5 hover:bg-lime-50 rounded text-stone-400 hover:text-lime-600"><CheckCircle size={15} /></button>
                        <button onClick={() => handleReject(v.id)} title="Reject" data-testid={`reject-visitor-${v.id}`} className="p-1.5 hover:bg-red-50 rounded text-stone-400 hover:text-red-600"><XCircle size={15} /></button>
                      </>
                    )}
                    {v.status !== "fined" && (
                      <button onClick={() => { setShowFine(v); setFineForm({ fine_amount: "", fine_reason: "Unauthorized visitor" }); }} title="Impose Fine" data-testid={`fine-visitor-${v.id}`} className="p-1.5 hover:bg-amber-50 rounded text-stone-400 hover:text-amber-600"><IndianRupee size={14} /></button>
                    )}
                    <button onClick={() => handleDelete(v.id)} title="Delete" className="p-1.5 hover:bg-red-50 rounded text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Visitor Dialog (Tenant) */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Request Visitor</DialogTitle></DialogHeader>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Visitor Name *</label>
                <input required value={form.visitor_name} onChange={(e) => setForm({ ...form, visitor_name: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Phone</label>
                <input value={form.visitor_phone} onChange={(e) => setForm({ ...form, visitor_phone: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Relation</label>
                <input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} className={inp} placeholder="Friend, Parent, etc." />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Purpose</label>
                <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={inp} placeholder="Visit, delivery..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Visit Date *</label>
                <input type="date" required value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Visit Time</label>
                <input type="time" value={form.visit_time} onChange={(e) => setForm({ ...form, visit_time: e.target.value })} className={inp} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">Expected Duration</label>
                <input value={form.expected_duration} onChange={(e) => setForm({ ...form, expected_duration: e.target.value })} className={inp} placeholder="2 hours, full day..." />
              </div>
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? "Submitting..." : "Submit Request"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fine Dialog (Admin) */}
      <Dialog open={!!showFine} onOpenChange={() => setShowFine(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Impose Fine</DialogTitle></DialogHeader>
          {showFine && (
            <form onSubmit={handleFine} className="space-y-3">
              <div className="p-3 bg-stone-50 rounded-lg text-sm text-stone-700">
                Visitor: <strong>{showFine.visitor_name}</strong> &middot; Tenant: <strong>{showFine.tenant_name}</strong>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Fine Amount ({t("common.inr")}) *</label>
                <input type="number" min="1" required value={fineForm.fine_amount} onChange={(e) => setFineForm({ ...fineForm, fine_amount: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Reason *</label>
                <input required value={fineForm.fine_reason} onChange={(e) => setFineForm({ ...fineForm, fine_reason: e.target.value })} className={inp} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowFine(null)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">Cancel</button>
                <button type="submit" className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">Impose Fine</button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Visitors;
