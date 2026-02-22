import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Eye, EyeOff, ChevronDown, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import API from "../services/api";

const Register = () => {
  const { login: authLogin } = useAuth();
  const { t, changeLanguage, language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "owner" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/auth/register", form);
      if (res.data.requires_otp) {
        setOtpEmail(res.data.email);
        setOtpStep(true);
        if (res.data.email_sent) {
          toast.success("OTP sent to your email!");
        } else {
          toast.info("Account created. Check your email for the verification code.");
        }
      } else if (res.data.token) {
        localStorage.setItem("pgsaathi_token", res.data.token);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
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
    if (value && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`);
      el?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      const el = document.getElementById(`otp-${idx - 1}`);
      el?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const res = await API.post("/auth/verify-otp", { email: otpEmail, otp: code });
      if (res.data.token) {
        localStorage.setItem("pgsaathi_token", res.data.token);
        toast.success("Email verified! Welcome to PGSaathi.");
        window.location.href = "/dashboard";
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Verification failed");
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await API.post("/auth/resend-otp", { email: otpEmail });
      toast.success("New OTP sent!");
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  const roles = [
    { value: "owner", label: t("auth.role.owner") },
    { value: "warden", label: t("auth.role.warden") },
    { value: "tenant", label: t("auth.role.tenant") },
  ];

  if (otpStep) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-600 rounded-xl mb-3">
              <Mail className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>Verify Your Email</h1>
            <p className="text-stone-500 text-sm mt-1">We sent a 6-digit code to <strong className="text-stone-700">{otpEmail}</strong></p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
            <div className="flex justify-center gap-2.5 mb-6" data-testid="otp-inputs">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  data-testid={`otp-input-${i}`}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-stone-200 focus:border-amber-600 rounded-xl outline-none transition-colors text-stone-900"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={verifying || otp.join("").length !== 6}
              data-testid="verify-otp-btn"
              className="w-full h-12 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all text-sm mb-3"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {verifying ? "Verifying..." : "Verify Email"}
            </button>

            <div className="text-center">
              <p className="text-stone-500 text-sm">
                Didn't receive the code?{" "}
                <button onClick={handleResend} disabled={resending} className="text-amber-600 hover:text-amber-700 font-semibold disabled:opacity-60" data-testid="resend-otp-btn">
                  {resending ? "Sending..." : "Resend"}
                </button>
              </p>
            </div>

            <button onClick={() => { setOtpStep(false); setOtp(["", "", "", "", "", ""]); }} className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
              <ArrowLeft size={14} /> Back to registration
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              <input type="text" required data-testid="register-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-12 px-4 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm" placeholder="Rajesh Kumar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.email")}</label>
              <input type="email" required data-testid="register-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-12 px-4 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.password")}</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} required data-testid="register-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full h-12 px-4 pr-12 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm" placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.role")}</label>
              <div className="relative">
                <select data-testid="register-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full h-12 px-4 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none appearance-none bg-white text-sm">
                  {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>
            <button type="submit" disabled={loading} data-testid="register-submit" className="w-full h-12 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
              {loading ? t("common.loading") : t("auth.sign_up")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            {t("auth.have_account")}{" "}
            <Link to="/login" className="text-amber-600 hover:text-amber-700 font-semibold">{t("auth.sign_in")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
