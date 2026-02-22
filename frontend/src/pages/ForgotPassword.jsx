import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { Mail, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import API from "../services/api";

const ForgotPassword = () => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1); // 1: email, 2: otp + new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email });
      toast.success(t("auth.otp_sent") || "OTP sent to your email");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send OTP");
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
    if (value && idx < 5) document.getElementById(`fp-otp-${idx + 1}`)?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) document.getElementById(`fp-otp-${idx - 1}`)?.focus();
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    if (newPassword.length < 6) { toast.error(t("auth.password_short") || "Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error(t("auth.password_mismatch") || "Passwords don't match"); return; }
    setLoading(true);
    try {
      await API.post("/auth/reset-password", { email, otp: code, new_password: newPassword });
      toast.success(t("auth.password_reset_success") || "Password reset successfully! Please login.");
      window.location.href = "/login";
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset password");
      if (err.response?.data?.detail?.includes("Invalid OTP") || err.response?.data?.detail?.includes("expired")) {
        setOtp(["", "", "", "", "", ""]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await API.post("/auth/forgot-password", { email });
      toast.success(t("auth.otp_sent") || "New OTP sent!");
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-600 rounded-xl mb-3">
            <KeyRound className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>
            {step === 1 && (t("auth.forgot_password") || "Forgot Password")}
            {step === 2 && (t("auth.reset_password") || "Reset Password")}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {step === 1 && (t("auth.forgot_password_desc") || "Enter your email to receive a reset code")}
            {step === 2 && <>Code sent to <strong className="text-stone-700">{email}</strong>. Enter it with your new password.</>}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.email")}</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 bg-white border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full h-12 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                {loading ? (t("common.loading") || "Loading...") : (t("auth.send_otp") || "Send Reset Code")}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.verification_code") || "Verification Code"}</label>
                <div className="flex justify-center gap-2.5 mb-2">
                  {otp.map((d, i) => (
                    <input key={i} id={`fp-otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-stone-200 focus:border-amber-600 rounded-xl outline-none"
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    />
                  ))}
                </div>
                <p className="text-center text-stone-400 text-xs">
                  Didn't get it? <button type="button" onClick={handleResend} className="text-amber-600 font-semibold">Resend</button>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.new_password") || "New Password"}</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} required value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 px-4 pr-12 bg-white border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm"
                    placeholder="••••••••" minLength={6}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("auth.confirm_password") || "Confirm Password"}</label>
                <input
                  type="password" required value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 px-4 bg-white border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none transition-colors text-sm"
                  placeholder="••••••••" minLength={6}
                />
              </div>
              <button type="submit" disabled={loading || otp.join("").length !== 6} className="w-full h-12 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                {loading ? (t("common.loading") || "Loading...") : (t("auth.reset_password") || "Reset Password")}
              </button>
            </form>
          )}

          <Link to="/login" className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
            <ArrowLeft size={14} /> {t("auth.back_to_login") || "Back to Login"}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
