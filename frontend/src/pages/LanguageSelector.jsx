import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { Globe, Check } from "lucide-react";

const LanguageSelector = () => {
  const { changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (selected) {
      changeLanguage(selected);
      navigate("/login");
    }
  };

  const languages = [
    { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", desc: "Continue in English" },
    { code: "hi", name: "Hindi", nativeName: "हिंदी", flag: "🇮🇳", desc: "हिंदी में जारी रखें" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-600 rounded-3xl mb-5 shadow-lg shadow-amber-200">
            <span className="text-white font-bold text-3xl" style={{ fontFamily: "Manrope, sans-serif" }}>PG</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>PGSaathi</h1>
          <p className="text-stone-500 mt-1.5 text-sm">Hostel & PG Management Platform</p>
        </div>

        {/* Selection Card */}
        <div className="bg-white rounded-2xl border border-stone-200 p-7 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <Globe size={18} className="text-amber-600" />
            <h2 className="text-base font-semibold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>
              Choose Language / भाषा चुनें
            </h2>
          </div>

          <div className="space-y-3 mb-6">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                data-testid={`lang-${lang.code}`}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${selected === lang.code
                    ? "border-amber-600 bg-amber-50 shadow-sm"
                    : "border-stone-200 hover:border-amber-300 hover:bg-amber-50/40"}`}
              >
                <span className="text-3xl">{lang.flag}</span>
                <div className="flex-1">
                  <p className={`font-semibold text-base ${selected === lang.code ? "text-amber-700" : "text-stone-900"}`} style={{ fontFamily: "Manrope, sans-serif" }}>
                    {lang.nativeName}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">{lang.desc}</p>
                </div>
                {selected === lang.code && (
                  <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0">
                    <Check size={13} strokeWidth={3} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selected}
            data-testid="lang-continue"
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200
              ${selected
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Continue / आगे बढ़ें
          </button>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          You can change language anytime from settings
        </p>
      </div>
    </div>
  );
};

export default LanguageSelector;
