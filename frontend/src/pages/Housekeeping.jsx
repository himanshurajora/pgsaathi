import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Plus, Trash2, CheckCircle, Clock, Paintbrush, Wrench, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const TYPE_ICONS = { cleaning: Paintbrush, maintenance: Wrench, inspection: Search };
const STATUS_STYLES = { pending: "bg-amber-100 text-amber-700", in_progress: "bg-blue-100 text-blue-700", completed: "bg-lime-100 text-lime-700" };
const PRIORITY_STYLES = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-stone-100 text-stone-600" };
const RECURRENCE_LABELS = { once: "One-time", daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

const Housekeeping = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ property_id: "", task_type: "cleaning", title: "", description: "", assigned_to: "", scheduled_date: new Date().toISOString().slice(0, 10), recurrence: "once", priority: "medium" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [taskRes, propRes] = await Promise.all([API.get("/housekeeping"), API.get("/properties")]);
      setTasks(taskRes.data);
      setProperties(propRes.data);
      if (propRes.data.length > 0 && !form.property_id) setForm((f) => ({ ...f, property_id: propRes.data[0].id }));
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/housekeeping", form);
      toast.success("Task created!");
      setShowAdd(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    await API.put(`/housekeeping/${id}`, { status });
    toast.success(`Marked as ${status}`);
    fetchAll();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    await API.delete(`/housekeeping/${id}`);
    toast.success("Deleted");
    fetchAll();
  };

  const filtered = tasks.filter((t) => statusFilter === "all" || t.status === statusFilter);
  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  return (
    <div className="space-y-5" data-testid="housekeeping-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>Housekeeping & Maintenance</h1>
          <p className="text-stone-500 text-sm">{tasks.filter((t) => t.status === "pending").length} pending tasks</p>
        </div>
        {user?.role !== "tenant" && (
          <button onClick={() => setShowAdd(true)} data-testid="add-task-btn" className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm">
            <Plus size={15} strokeWidth={2.5} />Add Task
          </button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {["all", "pending", "in_progress", "completed"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? "bg-amber-600 text-white" : "bg-white border border-stone-200 text-stone-600"}`}>
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
          <Paintbrush size={40} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-stone-400 text-sm">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const Icon = TYPE_ICONS[task.task_type] || Wrench;
            return (
              <div key={task.id} data-testid={`task-${task.id}`} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-stone-50"><Icon size={16} className="text-stone-500" /></div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-stone-900 text-sm">{task.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_STYLES[task.status]}`}>{task.status?.replace("_", " ")}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                      </div>
                      {task.description && <p className="text-xs text-stone-500">{task.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                        <span>Scheduled: {task.scheduled_date}</span>
                        <span className="capitalize">{RECURRENCE_LABELS[task.recurrence] || task.recurrence}</span>
                        {task.assigned_to && <span>Assigned to: {task.assigned_to}</span>}
                      </div>
                    </div>
                  </div>
                  {user?.role !== "tenant" && (
                    <div className="flex gap-1">
                      {task.status === "pending" && (
                        <button onClick={() => updateStatus(task.id, "in_progress")} className="p-1.5 hover:bg-blue-50 rounded text-stone-400 hover:text-blue-600" title="Start"><Clock size={14} /></button>
                      )}
                      {task.status !== "completed" && (
                        <button onClick={() => updateStatus(task.id, "completed")} className="p-1.5 hover:bg-lime-50 rounded text-stone-400 hover:text-lime-600" title="Complete"><CheckCircle size={14} /></button>
                      )}
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-red-50 rounded text-stone-400 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Add Housekeeping Task</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Property</label>
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className={`${inp} appearance-none bg-white`}>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Type</label>
                <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-stone-200 focus:border-amber-600 rounded-lg outline-none text-sm resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Scheduled Date</label>
                <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Recurrence</label>
                <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="once">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Assigned To</label>
                <input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className={inp} placeholder="Name" />
              </div>
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? "Creating..." : "Create"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Housekeeping;
