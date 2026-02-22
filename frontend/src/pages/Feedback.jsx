import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Star, MessageSquareText, Trash2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const CATEGORIES = ["food", "cleanliness", "maintenance", "staff", "general"];
const CAT_COLORS = { food: "bg-orange-100 text-orange-700", cleanliness: "bg-sky-100 text-sky-700", maintenance: "bg-violet-100 text-violet-700", staff: "bg-emerald-100 text-emerald-700", general: "bg-stone-100 text-stone-700" };

const StarRating = ({ value, onChange, size = 20 }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <button key={s} type="button" onClick={() => onChange?.(s)} className={`transition-colors ${onChange ? "cursor-pointer" : "cursor-default"}`}>
        <Star size={size} className={s <= value ? "fill-amber-400 text-amber-400" : "text-stone-200"} />
      </button>
    ))}
  </div>
);

const Feedback = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [feedbackList, setFeedbackList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const [form, setForm] = useState({ category: "general", rating: 5, comment: "" });

  const isTenant = user?.role === "tenant";
  const isAdmin = user?.role === "owner" || user?.role === "warden";

  const fetchAll = async () => {
    try {
      const params = filterCat ? `?category=${filterCat}` : "";
      const [fbRes, sumRes] = await Promise.all([
        API.get(`/feedback${params}`),
        isAdmin ? API.get("/feedback/summary") : Promise.resolve({ data: null }),
      ]);
      setFeedbackList(fbRes.data);
      setSummary(sumRes.data);
    } catch { toast.error(t("feedback.load_failed") || "Failed to load feedback"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filterCat]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/feedback", form);
      toast.success(t("feedback.submitted") || "Feedback submitted!");
      setShowAdd(false);
      setForm({ category: "general", rating: 5, comment: "" });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/feedback/${id}`);
      toast.success(t("common.delete") + " ✓");
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>{t("feedback.title") || "Feedback"}</h1>
          <p className="text-sm text-stone-500">{t("feedback.subtitle") || "Ratings & reviews from tenants"}</p>
        </div>
        {isTenant && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors">
            <MessageSquareText size={14} />{t("feedback.give") || "Give Feedback"}
          </button>
        )}
      </div>

      {/* Summary Cards (admin) */}
      {isAdmin && summary && summary.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-stone-200 p-4 col-span-2 md:col-span-1">
            <p className="text-[10px] font-semibold text-stone-400 uppercase">Overall</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-stone-900">{summary.average_rating}</span>
              <StarRating value={Math.round(summary.average_rating)} size={14} />
            </div>
            <p className="text-xs text-stone-400 mt-0.5">{summary.total} {t("feedback.reviews") || "reviews"}</p>
          </div>
          {Object.entries(summary.category_averages || {}).map(([cat, avg]) => (
            <div key={cat} className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-[10px] font-semibold text-stone-400 uppercase">{t(`feedback.cat.${cat}`) || cat}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-lg font-bold text-stone-900">{avg}</span>
                <Star size={12} className="fill-amber-400 text-amber-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilterCat("")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${!filterCat ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
          {t("common.all") || "All"}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize ${filterCat === c ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
            {t(`feedback.cat.${c}`) || c}
          </button>
        ))}
      </div>

      {/* Feedback List */}
      {feedbackList.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <BarChart3 className="text-stone-300 mx-auto mb-2" size={32} />
          <p className="text-stone-400 text-sm">{t("feedback.no_feedback") || "No feedback yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbackList.map((fb) => (
            <div key={fb.id} className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-700 font-semibold text-xs">{fb.tenant_name?.[0]?.toUpperCase() || "?"}</span>
                  </div>
                  <div>
                    <p className="font-medium text-stone-900 text-sm">{fb.tenant_name || "Tenant"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating value={fb.rating} size={12} />
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${CAT_COLORS[fb.category] || CAT_COLORS.general}`}>{t(`feedback.cat.${fb.category}`) || fb.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400">{fb.created_at?.slice(0, 10)}</span>
                  {isAdmin && (
                    <button onClick={() => handleDelete(fb.id)} className="p-1 hover:bg-red-50 rounded text-stone-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              {fb.comment && <p className="text-sm text-stone-600 mt-2 ml-11">{fb.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add Feedback Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>{t("feedback.give") || "Give Feedback"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("feedback.category") || "Category"}</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-10 px-3 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm appearance-none bg-white">
                {CATEGORIES.map((c) => <option key={c} value={c}>{t(`feedback.cat.${c}`) || c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("feedback.rating") || "Rating"}</label>
              <StarRating value={form.rating} onChange={(r) => setForm({ ...form, rating: r })} size={28} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("feedback.comment") || "Comment"}</label>
              <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={3} className="w-full px-3 py-2 border border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg outline-none text-sm resize-none" placeholder={t("feedback.comment_placeholder") || "Share your experience..."} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">{t("common.cancel")}</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
                {saving ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feedback;
