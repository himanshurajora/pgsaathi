import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import LanguageSelector from "./pages/LanguageSelector";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import TenantDashboard from "./pages/TenantDashboard";
import RentManagement from "./pages/RentManagement";
import Complaints from "./pages/Complaints";
import MessManagement from "./pages/MessManagement";
import Reports from "./pages/Reports";
import NoticeBoard from "./pages/NoticeBoard";
import Housekeeping from "./pages/Housekeeping";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import Visitors from "./pages/Visitors";
import Feedback from "./pages/Feedback";
import SupportAndFeedback from "./pages/SupportAndFeedback";
import SuperAdmin from "./pages/SuperAdmin";
import ForgotPassword from "./pages/ForgotPassword";
import "./App.css";

const LoadingScreen = () => (
  <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: "3px" }} />
      <p className="text-stone-500 text-sm">Loading PGSaathi...</p>
    </div>
  </div>
);

const LanguageGuard = ({ children }) => {
  const { language } = useLanguage();
  if (!language) return <Navigate to="/select-language" replace />;
  return children;
};

const AuthGuard = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicGuard = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    if (user.role === "tenant") return <Navigate to="/tenant" replace />;
    if (user.role === "superadmin") return <Navigate to="/super-admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (user?.role === "tenant") return <Navigate to="/tenant" replace />;
  if (user?.role === "superadmin") return <Navigate to="/super-admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/select-language" element={<LanguageSelector />} />
      <Route path="/login" element={<LanguageGuard><PublicGuard><Login /></PublicGuard></LanguageGuard>} />
      <Route path="/register" element={<LanguageGuard><PublicGuard><Register /></PublicGuard></LanguageGuard>} />
      <Route path="/forgot-password" element={<LanguageGuard><PublicGuard><ForgotPassword /></PublicGuard></LanguageGuard>} />
      <Route path="/" element={<LanguageGuard><AuthGuard><Layout /></AuthGuard></LanguageGuard>}>
        <Route index element={<RoleRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="tenants/:id" element={<TenantDetail />} />
        <Route path="tenant" element={<TenantDashboard />} />
        <Route path="rent" element={<RentManagement />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="mess" element={<MessManagement />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notices" element={<NoticeBoard />} />
        <Route path="housekeeping" element={<Housekeeping />} />
        <Route path="visitors" element={<Visitors />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="support" element={<SupportAndFeedback />} />
        <Route path="super-admin" element={<SuperAdmin />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<UserManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
