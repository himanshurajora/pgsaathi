import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Home, IndianRupee, MessageSquare, Utensils, Bell as BellIcon, FileText, Bed, Building2, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

const STATUS_STYLES = { paid: "bg-lime-100 text-lime-700", partial: "bg-amber-100 text-amber-700", overdue: "bg-red-100 text-red-700", pending: "bg-stone-100 text-stone-600" };
const COMPLAINT_STATUS = { open: "bg-red-100 text-red-700", in_progress: "bg-amber-100 text-amber-700", resolved: "bg-lime-100 text-lime-700", closed: "bg-stone-100 text-stone-500" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TenantDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComplaint, setShowComplaint] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ category: "other", title: "", description: "", priority: "medium" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [dashRes, invRes, payRes, compRes, notRes] = await Promise.all([
        API.get("/tenant-portal/dashboard"),
        API.get("/tenant-portal/invoices"),
        API.get("/tenant-portal/payments"),
        API.get("/tenant-portal/complaints"),
        API.get("/tenant-portal/notices"),
      ]);
      setData(dashRes.data);
      setInvoices(invRes.data);
      setPayments(payRes.data);
      setComplaints(compRes.data);
      setNotices(notRes.data);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleComplaint = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/tenant-portal/complaints", complaintForm);
      toast.success("Complaint submitted!");
      setShowComplaint(false);
      setComplaintForm({ category: "other", title: "", description: "", priority: "medium" });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      const res = await API.get(`/invoices/${invoiceId}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { toast.error("Failed to download invoice"); }
  };

  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" /></div>;

  const tenant = data?.tenant;
  const noTenant = !tenant;

  return (
    <div className="space-y-5" data-testid="tenant-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>
          {t("nav.dashboard")}
        </h1>
        <p className="text-stone-500 text-sm">Welcome, {user?.name}</p>
      </div>

      {noTenant ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
          <Home size={40} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-stone-500 text-sm">Your tenant profile is being set up. Please contact your PG admin.</p>
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-stone-200 p-4" data-testid="stat-pending-dues">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Pending Dues</p>
              <p className="text-2xl font-bold text-red-500" style={{ fontFamily: "Manrope, sans-serif" }}>
                {t("common.inr")}{(data?.pending_dues || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4" data-testid="stat-monthly-rent">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Monthly Rent</p>
              <p className="text-2xl font-bold text-amber-600" style={{ fontFamily: "Manrope, sans-serif" }}>
                {t("common.inr")}{(tenant?.monthly_rent || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4" data-testid="stat-complaints">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Open Complaints</p>
              <p className="text-2xl font-bold text-stone-700" style={{ fontFamily: "Manrope, sans-serif" }}>{data?.open_complaints || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4" data-testid="stat-room">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Room / Bed</p>
              <p className="text-lg font-bold text-stone-700" style={{ fontFamily: "Manrope, sans-serif" }}>
                {data?.room_info ? `Room ${data.room_info.room_number}` : "Not assigned"}
                {data?.bed_info ? ` / ${data.bed_info.bed_number}` : ""}
              </p>
            </div>
          </div>

          {/* Property + Room Info */}
          {data?.property_info && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-amber-50 rounded-lg"><Building2 size={18} className="text-amber-600" /></div>
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">{data.property_info.name}</h3>
                  <p className="text-xs text-stone-400">{data.property_info.address}, {data.property_info.city}</p>
                </div>
              </div>
              {data.property_info.contact_phone && (
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Phone size={12} /> {data.property_info.contact_phone}
                </div>
              )}
            </div>
          )}

          <Tabs defaultValue="invoices">
            <TabsList className="bg-stone-100 border-0 p-1 rounded-xl">
              <TabsTrigger value="invoices" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Invoices</TabsTrigger>
              <TabsTrigger value="payments" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Payments</TabsTrigger>
              <TabsTrigger value="complaints" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Complaints</TabsTrigger>
              <TabsTrigger value="notices" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Notices</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices" className="mt-4">
              {invoices.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                  <FileText size={32} className="text-stone-200 mx-auto mb-2" />
                  <p className="text-stone-400 text-sm">No invoices yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div key={inv.id} data-testid={`tenant-invoice-${inv.id}`} className="bg-white rounded-xl border border-stone-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-stone-900 text-sm">{inv.invoice_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_STYLES[inv.status] || "bg-stone-100"}`}>{inv.status}</span>
                          </div>
                          <p className="text-xs text-stone-400">{MONTHS[inv.billing_month - 1]} {inv.billing_year}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-stone-900 text-sm">{t("common.inr")}{inv.total_amount?.toLocaleString("en-IN")}</p>
                          <p className="text-xs text-stone-400">Due: <span className={inv.due_amount > 0 ? "text-red-500 font-medium" : "text-lime-600"}>{t("common.inr")}{inv.due_amount?.toLocaleString("en-IN")}</span></p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-stone-100 flex justify-end">
                        <button onClick={() => downloadInvoice(inv.id)} className="px-3 py-1 text-xs bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100" data-testid={`download-invoice-${inv.id}`}>
                          Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {payments.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                  <IndianRupee size={32} className="text-stone-200 mx-auto mb-2" />
                  <p className="text-stone-400 text-sm">No payments recorded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((pay) => (
                    <div key={pay.id} className="bg-white rounded-xl border border-stone-200 p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-stone-900 text-sm">{pay.receipt_number}</p>
                        <p className="text-xs text-stone-400">{pay.payment_date} &middot; <span className="capitalize">{pay.payment_mode?.replace("_", " ")}</span></p>
                      </div>
                      <p className="font-bold text-lime-700 text-sm">{t("common.inr")}{pay.amount?.toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="complaints" className="mt-4">
              <div className="flex justify-end mb-3">
                <button onClick={() => setShowComplaint(true)} data-testid="tenant-add-complaint-btn" className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold">
                  <MessageSquare size={14} /> Raise Complaint
                </button>
              </div>
              {complaints.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                  <MessageSquare size={32} className="text-stone-200 mx-auto mb-2" />
                  <p className="text-stone-400 text-sm">No complaints</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {complaints.map((c) => (
                    <div key={c.id} data-testid={`tenant-complaint-${c.id}`} className="bg-white rounded-xl border border-stone-200 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-stone-900 text-sm">{c.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${COMPLAINT_STATUS[c.status] || "bg-stone-100"}`}>{c.status?.replace("_", " ")}</span>
                      </div>
                      <p className="text-xs text-stone-500">{c.description}</p>
                      <p className="text-xs text-stone-400 mt-1">{c.created_at?.slice(0, 10)} &middot; <span className="capitalize">{c.category}</span></p>
                      {c.resolution_notes && <p className="text-xs text-lime-700 mt-1 bg-lime-50 p-2 rounded">Resolution: {c.resolution_notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notices" className="mt-4">
              {notices.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                  <BellIcon size={32} className="text-stone-200 mx-auto mb-2" />
                  <p className="text-stone-400 text-sm">No notices</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notices.map((n) => (
                    <div key={n.id} className="bg-white rounded-xl border border-stone-200 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        {n.is_pinned && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">PINNED</span>}
                        <h3 className="font-semibold text-stone-900 text-sm">{n.title}</h3>
                      </div>
                      <p className="text-xs text-stone-500">{n.content}</p>
                      <p className="text-xs text-stone-400 mt-1">By {n.created_by_name} &middot; {n.created_at?.slice(0, 10)}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Raise Complaint Dialog */}
      <Dialog open={showComplaint} onOpenChange={setShowComplaint}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Raise a Complaint</DialogTitle></DialogHeader>
          <form onSubmit={handleComplaint} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
                <select value={complaintForm.category} onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  {["electrical", "plumbing", "cleaning", "food", "security", "other"].map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Priority</label>
                <select value={complaintForm.priority} onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Title *</label>
              <input required value={complaintForm.title} onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Description *</label>
              <textarea required value={complaintForm.description} onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-stone-200 focus:border-amber-600 rounded-lg outline-none text-sm resize-none" />
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setShowComplaint(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? "Sending..." : "Submit"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantDashboard;
