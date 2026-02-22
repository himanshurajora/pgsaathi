import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import { BarChart2, IndianRupee, Users, Bed, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const Reports = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get("/dashboard/stats"), API.get("/invoices"), API.get("/tenants"), API.get("/properties")])
      .then(([sRes, iRes, tRes, pRes]) => {
        setStats(sRes.data);
        setInvoices(iRes.data);
        setTenants(tRes.data);
        setProperties(pRes.data);
      })
      .catch(() => toast.error("Failed to load report data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>;

  // Revenue by month
  const monthlyRevenue = {};
  invoices.forEach((inv) => {
    const key = `${inv.billing_year}-${String(inv.billing_month).padStart(2, "0")}`;
    if (!monthlyRevenue[key]) monthlyRevenue[key] = { month: key, expected: 0, collected: 0 };
    monthlyRevenue[key].expected += inv.total_amount || 0;
    monthlyRevenue[key].collected += inv.paid_amount || 0;
  });
  const revenueData = Object.values(monthlyRevenue).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  // KYC distribution
  const kycData = [
    { name: "Verified", value: tenants.filter((t) => t.kyc_status === "verified").length, color: "#4D7C0F" },
    { name: "Pending", value: tenants.filter((t) => t.kyc_status === "pending").length, color: "#F59E0B" },
    { name: "Rejected", value: tenants.filter((t) => t.kyc_status === "rejected").length, color: "#EF4444" },
  ].filter((d) => d.value > 0);

  // Invoice status
  const statusData = [
    { name: "Paid", value: invoices.filter((i) => i.status === "paid").length, color: "#4D7C0F" },
    { name: "Partial", value: invoices.filter((i) => i.status === "partial").length, color: "#F59E0B" },
    { name: "Overdue", value: invoices.filter((i) => i.status === "overdue").length, color: "#EF4444" },
    { name: "Pending", value: invoices.filter((i) => i.status === "pending").length, color: "#78716C" },
  ].filter((d) => d.value > 0);

  const summaryCards = [
    { icon: Users, label: "Total Tenants", value: tenants.length, sub: `${tenants.filter((t) => t.status === "active").length} active`, color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Bed, label: "Total Beds", value: stats?.total_beds || 0, sub: `${stats?.occupancy_rate || 0}% occupied`, color: "text-lime-700", bg: "bg-lime-50" },
    { icon: IndianRupee, label: "Total Expected (This Month)", value: `₹${(stats?.total_expected_revenue || 0).toLocaleString("en-IN")}`, sub: `₹${(stats?.total_collected_revenue || 0).toLocaleString("en-IN")} collected`, color: "text-lime-700", bg: "bg-lime-50" },
    { icon: TrendingUp, label: "Pending Dues", value: `₹${(stats?.pending_dues || 0).toLocaleString("en-IN")}`, sub: "Needs collection", color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{t("reports.title")}</h1>
        <p className="text-stone-500 text-sm">Overview of your PG operations</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-stone-500 mb-1">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`} style={{ fontFamily: "Manrope, sans-serif" }}>{card.value}</p>
                <p className="text-xs text-stone-400 mt-0.5">{card.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={16} className={card.color} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {revenueData.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-900 mb-4 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Monthly Revenue (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, ""]} />
              <Bar dataKey="expected" fill="#FDE68A" name="Expected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" fill="#D97706" name="Collected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kycData.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-900 mb-4 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Tenant KYC Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={kycData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {kycData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {statusData.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-900 mb-4 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Invoice Status (This Month)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Property-wise summary */}
      {properties.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-900 mb-4 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Properties Summary</h3>
          <div className="space-y-2">
            {properties.map((prop) => {
              const propTenants = tenants.filter((t) => t.property_id === prop.id && t.status === "active");
              const propInvoices = invoices.filter((i) => i.property_id === prop.id);
              const collected = propInvoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
              const expected = propInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
              return (
                <div key={prop.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div>
                    <p className="font-medium text-stone-900 text-sm">{prop.name}</p>
                    <p className="text-xs text-stone-400">{prop.city} · {propTenants.length} tenants</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lime-700 text-sm">₹{collected.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-stone-400">of ₹{expected.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
