import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Plus, Users, Trash2, Pencil, Shield } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const ROLE_BADGES = { owner: "bg-amber-100 text-amber-700", warden: "bg-blue-100 text-blue-700", tenant: "bg-lime-100 text-lime-700" };

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "warden", property_id: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [uRes, pRes] = await Promise.all([API.get("/users"), API.get("/properties")]);
      setUsers(uRes.data);
      setProperties(pRes.data);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/users", form);
      toast.success("User created!");
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "warden", property_id: "", phone: "" });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put(`/users/${editUser.id}`, { name: form.name, role: form.role, property_id: form.property_id, phone: form.phone, password: form.password || undefined });
      toast.success("User updated!");
      setEditUser(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await API.delete(`/users/${id}`);
      toast.success("User deleted");
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const toggleActive = async (u) => {
    await API.put(`/users/${u.id}`, { is_active: !u.is_active });
    toast.success(u.is_active ? "User deactivated" : "User activated");
    fetchAll();
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: "", role: u.role, property_id: u.property_id || "", phone: u.phone || "" });
    setEditUser(u);
  };

  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  if (user?.role !== "owner") return <div className="p-10 text-center text-stone-400">Access restricted to owners only.</div>;

  return (
    <div className="space-y-6" data-testid="user-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>User Management</h1>
          <p className="text-stone-500 text-sm">{users.length} users</p>
        </div>
        <button onClick={() => { setForm({ name: "", email: "", password: "", role: "warden", property_id: "", phone: "" }); setShowAdd(true); }} data-testid="add-user-btn" className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm">
          <Plus size={15} strokeWidth={2.5} />Add User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
          <Users size={40} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-stone-400 text-sm">No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} data-testid={`user-row-${u.id}`} className="bg-white rounded-xl border border-stone-200 p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-700 font-semibold text-sm">{u.name?.[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900 text-sm">{u.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${ROLE_BADGES[u.role] || "bg-stone-100"}`}>{u.role}</span>
                    {!u.is_active && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-red-100 text-red-700">Inactive</span>}
                  </div>
                  <p className="text-xs text-stone-400">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-amber-50 rounded text-stone-400 hover:text-amber-600"><Pencil size={14} /></button>
                <button onClick={() => toggleActive(u)} className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700"><Shield size={14} /></button>
                {u.id !== user?.id && <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-red-50 rounded text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Add User</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Password *</label>
                <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="warden">Warden</option>
                  <option value="tenant">Tenant</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Assigned Property</label>
                <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="">-- None --</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? "Creating..." : "Create"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Edit User</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">New Password (leave blank to keep)</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="warden">Warden</option>
                  <option value="tenant">Tenant</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">Assigned Property</label>
                <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="">-- None --</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setEditUser(null)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
