import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import { User, Lock, Globe } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const inp = "w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm";

  const handleProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await API.put("/auth/me", profileForm);
      toast.success("Profile updated!");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSavingProfile(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error("Passwords don't match");
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSavingPw(true);
    try {
      await API.put("/users/me/password", { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success("Password changed!");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to change password"); }
    finally { setSavingPw(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>Settings</h1>
        <p className="text-stone-500 text-sm">Manage your account</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-amber-600" />
          <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Profile</h3>
        </div>
        <form onSubmit={handleProfile} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
            <input disabled value={user?.email || ""} className={`${inp} bg-stone-50 text-stone-400`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Name</label>
              <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Phone</label>
              <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className={inp} placeholder="+91 98765..." />
            </div>
          </div>
          <button type="submit" disabled={savingProfile} className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60" data-testid="save-profile-btn">
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-amber-600" />
          <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Change Password</h3>
        </div>
        <form onSubmit={handlePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Current Password</label>
            <input type="password" required value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">New Password</label>
              <input type="password" required value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Confirm New Password</label>
              <input type="password" required value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} className={inp} />
            </div>
          </div>
          <button type="submit" disabled={savingPw} className="px-5 py-2 bg-stone-800 text-white rounded-lg text-sm font-semibold hover:bg-stone-900 disabled:opacity-60" data-testid="change-password-btn">
            {savingPw ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Language */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-amber-600" />
          <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Language</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => changeLanguage("en")} className={`px-4 py-2 rounded-lg text-sm font-medium ${language === "en" ? "bg-amber-600 text-white" : "border border-stone-200 text-stone-600"}`}>English</button>
          <button onClick={() => changeLanguage("hi")} className={`px-4 py-2 rounded-lg text-sm font-medium ${language === "hi" ? "bg-amber-600 text-white" : "border border-stone-200 text-stone-600"}`}>हिंदी</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
