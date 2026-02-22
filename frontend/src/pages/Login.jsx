import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import API from "../services/api";

const Login = () => {
  const { t, changeLanguage, language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      if (res.data.requires_otp) {
        setOtpEmail(res.data.email);
        setOtpStep(true);
        toast.info(res.data.message || "Please verify your email");
      } else if (res.data.token) {
        localStorage.setItem("pgsaathi_token", res.data.token);
        window.location.href = res.data.user?.role === "tenant" ? "/tenant" : "/dashboard";
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[idx] = value;
    setOtp(next);
    if (value && idx < 5) document.getElementById(`login-otp-${idx + 1}`)?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) document.getElementById(`login-otp-${idx - 1}`)?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setVerifying(true);
    try {
      const res = await API.post("/auth/verify-otp", { email: otpEmail, otp: code });
      if (res.data.token) {
        localStorage.setItem("pgsaathi_token", res.data.token);
        toast.success("Email verified!");
        window.location.href = res.data.user?.role === "tenant" ? "/tenant" : "/dashboard";
      }
    } catch (err) { toast.error(err.response?.data?.detail || "Verification failed"); setOtp(["", "", "", "", "", ""]); }
    finally { setVerifying(false); }
  };

  const handleResend = async () => {
    try { await API.post("/auth/resend-otp", { email: otpEmail }); toast.success("New OTP sent!"); setOtp(["", "", "", "", "", ""]); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (otpStep) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-600 rounded-xl mb-3"><Mail className="text-white" size={24} /></div>
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>Verify Your Email</h1>
            <p className="text-stone-500 text-sm mt-1">Code sent to <strong className="text-stone-700">{otpEmail}</strong></p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
            <div className="flex justify-center gap-2.5 mb-6">
              {otp.map((d, i) => (
                <input key={i} id={`login-otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={d} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} className="w-12 h-14 text-center text-xl font-bold border-2 border-stone-200 focus:border-amber-600 rounded-xl outline-none" style={{ fontFamily: "Manrope, sans-serif" }} />
              ))}
            </div>
            <button onClick={handleVerify} disabled={verifying || otp.join("").length !== 6} data-testid="verify-login-otp-btn" className="w-full h-12 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
              {verifying ? "Verifying..." : "Verify Email"}
            </button>
            <p className="text-center text-stone-500 text-sm">Didn't get it? <button onClick={handleResend} className="text-amber-600 font-semibold">Resend</button></p>
            <button onClick={() => { setOtpStep(false); setOtp(["", "", "", "", "", ""]); }} className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"><ArrowLeft size={14} /> Back to login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex">
      <div className="hidden lg:flex lg:w-5/12 bg-amber-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>PG</span></div>
          <span className="text-white text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>PGSaathi</span>
        </div>
        <div>
          <img src="https://images.pexels.com/photos/7616700/pexels-photo-7616700.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600" alt="PG management" className="rounded-2xl mb-8 w-full object-cover h-56 opacity-80" />
          <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>Manage your PG with ease</h2>
          <p className="text-amber-100 text-base leading-relaxed">Track tenants, rent, complaints and more — all in one place.</p>
        </div>
        <p className="text-amber-200 text-sm">PGSaathi. All rights reserved.</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-600 rounded-xl mb-3"><span className="text-white font-bold text-xl" style={{ fontFamily: "Manrope, sans-serif" }}>PG</span></div>
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>PGSaathi</h1>
          </div>
          <div className="flex justify-end mb-5">
            <button onClick={() => changeLanguage(language === "en" ? "hi" : "en")} className="text-sm px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-600 transition-colors">{language === "en" ? "हिंदी" : "English"}</button>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-stone-900 mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>{t("auth.login_title")}</h2>
            <p className="text-stone-500 text-sm mb-7">{t("auth.login_subtitle")}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.email")}</label>
                <input type="email" required data-testid="login-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-12 px-4 bg-white border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.password")}</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} required data-testid="login-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full h-12 px-4 pr-12 bg-white border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <button type="submit" disabled={loading} data-testid="login-submit" className="w-full h-12 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                {loading ? t("common.loading") : t("auth.sign_in")}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-stone-500">{t("auth.no_account")} <Link to="/register" className="text-amber-600 hover:text-amber-700 font-semibold">{t("auth.sign_up")}</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
