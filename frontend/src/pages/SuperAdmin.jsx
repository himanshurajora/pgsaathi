import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import {
  Users, Building2, MessageSquareText, HelpCircle, ShieldAlert,
  Ban, CheckCircle2, Clock, Star, ChevronDown, ChevronUp, UserCheck, UserX,
} from "lucide-react";
import { toast } from "sonner";

const StatCard = ({ icon: Icon, label, value, sub, color, bg }) => (
  <div className="bg-white rounded-xl border border-stone-200 p-5">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs text-stone-500 mb-1">{label}</p>
        <p className={`text-xl font-bold ${color}`} style={{ fontFamily: "Manrope, sans-serif" }}>{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-2 rounded-lg ${bg}`}>
        <Icon size={16} className={color} strokeWidth={1.5} />
      </div>
    </div>
  </div>
);

const SuperAdmin = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [owners, setOwners] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showFeedback, setShowFeedback] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [banningId, setBanningId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, ownersRes, fbRes, qRes] = await Promise.all([
        API.get("/admin/stats"),
        API.get("/admin/owners"),
        API.get("/admin/product-feedback"),
        API.get("/admin/support-questions"),
      ]);
      setStats(statsRes.data);
      setOwners(ownersRes.data);
      setFeedback(fbRes.data);
      setQuestions(qRes.data);
    } catch (err) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (ownerId, ownerName, isBanned) => {
    setBanningId(ownerId);
    try {
      if (isBanned) {
        await API.put(`/admin/owners/${ownerId}/unban`);
        toast.success(`${ownerName} has been unbanned`);
      } else {
        await API.put(`/admin/owners/${ownerId}/ban`);
        toast.success(`${ownerName} has been banned`);
      }
      // Refresh owners list
      const res = await API.get("/admin/owners");
      setOwners(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    } finally {
      setBanningId(null);
    }
  };

  const handleResolveQuestion = async (questionId) => {
    try {
      await API.put(`/admin/support-questions/${questionId}/resolve`);
      toast.success("Question marked as resolved");
      setQuestions((prev) => prev.map((q) => q.id === questionId ? { ...q, status: "resolved" } : q));
    } catch (err) {
      toast.error("Failed to resolve question");
    }
  };

  if (user?.role !== "superadmin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldAlert size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-stone-600 font-medium">Access Denied</p>
          <p className="text-stone-400 text-sm">This page is restricted to super administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "owners", label: `Owners (${owners.length})` },
    { id: "feedback", label: `Feedback (${feedback.length})` },
    { id: "questions", label: `Questions (${questions.length})` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>
          Super Admin Dashboard
        </h1>
        <p className="text-stone-500 text-sm">Platform-wide management & oversight</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Users} label="Total Users" value={stats?.total_users || 0} sub={`${stats?.total_owners || 0} owners · ${stats?.total_tenants_users || 0} tenants`} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={Building2} label="Total Properties" value={stats?.total_properties || 0} sub={`${stats?.total_active_tenants || 0} active tenants`} color="text-lime-700" bg="bg-lime-50" />
        <StatCard icon={MessageSquareText} label="Product Feedback" value={stats?.total_product_feedback || 0} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={HelpCircle} label="Support Questions" value={stats?.total_support_questions || 0} sub={`${stats?.open_support_questions || 0} open`} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Recent Feedback */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                Recent Product Feedback
              </h3>
              <button onClick={() => setActiveTab("feedback")} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                View all →
              </button>
            </div>
            {feedback.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-4">No feedback yet</p>
            ) : (
              <div className="space-y-3">
                {feedback.slice(0, 5).map((fb) => (
                  <div key={fb.id} className="flex items-start justify-between gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-stone-700">{fb.user_name || "User"}</span>
                        <span className="text-xs text-stone-400">({fb.user_role})</span>
                        <div className="flex ml-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={12} className={s <= fb.rating ? "text-amber-500 fill-amber-500" : "text-stone-200"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-stone-600">{fb.comment}</p>
                    </div>
                    <span className="text-xs text-stone-400 whitespace-nowrap">
                      {new Date(fb.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Questions */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                Recent Support Questions
              </h3>
              <button onClick={() => setActiveTab("questions")} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                View all →
              </button>
            </div>
            {questions.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-4">No questions yet</p>
            ) : (
              <div className="space-y-3">
                {questions.slice(0, 5).map((q) => (
                  <div key={q.id} className="flex items-start justify-between gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-stone-900">{q.subject}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          q.status === "open" ? "bg-amber-50 text-amber-600" : "bg-lime-50 text-lime-700"
                        }`}>
                          {q.status === "open" ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                          {q.status === "open" ? "Open" : "Resolved"}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">{q.user_name} ({q.user_email})</p>
                      <p className="text-sm text-stone-600 mt-1">{q.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-stone-400 whitespace-nowrap">
                        {new Date(q.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      {q.status === "open" && (
                        <button
                          onClick={() => handleResolveQuestion(q.id)}
                          className="text-xs text-lime-700 hover:text-lime-800 font-medium"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owners Tab */}
      {activeTab === "owners" && (
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="p-5 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900 text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
              Property Owners
            </h3>
          </div>
          {owners.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No property owners registered</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {owners.map((owner) => {
                const isBanned = owner.is_active === false;
                return (
                  <div key={owner.id} className={`p-5 flex items-center justify-between gap-4 ${isBanned ? "bg-red-50/40" : ""}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isBanned ? "bg-red-100" : "bg-amber-100"}`}>
                        <span className={`font-bold text-sm ${isBanned ? "text-red-600" : "text-amber-700"}`}>
                          {owner.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-900 truncate">{owner.name}</p>
                          {isBanned && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium flex items-center gap-1">
                              <Ban size={10} /> Banned
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 truncate">{owner.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-stone-700">{owner.property_count} {owner.property_count === 1 ? "property" : "properties"}</p>
                        <p className="text-xs text-stone-400">
                          Joined {new Date(owner.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleBan(owner.id, owner.name, isBanned)}
                        disabled={banningId === owner.id}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                          isBanned
                            ? "bg-lime-50 text-lime-700 hover:bg-lime-100 border border-lime-200"
                            : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        }`}
                      >
                        {isBanned ? (
                          <><UserCheck size={14} /> Unban</>
                        ) : (
                          <><UserX size={14} /> Ban</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === "feedback" && (
        <div className="space-y-3">
          {feedback.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
              <p className="text-stone-400 text-sm">No product feedback submitted yet</p>
            </div>
          ) : (
            feedback.map((fb) => (
              <div key={fb.id} className="bg-white rounded-xl border border-stone-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-stone-900">{fb.user_name || "User"}</span>
                      <span className="text-xs text-stone-400">({fb.user_email})</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">{fb.user_role}</span>
                      <div className="flex ml-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} className={s <= fb.rating ? "text-amber-500 fill-amber-500" : "text-stone-200"} />
                        ))}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 capitalize">{fb.category}</span>
                    </div>
                    <p className="text-sm text-stone-700 mt-1">{fb.comment}</p>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">
                    {new Date(fb.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="space-y-3">
          {questions.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
              <p className="text-stone-400 text-sm">No support questions submitted yet</p>
            </div>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="bg-white rounded-xl border border-stone-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-stone-900">{q.subject}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        q.status === "open" ? "bg-amber-50 text-amber-600" : "bg-lime-50 text-lime-700"
                      }`}>
                        {q.status === "open" ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                        {q.status === "open" ? "Open" : "Resolved"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mb-1">{q.user_name} · {q.user_email} · {q.user_role}</p>
                    <p className="text-sm text-stone-700">{q.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-stone-400 whitespace-nowrap">
                      {new Date(q.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {q.status === "open" && (
                      <button
                        onClick={() => handleResolveQuestion(q.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-lime-50 text-lime-700 border border-lime-200 rounded-lg text-xs font-medium hover:bg-lime-100 transition-colors"
                      >
                        <CheckCircle2 size={12} /> Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
