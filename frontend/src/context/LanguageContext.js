import React, { createContext, useContext, useState } from "react";
import { translations } from "../translations";

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem("pgsaathi_language") || null);

  const changeLanguage = (lang) => {
    localStorage.setItem("pgsaathi_language", lang);
    setLanguage(lang);
  };

  const t = (key) => {
    const lang = language || "en";
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
