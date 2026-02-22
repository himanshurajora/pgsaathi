import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import { Plus, Utensils, CheckCircle2, XCircle, ClipboardList, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const MessManagement = () => {
  const { t } = useLanguage();
  const [configs, setConfigs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddConfig, setShowAddConfig] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configForm, setConfigForm] = useState({ property_id: "", monthly_amount: "", meal_types: ["breakfast", "lunch", "dinner"], veg_nonveg: "veg", tracking_mode: "fixed" });
  const [planForm, setPlanForm] = useState({ tenant_id: "", property_id: "", opted_meals: ["breakfast", "lunch", "dinner"], start_date: new Date().toISOString().slice(0, 10) });
  const [activeTab, setActiveTab] = useState("config");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState("");

  const fetchAll = async () => {
    try {
      const [confRes, planRes, tenRes, propRes] = await Promise.all([API.get("/mess/config"), API.get("/mess/plans"), API.get("/tenants"), API.get("/properties")]);
      setConfigs(confRes.data);
      setPlans(planRes.data);
      setTenants(tenRes.data);
      setProperties(propRes.data);
      if (propRes.data.length > 0) {
        setConfigForm((f) => ({ ...f, property_id: f.property_id || propRes.data[0].id }));
        setPlanForm((f) => ({ ...f, property_id: f.property_id || propRes.data[0].id }));
      }
    } catch { toast.error("Failed to load mess data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAttendance = async (date) => {
    setAttendanceLoading(true);
    try {
      const res = await API.get(`/mess/attendance?date=${date}`);
      setAttendanceRecords(res.data);
    } catch { toast.error(t("mess.attendance_load_failed") || "Failed to load attendance"); }
    finally { setAttendanceLoading(false); }
  };

  useEffect(() => { if (activeTab === "attendance") fetchAttendance(attendanceDate); }, [activeTab, attendanceDate]);

  const handleMarkAttendance = async (tenantId, mealType, present) => {
    try {
      await API.post("/mess/attendance", { tenant_id: tenantId, meal_type: mealType, date: attendanceDate, present });
      fetchAttendance(attendanceDate);
      toast.success(present ? (t("mess.marked_present") || "Marked present") : (t("mess.marked_absent") || "Marked absent"));
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const changeDate = (days) => {
    const d = new Date(attendanceDate);
    d.setDate(d.getDate() + days);
    setAttendanceDate(d.toISOString().slice(0, 10));
  };

  const handleCreateConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/mess/config", { ...configForm, monthly_amount: +configForm.monthly_amount });
      toast.success("Mess configuration saved!");
      setShowAddConfig(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/mess/plans", planForm);
      toast.success("Meal plan created!");
      setShowAddPlan(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const toggleMeal = (meal, form, setForm) => {
    const meals = form.opted_meals || [];
    setForm({ ...form, opted_meals: meals.includes(meal) ? meals.filter((m) => m !== meal) : [...meals, meal] });
  };

  const toggleConfigMeal = (meal) => {
    const meals = configForm.meal_types || [];
    setConfigForm({ ...configForm, meal_types: meals.includes(meal) ? meals.filter((m) => m !== meal) : [...meals, meal] });
  };

  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";
  const mealLabels = { breakfast: t("mess.breakfast"), lunch: t("mess.lunch"), dinner: t("mess.dinner") };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{t("mess.title")}</h1>
        <p className="text-stone-500 text-sm">{configs.length} {t("mess.config").toLowerCase()} · {plans.length} {t("mess.plans").toLowerCase()}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-lg w-fit">
        {[
          { key: "config", label: t("mess.config"), icon: Utensils },
          { key: "plans", label: t("mess.plans"), icon: Users },
          { key: "attendance", label: t("mess.attendance"), icon: ClipboardList },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === key ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {activeTab === "config" && (<>

      {/* Mess Configs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>{t("mess.config")}</h2>
          <button onClick={() => setShowAddConfig(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
            <Plus size={12} strokeWidth={2.5} />Add Config
          </button>
        </div>
        {configs.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
            <Utensils size={36} className="text-stone-200 mx-auto mb-3" strokeWidth={1} />
            <p className="text-stone-400 text-sm mb-3">No mess configuration set up</p>
            <button onClick={() => setShowAddConfig(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">Set Up Mess</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {configs.map((config) => {
              const prop = properties.find((p) => p.id === config.property_id);
              return (
                <div key={config.id} className="bg-white rounded-xl border border-stone-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>{prop?.name || "Property"}</h3>
                      <p className="text-xs text-stone-400 mt-0.5">{config.tracking_mode === "fixed" ? t("mess.fixed") : t("mess.attendance")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-600 text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>₹{config.monthly_amount?.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-stone-400">/month</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {config.meal_types?.map((m) => (
                      <span key={m} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium capitalize">{mealLabels[m] || m}</span>
                    ))}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${config.veg_nonveg === "veg" ? "bg-lime-50 text-lime-700" : config.veg_nonveg === "non-veg" ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600"}`}>
                      {config.veg_nonveg === "veg" ? t("mess.veg") : config.veg_nonveg === "non-veg" ? t("mess.non_veg") : t("mess.both")}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${config.is_active ? "bg-lime-100 text-lime-700" : "bg-stone-100 text-stone-500"}`}>{config.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </>)}

      {activeTab === "plans" && (<>
      {/* Meal Plans */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>{t("mess.plans")}</h2>
          <button onClick={() => setShowAddPlan(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors">
            <Plus size={12} strokeWidth={2.5} />Add Plan
          </button>
        </div>
        {plans.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-6 text-center">
            <p className="text-stone-400 text-sm">No meal plans created. Assign meal plans to tenants.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const tenant = tenants.find((t) => t.id === plan.tenant_id);
              return (
                <div key={plan.id} className="bg-white rounded-xl border border-stone-200 p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-amber-700 font-semibold text-xs">{tenant?.name?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900 text-sm">{tenant?.name || "Unknown"}</p>
                      <p className="text-xs text-stone-400">{plan.opted_meals?.map((m) => mealLabels[m] || m).join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${plan.is_active ? "bg-lime-100 text-lime-700" : "bg-stone-100 text-stone-500"}`}>{plan.is_active ? "Active" : "Inactive"}</span>
                    <button onClick={async () => { await API.put(`/mess/plans/${plan.id}`, { is_active: !plan.is_active }); fetchAll(); }} className="p-1.5 hover:bg-stone-100 rounded text-stone-400">
                      {plan.is_active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </>)}

      {activeTab === "attendance" && (
        <div className="space-y-4">
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-stone-100 rounded-md"><ChevronLeft size={16} /></button>
              <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm" />
              <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-stone-100 rounded-md"><ChevronRight size={16} /></button>
            </div>
            {properties.length > 1 && (
              <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} className="h-10 px-3 border border-stone-200 rounded-lg text-sm appearance-none bg-white">
                <option value="">{t("common.all")} {t("common.property")}</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          {attendanceLoading ? (
            <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="text-left px-4 py-3 font-semibold text-stone-700 text-xs uppercase">{t("tenant.name")}</th>
                    {["breakfast", "lunch", "dinner"].map((m) => (
                      <th key={m} className="text-center px-3 py-3 font-semibold text-stone-700 text-xs uppercase">{mealLabels[m]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plans.filter(p => p.is_active && (!selectedProperty || p.property_id === selectedProperty)).map((plan) => {
                    const tenant = tenants.find((t) => t.id === plan.tenant_id);
                    if (!tenant) return null;
                    return (
                      <tr key={plan.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                              <span className="text-amber-700 font-semibold text-[10px]">{tenant.name?.[0]?.toUpperCase()}</span>
                            </div>
                            <span className="font-medium text-stone-900">{tenant.name}</span>
                          </div>
                        </td>
                        {["breakfast", "lunch", "dinner"].map((meal) => {
                          const isOpted = plan.opted_meals?.includes(meal);
                          const record = attendanceRecords.find(r => r.tenant_id === plan.tenant_id && r.meal_type === meal);
                          const isPresent = record?.present;
                          if (!isOpted) return <td key={meal} className="text-center px-3 py-3"><span className="text-stone-300 text-xs">—</span></td>;
                          return (
                            <td key={meal} className="text-center px-3 py-3">
                              <button
                                onClick={() => handleMarkAttendance(plan.tenant_id, meal, !isPresent)}
                                className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors ${isPresent ? "bg-lime-100 text-lime-600 hover:bg-lime-200" : "bg-stone-100 text-stone-400 hover:bg-stone-200"}`}
                              >
                                {isPresent ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {plans.filter(p => p.is_active && (!selectedProperty || p.property_id === selectedProperty)).length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-stone-400 text-sm">{t("common.no_data")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Config Dialog */}
      <Dialog open={showAddConfig} onOpenChange={setShowAddConfig}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Set Up Mess</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateConfig} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("common.property")} *</label>
              <select required value={configForm.property_id} onChange={(e) => setConfigForm({ ...configForm, property_id: e.target.value })} className={`${inp} appearance-none bg-white`}>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("mess.monthly_amount")} *</label>
              <input type="number" min="0" required value={configForm.monthly_amount} onChange={(e) => setConfigForm({ ...configForm, monthly_amount: e.target.value })} className={inp} placeholder="2500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("mess.meal_types")}</label>
              <div className="flex gap-2">
                {["breakfast", "lunch", "dinner"].map((meal) => (
                  <button key={meal} type="button" onClick={() => toggleConfigMeal(meal)} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${configForm.meal_types.includes(meal) ? "bg-amber-600 text-white border-amber-600" : "border-stone-200 text-stone-600 hover:border-amber-300"}`}>
                    {mealLabels[meal]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Type</label>
                <select value={configForm.veg_nonveg} onChange={(e) => setConfigForm({ ...configForm, veg_nonveg: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="veg">{t("mess.veg")}</option>
                  <option value="non-veg">{t("mess.non_veg")}</option>
                  <option value="both">{t("mess.both")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Billing Mode</label>
                <select value={configForm.tracking_mode} onChange={(e) => setConfigForm({ ...configForm, tracking_mode: e.target.value })} className={`${inp} appearance-none bg-white`}>
                  <option value="fixed">{t("mess.fixed")}</option>
                  <option value="attendance">{t("mess.attendance")}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddConfig(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? t("common.loading") : t("common.save")}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Plan Dialog */}
      <Dialog open={showAddPlan} onOpenChange={setShowAddPlan}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>Assign Meal Plan</DialogTitle></DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Tenant *</label>
              <select required value={planForm.tenant_id} onChange={(e) => { const ten = tenants.find((t) => t.id === e.target.value); setPlanForm({ ...planForm, tenant_id: e.target.value, property_id: ten?.property_id || planForm.property_id }); }} className={`${inp} appearance-none bg-white`}>
                <option value="">-- Select tenant --</option>
                {tenants.filter((t) => t.status === "active").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Opted Meals</label>
              <div className="flex gap-2">
                {["breakfast", "lunch", "dinner"].map((meal) => (
                  <button key={meal} type="button" onClick={() => toggleMeal(meal, planForm, setPlanForm)} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${planForm.opted_meals.includes(meal) ? "bg-amber-600 text-white border-amber-600" : "border-stone-200 text-stone-600 hover:border-amber-300"}`}>
                    {mealLabels[meal]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Start Date</label>
              <input type="date" value={planForm.start_date} onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })} className={inp} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddPlan(false)} className="flex-1 h-10 border border-stone-200 text-stone-600 rounded-lg text-sm">{t("common.cancel")}</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">{saving ? t("common.loading") : t("common.save")}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessManagement;
