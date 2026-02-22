import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import { ArrowLeft, User, Phone, Mail, Bed, Building2, IndianRupee, FileText, MessageSquare, Camera, Upload, CheckCircle, XCircle, LogOut, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

const STATUS_STYLES = { paid: "bg-lime-100 text-lime-700", partial: "bg-amber-100 text-amber-700", overdue: "bg-red-100 text-red-700", pending: "bg-stone-100 text-stone-600" };
const COMPLAINT_STATUS = { open: "bg-red-100 text-red-700", in_progress: "bg-amber-100 text-amber-700", resolved: "bg-lime-100 text-lime-700", closed: "bg-stone-100 text-stone-500" };
const KYC_BADGES = { pending: "bg-amber-100 text-amber-700", verified: "bg-lime-100 text-lime-700", rejected: "bg-red-100 text-red-700" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TenantDetail = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [allBeds, setAllBeds] = useState([]);
  const [switchData, setSwitchData] = useState({ new_bed_id: "", new_room_id: "" });

  const fetchDetail = async () => {
    try {
      const res = await API.get(`/tenants/${id}/detail`);
      setData(res.data);
    } catch { toast.error("Failed to load tenant details"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await API.post(`/tenants/${id}/upload-kyc`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploaded!");
      fetchDetail();
    } catch (err) { toast.error(err.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleKYC = async (status) => {
    await API.put(`/tenants/${id}/kyc`, { kyc_status: status });
    toast.success(`KYC ${status}`);
    fetchDetail();
  };

  const handleCheckout = async () => {
    try {
      const res = await API.post(`/tenants/${id}/checkout`, { check_out_date: new Date().toISOString().slice(0, 10) });
      toast.success("Tenant checked out!");
      setShowCheckout(false);
      fetchDetail();
    } catch (err) { toast.error(err.response?.data?.detail || "Checkout failed"); }
  };

  const openSwitchBed = async () => {
    setShowSwitch(true);
    if (data?.tenant?.property_id) {
      try {
        const res = await API.get(`/properties/${data.tenant.property_id}/floors`);
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
    }
  };

  const handleSwitch = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/tenants/${id}/switch-bed`, switchData);
      toast.success("Bed switched!");
      setShowSwitch(false);
      fetchDetail();
    } catch (err) { toast.error(err.response?.data?.detail || "Switch failed"); }
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
    } catch { toast.error("Failed to download"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" /></div>;
  if (!data?.tenant) return <div className="text-center p-10 text-stone-400">Tenant not found</div>;

  const { tenant, bed_info, room_info, property_info, invoices, payments, complaints, meal_plan } = data;
  const totalDues = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.due_amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-6" data-testid="tenant-detail-page">
      <div className="flex items-center gap-3">
        <Link to="/tenants" className="p-2 hover:bg-stone-100 rounded-lg text-stone-500 hover:text-stone-800"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{tenant.name}</h1>
          <p className="text-stone-500 text-sm">{tenant.email} &middot; {tenant.phone}</p>
        </div>
        <div className="flex gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${KYC_BADGES[tenant.kyc_status] || "bg-stone-100"}`}>KYC: {tenant.kyc_status}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${tenant.status === "active" ? "bg-lime-100 text-lime-700" : "bg-stone-100 text-stone-600"}`}>{tenant.status}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 uppercase mb-1">Monthly Rent</p>
          <p className="text-xl font-bold text-amber-600" style={{ fontFamily: "Manrope, sans-serif" }}>{t("common.inr")}{tenant.monthly_rent?.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 uppercase mb-1">Pending Dues</p>
          <p className="text-xl font-bold text-red-500" style={{ fontFamily: "Manrope, sans-serif" }}>{t("common.inr")}{totalDues.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 uppercase mb-1">Total Paid</p>
          <p className="text-xl font-bold text-lime-700" style={{ fontFamily: "Manrope, sans-serif" }}>{t("common.inr")}{totalPaid.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 uppercase mb-1">Deposit</p>
          <p className="text-xl font-bold text-stone-700" style={{ fontFamily: "Manrope, sans-serif" }}>{t("common.inr")}{(tenant.security_deposit || 0).toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Info + Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-900 text-sm mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>Accommodation</h3>
          {property_info && <p className="text-sm text-stone-600 mb-1"><Building2 size={13} className="inline mr-1.5 text-amber-600" />{property_info.name}</p>}
          {room_info && <p className="text-sm text-stone-600 mb-1"><Bed size={13} className="inline mr-1.5 text-amber-600" />Room {room_info.room_number}</p>}
          {bed_info && <p className="text-sm text-stone-600 mb-1">Bed {bed_info.bed_number} &middot; {t("common.inr")}{bed_info.price}/mo</p>}
          <p className="text-xs text-stone-400 mt-2">Check-in: {tenant.check_in_date?.slice(0, 10)}</p>
          {tenant.check_out_date && <p className="text-xs text-stone-400">Check-out: {tenant.check_out_date?.slice(0, 10)}</p>}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-900 text-sm mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>Emergency Contact</h3>
          <p className="text-sm text-stone-600 mb-1"><User size={13} className="inline mr-1.5 text-stone-400" />{tenant.emergency_contact_name}</p>
          <p className="text-sm text-stone-600"><Phone size={13} className="inline mr-1.5 text-stone-400" />{tenant.emergency_contact_phone}</p>
          {meal_plan && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Meal Plan</p>
              <p className="text-sm text-stone-600">{meal_plan.opted_meals?.join(", ") || "None"}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-900 text-sm mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>Actions</h3>
          <div className="space-y-1.5">
            {tenant.kyc_status === "pending" && (
              <button onClick={() => handleKYC("verified")} data-testid="verify-kyc-btn" className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-lime-50 text-lime-700 rounded-lg font-medium hover:bg-lime-100">
                <CheckCircle size={13} /> Verify KYC
              </button>
            )}
            {tenant.kyc_status === "verified" && (
              <button onClick={() => handleKYC("rejected")} className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100">
                <XCircle size={13} /> Reject KYC
              </button>
            )}
            {tenant.status === "active" && tenant.bed_id && (
              <button onClick={openSwitchBed} data-testid="switch-bed-btn" className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100">
                <ArrowRightLeft size={13} /> Switch Bed/Room
              </button>
            )}
            {tenant.status === "active" && (
              <button onClick={() => setShowCheckout(true)} data-testid="checkout-btn" className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-stone-100 text-stone-700 rounded-lg font-medium hover:bg-stone-200">
                <LogOut size={13} /> Check Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KYC Documents */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>KYC Documents</h3>
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium cursor-pointer hover:bg-amber-100" data-testid="upload-kyc-btn">
              <Upload size={13} /> Upload File
              <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium cursor-pointer hover:bg-blue-100" data-testid="camera-kyc-btn">
              <Camera size={13} /> Take Photo
              <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>
        {uploading && <p className="text-xs text-amber-600 mb-2">Uploading...</p>}
        {(!tenant.kyc_documents || tenant.kyc_documents.length === 0) ? (
          <p className="text-xs text-stone-400 py-3 text-center">No documents uploaded yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tenant.kyc_documents.map((doc) => (
              <div key={doc.id} className="border border-stone-200 rounded-lg p-2 text-center">
                <FileText size={24} className="text-stone-300 mx-auto mb-1" />
                <p className="text-[10px] text-stone-500 truncate">{doc.original_name}</p>
                <p className="text-[10px] text-stone-400">{doc.uploaded_at?.slice(0, 10)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs for invoices, payments, complaints */}
      <Tabs defaultValue="invoices">
        <TabsList className="bg-stone-100 border-0 p-1 rounded-xl">
          <TabsTrigger value="invoices" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="complaints" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Complaints ({complaints.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="mt-6 space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-stone-900">{inv.invoice_number}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_STYLES[inv.status]}`}>{inv.status}</span></div>
                <p className="text-xs text-stone-400">{MONTHS[inv.billing_month - 1]} {inv.billing_year} &middot; Due: {t("common.inr")}{inv.due_amount?.toLocaleString("en-IN")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-stone-900">{t("common.inr")}{inv.total_amount?.toLocaleString("en-IN")}</span>
                <button onClick={() => downloadInvoice(inv.id)} className="p-1.5 hover:bg-amber-50 rounded text-stone-400 hover:text-amber-600"><FileText size={14} /></button>
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="payments" className="mt-6 space-y-3">
          {payments.map((pay) => (
            <div key={pay.id} className="bg-white rounded-xl border border-stone-200 p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-stone-900 text-sm">{pay.receipt_number}</p>
                <p className="text-xs text-stone-400">{pay.payment_date} &middot; <span className="capitalize">{pay.payment_mode?.replace("_", " ")}</span></p>
              </div>
              <p className="font-bold text-lime-700 text-sm">{t("common.inr")}{pay.amount?.toLocaleString("en-IN")}</p>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="complaints" className="mt-6 space-y-3">
          {complaints.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-stone-900 text-sm">{c.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${COMPLAINT_STATUS[c.status]}`}>{c.status?.replace("_", " ")}</span>
              </div>
              <p className="text-xs text-stone-500">{c.description}</p>
              <p className="text-xs text-stone-400 mt-1">{c.created_at?.slice(0, 10)}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Checkout Confirmation */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Check Out {tenant.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 rounded-lg text-sm text-stone-700">
              <p><strong>Pending Dues:</strong> {t("common.inr")}{totalDues.toLocaleString("en-IN")}</p>
              <p><strong>Security Deposit:</strong> {t("common.inr")}{(tenant.security_deposit || 0).toLocaleString("en-IN")}</p>
              <p className="mt-1 font-semibold"><strong>Net Settlement:</strong> {t("common.inr")}{(totalDues - (tenant.security_deposit || 0)).toLocaleString("en-IN")}</p>
            </div>
            <p className="text-xs text-stone-500">This will release the bed and mark the tenant as checked out.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCheckout(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCheckout} data-testid="confirm-checkout-btn" className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">Confirm Checkout</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Switch Bed Dialog */}
      <Dialog open={showSwitch} onOpenChange={setShowSwitch}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Switch Bed</DialogTitle></DialogHeader>
          <form onSubmit={handleSwitch} className="space-y-3">
            {allBeds.length === 0 ? (
              <p className="text-sm text-stone-400 py-3 text-center">No available beds</p>
            ) : (
              <select required value={switchData.new_bed_id} onChange={(e) => { const bed = allBeds.find((b) => b.id === e.target.value); setSwitchData({ new_bed_id: e.target.value, new_room_id: bed?.room_id || "" }); }} className="w-full h-10 px-3 border border-stone-200 rounded-lg text-sm appearance-none bg-white">
                <option value="">-- Select new bed --</option>
                {allBeds.map((b) => <option key={b.id} value={b.id}>Room {b.room_number} - Bed {b.bed_number} ({t("common.inr")}{b.price}/mo)</option>)}
              </select>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowSwitch(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={!switchData.new_bed_id} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">Switch</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantDetail;
