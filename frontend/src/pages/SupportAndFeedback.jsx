import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Mail, MessageCircleQuestion, ThumbsUp, Send, Star, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "ui", label: "UI / Design" },
  { value: "features", label: "Features" },
  { value: "performance", label: "Performance" },
  { value: "billing", label: "Billing" },
  { value: "general", label: "General" },
];

const SupportAndFeedback = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("contact");
  const [supportEmail, setSupportEmail] = useState("contact@pgsaathi.online");

  // Product feedback state
  const [fbRating, setFbRating] = useState(0);
  const [fbHover, setFbHover] = useState(0);
  const [fbCategory, setFbCategory] = useState("general");
  const [fbComment, setFbComment] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const [fbLoading, setFbLoading] = useState(false);
  const [showPastFeedback, setShowPastFeedback] = useState(false);

  // Question state
  const [qSubject, setQSubject] = useState("");
  const [qMessage, setQMessage] = useState("");
  const [qSubmitting, setQSubmitting] = useState(false);
  const [questionList, setQuestionList] = useState([]);
  const [qLoading, setQLoading] = useState(false);
  const [showPastQuestions, setShowPastQuestions] = useState(false);

  useEffect(() => {
    API.get("/support/info").then((r) => setSupportEmail(r.data.email)).catch(() => {});
  }, []);

  const loadFeedback = async () => {
    setFbLoading(true);
    try {
      const res = await API.get("/support/product-feedback");
      setFeedbackList(res.data);
    } catch {
      toast.error("Failed to load feedback");
    } finally {
      setFbLoading(false);
    }
  };

  const loadQuestions = async () => {
    setQLoading(true);
    try {
      const res = await API.get("/support/questions");
      setQuestionList(res.data);
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setQLoading(false);
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (fbRating === 0) { toast.error("Please select a rating"); return; }
    if (!fbComment.trim()) { toast.error("Please enter a comment"); return; }
    setFbSubmitting(true);
    try {
      await API.post("/support/product-feedback", { rating: fbRating, comment: fbComment, category: fbCategory });
      toast.success("Feedback submitted! Thank you.");
      setFbRating(0);
      setFbComment("");
      setFbCategory("general");
      if (showPastFeedback) loadFeedback();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit feedback");
    } finally {
      setFbSubmitting(false);
    }
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!qSubject.trim()) { toast.error("Please enter a subject"); return; }
    if (!qMessage.trim()) { toast.error("Please enter your question"); return; }
    setQSubmitting(true);
    try {
      await API.post("/support/questions", { subject: qSubject, message: qMessage });
      toast.success("Question submitted! We'll get back to you.");
      setQSubject("");
      setQMessage("");
      if (showPastQuestions) loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit question");
    } finally {
      setQSubmitting(false);
    }
  };

  const tabs = [
    { id: "contact", label: t("support.contact") || "Contact", icon: Mail },
    { id: "feedback", label: t("support.product_feedback") || "Product Feedback", icon: ThumbsUp },
    { id: "questions", label: t("support.ask_question") || "Ask a Question", icon: MessageCircleQuestion },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>
          {t("support.title") || "Support & Feedback"}
        </h1>
        <p className="text-stone-500 text-sm">{t("support.subtitle") || "Get help, share feedback, or ask questions"}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300"
            }`}
          >
            <tab.icon size={16} strokeWidth={1.5} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contact Tab */}
      {activeTab === "contact" && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <Mail size={24} className="text-amber-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-stone-900 mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
                {t("support.email_support") || "Email Support"}
              </h2>
              <p className="text-stone-500 text-sm mb-4">
                {t("support.email_desc") || "Reach out to us for any issues, feature requests, or general inquiries."}
              </p>
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                <Mail size={16} strokeWidth={1.5} />
                {supportEmail}
              </a>
              <p className="text-xs text-stone-400 mt-3">
                {t("support.response_time") || "We typically respond within 24 hours."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Product Feedback Tab */}
      {activeTab === "feedback" && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-lime-50 rounded-xl">
                <ThumbsUp size={20} className="text-lime-700" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                  {t("support.share_feedback") || "Share Your Feedback"}
                </h2>
                <p className="text-stone-500 text-xs">{t("support.feedback_desc") || "Help us improve PGSaathi with your valuable feedback"}</p>
              </div>
            </div>
            <form onSubmit={submitFeedback} className="space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {t("support.rating") || "Rating"}
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFbRating(star)}
                      onMouseEnter={() => setFbHover(star)}
                      onMouseLeave={() => setFbHover(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={star <= (fbHover || fbRating) ? "text-amber-500 fill-amber-500" : "text-stone-300"}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {t("support.category") || "Category"}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFbCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        fbCategory === cat.value
                          ? "bg-amber-100 text-amber-700 border border-amber-300"
                          : "bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {t("support.your_feedback") || "Your Feedback"}
                </label>
                <textarea
                  value={fbComment}
                  onChange={(e) => setFbComment(e.target.value)}
                  placeholder={t("support.feedback_placeholder") || "Tell us what you like or what could be better..."}
                  rows={4}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={fbSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <Send size={16} strokeWidth={1.5} />
                {fbSubmitting ? (t("common.loading") || "Submitting...") : (t("support.submit_feedback") || "Submit Feedback")}
              </button>
            </form>
          </div>

          {/* Past feedback toggle */}
          <button
            onClick={() => { setShowPastFeedback(!showPastFeedback); if (!showPastFeedback && feedbackList.length === 0) loadFeedback(); }}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            {showPastFeedback ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {t("support.past_feedback") || "Your past feedback"}
          </button>

          {showPastFeedback && (
            <div className="space-y-3">
              {fbLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : feedbackList.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-6">{t("support.no_feedback") || "No feedback submitted yet"}</p>
              ) : (
                feedbackList.map((fb) => (
                  <div key={fb.id} className="bg-white rounded-xl border border-stone-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={14} className={s <= fb.rating ? "text-amber-500 fill-amber-500" : "text-stone-200"} />
                            ))}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">{fb.category}</span>
                        </div>
                        <p className="text-sm text-stone-700">{fb.comment}</p>
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
        </div>
      )}

      {/* Ask a Question Tab */}
      {activeTab === "questions" && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <MessageCircleQuestion size={20} className="text-blue-600" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                  {t("support.ask_question") || "Ask a Question"}
                </h2>
                <p className="text-stone-500 text-xs">{t("support.question_desc") || "Have a question about PGSaathi? We're here to help."}</p>
              </div>
            </div>
            <form onSubmit={submitQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {t("support.subject") || "Subject"}
                </label>
                <input
                  type="text"
                  value={qSubject}
                  onChange={(e) => setQSubject(e.target.value)}
                  placeholder={t("support.subject_placeholder") || "Brief summary of your question"}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {t("support.message") || "Your Question"}
                </label>
                <textarea
                  value={qMessage}
                  onChange={(e) => setQMessage(e.target.value)}
                  placeholder={t("support.message_placeholder") || "Describe your question in detail..."}
                  rows={5}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={qSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <Send size={16} strokeWidth={1.5} />
                {qSubmitting ? (t("common.loading") || "Submitting...") : (t("support.submit_question") || "Submit Question")}
              </button>
            </form>
          </div>

          {/* Past questions toggle */}
          <button
            onClick={() => { setShowPastQuestions(!showPastQuestions); if (!showPastQuestions && questionList.length === 0) loadQuestions(); }}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            {showPastQuestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {t("support.past_questions") || "Your past questions"}
          </button>

          {showPastQuestions && (
            <div className="space-y-3">
              {qLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : questionList.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-6">{t("support.no_questions") || "No questions submitted yet"}</p>
              ) : (
                questionList.map((q) => (
                  <div key={q.id} className="bg-white rounded-xl border border-stone-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-stone-900">{q.subject}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            q.status === "open"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-lime-50 text-lime-700"
                          }`}>
                            {q.status === "open" ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                            {q.status === "open" ? "Open" : "Resolved"}
                          </span>
                        </div>
                        <p className="text-sm text-stone-600">{q.message}</p>
                      </div>
                      <span className="text-xs text-stone-400 whitespace-nowrap">
                        {new Date(q.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportAndFeedback;
