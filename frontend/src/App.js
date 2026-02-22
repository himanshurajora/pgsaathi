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
import RentManagement from "./pages/RentManagement";
import Complaints from "./pages/Complaints";
import MessManagement from "./pages/MessManagement";
import Reports from "./pages/Reports";
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
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/select-language" element={<LanguageSelector />} />
      <Route path="/login" element={<LanguageGuard><PublicGuard><Login /></PublicGuard></LanguageGuard>} />
      <Route path="/register" element={<LanguageGuard><PublicGuard><Register /></PublicGuard></LanguageGuard>} />
      <Route path="/" element={<LanguageGuard><AuthGuard><Layout /></AuthGuard></LanguageGuard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="rent" element={<RentManagement />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="mess" element={<MessManagement />} />
        <Route path="reports" element={<Reports />} />
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
