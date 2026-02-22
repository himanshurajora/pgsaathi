import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const { login } = useAuth();
  const { t, changeLanguage, language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-amber-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>PG</span>
          </div>
          <span className="text-white text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>PGSaathi</span>
        </div>
        <div>
          <img
            src="https://images.pexels.com/photos/7616700/pexels-photo-7616700.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600"
            alt="PG management"
            className="rounded-2xl mb-8 w-full object-cover h-56 opacity-80"
          />
          <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
            Manage your PG with ease
          </h2>
          <p className="text-amber-100 text-base leading-relaxed">
            Track tenants, rent, complaints and more — all in one place.
          </p>
        </div>
        <p className="text-amber-200 text-sm">© 2025 PGSaathi. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-600 rounded-xl mb-3">
              <span className="text-white font-bold text-xl" style={{ fontFamily: "Manrope, sans-serif" }}>PG</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>PGSaathi</h1>
          </div>

          <div className="flex justify-end mb-5">
            <button
              onClick={() => changeLanguage(language === "en" ? "hi" : "en")}
              className="text-sm px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-600 transition-colors"
            >
              {language === "en" ? "हिंदी" : "English"}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-stone-900 mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
              {t("auth.login_title")}
            </h2>
            <p className="text-stone-500 text-sm mb-7">{t("auth.login_subtitle")}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.email")}</label>
                <input
                  type="email"
                  required
                  data-testid="login-email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-12 px-4 bg-white border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.password")}</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    data-testid="login-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full h-12 px-4 pr-12 bg-white border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit"
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                {loading ? t("common.loading") : t("auth.sign_in")}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-500">
              {t("auth.no_account")}{" "}
              <Link to="/register" className="text-amber-600 hover:text-amber-700 font-semibold">
                {t("auth.sign_up")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
