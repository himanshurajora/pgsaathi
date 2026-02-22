import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import { Building2, Users, Bed, IndianRupee, AlertCircle, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const StatCard = ({ icon: Icon, label, value, sub, colorClass, bgClass }) => (
  <div className="bg-white rounded-xl border border-stone-200 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" data-testid="stat-card">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-500 mb-1 uppercase tracking-wide font-medium">{label}</p>
        <p className={`text-2xl font-bold truncate ${colorClass}`} style={{ fontFamily: "Manrope, sans-serif" }}>{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl flex-shrink-0 ${bgClass}`}>
        <Icon size={19} className={colorClass} strokeWidth={1.5} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === "hi" ? "सुप्रभात" : "Good morning";
    if (hour < 17) return language === "hi" ? "नमस्कार" : "Good afternoon";
    return language === "hi" ? "शुभ संध्या" : "Good evening";
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = months[new Date().getMonth()];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const noProperties = !stats?.total_properties;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{t("dash.title")}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{getGreeting()}, <span className="font-medium text-stone-700">{user?.name?.split(" ")[0]}</span>!</p>
        </div>
        {user?.role === "owner" && (
          <Link
            to="/properties"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            <Plus size={15} strokeWidth={2.5} />
            {t("prop.add")}
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label={t("dash.total_properties")} value={stats?.total_properties || 0} sub="Active" colorClass="text-amber-600" bgClass="bg-amber-50" />
        <StatCard icon={Users} label={t("dash.total_tenants")} value={stats?.total_tenants || 0} sub={`${stats?.occupancy_rate || 0}% occupancy`} colorClass="text-lime-700" bgClass="bg-lime-50" />
        <StatCard
          icon={IndianRupee}
          label={`${t("dash.revenue")} (${currentMonth})`}
          value={`₹${(stats?.total_collected_revenue || 0).toLocaleString("en-IN")}`}
          sub={`of ₹${(stats?.total_expected_revenue || 0).toLocaleString("en-IN")} expected`}
          colorClass="text-lime-700"
          bgClass="bg-lime-50"
        />
        <StatCard
          icon={AlertCircle}
          label={t("dash.open_complaints")}
          value={stats?.open_complaints || 0}
          sub="Need attention"
          colorClass={stats?.open_complaints > 0 ? "text-red-600" : "text-stone-500"}
          bgClass={stats?.open_complaints > 0 ? "bg-red-50" : "bg-stone-50"}
        />
      </div>

      {noProperties ? (
        /* Empty state */
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <img
            src="https://images.pexels.com/photos/5137982/pexels-photo-5137982.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=400"
            alt="Add property"
            className="w-48 h-32 object-cover rounded-xl mx-auto mb-5 opacity-70"
          />
          <h3 className="text-lg font-semibold text-stone-900 mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>Welcome to PGSaathi!</h3>
          <p className="text-stone-500 text-sm mb-6">Start by adding your first property to get going.</p>
          <Link to="/properties" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors">
            <Plus size={16} />
            Add Your First Property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Occupancy progress */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Bed Occupancy</p>
            <div className="flex items-end gap-3 mb-3">
              <p className="text-3xl font-bold text-amber-600" style={{ fontFamily: "Manrope, sans-serif" }}>{stats?.occupancy_rate || 0}%</p>
              <p className="text-xs text-stone-400 mb-1">{stats?.occupied_beds || 0} of {stats?.total_beds || 0} beds</p>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2.5 mb-2">
              <div className="bg-amber-600 h-2.5 rounded-full transition-all duration-700" style={{ width: `${stats?.occupancy_rate || 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> {stats?.occupied_beds || 0} occupied</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-200 inline-block" /> {stats?.available_beds || 0} available</span>
            </div>
          </div>

          {/* Pending dues */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">{t("dash.pending_dues")} ({currentMonth})</p>
            <p className="text-3xl font-bold text-red-500 mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>₹{(stats?.pending_dues || 0).toLocaleString("en-IN")}</p>
            <p className="text-xs text-stone-400 mb-4">Outstanding this month</p>
            <Link to="/rent" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
              View all invoices →
            </Link>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Quick Actions</p>
            <div className="space-y-1">
              {[
                { label: "Add Tenant", link: "/tenants", dot: "bg-amber-500" },
                { label: "Generate Invoice", link: "/rent", dot: "bg-lime-600" },
                { label: "View Complaints", link: "/complaints", dot: "bg-red-500" },
                { label: "Manage Properties", link: "/properties", dot: "bg-stone-400" },
              ].map((a) => (
                <Link key={a.link} to={a.link} className="flex items-center gap-2.5 p-2 hover:bg-stone-50 rounded-lg text-sm text-stone-600 hover:text-amber-700 transition-colors group">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dot}`} />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent tenants */}
      {stats?.recent_tenants?.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>{t("dash.recent_tenants")}</h3>
            <Link to="/tenants" className="text-amber-600 hover:text-amber-700 text-xs font-medium">View all →</Link>
          </div>
          <div className="space-y-2">
            {stats.recent_tenants.map((tenant) => (
              <div key={tenant.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors">
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-700 font-semibold text-sm">{tenant.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{tenant.name}</p>
                  <p className="text-xs text-stone-400">{tenant.phone}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide
                  ${tenant.status === "active" ? "bg-lime-100 text-lime-800" : tenant.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"}`}>
                  {tenant.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
