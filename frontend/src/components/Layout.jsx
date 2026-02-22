import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  LayoutDashboard, Building2, Users, CreditCard,
  MessageSquare, Utensils, BarChart2, LogOut, Bell, Menu, X,
} from "lucide-react";

const Layout = () => {
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { path: "/properties", icon: Building2, label: t("nav.properties") },
    { path: "/tenants", icon: Users, label: t("nav.tenants") },
    { path: "/rent", icon: CreditCard, label: t("nav.rent") },
    { path: "/complaints", icon: MessageSquare, label: t("nav.complaints") },
    { path: "/mess", icon: Utensils, label: t("nav.mess") },
    { path: "/reports", icon: BarChart2, label: t("nav.reports") },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleColors = { owner: "bg-amber-100 text-amber-700", warden: "bg-blue-100 text-blue-700", tenant: "bg-lime-100 text-lime-700" };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 flex flex-col
          transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-200 ease-out`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-stone-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>PG</span>
          </div>
          <div>
            <span className="font-bold text-lg text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>PGSaathi</span>
            <p className="text-[10px] text-stone-400 -mt-0.5">PG Management</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto md:hidden text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-3 mb-2">Menu</p>
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 text-sm
                ${isActive ? "bg-amber-50 text-amber-700 font-semibold" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"}`
              }
              data-testid={`nav-${path.replace("/", "")}`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile at bottom */}
        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-stone-50">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-amber-700 font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{user?.name}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${roleColors[user?.role] || "bg-stone-100 text-stone-600"}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-stone-200 px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 text-stone-600 hover:bg-stone-100 rounded-lg"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeLanguage(language === "en" ? "hi" : "en")}
              data-testid="language-toggle"
              className="px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-amber-100 hover:text-amber-700 rounded-full transition-colors text-stone-600"
            >
              {language === "en" ? "हिंदी" : "English"}
            </button>
            <button className="relative p-2 hover:bg-stone-100 rounded-full transition-colors">
              <Bell size={17} className="text-stone-600" strokeWidth={1.5} />
            </button>
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-amber-700 font-bold text-xs">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 page-enter">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-stone-200 z-30 px-2">
        <div className="flex">
          {navItems.slice(0, 5).map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors
                ${isActive ? "text-amber-600" : "text-stone-400"}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                  <span className="text-[9px] font-medium">{label.slice(0, 8)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
