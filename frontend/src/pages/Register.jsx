import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Eye, EyeOff, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const Register = () => {
  const { register } = useAuth();
  const { t, changeLanguage, language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "owner" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created successfully! Welcome to PGSaathi.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: "owner", label: t("auth.role.owner") },
    { value: "warden", label: t("auth.role.warden") },
    { value: "tenant", label: t("auth.role.tenant") },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-600 rounded-xl mb-3">
            <span className="text-white font-bold text-xl" style={{ fontFamily: "Manrope, sans-serif" }}>PG</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>PGSaathi</h1>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => changeLanguage(language === "en" ? "hi" : "en")}
            className="text-sm px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-600 transition-colors"
          >
            {language === "en" ? "हिंदी" : "English"}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-stone-900 mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
            {t("auth.register_title")}
          </h2>
          <p className="text-stone-500 text-sm mb-6">{t("auth.register_subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.name")}</label>
              <input
                type="text"
                required
                data-testid="register-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-12 px-4 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm"
                placeholder="Rajesh Kumar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.email")}</label>
              <input
                type="email"
                required
                data-testid="register-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-12 px-4 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.password")}</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  data-testid="register-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-12 px-4 pr-12 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm"
                  placeholder="Min 6 characters"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.role")}</label>
              <div className="relative">
                <select
                  data-testid="register-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full h-12 px-4 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none appearance-none bg-white text-sm"
                >
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="register-submit"
              className="w-full h-12 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {loading ? t("common.loading") : t("auth.sign_up")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            {t("auth.have_account")}{" "}
            <Link to="/login" className="text-amber-600 hover:text-amber-700 font-semibold">
              {t("auth.sign_in")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
