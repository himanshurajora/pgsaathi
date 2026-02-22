import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Plus, Megaphone, Pin, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const PRIORITY_STYLES = { urgent: "bg-red-100 text-red-700", normal: "bg-stone-100 text-stone-600", low: "bg-lime-100 text-lime-700" };

const NoticeBoard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ property_id: "", title: "", content: "", priority: "normal", is_pinned: false });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [notRes, propRes] = await Promise.all([API.get("/notices"), API.get("/properties")]);
      setNotices(notRes.data);
      setProperties(propRes.data);
      if (propRes.data.length > 0 && !form.property_id) setForm((f) => ({ ...f, property_id: propRes.data[0].id }));
    } catch { toast.error("Failed to load notices"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/notices", form);
      toast.success("Notice posted!");
      setShowAdd(false);
      setForm({ property_id: properties[0]?.id || "", title: "", content: "", priority: "normal", is_pinned: false });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notice?")) return;
    await API.delete(`/notices/${id}`);
    toast.success("Notice deleted");
    fetchAll();
  };

  const togglePin = async (notice) => {
    await API.put(`/notices/${notice.id}`, { is_pinned: !notice.is_pinned });
    toast.success(notice.is_pinned ? "Unpinned" : "Pinned");
    fetchAll();
  };

  const pinned = notices.filter((n) => n.is_pinned);
  const unpinned = notices.filter((n) => !n.is_pinned);
  const isAdmin = user?.role !== "tenant";
  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  return (
    <div className="space-y-6" data-testid="notice-board-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>Notice Board</h1>
          <p className="text-stone-500 text-sm">{notices.length} notices</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} data-testid="add-notice-btn" className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm">
            <Plus size={15} strokeWidth={2.5} />Post Notice
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
          <Megaphone size={40} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-stone-400 text-sm">No notices posted yet</p>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Pinned</p>
              {pinned.map((n) => (
                <div key={n.id} data-testid={`notice-${n.id}`} className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Pin size={12} className="text-amber-600" />
                        <h3 className="font-semibold text-stone-900 text-sm">{n.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${PRIORITY_STYLES[n.priority]}`}>{n.priority}</span>
                      </div>
                      <p className="text-xs text-stone-600">{n.content}</p>
                      <p className="text-xs text-stone-400 mt-1">By {n.created_by_name} &middot; {n.created_at?.slice(0, 10)}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => togglePin(n)} className="p-1.5 hover:bg-amber-100 rounded text-amber-600"><Pin size={13} /></button>
                        <button onClick={() => handleDelete(n.id)} className="p-1.5 hover:bg-red-50 rounded text-stone-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {unpinned.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Recent</p>}
              {unpinned.map((n) => (
                <div key={n.id} data-testid={`notice-${n.id}`} className="bg-white rounded-xl border border-stone-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-stone-900 text-sm">{n.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${PRIORITY_STYLES[n.priority]}`}>{n.priority}</span>
                      </div>
                      <p className="text-xs text-stone-500">{n.content}</p>
                      <p className="text-xs text-stone-400 mt-1">By {n.created_by_name} &middot; {n.created_at?.slice(0, 10)}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => togglePin(n)} className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-amber-600"><Pin size={13} /></button>
                        <button onClick={() => handleDelete(n.id)} className="p-1.5 hover:bg-red-50 rounded text-stone-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Post Notice</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Property</label>
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className={`${inp} appearance-none bg-white`}>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Content</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-stone-200 focus:border-amber-600 rounded-lg outline-none text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                  <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} className="w-4 h-4 rounded border-stone-300 accent-amber-600" />
                  Pin to top
                </label>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? "Posting..." : "Post"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoticeBoard;
