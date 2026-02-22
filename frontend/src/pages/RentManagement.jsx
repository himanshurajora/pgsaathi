import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import { Plus, CreditCard, Search, IndianRupee, Calendar, FileText, Zap } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

const STATUS_STYLES = {
  paid: "bg-lime-100 text-lime-700",
  partial: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  pending: "bg-stone-100 text-stone-600",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const RentManagement = () => {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateInv, setShowCreateInv] = useState(false);
  const [showRecPay, setShowRecPay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkForm, setBulkForm] = useState({ property_id: "", include_food: false });
  const [bulking, setBulking] = useState(false);

  const now = new Date();
  const [invForm, setInvForm] = useState({
    tenant_id: "", property_id: "", billing_month: now.getMonth() + 1, billing_year: now.getFullYear(),
    rent_amount: "", food_amount: "", other_charges: "", previous_balance: "", notes: "",
  });
  const [payForm, setPayForm] = useState({ invoice_id: "", tenant_id: "", property_id: "", amount: "", payment_date: now.toISOString().slice(0, 10), payment_mode: "cash", notes: "" });

  const fetchAll = async () => {
    try {
      const [invRes, payRes, tenRes, propRes] = await Promise.all([API.get("/invoices"), API.get("/payments"), API.get("/tenants"), API.get("/properties")]);
      setInvoices(invRes.data);
      setPayments(payRes.data);
      setTenants(tenRes.data);
      setProperties(propRes.data);
    } catch { toast.error("Failed to load billing data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tenant = tenants.find((t) => t.id === invForm.tenant_id);
      await API.post("/invoices", { ...invForm, billing_month: +invForm.billing_month, billing_year: +invForm.billing_year, rent_amount: +invForm.rent_amount || 0, food_amount: +invForm.food_amount || 0, other_charges: +invForm.other_charges || 0, previous_balance: +invForm.previous_balance || 0, property_id: invForm.property_id || tenant?.property_id || "" });
      toast.success("Invoice created!");
      setShowCreateInv(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to create invoice"); }
    finally { setSaving(false); }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/payments", { ...payForm, amount: +payForm.amount });
      toast.success("Payment recorded!");
      setShowRecPay(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to record payment"); }
    finally { setSaving(false); }
  };

  const openPayment = (inv) => {
    setPayForm((f) => ({ ...f, invoice_id: inv.id, tenant_id: inv.tenant_id, property_id: inv.property_id, amount: inv.due_amount || "" }));
    setShowRecPay(inv);
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    setBulking(true);
    try {
      const res = await API.post("/invoices/bulk", {
        property_id: bulkForm.property_id,
        billing_month: now.getMonth() + 1,
        billing_year: now.getFullYear(),
        include_food: bulkForm.include_food,
      });
      toast.success(`${res.data.created} invoices created, ${res.data.skipped?.length || 0} skipped`);
      setShowBulk(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setBulking(false); }
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

  const filteredInvoices = invoices.filter((inv) => !search || inv.tenant_name?.toLowerCase().includes(search.toLowerCase()) || inv.invoice_number?.toLowerCase().includes(search.toLowerCase()));

  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{t("rent.title")}</h1>
          <p className="text-stone-500 text-sm">{invoices.length} invoices total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowBulk(true); if (properties[0]) setBulkForm((f) => ({ ...f, property_id: f.property_id || properties[0]?.id })); }} data-testid="bulk-invoice-btn" className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-sm font-semibold shadow-sm transition-all">
            <Zap size={14} />Bulk Generate
          </button>
          <button onClick={() => setShowCreateInv(true)} data-testid="create-invoice-btn" className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all">
            <Plus size={14} strokeWidth={2.5} />{t("rent.create_invoice")}
          </button>
        </div>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="bg-stone-100 border-0 p-1 rounded-xl">
          <TabsTrigger value="invoices" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">{t("rent.invoices")}</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">{t("rent.payments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tenant or invoice number..." className="w-full h-10 pl-9 pr-4 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm" />
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
              <CreditCard size={40} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
              <p className="text-stone-400 text-sm">No invoices yet. Create your first invoice.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} data-testid={`invoice-row-${inv.id}`} className="bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>{inv.tenant_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[inv.status] || "bg-stone-100 text-stone-600"}`}>{t(`rent.status.${inv.status}`) || inv.status}</span>
                      </div>
                      <p className="text-xs text-stone-400">{inv.invoice_number} · {MONTHS[inv.billing_month - 1]} {inv.billing_year}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>₹{inv.total_amount?.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-stone-400">Due: <span className={inv.due_amount > 0 ? "text-red-500 font-medium" : "text-lime-600 font-medium"}>₹{inv.due_amount?.toLocaleString("en-IN")}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-stone-100">
                    <div className="text-xs text-stone-500">Rent: <span className="font-medium text-stone-700">₹{inv.rent_amount?.toLocaleString("en-IN")}</span></div>
                    {inv.food_amount > 0 && <div className="text-xs text-stone-500">Food: <span className="font-medium text-stone-700">₹{inv.food_amount?.toLocaleString("en-IN")}</span></div>}
                    <div className="ml-auto flex gap-1.5">
                      <button onClick={() => downloadInvoice(inv.id)} className="px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg text-xs font-medium transition-colors" data-testid={`download-pdf-${inv.id}`}>
                        <FileText size={12} className="inline mr-1" />PDF
                      </button>
                      {inv.status !== "paid" && (
                        <button onClick={() => openPayment(inv)} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold transition-colors">
                          Record Payment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {payments.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
              <IndianRupee size={40} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
              <p className="text-stone-400 text-sm">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((pay) => {
                const tenant = tenants.find((t) => t.id === pay.tenant_id);
                return (
                  <div key={pay.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900 text-sm">{tenant?.name || "Unknown"}</p>
                      <p className="text-xs text-stone-400">{pay.receipt_number} · {pay.payment_date} · <span className="capitalize">{pay.payment_mode}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lime-700 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>₹{pay.amount?.toLocaleString("en-IN")}</p>
                      <p className="text-[10px] text-stone-400">Paid</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateInv} onOpenChange={setShowCreateInv}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>{t("rent.create_invoice")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Tenant *</label>
              <select required value={invForm.tenant_id} onChange={(e) => { const t = tenants.find((t) => t.id === e.target.value); setInvForm((f) => ({ ...f, tenant_id: e.target.value, property_id: t?.property_id || f.property_id, rent_amount: t?.monthly_rent || f.rent_amount })); }} className={`${inp} appearance-none bg-white`}>
                <option value="">-- Select tenant --</option>
                {tenants.filter((t) => t.status === "active").map((t) => <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Month *</label>
                <select value={invForm.billing_month} onChange={(e) => setInvForm({ ...invForm, billing_month: +e.target.value })} className={`${inp} appearance-none bg-white`}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Year *</label>
                <input type="number" required value={invForm.billing_year} onChange={(e) => setInvForm({ ...invForm, billing_year: +e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("rent.rent_amount")} *</label>
                <input type="number" min="0" required value={invForm.rent_amount} onChange={(e) => setInvForm({ ...invForm, rent_amount: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("rent.food_amount")}</label>
                <input type="number" min="0" value={invForm.food_amount} onChange={(e) => setInvForm({ ...invForm, food_amount: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("rent.other_charges")}</label>
                <input type="number" min="0" value={invForm.other_charges} onChange={(e) => setInvForm({ ...invForm, other_charges: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("rent.previous_balance")}</label>
                <input type="number" min="0" value={invForm.previous_balance} onChange={(e) => setInvForm({ ...invForm, previous_balance: e.target.value })} className={inp} />
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button type="button" onClick={() => setShowCreateInv(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? t("common.loading") : t("common.save")}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!showRecPay} onOpenChange={() => setShowRecPay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>{t("rent.record_payment")}</DialogTitle></DialogHeader>
          {showRecPay && (
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div className="p-3 bg-stone-50 rounded-lg text-sm text-stone-700">
                Invoice: <strong>{showRecPay.invoice_number}</strong> · Due: <strong className="text-red-600">₹{showRecPay.due_amount?.toLocaleString("en-IN")}</strong>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("rent.paid")} (₹) *</label>
                <input type="number" min="1" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("rent.payment_date")} *</label>
                <input type="date" required value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t("rent.payment_mode")} *</label>
                <select value={payForm.payment_mode} onChange={(e) => setPayForm({ ...payForm, payment_mode: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  {["cash", "upi", "bank_transfer", "cheque", "other"].map((m) => <option key={m} value={m} className="capitalize">{m.replace("_", " ").toUpperCase()}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRecPay(null)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 bg-lime-600 text-white rounded-lg text-sm font-semibold hover:bg-lime-700 disabled:opacity-60">{saving ? t("common.loading") : "Record"}</button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Invoice Dialog */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Bulk Generate Invoices</DialogTitle></DialogHeader>
          <form onSubmit={handleBulkGenerate} className="space-y-3">
            <p className="text-xs text-stone-500">Generate invoices for all active tenants in a property for the current month ({MONTHS[now.getMonth()]} {now.getFullYear()}).</p>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Property *</label>
              <select required value={bulkForm.property_id} onChange={(e) => setBulkForm({ ...bulkForm, property_id: e.target.value })} className={`${inp} appearance-none bg-white`}>
                <option value="">-- Select property --</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="checkbox" checked={bulkForm.include_food} onChange={(e) => setBulkForm({ ...bulkForm, include_food: e.target.checked })} className="w-4 h-4 rounded border-stone-300 accent-amber-600" />
              Include food/mess charges
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowBulk(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" disabled={bulking || !bulkForm.property_id} className="flex-1 h-10 bg-stone-800 text-white rounded-lg text-sm font-semibold hover:bg-stone-900 disabled:opacity-60">{bulking ? "Generating..." : "Generate All"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentManagement;
